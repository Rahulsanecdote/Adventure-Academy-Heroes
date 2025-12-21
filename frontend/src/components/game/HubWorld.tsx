import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, PortalData } from '../../game/GameEngine';
import { ChildProfile } from '../../types';
import { GameButton } from '../ui/GameButton';
import { Modal } from '../ui/Modal';

interface HubWorldProps {
  childProfile: ChildProfile;
  onPortalEnter?: (portal: PortalData) => void;
}

export const HubWorld: React.FC<HubWorldProps> = ({ childProfile, onPortalEnter }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  // UI State
  const [showNPCDialog, setShowNPCDialog] = useState(false);
  const [npcMessage, setNpcMessage] = useState('');
  const [npcName, setNpcName] = useState('');
  const [showControls, setShowControls] = useState(true);
  
  // Portal proximity state
  const [nearPortal, setNearPortal] = useState<PortalData | null>(null);
  const [showPortalConfirm, setShowPortalConfirm] = useState(false);

  const handleNPCClick = useCallback((npcId: string) => {
    const messages: { [key: string]: string } = {
      'Guide': `Welcome to KidQuest Academy, ${childProfile.username}! Walk up to the glowing portals to start your learning adventures. Use WASD keys to move around, and press E when near a portal!`,
      'Shop Keeper': `Hey there! You have ${childProfile.coins} coins. Come back when we open the shop to buy cool cosmetics for your avatar!`,
    };
    setNpcName(npcId);
    setNpcMessage(messages[npcId] || 'Hello there!');
    setShowNPCDialog(true);
  }, [childProfile]);

  const handlePortalProximity = useCallback((portal: PortalData | null) => {
    setNearPortal(portal);
    // Close confirm dialog if we moved away
    if (!portal) {
      setShowPortalConfirm(false);
    }
  }, []);

  const handlePortalEnterRequest = useCallback((_portal: PortalData) => {
    // Show confirmation dialog
    setShowPortalConfirm(true);
  }, []);

  const confirmPortalEntry = useCallback(() => {
    if (nearPortal && onPortalEnter) {
      onPortalEnter(nearPortal);
    }
    setShowPortalConfirm(false);
  }, [nearPortal, onPortalEnter]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine({
      canvasId: 'game-canvas',
      childProfile,
      onPortalProximity: handlePortalProximity,
      onPortalEnter: handlePortalEnterRequest,
      onNPCClick: handleNPCClick,
    });

    engine.setupWorld();
    engineRef.current = engine;

    // Hide controls help after 5 seconds
    const timer = setTimeout(() => setShowControls(false), 5000);

    return () => {
      clearTimeout(timer);
      engine.dispose();
    };
  }, [childProfile, handleNPCClick, handlePortalProximity, handlePortalEnterRequest]);

  const getPortalEmoji = (worldKey: string) => {
    const emojis: { [key: string]: string } = {
      'math_jungle': '🌴',
      'code_city': '🏙️',
      'science_spaceport': '🚀',
    };
    return emojis[worldKey] || '🌟';
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Game Canvas */}
      <canvas
        id="game-canvas"
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 right-4 pointer-events-none">
        <div className="flex justify-between items-start">
          {/* Player Info */}
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl border-4 border-roblox-blue p-4 pointer-events-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl">🎮</div>
              <div>
                <div className="font-display font-bold text-white text-xl">
                  {childProfile.username}
                </div>
                <div className="text-roblox-yellow font-semibold">Level {childProfile.level}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-roblox-purple/30 rounded-lg px-3 py-1">
                <div className="text-xs text-white/70">XP</div>
                <div className="font-bold text-white">{childProfile.total_xp}</div>
              </div>
              <div className="bg-roblox-yellow/30 rounded-lg px-3 py-1">
                <div className="text-xs text-white/70">Coins</div>
                <div className="font-bold text-white">🪙 {childProfile.coins}</div>
              </div>
            </div>
          </div>

          {/* Controls Help */}
          {showControls && (
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl border-4 border-white p-4 pointer-events-auto animate-fade-in">
              <div className="font-display font-bold text-white text-lg mb-2">🎮 Controls</div>
              <div className="space-y-1 text-sm text-white/90">
                <div><strong>WASD</strong> - Move around</div>
                <div><strong>Space</strong> - Jump</div>
                <div><strong>Mouse</strong> - Rotate camera</div>
                <div><strong>Click</strong> - Interact with NPCs</div>
                <div><strong>E</strong> - Enter portal (when near)</div>
              </div>
              <button
                onClick={() => setShowControls(false)}
                className="mt-3 text-xs text-white/50 hover:text-white"
              >
                Close (X)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quest Objective */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl border-4 border-roblox-green p-4 pointer-events-auto">
          <div className="font-display font-bold text-white text-lg mb-2">🎯 Objective</div>
          <div className="text-white/90">Explore the hub and find quest portals!</div>
        </div>
      </div>

      {/* Portal Proximity Prompt - floating above player */}
      {nearPortal && !showPortalConfirm && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-40 animate-bounce">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl border-4 px-6 py-4 text-center"
               style={{ borderColor: `rgb(${nearPortal.color.r * 255}, ${nearPortal.color.g * 255}, ${nearPortal.color.b * 255})` }}>
            <div className="text-3xl mb-2">{getPortalEmoji(nearPortal.worldKey)}</div>
            <div className="text-white font-bold text-lg">{nearPortal.name}</div>
            <div className="text-yellow-400 font-semibold mt-2 animate-pulse">
              Press <span className="bg-yellow-500 text-black px-2 py-1 rounded font-bold">E</span> to Enter
            </div>
          </div>
        </div>
      )}

      {/* Controls Button */}
      {!showControls && (
        <div className="absolute bottom-4 right-4">
          <GameButton size="sm" onClick={() => setShowControls(true)}>
            🎮 Controls
          </GameButton>
        </div>
      )}

      {/* NPC Dialog Modal */}
      <Modal
        isOpen={showNPCDialog}
        onClose={() => setShowNPCDialog(false)}
        title={`💬 ${npcName}`}
      >
        <div className="text-lg mb-6">{npcMessage}</div>
        <GameButton onClick={() => setShowNPCDialog(false)} className="w-full">
          Got it!
        </GameButton>
      </Modal>

      {/* Portal Entry Confirmation Modal */}
      <Modal
        isOpen={showPortalConfirm}
        onClose={() => setShowPortalConfirm(false)}
        title={nearPortal ? `🌟 Enter ${nearPortal.name}?` : ''}
      >
        {nearPortal && (
          <div className="text-center">
            <div className="text-7xl mb-4">
              {getPortalEmoji(nearPortal.worldKey)}
            </div>
            <p className="text-lg mb-6">
              Ready to start your <strong>{nearPortal.name}</strong> adventure?
            </p>
            <div className="flex gap-4">
              <GameButton
                variant="warning"
                onClick={() => setShowPortalConfirm(false)}
                className="flex-1"
              >
                Not Yet
              </GameButton>
              <GameButton
                variant="success"
                onClick={confirmPortalEntry}
                className="flex-1"
              >
                Let's Go! 🚀
              </GameButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
