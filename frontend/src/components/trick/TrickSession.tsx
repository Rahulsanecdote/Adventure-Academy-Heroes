import React, { useEffect, useRef, useState } from 'react';
import { GameButton } from '../ui/GameButton';
import { trickAcademyAPI } from '../../services/api';
import {
  TrickBossResult,
  TrickBossStart,
  TrickDareResult,
  TrickProblem,
  TrickRep,
  TrickSessionStart,
  TrickSetResult,
  TrickTechnique,
  TrickWhyLab,
} from '../../types';
import { TrickVisual } from './TrickVisual';

// ---------------------------------------------------------------------------
// TrickSession — one technique's journey through The Trick Academy, in the
// 3-beat game flow (Nov 2026 redesign — the old 6-gate Ascent read as
// homework: typed answers, a prediction form, and a Why Lab gate):
//   Beat 1 · WATCH — the Dare is one tap-guess, then the Reveal performs
//            the trick and a guided rep walks the kid through the moves.
//   Beat 2 · PLAY  — side-by-side rounds + the Remix: streaks, stars, and
//            a big number pad instead of the phone keyboard. The Why Lab
//            survives as an optional "curious why?" peek, never a gate.
//   Beat 3 · BOSS  — the Boss Gate finale, unchanged.
// Encore & Exhibit lives on the Academy page after mastery.
// All problems are generated and graded server-side; this component only
// collects the kid's answers.
// ---------------------------------------------------------------------------

type Stage = 'loading' | 'dare' | 'reveal' | 'why' | 'side_by_side' | 'remix' | 'boss' | 'done';

const BEATS: { label: string; stages: string[] }[] = [
  { label: '🎬 Watch', stages: ['dare', 'reveal'] },
  { label: '🎮 Play', stages: ['why', 'side_by_side', 'remix'] },
  { label: '👹 Boss', stages: ['boss-intro', 'boss'] },
];

const beatIndexFor = (stage: Stage): number => {
  if (stage === 'done') return BEATS.length;
  const idx = BEATS.findIndex((b) => b.stages.includes(stage as string));
  return idx === -1 ? 0 : idx;
};

const renderLabel = (
  label: string,
  values: Record<string, string>,
  choiceParts: Record<string, number[]>
): string =>
  label.replace(/\{(\w+)\}/g, (match, token: string) => {
    if (token === 'part1' || token === 'part2') {
      const parts = Object.values(choiceParts)[0];
      if (parts) return String(token === 'part1' ? parts[0] : parts[1]);
      return match;
    }
    return values[token] !== undefined && values[token] !== '' ? values[token] : '…';
  });

// ---------------------------------------------------------------------------
// Big friendly number pad — kids tap digits instead of fighting the phone
// keyboard (the single biggest friction in the old flow).
// ---------------------------------------------------------------------------
const NumPad: React.FC<{ onKey: (key: string) => void }> = ({ onKey }) => (
  <div className="grid grid-cols-3 gap-2 mt-3 max-w-xs mx-auto">
    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'C'].map((k) => (
      <button
        key={k}
        type="button"
        onClick={() => onKey(k)}
        className="py-3 rounded-2xl bg-indigo-100 border-b-4 border-indigo-300 font-game font-bold text-2xl text-indigo-900 active:translate-y-0.5 active:border-b-2"
      >
        {k}
      </button>
    ))}
  </div>
);

const PadField: React.FC<{
  value: string;
  active: boolean;
  onTap: () => void;
  placeholder?: string;
  small?: boolean;
}> = ({ value, active, onTap, placeholder, small }) => (
  <button
    type="button"
    onClick={onTap}
    className={`w-full font-bold text-center border-4 rounded-2xl ${
      small ? 'text-2xl py-1' : 'text-3xl py-2'
    } ${active ? 'border-roblox-blue bg-blue-50' : 'border-gray-300 bg-white'}`}
  >
    {value === '' ? <span className="text-gray-300">{placeholder ?? '?'}</span> : value}
  </button>
);

const padApply = (current: string, key: string): string => {
  if (key === '⌫') return current.slice(0, -1);
  if (key === 'C') return '';
  if (current.length >= 4) return current;
  return current + key;
};

