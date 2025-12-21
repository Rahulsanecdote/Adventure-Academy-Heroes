import React, { useState } from 'react';
import { QuestStep } from '../../../types';
import { GameButton } from '../../ui/GameButton';
import { GameCard } from '../../ui/GameCard';

interface CodePuzzleProps {
  step: QuestStep;
  onComplete: (correct: boolean) => void;
  onUseHint: () => void;
  hintsUsed: number;
}

type BlockType = 'move_forward' | 'turn_left' | 'turn_right';

interface Block {
  type: BlockType;
  id: string;
}

export const CodePuzzle: React.FC<CodePuzzleProps> = ({
  step,
  onComplete,
  onUseHint,
  hintsUsed,
}) => {
  const config = step.config;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [robotPosition, setRobotPosition] = useState(config.start_position);

  const blockIcons: { [key in BlockType]: string } = {
    move_forward: '➡️',
    turn_left: '↩️',
    turn_right: '↪️',
  };

  const blockColors: { [key in BlockType]: string } = {
    move_forward: 'bg-roblox-blue',
    turn_left: 'bg-roblox-yellow',
    turn_right: 'bg-roblox-green',
  };

  const addBlock = (type: BlockType) => {
    setBlocks([...blocks, { type, id: `${type}_${Date.now()}` }]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const clearBlocks = () => {
    setBlocks([]);
    setRobotPosition(config.start_position);
    setFeedback('');
  };

  const runCode = () => {
    const solution = config.solution as string[];
    const userSolution = blocks.map(b => b.type);
    
    // Check if solution matches
    const correct = JSON.stringify(userSolution) === JSON.stringify(solution);
    
    if (correct) {
      setFeedback('🎉 Perfect! Your code works!');
      setTimeout(() => onComplete(true), 1500);
    } else {
      setFeedback('❌ Not quite right. Try again!');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const handleHint = () => {
    if (hintsUsed < step.hints.length) {
      setShowHint(true);
      onUseHint();
    }
  };

  return (
    <GameCard className="animate-pop">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-display font-bold text-gray-800 mb-3">
          {step.title}
        </h2>
        <p className="text-xl text-gray-700">{step.description}</p>
      </div>

      {/* Grid Visualization */}
      <div className="bg-gray-800 rounded-2xl p-6 mb-6 border-4 border-gray-700">
        <div className="grid gap-2" style={{
          gridTemplateColumns: `repeat(${config.grid_size.width}, 1fr)`,
          gridTemplateRows: `repeat(${config.grid_size.height}, 1fr)`
        }}>
          {Array.from({ length: config.grid_size.height }).map((_, y) =>
            Array.from({ length: config.grid_size.width }).map((_, x) => {
              const isStart = x === config.start_position.x && y === config.start_position.y;
              const isGoal = x === config.goal_position.x && y === config.goal_position.y;
              const isRobot = x === robotPosition.x && y === robotPosition.y;
              const isObstacle = config.obstacles?.some((obs: any) => obs.x === x && obs.y === y);

              return (
                <div
                  key={`${x}-${y}`}
                  className={`aspect-square rounded-lg border-2 flex items-center justify-center text-3xl ${
                    isObstacle ? 'bg-gray-600 border-gray-500' :
                    isStart ? 'bg-green-500 border-green-600' :
                    isGoal ? 'bg-yellow-500 border-yellow-600' :
                    'bg-gray-700 border-gray-600'
                  }`}
                >
                  {isRobot && '🤖'}
                  {isGoal && '🎯'}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Available Blocks */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-3">🧱 Drag Blocks:</h3>
        <div className="flex gap-3 flex-wrap">
          {config.available_blocks.map((blockType: BlockType) => (
            <button
              key={blockType}
              onClick={() => addBlock(blockType)}
              className={`${
                blockColors[blockType]
              } text-white font-bold py-3 px-6 rounded-xl border-4 border-black/20 hover:scale-105 transition-transform shadow-game`}
            >
              {blockIcons[blockType]} {blockType.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Code Sequence */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-3">📝 Your Code:</h3>
        <div className="bg-gray-100 rounded-xl p-4 border-4 border-gray-300 min-h-24">
          {blocks.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Add blocks to create your code...</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className={`${
                    blockColors[block.type]
                  } text-white font-bold py-2 px-4 rounded-lg border-2 border-black/20 flex items-center gap-2`}
                >
                  <span>{idx + 1}.</span>
                  <span>{blockIcons[block.type]}</span>
                  <span className="text-sm">{block.type.replace('_', ' ')}</span>
                  <button
                    onClick={() => removeBlock(block.id)}
                    className="ml-2 text-white/70 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`text-center text-2xl font-bold mb-4 ${
          feedback.includes('Perfect') ? 'text-green-600' : 'text-red-600'
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
        >
          💡 Hint
        </GameButton>
        <GameButton
          variant="danger"
          onClick={clearBlocks}
        >
          🗑️ Clear
        </GameButton>
        <GameButton
          onClick={runCode}
          disabled={blocks.length === 0}
          className="flex-1"
          size="lg"
        >
          ▶️ Run Code
        </GameButton>
      </div>
    </GameCard>
  );
};