import * as THREE from 'three';
import { MapGrid } from '../../game-shared/mapLayout';

export interface EnvironmentAnimatedProp {
  update: (delta: number, now: number) => void;
  destroy?: () => void;
}

export interface MapEnvironmentResult {
  group: THREE.Group;
  animatedProps: EnvironmentAnimatedProp[];
  lights: THREE.Light[];
}

// Color Palette Constants for Crafted Environments
const COLORS = {
  // Temple of Thais (Cathedral & Marble Sanctum)
  templeMarble: 0xf1f5f9,
  templeMarbleDark: 0xcbd5e1,
  templeGold: 0xf59e0b,
  templeGoldLight: 0xfde047,
  templeVelvetRed: 0x991b1b,
  templeWood: 0x5c3a21,
  templeWater: 0x38bdf8,
  templeFoliage: 0x15803d,

  // Ancient Sewers (Dank Catacombs & Green Sludge)
  sewerStone: 0x475569,
  sewerStoneDark: 0x334155,
  sewerMoss: 0x22c55e,
  sewerSlime: 0x16a34a,
  sewerWood: 0x4a3728,
  sewerIron: 0x1e293b,
  sewerRust: 0x9a3412,
  sewerMushroom: 0x06b6d4,

  // Mount Sternum Ruins (Necropolis & Dwarven Forge)
  ruinsStone: 0x64748b,
  ruinsDarkStone: 0x1e293b,
  ruinsLava: 0xef4444,
  ruinsLavaGlow: 0xf97316,
  ruinsIron: 0x334155,
  ruinsBone: 0xe2e8f0,
  ruinsCrystal: 0xa855f7,

  // FX & Light
  torchFlame: 0xf97316,
  torchFlameCore: 0xfef08a,
  portalCyan: 0x06b6d4,
  portalBlue: 0x3b82f6,
  portalPurple: 0x8b5cf6,
  portalMagenta: 0xd946ef,
};

// Reusable Shared Materials
const MATS = {
  // Temple
  marble: new THREE.MeshStandardMaterial({ color: COLORS.templeMarble, roughness: 0.35, metalness: 0.1 }),
  marbleGold: new THREE.MeshStandardMaterial({ color: COLORS.templeGold, roughness: 0.3, metalness: 0.6 }),
  carpet: new THREE.MeshStandardMaterial({ color: COLORS.templeVelvetRed, roughness: 0.85 }),
  carpetGoldBorder: new THREE.MeshStandardMaterial({ color: COLORS.templeGold, roughness: 0.4, metalness: 0.5 }),
  pewWood: new THREE.MeshStandardMaterial({ color: COLORS.templeWood, roughness: 0.6 }),
  fountainWater: new THREE.MeshStandardMaterial({
    color: COLORS.templeWater,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.82,
  }),
  holyCrystal: new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x0891b2,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.9,
  }),
  plantGreen: new THREE.MeshStandardMaterial({ color: COLORS.templeFoliage, roughness: 0.7 }),

  // Sewers
  sewerColumn: new THREE.MeshStandardMaterial({ color: COLORS.sewerStone, roughness: 0.8 }),
  sewerIronBand: new THREE.MeshStandardMaterial({ color: COLORS.sewerIron, roughness: 0.5, metalness: 0.7 }),
  sewerSludge: new THREE.MeshStandardMaterial({
    color: COLORS.sewerSlime,
    emissive: 0x14532d,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  }),
  barrelWood: new THREE.MeshStandardMaterial({ color: COLORS.sewerWood, roughness: 0.7 }),
  shroomCap: new THREE.MeshStandardMaterial({
    color: COLORS.sewerMushroom,
    emissive: COLORS.sewerMushroom,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  }),
  shroomStem: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 }),

  // Ruins
  ruinsColumn: new THREE.MeshStandardMaterial({ color: COLORS.ruinsStone, roughness: 0.85 }),
  forgeHearth: new THREE.MeshStandardMaterial({ color: COLORS.ruinsDarkStone, roughness: 0.8 }),
  forgeLava: new THREE.MeshStandardMaterial({
    color: COLORS.ruinsLava,
    emissive: COLORS.ruinsLavaGlow,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  }),
  anvilIron: new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 }),
  crystalPurple: new THREE.MeshStandardMaterial({
    color: COLORS.ruinsCrystal,
    emissive: 0x6b21a8,
    emissiveIntensity: 0.5,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  }),

  // Shared Lights/Flames
  torchFlame: new THREE.MeshBasicMaterial({ color: COLORS.torchFlameCore }),
  torchWood: new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 }),
  torchIron: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.8 }),

  // Open Sanctuary Materials (Performant & Low Draw Call)
  meadowGrass: new THREE.MeshLambertMaterial({ color: 0x3f6212 }),
  cypressLeaf: new THREE.MeshLambertMaterial({ color: 0x14532d, flatShading: true }),
  treeTrunk: new THREE.MeshLambertMaterial({ color: 0x451a03 }),
  mountainHaze: new THREE.MeshLambertMaterial({ color: 0x93c5fd, flatShading: true }),
  cloudWhite: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, flatShading: true }),
  trainingSand: new THREE.MeshLambertMaterial({ color: 0xd4a373 }),
  targetStraw: new THREE.MeshLambertMaterial({ color: 0xeab308 }),
  targetRed: new THREE.MeshLambertMaterial({ color: 0xdc2626 }),
  steelBlade: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 }),
  wisteriaFlower: new THREE.MeshLambertMaterial({ color: 0xc084fc, flatShading: true }),
  lampGlass: new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 }),
  lampIron: new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.4 }),
  runicObelisk: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }),
  runicGlow: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),

  // Medieval Town Square Plaza Materials
  townPaverStone: new THREE.MeshLambertMaterial({ color: 0x8c7860, flatShading: true }),
  canopyRed: new THREE.MeshLambertMaterial({ color: 0xb91c1c }),
  canopyCream: new THREE.MeshLambertMaterial({ color: 0xfef08a }),
  canopyBlue: new THREE.MeshLambertMaterial({ color: 0x1d4ed8 }),
  flowerRed: new THREE.MeshLambertMaterial({ color: 0xef4444 }),
  flowerYellow: new THREE.MeshLambertMaterial({ color: 0xfacc15 }),
  flowerPurple: new THREE.MeshLambertMaterial({ color: 0xa855f7 }),
  flowerPink: new THREE.MeshLambertMaterial({ color: 0xf472b6 }),
  potionRed: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.5, roughness: 0.2 }),
  potionBlue: new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.5, roughness: 0.2 }),
};

/**
 * Creates Classical Round Marble Columns (Temple) or Round Weathered Stone Columns (Dungeons)
 */
