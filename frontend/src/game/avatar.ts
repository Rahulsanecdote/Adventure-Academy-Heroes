import * as BABYLON from '@babylonjs/core';
import type { AvatarCustomization } from '../types';

// ---------------------------------------------------------------------------
// Avatar colour palettes
// ---------------------------------------------------------------------------

export function getSkinColor(tone: string): BABYLON.Color3 {
  const tones: { [key: string]: BABYLON.Color3 } = {
    light: new BABYLON.Color3(1, 0.87, 0.77),
    medium: new BABYLON.Color3(0.87, 0.72, 0.53),
    tan: new BABYLON.Color3(0.76, 0.57, 0.42),
    dark: new BABYLON.Color3(0.55, 0.38, 0.26),
  };
  return tones[tone] || tones.medium;
}

export function getOutfitColor(outfit: string): BABYLON.Color3 {
  const outfits: { [key: string]: BABYLON.Color3 } = {
    casual_blue: new BABYLON.Color3(0, 0.6, 1),
    casual_red: new BABYLON.Color3(0.9, 0.2, 0.2),
    superhero_cape: new BABYLON.Color3(0.8, 0.1, 0.1),
    default: new BABYLON.Color3(0, 0.6, 1),
  };
  return outfits[outfit] || outfits.default;
}

/** Named outfit colours a child can pick independently of outfit style. */
export function getOutfitColorByName(name: string): BABYLON.Color3 | null {
  const colors: { [key: string]: BABYLON.Color3 } = {
    blue: new BABYLON.Color3(0, 0.6, 1),
    red: new BABYLON.Color3(0.9, 0.2, 0.2),
    green: new BABYLON.Color3(0.2, 0.75, 0.3),
    purple: new BABYLON.Color3(0.6, 0.3, 0.9),
    orange: new BABYLON.Color3(0.95, 0.55, 0.1),
    pink: new BABYLON.Color3(0.95, 0.45, 0.75),
    yellow: new BABYLON.Color3(0.95, 0.8, 0.15),
    teal: new BABYLON.Color3(0.1, 0.75, 0.7),
  };
  return colors[name] || null;
}

export function getHairColor(color: string): BABYLON.Color3 {
  const colors: { [key: string]: BABYLON.Color3 } = {
    black: new BABYLON.Color3(0.1, 0.1, 0.1),
    brown: new BABYLON.Color3(0.4, 0.26, 0.13),
    blonde: new BABYLON.Color3(0.9, 0.8, 0.5),
    red: new BABYLON.Color3(0.7, 0.2, 0.1),
    blue: new BABYLON.Color3(0.2, 0.4, 0.9),
    purple: new BABYLON.Color3(0.6, 0.3, 0.9),
    pink: new BABYLON.Color3(0.95, 0.45, 0.75),
  };
  return colors[color] || colors.brown;
}

// ---------------------------------------------------------------------------
// Blocky low-poly avatar, built from primitive meshes and coloured from the
// child's saved AvatarCustomization. Mesh names (head, leftArm, ...) are
// stable: the player controller animates limbs by name.
// ---------------------------------------------------------------------------

