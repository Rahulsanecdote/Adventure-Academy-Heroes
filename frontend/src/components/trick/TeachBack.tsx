import React, { useEffect, useState } from 'react';
import { GameButton } from '../ui/GameButton';
import { trickAcademyAPI } from '../../services/api';
import { TrickTeachBack, TrickTechnique } from '../../types';

// ---------------------------------------------------------------------------
// TeachBack (Phase 3, stage 7a) — the kid "teaches" the technique back using
// only kid-safe input patterns: tap steps in the right order, then pick the
// explanation that says WHY it works. No free text, no voice upload.
// ---------------------------------------------------------------------------

interface TeachBackProps {
  childId: string;
  technique: TrickTechnique;
  onDone: () => void;
}

const TeachBack: React.FC<TeachBackProps> = ({ childId, technique, onDone }) => {
  const [data, setData] = useState<TrickTeachBack | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [whyIndex, setWhyIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ order: boolean; why: boolean } | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setData(await trickAcademyAPI.getTeachBack(childId, technique.id));
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Teach-back could not load.');
      }
    })();
  }, [childId, technique.id]);

  if (error) {
    return (
      <div className="bg-white/95 rounded-3xl shadow-2xl p-6">
        <p className="font-bold text-red-600 mb-4">{error}</p>
        <GameButton onClick={onDone} className="w-full">Back</GameButton>
      </div>
    );
  }
  if (!data) {
    return <p className="text-center font-bold text-white text-xl">Loading teach-back…</p>;
  }

  const remaining = data.steps.filter((s) => !order.includes(s.id));
  const alreadyDone = data.completed && !justCompleted;

  const submit = async () => {
    if (whyIndex === null) return;
    setBusy(true);
    try {
      const result = await trickAcademyAPI.submitTeachBack(childId, technique.id, order, whyIndex);
      setFeedback({ order: result.order_correct, why: result.why_correct });
      if (result.completed) {
        setJustCompleted(true);
        setData({ ...data, completed: true });
      } else {
        setOrder([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save the teach-back.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white/95 rounded-3xl shadow-2xl p-6">
      <h2 className="text-3xl font-game font-bold text-center text-gray-800 mb-1">
        🎤 Teach it back: {technique.name}
      </h2>
      <p className="text-center font-semibold text-gray-500 mb-5">
        You're the teacher now! Tap the steps in the order YOU would teach them,
        then pick the explanation that says why the trick works.
      </p>

      {alreadyDone || justCompleted ? (
        <div className="text-center">
          <div className="text-6xl mb-3">🎓</div>
          <p className="text-xl font-bold text-green-600 mb-5">
            Teach-back complete — you don't just know this move, you can TEACH it!
          </p>
          <GameButton onClick={onDone} className="w-full" size="lg" variant="success">
            Back to the Academy
          </GameButton>
        </div>
      ) : (
        <>
          <div className="mb-2 font-bold text-gray-700">1️⃣ Your lesson, step by step:</div>
          <div className="min-h-[56px] bg-indigo-50 border-4 border-dashed border-indigo-300 rounded-2xl p-2 flex gap-2 flex-wrap mb-3">
            {order.length === 0 && <span className="text-gray-400 font-semibold p-2">Tap steps below to build your lesson…</span>}
            {order.map((id, i) => {
              const step = data.steps.find((s) => s.id === id)!;
              return (
                <span key={id} className="bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl">
                  {i + 1}. {step.label}
                </span>
              );
            })}
          </div>
          <div className="flex gap-2 flex-wrap mb-5">
            {remaining.map((step) => (
              <button
                key={step.id}
                onClick={() => setOrder([...order, step.id])}
                className="bg-white border-4 border-gray-300 hover:border-indigo-400 font-bold text-gray-700 px-3 py-2 rounded-xl"
              >
                {step.label}
              </button>
            ))}
            {order.length > 0 && (
              <button
                onClick={() => setOrder(order.slice(0, -1))}
                className="bg-red-100 border-4 border-red-300 font-bold text-red-600 px-3 py-2 rounded-xl"
              >
                ↩ Undo
              </button>
            )}
          </div>

          <div className="mb-2 font-bold text-gray-700">2️⃣ Why does it work?</div>
          <div className="grid gap-2 mb-4">
            {data.why_choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => setWhyIndex(i)}
                className={`px-4 py-3 rounded-2xl border-4 font-bold text-left ${
                  whyIndex === i
                    ? 'bg-purple-500 text-white border-purple-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {choice}
              </button>
            ))}
          </div>

          {feedback && (
            <div className="bg-orange-50 border-4 border-orange-300 rounded-2xl p-3 font-bold text-orange-700 mb-4">
              {!feedback.order && <div>🔀 The step order isn't the teaching order yet — try again!</div>}
              {!feedback.why && <div>🤔 That explanation isn't the real why — peek at the Why Lab model in your head and pick again.</div>}
            </div>
          )}

          <GameButton
            onClick={submit}
            disabled={busy || order.length !== data.steps.length || whyIndex === null}
            className="w-full"
            size="lg"
          >
            🎤 Teach!
          </GameButton>
          <button onClick={onDone} className="w-full mt-3 font-bold text-gray-500">
            Later
          </button>
        </>
      )}
    </div>
  );
};

export default TeachBack;
