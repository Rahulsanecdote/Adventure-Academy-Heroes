import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { childrenAPI, questsAPI } from '../services/api';
import { HubWorld } from '../components/game/HubWorld';
import { QuestRunner } from '../components/quest/QuestRunner';
import { Loading } from '../components/ui/Loading';
import { GameButton } from '../components/ui/GameButton';
import type { ChildProfile, Quest, QuestWithProgress, RewardCeremony } from '../types';
import type { PortalData } from '../game/GameEngine';

// Active child storage key
const ACTIVE_CHILD_KEY = 'activeChildId';

// Clean Game State Machine
type GameState = 'HUB' | 'QUEST' | 'REWARD';

interface GamePageState {
  gameState: GameState;
  activeQuestId: string | null;
  questData: Quest | null;
  pendingReward: RewardCeremony | null;
}

interface ErrorDetails {
  message: string;
  status?: number;
  url?: string;
}

export const GamePage: React.FC = () => {
  const { childId: urlChildId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  
  // Resolve childId: URL param > localStorage > redirect
  const [resolvedChildId, setResolvedChildId] = useState<string | null>(null);
  
  // Core state
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [availableQuests, setAvailableQuests] = useState<QuestWithProgress[]>([]);
  
  // Clean game state machine
  const [state, setState] = useState<GamePageState>({
    gameState: 'HUB',
    activeQuestId: null,
    questData: null,
    pendingReward: null,
  });

  // Resolve childId on mount
  useEffect(() => {
    let effectiveChildId = urlChildId;
    
    // If no URL param, try localStorage
    if (!effectiveChildId || effectiveChildId === 'undefined') {
      const storedChildId = localStorage.getItem(ACTIVE_CHILD_KEY);
      if (storedChildId && storedChildId !== 'undefined') {
        effectiveChildId = storedChildId;
        console.log('[GamePage] Using stored childId:', effectiveChildId);
      }
    }
    
    // If still no childId, redirect to dashboard
    if (!effectiveChildId || effectiveChildId === 'undefined') {
      console.warn('[GamePage] No valid childId found, redirecting to dashboard');
      navigate('/parent/dashboard', { 
        state: { message: 'Please select a child profile to play.' } 
      });
      return;
    }
    
    // Store the active child ID
    localStorage.setItem(ACTIVE_CHILD_KEY, effectiveChildId);
    setResolvedChildId(effectiveChildId);
    
    // Update URL if it was missing childId
    if (!urlChildId || urlChildId === 'undefined') {
      navigate(`/game/${effectiveChildId}`, { replace: true });
    }
  }, [urlChildId, navigate]);

  // Load data when childId is resolved
  useEffect(() => {
    if (resolvedChildId) {
      loadChildAndQuests(resolvedChildId);
    }
  }, [resolvedChildId]);

  const loadChildAndQuests = async (childId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[GamePage] Loading data for child:', childId);
      
      // Validate childId before making requests
      if (!childId || childId === 'undefined') {
        throw new Error('Invalid child ID');
      }
      
      const [child, quests] = await Promise.all([
        childrenAPI.getOne(childId),
        questsAPI.getForChild(childId),
      ]);
      
      console.log('[GamePage] Loaded child:', child.username);
      console.log('[GamePage] Available quests:', quests.length);
      
      setChildProfile(child);
      setAvailableQuests(quests);
    } catch (err: unknown) {
      console.error('[GamePage] Failed to load game data:', err);
      
      // Extract error details
      const axiosError = err as { response?: { status?: number; config?: { url?: string } }; message?: string };
      const status = axiosError?.response?.status;
      const url = axiosError?.response?.config?.url;
      const message = axiosError?.message || 'Failed to load player profile';
      
      setError({ message, status, url });
      
      // Clear stored childId if 404 (child doesn't exist)
      if (status === 404) {
        localStorage.removeItem(ACTIVE_CHILD_KEY);
      }
      
      // 401 is handled by API interceptor (redirects to login)
    } finally {
      setLoading(false);
    }
  };

  // Handle portal entry - find quest for this world
  const handlePortalEnter = useCallback((portal: PortalData) => {
    const quest = availableQuests.find(q => 
      q.world === portal.worldKey && !q.is_completed && !q.is_locked
    );
    
    if (quest) {
      setState({
        gameState: 'QUEST',
        activeQuestId: quest.id,
        questData: quest,
        pendingReward: null,
      });
    } else {
      console.log('[GamePage] No available quests for:', portal.worldKey);
    }
  }, [availableQuests]);

  // Handle quest completion
  const handleQuestComplete = useCallback(async (reward: RewardCeremony) => {
    setState(prev => ({
      ...prev,
      gameState: 'REWARD',
      pendingReward: reward,
    }));
    
    // Reload child profile and quests to get updated stats
    if (resolvedChildId) {
      await loadChildAndQuests(resolvedChildId);
    }
  }, [resolvedChildId]);

  // Return to hub from quest
  const handleExitQuest = useCallback(() => {
    setState({
      gameState: 'HUB',
      activeQuestId: null,
      questData: null,
      pendingReward: null,
    });
  }, []);

  // Exit game entirely
  const handleExitGame = useCallback(() => {
    navigate('/parent/dashboard');
  }, [navigate]);

  // Loading state
  if (loading) {
    return <Loading text="Loading game world..." />;
  }

  // Error state with debug info
  if (error || !childProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700">
        <div className="text-center text-white max-w-md px-4">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-display font-bold mb-4">Oops!</h1>
          <p className="text-xl mb-4">{error?.message || 'Failed to load game'}</p>
          
          {/* Debug info in dev */}
          {import.meta.env.DEV && error && (
            <div className="bg-black/30 rounded-lg p-4 mb-6 text-left text-sm">
              <p><strong>Status:</strong> {error.status || 'N/A'}</p>
              <p><strong>URL:</strong> {error.url || 'N/A'}</p>
              <p><strong>ChildId:</strong> {resolvedChildId || 'undefined'}</p>
              <p><strong>Token:</strong> {localStorage.getItem('token') ? 'Present' : 'Missing'}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <GameButton onClick={() => navigate('/parent/dashboard')} className="w-full">
              Back to Dashboard
            </GameButton>
            {error?.status === 401 && (
              <GameButton variant="warning" onClick={() => navigate('/login')} className="w-full">
                Log In Again
              </GameButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  // QUEST state - render QuestRunner
  if (state.gameState === 'QUEST' && state.activeQuestId && state.questData) {
    return (
      <QuestRunner
        questId={state.activeQuestId}
        childProfile={childProfile}
        onComplete={handleQuestComplete}
        onExit={handleExitQuest}
      />
    );
  }

  // HUB state - render 3D world
  return (
    <div className="relative">
      {/* Exit Button */}
      <div className="absolute top-4 right-4 z-50">
        <GameButton variant="danger" size="sm" onClick={handleExitGame}>
          Exit Game
        </GameButton>
      </div>

      {/* 3D Hub World */}
      <HubWorld
        childProfile={childProfile}
        onPortalEnter={handlePortalEnter}
      />
    </div>
  );
};
