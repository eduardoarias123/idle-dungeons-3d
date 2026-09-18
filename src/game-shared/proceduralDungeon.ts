import { BreakableObject, DungeonAffix, MapHuntDef } from '../types/game';
import { MapGrid, TileType } from './mapLayout';

export const DUNGEON_AFFIXES: DungeonAffix[] = [
  {
    id: 'gilded',
    name: '💰 Gilded Chamber',
    description: '+50% Gold Drops & +25% Bonus EXP',
    color: '#eab308',
    expBonusPct: 25,
    lootBonusPct: 15,
    goldBonusPct: 50,
    monsterHpPct: 0,
    monsterDmgPct: 0,
  },
  {
    id: 'treasure_trove',
    name: '💎 Treasure Trove',
    description: '+50% Rare Equipment Drops & +30% Gold',
    color: '#06b6d4',
    expBonusPct: 20,
    lootBonusPct: 50,
    goldBonusPct: 30,
    monsterHpPct: 5,
    monsterDmgPct: 5,
  },
  {
    id: 'bloodthirsty',
    name: '🩸 Bloodthirsty Crypt',
    description: 'Monsters deal +20% Damage, but grant +50% EXP',
    color: '#ef4444',
    expBonusPct: 50,
    lootBonusPct: 20,
    goldBonusPct: 20,
    monsterHpPct: 10,
    monsterDmgPct: 20,
  },
  {
    id: 'ironclad',
    name: '🛡️ Ironclad Bastion',
    description: 'Monsters have +30% HP, with +35% Equipment Drops',
    color: '#64748b',
    expBonusPct: 30,
    lootBonusPct: 35,
    goldBonusPct: 20,
    monsterHpPct: 30,
    monsterDmgPct: 5,
  },
  {
    id: 'volcanic_fury',
    name: '🔥 Volcanic Cataclysm',
    description: 'Hazardous fiery grounds with +60% EXP & +40% Gold',
    color: '#f97316',
    expBonusPct: 60,
    lootBonusPct: 30,
    goldBonusPct: 40,
    monsterHpPct: 15,
    monsterDmgPct: 25,
  },
  {
    id: 'sanctified',
    name: '✨ Sanctified Labyrinth',
    description: 'Ancient blessings grant +30% EXP & +25% Magic Find',
    color: '#a855f7',
    expBonusPct: 30,
    lootBonusPct: 25,
    goldBonusPct: 25,
    monsterHpPct: 0,
    monsterDmgPct: 0,
  },
];

// Linear Congruential Pseudo-Random Generator for deterministic seeded layouts
class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  public next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  public range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

export interface SeededMonsterSpawn {
  id: string;
  x: number;
  z: number;
}

export interface ProceduralDungeon {
  grid: MapGrid;
  affix: DungeonAffix;
  breakables: BreakableObject[];
  floorNumber: number;
  dungeonName: string;
  seed: number;
  seededMonsterSpawns?: SeededMonsterSpawn[];
}

