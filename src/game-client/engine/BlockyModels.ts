import * as THREE from 'three';
import { VocationType } from '../../types/game';
import { createCraftedMonsterModel } from './MonsterModels';

// Shared Materials cache for optimal performance (0 duplicate material allocations)
const materialsCache = new Map<string, THREE.MeshLambertMaterial>();

function getMaterial(color: number | string, emissive: number | string = 0x000000): THREE.MeshLambertMaterial {
  const key = `${color}_${emissive}`;
  let mat = materialsCache.get(key);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({
      color,
      emissive,
      flatShading: false,
    });
    materialsCache.set(key, mat);
  }
  return mat;
}

// Pre-cached shared smooth 3D geometries
const GEO = {
  // Head & Facial Features
  headSphere: new THREE.SphereGeometry(0.28, 16, 14),
  earSphere: new THREE.SphereGeometry(0.065, 8, 8),
  noseCone: new THREE.ConeGeometry(0.04, 0.08, 8),
  eyeWhite: new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12),
  eyeIris: new THREE.CylinderGeometry(0.055, 0.055, 0.025, 12),
  eyePupil: new THREE.CylinderGeometry(0.032, 0.032, 0.03, 10),
  eyeGlint: new THREE.SphereGeometry(0.016, 6, 6),
  eyeLashArc: new THREE.TorusGeometry(0.075, 0.016, 6, 10, Math.PI * 0.8),
  eyebrowBox: new THREE.BoxGeometry(0.11, 0.025, 0.03),
  neckCyl: new THREE.CylinderGeometry(0.12, 0.14, 0.15, 12),

  // Sculpted Anime Hair
  hairCapDome: new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
  hairBangCenter: new THREE.ConeGeometry(0.09, 0.26, 6),
  hairBangSide: new THREE.ConeGeometry(0.07, 0.22, 6),
  hairLockBack: new THREE.ConeGeometry(0.08, 0.28, 6),

  // Torso & Armor
  torsoAnatomical: new THREE.CylinderGeometry(0.29, 0.22, 0.65, 14),
  chestPlateArmor: new THREE.CylinderGeometry(0.31, 0.24, 0.44, 14),
  breastplateTrim: new THREE.TorusGeometry(0.25, 0.03, 8, 14, Math.PI * 0.85),
  heraldryEmblem: new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8),
  beltStrap: new THREE.CylinderGeometry(0.235, 0.235, 0.11, 14),
  beltBucklePlate: new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8),
  pouchBox: new THREE.BoxGeometry(0.1, 0.12, 0.08),

  // Shoulders & Arms
  pauldronDome: new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65),
  pauldronRing: new THREE.TorusGeometry(0.18, 0.035, 8, 14),
  upperArmCyl: new THREE.CylinderGeometry(0.1, 0.085, 0.28, 10),
  elbowJointSphere: new THREE.SphereGeometry(0.085, 8, 8),
  lowerArmCyl: new THREE.CylinderGeometry(0.09, 0.08, 0.26, 10),
  bracerCuffRing: new THREE.CylinderGeometry(0.11, 0.1, 0.16, 10),
  gloveHandSphere: new THREE.SphereGeometry(0.09, 10, 8),
  thumbGloveCyl: new THREE.CylinderGeometry(0.03, 0.025, 0.08, 8),

  // Legs & Boots
  upperLegThigh: new THREE.CylinderGeometry(0.13, 0.1, 0.32, 10),
  kneePlateSphere: new THREE.SphereGeometry(0.11, 8, 8),
  lowerLegShin: new THREE.CylinderGeometry(0.11, 0.09, 0.3, 10),
  bootFoldCuff: new THREE.CylinderGeometry(0.13, 0.11, 0.12, 12),
  bootFootBase: new THREE.CylinderGeometry(0.1, 0.11, 0.28, 10),
  bootToeSphere: new THREE.SphereGeometry(0.1, 10, 8),

  // Flowing Hero Cape
  capeTopSegment: new THREE.CylinderGeometry(0.26, 0.33, 0.26, 12, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
  capeMidSegment: new THREE.CylinderGeometry(0.33, 0.4, 0.35, 12, 1, false, -Math.PI * 0.5, Math.PI),
  capeLowSegment: new THREE.CylinderGeometry(0.4, 0.48, 0.38, 12, 1, false, -Math.PI * 0.55, Math.PI * 1.1),
  capeTrimTorus: new THREE.TorusGeometry(0.42, 0.025, 6, 14, Math.PI),

  // Knight Crusader Great Helm
  helmDomeSphere: new THREE.SphereGeometry(0.31, 16, 14),
  helmVisorFace: new THREE.CylinderGeometry(0.32, 0.32, 0.18, 14, 1, false, -Math.PI * 0.38, Math.PI * 0.76),
  helmVisorSlit: new THREE.CylinderGeometry(0.325, 0.325, 0.035, 14, 1, false, -Math.PI * 0.28, Math.PI * 0.56),
  helmPlumeArch: new THREE.TorusGeometry(0.24, 0.05, 8, 14, Math.PI * 0.8),
  helmPlumeFeather: new THREE.ConeGeometry(0.07, 0.22, 8),

  // Paladin Ranger Cowl & Quiver
  rangerCowlDome: new THREE.SphereGeometry(0.32, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.78),
  rangerBrimTorus: new THREE.TorusGeometry(0.29, 0.04, 8, 16),
  rangerFeatherCyl: new THREE.CylinderGeometry(0.02, 0.005, 0.35, 6),
  rangerFeatherPlume: new THREE.ConeGeometry(0.06, 0.25, 4),
  quiverTube: new THREE.CylinderGeometry(0.09, 0.07, 0.48, 10),
  arrowShaftCyl: new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6),
  arrowFletchingCone: new THREE.ConeGeometry(0.045, 0.15, 4),

  // Sorcerer Archmage Hat & Robe Skirt
  wizardBrimDisc: new THREE.CylinderGeometry(0.5, 0.5, 0.03, 18),
  wizardHatBandCyl: new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16),
  wizardConeBase: new THREE.ConeGeometry(0.27, 0.34, 14),
  wizardConeMid: new THREE.ConeGeometry(0.19, 0.28, 12),
  wizardConeTip: new THREE.ConeGeometry(0.11, 0.24, 10),
  wizardTipOrb: new THREE.SphereGeometry(0.07, 10, 8),
  robeSkirtCyl: new THREE.CylinderGeometry(0.22, 0.44, 0.68, 14),

  // Druid Antlered Cowl & Shaman Crown
  druidCowlSphere: new THREE.SphereGeometry(0.31, 14, 12),
  druidCrownBand: new THREE.TorusGeometry(0.29, 0.035, 6, 14),
  druidThirdEyeGem: new THREE.OctahedronGeometry(0.075),
  antlerBaseBeam: new THREE.CylinderGeometry(0.04, 0.025, 0.28, 8),
  antlerTineBeam: new THREE.CylinderGeometry(0.025, 0.01, 0.17, 8),

  // Weapons & Shields
  swordBladeMesh: new THREE.ConeGeometry(0.085, 0.9, 4),
  swordFullerGroove: new THREE.CylinderGeometry(0.015, 0.008, 0.75, 4),
  swordCrossguardCyl: new THREE.CylinderGeometry(0.035, 0.035, 0.36, 8),
  swordPommelOrb: new THREE.SphereGeometry(0.065, 10, 8),

  shieldCurvedKite: new THREE.CylinderGeometry(0.4, 0.4, 0.7, 12, 1, false, -Math.PI * 0.32, Math.PI * 0.64),
  shieldOuterRim: new THREE.TorusGeometry(0.3, 0.035, 8, 14),
  shieldBossCenter: new THREE.SphereGeometry(0.1, 10, 8),
  shieldEmblemCross: new THREE.CylinderGeometry(0.03, 0.03, 0.52, 6),

  bowUpperCurve: new THREE.TorusGeometry(0.36, 0.032, 8, 14, Math.PI * 0.55),
  bowLowerCurve: new THREE.TorusGeometry(0.36, 0.032, 8, 14, Math.PI * 0.55),
  bowGripWrapCyl: new THREE.CylinderGeometry(0.042, 0.042, 0.16, 8),
  bowStringChord: new THREE.CylinderGeometry(0.008, 0.008, 0.78, 4),
  arrowTipArrowhead: new THREE.ConeGeometry(0.045, 0.11, 6),

  staffShaftPole: new THREE.CylinderGeometry(0.035, 0.03, 1.15, 10),
  staffCoreOrb: new THREE.SphereGeometry(0.15, 14, 12),
  staffAuraRing1: new THREE.TorusGeometry(0.22, 0.028, 8, 16),
  staffAuraRing2: new THREE.TorusGeometry(0.26, 0.022, 8, 16),
  druidCrystalGem: new THREE.OctahedronGeometry(0.16),
  druidLeafFlora: new THREE.ConeGeometry(0.075, 0.2, 4),

  // Monsters
  ratBodyMesh: new THREE.SphereGeometry(0.34, 12, 10),
  ratHeadCone: new THREE.ConeGeometry(0.18, 0.32, 10),
  ratEarDish: new THREE.CylinderGeometry(0.09, 0.09, 0.02, 8),
  ratEyeOrb: new THREE.SphereGeometry(0.045, 6, 6),
  ratTailCurved: new THREE.CylinderGeometry(0.035, 0.01, 0.6, 8),

  skeletonSkullDome: new THREE.SphereGeometry(0.27, 12, 10),
  skeletonJawBox: new THREE.BoxGeometry(0.18, 0.12, 0.18),
  skeletonRibRing: new THREE.TorusGeometry(0.22, 0.04, 6, 10, Math.PI),
  skeletonSpineCyl: new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6),

  cyclopsTorsoMuscular: new THREE.CylinderGeometry(0.58, 0.46, 1.15, 12),
  cyclopsEyeMassive: new THREE.SphereGeometry(0.22, 14, 12),
  cyclopsIrisMassive: new THREE.SphereGeometry(0.12, 10, 8),
  cyclopsClubSpiked: new THREE.CylinderGeometry(0.2, 0.09, 1.25, 10),

  lootChestBox: new THREE.CylinderGeometry(0.22, 0.22, 0.28, 10),
  lootGoldBand: new THREE.TorusGeometry(0.23, 0.03, 8, 12),
};

