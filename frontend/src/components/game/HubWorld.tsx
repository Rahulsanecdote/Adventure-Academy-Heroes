import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, PortalData } from '../../game/GameEngine';
import type { WorldKey } from '../../game/types';
import { MultiplayerClient } from '../../game/net/MultiplayerClient';
import { PHRASES } from '../../game/net/phrases';
import { ChildProfile } from '../../types';
import { GameButton } from '../ui/GameButton';
import { Modal } from '../ui/Modal';

interface HubWorldProps {
  childProfile: ChildProfile;
  onPortalEnter?: (portal: PortalData) => void;
  /** Phase 1: fired when a Math Jungle quest station is activated. */
  onQuestStation?: (stationIndex: number) => void;
}

export const HubWorld: React.FC<HubWorldProps> = ({ childProfile, onPortalEnter, onQuestStation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const mpRef = useRef<MultiplayerClient | null>(null);

  // Phase 2 multiplayer state: null = connecting, true = online, false = offline mode
  const [mpOnline, setMpOnline] = useState<boolean | null>(null);
  // Phase 2 co-op boss state
  const [bossActive, setBossActive] = useState(false);
  const [bossHp, setBossHp] = useState(0);
  const [bossMaxHp, setBossMaxHp] = useState(10);
  const [bossQuestion, setBossQuestion] = useState<string | null>(null);
  const [bossAnswer, setBossAnswer] = useState('');
  const [bossFeedback, setBossFeedback] = useState('');
  const [bossVictory, setBossVictory] = useState(false);

  // UI State
  const [showNPCDialog, setShowNPCDialog] = useState(false);
  const [npcMessage, setNpcMessage] = useState('');
  const [npcName, setNpcName] = useState('');
  // Mobile HUD: on small screens the controls card starts closed (it can be
  // reopened anytime with the 🎮 Controls button). On desktop it starts open
  // and auto-hides via the timer in the engine effect below.
  const [showControls, setShowControls] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 640
  );
  
  // Portal proximity state
  const [nearPortal, setNearPortal] = useState<PortalData | null>(null);
  const [showPortalConfirm, setShowPortalConfirm] = useState(false);

  // Phase 1 scene state: which world is loaded + nearby quest station
  const [currentWorld, setCurrentWorld] = useState<string>('hub');
  const [nearStation, setNearStation] = useState<number | null>(null);

  const handleNPCClick = useCallback((npcId: string) => {
    const messages: { [key: string]: string } = {
      'Guide': `Welcome to KidQuest Academy, ${childProfile.username}! Walk up to the glowing portals to start your learning adventures. Use WASD keys to move around, and press E when near a portal!`,
      'Shop Keeper': `Hey there! You have ${childProfile.coins} coins. Come back when we open the shop to buy cool cosmetics for your avatar!`,
      'Miko': `Welcome to the Math Jungle, ${childProfile.username}! Find the glowing number totems and press E to start a quest. Finish the steps, then beat the Math Challenge to earn your rewards!`,
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
      onQuestStation: (index) => onQuestStation?.(index),
      onWorldChange: (worldKey) => {
        setCurrentWorld(worldKey);
        // Phase 2: follow the player into the new world's room.
        mpRef.current?.switchWorld(worldKey as WorldKey).then((ok) => setMpOnline(ok));
      },
      onStationProximity: (index) => setNearStation(index),
    });

    engine.setupWorld();
    engineRef.current = engine;

    // Phase 2: connect multiplayer (additive — failure means offline mode).
    const partyCode = new URLSearchParams(window.location.search).get('party') || '';
    const mp = new MultiplayerClient(childProfile.id, childProfile.age_band, partyCode);
    mpRef.current = mp;
    mp.setBossCallbacks({
      onQuestion: (prompt) => setBossQuestion(prompt),
      onResult: (correct, hp) => {
        setBossHp(hp);
        setBossFeedback(correct ? '✅ Hit! The boss felt that one!' : '❌ Not quite — try the next one!');
      },
      onEvent: (event) => {
        if (event.type === 'started') {
          setBossFeedback('👹 The Jungle Boss appeared! Answer questions to defeat it together!');
          setBossVictory(false);
        } else if (event.type === 'defeated') {
          setBossVictory(true);
          setBossQuestion(null);
          setBossFeedback('');
          setTimeout(() => setBossVictory(false), 6000);
        }
      },
      onBossState: (active, hp, maxHp) => {
        setBossActive(active);
        setBossHp(hp);
        setBossMaxHp(maxHp);
        if (!active) setBossQuestion(null);
      },
    });
    mp.connect(engine, 'hub').then((ok) => setMpOnline(ok));

    // Hide controls help after 5 seconds (desktop only — on mobile the card
    // starts closed, and a manually opened card must not vanish mid-read)
    const timer = window.innerWidth >= 640
      ? setTimeout(() => setShowControls(false), 5000)
      : undefined;

    return () => {
      if (timer) clearTimeout(timer);
      void mp.disconnect();
      mpRef.current = null;
      engine.dispose();
    };
  }, [childProfile, handleNPCClick, handlePortalProximity, handlePortalEnterRequest, onQuestStation]);

  // Co-op boss auto-join: if a fight is active (someone else started it, or
  // we entered Math Jungle mid-fight) and we hold no question, ask the
  // server for one instead of sitting on "Joining the fight…" forever.
  // The Join fight button below is the manual fallback for the same path.
  useEffect(() => {
    if (bossActive && !bossQuestion && mpOnline === true && currentWorld === 'math_jungle') {
      mpRef.current?.joinBoss();
    }
  }, [bossActive, bossQuestion, mpOnline, currentWorld]);

  const submitBossAnswer = useCallback(() => {
    const value = parseInt(bossAnswer, 10);
    if (Number.isNaN(value)) return;
    mpRef.current?.answerBoss(value);
    setBossAnswer('');
  }, [bossAnswer]);

  const getPortalEmoji = (worldKey: string) => {
    const emojis: { [key: string]: string } = {
      'math_jungle': '🌴',
      'code_city': '🏙️',
      'science_spaceport': '🚀',
      'trick_academy': '🎓',
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
        <div className="flex flex-wrap justify-between items-start gap-2">
          {/* Player Info (+ multiplayer status docked underneath, so it can
              never collide with the top-right buttons or the controls card) */}
          <div className="flex flex-col items-start gap-2">
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl border-4 border-roblox-blue p-3 sm:p-4 pointer-events-auto">
              <div className="flex items-center gap-2 sm:gap-3 sm:mb-2">
                <div className="text-2xl sm:text-3xl">🎮</div>
                <div>
                  <div className="font-display font-bold text-white text-lg sm:text-xl leading-tight">
                    {childProfile.username}
                  </div>
                  <div className="text-roblox-yellow font-semibold text-sm sm:text-base">Level {childProfile.level}</div>
                </div>
              </div>
              <div className="flex sm:grid sm:grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
                <div className="bg-roblox-purple/30 rounded-lg px-2 py-0.5 sm:px-3 sm:py-1">
                  <span className="text-xs text-white/70 sm:block">XP</span>
                  <span className="font-bold text-white ml-1 sm:ml-0">{childProfile.total_xp}</span>
                </div>
                <div className="bg-roblox-yellow/30 rounded-lg px-2 py-0.5 sm:px-3 sm:py-1">
                  <span className="text-xs text-white/70 sm:block">Coins</span>
                  <span className="font-bold text-white ml-1 sm:ml-0">🪙 {childProfile.coins}</span>
                </div>
              </div>
            </div>

            {/* Multiplayer Status (Phase 2) */}
            {mpOnline === true && (
              <div className="bg-green-900/80 backdrop-blur-sm rounded-full border-2 border-green-400 px-3 py-0.5 sm:px-4 sm:py-1">
                <span className="text-white font-bold text-xs sm:text-sm">🟢 Online</span>
              </div>
            )}
          </div>

          {/* Controls Help — drops to a full-width row under the top bar on
              mobile (clear of the Exit / Trick Academy buttons); side card on desktop */}
          {showControls && (
            <div className="order-3 sm:order-none w-full sm:w-auto mt-14 sm:mt-0 bg-black/70 backdrop-blur-sm rounded-2xl border-4 border-white p-3 sm:p-4 pointer-events-auto animate-fade-in">
              <div className="font-display font-bold text-white text-base sm:text-lg mb-2">🎮 Controls</div>
              <div className="space-y-1 text-xs sm:text-sm text-white/90">
                <div><strong>WASD</strong> - Move around</div>
                <div><strong>Click ground</strong> - Walk there</div>
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
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl border-4 border-roblox-green p-3 sm:p-4 pointer-events-auto sm:max-w-md">
          <div className="font-display font-bold text-white text-base sm:text-lg mb-1 sm:mb-2">🎯 Objective</div>
          <div className="text-white/90 text-sm sm:text-base">
            {currentWorld === 'math_jungle'
              ? 'Find a glowing number totem and press E to start its quest!'
              : 'Explore the hub and find quest portals!'}
          </div>
        </div>
      </div>

      {/* Current World Banner (Phase 1) */}
      {currentWorld === 'math_jungle' && (
        <div className="absolute top-32 sm:top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-green-900/80 backdrop-blur-sm rounded-2xl border-4 border-green-400 px-6 py-2 text-center">
            <span className="text-white font-display font-bold text-lg">🌴 Math Jungle</span>
          </div>
        </div>
      )}

      {/* Multiplayer Status (Phase 2) */}
      {mpOnline === false && (
        <div className="absolute top-32 sm:top-20 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-gray-900/85 backdrop-blur-sm rounded-2xl border-4 border-gray-400 px-5 py-2 text-center">
            <span className="text-white font-display font-bold">📴 Offline mode — playing solo</span>
          </div>
        </div>
      )}
      {/* Phrase Chat Bar (Phase 2) — allowlisted phrases only, no free text */}
      {mpOnline === true && (
        <div className="absolute bottom-24 left-2 right-2 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-40">
          <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-2 bg-black/60 backdrop-blur-sm rounded-2xl px-3 py-2 max-w-full sm:max-w-2xl overflow-x-auto sm:overflow-visible">
            {PHRASES.map((phrase) => (
              <button
                key={phrase.id}
                onClick={() => mpRef.current?.sendPhrase(phrase.id)}
                className="bg-roblox-blue/80 hover:bg-roblox-blue text-white text-sm font-semibold rounded-full px-3 py-1 transition whitespace-nowrap shrink-0"
              >
                {phrase.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Co-op Boss Panel (Phase 2, Math Jungle) */}
      {currentWorld === 'math_jungle' && (
        <div className="absolute bottom-36 sm:bottom-40 right-4 z-40 w-[calc(100vw-2rem)] sm:w-72">
          <div className="bg-black/75 backdrop-blur-sm rounded-2xl border-4 border-red-400 p-4">
            <div className="font-display font-bold text-white text-lg mb-2">👹 Jungle Boss</div>
            {bossVictory ? (
              <div className="text-yellow-300 font-bold text-lg text-center py-2">
                🎉 Boss defeated together! 🎉
              </div>
            ) : !bossActive ? (
              <>
                <div className="text-white/90 text-sm mb-3">
                  Team up with everyone in the jungle: answer math questions together to defeat the boss!
                </div>
                <GameButton
                  size="sm"
                  variant="warning"
                  className="w-full"
                  onClick={() => mpRef.current?.startBoss()}
                >
                  Start Co-op Boss Fight
                </GameButton>
                {mpOnline !== true && (
                  <div className="text-white/60 text-xs mt-2">Boss fights need multiplayer — you're offline.</div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-bold text-sm">Boss HP</span>
                  <div className="flex-1 bg-white/20 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-red-500 h-full transition-all"
                      style={{ width: `${bossMaxHp ? (bossHp / bossMaxHp) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-white font-bold text-sm">{bossHp}/{bossMaxHp}</span>
                </div>
                {bossQuestion ? (
                  <>
                    <div className="text-yellow-300 font-display font-bold text-2xl text-center my-2">
                      {bossQuestion}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={bossAnswer}
                        onChange={(e) => setBossAnswer(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitBossAnswer(); }}
                        className="flex-1 rounded-lg px-3 py-2 text-black font-bold text-lg min-w-0"
                        placeholder="Answer"
                      />
                      <GameButton size="sm" variant="success" onClick={submitBossAnswer}>
                        Hit!
                      </GameButton>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-white/80 text-sm mb-2">
                      The boss fight is on! Join in to get your own question.
                    </div>
                    <GameButton
                      size="sm"
                      variant="warning"
                      className="w-full"
                      onClick={() => mpRef.current?.joinBoss()}
                    >
                      Join fight
                    </GameButton>
                    {mpOnline !== true && (
                      <div className="text-white/60 text-xs mt-2">Boss fights need multiplayer — you're offline.</div>
                    )}
                  </>
                )}
                {bossFeedback && <div className="text-white/90 text-sm mt-2">{bossFeedback}</div>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Quest Station Proximity Prompt (Phase 1) */}
      {nearStation !== null && currentWorld === 'math_jungle' && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-40 animate-bounce">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl border-4 border-green-400 px-6 py-4 text-center max-w-[calc(100vw-2rem)]">
            <div className="text-3xl mb-2">🔢</div>
            <div className="text-white font-bold text-lg">Quest Totem {nearStation + 1}</div>
            <div className="text-yellow-400 font-semibold mt-2 animate-pulse">
              Press <span className="bg-yellow-500 text-black px-2 py-1 rounded font-bold">E</span> to Start Quest
            </div>
          </div>
        </div>
      )}

      {/* Portal Proximity Prompt - floating above player */}
      {nearPortal && !showPortalConfirm && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-40 animate-bounce">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl border-4 px-6 py-4 text-center max-w-[calc(100vw-2rem)]"
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
