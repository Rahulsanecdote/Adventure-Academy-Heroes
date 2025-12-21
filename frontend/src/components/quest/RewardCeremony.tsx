import React, { useEffect, useState } from 'react';
import { Quest, ChildProfile } from '../../types';
import { GameButton } from '../ui/GameButton';
import { GameCard } from '../ui/GameCard';

interface RewardCeremonyProps {
  quest: Quest;
  childProfile: ChildProfile;
  onContinue: () => void;
}

export const RewardCeremony: React.FC<RewardCeremonyProps> = ({
  quest,
  childProfile,
  onContinue,
}) => {
  const [stage, setStage] = useState(0);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    // Animate through stages
    const timers = [
      setTimeout(() => setStage(1), 1000),
      setTimeout(() => setStage(2), 2500),
      setTimeout(() => setStage(3), 4000),
      setTimeout(() => setConfetti(true), 1500),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const getWorldEmoji = () => {
    if (quest.world === 'math_jungle') return '🌴';
    if (quest.world === 'code_city') return '🏙️';
    if (quest.world === 'science_spaceport') return '🚀';
    return '🌟';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti Effect */}
      {confetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-50px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              {['🎉', '✨', '🌟', '🏆', '🎈'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <GameCard className="max-w-2xl w-full text-center relative z-10" variant="premium">
        {/* Stage 0: Quest Complete */}
        {stage >= 0 && (
          <div className="mb-8 animate-pop">
            <div className="text-9xl mb-4 animate-bounce">
              🎉
            </div>
            <h1 className="text-5xl font-game font-bold text-gray-800 mb-2">
              Quest Complete!
            </h1>
            <p className="text-2xl text-gray-700">
              {quest.title}
            </p>
          </div>
        )}

        {/* Stage 1: XP Earned */}
        {stage >= 1 && (
          <div className="mb-8 animate-pop">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-8 border-4 border-purple-700 shadow-glow">
              <div className="text-6xl mb-2">⭐</div>
              <div className="text-4xl font-game font-bold text-white mb-2">
                +{quest.xp_reward} XP
              </div>
              <div className="text-xl text-white/90">
                Total XP: {childProfile.total_xp + quest.xp_reward}
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Coins Earned */}
        {stage >= 2 && (
          <div className="mb-8 animate-pop">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-8 border-4 border-yellow-600 shadow-glow-yellow">
              <div className="text-6xl mb-2">🪙</div>
              <div className="text-4xl font-game font-bold text-white mb-2">
                +{quest.coin_reward} Coins
              </div>
              <div className="text-xl text-white/90">
                Total Coins: {childProfile.coins + quest.coin_reward}
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Badge */}
        {stage >= 3 && quest.badge_id && (
          <div className="mb-8 animate-pop">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 border-4 border-blue-700">
              <div className="text-6xl mb-2">🏆</div>
              <div className="text-2xl font-display font-bold text-white mb-2">
                New Badge Unlocked!
              </div>
              <div className="text-xl text-white/90">
                {quest.title} Master
              </div>
            </div>
          </div>
        )}

        {/* Achievement Summary */}
        {stage >= 3 && (
          <div className="bg-white rounded-xl p-6 border-4 border-gray-200 mb-8">
            <h3 className="text-2xl font-display font-bold text-gray-800 mb-4">
              🌟 Achievement Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl mb-2">{getWorldEmoji()}</div>
                <div className="font-semibold text-gray-700">World</div>
                <div className="text-sm text-gray-600">{quest.world.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-3xl mb-2">⏱️</div>
                <div className="font-semibold text-gray-700">Time</div>
                <div className="text-sm text-gray-600">{quest.estimated_minutes} min</div>
              </div>
              <div>
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-semibold text-gray-700">Difficulty</div>
                <div className="text-sm text-gray-600 capitalize">{quest.difficulty}</div>
              </div>
            </div>
          </div>
        )}

        {/* Continue Button */}
        {stage >= 3 && (
          <GameButton
            size="xl"
            onClick={onContinue}
            variant="success"
            className="animate-pop"
          >
            🎉 Continue Adventure
          </GameButton>
        )}
      </GameCard>
    </div>
  );
};