function createColumnMesh(isTemple: boolean, isSewers: boolean, isBroken = false): THREE.Group {
  const group = new THREE.Group();

  if (isTemple) {
    // 1. Classical Temple Fluted Corinthian/Ionic Column (Round)
    // Stepped plinth base (round)
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 0.18, 16), MATS.marble);
    basePlinth.position.y = 0.09;

    const baseTorus = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 20), MATS.marbleGold);
    baseTorus.rotation.x = Math.PI / 2;
    baseTorus.position.y = 0.20;

    // Smooth round cylindrical column shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.40, 2.0, 16), MATS.marble);
    shaft.position.y = 1.20;

    // Golden decorative neck band
    const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 8, 20), MATS.marbleGold);
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.y = 2.10;

    // Flared ornate capital plinth (top)
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.38, 0.24, 16), MATS.marble);
    capital.position.y = 2.22;

    const capitalTop = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.50, 0.12, 16), MATS.marbleGold);
    capitalTop.position.y = 2.36;

    group.add(basePlinth, baseTorus, shaft, neckRing, capital, capitalTop);
  } else if (isSewers) {
    // 2. Weathered Round Stone Sewer Column with Rusted Iron Straps
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.22, 12), MATS.sewerColumn);
    base.position.y = 0.11;

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 2.0, 12), MATS.sewerColumn);
    shaft.position.y = 1.15;

    // Iron reinforcement bands
    const ironBand1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 16), MATS.sewerIronBand);
    ironBand1.rotation.x = Math.PI / 2;
    ironBand1.position.y = 0.6;

    const ironBand2 = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.035, 6, 16), MATS.sewerIronBand);
    ironBand2.rotation.x = Math.PI / 2;
    ironBand2.position.y = 1.6;

    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.42, 0.22, 12), MATS.sewerColumn);
    capital.position.y = 2.22;

    group.add(base, shaft, ironBand1, ironBand2, capital);
  } else {
    // 3. Mount Sternum Cyclopean Megalithic Column (Some broken)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 0.25, 12), MATS.ruinsColumn);
    base.position.y = 0.125;

    const columnHeight = isBroken ? 1.1 : 2.0;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, columnHeight, 12), MATS.ruinsColumn);
    shaft.position.y = 0.25 + columnHeight / 2;

    group.add(base, shaft);

    if (!isBroken) {
      const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.44, 0.22, 12), MATS.ruinsColumn);
      capital.position.y = 2.30;
      group.add(capital);
    } else {
      // Broken tumbled column drum next to it
      const fallenDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.45, 10), MATS.ruinsColumn);
      fallenDrum.rotation.z = Math.PI / 2;
      fallenDrum.rotation.y = 0.5;
      fallenDrum.position.set(0.35, 0.22, 0.3);
      group.add(fallenDrum);
    }
  }

  return group;
}

/**
 * Creates the Holy Altar of Thais Temple
 * Round dais, sacrificial marble table, golden candelabras, floating sacred relic
 */
function createThaisHolyAltar(x: number, z: number, animatedProps: EnvironmentAnimatedProp[]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // 1. Semi-circular tiered stone daises
  const dais1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.14, 24), MATS.townPaverStone);
  dais1.position.y = 0.07;

  const dais2 = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.14, 24), MATS.townPaverStone);
  dais2.position.y = 0.21;

  const goldRim = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.04, 8, 32), MATS.marbleGold);
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = 0.28;

  // 2. Ornate Stone Monument Table
  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 16), MATS.townPaverStone);
  tableBase.position.y = 0.53;

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.75, 0.14, 20), MATS.marbleGold);
  tableTop.position.y = 0.82;

  // 3. Golden Chalice on the Altar Table
  const chaliceStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.2, 8), MATS.marbleGold);
  chaliceStem.position.y = 0.96;
  const chaliceCup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.04, 0.14, 12), MATS.marbleGold);
  chaliceCup.position.y = 1.10;

  // 4. Floating Celestial Sacred Crystal (Holy Relic)
  const relicCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), MATS.holyCrystal);
  relicCrystal.position.set(0, 1.55, 0);

  const relicRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 8, 24), MATS.marbleGold);
  relicRing.rotation.x = Math.PI / 4;
  relicRing.position.set(0, 1.55, 0);

  // Altar Candlesticks (Flanking)
  const candle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), MATS.marbleGold);
  candle1.position.set(-0.45, 0.98, -0.15);
  const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 8), MATS.torchFlame);
  flame1.position.set(-0.45, 1.14, -0.15);

  const candle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), MATS.marbleGold);
  candle2.position.set(0.45, 0.98, -0.15);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 8), MATS.torchFlame);
  flame2.position.set(0.45, 1.14, -0.15);

  group.add(
    dais1,
    dais2,
    goldRim,
    tableBase,
    tableTop,
    chaliceStem,
    chaliceCup,
    relicCrystal,
    relicRing,
    candle1,
    flame1,
    candle2,
    flame2
  );

  // Holy Light
  const holyLight = new THREE.PointLight(0xfef08a, 1.6, 6.5);
  holyLight.position.set(0, 1.7, 0);
  group.add(holyLight);

  // Animation: Bobbing and rotating relic & flame flicker
  animatedProps.push({
    update: (delta, now) => {
      const t = now * 0.002;
      relicCrystal.rotation.y = t * 0.8;
      relicCrystal.rotation.x = Math.sin(t * 0.5) * 0.2;
      relicCrystal.position.y = 1.55 + Math.sin(t * 2.0) * 0.07;

      relicRing.rotation.z = -t * 1.2;
      relicRing.rotation.y = t * 0.5;
      relicRing.position.y = relicCrystal.position.y;

      // Candle flame flicker
      const fScale = 0.9 + Math.random() * 0.25;
      flame1.scale.set(fScale, fScale * (0.9 + Math.random() * 0.3), fScale);
      flame2.scale.set(fScale, fScale * (0.9 + Math.random() * 0.3), fScale);
      holyLight.intensity = 1.5 + Math.sin(t * 5) * 0.15;
    },
  });

  return group;
}

/**
 * Creates the Central Round Sacred Fountain of Thais Temple
 */
function createThaisHolyFountain(x: number, z: number, animatedProps: EnvironmentAnimatedProp[]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Outer circular stone basin
  const outerBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.32, 24), MATS.marble);
  outerBasin.position.y = 0.16;

  // Carved marble torus rim
  const basinRim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 8, 32), MATS.marbleGold);
  basinRim.rotation.x = Math.PI / 2;
  basinRim.position.y = 0.32;

  // Shimmering reflective water surface
  const waterGeo = new THREE.CircleGeometry(1.18, 24);
  const waterMesh = new THREE.Mesh(waterGeo, MATS.fountainWater);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.26;

  // Central fountain pillar spout
  const centerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.65, 16), MATS.marble);
  centerPillar.position.y = 0.45;

  const centerChalice = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.18, 0.22, 16), MATS.marbleGold);
  centerChalice.position.y = 0.85;

  // Water gem on top
  const fountainGem = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), MATS.holyCrystal);
  fountainGem.position.y = 1.05;

  group.add(outerBasin, basinRim, waterMesh, centerPillar, centerChalice, fountainGem);

  // Subtle water glow
  const fountainLight = new THREE.PointLight(0x38bdf8, 1.1, 4.5);
  fountainLight.position.set(0, 0.8, 0);
  group.add(fountainLight);

  animatedProps.push({
    update: (_delta, now) => {
      const t = now * 0.003;
      fountainGem.rotation.y = t;
      waterMesh.scale.set(1 + Math.sin(t * 2) * 0.015, 1 + Math.cos(t * 2) * 0.015, 1);
    },
  });

  return group;
}

