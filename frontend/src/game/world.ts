import * as BABYLON from '@babylonjs/core';
import type { PortalData } from './types';

// ---------------------------------------------------------------------------
// World building helpers. Everything a world creates is parented under a
// single root TransformNode so the engine can dispose a whole world when
// switching scenes (Hub <-> Math Jungle).
// ---------------------------------------------------------------------------

export interface WorldCallbacks {
  onPortalEnter?: (portal: PortalData) => void;
  onNPCClick?: (npcId: string) => void;
  onQuestStation?: (stationIndex: number) => void;
}

export interface BuiltWorld {
  root: BABYLON.TransformNode;
  portals: PortalData[];
}

export const PORTAL_TRIGGER_RADIUS = 4;

export function create3DLabel(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  text: string,
  position: BABYLON.Vector3
): void {
  const plane = BABYLON.MeshBuilder.CreatePlane(`label_${text}`, { width: 3, height: 0.6 }, scene);
  plane.position = position;
  plane.parent = parent;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

  const texture = new BABYLON.DynamicTexture(`labelTex_${text}`, { width: 512, height: 128 }, scene, true);
  texture.drawText(text, null, 85, 'bold 48px Arial', 'white', 'transparent', true);

  const mat = new BABYLON.StandardMaterial(`labelMat_${text}`, scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  mat.opacityTexture = texture;
  mat.backFaceCulling = false;
  plane.material = mat;
}

export function createTree(scene: BABYLON.Scene, parent: BABYLON.TransformNode, position: BABYLON.Vector3): void {
  const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { height: 2, diameterTop: 0.3, diameterBottom: 0.5 }, scene);
  trunk.position = position.clone();
  trunk.position.y = 1;
  trunk.parent = parent;
  // Solid: the player's capsule stops here instead of walking through.
  trunk.checkCollisions = true;
  const trunkMat = new BABYLON.StandardMaterial('trunkMat', scene);
  trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.26, 0.13);
  trunk.material = trunkMat;

  const foliageMat = new BABYLON.StandardMaterial('foliageMat', scene);
  foliageMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2);

  const foliage1 = BABYLON.MeshBuilder.CreateCylinder('foliage1', { height: 1.5, diameterTop: 0, diameterBottom: 2 }, scene);
  foliage1.position = position.clone();
  foliage1.position.y = 2.5;
  foliage1.parent = parent;
  foliage1.material = foliageMat;

  const foliage2 = BABYLON.MeshBuilder.CreateCylinder('foliage2', { height: 1.2, diameterTop: 0, diameterBottom: 1.5 }, scene);
  foliage2.position = position.clone();
  foliage2.position.y = 3.5;
  foliage2.parent = parent;
  foliage2.material = foliageMat;
}

function createGround(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  name: string,
  color: BABYLON.Color3,
  patchColor: BABYLON.Color3,
  size = 60
): void {
  const ground = BABYLON.MeshBuilder.CreateGround(name, { width: size, height: size, subdivisions: 4 }, scene);
  const groundMat = new BABYLON.StandardMaterial(`${name}Mat`, scene);
  groundMat.diffuseColor = color;
  groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
  ground.material = groundMat;
  ground.receiveShadows = true;
  ground.checkCollisions = true;
  ground.parent = parent;

  for (let i = 0; i < 20; i++) {
    const patch = BABYLON.MeshBuilder.CreateDisc(`grassPatch_${name}_${i}`, { radius: Math.random() * 3 + 1 }, scene);
    patch.rotation.x = Math.PI / 2;
    patch.position.x = (Math.random() - 0.5) * (size - 10);
    patch.position.z = (Math.random() - 0.5) * (size - 10);
    patch.position.y = 0.01;
    patch.parent = parent;
    const patchMat = new BABYLON.StandardMaterial(`patchMat_${name}_${i}`, scene);
    patchMat.diffuseColor = patchColor;
    patch.material = patchMat;
  }
}

function createSkybox(scene: BABYLON.Scene, parent: BABYLON.TransformNode, tint: BABYLON.Color3): void {
  const skyDome = BABYLON.MeshBuilder.CreateSphere('skyDome', { diameter: 200, segments: 32 }, scene);
  const skyMat = new BABYLON.StandardMaterial('skyMat', scene);
  skyMat.backFaceCulling = false;
  skyMat.emissiveColor = tint;
  skyMat.disableLighting = true;
  skyDome.material = skyMat;
  skyDome.parent = parent;
}

