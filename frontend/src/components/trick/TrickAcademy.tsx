import React, { useEffect, useState } from 'react';
import { GameButton } from '../ui/GameButton';
import { trickAcademyAPI } from '../../services/api';
import { ChildProfile, TrickEncore, TrickProblem, TrickTechnique } from '../../types';
import TrickSession from './TrickSession';
import TeachBack from './TeachBack';

// ---------------------------------------------------------------------------
// TrickAcademy (Phase 3) — the Academy home: the technique trail (locked
// until the previous technique is mastered), due Encore rematches (stage 7b:
// spaced re-tests at +1/+3/+7 days), and teach-back entry points (stage 7a).
// ---------------------------------------------------------------------------

interface TrickAcademyProps {
  childProfile: ChildProfile;
  onExit: () => void;
}

type View =
  | { kind: 'trail' }
  | { kind: 'session'; technique: TrickTechnique }
  | { kind: 'teachback'; technique: TrickTechnique };

const TrickAcademy: React.FC<TrickAcademyProps> = ({ childProfile, onExit }) => {
  const [techniques, setTechniques] = useState<TrickTechnique[]>([]);
  const [encores, setEncores] = useState<TrickEncore[]>([]);
  const [view, setView] = useState<View>({ kind: 'trail' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Encore mini-flow state
  const [activeEncore, setActiveEncore] = useState<{
    encore: TrickEncore;
    problems: TrickProblem[];
    answers: string[];
    result?: { correct_count: number; total_questions: number; passed: boolean };
  } | null>(null);
  const [encoreBusy, setEncoreBusy] = useState(false);

  const load = async () => {
    try {
      const [techs, encs] = await Promise.all([
        trickAcademyAPI.listTechniques(childProfile.id),
        trickAcademyAPI.listEncores(childProfile.id),
      ]);
      setTechniques(techs);
      setEncores(encs);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'The Academy could not load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childProfile.id]);

  const dueEncores = encores.filter((e) => e.is_due);
  const upcomingEncores = encores.filter((e) => !e.is_due && e.status !== 'completed');

  const startEncore = async (encore: TrickEncore) => {
    setEncoreBusy(true);
    try {
      const start = await trickAcademyAPI.startEncore(encore.id);
      setActiveEncore({
        encore,
        problems: start.problems,
        answers: new Array(start.problems.length).fill(''),
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'The Encore could not start.');
    } finally {
      setEncoreBusy(false);
    }
  };

  const submitEncore = async () => {
    if (!activeEncore) return;
    setEncoreBusy(true);
    try {
      const result = await trickAcademyAPI.submitEncore(
        activeEncore.encore.id,
        activeEncore.answers.map((v) => parseInt(v, 10))
      );
      setActiveEncore({ ...activeEncore, result });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'The Encore could not be checked.');
    } finally {
      setEncoreBusy(false);
    }
  };

  const closeEncore = async () => {
    setActiveEncore(null);
    await load();
  };

  if (view.kind === 'session') {
    return (
      <TrickSession
        childId={childProfile.id}
        technique={view.technique}
        onExit={() => {
          setView({ kind: 'trail' });
          load();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-300 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onExit} className="bg-white/90 rounded-full px-4 py-2 font-bold text-gray-700 shadow">
            ← Adventure Hub
          </button>
          <div className="bg-white/90 rounded-full px-4 py-2 font-game font-bold text-gray-800 shadow">
            🎓 Trick Academy
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-4 border-red-300 text-red-700 font-bold rounded-2xl p-4 mb-4">
            {error}
          </div>
        )}

        {view.kind === 'teachback' ? (
          <TeachBack
            childId={childProfile.id}
            technique={view.technique}
            onDone={() => {
              setView({ kind: 'trail' });
              load();
            }}
          />
        ) : activeEncore ? (
          <div className="bg-white/95 rounded-3xl shadow-2xl p-6">
            <h2 className="text-3xl font-game font-bold text-center text-gray-800 mb-1">
              {activeEncore.encore.icon} Encore Rematch!
            </h2>
            <p className="text-center font-semibold text-gray-500 mb-4">
              {activeEncore.encore.technique_name} — day +{activeEncore.encore.offset_days} check.
              Still got it?
            </p>
            {activeEncore.result ? (
              <div className="text-center">
                <div className="text-6xl mb-3">{activeEncore.result.passed ? '🌟' : '💪'}</div>
                <p className="text-xl font-bold text-gray-800 mb-5">
                  {activeEncore.result.passed
                    ? `${activeEncore.result.correct_count}/${activeEncore.result.total_questions} — the move is still yours!`
                    : `${activeEncore.result.correct_count}/${activeEncore.result.total_questions} — a little rusty. It's waiting for you whenever you're ready.`}
                </p>
                <GameButton onClick={closeEncore} className="w-full" size="lg" variant="success">
                  Done
                </GameButton>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {activeEncore.problems.map((problem, i) => (
                    <div key={i} className="bg-white rounded-2xl border-4 border-gray-200 p-3 flex items-center gap-3">
                      <div className="text-2xl font-game font-bold text-gray-800 flex-1">{problem.prompt}</div>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={activeEncore.answers[i] ?? ''}
                        onChange={(e) => {
                          const answers = [...activeEncore.answers];
                          answers[i] = e.target.value;
                          setActiveEncore({ ...activeEncore, answers });
                        }}
                        className="w-28 text-2xl font-bold text-center border-4 border-gray-300 rounded-xl py-1 focus:border-roblox-blue outline-none"
                        placeholder="?"
                      />
                    </div>
                  ))}
                </div>
                <GameButton
                  onClick={submitEncore}
                  disabled={encoreBusy || activeEncore.answers.some((v) => v.trim() === '')}
                  className="w-full"
                  size="lg"
                >
                  Encore!
                </GameButton>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white/95 rounded-3xl shadow-2xl p-5 mb-4">
              <h1 className="text-3xl font-game font-bold text-gray-800 mb-1">
                The Trick Academy Ascent 🧗
              </h1>
              <p className="font-semibold text-gray-500">
                Every technique is a journey: 🎯 Dare → 🎭 Reveal → 🔬 Why Lab → 🤝 Side-by-Side →
                🎲 Remix → 👹 Boss Gate → 🎤 Encore &amp; Exhibit. Master one to unlock the next!
              </p>
            </div>

            {dueEncores.length > 0 && (
              <div className="bg-yellow-100 border-4 border-yellow-400 rounded-3xl p-4 mb-4 shadow-xl">
                <div className="font-game font-bold text-yellow-800 text-xl mb-2">
                  ⏰ Encore time! {dueEncores.length} rematch{dueEncores.length > 1 ? 'es' : ''} due
                </div>
                {dueEncores.map((encore) => (
                  <div key={encore.id} className="flex items-center justify-between bg-white rounded-2xl p-3 mb-2">
                    <div className="font-bold text-gray-700">
                      {encore.icon} {encore.technique_name}
                      <span className="text-gray-400 text-sm"> · +{encore.offset_days} day check</span>
                    </div>
                    <GameButton size="sm" onClick={() => startEncore(encore)} disabled={encoreBusy}>
                      Play
                    </GameButton>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <p className="text-center font-bold text-white text-xl">Opening the Academy…</p>
            ) : (
              <div className="space-y-3">
                {techniques.map((technique) => (
                  <div
                    key={technique.id}
                    className={`rounded-3xl p-4 shadow-xl border-4 ${
                      technique.status === 'mastered'
                        ? 'bg-green-50 border-green-400'
                        : technique.status === 'locked'
                          ? 'bg-gray-100 border-gray-300 opacity-80'
                          : 'bg-white border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-5xl">{technique.status === 'locked' ? '🔒' : technique.icon}</div>
                      <div className="flex-1">
                        <div className="font-game font-bold text-xl text-gray-800">
                          {technique.order}. {technique.name}
                        </div>
                        <div className="font-semibold text-gray-500">{technique.tagline}</div>
                        <div className="text-sm font-bold text-gray-400">
                          Badge: {technique.badge.icon} {technique.badge.name} · +{technique.xp_reward} XP · +{technique.coin_reward} coins
                        </div>
                      </div>
                      {technique.status === 'mastered' ? (
                        <div className="flex flex-col gap-2">
                          <span className="bg-green-500 text-white font-bold px-3 py-1 rounded-full text-center">✅ Mastered</span>
                          <GameButton size="sm" onClick={() => setView({ kind: 'teachback', technique })}>
                            🎤 Teach it back
                          </GameButton>
                        </div>
                      ) : technique.status === 'locked' ? (
                        <span className="font-bold text-gray-400">Master the one above</span>
                      ) : (
                        <GameButton onClick={() => setView({ kind: 'session', technique })}>
                          {technique.status === 'in_progress' ? 'Continue' : 'Start'} →
                        </GameButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {upcomingEncores.length > 0 && (
              <div className="bg-white/70 rounded-3xl p-4 mt-4">
                <div className="font-game font-bold text-gray-700 mb-1">🗓 Coming Encores</div>
                {upcomingEncores.map((encore) => (
                  <div key={encore.id} className="font-semibold text-gray-500 text-sm">
                    {encore.icon} {encore.technique_name} · +{encore.offset_days} day check ·{' '}
                    {new Date(encore.due_at).toLocaleDateString()}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrickAcademy;
