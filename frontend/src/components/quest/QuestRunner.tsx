import React, { useState, useEffect, useCallback } from 'react';
import { questsAPI, progressAPI } from '../../services/api';
import { Quest, QuestStep, QuestProgress, ChildProfile, RewardCeremony } from '../../types';
import { MathPuzzle } from './puzzles/MathPuzzle';
import { CodePuzzle } from './puzzles/CodePuzzle';
import { ScienceSimulation } from './puzzles/ScienceSimulation';
import { DialogueStep } from './puzzles/DialogueStep';
import { CollectStep } from './puzzles/CollectStep';
import { RewardCeremony as RewardCeremonyComponent } from './RewardCeremony';
import { GameButton } from '../ui/GameButton';
import { ProgressBar } from '../ui/ProgressBar';
import { Loading } from '../ui/Loading';

interface QuestRunnerProps {
  questId: string;
  childProfile: ChildProfile;
  onComplete: (reward: RewardCeremony) => void;
  onExit: () => void;
}

// Quest Runner state machine
type RunnerState = 'LOADING' | 'RUNNING' | 'REWARD' | 'ERROR';

export const QuestRunner: React.FC<QuestRunnerProps> = ({
  questId,
  childProfile,
  onComplete,
  onExit,
}) => {
  // Core state
  const [runnerState, setRunnerState] = useState<RunnerState>('LOADING');
  const [quest, setQuest] = useState<Quest | null>(null);
  const [progress, setProgress] = useState<QuestProgress | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [reward, setReward] = useState<RewardCeremony | null>(null);
  const [error, setError] = useState('');
  
  // Step state
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Load quest and start/resume progress
  useEffect(() => {
    loadQuest();
  }, [questId]);

  const loadQuest = async () => {
    try {
      setRunnerState('LOADING');
      
      // Load quest data
      const questData = await questsAPI.getOne(questId);
      setQuest(questData);

      // Start or resume progress
      const progressData = await progressAPI.startQuest(childProfile.id, questId);
      setProgress(progressData);
      setCurrentStepIndex(progressData.current_step_index);
      setHintsUsed(progressData.hints_used);
      
      setRunnerState('RUNNING');
    } catch (err) {
      console.error('Failed to load quest:', err);
      setError('Failed to load quest. Please try again.');
      setRunnerState('ERROR');
    }
  };

  // Handle step completion
  const handleStepComplete = useCallback(async (correct: boolean) => {
    if (!quest || !progress) return;

    if (correct) {
      // Update progress in backend
      try {
        const newStepIndex = currentStepIndex + 1;
        
        await progressAPI.updateProgress(progress.id, {
          current_step_index: newStepIndex,
          total_attempts: progress.total_attempts + attempts + 1,
          hints_used: hintsUsed,
        });

        // Check if quest is complete
        if (newStepIndex >= quest.steps.length) {
          await completeQuest();
        } else {
          // Move to next step
          setCurrentStepIndex(newStepIndex);
          setAttempts(0);
          setHintsUsed(0);
        }
      } catch (err) {
        console.error('Failed to update progress:', err);
      }
    } else {
      // Incorrect answer - increment attempts
      setAttempts(prev => prev + 1);
    }
  }, [quest, progress, currentStepIndex, attempts, hintsUsed]);

  // Complete quest and get rewards
  const completeQuest = async () => {
    if (!progress) return;
    
    try {
      // Call backend to complete quest and award rewards
      const rewardData = await progressAPI.completeQuest(progress.id);
      setReward(rewardData);
      setRunnerState('REWARD');
    } catch (err) {
      console.error('Failed to complete quest:', err);
      setError('Failed to complete quest. Please try again.');
      setRunnerState('ERROR');
    }
  };

  // Handle hint usage
  const handleUseHint = useCallback(() => {
    setHintsUsed(prev => prev + 1);
  }, []);

  // Handle reward ceremony completion
  const handleRewardContinue = useCallback(() => {
    if (reward) {
      onComplete(reward);
    }
  }, [reward, onComplete]);

  // Render based on state
  if (runnerState === 'LOADING') {
    return <Loading text="Loading quest..." />;
  }

  if (runnerState === 'ERROR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4">Oops!</h1>
          <p className="text-xl mb-6">{error}</p>
          <GameButton onClick={onExit}>Back to Hub</GameButton>
        </div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-500">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold mb-4">Quest not found!</h1>
          <GameButton onClick={onExit}>Back to Hub</GameButton>
        </div>
      </div>
    );
  }

  // REWARD state - show ceremony
  if (runnerState === 'REWARD' && reward) {
    return (
      <RewardCeremonyComponent
        quest={quest}
        childProfile={childProfile}
        onContinue={handleRewardContinue}
      />
    );
  }

  // RUNNING state - show current step
  const currentStep = quest.steps[currentStepIndex];
  const progressPercentage = ((currentStepIndex) / quest.steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b-4 border-white/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-game font-bold text-white text-game-shadow">
                {quest.title}
              </h1>
              <p className="text-white/80 font-semibold">
                Step {currentStepIndex + 1} of {quest.steps.length}
              </p>
            </div>
            <GameButton variant="danger" size="sm" onClick={onExit}>
              ✕ Exit Quest
            </GameButton>
          </div>
          
          {/* Progress Bar */}
          <ProgressBar
            progress={progressPercentage}
            color="rainbow"
            size="lg"
            showPercentage={false}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto p-4">
        <StepRenderer
          step={currentStep}
          onComplete={handleStepComplete}
          onUseHint={handleUseHint}
          hintsUsed={hintsUsed}
          attempts={attempts}
        />
      </div>

      {/* XP Display */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl border-4 border-roblox-purple p-4">
          <div className="text-white font-bold text-center">
            <div className="text-sm">Step Reward</div>
            <div className="text-2xl text-roblox-yellow">+{currentStep.xp_reward} XP</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Renderer Component
interface StepRendererProps {
  step: QuestStep;
  onComplete: (correct: boolean) => void;
  onUseHint: () => void;
  hintsUsed: number;
  attempts: number;
}

const StepRenderer: React.FC<StepRendererProps> = (props) => {
  const { step } = props;

  switch (step.step_type) {
    case 'math_puzzle':
      return <MathPuzzle {...props} />;
    case 'code_puzzle':
      return <CodePuzzle {...props} />;
    case 'science_sim':
      return <ScienceSimulation {...props} />;
    case 'dialogue':
      return <DialogueStep {...props} />;
    case 'collect':
      return <CollectStep {...props} />;
    default:
      return (
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-xl text-gray-700">Unknown step type: {step.step_type}</p>
          <GameButton onClick={() => props.onComplete(true)} className="mt-4">
            Skip Step
          </GameButton>
        </div>
      );
  }
};