/**
 * Creates the Grand Velvet Red Carpet Runner for Thais Temple
 */
function createCarpetRunner(startX: number, startZ: number, endX: number, endZ: number): THREE.Group {
  const group = new THREE.Group();

  const length = Math.hypot(endX - startX, endZ - startZ);
  const width = 1.9;

  // Main velvet runner
  const carpetGeo = new THREE.PlaneGeometry(width, length);
  const carpetMesh = new THREE.Mesh(carpetGeo, MATS.carpet);
  carpetMesh.rotation.x = -Math.PI / 2;
  carpetMesh.position.set((startX + endX) / 2, 0.012, (startZ + endZ) / 2);

  // Golden side border trim
  const borderWidth = 0.08;
  const borderLeft = new THREE.Mesh(new THREE.PlaneGeometry(borderWidth, length), MATS.carpetGoldBorder);
  borderLeft.rotation.x = -Math.PI / 2;
  borderLeft.position.set((startX + endX) / 2 - width / 2 + borderWidth / 2, 0.014, (startZ + endZ) / 2);

  const borderRight = new THREE.Mesh(new THREE.PlaneGeometry(borderWidth, length), MATS.carpetGoldBorder);
  borderRight.rotation.x = -Math.PI / 2;
  borderRight.position.set((startX + endX) / 2 + width / 2 - borderWidth / 2, 0.014, (startZ + endZ) / 2);

  group.add(carpetMesh, borderLeft, borderRight);
  return group;
}

/**
 * Creates Wooden Temple Pews (Benches)
 */
function createTemplePew(x: number, z: number, rotY: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.42), MATS.pewWood);
  seat.position.set(0, 0.32, 0);

  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.46, 0.06), MATS.pewWood);
  back.position.set(0, 0.58, -0.18);

  // Side armrests
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.46), MATS.pewWood);
  leftArm.position.set(-0.74, 0.38, -0.02);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.46), MATS.pewWood);
  rightArm.position.set(0.74, 0.38, -0.02);

  group.add(seat, back, leftArm, rightArm);
  return group;
}

/**
 * Creates Classical Ceramic/Marble Urns with Green Plants
 */
function createTempleUrn(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Round marble pedestal
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 12), MATS.marble);
  pedestal.position.y = 0.125;

  // Round urn body
  const urnBody = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 10), MATS.marbleGold);
  urnBody.position.y = 0.48;

  const urnNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.16, 12), MATS.marble);
  urnNeck.position.y = 0.72;

  // Green plant bush / laurel leaves
  const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), MATS.plantGreen);
  bush.position.y = 0.96;
  bush.scale.set(1.0, 1.25, 1.0);

  group.add(pedestal, urnBody, urnNeck, bush);
  return group;
}

/**
 * Creates Classical Carved Marble Benches for the Open Plaza
 */
function createTempleMarbleBench(x: number, z: number, rotY: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  // Carved marble bench seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.55), MATS.marble);
  seat.position.set(0, 0.38, 0);

  // Bench legs
  const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.48), MATS.marbleGold);
  legLeft.position.set(-0.62, 0.19, 0);
  const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.48), MATS.marbleGold);
  legRight.position.set(0.62, 0.19, 0);

  // Backrest with gold rim
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 0.08), MATS.marble);
  back.position.set(0, 0.65, -0.22);
  const backRim = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.06, 0.10), MATS.marbleGold);
  backRim.position.set(0, 0.88, -0.22);

  group.add(seat, legLeft, legRight, back, backRim);
  return group;
}

/**
 * Creates Park Benches with Dark Iron Frame & Warm Oak Slats
 */
function createTownParkBench(x: number, z: number, rotY: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  // Wooden seat slats
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.48), MATS.pewWood);
  seat.position.set(0, 0.35, 0);

  // Slatted backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.06), MATS.pewWood);
  back.position.set(0, 0.62, -0.21);

  // Cast iron side supports
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.48), MATS.lampIron);
  leftLeg.position.set(-0.75, 0.21, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.48), MATS.lampIron);
  rightLeg.position.set(0.75, 0.21, 0);

  group.add(seat, back, leftLeg, rightLeg);
  return group;
}

/**
 * Creates Charming Medieval Town Square Market Stalls with Striped Canopies
 */
function createMarketStall(x: number, z: number, rotY: number, isAlchemist: boolean): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  // Wooden counter table
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.0), MATS.pewWood);
  table.position.set(0, 0.38, 0);

  // 4 Corner support posts for canopy
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6);
  const p1 = new THREE.Mesh(postGeo, MATS.pewWood);
  p1.position.set(-1.15, 1.15, -0.45);
  const p2 = new THREE.Mesh(postGeo, MATS.pewWood);
  p2.position.set(1.15, 1.15, -0.45);
  const p3 = new THREE.Mesh(postGeo, MATS.pewWood);
  p3.position.set(-1.15, 1.05, 0.55);
  const p4 = new THREE.Mesh(postGeo, MATS.pewWood);
  p4.position.set(1.15, 1.05, 0.55);
  group.add(table, p1, p2, p3, p4);

  // Striped Fabric Canopy (Slanted towards front)
  const stripeColors = isAlchemist
    ? [MATS.canopyRed, MATS.canopyCream, MATS.canopyRed, MATS.canopyCream, MATS.canopyRed, MATS.canopyCream]
    : [MATS.canopyBlue, MATS.canopyCream, MATS.canopyBlue, MATS.canopyCream, MATS.canopyBlue, MATS.canopyCream];

  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 1.25), stripeColors[i]);
    stripe.position.set(-1.05 + i * 0.42, 2.15, 0.05);
    stripe.rotation.x = 0.12;
    group.add(stripe);
  }

  if (isAlchemist) {
    // Alchemist Potions on counter
    const pot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.22, 8), MATS.potionRed);
    pot1.position.set(-0.6, 0.86, 0.1);
    const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.22, 8), MATS.potionBlue);
    pot2.position.set(-0.3, 0.86, 0.1);
    const herbPot = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), MATS.plantGreen);
    herbPot.position.set(0.4, 0.85, 0.05);
    group.add(pot1, pot2, herbPot);
  } else {
    // Armorer Goods / Crates on counter
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.45), MATS.barrelWood);
    crate.position.set(-0.5, 0.95, 0.05);
    const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.02), MATS.steelBlade);
    dagger.rotation.z = Math.PI / 3;
    dagger.position.set(0.3, 0.8, 0.1);
    group.add(crate, dagger);
  }

  // Wooden barrel next to stall
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.7, 10), MATS.barrelWood);
  barrel.position.set(1.4, 0.35, 0.1);
  group.add(barrel);

  return group;
}