export interface CharacterMeshHandle {
  group: THREE.Group;
  vocation: VocationType;
  bodyRoot: THREE.Group;
  head: THREE.Group;
  torsoGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponSlot: THREE.Group;
  shieldSlot: THREE.Group;
  capeGroup?: THREE.Group;
  capeMid?: THREE.Mesh;
  capeLow?: THREE.Mesh;
  floatingCrystal?: THREE.Object3D;
  floatingRing1?: THREE.Object3D;
  floatingRing2?: THREE.Object3D;
  updateAnimation: (isMoving: boolean, isAttacking: boolean, delta: number) => void;
}

export function createBlockyCharacter(vocation: VocationType): CharacterMeshHandle {
  const group = new THREE.Group();
  // Heroic stature scale (1.28x for crisp isometric readability)
  group.scale.set(1.28, 1.28, 1.28);

  // 2.5D LuniaZ Shadow Disc anchored to the floor
  const shadowGeo = new THREE.CircleGeometry(0.48, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  group.add(shadowDisc);

  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);

  // Palette harmonies per vocation
  let armorColor = 0x3b82f6; // Knight Blue
  let capeColor = 0xdc2626;  // Knight Crimson Cape
  let accentTrim = 0xf59e0b; // Royal Gold
  let skinColor = 0xfde047;  // Warm anime skin tone
  let hairColor = 0x78350f;  // Warm Brown
  let eyeColor = 0x0284c7;   // Sapphire Blue

  if (vocation === 'PALADIN') {
    armorColor = 0x15803d; // Emerald Ranger Tunic
    capeColor = 0x166534;  // Forest Cloak
    accentTrim = 0xfacc15; // Golden Trim
    hairColor = 0xd97706;  // Golden Blonde
    eyeColor = 0x16a34a;   // Emerald Green
  } else if (vocation === 'SORCERER') {
    armorColor = 0x1e1b4b; // Midnight Astral Indigo
    capeColor = 0x4f46e5;  // Cosmic Violet
    accentTrim = 0x38bdf8; // Luminous Astral Cyan
    hairColor = 0x1e293b;  // Raven Dark
    eyeColor = 0x818cf8;   // Arcane Violet
  } else if (vocation === 'DRUID') {
    armorColor = 0x047857; // Sylvan Sage Green
    capeColor = 0x065f46;  // Nature Mantle
    accentTrim = 0xa3e635; // Leaf Lime
    hairColor = 0x451a03;  // Deep Chestnut
    eyeColor = 0x10b981;   // Jade Teal
  }

  // 1. Head & Facial Expressions
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.48, 0); // Positioned atop the neck pivot

  // Neck
  const neckMesh = new THREE.Mesh(GEO.neckCyl, getMaterial(skinColor));
  neckMesh.position.set(0, -0.18, 0);
  headGroup.add(neckMesh);

  // Smooth Head
  const headMesh = new THREE.Mesh(GEO.headSphere, getMaterial(skinColor));
  headGroup.add(headMesh);

  // Ears
  const leftEar = new THREE.Mesh(GEO.earSphere, getMaterial(skinColor));
  leftEar.position.set(-0.27, 0, 0);
  const rightEar = new THREE.Mesh(GEO.earSphere, getMaterial(skinColor));
  rightEar.position.set(0.27, 0, 0);
  headGroup.add(leftEar, rightEar);

  // Anime Eyes & Face (When not wearing closed helm)
  if (vocation !== 'KNIGHT') {
    // Nose
    const nose = new THREE.Mesh(GEO.noseCone, getMaterial(skinColor));
    nose.position.set(0, -0.02, 0.28);
    nose.rotation.x = Math.PI / 2;
    headGroup.add(nose);

    // Left Eye
    const eyeL = new THREE.Group();
    eyeL.position.set(-0.1, 0.04, 0.25);
    eyeL.rotation.y = -0.15;
    const whiteL = new THREE.Mesh(GEO.eyeWhite, getMaterial(0xffffff));
    whiteL.rotation.x = Math.PI / 2;
    const irisL = new THREE.Mesh(GEO.eyeIris, getMaterial(eyeColor, eyeColor));
    irisL.position.z = 0.015;
    irisL.rotation.x = Math.PI / 2;
    const pupilL = new THREE.Mesh(GEO.eyePupil, getMaterial(0x0f172a));
    pupilL.position.z = 0.025;
    pupilL.rotation.x = Math.PI / 2;
    const glintL = new THREE.Mesh(GEO.eyeGlint, getMaterial(0xffffff, 0xffffff));
    glintL.position.set(0.02, 0.02, 0.04);
    const lashL = new THREE.Mesh(GEO.eyeLashArc, getMaterial(0x1e293b));
    lashL.position.set(0, 0.04, 0.03);
    lashL.rotation.z = Math.PI * 0.1;
    eyeL.add(whiteL, irisL, pupilL, glintL, lashL);

    // Right Eye
    const eyeR = new THREE.Group();
    eyeR.position.set(0.1, 0.04, 0.25);
    eyeR.rotation.y = 0.15;
    const whiteR = new THREE.Mesh(GEO.eyeWhite, getMaterial(0xffffff));
    whiteR.rotation.x = Math.PI / 2;
    const irisR = new THREE.Mesh(GEO.eyeIris, getMaterial(eyeColor, eyeColor));
    irisR.position.z = 0.015;
    irisR.rotation.x = Math.PI / 2;
    const pupilR = new THREE.Mesh(GEO.eyePupil, getMaterial(0x0f172a));
    pupilR.position.z = 0.025;
    pupilR.rotation.x = Math.PI / 2;
    const glintR = new THREE.Mesh(GEO.eyeGlint, getMaterial(0xffffff, 0xffffff));
    glintR.position.set(0.02, 0.02, 0.04);
    const lashR = new THREE.Mesh(GEO.eyeLashArc, getMaterial(0x1e293b));
    lashR.position.set(0, 0.04, 0.03);
    lashR.rotation.z = -Math.PI * 0.1;
    eyeR.add(whiteR, irisR, pupilR, glintR, lashR);

    // Eyebrows
    const browL = new THREE.Mesh(GEO.eyebrowBox, getMaterial(hairColor));
    browL.position.set(-0.1, 0.12, 0.26);
    browL.rotation.z = 0.1;
    const browR = new THREE.Mesh(GEO.eyebrowBox, getMaterial(hairColor));
    browR.position.set(0.1, 0.12, 0.26);
    browR.rotation.z = -0.1;

    headGroup.add(eyeL, eyeR, browL, browR);

    // Sculpted Anime Hair
    const hairCap = new THREE.Mesh(GEO.hairCapDome, getMaterial(hairColor));
    hairCap.position.set(0, 0.06, 0);

    const bangC = new THREE.Mesh(GEO.hairBangCenter, getMaterial(hairColor));
    bangC.position.set(0, 0.16, 0.24);
    bangC.rotation.x = 0.45;

    const bangL = new THREE.Mesh(GEO.hairBangSide, getMaterial(hairColor));
    bangL.position.set(-0.14, 0.14, 0.22);
    bangL.rotation.set(0.3, 0, -0.35);

    const bangR = new THREE.Mesh(GEO.hairBangSide, getMaterial(hairColor));
    bangR.position.set(0.14, 0.14, 0.22);
    bangR.rotation.set(0.3, 0, 0.35);

    headGroup.add(hairCap, bangC, bangL, bangR);
  }

  // Headgear per vocation
  if (vocation === 'KNIGHT') {
    // Crusader Great Helm
    const helmMat = getMaterial(0x94a3b8);
    const helmDome = new THREE.Mesh(GEO.helmDomeSphere, helmMat);
    const helmVisor = new THREE.Mesh(GEO.helmVisorFace, getMaterial(0x64748b));
    helmVisor.position.set(0, -0.02, 0.02);

    // Glowing Cyan Visor Eye Slit
    const visorSlit = new THREE.Mesh(GEO.helmVisorSlit, getMaterial(0x38bdf8, 0x0284c7));
    visorSlit.position.set(0, 0.04, 0.03);

    // Golden Helm Crest Mount & Plume
    const plumeMount = new THREE.Mesh(GEO.heraldryEmblem, getMaterial(accentTrim));
    plumeMount.position.set(0, 0.28, 0);

    const plumeArc = new THREE.Mesh(GEO.helmPlumeArch, getMaterial(0xdc2626));
    plumeArc.position.set(0, 0.32, -0.08);
    plumeArc.rotation.y = Math.PI / 2;

    const plumeTip = new THREE.Mesh(GEO.helmPlumeFeather, getMaterial(0xef4444));
    plumeTip.position.set(0, 0.48, -0.22);
    plumeTip.rotation.x = -Math.PI * 0.4;

    headGroup.add(helmDome, helmVisor, visorSlit, plumeMount, plumeArc, plumeTip);
  } else if (vocation === 'PALADIN') {
    // Ranger Cowl with Golden Phoenix Feather
    const hood = new THREE.Mesh(GEO.rangerCowlDome, getMaterial(0x15803d));
    hood.position.set(0, 0.04, -0.02);

    const brim = new THREE.Mesh(GEO.rangerBrimTorus, getMaterial(accentTrim));
    brim.position.set(0, 0.12, 0.04);
    brim.rotation.x = Math.PI / 2;

    const feather = new THREE.Group();
    feather.position.set(-0.28, 0.16, 0.05);
    feather.rotation.set(-0.2, 0, -0.45);
    const fShaft = new THREE.Mesh(GEO.rangerFeatherCyl, getMaterial(0xfef08a));
    const fPlume = new THREE.Mesh(GEO.rangerFeatherPlume, getMaterial(0xfacc15, 0xeab308));
    fPlume.position.y = 0.14;
    feather.add(fShaft, fPlume);

    headGroup.add(hood, brim, feather);
  } else if (vocation === 'SORCERER') {
    // Archmage Wizard Hat with Cosmic Star Buckle & Floating Star
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.16, 0);

    const brim = new THREE.Mesh(GEO.wizardBrimDisc, getMaterial(0x1e1b4b));
    const band = new THREE.Mesh(GEO.wizardHatBandCyl, getMaterial(accentTrim));
    band.position.y = 0.04;

    const cone1 = new THREE.Mesh(GEO.wizardConeBase, getMaterial(0x1e1b4b));
    cone1.position.set(0, 0.2, 0);
    const cone2 = new THREE.Mesh(GEO.wizardConeMid, getMaterial(0x1e1b4b));
    cone2.position.set(0, 0.42, -0.05);
    cone2.rotation.x = -0.3;
    const cone3 = new THREE.Mesh(GEO.wizardConeTip, getMaterial(0x1e1b4b));
    cone3.position.set(0, 0.6, -0.16);
    cone3.rotation.x = -0.6;

    const starOrb = new THREE.Mesh(GEO.wizardTipOrb, getMaterial(0x38bdf8, 0x0284c7));
    starOrb.position.set(0, 0.72, -0.28);

    hatGroup.add(brim, band, cone1, cone2, cone3, starOrb);
    headGroup.add(hatGroup);
  } else if (vocation === 'DRUID') {
    // Sylvan Horned Antler Cowl & Nature Jewel
    const cowl = new THREE.Mesh(GEO.druidCowlSphere, getMaterial(0x065f46));
    cowl.position.set(0, 0.02, -0.02);

    const crown = new THREE.Mesh(GEO.druidCrownBand, getMaterial(accentTrim));
    crown.position.set(0, 0.12, 0.04);
    crown.rotation.x = Math.PI / 2;

    const gem = new THREE.Mesh(GEO.druidThirdEyeGem, getMaterial(0x22c55e, 0x15803d));
    gem.position.set(0, 0.15, 0.28);

    const antlerL = new THREE.Group();
    antlerL.position.set(-0.2, 0.3, 0);
    antlerL.rotation.z = -0.4;
    const antBaseL = new THREE.Mesh(GEO.antlerBaseBeam, getMaterial(0x78350f));
    const antTineL = new THREE.Mesh(GEO.antlerTineBeam, getMaterial(0x78350f));
    antTineL.position.set(-0.06, 0.08, 0.04);
    antTineL.rotation.z = -0.5;
    antlerL.add(antBaseL, antTineL);

    const antlerR = new THREE.Group();
    antlerR.position.set(0.2, 0.3, 0);
    antlerR.rotation.z = 0.4;
    const antBaseR = new THREE.Mesh(GEO.antlerBaseBeam, getMaterial(0x78350f));
    const antTineR = new THREE.Mesh(GEO.antlerTineBeam, getMaterial(0x78350f));
    antTineR.position.set(0.06, 0.08, 0.04);
    antTineR.rotation.z = 0.5;
    antlerR.add(antBaseR, antTineR);

    headGroup.add(cowl, crown, gem, antlerL, antlerR);
  }

  bodyRoot.add(headGroup);

  // 2. Torso, Armor & Belt
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.88, 0);

  const torsoMesh = new THREE.Mesh(GEO.torsoAnatomical, getMaterial(armorColor));
  const chestPlate = new THREE.Mesh(GEO.chestPlateArmor, getMaterial(vocation === 'KNIGHT' ? 0x94a3b8 : armorColor));
  chestPlate.position.set(0, 0.08, 0.02);

  const chestTrim = new THREE.Mesh(GEO.breastplateTrim, getMaterial(accentTrim));
  chestTrim.position.set(0, 0.18, 0.22);
  chestTrim.rotation.x = Math.PI / 2;

  const chestEmblem = new THREE.Mesh(GEO.heraldryEmblem, getMaterial(accentTrim));
  chestEmblem.position.set(0, 0.14, 0.24);
  chestEmblem.rotation.x = Math.PI / 2;

  // Leather Belt & Golden Buckle
  const beltMesh = new THREE.Mesh(GEO.beltStrap, getMaterial(0x78350f));
  beltMesh.position.set(0, -0.24, 0);
  const buckleMesh = new THREE.Mesh(GEO.beltBucklePlate, getMaterial(accentTrim));
  buckleMesh.position.set(0, -0.24, 0.22);
  buckleMesh.rotation.x = Math.PI / 2;

  // Belt Pouch
  const pouch = new THREE.Mesh(GEO.pouchBox, getMaterial(0x78350f));
  pouch.position.set(-0.22, -0.24, 0.08);
  pouch.rotation.y = 0.4;

  torsoGroup.add(torsoMesh, chestPlate, chestTrim, chestEmblem, beltMesh, buckleMesh, pouch);

  // Wizard & Druid Robe Skirt
  if (vocation === 'SORCERER' || vocation === 'DRUID') {
    const skirt = new THREE.Mesh(GEO.robeSkirtCyl, getMaterial(armorColor));
    skirt.position.set(0, -0.45, 0);
    torsoGroup.add(skirt);
  }

  // Back Equipment: Quiver or Hero Backpack
  if (vocation === 'PALADIN') {
    const quiver = new THREE.Group();
    quiver.position.set(0.14, 0.06, -0.22);
    quiver.rotation.z = -0.35;
    const qBody = new THREE.Mesh(GEO.quiverTube, getMaterial(0x78350f));
    const arr1 = new THREE.Mesh(GEO.arrowShaftCyl, getMaterial(0xfef08a));
    arr1.position.set(0, 0.2, 0);
    const fth1 = new THREE.Mesh(GEO.arrowFletchingCone, getMaterial(0xfacc15));
    fth1.position.set(0, 0.35, 0);
    quiver.add(qBody, arr1, fth1);
    torsoGroup.add(quiver);
  }

  // Multi-Segmented Hero Cape
  const capeGroup = new THREE.Group();
  capeGroup.position.set(0, 0.28, -0.16);

  const capeUp = new THREE.Mesh(GEO.capeTopSegment, getMaterial(capeColor));
  capeUp.position.set(0, -0.1, 0);

  const capeMid = new THREE.Mesh(GEO.capeMidSegment, getMaterial(capeColor));
  capeMid.position.set(0, -0.36, 0.02);

  const capeLow = new THREE.Mesh(GEO.capeLowSegment, getMaterial(capeColor));
  capeLow.position.set(0, -0.66, 0.04);

  capeGroup.add(capeUp, capeMid, capeLow);
  torsoGroup.add(capeGroup);
  bodyRoot.add(torsoGroup);

  // 3. Articulated Shoulder & Arm Joints (Pivot-based)
  // Left Arm (Shield / Offhand)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.38, 1.15, 0); // Shoulder Joint Pivot

  const leftPauldron = new THREE.Mesh(GEO.pauldronDome, getMaterial(vocation === 'KNIGHT' ? 0x94a3b8 : armorColor));
  const leftPauldronTrim = new THREE.Mesh(GEO.pauldronRing, getMaterial(accentTrim));
  leftPauldronTrim.position.y = -0.02;
  leftPauldronTrim.rotation.x = Math.PI / 2;
  leftPauldron.add(leftPauldronTrim);
  leftArm.add(leftPauldron);

  const leftUpperArm = new THREE.Mesh(GEO.upperArmCyl, getMaterial(armorColor));
  leftUpperArm.position.y = -0.15;
  const leftElbow = new THREE.Mesh(GEO.elbowJointSphere, getMaterial(accentTrim));
  leftElbow.position.y = -0.28;
  const leftLowerArm = new THREE.Mesh(GEO.lowerArmCyl, getMaterial(armorColor));
  leftLowerArm.position.y = -0.42;
  const leftBracer = new THREE.Mesh(GEO.bracerCuffRing, getMaterial(accentTrim));
  leftBracer.position.y = -0.44;
  const leftHand = new THREE.Mesh(GEO.gloveHandSphere, getMaterial(skinColor));
  leftHand.position.y = -0.58;

  leftArm.add(leftUpperArm, leftElbow, leftLowerArm, leftBracer, leftHand);

  const shieldSlot = new THREE.Group();
  shieldSlot.position.set(-0.06, -0.42, 0.12);
  leftArm.add(shieldSlot);
  bodyRoot.add(leftArm);

  // Right Arm (Weapon Hand)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.38, 1.15, 0); // Shoulder Joint Pivot

  const rightPauldron = new THREE.Mesh(GEO.pauldronDome, getMaterial(vocation === 'KNIGHT' ? 0x94a3b8 : armorColor));
  const rightPauldronTrim = new THREE.Mesh(GEO.pauldronRing, getMaterial(accentTrim));
  rightPauldronTrim.position.y = -0.02;
  rightPauldronTrim.rotation.x = Math.PI / 2;
  rightPauldron.add(rightPauldronTrim);
  rightArm.add(rightPauldron);

  const rightUpperArm = new THREE.Mesh(GEO.upperArmCyl, getMaterial(armorColor));
  rightUpperArm.position.y = -0.15;
  const rightElbow = new THREE.Mesh(GEO.elbowJointSphere, getMaterial(accentTrim));
  rightElbow.position.y = -0.28;
  const rightLowerArm = new THREE.Mesh(GEO.lowerArmCyl, getMaterial(armorColor));
  rightLowerArm.position.y = -0.42;
  const rightBracer = new THREE.Mesh(GEO.bracerCuffRing, getMaterial(accentTrim));
  rightBracer.position.y = -0.44;
  const rightHand = new THREE.Mesh(GEO.gloveHandSphere, getMaterial(skinColor));
  rightHand.position.y = -0.58;

  rightArm.add(rightUpperArm, rightElbow, rightLowerArm, rightBracer, rightHand);

  const weaponSlot = new THREE.Group();
  weaponSlot.position.set(0.06, -0.52, 0.16);
  rightArm.add(weaponSlot);
  bodyRoot.add(rightArm);

  // 4. Articulated Hip & Leg Joints (Pivot-based)
  const pantsColor = 0x1e293b;
  const bootColor = 0x451a03;

  // Left Leg (Hip Pivot)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.58, 0); // Hip Joint Pivot

  const leftThigh = new THREE.Mesh(GEO.upperLegThigh, getMaterial(pantsColor));
  leftThigh.position.y = -0.15;
  const leftKnee = new THREE.Mesh(GEO.kneePlateSphere, getMaterial(accentTrim));
  leftKnee.position.set(0, -0.3, 0.05);
  const leftShin = new THREE.Mesh(GEO.lowerLegShin, getMaterial(bootColor));
  leftShin.position.y = -0.45;
  const leftBootCuff = new THREE.Mesh(GEO.bootFoldCuff, getMaterial(accentTrim));
  leftBootCuff.position.y = -0.36;
  const leftFoot = new THREE.Mesh(GEO.bootFootBase, getMaterial(bootColor));
  leftFoot.position.set(0, -0.6, 0.06);
  leftFoot.rotation.x = Math.PI / 2;
  const leftToe = new THREE.Mesh(GEO.bootToeSphere, getMaterial(bootColor));
  leftToe.position.set(0, -0.6, 0.18);

  leftLeg.add(leftThigh, leftKnee, leftShin, leftBootCuff, leftFoot, leftToe);
  bodyRoot.add(leftLeg);

  // Right Leg (Hip Pivot)
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0.58, 0); // Hip Joint Pivot

  const rightThigh = new THREE.Mesh(GEO.upperLegThigh, getMaterial(pantsColor));
  rightThigh.position.y = -0.15;
  const rightKnee = new THREE.Mesh(GEO.kneePlateSphere, getMaterial(accentTrim));
  rightKnee.position.set(0, -0.3, 0.05);
  const rightShin = new THREE.Mesh(GEO.lowerLegShin, getMaterial(bootColor));
  rightShin.position.y = -0.45;
  const rightBootCuff = new THREE.Mesh(GEO.bootFoldCuff, getMaterial(accentTrim));
  rightBootCuff.position.y = -0.36;
  const rightFoot = new THREE.Mesh(GEO.bootFootBase, getMaterial(bootColor));
  rightFoot.position.set(0, -0.6, 0.06);
  rightFoot.rotation.x = Math.PI / 2;
  const rightToe = new THREE.Mesh(GEO.bootToeSphere, getMaterial(bootColor));
  rightToe.position.set(0, -0.6, 0.18);

  rightLeg.add(rightThigh, rightKnee, rightShin, rightBootCuff, rightFoot, rightToe);
  bodyRoot.add(rightLeg);

  // 5. Hero Weapons & Shields
  let floatingCrystal: THREE.Object3D | undefined;
  let floatingRing1: THREE.Object3D | undefined;
  let floatingRing2: THREE.Object3D | undefined;

  if (vocation === 'KNIGHT') {
    // Royal Broadsword
    const blade = new THREE.Mesh(GEO.swordBladeMesh, getMaterial(0xe2e8f0));
    blade.position.y = 0.45;
    const fuller = new THREE.Mesh(GEO.swordFullerGroove, getMaterial(0x38bdf8, 0x0284c7));
    fuller.position.set(0, 0.4, 0.02);
    const guard = new THREE.Mesh(GEO.swordCrossguardCyl, getMaterial(accentTrim));
    guard.position.y = 0.04;
    guard.rotation.z = Math.PI / 2;
    const pommel = new THREE.Mesh(GEO.swordPommelOrb, getMaterial(0xdc2626));
    pommel.position.y = -0.12;

    weaponSlot.add(blade, fuller, guard, pommel);
    weaponSlot.rotation.x = Math.PI / 4;

    // Curved Crusader Kite Shield
    const sFace = new THREE.Mesh(GEO.shieldCurvedKite, getMaterial(0x1e3a8a));
    const sRim = new THREE.Mesh(GEO.shieldOuterRim, getMaterial(accentTrim));
    sRim.position.z = 0.02;
    const sCrossH = new THREE.Mesh(GEO.shieldEmblemCross, getMaterial(0xdc2626));
    sCrossH.position.z = 0.04;
    sCrossH.rotation.z = Math.PI / 2;
    const sCrossV = new THREE.Mesh(GEO.shieldEmblemCross, getMaterial(0xdc2626));
    sCrossV.position.z = 0.04;
    const sBoss = new THREE.Mesh(GEO.shieldBossCenter, getMaterial(0xf1f5f9));
    sBoss.position.z = 0.08;

    shieldSlot.add(sFace, sRim, sCrossH, sCrossV, sBoss);
    shieldSlot.rotation.y = Math.PI / 2;
  } else if (vocation === 'PALADIN') {
    // Master Recurve Elven Bow
    const bowUpper = new THREE.Mesh(GEO.bowUpperCurve, getMaterial(0xb45309));
    bowUpper.position.set(0, 0.15, 0);
    bowUpper.rotation.x = -0.2;

    const bowLower = new THREE.Mesh(GEO.bowLowerCurve, getMaterial(0xb45309));
    bowLower.position.set(0, -0.15, 0);
    bowLower.rotation.x = Math.PI + 0.2;

    const grip = new THREE.Mesh(GEO.bowGripWrapCyl, getMaterial(0x78350f));
    const string = new THREE.Mesh(GEO.bowStringChord, getMaterial(0xffffff));
    string.position.set(0, 0, 0.18);

    const arrow = new THREE.Group();
    arrow.position.set(0, 0, 0.08);
    arrow.rotation.x = Math.PI / 2;
    const aShaft = new THREE.Mesh(GEO.arrowShaftCyl, getMaterial(0xfef08a));
    const aTip = new THREE.Mesh(GEO.arrowTipArrowhead, getMaterial(0x38bdf8, 0x0284c7));
    aTip.position.y = 0.35;
    const aFeather = new THREE.Mesh(GEO.arrowFletchingCone, getMaterial(0xfacc15));
    aFeather.position.y = -0.3;
    arrow.add(aShaft, aTip, aFeather);

    weaponSlot.add(bowUpper, bowLower, grip, string, arrow);
    weaponSlot.rotation.z = Math.PI / 4;
  } else if (vocation === 'SORCERER') {
    // Archmage Astral Staff with dual rotating astral rings & pulsing core
    const shaft = new THREE.Mesh(GEO.staffShaftPole, getMaterial(0x1e1b4b));
    shaft.position.y = 0.2;

    const orbCore = new THREE.Mesh(GEO.staffCoreOrb, getMaterial(0x38bdf8, 0x0284c7));
    orbCore.position.y = 0.85;
    floatingCrystal = orbCore;

    const ring1 = new THREE.Mesh(GEO.staffAuraRing1, getMaterial(0xf59e0b, 0xd97706));
    ring1.position.y = 0.85;
    floatingRing1 = ring1;

    const ring2 = new THREE.Mesh(GEO.staffAuraRing2, getMaterial(0x818cf8, 0x4f46e5));
    ring2.position.y = 0.85;
    floatingRing2 = ring2;

    weaponSlot.add(shaft, orbCore, ring1, ring2);
    weaponSlot.rotation.x = Math.PI / 8;
  } else if (vocation === 'DRUID') {
    // Sylvan Staff of Life with living flora leaves & floating crystal
    const shaft = new THREE.Mesh(GEO.staffShaftPole, getMaterial(0x78350f));
    shaft.position.y = 0.2;

    const leaf1 = new THREE.Mesh(GEO.druidLeafFlora, getMaterial(0x16a34a));
    leaf1.position.set(0.08, 0.72, 0);
    leaf1.rotation.z = -0.6;

    const leaf2 = new THREE.Mesh(GEO.druidLeafFlora, getMaterial(0x16a34a));
    leaf2.position.set(-0.08, 0.66, 0.04);
    leaf2.rotation.z = 0.6;

    const gemShard = new THREE.Mesh(GEO.druidCrystalGem, getMaterial(0x22c55e, 0x15803d));
    gemShard.position.y = 0.88;
    floatingCrystal = gemShard;

    weaponSlot.add(shaft, leaf1, leaf2, gemShard);
    weaponSlot.rotation.x = Math.PI / 8;
  }

  // 6. Dynamic Animation & Pivot Controller
  let walkCycle = 0;
  let attackCycle = 0;
  let idleBreeze = Math.random() * 10;

  const updateAnimation = (isMoving: boolean, isAttacking: boolean, delta: number) => {
    idleBreeze += delta * 3.5;

    // Astral & Elemental magic floating orbital rotations
    if (floatingCrystal) {
      floatingCrystal.rotation.y += delta * 2.8;
      floatingCrystal.position.y = 0.86 + Math.sin(idleBreeze * 2) * 0.04;
    }
    if (floatingRing1) {
      floatingRing1.rotation.x += delta * 3.2;
      floatingRing1.rotation.y += delta * 1.8;
    }
    if (floatingRing2) {
      floatingRing2.rotation.z += delta * 2.6;
      floatingRing2.rotation.x -= delta * 2.0;
    }

    if (isMoving) {
      walkCycle += delta * 13.5;
      const legSin = Math.sin(walkCycle);

      // Anatomical Stride: Pivoting from the Hip Joint
      leftLeg.rotation.x = legSin * 0.65;
      rightLeg.rotation.x = -legSin * 0.65;

      // Natural Knee Flexion on Backswing
      leftLeg.rotation.z = 0;
      rightLeg.rotation.z = 0;

      // Dynamic Torso & Body Bounce
      bodyRoot.position.y = Math.abs(Math.sin(walkCycle * 2)) * 0.05;
      headGroup.rotation.y = Math.sin(walkCycle) * 0.06;
      torsoGroup.rotation.y = -Math.sin(walkCycle) * 0.05; // Counter-twist spine

      // Arm Swing: Pivoting from the Shoulder Joint
      leftArm.rotation.x = -legSin * 0.5;
      leftArm.rotation.z = 0.08;

      if (!isAttacking) {
        rightArm.rotation.x = legSin * 0.5;
        rightArm.rotation.z = -0.08;
      }

      // Dynamic Cape Wave Physics
      capeGroup.rotation.x = 0.42 + Math.sin(walkCycle * 2) * 0.18;
      capeMid.rotation.x = 0.2 + Math.sin(walkCycle * 2) * 0.12;
      capeLow.rotation.x = 0.25 + Math.sin(walkCycle * 2) * 0.14;
    } else {
      // Smoothly ease legs to rest
      leftLeg.rotation.x += (0 - leftLeg.rotation.x) * Math.min(1.0, delta * 12.0);
      rightLeg.rotation.x += (0 - rightLeg.rotation.x) * Math.min(1.0, delta * 12.0);

      // Idle Breathing & Natural Body Sway
      bodyRoot.position.y = Math.sin(idleBreeze) * 0.025;
      headGroup.rotation.y = Math.sin(idleBreeze * 0.4) * 0.05;
      torsoGroup.rotation.y = 0;
      leftArm.rotation.x = Math.sin(idleBreeze) * 0.06;
      leftArm.rotation.z = 0.05;

      if (!isAttacking) {
        rightArm.rotation.x = -Math.sin(idleBreeze) * 0.06;
        rightArm.rotation.z = -0.05;
      }

      // Gentle Cape Drift in the Wind
      capeGroup.rotation.x = 0.14 + Math.sin(idleBreeze) * 0.08;
      capeMid.rotation.x = 0.08 + Math.sin(idleBreeze + 0.5) * 0.06;
      capeLow.rotation.x = 0.1 + Math.sin(idleBreeze + 1.0) * 0.08;
    }

    // Combat Attack Swings
    if (isAttacking) {
      attackCycle += delta * 18;
      const swing = Math.sin(attackCycle);

      if (vocation === 'KNIGHT') {
        rightArm.rotation.x = -0.6 - swing * 1.5;
        rightArm.rotation.z = -swing * 0.6;
        rightArm.rotation.y = swing * 0.4;
        shieldSlot.rotation.x = swing * 0.35;
      } else if (vocation === 'PALADIN') {
        rightArm.rotation.x = -1.2 + Math.abs(swing) * 0.5;
        leftArm.rotation.x = -0.9;
      } else {
        // Archmage & Druid Staff Channel Thrust
        rightArm.rotation.x = -1.4 + Math.sin(attackCycle * 1.5) * 0.6;
        rightArm.rotation.y = Math.sin(attackCycle * 1.5) * 0.4;
      }
    } else {
      attackCycle = 0;
      if (vocation === 'KNIGHT') {
        rightArm.rotation.y = 0;
      }
    }
  };

  return {
    group,
    vocation,
    bodyRoot,
    head: headGroup,
    torsoGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponSlot,
    shieldSlot,
    capeGroup,
    capeMid,
    capeLow,
    floatingCrystal,
    floatingRing1,
    floatingRing2,
    updateAnimation,
  };
}

export function createBlockyMonster(modelType: string): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const result = createCraftedMonsterModel(modelType);
  // 2.5D LuniaZ Shadow Disc
  const isLarge = modelType.includes('boss') || modelType.includes('queen') || modelType.includes('dragon') || modelType.includes('demon') || modelType.includes('behemoth');
  const shadowGeo = new THREE.CircleGeometry(isLarge ? 0.95 : 0.44, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  result.group.add(shadowDisc);
  return result;
}

export function createLootMesh(): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  return {
    group,
    updateAnimation: () => {},
  };
}