export function calculatePartyDungeonSeed(partyCode: string, mapId: string, floorNumber: number = 1): number {
  const cleanCode = (partyCode || 'SOLO').trim().toUpperCase();
  const key = `${cleanCode}:${mapId}:F${floorNumber}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h % 9000000) + 1000000;
}

export function getRandomAffix(floorNumber: number, seed: number = Date.now()): DungeonAffix {
  const rng = new SeededRandom(seed + floorNumber * 77);
  const index = rng.range(0, DUNGEON_AFFIXES.length - 1);
  return DUNGEON_AFFIXES[index];
}

interface RectRoom {
  id: number;
  x: number;
  z: number;
  w: number;
  h: number;
  type: 'entrance' | 'combat' | 'treasure' | 'shrine' | 'boss';
  shape?: 'rect' | 'circle' | 'pillars';
}

export function generateProceduralDungeon(
  mapId: string,
  floorNumber: number = 1,
  customSeed?: number
): ProceduralDungeon {
  const isSewers = mapId === 'HUNT_SEWERS';
  const seed = customSeed ?? (Math.floor(Math.random() * 10000000) + 1);
  const rng = new SeededRandom(seed);

  // Balanced, authentic cavern sizes (34x34 to 38x38) - spacious & organic!
  const width = rng.range(34, 38);
  const height = rng.range(34, 38);

  const tiles: TileType[][] = [];
  for (let z = 0; z < height; z++) {
    tiles[z] = [];
    for (let x = 0; x < width; x++) {
      tiles[z][x] = 'wall';
    }
  }

  // Divide map into 6 sectors for well-distributed cavern chambers
  const sectors = [
    { minX: 3, maxX: Math.floor(width * 0.45), minZ: 3, maxZ: Math.floor(height * 0.45) }, // Top-Left
    { minX: Math.floor(width * 0.55), maxX: width - 4, minZ: 3, maxZ: Math.floor(height * 0.45) }, // Top-Right
    { minX: 3, maxX: Math.floor(width * 0.45), minZ: Math.floor(height * 0.55), maxZ: height - 4 }, // Bottom-Left
    { minX: Math.floor(width * 0.55), maxX: width - 4, minZ: Math.floor(height * 0.55), maxZ: height - 4 }, // Bottom-Right
    { minX: Math.floor(width * 0.35), maxX: Math.floor(width * 0.65), minZ: Math.floor(height * 0.35), maxZ: Math.floor(height * 0.65) }, // Center
    { minX: Math.floor(width * 0.35), maxX: Math.floor(width * 0.65), minZ: 3, maxZ: Math.floor(height * 0.45) }, // Top-Center
  ];

  const roomCount = rng.range(6, 8);
  const rooms: RectRoom[] = [];

  const types: RectRoom['type'][] = ['entrance', 'boss'];
  if (roomCount >= 3) types.push('treasure');
  if (roomCount >= 4) types.push('shrine');
  while (types.length < roomCount) {
    types.push('combat');
  }

  // Shuffle roles deterministically
  for (let i = types.length - 1; i > 0; i--) {
    const j = rng.range(0, i);
    const temp = types[i];
    types[i] = types[j];
    types[j] = temp;
  }

  for (let i = 0; i < roomCount; i++) {
    const sec = sectors[i % sectors.length];
    const roomW = rng.range(7, 10);
    const roomH = rng.range(7, 10);

    const rx = Math.max(3, Math.min(width - roomW - 3, rng.range(sec.minX, Math.max(sec.minX, sec.maxX - roomW))));
    const rz = Math.max(3, Math.min(height - roomH - 3, rng.range(sec.minZ, Math.max(sec.minZ, sec.maxZ - roomH))));

    rooms.push({
      id: i,
      x: rx,
      z: rz,
      w: roomW,
      h: roomH,
      type: types[i],
      shape: 'circle',
    });
  }

  // Carve Organic Cavern Chambers with natural sine/cosine rock contours
  for (const r of rooms) {
    const cx = r.x + r.w / 2;
    const cz = r.z + r.h / 2;
    const radX = (r.w - 1) / 2;
    const radZ = (r.h - 1) / 2;
    const chamberSeed = r.id * 1337 + seed;

    for (let rz = r.z - 2; rz <= r.z + r.h + 2; rz++) {
      for (let rx = r.x - 2; rx <= r.x + r.w + 2; rx++) {
        if (rz >= 2 && rz < height - 2 && rx >= 2 && rx < width - 2) {
          const dx = (rx + 0.5 - cx) / radX;
          const dz = (rz + 0.5 - cz) / radZ;
          const angle = Math.atan2(dz, dx);

          // Organic Cavern Formula: modulating radius creates natural rock alcoves and curved cave walls
          const organicNoise = 0.88 + 0.22 * Math.sin(angle * 3 + chamberSeed) + 0.12 * Math.cos(angle * 5 + chamberSeed * 0.7);

          if (dx * dx + dz * dz <= organicNoise * organicNoise) {
            tiles[rz][rx] = 'floor';
          }
        }
      }
    }

    // Natural Cavern Stalagmites / Rock Pillars in larger chambers
    if (r.w >= 8 && r.h >= 8 && r.type !== 'entrance') {
      const px1 = Math.floor(cx - 2);
      const px2 = Math.floor(cx + 2);
      const pz1 = Math.floor(cz - 2);
      const pz2 = Math.floor(cz + 2);

      if (tiles[pz1]?.[px1] === 'floor') tiles[pz1][px1] = 'pillar';
      if (tiles[pz2]?.[px2] === 'floor') tiles[pz2][px2] = 'pillar';
    }
  }

  // Carve Winding Natural Cavern Tunnels
  const carveTunnelSegment = (x1: number, z1: number, x2: number, z2: number) => {
    let currX = x1;
    let currZ = z1;

    while (currX !== x2 || currZ !== z2) {
      // 2-3 tile wide brush for smooth, natural winding cave passage
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dz) <= 1) {
            const tx = currX + dx;
            const tz = currZ + dz;
            if (tx >= 2 && tx < width - 2 && tz >= 2 && tz < height - 2) {
              tiles[tz][tx] = 'floor';
            }
          }
        }
      }

      const dx = x2 - currX;
      const dz = z2 - currZ;

      if (Math.abs(dx) > Math.abs(dz)) {
        currX += Math.sign(dx);
        if (dz !== 0 && rng.next() > 0.7) {
          currZ += Math.sign(dz);
        }
      } else {
        currZ += Math.sign(dz);
        if (dx !== 0 && rng.next() > 0.7) {
          currX += Math.sign(dx);
        }
      }
    }
  };

  // Connect adjacent chambers into a primary loop + winding tunnels
  for (let i = 0; i < rooms.length; i++) {
    const nextIdx = (i + 1) % rooms.length;
    const rA = rooms[i];
    const rB = rooms[nextIdx];

    const cAx = Math.floor(rA.x + rA.w / 2);
    const cAz = Math.floor(rA.z + rA.h / 2);
    const cBx = Math.floor(rB.x + rB.w / 2);
    const cBz = Math.floor(rB.z + rB.h / 2);

    const midX = Math.floor((cAx + cBx) / 2 + rng.range(-2, 2));
    const midZ = Math.floor((cAz + cBz) / 2 + rng.range(-2, 2));

    carveTunnelSegment(cAx, cAz, midX, midZ);
    carveTunnelSegment(midX, midZ, cBx, cBz);
  }

  // Extra cross-connector tunnel for fluid loops
  if (rooms.length >= 4) {
    const rA = rooms[0];
    const rB = rooms[Math.floor(rooms.length / 2)];
    const cAx = Math.floor(rA.x + rA.w / 2);
    const cAz = Math.floor(rA.z + rA.h / 2);
    const cBx = Math.floor(rB.x + rB.w / 2);
    const cBz = Math.floor(rB.z + rB.h / 2);

    carveTunnelSegment(cAx, cAz, cBx, cBz);
  }

  // Entrance Portal & Spawn in Entrance Cavern
  const entranceRoom = rooms.find((r) => r.type === 'entrance') || rooms[0];
  const spawnPoint = {
    x: Math.floor(entranceRoom.x + entranceRoom.w / 2) + 0.5,
    z: Math.floor(entranceRoom.z + entranceRoom.h / 2) + 0.5,
  };

  const startX = Math.floor(spawnPoint.x);
  const startZ = Math.floor(spawnPoint.z);
  tiles[startZ][startX] = 'floor'; // Guarantee floor under portal

  // Ensure 100% Pathfinding Connectivity using Flood Fill
  const visited: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  const queue: Array<[number, number]> = [[startX, startZ]];
  visited[startZ][startX] = true;

  while (queue.length > 0) {
    const [cx, cz] = queue.shift()!;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of dirs) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx >= 0 && nx < width && nz >= 0 && nz < height && !visited[nz][nx]) {
        if (tiles[nz][nx] === 'floor' || tiles[nz][nx] === 'portal' || tiles[nz][nx] === 'altar') {
          visited[nz][nx] = true;
          queue.push([nx, nz]);
        }
      }
    }
  }

  // Carve direct tunnel if any cavern chamber was unconnected
  for (const r of rooms) {
    const rx = Math.floor(r.x + r.w / 2);
    const rz = Math.floor(r.z + r.h / 2);
    if (!visited[rz][rx]) {
      carveTunnelSegment(startX, startZ, rx, rz);
    }
  }

  tiles[Math.floor(spawnPoint.z)][Math.floor(spawnPoint.x)] = 'portal';

  // Boss Arena & Descent Altar in Boss Cavern
  const bossRoom = rooms.find((r) => r.type === 'boss') || rooms[rooms.length - 1];
  const bossCenter = {
    x: Math.floor(bossRoom.x + bossRoom.w / 2) + 0.5,
    z: Math.floor(bossRoom.z + bossRoom.h / 2) + 0.5,
  };
  tiles[Math.floor(bossCenter.z)][Math.floor(bossCenter.x)] = 'altar';

  // Torches in cavern alcoves and tunnel entrances
  const torchPositions: Array<{ x: number; z: number }> = [];
  const torchSet = new Set<string>();

  const addTorch = (tx: number, tz: number) => {
    const key = `${Math.floor(tx)},${Math.floor(tz)}`;
    if (!torchSet.has(key) && tx >= 2 && tx < width - 2 && tz >= 2 && tz < height - 2) {
      torchSet.add(key);
      torchPositions.push({ x: tx, z: tz });
    }
  };

  for (const r of rooms) {
    const cx = Math.floor(r.x + r.w / 2);
    const cz = Math.floor(r.z + r.h / 2);
    addTorch(cx - 2, cz - 2);
    addTorch(cx + 2, cz - 2);
    addTorch(cx - 2, cz + 2);
    addTorch(cx + 2, cz + 2);
  }

  addTorch(Math.floor(spawnPoint.x) - 1, Math.floor(spawnPoint.z));
  addTorch(Math.floor(spawnPoint.x) + 1, Math.floor(spawnPoint.z));
  addTorch(Math.floor(bossCenter.x) - 1, Math.floor(bossCenter.z));
  addTorch(Math.floor(bossCenter.x) + 1, Math.floor(bossCenter.z));

  // Breakable Objects (Urns, Chests, Barrels) in cavern alcoves
  const breakables: BreakableObject[] = [];
  let breakableIdCount = 1;
  for (const r of rooms) {
    const count = r.type === 'treasure' ? 4 : rng.range(2, 3);
    for (let c = 0; c < count; c++) {
      const bx = rng.range(r.x + 1, r.x + r.w - 2) + 0.5;
      const bz = rng.range(r.z + 1, r.z + r.h - 2) + 0.5;
      const tile = tiles[Math.floor(bz)]?.[Math.floor(bx)];
      if (tile === 'floor') {
        const typeChoice = isSewers ? 'barrel' : r.type === 'treasure' ? 'chest' : 'urn';
        breakables.push({
          id: `brk_${floorNumber}_${breakableIdCount++}`,
          type: typeChoice,
          x: bx,
          y: 0,
          z: bz,
          hp: typeChoice === 'chest' ? 30 : 15,
          maxHp: typeChoice === 'chest' ? 30 : 15,
          broken: false,
        });
      }
    }
  }

  // Seeded monster spawn locations across combat chambers
  const seededMonsterSpawns: SeededMonsterSpawn[] = [];
  let mobCount = 1;
  for (const r of rooms) {
    if (r.type === 'entrance' || r.type === 'boss') continue;
    const count = rng.range(2, 3);
    for (let i = 0; i < count; i++) {
      const mx = rng.range(r.x + 1, r.x + r.w - 2) + 0.5;
      const mz = rng.range(r.z + 1, r.z + r.h - 2) + 0.5;
      const tile = tiles[Math.floor(mz)]?.[Math.floor(mx)];
      if (tile === 'floor') {
        seededMonsterSpawns.push({
          id: `mob_seed_${floorNumber}_${mobCount++}`,
          x: mx,
          z: mz,
        });
      }
    }
  }

  const affix = getRandomAffix(floorNumber, seed);
  const dungeonNameMap: Record<string, string> = {
    HUNT_SEWERS: 'Thais Ancient Sewers',
    HUNT_RUINS: 'Mount Sternum Ruins',
    HUNT_PIRATE_COVE: 'Liberty Bay Pirate Cove',
    HUNT_DRAGON_LAIR: 'Ankrahmun Dragon Lair',
    HUNT_HERO_CAVE: 'Edron Hero Sanctuary',
    HUNT_DEMON_HELL: 'Goroma Demon Hell',
    DUNGEON_CATACOMBS: 'Catacumbas Esquecidas',
    DUNGEON_ABYSSAL_RUINS: 'Cidadela Abissal',
    DUNGEON_DRAGON_SPIRE: 'Pináculo dos Dragões',
    DUNGEON_INFERNAL_VAULT: 'Cofre Infernal do Pesadelo',
  };
  const dungeonBaseName = dungeonNameMap[mapId] || 'Dungeon Cavern';
  const dungeonName = `${dungeonBaseName} - B${floorNumber}`;

  return {
    grid: {
      mapId,
      width,
      height,
      tiles,
      spawnPoint,
      bossArenaCenter: bossCenter,
      torchPositions,
      rooms: rooms.map((r) => ({ x: r.x, z: r.z, w: r.w, h: r.h })),
    },
    affix,
    breakables,
    floorNumber,
    dungeonName,
    seed,
    seededMonsterSpawns,
  };
}
