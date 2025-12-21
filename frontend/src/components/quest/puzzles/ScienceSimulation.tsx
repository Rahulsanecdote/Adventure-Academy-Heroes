import React, { useState } from 'react';
import { QuestStep } from '../../../types';
import { GameButton } from '../../ui/GameButton';
import { GameCard } from '../../ui/GameCard';

interface ScienceSimulationProps {
  step: QuestStep;
  onComplete: (correct: boolean) => void;
  onUseHint: () => void;
  hintsUsed: number;
}

export const ScienceSimulation: React.FC<ScienceSimulationProps> = ({
  step,
  onComplete,
  onUseHint,
  hintsUsed,
}) => {
  const config = step.config;
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setShowResult(true);
    }, 2000);
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    const correct = answer === config.correct_answer;
    
    if (correct) {
      setTimeout(() => onComplete(true), 1500);
    }
  };

  const handleHint = () => {
    if (hintsUsed < step.hints.length) {
      setShowHint(true);
      onUseHint();
    }
  };

  const renderSimulation = () => {
    if (config.sim_type === 'gravity_drop') {
      return (
        <div className="relative h-96 bg-gradient-to-b from-blue-200 to-green-200 rounded-2xl border-4 border-blue-400 overflow-hidden">
          {/* Ground */}
          <div className="absolute bottom-0 w-full h-8 bg-green-600 border-t-4 border-green-700"></div>
          
          {/* Objects */}
          <div className="flex justify-around items-start h-full pt-8">
            {config.objects.map((obj: string, idx: number) => (
              <div key={idx} className="flex flex-col items-center">
                <div className={`text-6xl transition-all duration-1000 ${
                  isSimulating ? 'transform translate-y-64' : ''
                }`} style={{
                  transitionDelay: config.environment === 'earth' && obj === 'feather' ? '500ms' : '0ms'
                }}>
                  {obj === 'feather' ? '🪶' : '🪨'}
                </div>
                <p className="mt-4 font-bold text-gray-800 capitalize">{obj}</p>
              </div>
            ))}
          </div>
          
          {/* Environment Label */}
          <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 font-bold">
            {config.environment === 'earth' ? '🌍 Earth' : '🚀 Space'}
          </div>
        </div>
      );
    }
    
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

      {/* Simulation Area */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🔬 Experiment:</h3>
        {renderSimulation()}
        
        {!isSimulating && !showResult && (
          <div className="text-center mt-6">
            <GameButton onClick={runSimulation} size="lg">
              ▶️ Run Experiment
            </GameButton>
          </div>
        )}
      </div>

      {/* Question */}
      {showResult && (
        <div className="bg-purple-50 rounded-2xl p-6 border-4 border-purple-300 mb-6">
          <p className="text-xl font-semibold text-gray-800 mb-4">
            {config.question}
          </p>
          
          <div className="grid gap-3">
            {['rock', 'feather', 'yes', 'no'].filter(opt => 
              config.question.toLowerCase().includes(opt) || 
              config.correct_answer === opt
            ).map((answer) => (
              <GameButton
                key={answer}
                onClick={() => handleAnswer(answer)}
                variant={selectedAnswer === answer ? 
                  (selectedAnswer === config.correct_answer ? 'success' : 'danger') : 
                  'primary'
                }
                disabled={selectedAnswer !== ''}
                size="lg"
              >
                {answer.charAt(0).toUpperCase() + answer.slice(1)}
              </GameButton>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {selectedAnswer === config.correct_answer && (
        <div className="bg-green-50 border-4 border-green-400 rounded-xl p-4 mb-4">
          <p className="text-lg font-semibold text-green-900">
            ✅ Correct! {config.explanation}
          </p>
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

      {/* Hint Button */}
      {!showResult && (
        <div className="text-center">
          <GameButton
            variant="warning"
            onClick={handleHint}
            disabled={hintsUsed >= step.hints.length}
          >
            💡 Need a Hint?
          </GameButton>
        </div>
      )}
    </GameCard>
  );
};