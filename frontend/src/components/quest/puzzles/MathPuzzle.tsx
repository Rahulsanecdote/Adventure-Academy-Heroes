import React, { useState } from 'react';
import { QuestStep } from '../../../types';
import { GameButton } from '../../ui/GameButton';
import { GameCard } from '../../ui/GameCard';

interface MathPuzzleProps {
  step: QuestStep;
  onComplete: (correct: boolean) => void;
  onUseHint: () => void;
  hintsUsed: number;
  attempts: number;
}

export const MathPuzzle: React.FC<MathPuzzleProps> = ({
  step,
  onComplete,
  onUseHint,
  hintsUsed,
  attempts,
}) => {
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState('');
  const config = step.config;

  const handleSubmit = () => {
    const userAnswer = parseInt(answer);
    const correct = userAnswer === config.correct_answer;

    if (correct) {
      setFeedback('🎉 Correct! Great job!');
      setTimeout(() => onComplete(true), 1500);
    } else {
      setFeedback('❌ Not quite. Try again!');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const handleHint = () => {
    if (hintsUsed < step.hints.length) {
      setShowHint(true);
      onUseHint();
    }
  };

  const renderPuzzle = () => {
    switch (config.puzzle_type) {
      case 'counting':
        return renderCountingPuzzle();
      case 'addition':
        return renderAdditionPuzzle();
      case 'fractions':
        return renderFractionsPuzzle();
      default:
        return renderGenericPuzzle();
    }
  };

  const renderCountingPuzzle = () => {
    return (
      <div>
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {config.visual_items?.map((item: string, idx: number) => (
            <div key={idx} className="text-6xl animate-bounce-slow" style={{ animationDelay: `${idx * 0.1}s` }}>
              {item === 'banana' ? '🍌' : item}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAdditionPuzzle = () => {
    return (
      <div className="text-center mb-8">
        <div className="flex justify-center items-center gap-8 text-6xl font-game mb-4">
          <div className="bg-roblox-blue text-white rounded-2xl p-6 border-4 border-blue-700">
            {config.operand1}
          </div>
          <div className="text-white text-7xl">+</div>
          <div className="bg-roblox-green text-white rounded-2xl p-6 border-4 border-green-700">
            {config.operand2}
          </div>
          <div className="text-white text-7xl">=</div>
          <div className="text-white text-7xl">?</div>
        </div>
        {config.visual_mode && (
          <div className="flex justify-center gap-2 flex-wrap">
            {[...Array(config.operand1 + config.operand2)].map((_, idx) => (
              <div key={idx} className="text-4xl">
                {idx < config.operand1 ? '🔵' : '🟢'}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFractionsPuzzle = () => {
    return (
      <div className="text-center mb-8">
        <div className="text-5xl font-game text-white mb-6">
          {config.numerator} / {config.denominator}
        </div>
        {config.visual_type === 'pizza' && (
          <div className="relative w-64 h-64 mx-auto mb-6">
            <PizzaVisual denominator={config.denominator} numerator={config.numerator} />
          </div>
        )}
      </div>
    );
  };

  const renderGenericPuzzle = () => {
    return null;
  };

  return (
    <GameCard className="animate-pop">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-display font-bold text-gray-800 mb-3">
          {step.title}
        </h2>
        <p className="text-xl text-gray-700">{step.description}</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-4 border-blue-300 mb-6">
        <p className="text-2xl font-semibold text-center text-gray-800 mb-6">
          {config.question}
        </p>
        
        {renderPuzzle()}
      </div>

      {/* Answer Input */}
      <div className="mb-6">
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Your answer"
          className="w-full text-center text-4xl font-game p-4 rounded-xl border-4 border-roblox-blue focus:border-roblox-darkblue focus:outline-none"
          autoFocus
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`text-center text-2xl font-bold mb-4 ${
          feedback.includes('Correct') ? 'text-green-600' : 'text-red-600'
        }`}>
          {feedback}
        </div>
      )}

      {/* Hint */}
      {showHint && hintsUsed <= step.hints.length && (
        <div className="bg-yellow-50 border-4 border-yellow-400 rounded-xl p-4 mb-4">
          <p className="text-lg font-semibold text-yellow-900">
            💡 Hint: {step.hints[hintsUsed - 1]}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <GameButton
          variant="warning"
          onClick={handleHint}
          disabled={hintsUsed >= step.hints.length}
          className="flex-1"
        >
          💡 Hint ({step.hints.length - hintsUsed} left)
        </GameButton>
        <GameButton
          onClick={handleSubmit}
          disabled={!answer}
          className="flex-1"
          size="lg"
        >
          ✅ Submit Answer
        </GameButton>
      </div>

      {attempts > 0 && (
        <p className="text-center mt-4 text-gray-600">
          Attempts: {attempts}
        </p>
      )}
    </GameCard>
  );
};

const PizzaVisual: React.FC<{ denominator: number; numerator: number }> = ({ denominator, numerator }) => {
  const slices = [];
  for (let i = 0; i < denominator; i++) {
    const rotation = (360 / denominator) * i;
    const isHighlighted = i < numerator;
    slices.push(
      <div
        key={i}
        className="absolute w-full h-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((2 * Math.PI) / denominator)}% ${50 - 50 * Math.cos((2 * Math.PI) / denominator)}%)`
        }}
      >
        <div className={`w-full h-full rounded-full border-4 border-yellow-800 ${
          isHighlighted ? 'bg-yellow-400' : 'bg-gray-300'
        }`} />
      </div>
    );
  }
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 rounded-full bg-yellow-600 border-8 border-yellow-800">
        {slices}
      </div>
    </div>
  );
};