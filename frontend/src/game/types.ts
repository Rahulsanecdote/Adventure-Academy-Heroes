import * as BABYLON from '@babylonjs/core';
import { ChildProfile } from '../types';

// Portal data structure
export interface PortalData {
  name: string;
  worldKey: string;
  position: BABYLON.Vector3;
  color: BABYLON.Color3;
  radius: number;
}

export interface GameConfig {
  canvasId: string;
  childProfile: ChildProfile;
  onPortalProximity?: (portal: PortalData | null) => void;
  onPortalEnter?: (portal: PortalData) => void;
  onNPCClick?: (npcId: string) => void;
  /** Phase 1: fired when a quest station inside a world is activated. */
  onQuestStation?: (stationIndex: number) => void;
  /** Phase 1: fired when the active world changes (e.g. hub -> math_jungle). */
  onWorldChange?: (worldKey: string) => void;
}

// Game State enum for clean state management
export type GameState = 'HUB' | 'QUEST_ACTIVE' | 'QUEST_COMPLETE';

// World keys used by the scene system
export type WorldKey = 'hub' | 'math_jungle';