/**
 * Creates Charming Town Square Flower Planter Box
 */
function createFlowerBox(x: number, z: number, rotY = 0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  // Stone/wood planter trough
  const trough = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.55), MATS.townPaverStone);
  trough.position.set(0, 0.18, 0);

  // Soil
  const soil = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 0.45), MATS.pewWood);
  soil.position.set(0, 0.34, 0);
  group.add(trough, soil);

  // Colorful blooms & greenery
  const flowerMats = [MATS.flowerRed, MATS.flowerYellow, MATS.flowerPurple, MATS.flowerPink];
  for (let i = 0; i < 5; i++) {
    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), MATS.plantGreen);
    foliage.position.set(-0.55 + i * 0.28, 0.42, i % 2 === 0 ? 0.06 : -0.06);

    const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), flowerMats[i % flowerMats.length]);
    flower.position.set(-0.55 + i * 0.28, 0.56, i % 2 === 0 ? 0.06 : -0.06);
    group.add(foliage, flower);
  }

  return group;
}

/**
 * Creates Mediterranean / Italian Cypress Trees
 */
function createCypressTree(x: number, z: number, scale: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 0.9 * scale, 6), MATS.treeTrunk);
  trunk.position.y = 0.45 * scale;

  // Layered conical foliage
  const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.62 * scale, 1.6 * scale, 7), MATS.cypressLeaf);
  cone1.position.y = 1.3 * scale;

  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.50 * scale, 1.4 * scale, 7), MATS.cypressLeaf);
  cone2.position.y = 2.1 * scale;

  const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.32 * scale, 1.1 * scale, 7), MATS.cypressLeaf);
  cone3.position.y = 2.9 * scale;

  group.add(trunk, cone1, cone2, cone3);
  return group;
}

/**
 * Creates Open Sanctuary Vista: Rolling Green Hills, Distant Mountains, Clouds, Ruins
 */
function createOpenSanctuaryVista(animatedProps: EnvironmentAnimatedProp[]): THREE.Group {
  const group = new THREE.Group();

  // 1. Expansive Rolling Meadow Terrain Skirt
  const terrainGeo = new THREE.PlaneGeometry(90, 90);
  const terrain = new THREE.Mesh(terrainGeo, MATS.meadowGrass);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(11.5, -0.22, 11.5);

  // 2. Stone retaining foundation beneath the town square
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(24.5, 0.35, 24.5), MATS.townPaverStone);
  foundation.position.set(11.5, -0.15, 11.5);
  group.add(terrain, foundation);

  // 3. Perimeter & Vista Cypress Trees
  const treePositions = [
    { x: -1.5, z: -1.5, s: 1.25 },
    { x: 24.5, z: -1.5, s: 1.3 },
    { x: -1.5, z: 24.5, s: 1.15 },
    { x: 24.5, z: 24.5, s: 1.2 },
    { x: -2.2, z: 6.0, s: 1.0 },
    { x: -2.2, z: 12.0, s: 1.15 },
    { x: -2.2, z: 18.0, s: 0.95 },
    { x: 25.2, z: 6.0, s: 1.1 },
    { x: 25.2, z: 12.0, s: 1.25 },
    { x: 25.2, z: 18.0, s: 1.05 },
    { x: 6.0, z: -2.2, s: 1.1 },
    { x: 17.0, z: -2.2, s: 1.2 },
    { x: 6.0, z: 25.2, s: 0.9 },
    { x: 17.0, z: 25.2, s: 1.15 },
    // Distant groves
    { x: -8.0, z: -8.0, s: 1.5 },
    { x: 31.0, z: -8.0, s: 1.6 },
    { x: -10.0, z: 16.0, s: 1.4 },
    { x: 33.0, z: 17.0, s: 1.5 },
    { x: 11.5, z: -8.0, s: 1.4 },
  ];
  for (const tp of treePositions) {
    group.add(createCypressTree(tp.x, tp.z, tp.s));
  }

  // 4. Distant Mountain Peaks on the Horizon
  const mountains = [
    { x: -16, z: -34, r: 15, h: 22 },
    { x: 10, z: -40, r: 19, h: 28 },
    { x: 36, z: -32, r: 16, h: 24 },
    { x: 46, z: 8, r: 13, h: 20 },
    { x: -26, z: 6, r: 14, h: 19 },
  ];
  for (const m of mountains) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 5), MATS.mountainHaze);
    peak.position.set(m.x, m.h / 2 - 2, m.z);
    group.add(peak);
  }

  // 5. Distant Classical Ruined Arch in Vista
  const archGroup = new THREE.Group();
  archGroup.position.set(31, 0, -14);
  archGroup.rotation.y = -0.35;
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.8, 0.8), MATS.marble);
  p1.position.set(-2.2, 2.4, 0);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.8, 0.8), MATS.marble);
  p2.position.set(2.2, 2.4, 0);
  const archLintel = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.8, 0.9), MATS.marble);
  archLintel.position.set(0, 5.0, 0);
  archGroup.add(p1, p2, archLintel);
  group.add(archGroup);

  // 6. Floating Low-Poly Stylized Cumulus Clouds (y: 22 - 26)
  const clouds: THREE.Group[] = [];
  const cloudData = [
    { x: -14, y: 24, z: -8, scale: 1.4 },
    { x: 18, y: 26, z: -18, scale: 1.6 },
    { x: -6, y: 23, z: 22, scale: 1.2 },
    { x: 28, y: 25, z: 12, scale: 1.5 },
  ];
  for (const cd of cloudData) {
    const cg = new THREE.Group();
    cg.position.set(cd.x, cd.y, cd.z);
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(1.6 * cd.scale, 8, 6), MATS.cloudWhite);
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(1.2 * cd.scale, 8, 6), MATS.cloudWhite);
    m2.position.set(1.4 * cd.scale, -0.2, 0);
    const m3 = new THREE.Mesh(new THREE.SphereGeometry(1.1 * cd.scale, 8, 6), MATS.cloudWhite);
    m3.position.set(-1.3 * cd.scale, -0.2, 0);
    cg.add(m1, m2, m3);
    group.add(cg);
    clouds.push(cg);
  }

  // Animate drifting clouds
  animatedProps.push({
    update: (delta) => {
      for (const cg of clouds) {
        cg.position.x += delta * 0.45;
        if (cg.position.x > 52) cg.position.x = -48;
      }
    },
  });

  return group;
}

/**
 * Creates the East Sparring Grounds & Training Arena
 */