interface StepFormProps {
  problem: TrickProblem;
  showHints: boolean;
  locked?: boolean;
  onSubmit: (stepAnswers: number[]) => void;
  submitLabel: string;
  busy: boolean;
  stepFeedback?: Record<string, boolean>;
}

const StepForm: React.FC<StepFormProps> = ({
  problem, showHints, onSubmit, submitLabel, busy, stepFeedback,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, number>>({});
  const steps = problem.steps || [];
  const [activeKey, setActiveKey] = useState<string | null>(
    () => steps.find((s) => s.kind !== 'choice')?.key ?? null
  );

  const choiceParts: Record<string, number[]> = {};
  steps.forEach((s) => {
    if (s.kind === 'choice' && choices[s.key] !== undefined && s.options) {
      choiceParts[s.key] = s.options[choices[s.key]].parts;
    }
  });

  const ready = steps.every((s) =>
    s.kind === 'choice' ? choices[s.key] !== undefined : (values[s.key] ?? '').trim() !== ''
  );

  const handleSubmit = () => {
    const answers = steps.map((s) =>
      s.kind === 'choice' ? choices[s.key] : parseInt(values[s.key], 10)
    );
    onSubmit(answers);
  };

  return (
    <div className="space-y-4">
      <div className="text-center text-3xl font-game font-bold text-gray-800">{problem.prompt}</div>
      {steps.map((step) => (
        <div
          key={step.key}
          className={`bg-white rounded-2xl border-4 p-3 ${
            stepFeedback?.[step.key] === undefined
              ? 'border-gray-200'
              : stepFeedback[step.key]
                ? 'border-green-400'
                : 'border-red-400'
          }`}
        >
          <div className="font-bold text-gray-700 mb-2">
            {renderLabel(step.label, values, choiceParts)}
          </div>
          {step.kind === 'choice' ? (
            <div className="flex gap-2 flex-wrap">
              {(step.options || []).map((option, i) => (
                <button
                  key={i}
                  onClick={() => setChoices({ ...choices, [step.key]: i })}
                  className={`px-4 py-2 rounded-xl border-4 font-bold ${
                    choices[step.key] === i
                      ? 'bg-roblox-blue text-white border-roblox-darkblue'
                      : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <PadField
              value={values[step.key] ?? ''}
              active={activeKey === step.key}
              onTap={() => setActiveKey(step.key)}
            />
          )}
          {showHints && step.hint && (
            <div className="text-sm text-indigo-600 font-semibold mt-2">💡 {step.hint}</div>
          )}
          {stepFeedback?.[step.key] === false && (
            <div className="text-sm text-red-500 font-bold mt-1">Not quite — check this step!</div>
          )}
        </div>
      ))}
      {activeKey && steps.some((s) => s.kind !== 'choice') && (
        <NumPad
          onKey={(k) =>
            setValues((v) => ({ ...v, [activeKey]: padApply(v[activeKey] ?? '', k) }))
          }
        />
      )}
      <GameButton onClick={handleSubmit} disabled={!ready || busy} className="w-full" size="lg">
        {submitLabel}
      </GameButton>
    </div>
  );
};

interface AnswerListProps {
  problems: TrickProblem[];
  values: string[];
  onChange: (index: number, value: string) => void;
  feedback?: boolean[];
}

const AnswerList: React.FC<AnswerListProps> = ({ problems, values, onChange, feedback }) => {
  const [activeRow, setActiveRow] = useState(0);
  return (
    <div>
      <div className="space-y-3">
        {problems.map((problem, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl border-4 p-3 ${
              feedback === undefined ? 'border-gray-200' : feedback[i] ? 'border-green-400' : 'border-red-400'
            }`}
          >
            {problem.skin && (
              <div className="font-semibold text-gray-700 mb-1">{problem.skin}</div>
            )}
            {problem.mixed_technique && (
              <div className="text-sm font-bold text-purple-600 mb-1">🌀 Blast from the past!</div>
            )}
            <div className="flex items-center gap-3">
              <div className="text-2xl font-game font-bold text-gray-800 flex-1">{problem.prompt}</div>
              <div className="w-28 shrink-0">
                <PadField
                  small
                  value={values[i] ?? ''}
                  active={activeRow === i}
                  onTap={() => setActiveRow(i)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {problems.length > 0 && (
        <NumPad onKey={(k) => onChange(activeRow, padApply(values[activeRow] ?? '', k))} />
      )}
    </div>
  );
};

interface TrickSessionProps {
  childId: string;
  technique: TrickTechnique;
  onExit: () => void;
}

const TrickSession: React.FC<TrickSessionProps> = ({ childId, technique, onExit }) => {
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<TrickSessionStart | null>(null);

  // Dare
  const [dareResult, setDareResult] = useState<TrickDareResult | null>(null);

  // Reveal
  const [revealStep, setRevealStep] = useState(0);
  const [mimicProblem, setMimicProblem] = useState<TrickProblem | null>(null);
  const [mimicRound, setMimicRound] = useState(0);
  const [mimicFeedback, setMimicFeedback] = useState<Record<string, boolean> | undefined>();

  // Why (optional peek, no longer a gate)
  const [whyLab, setWhyLab] = useState<TrickWhyLab | null>(null);

  // Side-by-Side (Play rounds)
  const [rep, setRep] = useState<TrickRep | null>(null);
  const [repMessage, setRepMessage] = useState('');
  const [soloAnswer, setSoloAnswer] = useState('');
  const [gatePassed, setGatePassed] = useState(false);
  const [coinPop, setCoinPop] = useState(false);

  // Remix
  const [remixProblems, setRemixProblems] = useState<TrickProblem[]>([]);
  const [remixAnswers, setRemixAnswers] = useState<string[]>([]);
  const [remixResult, setRemixResult] = useState<TrickSetResult | null>(null);

  // Boss
  const [boss, setBoss] = useState<TrickBossStart | null>(null);
  const [bossAnswers, setBossAnswers] = useState<string[]>([]);
  const [bossResult, setBossResult] = useState<TrickBossResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const started = await trickAcademyAPI.startSession(childId, technique.id);
        if (cancelled) return;
        setSession(started);
        setStage('dare');
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.detail || 'Could not start the technique.');
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [childId, technique.id]);

  const fail = (err: any, fallback: string) =>
    setError(err.response?.data?.detail || fallback);

  // ---------------------------------------------------------- stage actions
  const submitDare = async (answer: number) => {
    if (!session || busy) return;
    setBusy(true);
    try {
      // One tap, no prediction form — the guess IS the commitment.
      const result = await trickAcademyAPI.submitDare(session.session_id, answer, null);
      setDareResult(result);
    } catch (err) {
      fail(err, 'The Dare could not be checked.');
    } finally {
      setBusy(false);
    }
  };

  const beginMimic = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const { problem } = await trickAcademyAPI.startMimic(session.session_id);
      setMimicProblem(problem);
      setMimicRound((r) => r + 1);
      setMimicFeedback(undefined);
    } catch (err) {
      fail(err, 'Could not load your turn.');
    } finally {
      setBusy(false);
    }
  };

  const submitMimic = async (stepAnswers: number[]) => {
    if (!session) return;
    setBusy(true);
    try {
      const result = await trickAcademyAPI.submitMimic(session.session_id, stepAnswers);
      if (result.complete) {
        // Beat 1 done — straight into the Play rounds. The Why Lab rides
        // along as an optional peek, never a gate.
        if (result.why_lab) setWhyLab(result.why_lab);
        setMimicFeedback(undefined);
        setStage('side_by_side');
        await loadRep(false);
      } else {
        const feedback: Record<string, boolean> = {};
        result.step_results.forEach((r) => (feedback[r.key] = r.correct));
        setMimicFeedback(feedback);
      }
    } catch (err) {
      fail(err, 'Could not check your steps.');
    } finally {
      setBusy(false);
    }
  };

  const loadRep = async (wantDemo: boolean) => {
    if (!session) return;
    try {
      const next = await trickAcademyAPI.nextRep(session.session_id, wantDemo);
      setRep(next);
      setSoloAnswer('');
    } catch (err) {
      fail(err, 'Could not load the next rep.');
    }
  };

  const submitRepSteps = async (stepAnswers: number[]) => {
    if (!session || !rep) return;
    setBusy(true);
    try {
      const result = await trickAcademyAPI.submitRep(session.session_id, rep.rep_id, {
        step_answers: stepAnswers,
      });
      handleRepResult(result);
    } catch (err) {
      fail(err, 'Could not check that rep.');
    } finally {
      setBusy(false);
    }
  };

  const submitRepSolo = async () => {
    if (!session || !rep) return;
    setBusy(true);
    try {
      const result = await trickAcademyAPI.submitRep(session.session_id, rep.rep_id, {
        answer: parseInt(soloAnswer, 10),
      });
      handleRepResult(result);
    } catch (err) {
      fail(err, 'Could not check that rep.');
    } finally {
      setBusy(false);
    }
  };

  const handleRepResult = (result: { correct: boolean; consecutive_solo_correct: number; gate_passed: boolean; correct_answer?: number | null }) => {
    if (result.correct) {
      setCoinPop(true);
      window.setTimeout(() => setCoinPop(false), 1200);
    }
    if (result.gate_passed) {
      setGatePassed(true);
      setRepMessage('Three solo reps in a row! The gate is open. 🎉');
      return;
    }
    setRepMessage(
      result.correct
        ? 'Nailed it! Keep the streak going.'
        : `Not quite — the answer was ${result.correct_answer}. Watch a guide rep and go again!`
    );
    setRep((prev) =>
      prev ? { ...prev, consecutive_solo_correct: result.consecutive_solo_correct } : prev
    );
  };

  const enterRemix = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const start = await trickAcademyAPI.startRemix(session.session_id);
      setRemixProblems(start.problems);
      setRemixAnswers(new Array(start.problems.length).fill(''));
      setRemixResult(null);
      setStage('remix');
    } catch (err) {
      fail(err, 'Could not load the Remix.');
    } finally {
      setBusy(false);
    }
  };

  const submitRemix = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const result = await trickAcademyAPI.submitRemix(
        session.session_id, remixAnswers.map((v) => parseInt(v, 10))
      );
      setRemixResult(result);
      if (result.passed) setStage('boss-intro' as Stage);
    } catch (err) {
      fail(err, 'Could not check the Remix.');
    } finally {
      setBusy(false);
    }
  };

  const enterBoss = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const start = await trickAcademyAPI.startBoss(session.session_id);
      setBoss(start);
      setBossAnswers(new Array(start.problems.length).fill(''));
      setBossResult(null);
      setStage('boss');
      setSecondsLeft(start.time_limit_seconds);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(
        () => setSecondsLeft((s) => Math.max(0, s - 1)), 1000
      );
    } catch (err) {
      fail(err, 'The Boss Gate would not open.');
    } finally {
      setBusy(false);
    }
  };

  const submitBoss = async () => {
    if (!session) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setBusy(true);
    try {
      const result = await trickAcademyAPI.submitBoss(
        session.session_id, bossAnswers.map((v) => parseInt(v, 10))
      );
      setBossResult(result);
      if (result.passed) setStage('done');
    } catch (err) {
      fail(err, 'The Boss could not judge that round.');
    } finally {
      setBusy(false);
    }
  };

  // ---------------------------------------------------------- render
  const beatIndex = beatIndexFor(stage);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-300 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onExit} className="bg-white/90 rounded-full px-4 py-2 font-bold text-gray-700 shadow">
            ← Academy
          </button>
          <div className="bg-white/90 rounded-full px-4 py-2 font-game font-bold text-gray-800 shadow">
            {technique.icon} {technique.name}
          </div>
        </div>

        <div className="flex gap-1 justify-center mb-4 flex-wrap">
          {BEATS.map((beat, i) => (
            <span
              key={beat.label}
              className={`px-4 py-1.5 rounded-full font-game font-bold ${
                stage === 'done' || i < beatIndex
                  ? 'bg-green-400 text-white'
                  : i === beatIndex
                    ? 'bg-white text-gray-800 shadow-lg scale-105'
                    : 'bg-white/50 text-gray-600'
              }`}
            >
              {beat.label}
            </span>
          ))}
        </div>

        {error && (
          <div className="bg-red-100 border-4 border-red-300 text-red-700 font-bold rounded-2xl p-4 mb-4">
            {error}
          </div>
        )}

        <div className="bg-white/95 rounded-3xl shadow-2xl p-5 md:p-7">
          {stage === 'loading' && <p className="text-center font-bold text-gray-600">Setting up your challenge…</p>}

          {/* ------------------------------------------------ Beat 1: The Dare (one tap) */}
          {stage === 'dare' && session && !dareResult && (
            <div>
              <h2 className="text-3xl font-game font-bold text-center text-gray-800 mb-2">🎯 The Dare</h2>
              <p className="text-center text-xl font-bold text-purple-700 mb-4">{session.dare.dare_line}</p>
              <div className="text-center text-4xl font-game font-bold text-gray-800 mb-5">{session.dare.prompt}</div>
              <div className="grid grid-cols-3 gap-3">
                {(session.dare.answer_options ?? []).map((option) => (
                  <button
                    key={option}
                    onClick={() => submitDare(option)}
                    disabled={busy}
                    className="py-5 rounded-3xl bg-gradient-to-b from-amber-300 to-orange-400 border-b-8 border-orange-600 font-game font-bold text-4xl text-white shadow-lg active:translate-y-1 active:border-b-4 disabled:opacity-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-center font-semibold text-gray-500 mt-4">
                One tap. No timer, no pressure — just your gut. 🤔
              </p>
            </div>
          )}

          {stage === 'dare' && dareResult && (
            <div className="text-center">
              <div className="text-6xl mb-3">{dareResult.answer_correct ? '🤯' : '😮'}</div>
              <h2 className="text-3xl font-game font-bold text-gray-800 mb-2">
                {dareResult.answer_correct ? 'You did it COLD?!' : 'Not yet — and that\'s the point!'}
              </h2>
              <p className="text-lg font-semibold text-gray-600 mb-5">
                The answer is {dareResult.correct_answer}. Watch closely — there is a move that makes
                this take seconds…
              </p>
              <GameButton onClick={() => setStage('reveal')} size="lg" className="w-full">
                🎭 Show me the trick
              </GameButton>
            </div>
          )}

          {/* ------------------------------------------------ Stage 2: The Reveal */}
          {stage === 'reveal' && dareResult && !mimicProblem && (
            <div>
              <h2 className="text-3xl font-game font-bold text-center text-gray-800 mb-4">🎭 The Reveal</h2>
              <div className="text-center text-2xl font-bold text-gray-700 mb-4">
                {dareResult.reveal.prompt.replace(/=\s*\?\s*$/, '')} = {revealStep >= dareResult.reveal.performance.length - 1 ? dareResult.reveal.answer : '?'}
              </div>
              {dareResult.reveal.visual && revealStep >= 1 && (
                <div className="mb-4"><TrickVisual visual={dareResult.reveal.visual} /></div>
              )}
              <div className="space-y-2 mb-5">
                {dareResult.reveal.performance.slice(0, revealStep + 1).map((step, i) => (
                  <div key={i} className="bg-indigo-50 border-l-8 border-indigo-400 rounded-xl p-3">
                    <span className="font-game font-bold text-indigo-700">{step.name}: </span>
                    <span className="font-semibold text-gray-700">{step.text}</span>
                  </div>
                ))}
              </div>
              {revealStep < dareResult.reveal.performance.length - 1 ? (
                <GameButton onClick={() => setRevealStep(revealStep + 1)} className="w-full" size="lg">
                  Next move →
                </GameButton>
              ) : (
                <GameButton onClick={beginMimic} disabled={busy} className="w-full" size="lg" variant="success">
                  🙋 My turn — walk me through one
                </GameButton>
              )}
            </div>
          )}

          {stage === 'reveal' && mimicProblem && (
            <div>
              <h2 className="text-2xl font-game font-bold text-center text-gray-800 mb-1">🙋 Your turn</h2>
              <p className="text-center font-semibold text-gray-500 mb-4">
                Same moves, new numbers. Every hint is on — just follow the steps.
              </p>
              <StepForm
                key={mimicRound}
                problem={mimicProblem}
                showHints
                onSubmit={submitMimic}
                submitLabel="Check my steps"
                busy={busy}
                stepFeedback={mimicFeedback}
              />
              {mimicFeedback && (
                <GameButton onClick={beginMimic} disabled={busy} className="w-full mt-3" variant="purple">
                  🔁 Try a fresh one
                </GameButton>
              )}
            </div>
          )}

          {/* ------------------------------------------------ Beat 2: Play rounds */}
          {stage === 'side_by_side' && (
            <div>
              <h2 className="text-3xl font-game font-bold text-center text-gray-800 mb-1">
                🎮 Play Rounds
                {coinPop && <span className="inline-block animate-bounce ml-2">🪙✨</span>}
              </h2>
              <p className="text-center font-semibold text-gray-500 mb-2">
                Solo streak: {'⭐'.repeat(rep?.consecutive_solo_correct ?? 0)}
                {'☆'.repeat(Math.max(0, (rep?.solo_streak_needed ?? 3) - (rep?.consecutive_solo_correct ?? 0)))}
                {(rep?.consecutive_solo_correct ?? 0) >= 2 &&
                  <span className="text-orange-500"> 🔥×{rep?.consecutive_solo_correct} on fire!</span>}
                {' '}— {rep?.solo_streak_needed ?? 3} in a row, unaided, opens the next gate.
              </p>
              {whyLab && (
                <details className="mb-4 bg-teal-50 border-4 border-teal-200 rounded-2xl p-3">
                  <summary className="font-game font-bold text-teal-800 cursor-pointer">
                    🔬 Curious why this trick works?
                  </summary>
                  <p className="font-semibold text-gray-700 mt-2">{whyLab.why_text}</p>
                </details>
              )}
              {repMessage && (
                <div className="bg-blue-50 border-4 border-blue-200 rounded-2xl p-3 font-bold text-blue-800 text-center mb-4">
                  {repMessage}
                </div>
              )}
              {gatePassed ? (
                <GameButton onClick={enterRemix} disabled={busy} className="w-full" size="lg" variant="success">
                  🎲 Enter the Remix
                </GameButton>
              ) : rep ? (
                <div>
                  {rep.mode === 'along' && rep.guide_demo && (
                    <div className="bg-green-50 border-4 border-green-300 rounded-2xl p-4 mb-4">
                      <div className="font-game font-bold text-green-800 mb-2">
                        🧭 Watch the guide do one: {rep.guide_demo.prompt.replace(/=\s*\?\s*$/, '')} = {rep.guide_demo.answer}
                      </div>
                      {rep.guide_demo.steps.map((s, i) => (
                        <div key={i} className="font-semibold text-gray-700">
                          {s.label} → <span className="font-bold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="font-bold text-center text-gray-600 mb-3">
                    {rep.mode === 'along' ? 'Now you — side by side with the guide.' : 'Solo rep — no scaffolding. You\'ve got this!'}
                  </div>
                  {rep.mode === 'along' ? (
                    <StepForm
                      key={rep.rep_id}
                      problem={rep.problem}
                      showHints={rep.scaffold === 'full'}
                      onSubmit={submitRepSteps}
                      submitLabel="Check my steps"
                      busy={busy}
                    />
                  ) : (
                    <div>
                      <div className="text-center text-4xl font-game font-bold text-gray-800 mb-4">{rep.problem.prompt}</div>
                      <div className="max-w-xs mx-auto mb-2">
                        <PadField value={soloAnswer} active onTap={() => {}} placeholder="Answer" />
                        <NumPad onKey={(k) => setSoloAnswer((v) => padApply(v, k))} />
                      </div>
                      <GameButton onClick={submitRepSolo} disabled={soloAnswer.trim() === '' || busy} className="w-full mt-3" size="lg">
                        Fire! 🚀
                      </GameButton>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <GameButton onClick={() => loadRep(true)} disabled={busy} variant="purple" className="flex-1">
                      🧭 Show me one
                    </GameButton>
                    <GameButton onClick={() => loadRep(false)} disabled={busy} variant="purple" className="flex-1">
                      ⏭ Next rep
                    </GameButton>
                  </div>
                </div>
              ) : (
                <p className="text-center font-bold text-gray-500">Loading your first rep…</p>
              )}
            </div>
          )}

          {/* ------------------------------------------------ Stage 5: The Remix */}
          {stage === 'remix' && (
            <div>
              <h2 className="text-3xl font-game font-bold text-center text-gray-800 mb-1">🎲 The Remix</h2>
              <p className="text-center font-semibold text-gray-500 mb-4">
                New costumes, bigger numbers — same move. Get at least 80% to face the Boss.
              </p>
              <AnswerList problems={remixProblems} values={remixAnswers}
                onChange={(i, v) => { const n = [...remixAnswers]; n[i] = v; setRemixAnswers(n); }}
                feedback={remixResult?.per_problem} />
              {remixResult && !remixResult.passed && (
                <div className="bg-orange-50 border-4 border-orange-300 rounded-2xl p-3 font-bold text-orange-700 text-center mt-4">
                  {remixResult.correct_count}/{remixResult.total_questions} — close! The move works on
                  these too; take another spin.
                </div>
              )}
              <GameButton
                onClick={remixResult ? enterRemix : submitRemix}
                disabled={busy || remixAnswers.some((v) => v.trim() === '')}
                className="w-full mt-4"
                size="lg"
              >
                {remixResult ? '🔁 Fresh Remix' : 'Check the Remix'}
              </GameButton>
            </div>
          )}

          {(stage as string) === 'boss-intro' && (
            <div className="text-center">
              <div className="text-7xl mb-3">👹</div>
              <h2 className="text-3xl font-game font-bold text-gray-800 mb-2">The Boss Gate</h2>
              <p className="text-lg font-semibold text-gray-600 mb-5">
                The Remix is behind you. Ahead: one boss, beaten only with{' '}
                <span className="font-bold text-purple-700">{technique.name}</span> — fast and unaided.
              </p>
              <GameButton onClick={enterBoss} disabled={busy} className="w-full" size="lg" variant="danger">
                ⚔️ Face the Boss
              </GameButton>
            </div>
          )}

          {/* ------------------------------------------------ Stage 6: The Boss Gate */}
          {stage === 'boss' && boss && !bossResult && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="font-game font-bold text-red-600 text-xl">👹 {boss.boss_name}</div>
                <div className={`font-game font-bold text-2xl ${secondsLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                  ⏱ {secondsLeft}s
                </div>
              </div>
              <p className="italic font-semibold text-gray-500 mb-4">“{boss.taunt}”</p>
              <AnswerList problems={boss.problems} values={bossAnswers}
                onChange={(i, v) => { const n = [...bossAnswers]; n[i] = v; setBossAnswers(n); }} />
              <GameButton
                onClick={submitBoss}
                disabled={busy || bossAnswers.some((v) => v.trim() === '')}
                className="w-full mt-4"
                size="lg"
                variant="danger"
              >
                ⚔️ Strike!
              </GameButton>
            </div>
          )}

          {stage === 'boss' && bossResult && !bossResult.passed && (
            <div className="text-center">
              <div className="text-6xl mb-3">🔄</div>
              <h2 className="text-3xl font-game font-bold text-gray-800 mb-2">So close!</h2>
              <p className="text-lg font-semibold text-gray-600 mb-2">
                {bossResult.correct_count}/{bossResult.total_questions} in {bossResult.elapsed_seconds}s.
              </p>
              <p className="text-lg font-bold text-purple-700 mb-5">{bossResult.iteration_line}</p>
              <GameButton onClick={enterRemix} disabled={busy} className="w-full" size="lg">
                🎲 Back to the Remix
              </GameButton>
            </div>
          )}

          {/* ------------------------------------------------ Mastered */}
          {stage === 'done' && bossResult?.reward && (
            <div className="text-center">
              <div className="text-7xl mb-2 animate-bounce">{bossResult.reward.badges?.[0]?.icon || technique.icon}</div>
              <h2 className="text-3xl font-game font-bold text-gray-800 mb-2">Boss defeated! 🏆</h2>
              <p className="text-lg font-semibold text-gray-600 mb-1">
                {bossResult.correct_count}/{bossResult.total_questions} in {bossResult.elapsed_seconds}s —{' '}
                {technique.name} is YOUR move now.
              </p>
              <p className="font-bold text-purple-700 mb-1">
                Badge earned: {bossResult.reward.badges?.[0]?.name || technique.badge.name}
              </p>
              <p className="font-bold text-gray-700 mb-5">
                +{bossResult.reward.xp_earned} XP · +{bossResult.reward.coins_earned} coins
                {bossResult.reward.new_level ? ` · 🎉 Level ${bossResult.reward.new_level}!` : ''}
              </p>
              <p className="text-sm font-semibold text-gray-500 mb-5">
                Bonus adventures await: teach it back from the Academy page, and watch for Encore
                rematches tomorrow, in 3 days, and in a week!
              </p>
              <GameButton onClick={onExit} className="w-full" size="lg" variant="success">
                🎓 Back to the Academy
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrickSession;
