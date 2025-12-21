import React from 'react';
import { QuestStep } from '../../../types';
import { GameButton } from '../../ui/GameButton';
import { GameCard } from '../../ui/GameCard';

interface DialogueStepProps {
  step: QuestStep;
  onComplete: (correct: boolean) => void;
}

export const DialogueStep: React.FC<DialogueStepProps> = ({ step, onComplete }) => {
  const config = step.config;

  const getCharacterEmoji = (character: string) => {
    const emojis: { [key: string]: string } = {
      miko_monkey: '🐵',
      ella_elephant: '🐘',
      robo_robot: '🤖',
      captain_cosmo: '👨‍🚀',
    };
    return emojis[character] || '👤';
  };

  return (
    <GameCard className="max-w-2xl mx-auto animate-pop">
      <div className="text-center mb-6">
        <div className="text-8xl mb-4 animate-bounce-slow">
          {getCharacterEmoji(config.character)}
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-800 mb-3">
          {step.title}
        </h2>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-4 border-blue-300 mb-6">
        <p className="text-xl text-gray-800 leading-relaxed text-center">
          {config.dialogue}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {config.choices?.map((choice: string, idx: number) => (
          <GameButton
            key={idx}
            onClick={() => onComplete(true)}
            size="lg"
            variant={idx === 0 ? 'primary' : 'success'}
          >
            {choice}
          </GameButton>
        ))}
      </div>
    </GameCard>
  );
};