export function buildAvatar(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  avatar: AvatarCustomization
): BABYLON.Mesh[] {
  const meshes: BABYLON.Mesh[] = [];

  const skinColor = getSkinColor(avatar.skin_tone);
  // A separately chosen outfit colour wins over the outfit style's colour.
  const outfitColor =
    (avatar.outfit_color && getOutfitColorByName(avatar.outfit_color)) ||
    getOutfitColor(avatar.outfit);
  const hairColor = getHairColor(avatar.hair_color);

  const avatarContainer = new BABYLON.TransformNode('avatarContainer', scene);
  avatarContainer.parent = parent;

  // HEAD
  const head = BABYLON.MeshBuilder.CreateBox('head', { width: 0.5, height: 0.5, depth: 0.5 }, scene);
  head.position.y = 1.65;
  head.parent = avatarContainer;
  const headMat = new BABYLON.StandardMaterial('headMat', scene);
  headMat.diffuseColor = skinColor;
  head.material = headMat;
  meshes.push(head);

  createFace(scene, head);
  createHair(scene, avatarContainer, avatar.hair_style, hairColor, meshes);

  // TORSO
  const torso = BABYLON.MeshBuilder.CreateBox('torso', { width: 0.6, height: 0.7, depth: 0.35 }, scene);
  torso.position.y = 1.05;
  torso.parent = avatarContainer;
  const torsoMat = new BABYLON.StandardMaterial('torsoMat', scene);
  torsoMat.diffuseColor = outfitColor;
  torso.material = torsoMat;
  meshes.push(torso);

  // ARMS
  const armMat = new BABYLON.StandardMaterial('armMat', scene);
  armMat.diffuseColor = skinColor;

  const leftArm = BABYLON.MeshBuilder.CreateBox('leftArm', { width: 0.2, height: 0.6, depth: 0.2 }, scene);
  leftArm.position.set(-0.4, 1.05, 0);
  leftArm.parent = avatarContainer;
  leftArm.material = armMat;
  meshes.push(leftArm);

  const rightArm = BABYLON.MeshBuilder.CreateBox('rightArm', { width: 0.2, height: 0.6, depth: 0.2 }, scene);
  rightArm.position.set(0.4, 1.05, 0);
  rightArm.parent = avatarContainer;
  rightArm.material = armMat;
  meshes.push(rightArm);

  // LEGS
  const legMat = new BABYLON.StandardMaterial('legMat', scene);
  legMat.diffuseColor = new BABYLON.Color3(0.2, 0.3, 0.5);

  const leftLeg = BABYLON.MeshBuilder.CreateBox('leftLeg', { width: 0.25, height: 0.7, depth: 0.25 }, scene);
  leftLeg.position.set(-0.15, 0.35, 0);
  leftLeg.parent = avatarContainer;
  leftLeg.material = legMat;
  meshes.push(leftLeg);

  const rightLeg = BABYLON.MeshBuilder.CreateBox('rightLeg', { width: 0.25, height: 0.7, depth: 0.25 }, scene);
  rightLeg.position.set(0.15, 0.35, 0);
  rightLeg.parent = avatarContainer;
  rightLeg.material = legMat;
  meshes.push(rightLeg);

  // ACCESSORY (optional)
  if (avatar.accessory === 'glasses') {
    const glassesMat = new BABYLON.StandardMaterial('glassesMat', scene);
    glassesMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    const frame = BABYLON.MeshBuilder.CreateBox('glasses', { width: 0.44, height: 0.1, depth: 0.03 }, scene);
    frame.position.set(0, 0.08, 0.27);
    frame.parent = head;
    frame.material = glassesMat;
    meshes.push(frame);
  } else if (avatar.accessory === 'cape' || avatar.outfit === 'superhero_cape') {
    const capeMat = new BABYLON.StandardMaterial('capeMat', scene);
    capeMat.diffuseColor = new BABYLON.Color3(0.85, 0.1, 0.1);
    const cape = BABYLON.MeshBuilder.CreateBox('cape', { width: 0.55, height: 0.85, depth: 0.04 }, scene);
    cape.position.set(0, 1.0, -0.22);
    cape.parent = avatarContainer;
    cape.material = capeMat;
    meshes.push(cape);
  } else if (avatar.accessory === 'star_pin') {
    const pinMat = new BABYLON.StandardMaterial('pinMat', scene);
    pinMat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.1);
    pinMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.05);
    const pin = BABYLON.MeshBuilder.CreateSphere('starPin', { diameter: 0.12 }, scene);
    pin.position.set(0.18, 0.15, 0.19);
    pin.parent = torso;
    pin.material = pinMat;
    meshes.push(pin);
  }

  return meshes;
}

function createFace(scene: BABYLON.Scene, head: BABYLON.Mesh): void {
  const eyeMat = new BABYLON.StandardMaterial('eyeMat', scene);
  eyeMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);

  const leftEye = BABYLON.MeshBuilder.CreateSphere('leftEye', { diameter: 0.08 }, scene);
  leftEye.position.set(-0.12, 0.08, 0.25);
  leftEye.parent = head;
  leftEye.material = eyeMat;

  const rightEye = BABYLON.MeshBuilder.CreateSphere('rightEye', { diameter: 0.08 }, scene);
  rightEye.position.set(0.12, 0.08, 0.25);
  rightEye.parent = head;
  rightEye.material = eyeMat;

  const smile = BABYLON.MeshBuilder.CreateBox('smile', { width: 0.12, height: 0.02, depth: 0.02 }, scene);
  smile.position.set(0, -0.08, 0.24);
  smile.parent = head;
  const smileMat = new BABYLON.StandardMaterial('smileMat', scene);
  smileMat.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.2);
  smile.material = smileMat;
}

function createHair(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  style: string,
  color: BABYLON.Color3,
  meshes: BABYLON.Mesh[]
): void {
  const hairMat = new BABYLON.StandardMaterial('hairMat', scene);
  hairMat.diffuseColor = color;

  if (style === 'bald') {
    return;
  }

  if (style === 'spiky' || style === 'short') {
    for (let i = 0; i < 5; i++) {
      const spike = BABYLON.MeshBuilder.CreateCylinder(`spike_${i}`, { height: 0.2, diameterTop: 0, diameterBottom: 0.1 }, scene);
      spike.position.y = 1.95;
      spike.position.x = (i - 2) * 0.12;
      spike.parent = parent;
      spike.material = hairMat;
      meshes.push(spike);
    }
  } else if (style === 'curly') {
    for (let i = 0; i < 6; i++) {
      const puff = BABYLON.MeshBuilder.CreateSphere(`curl_${i}`, { diameter: 0.22 }, scene);
      puff.position.y = 1.95;
      puff.position.x = (i % 3 - 1) * 0.17;
      puff.position.z = (Math.floor(i / 3) - 0.5) * 0.2;
      puff.parent = parent;
      puff.material = hairMat;
      meshes.push(puff);
    }
  } else {
    // 'long' and any other style: a cap over the head
    const hair = BABYLON.MeshBuilder.CreateBox('hair', { width: 0.52, height: 0.15, depth: 0.52 }, scene);
    hair.position.y = 1.95;
    hair.parent = parent;
    hair.material = hairMat;
    meshes.push(hair);
  }
}