function createPortalMesh(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  portalData: PortalData,
  callbacks: WorldCallbacks
): void {
  const def = portalData;

  // Portal base platform
  const platform = BABYLON.MeshBuilder.CreateCylinder(`platform_${def.name}`, { height: 0.2, diameter: 4 }, scene);
  platform.position = def.position.clone();
  platform.position.y = 0.1;
  platform.parent = parent;
  const platformMat = new BABYLON.StandardMaterial(`platformMat_${def.name}`, scene);
  platformMat.diffuseColor = def.color.scale(0.5);
  platform.material = platformMat;
  platform.receiveShadows = true;

  // Portal ring
  const portalRing = BABYLON.MeshBuilder.CreateTorus(`portal_${def.name}`, { diameter: 3, thickness: 0.3, tessellation: 32 }, scene);
  portalRing.position = def.position.clone();
  portalRing.position.y = 2;
  portalRing.rotation.x = Math.PI / 2;
  portalRing.parent = parent;
  const portalMat = new BABYLON.StandardMaterial(`portalMat_${def.name}`, scene);
  portalMat.diffuseColor = def.color;
  portalMat.emissiveColor = def.color.scale(0.5);
  portalMat.alpha = 0.9;
  portalRing.material = portalMat;

  // Portal inner glow
  const portalInner = BABYLON.MeshBuilder.CreateDisc(`portalInner_${def.name}`, { radius: 1.3 }, scene);
  portalInner.position = def.position.clone();
  portalInner.position.y = 2;
  portalInner.rotation.x = Math.PI / 2;
  portalInner.parent = parent;
  const innerMat = new BABYLON.StandardMaterial(`innerMat_${def.name}`, scene);
  innerMat.diffuseColor = def.color;
  innerMat.emissiveColor = def.color;
  innerMat.alpha = 0.6;
  portalInner.material = innerMat;

  // Glow effect
  const glow = new BABYLON.GlowLayer(`glow_${def.name}`, scene, { mainTextureFixedSize: 256, blurKernelSize: 64 });
  glow.addIncludedOnlyMesh(portalRing);
  glow.addIncludedOnlyMesh(portalInner);
  glow.intensity = 0.5;

  // Portal rotation animation
  scene.registerBeforeRender(() => {
    if (portalRing.isDisposed()) return;
    portalRing.rotation.z += 0.01;
    portalInner.rotation.y += 0.02;
  });

  // Click interaction (backup to proximity)
  platform.actionManager = new BABYLON.ActionManager(scene);
  platform.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
      if (callbacks.onPortalEnter) {
        callbacks.onPortalEnter(portalData);
      }
    })
  );

  create3DLabel(scene, parent, def.name, def.position.add(new BABYLON.Vector3(0, 4, 0)));
}

function createNPC(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  npcData: { name: string; position: BABYLON.Vector3; color: BABYLON.Color3 },
  callbacks: WorldCallbacks
): void {
  const npcContainer = new BABYLON.TransformNode(`npc_${npcData.name}`, scene);
  npcContainer.position = npcData.position;
  npcContainer.parent = parent;

  const body = BABYLON.MeshBuilder.CreateCapsule(`npcBody_${npcData.name}`, { height: 1.5, radius: 0.4 }, scene);
  body.position.y = 0.75;
  body.parent = npcContainer;
  body.checkCollisions = true;
  const bodyMat = new BABYLON.StandardMaterial(`npcMat_${npcData.name}`, scene);
  bodyMat.diffuseColor = npcData.color;
  body.material = bodyMat;

  const head = BABYLON.MeshBuilder.CreateSphere(`npcHead_${npcData.name}`, { diameter: 0.5 }, scene);
  head.position.y = 1.7;
  head.parent = npcContainer;
  const headMat = new BABYLON.StandardMaterial(`npcHeadMat_${npcData.name}`, scene);
  headMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6);
  head.material = headMat;

  let bobPhase = Math.random() * Math.PI * 2;
  scene.registerBeforeRender(() => {
    if (npcContainer.isDisposed()) return;
    bobPhase += 0.03;
    npcContainer.position.y = npcData.position.y + Math.sin(bobPhase) * 0.1;
  });

  body.actionManager = new BABYLON.ActionManager(scene);
  body.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
      if (callbacks.onNPCClick) {
        callbacks.onNPCClick(npcData.name);
      }
    })
  );

  create3DLabel(scene, parent, npcData.name, npcData.position.add(new BABYLON.Vector3(0, 2.5, 0)));
}