function createSparringRing(): THREE.Group {
  const group = new THREE.Group();

  // 1. Sandy training circles under both training dummies (x: 18.5, z: 7.5 and x: 18.5, z: 15.5)
  const sand1 = new THREE.Mesh(new THREE.CircleGeometry(2.3, 16), MATS.trainingSand);
  sand1.rotation.x = -Math.PI / 2;
  sand1.position.set(18.5, 0.012, 7.5);

  const sand2 = new THREE.Mesh(new THREE.CircleGeometry(2.3, 16), MATS.trainingSand);
  sand2.rotation.x = -Math.PI / 2;
  sand2.position.set(18.5, 0.012, 15.5);
  group.add(sand1, sand2);

  // 2. Weapon Rack at x: 21.0, z: 11.5
  const rackGroup = new THREE.Group();
  rackGroup.position.set(21.0, 0, 11.5);
  rackGroup.rotation.y = -Math.PI / 2;

  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), MATS.pewWood);
  postL.position.set(-0.7, 0.7, 0);
  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), MATS.pewWood);
  postR.position.set(0.7, 0.7, 0);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), MATS.pewWood);
  barTop.position.set(0, 1.2, 0);
  const barMid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), MATS.pewWood);
  barMid.position.set(0, 0.5, 0);
  rackGroup.add(postL, postR, barTop, barMid);

  // Swords on rack
  for (let sx = -0.4; sx <= 0.4; sx += 0.4) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.02), MATS.steelBlade);
    blade.position.set(sx, 0.8, 0.06);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), MATS.marbleGold);
    guard.position.set(sx, 1.15, 0.06);
    rackGroup.add(blade, guard);
  }

  // Spear leaning against rack
  const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6), MATS.pewWood);
  spearShaft.position.set(0.85, 0.9, 0.15);
  spearShaft.rotation.z = -0.2;
  const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 4), MATS.steelBlade);
  spearHead.position.set(0.68, 1.8, 0.15);
  spearHead.rotation.z = -0.2;
  rackGroup.add(spearShaft, spearHead);

  // Red Knight Shield
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.04), MATS.targetRed);
  shield.position.set(-0.85, 0.65, 0.12);
  shield.rotation.y = 0.3;
  rackGroup.add(shield);
  group.add(rackGroup);

  // 3. Archery Target Stand at x: 21.2, z: 4.8
  const targetGroup = new THREE.Group();
  targetGroup.position.set(21.2, 0, 4.8);
  targetGroup.rotation.y = -Math.PI / 2;

  const strawBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16), MATS.targetStraw);
  strawBoss.rotation.x = Math.PI / 2;
  strawBoss.position.y = 1.1;

  const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.13, 16), MATS.targetRed);
  bullseye.rotation.x = Math.PI / 2;
  bullseye.position.y = 1.1;

  const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), MATS.pewWood);
  leg1.position.set(-0.32, 0.6, 0.1);
  leg1.rotation.z = 0.25;
  const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), MATS.pewWood);
  leg2.position.set(0.32, 0.6, 0.1);
  leg2.rotation.z = -0.25;
  const leg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), MATS.pewWood);
  leg3.position.set(0, 0.6, -0.35);
  leg3.rotation.x = -0.3;

  targetGroup.add(strawBoss, bullseye, leg1, leg2, leg3);
  group.add(targetGroup);

  return group;
}

/**
 * Creates West Garden Pergola and Adventurer's Camp Stash
 */
function createGardenPergolaAndStash(): THREE.Group {
  const group = new THREE.Group();

  // 1. Classical Garden Pergola at x: 4.5, z: 11.5
  const pergola = new THREE.Group();
  pergola.position.set(4.5, 0, 11.5);

  const colCoords = [
    { x: -1.4, z: -1.4 },
    { x: 1.4, z: -1.4 },
    { x: -1.4, z: 1.4 },
    { x: 1.4, z: 1.4 },
  ];
  for (const c of colCoords) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.4, 8), MATS.marble);
    p.position.set(c.x, 1.2, c.z);
    pergola.add(p);
  }

  const b1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.14), MATS.pewWood);
  b1.position.set(0, 2.45, -1.4);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.14), MATS.pewWood);
  b2.position.set(0, 2.45, 1.4);
  pergola.add(b1, b2);

  for (let bx = -1.3; bx <= 1.3; bx += 0.65) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.4), MATS.pewWood);
    cross.position.set(bx, 2.55, 0);
    pergola.add(cross);
  }

  // Foliage on top
  const vineTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 3.2), MATS.plantGreen);
  vineTop.position.set(0, 2.65, 0);
  pergola.add(vineTop);

  // Hanging wisteria flowers
  const flowerSpots = [
    { x: -0.9, z: -0.9 },
    { x: 0.9, z: -0.8 },
    { x: -0.8, z: 0.9 },
    { x: 0.8, z: 0.9 },
  ];
  for (const fs of flowerSpots) {
    const fCluster = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 6), MATS.wisteriaFlower);
    fCluster.rotation.x = Math.PI;
    fCluster.position.set(fs.x, 2.25, fs.z);
    pergola.add(fCluster);
  }

  // Marble Bench under pergola
  const bench = createTempleMarbleBench(0, 0, 0);
  pergola.add(bench);
  group.add(pergola);

  // 2. Adventurer Supply Stash at x: 4.2, z: 16.5
  const stash = new THREE.Group();
  stash.position.set(4.2, 0, 16.5);

  const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), MATS.pewWood);
  crate1.position.set(0, 0.35, 0);

  const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), MATS.pewWood);
  crate2.rotation.y = 0.25;
  crate2.position.set(0.65, 0.275, 0.1);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.85, 12), MATS.barrelWood);
  barrel.position.set(-0.6, 0.425, 0.2);

  const ironHoop1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 6, 16), MATS.sewerIronBand);
  ironHoop1.rotation.x = Math.PI / 2;
  ironHoop1.position.set(-0.6, 0.25, 0.2);

  const ironHoop2 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 6, 16), MATS.sewerIronBand);
  ironHoop2.rotation.x = Math.PI / 2;
  ironHoop2.position.set(-0.6, 0.6, 0.2);

  stash.add(crate1, crate2, barrel, ironHoop1, ironHoop2);
  group.add(stash);

  return group;
}

/**
 * Creates Carved Ancient Runic Obelisk
 */
function createRunicObelisk(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.28, 0.75), MATS.marble);
  base.position.y = 0.14;

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 2.4, 4), MATS.runicObelisk);
  shaft.rotation.y = Math.PI / 4;
  shaft.position.y = 1.48;

  const apex = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 4), MATS.marbleGold);
  apex.rotation.y = Math.PI / 4;
  apex.position.y = 2.93;

  const runeBand = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.55), MATS.runicGlow);
  runeBand.position.y = 1.6;

  group.add(base, shaft, apex, runeBand);

  const runeLight = new THREE.PointLight(0x38bdf8, 0.8, 4.0);
  runeLight.position.set(0, 1.8, 0);
  group.add(runeLight);

  return group;
}

