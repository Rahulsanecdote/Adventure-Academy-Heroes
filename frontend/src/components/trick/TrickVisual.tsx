import React, { useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Trick Academy visuals (Phase 3). Two families:
//  - TrickVisual: the static "model" of a worked example, rendered from the
//    server-provided visual spec during the Reveal / guide demos.
//  - TrickExplorer: the Why Lab's manipulable version — the kid changes the
//    numbers and watches the model react. Pure client-side play; nothing
//    here is graded (the graded probe is a separate server-checked task).
// Visual specs are data (see backend utils/trick_challenge.py), so new
// techniques reuse these renderers.
// ---------------------------------------------------------------------------

type Visual = Record<string, any>;

const DigitBox: React.FC<{ value: React.ReactNode; color: string; label?: string }> = ({ value, color, label }) => (
  <div className="flex flex-col items-center">
    <div
      className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl border-4 ${color} bg-white flex items-center justify-center text-3xl font-game font-bold text-gray-800 shadow`}
    >
      {value}
    </div>
    {label && <div className="text-xs font-bold text-gray-500 mt-1">{label}</div>}
  </div>
);

const Arrow: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col items-center justify-center px-1 text-gray-500">
    <div className="text-2xl font-bold">→</div>
    {children && <div className="text-xs font-bold">{children}</div>}
  </div>
);

export const TrickVisual: React.FC<{ visual: Visual }> = ({ visual }) => {
  if (!visual) return null;

  if (visual.type === 'digit_split') {
    const digits = String(visual.n).split('');
    return (
      <div className="bg-indigo-50 border-4 border-indigo-200 rounded-2xl p-4">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {digits.map((d: string, i: number) => (
            <DigitBox key={i} value={d} color="border-indigo-300" />
          ))}
          <div className="text-2xl font-bold text-gray-600 px-1">× 11</div>
        </div>
        <div className="text-center text-3xl my-2">⬇</div>
        <div className="flex items-start justify-center gap-2">
          <DigitBox value={visual.first} color="border-green-400" label="first" />
          <DigitBox value={visual.middle} color="border-yellow-400" label="middle = digit sum" />
          <DigitBox value={visual.last} color="border-green-400" label="last" />
        </div>
        {visual.carry === 1 && (
          <p className="text-center font-bold text-orange-600 mt-3">
            The digit sum was {visual.raw_sum} — too big for one box! The 3 stayed in the
            middle and the 1 carried over to make the first digit {visual.first}.
          </p>
        )}
      </div>
    );
  }

  if (visual.type === 'make_ten') {
    const showFrame = visual.ten_value === 10 && visual.a < 10;
    return (
      <div className="bg-green-50 border-4 border-green-200 rounded-2xl p-4">
        {showFrame && (
          <div className="flex justify-center mb-4">
            <div className="grid grid-cols-5 gap-1 bg-white p-2 rounded-xl border-2 border-green-300">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-lg border-2 ${
                    i < visual.a
                      ? 'bg-green-400 border-green-600'
                      : i < visual.a + visual.need
                        ? 'bg-yellow-300 border-yellow-500 animate-pulse'
                        : 'bg-gray-100 border-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-center gap-1 flex-wrap text-xl font-bold text-gray-800">
          <span className="bg-white border-4 border-green-400 rounded-xl px-3 py-1">{visual.a}</span>
          <Arrow>+{visual.need}</Arrow>
          <span className="bg-white border-4 border-yellow-400 rounded-xl px-3 py-1">{visual.ten_value}</span>
          <Arrow>+{visual.rest}</Arrow>
          <span className="bg-white border-4 border-purple-400 rounded-xl px-3 py-1">{visual.total}</span>
        </div>
        <p className="text-center text-gray-600 font-semibold mt-3">
          {visual.a} needs {visual.need} to reach {visual.ten_value}. The {visual.b} splits into{' '}
          {visual.need} + {visual.rest} — then it's just {visual.ten_value} + {visual.rest}.
        </p>
      </div>
    );
  }

  if (visual.type === 'ten_groups') {
    return (
      <div className="bg-sky-50 border-4 border-sky-200 rounded-2xl p-4">
        <div className="flex justify-center gap-1 flex-wrap mb-3">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={`relative w-9 h-14 rounded-lg border-2 flex items-end justify-center pb-1 font-bold ${
                i === 9
                  ? 'bg-red-100 border-red-400 text-red-500 line-through'
                  : 'bg-sky-200 border-sky-400 text-sky-800'
              }`}
            >
              {visual.n}
              {i === 9 && <span className="absolute -top-2 -right-2 text-base no-underline">✖</span>}
            </div>
          ))}
        </div>
        <p className="text-center font-bold text-gray-800 text-lg">
          10 × {visual.n} = {visual.ten_product}, take away one group → {visual.ten_product} −{' '}
          {visual.n} = {visual.answer}
        </p>
      </div>
    );
  }

  if (visual.type === 'bond_split') {
    return (
      <div className="bg-amber-50 border-4 border-amber-200 rounded-2xl p-4">
        <div className="flex justify-center">
          <DigitBox value={visual.dividend} color="border-amber-400" label="the big number" />
        </div>
        <div className="text-center text-2xl my-1">↙ ↘</div>
        <div className="flex justify-center gap-6 flex-wrap">
          {visual.parts.map((part: number, i: number) => (
            <div key={i} className="flex flex-col items-center">
              <DigitBox value={part} color="border-green-400" label={`friendly part`} />
              <div className="font-bold text-gray-700 mt-1">
                {part} ÷ {visual.divisor} = {visual.quotients[i]}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center font-bold text-gray-800 text-lg mt-3">
          {visual.quotients[0]} + {visual.quotients[1]} = {visual.answer} — so {visual.dividend} ÷{' '}
          {visual.divisor} = {visual.answer}
        </p>
      </div>
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// Why Lab explorers — manipulable models
// ---------------------------------------------------------------------------

const Stepper: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, onChange }) => (
  <div className="flex flex-col items-center">
    <div className="text-xs font-bold text-gray-500 mb-1">{label}</div>
    <div className="flex items-center gap-2">
      <button
        className="w-9 h-9 rounded-full bg-white border-4 border-gray-300 font-bold text-lg disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <div className="w-12 text-center text-2xl font-game font-bold text-gray-800">{value}</div>
      <button
        className="w-9 h-9 rounded-full bg-white border-4 border-gray-300 font-bold text-lg disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  </div>
);

const DigitSplitExplorer: React.FC = () => {
  const [f, setF] = useState(4);
  const [l, setL] = useState(3);
  const n = f * 10 + l;
  const sum = f + l;
  const carry = sum >= 10 ? 1 : 0;
  const visual: Visual = {
    type: 'digit_split',
    n,
    first: f + carry,
    middle: sum % 10,
    last: l,
    carry,
    raw_sum: sum,
  };
  return (
    <div>
      <div className="flex justify-center gap-8 mb-4">
        <Stepper label="First digit" value={f} min={1} max={9} onChange={setF} />
        <Stepper label="Last digit" value={l} min={0} max={9} onChange={setL} />
      </div>
      <TrickVisual visual={visual} />
      <p className="text-center font-bold text-gray-700 mt-3">
        {n} × 11 = {n * 11}
        {carry ? ' — the sum spilled past 9, so 1 carried!' : ''}
      </p>
    </div>
  );
};

const MakeTenExplorer: React.FC = () => {
  const [a, setA] = useState(8);
  const [b, setB] = useState(6);
  const actualNeed = a % 10 === 0 ? 0 : 10 - (a % 10);
  const rest = b - actualNeed;
  const visual: Visual = {
    type: 'make_ten',
    a,
    b,
    need: actualNeed,
    rest: Math.max(rest, 0),
    ten_value: a + actualNeed,
    total: a + b,
  };
  return (
    <div>
      <div className="flex justify-center gap-8 mb-4">
        <Stepper label="First number" value={a} min={2} max={29} onChange={setA} />
        <Stepper label="Second number" value={b} min={1} max={9} onChange={setB} />
      </div>
      {rest >= 0 ? (
        <TrickVisual visual={visual} />
      ) : (
        <p className="text-center font-bold text-orange-600">
          {b} is smaller than the gap ({actualNeed}) — this pair doesn't need the move. Try a bigger second number!
        </p>
      )}
      <p className="text-center font-bold text-gray-700 mt-3">{a} + {b} = {a + b}</p>
    </div>
  );
};

const TenGroupsExplorer: React.FC = () => {
  const [n, setN] = useState(7);
  const visual: Visual = { type: 'ten_groups', n, ten_product: 10 * n, answer: 9 * n };
  return (
    <div>
      <div className="flex justify-center mb-4">
        <Stepper label="Group size" value={n} min={2} max={30} onChange={setN} />
      </div>
      <TrickVisual visual={visual} />
      <p className="text-center font-bold text-gray-700 mt-3">9 × {n} = {9 * n} — works for every group size!</p>
    </div>
  );
};

const BondSplitExplorer: React.FC = () => {
  const [d, setD] = useState(6);
  const [q, setQ] = useState(13);
  const [p1, setP1] = useState(60);
  const dividend = d * q;
  const p2 = dividend - p1;
  const friendly = p1 > 0 && p2 > 0 && p1 % d === 0 && p2 % d === 0;
  const visual: Visual = useMemo(
    () => ({
      type: 'bond_split',
      dividend,
      divisor: d,
      parts: [p1, Math.max(p2, 0)],
      quotients: [p1 % d === 0 ? p1 / d : 0, p2 % d === 0 && p2 > 0 ? p2 / d : 0],
      answer: q,
    }),
    [dividend, d, p1, p2, q]
  );
  return (
    <div>
      <div className="flex justify-center gap-8 mb-4 flex-wrap">
        <Stepper label="Divisor" value={d} min={2} max={9} onChange={(v) => { setD(v); setP1(v * 10); }} />
        <Stepper label="Answer size" value={q} min={5} max={20} onChange={setQ} />
        <Stepper label="Part 1" value={p1} min={1} max={dividend - 1} onChange={setP1} />
      </div>
      {friendly ? (
        <TrickVisual visual={visual} />
      ) : (
        <div className="bg-red-50 border-4 border-red-200 rounded-2xl p-4 text-center">
          <p className="font-bold text-red-600 text-lg">
            {dividend} = {p1} + {p2} — but {p1 % d !== 0 ? `${p1} ` : ''}{p2 % d !== 0 ? `${p2} ` : ''}
            doesn't divide by {d} cleanly. Unfriendly! Slide Part 1 until both parts are multiples of {d}.
          </p>
        </div>
      )}
    </div>
  );
};

export const TrickExplorer: React.FC<{ visualType?: string | null }> = ({ visualType }) => {
  switch (visualType) {
    case 'digit_split':
      return <DigitSplitExplorer />;
    case 'make_ten':
      return <MakeTenExplorer />;
    case 'ten_groups':
      return <TenGroupsExplorer />;
    case 'bond_split':
      return <BondSplitExplorer />;
    default:
      return null;
  }
};