// ---------------------------------------------------------------------------
// HUB PLAZA
// ---------------------------------------------------------------------------

export function buildHubWorld(scene: BABYLON.Scene, callbacks: WorldCallbacks): BuiltWorld {
  const root = new BABYLON.TransformNode('worldRoot_hub', scene);
  const portals: PortalData[] = [];

  createGround(scene, root, 'ground', new BABYLON.Color3(0.3, 0.7, 0.3), new BABYLON.Color3(0.25, 0.6, 0.25));
  createSkybox(scene, root, new BABYLON.Color3(0.5, 0.7, 1));

  const portalDefs = [
    { name: 'Math Jungle', worldKey: 'math_jungle', position: new BABYLON.Vector3(-15, 0, 0), color: new BABYLON.Color3(0.2, 0.9, 0.3) },
    { name: 'Code City', worldKey: 'code_city', position: new BABYLON.Vector3(0, 0, -15), color: new BABYLON.Color3(0.2, 0.6, 1) },
    { name: 'Science Spaceport', worldKey: 'science_spaceport', position: new BABYLON.Vector3(15, 0, 0), color: new BABYLON.Color3(0.7, 0.3, 1) },
    // Phase 3: Trick Academy — a full-screen 2D area (not a Babylon world);
    // GamePage intercepts this portal before any quest lookup.
    { name: 'Trick Academy', worldKey: 'trick_academy', position: new BABYLON.Vector3(0, 0, 15), color: new BABYLON.Color3(0.96, 0.62, 0.04) },
  ];

  portalDefs.forEach((def) => {
    const portalData: PortalData = { ...def, radius: PORTAL_TRIGGER_RADIUS };
    portals.push(portalData);
    createPortalMesh(scene, root, portalData, callbacks);
  });

  // NPCs
  createNPC(scene, root, { name: 'Guide', position: new BABYLON.Vector3(3, 0, 5), color: new BABYLON.Color3(1, 0.8, 0) }, callbacks);
  createNPC(scene, root, { name: 'Shop Keeper', position: new BABYLON.Vector3(-3, 0, 5), color: new BABYLON.Color3(0.9, 0.5, 0.2) }, callbacks);

  // Decorations: ring of trees + rocks
  for (let i = 0; i < 15; i++) {
    const angle = (Math.PI * 2 * i) / 15;
    const radius = 22;
    createTree(scene, root, new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }

  for (let i = 0; i < 10; i++) {
    const rock = BABYLON.MeshBuilder.CreateSphere(`rock_${i}`, { diameter: 0.5 + Math.random() * 0.5, segments: 6 }, scene);
    rock.position.x = (Math.random() - 0.5) * 40;
    rock.position.z = (Math.random() - 0.5) * 40;
    rock.position.y = 0.2;
    rock.scaling.y = 0.6;
    rock.parent = root;
    rock.checkCollisions = true;
    const rockMat = new BABYLON.StandardMaterial(`rockMat_${i}`, scene);
    rockMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    rock.material = rockMat;
  }

  return { root, portals };
}

// ---------------------------------------------------------------------------
// MATH JUNGLE (Phase 1)
// Dense low-poly jungle, one guide NPC, three quest stations (totems) and a
// return portal to the hub. Stations are activated by click/tap or by
// standing close and pressing E (handled by the engine's proximity check
// against the returned station positions).
// ---------------------------------------------------------------------------

export interface BuiltMathJungle extends BuiltWorld {
  stations: { index: number; position: BABYLON.Vector3 }[];
}

export function buildMathJungleWorld(scene: BABYLON.Scene, callbacks: WorldCallbacks): BuiltMathJungle {
  const root = new BABYLON.TransformNode('worldRoot_math_jungle', scene);
  const portals: PortalData[] = [];

  createGround(scene, root, 'jungleGround', new BABYLON.Color3(0.16, 0.5, 0.2), new BABYLON.Color3(0.12, 0.42, 0.16));
  createSkybox(scene, root, new BABYLON.Color3(0.45, 0.75, 0.55));
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new BABYLON.Color3(0.45, 0.7, 0.5);

  // Dense jungle border + scattered trees
  for (let i = 0; i < 28; i++) {
    const angle = (Math.PI * 2 * i) / 28;
    const radius = 24 + (i % 3);
    createTree(scene, root, new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const scatter: [number, number][] = [
    [-10, 8], [8, 10], [-6, -12], [12, -6], [-16, -4], [16, 6], [-12, 14], [4, -16],
  ];
  scatter.forEach(([x, z]) => createTree(scene, root, new BABYLON.Vector3(x, 0, z)));

  // Return portal to the hub
  const returnPortal: PortalData = {
    name: 'Back to Hub',
    worldKey: 'hub',
    position: new BABYLON.Vector3(0, 0, 14),
    color: new BABYLON.Color3(1, 0.85, 0.2),
    radius: PORTAL_TRIGGER_RADIUS,
  };
  portals.push(returnPortal);
  createPortalMesh(scene, root, returnPortal, callbacks);

  // Guide NPC
  createNPC(scene, root, { name: 'Miko the Monkey', position: new BABYLON.Vector3(2, 0, 8), color: new BABYLON.Color3(0.65, 0.45, 0.25) }, callbacks);

  // Quest stations: carved number totems
  const stationPositions: [number, number][] = [
    [-10, -4],
    [0, -12],
    [10, -4],
  ];
  const stations = stationPositions.map(([x, z], index) => {
    const position = new BABYLON.Vector3(x, 0, z);

    const base = BABYLON.MeshBuilder.CreateCylinder(`stationBase_${index}`, { height: 0.3, diameter: 3 }, scene);
    base.position = position.clone();
    base.position.y = 0.15;
    base.parent = root;
    base.checkCollisions = true;
    const baseMat = new BABYLON.StandardMaterial(`stationBaseMat_${index}`, scene);
    baseMat.diffuseColor = new BABYLON.Color3(0.45, 0.35, 0.25);
    base.material = baseMat;

    const totem = BABYLON.MeshBuilder.CreateBox(`stationTotem_${index}`, { width: 1, height: 2.4, depth: 1 }, scene);
    totem.position = position.clone();
    totem.position.y = 1.5;
    totem.parent = root;
    totem.checkCollisions = true;
    const totemMat = new BABYLON.StandardMaterial(`stationTotemMat_${index}`, scene);
    totemMat.diffuseColor = new BABYLON.Color3(0.55, 0.4, 0.22);
    totemMat.emissiveColor = new BABYLON.Color3(0.12, 0.08, 0.02);
    totem.material = totemMat;

    const gem = BABYLON.MeshBuilder.CreateSphere(`stationGem_${index}`, { diameter: 0.5 }, scene);
    gem.position = position.clone();
    gem.position.y = 3;
    gem.parent = root;
    const gemMat = new BABYLON.StandardMaterial(`stationGemMat_${index}`, scene);
    gemMat.diffuseColor = new BABYLON.Color3(0.2, 0.95, 0.4);
    gemMat.emissiveColor = new BABYLON.Color3(0.1, 0.6, 0.2);
    gem.material = gemMat;

    let phase = index * 1.3;
    scene.registerBeforeRender(() => {
      if (gem.isDisposed()) return;
      phase += 0.04;
      gem.position.y = 3 + Math.sin(phase) * 0.15;
    });

    const activate = () => {
      if (callbacks.onQuestStation) {
        callbacks.onQuestStation(index);
      }
    };
    [base, totem].forEach((mesh) => {
      mesh.actionManager = new BABYLON.ActionManager(scene);
      mesh.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, activate)
      );
    });

    create3DLabel(scene, root, `Quest ${index + 1}`, position.add(new BABYLON.Vector3(0, 4.2, 0)));

    return { index, position };
  });

  return { root, portals, stations };
}