/**
 * Creates Classical Promenade Streetlamp with Warm Lantern
 */
function createStreetLamp(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.22, 8), MATS.lampIron);
  base.position.y = 0.11;

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.3, 8), MATS.lampIron);
  pole.position.y = 1.25;

  const bracket = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 12), MATS.lampIron);
  bracket.rotation.y = Math.PI / 4;
  bracket.position.y = 2.4;

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.34, 6), MATS.lampGlass);
  lantern.position.y = 2.55;

  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 6), MATS.lampIron);
  lanternCap.position.y = 2.8;

  group.add(base, pole, bracket, lantern, lanternCap);

  const lampLight = new THREE.PointLight(0xfef08a, 0.85, 4.5);
  lampLight.position.set(0, 2.55, 0);
  group.add(lampLight);

  return group;
}

/**
 * Creates a Dynamic Mystical Teleport Portal
 * Round runic plinth, concentric swirling energy rings, glowing vortex, upward sparks
 */
function createMysticPortal(
  x: number,
  z: number,
  isTemple: boolean,
  animatedProps: EnvironmentAnimatedProp[]
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // 1. Raised Round Stone Ring Plinth (Eliminates boxy portal look!)
  const stoneMat = isTemple ? MATS.marble : MATS.sewerColumn;
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.18, 24), stoneMat);
  plinth.position.y = 0.09;

  // Carved runic outer ring
  const ringMat = isTemple ? MATS.marbleGold : MATS.sewerIronBand;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.07, 8, 32), ringMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.18;

  // 2. Nested Swirling Portal Energy Discs
  const innerColor = isTemple ? COLORS.portalCyan : COLORS.portalPurple;
  const outerColor = isTemple ? COLORS.portalBlue : COLORS.portalMagenta;

  const innerDiscMat = new THREE.MeshBasicMaterial({
    color: innerColor,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const innerDisc = new THREE.Mesh(new THREE.CircleGeometry(1.08, 24), innerDiscMat);
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.14;

  const runeRing1Mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const runeRing1 = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.98, 16), runeRing1Mat);
  runeRing1.rotation.x = -Math.PI / 2;
  runeRing1.position.y = 0.16;

  const runeRing2Mat = new THREE.MeshBasicMaterial({
    color: outerColor,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
  });
  const runeRing2 = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.58, 12), runeRing2Mat);
  runeRing2.rotation.x = -Math.PI / 2;
  runeRing2.position.y = 0.18;

  // 3. Floating Central Teleport Core Orb
  const coreOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 1),
    new THREE.MeshBasicMaterial({ color: isTemple ? 0xffffff : 0xf0abfc })
  );
  coreOrb.position.y = 0.5;

  group.add(plinth, rim, innerDisc, runeRing1, runeRing2, coreOrb);

  // 4. Portal Glow Light
  const portalLight = new THREE.PointLight(innerColor, 1.8, 6.0);
  portalLight.position.set(0, 0.7, 0);
  group.add(portalLight);

  // Animation: Swirling rings, pulsating core & glow
  animatedProps.push({
    update: (delta, now) => {
      const t = now * 0.003;
      runeRing1.rotation.z += delta * 1.4;
      runeRing2.rotation.z -= delta * 2.0;

      coreOrb.rotation.y += delta * 2.5;
      coreOrb.rotation.x += delta * 1.5;
      coreOrb.position.y = 0.5 + Math.sin(t * 3.0) * 0.12;

      const pulse = 1.6 + Math.sin(t * 4.0) * 0.35;
      portalLight.intensity = pulse;
      innerDisc.scale.set(1 + Math.sin(t * 2) * 0.04, 1 + Math.sin(t * 2) * 0.04, 1);
    },
  });

  return group;
}

/**
 * Creates a 3D Wall Torch with Dynamic Animated Flame & Warm Light
 */
function createWallTorch(
  x: number,
  y: number,
  z: number,
  normalX: number,
  normalZ: number,
  isSewers: boolean,
  animatedProps: EnvironmentAnimatedProp[]
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Iron wall mounting bracket
  const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.32, 8), MATS.torchIron);
  bracket.rotation.z = normalX * 0.4;
  bracket.rotation.x = -normalZ * 0.4;
  bracket.position.set(normalX * 0.12, -0.05, normalZ * 0.12);

  // Wooden torch handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.45, 8), MATS.torchWood);
  handle.position.set(normalX * 0.22, 0.05, normalZ * 0.22);

  // Iron cage cup
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.12, 8), MATS.torchIron);
  cup.position.set(normalX * 0.22, 0.26, normalZ * 0.22);

  // 3D Animated Flame Mesh (Teardrop/Cone shape) - Glowing emissive material
  const flameMat = new THREE.MeshBasicMaterial({
    color: isSewers ? 0x86efac : COLORS.torchFlameCore,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 8), flameMat);
  flame.position.set(normalX * 0.22, 0.40, normalZ * 0.22);

  group.add(bracket, handle, cup, flame);

  // Animation: Real flickering flame (ultra lightweight, no point light overflow)
  animatedProps.push({
    update: (_delta, now) => {
      const flicker = 0.88 + Math.random() * 0.28;
      flame.scale.set(flicker, flicker * (0.9 + Math.random() * 0.3), flicker);
      flame.rotation.y = now * 0.005;
    },
  });

  return group;
}

/**
 * Creates Standing Cast-Iron Brazier (Used in Mount Sternum & Sewers)
 */
function createStandingBrazier(
  x: number,
  z: number,
  isRuins: boolean,
  animatedProps: EnvironmentAnimatedProp[]
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Tripod Legs / Round Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.15, 12), MATS.sewerIronBand);
  base.position.y = 0.075;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.65, 8), MATS.sewerIronBand);
  stem.position.y = 0.45;

  // Round Hammered Iron Bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.24, 16), MATS.sewerIronBand);
  bowl.position.y = 0.85;

  // Glowing hot coals
  const coals = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 12),
    new THREE.MeshBasicMaterial({ color: isRuins ? 0xff4500 : 0x22c55e })
  );
  coals.rotation.x = -Math.PI / 2;
  coals.position.y = 0.94;

  // Center Flame
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.42, 8),
    new THREE.MeshBasicMaterial({ color: isRuins ? 0xfde047 : 0x86efac })
  );
  flame.position.y = 1.15;

  group.add(base, stem, bowl, coals, flame);

  animatedProps.push({
    update: (_delta, now) => {
      const scale = 0.88 + Math.random() * 0.25;
      flame.scale.set(scale, scale * (0.9 + Math.random() * 0.3), scale);
    },
  });

  return group;
}

/**
 * Creates Wooden Barrels (Ancient Sewers)
 */
