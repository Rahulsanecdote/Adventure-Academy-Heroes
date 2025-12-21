import React from 'react';
import { QuestStep } from '../../../types';
import { GameButton } from '../../ui/GameButton';
import { GameCard } from '../../ui/GameCard';

interface CollectStepProps {
  step: QuestStep;
  onComplete: (correct: boolean) => void;
}

export const CollectStep: React.FC<CollectStepProps> = ({ step, onComplete }) => {
  const config = step.config;

  const getItemEmoji = (item: string) => {
    const emojis: { [key: string]: string } = {
      golden_banana: '🍌✨',
      fraction_trophy: '🏆',
      coding_badge: '💻🏅',
      gravity_badge: '🔬🌟',
    };
    return emojis[item] || '🎁';
  };

  return (
    <GameCard className="max-w-2xl mx-auto animate-pop">
      <div className="text-center">
        <div className="text-9xl mb-6 animate-bounce">
          {getItemEmoji(config.item)}
        </div>
        
        <h2 className="text-4xl font-game font-bold text-gray-800 mb-4">
          {step.title}
        </h2>
        
        <p className="text-2xl text-gray-700 mb-8">
          {config.message}
        </p>

        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 border-4 border-yellow-400 mb-8">
          <p className="text-xl font-bold text-yellow-900">
            🎉 You earned {step.xp_reward} XP!
          </p>
        </div>

        <GameButton
          size="xl"
          onClick={() => onComplete(true)}
          variant="success"
        >
          ✨ Collect Reward
        </GameButton>
      </div>
    </GameCard>
  );
};