function createWoodenBarrel(x: number, z: number, rotY = 0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  // Round bulging barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.72, 12), MATS.barrelWood);
  barrel.position.y = 0.36;

  // Iron hoops
  const hoop1 = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 16), MATS.sewerIronBand);
  hoop1.rotation.x = Math.PI / 2;
  hoop1.position.y = 0.18;

  const hoop2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 16), MATS.sewerIronBand);
  hoop2.rotation.x = Math.PI / 2;
  hoop2.position.y = 0.54;

  group.add(barrel, hoop1, hoop2);
  return group;
}

/**
 * Creates Organic Non-Square Green Slime Puddle (Sewers)
 */
function createSlimePuddle(x: number, z: number, radius = 0.9): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 16);
  const mesh = new THREE.Mesh(geo, MATS.sewerSludge);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.015, z);
  mesh.scale.set(1.0, 0.75 + Math.random() * 0.35, 1.0);
  return mesh;
}

/**
 * Creates Bioluminescent Glowing Mushrooms (Sewers)
 */
function createGlowingMushrooms(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const offsets = [
    { dx: 0, dz: 0, s: 0.18, h: 0.32 },
    { dx: 0.16, dz: 0.14, s: 0.12, h: 0.22 },
    { dx: -0.14, dz: 0.12, s: 0.10, h: 0.18 },
  ];

  for (const o of offsets) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * o.s, 0.04 * o.s, o.h, 6), MATS.shroomStem);
    stem.position.set(o.dx, o.h / 2, o.dz);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(o.s, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), MATS.shroomCap);
    cap.position.set(o.dx, o.h, o.dz);

    group.add(stem, cap);
  }

  const shroomLight = new THREE.PointLight(COLORS.sewerMushroom, 0.8, 2.5);
  shroomLight.position.set(0, 0.3, 0);
  group.add(shroomLight);

  return group;
}

/**
 * Creates The Great Dwarven Forge in the Mount Sternum Boss Room
 * Circular stone hearth with glowing molten lava, smoke stack, heavy iron blacksmith anvil
 */
function createDwarvenForge(x: number, z: number, animatedProps: EnvironmentAnimatedProp[]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // 1. Massive Circular Stone Hearth Basin
  const hearthBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.45, 20), MATS.forgeHearth);
  hearthBasin.position.y = 0.225;

  // Heavy Iron Rim
  const hearthRim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.09, 8, 24), MATS.sewerIronBand);
  hearthRim.rotation.x = Math.PI / 2;
  hearthRim.position.y = 0.45;

  // 2. Molten Red-Hot Lava Pool
  const lavaDisc = new THREE.Mesh(new THREE.CircleGeometry(1.48, 20), MATS.forgeLava);
  lavaDisc.rotation.x = -Math.PI / 2;
  lavaDisc.position.y = 0.40;

  // 3. Central Forging Pedestal with Heavy Iron Blacksmith Anvil
  const anvilStump = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.45, 12), MATS.pewWood);
  anvilStump.position.set(0.65, 0.225, 0.65);

  const anvilBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.25), MATS.anvilIron);
  anvilBody.position.set(0.65, 0.55, 0.65);

  const anvilHorn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), MATS.anvilIron);
  anvilHorn.rotation.z = -Math.PI / 2;
  anvilHorn.position.set(0.95, 0.55, 0.65);

  group.add(hearthBasin, hearthRim, lavaDisc, anvilStump, anvilBody, anvilHorn);

  // Intense Warm Lava Hearth Glow
  const forgeLight = new THREE.PointLight(0xff4500, 2.4, 8.5);
  forgeLight.position.set(0, 1.1, 0);
  group.add(forgeLight);

  animatedProps.push({
    update: (_delta, now) => {
      const t = now * 0.004;
      forgeLight.intensity = 2.2 + Math.sin(t * 3.0) * 0.45 + (Math.random() - 0.5) * 0.15;
      lavaDisc.scale.set(1 + Math.sin(t * 2) * 0.02, 1 + Math.cos(t * 2) * 0.02, 1);
    },
  });

  return group;
}

/**
 * Creates Jagged Crystal Clusters & Stalagmites (Mount Sternum Ruins)
 */
function createCrystalStalagmite(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const crystals = [
    { h: 0.95, r: 0.16, dx: 0, dz: 0, rotX: 0.08, rotZ: -0.1 },
    { h: 0.65, r: 0.12, dx: 0.2, dz: 0.15, rotX: -0.15, rotZ: 0.2 },
    { h: 0.50, r: 0.10, dx: -0.18, dz: 0.12, rotX: 0.2, rotZ: -0.18 },
  ];

  for (const c of crystals) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(c.r, c.h, 6), MATS.crystalPurple);
    spike.rotation.set(c.rotX, 0, c.rotZ);
    spike.position.set(c.dx, c.h / 2, c.dz);
    group.add(spike);
  }

  const light = new THREE.PointLight(COLORS.ruinsCrystal, 0.9, 3.5);
  light.position.set(0, 0.6, 0);
  group.add(light);

  return group;
}

/**
 * Main Builder Function to construct all crafted 3D environment props for a given map
 */
export function buildMapEnvironmentProps(mapGrid: MapGrid): MapEnvironmentResult {
  const rootGroup = new THREE.Group();
  const animatedProps: EnvironmentAnimatedProp[] = [];
  const lights: THREE.Light[] = [];

  const mapId = mapGrid.mapId;
  const isTemple = mapId === 'HUB_THAIS';
  const isSewers = mapId === 'HUNT_SEWERS';
  const isRuins = mapId === 'HUNT_RUINS';

  // 1. Build Architectural Round Columns for every 'pillar' tile (dungeons only)
  for (let z = 0; z < mapGrid.height; z++) {
    for (let x = 0; x < mapGrid.width; x++) {
      const type = mapGrid.tiles[z][x];
      if (type === 'pillar' && !isTemple) {
        const isBroken = isRuins && (x + z) % 3 === 0;
        const column = createColumnMesh(isTemple, isSewers, isBroken);
        column.position.set(x + 0.5, 0, z + 0.5);
        rootGroup.add(column);
      }
    }
  }

  // 2. Open Medieval Town Square Elements (HUB_THAIS)
  if (isTemple) {
    // 0. Expansive Rolling Meadow Terrain & Distant Mountains (completely open vista)
    const vista = createOpenSanctuaryVista(animatedProps);
    rootGroup.add(vista);

    // A. Sacred Town Monument & Relic Shrine (North center)
    const altarMesh = createThaisHolyAltar(11.5, 3.2, animatedProps);
    rootGroup.add(altarMesh);

    // B. Central Fountain of Thais Town Square
    const fountainMesh = createThaisHolyFountain(11.5, 11.5, animatedProps);
    rootGroup.add(fountainMesh);

    // C. Town Park Benches surrounding the Central Fountain
    const benchN = createTownParkBench(11.5, 8.4, 0);
    const benchS = createTownParkBench(11.5, 14.6, Math.PI);
    const benchW = createTownParkBench(8.4, 11.5, Math.PI / 2);
    const benchE = createTownParkBench(14.6, 11.5, -Math.PI / 2);
    rootGroup.add(benchN, benchS, benchW, benchE);

    // D. Vibrant Flower Boxes flanking the Fountain and Benches
    const flowerBoxes = [
      createFlowerBox(11.5, 7.2, 0),
      createFlowerBox(11.5, 15.8, 0),
      createFlowerBox(7.2, 11.5, Math.PI / 2),
      createFlowerBox(15.8, 11.5, Math.PI / 2),
      createFlowerBox(9.5, 9.5, Math.PI / 4),
      createFlowerBox(13.5, 9.5, -Math.PI / 4),
      createFlowerBox(9.5, 13.5, -Math.PI / 4),
      createFlowerBox(13.5, 13.5, Math.PI / 4),
    ];
    rootGroup.add(...flowerBoxes);

    // E. Medieval Market Stalls (North-West Alchemist & North-East Armorer)
    const stallAlchemist = createMarketStall(5.0, 4.2, 0.15, true);
    const stallArmorer = createMarketStall(18.0, 4.2, -0.15, false);
    rootGroup.add(stallAlchemist, stallArmorer);

    // F. East Sparring Arena & Training Grounds
    const sparringRing = createSparringRing();
    rootGroup.add(sparringRing);

    // G. West Garden Pergola with Wisteria & Merchant Stash
    const gardenArea = createGardenPergolaAndStash();
    rootGroup.add(gardenArea);

    // H. Mystic South Portal (Travel Gate) flanked by ancient Runic Obelisks
    const portal = createMysticPortal(11.5, 20.2, true, animatedProps);
    const obeliskLeft = createRunicObelisk(9.4, 20.2);
    const obeliskRight = createRunicObelisk(13.6, 20.2);
    rootGroup.add(portal, obeliskLeft, obeliskRight);

    // I. Classical Town Streetlamps
    const streetLamps = [
      createStreetLamp(7.0, 7.0),
      createStreetLamp(16.0, 7.0),
      createStreetLamp(7.0, 16.0),
      createStreetLamp(16.0, 16.0),
    ];
    rootGroup.add(...streetLamps);

    // J. Decorative Urns with Flowering Laurels
    const urnPositions = [
      { x: 3.5, z: 3.5 },
      { x: 19.5, z: 3.5 },
      { x: 3.5, z: 19.5 },
      { x: 19.5, z: 19.5 },
      { x: 7.5, z: 3.2 },
      { x: 15.5, z: 3.2 },
      { x: 7.5, z: 20.2 },
      { x: 15.5, z: 20.2 },
    ];
    for (const u of urnPositions) {
      const urn = createTempleUrn(u.x, u.z);
      rootGroup.add(urn);
    }
  }

  // 3. Sewers Specific Elements
  if (isSewers) {
    // A. Entrance Spawn Portal
    const spawnP = mapGrid.spawnPoint;
    const portal = createMysticPortal(spawnP.x, spawnP.z, false, animatedProps);
    rootGroup.add(portal);

    // B. Boss Arena Center: Ancient Rotworm Queen Slime Dais
    if (mapGrid.bossArenaCenter) {
      const bossCenter = mapGrid.bossArenaCenter;
      const slimeDais = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.85, 0.22, 16), MATS.sewerSludge);
      slimeDais.position.set(bossCenter.x, 0.11, bossCenter.z);
      rootGroup.add(slimeDais);

      const bossLight = new THREE.PointLight(0x22c55e, 2.2, 8.0);
      bossLight.position.set(bossCenter.x, 1.2, bossCenter.z);
      rootGroup.add(bossLight);
    }

    // C. Organic Slime Pools scattered in room centers
    for (const r of mapGrid.rooms) {
      const cx = r.x + Math.floor(r.w / 2) + 0.5;
      const cz = r.z + Math.floor(r.h / 2) + 0.5;
      const puddle = createSlimePuddle(cx, cz, Math.min(r.w, r.h) * 0.26);
      rootGroup.add(puddle);

      // Wooden Barrels in room corners
      const barrel1 = createWoodenBarrel(r.x + 1.2, r.z + 1.2, 0.4);
      const barrel2 = createWoodenBarrel(r.x + 1.8, r.z + 1.1, -0.2);
      rootGroup.add(barrel1, barrel2);

      // Glowing Mushrooms in damp corners
      const shroom = createGlowingMushrooms(r.x + r.w - 1.4, r.z + 1.4);
      rootGroup.add(shroom);
    }
  }

  // 4. Mount Sternum Ruins Specific Elements
  if (isRuins) {
    // A. Entrance Portal
    const spawnP = mapGrid.spawnPoint;
    const portal = createMysticPortal(spawnP.x, spawnP.z, false, animatedProps);
    rootGroup.add(portal);

    // B. The Great Dwarven Forge in the Boss Arena
    if (mapGrid.bossArenaCenter) {
      const forge = createDwarvenForge(mapGrid.bossArenaCenter.x, mapGrid.bossArenaCenter.z, animatedProps);
      rootGroup.add(forge);
    }

    // C. Crystal Clusters & Standing Braziers in rooms
    for (let i = 0; i < mapGrid.rooms.length; i++) {
      const r = mapGrid.rooms[i];
      // Stalagmites in corners
      const crystal = createCrystalStalagmite(r.x + 1.4, r.z + r.h - 1.4);
      rootGroup.add(crystal);

      // Standing Braziers
      const brazier = createStandingBrazier(r.x + r.w - 1.5, r.z + 1.5, true, animatedProps);
      rootGroup.add(brazier);
    }
  }

  // 5. Wall Torches around rooms and corridors
  if (mapGrid.torchPositions && mapGrid.torchPositions.length > 0) {
    for (const pos of mapGrid.torchPositions) {
      // Determine wall normal based on neighboring walls
      let nx = 0;
      let nz = 1;
      const gx = Math.floor(pos.x);
      const gz = Math.floor(pos.z);

      if (gz > 0 && mapGrid.tiles[gz - 1]?.[gx] === 'wall') {
        nx = 0;
        nz = 1;
      } else if (gz < mapGrid.height - 1 && mapGrid.tiles[gz + 1]?.[gx] === 'wall') {
        nx = 0;
        nz = -1;
      } else if (gx > 0 && mapGrid.tiles[gz]?.[gx - 1] === 'wall') {
        nx = 1;
        nz = 0;
      } else if (gx < mapGrid.width - 1 && mapGrid.tiles[gz]?.[gx + 1] === 'wall') {
        nx = -1;
        nz = 0;
      }

      const torch = createWallTorch(pos.x + 0.5, 1.1, pos.z + 0.5, nx, nz, isSewers, animatedProps);
      rootGroup.add(torch);
    }
  }

  return {
    group: rootGroup,
    animatedProps,
    lights,
  };
}
