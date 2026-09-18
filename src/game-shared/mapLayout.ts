import { generateProceduralDungeon } from './proceduralDungeon';

export type TileType = 'floor' | 'wall' | 'water' | 'pillar' | 'portal' | 'altar' | 'torch';

export interface MapGrid {
  mapId: string;
  width: number;
  height: number;
  tiles: TileType[][];
  spawnPoint: { x: number; z: number };
  bossArenaCenter?: { x: number; z: number };
  torchPositions: Array<{ x: number; z: number }>;
  rooms: Array<{ x: number; z: number; w: number; h: number }>;
  staticSpawnNodes?: Array<{ x: number; z: number }>;
}

export function generateStaticOpenWorldGrid(mapId: string): MapGrid {
  const width = 34;
  const height = 34;
  const tiles: TileType[][] = [];

  // Initialize with solid rock/wall
  for (let z = 0; z < height; z++) {
    tiles[z] = [];
    for (let x = 0; x < width; x++) {
      tiles[z][x] = 'wall';
    }
  }

  // Carve helper function
  const carveRoom = (rx: number, rz: number, rw: number, rh: number) => {
    for (let z = rz; z < rz + rh && z < height - 1; z++) {
      for (let x = rx; x < rx + rw && x < width - 1; x++) {
        if (x > 0 && z > 0) {
          tiles[z][x] = 'floor';
        }
      }
    }
  };

  const carveCorridor = (x1: number, z1: number, x2: number, z2: number, w: number = 2) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);

    for (let x = minX; x <= maxX; x++) {
      for (let offset = 0; offset < w; offset++) {
        const cz = z1 + offset;
        if (cz > 0 && cz < height - 1 && x > 0 && x < width - 1) {
          tiles[cz][x] = 'floor';
        }
      }
    }

    for (let z = minZ; z <= maxZ; z++) {
      for (let offset = 0; offset < w; offset++) {
        const cx = x2 + offset;
        if (cx > 0 && cx < width - 1 && z > 0 && z < height - 1) {
          tiles[z][cx] = 'floor';
        }
      }
    }
  };

  // 1. South Sanctuary Entrance & Waypoint
  carveRoom(12, 24, 10, 7);

  // 2. Central Crossroads
  carveRoom(14, 14, 6, 7);

  // 3. West Wing / Cavern
  carveRoom(3, 13, 9, 10);

  // 4. East Wing / Cavern
  carveRoom(22, 13, 9, 10);

  // 5. North Boss / Deep Hunting Hall
  carveRoom(8, 3, 18, 9);

  // Corridors connecting all chambers seamlessly
  carveCorridor(16, 24, 16, 19, 3); // South Entrance -> Central Crossroads
  carveCorridor(11, 17, 14, 17, 2); // West Wing -> Central Crossroads
  carveCorridor(19, 17, 22, 17, 2); // Central Crossroads -> East Wing
  carveCorridor(16, 14, 16, 11, 3); // Central Crossroads -> North Hall
  carveCorridor(7, 13, 9, 11, 2);  // West Wing -> North Hall
  carveCorridor(26, 13, 24, 11, 2); // East Wing -> North Hall

  // Waypoint Return Portal (South edge of entrance chamber)
  tiles[29][16] = 'portal';
  tiles[29][17] = 'portal';

  // Architectural & Natural Pillars
  const pillarList: Array<{ x: number; z: number }> = [
    // Entrance
    { x: 13, z: 26 }, { x: 20, z: 26 },
    // West Wing
    { x: 5, z: 15 }, { x: 9, z: 20 },
    // East Wing
    { x: 24, z: 15 }, { x: 28, z: 20 },
    // North Hall
    { x: 11, z: 5 }, { x: 22, z: 5 },
    { x: 13, z: 9 }, { x: 20, z: 9 },
  ];
  for (const p of pillarList) {
    if (p.z > 0 && p.z < height - 1 && p.x > 0 && p.x < width - 1) {
      tiles[p.z][p.x] = 'pillar';
    }
  }

  // Atmospheric Torches
  const torchPositions: Array<{ x: number; z: number }> = [
    { x: 15, z: 28 }, { x: 18, z: 28 },
    { x: 14, z: 20 }, { x: 19, z: 20 },
    { x: 14, z: 13 }, { x: 19, z: 13 },
    { x: 4, z: 14 }, { x: 11, z: 14 },
    { x: 23, z: 14 }, { x: 29, z: 14 },
    { x: 10, z: 4 }, { x: 23, z: 4 },
  ];

  // Predefined Handcrafted Monster Spawn Nodes for Continuous Respawn
  const staticSpawnNodes: Array<{ x: number; z: number }> = [
    // West Cavern (Rotworms/Skeletons/Pirates/Hatchlings)
    { x: 5.5, z: 16.5 },
    { x: 9.5, z: 16.5 },
    { x: 6.5, z: 21.0 },
    { x: 10.0, z: 21.0 },

    // East Cavern
    { x: 24.5, z: 16.5 },
    { x: 28.5, z: 16.5 },
    { x: 24.5, z: 21.0 },
    { x: 28.5, z: 21.0 },

    // Central Corridor / Crossroads
    { x: 16.5, z: 16.5 },
    { x: 16.5, z: 21.5 },

    // North Elite Chamber
    { x: 11.5, z: 7.0 },
    { x: 16.5, z: 5.5 },
    { x: 21.5, z: 7.0 },
    { x: 14.0, z: 10.0 },
    { x: 19.0, z: 10.0 },
  ];

  const rooms: Array<{ x: number; z: number; w: number; h: number }> = [
    { x: 12, z: 24, w: 10, h: 7 }, // Entrance
    { x: 14, z: 14, w: 6, h: 7 },  // Center
    { x: 3, z: 13, w: 9, h: 10 },  // West
    { x: 22, z: 13, w: 9, h: 10 }, // East
    { x: 8, z: 3, w: 18, h: 9 },   // North
  ];

  return {
    mapId,
    width,
    height,
    tiles,
    spawnPoint: { x: 16.5, z: 27.5 },
    bossArenaCenter: { x: 16.5, z: 6.5 },
    torchPositions,
    rooms,
    staticSpawnNodes,
  };
}

// 3. Grand World Boss Arena Layout (Large Open Colosseum for AoE Dodging)
function generateWorldBossArenaGrid(mapId: string): MapGrid {
  const width = 34;
  const height = 34;
  const tiles: TileType[][] = [];

  for (let z = 0; z < height; z++) {
    tiles[z] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || z === 0 || z === height - 1) {
        tiles[z][x] = 'wall';
      } else {
        tiles[z][x] = 'floor';
      }
    }
  }

  // Four corner decorative pillars (small 2x2 blocks)
  for (let z = 6; z <= 7; z++) {
    for (let x = 6; x <= 7; x++) tiles[z][x] = 'wall';
    for (let x = 26; x <= 27; x++) tiles[z][x] = 'wall';
  }
  for (let z = 26; z <= 27; z++) {
    for (let x = 6; x <= 7; x++) tiles[z][x] = 'wall';
    for (let x = 26; x <= 27; x++) tiles[z][x] = 'wall';
  }

  const torchPositions = [
    { x: 5, z: 5 }, { x: 28, z: 5 },
    { x: 5, z: 28 }, { x: 28, z: 28 },
    { x: 17, z: 2 }, { x: 17, z: 31 },
    { x: 2, z: 17 }, { x: 31, z: 17 },
  ];

  return {
    mapId,
    width,
    height,
    tiles,
    spawnPoint: { x: 17.0, z: 29.5 },
    bossArenaCenter: { x: 17.0, z: 14.0 },
    torchPositions,
    rooms: [{ x: 1, z: 1, w: width - 2, h: height - 2 }],
  };
}

export function generateMapGrid(mapId: string, floorNumber: number = 1, seed?: number): MapGrid {
  if (mapId === 'HUB_THAIS') {
    const width = 24;
    const height = 24;
    const tiles: TileType[][] = [];

    for (let z = 0; z < height; z++) {
      tiles[z] = [];
      for (let x = 0; x < width; x++) {
        // Outer walls
        if (x === 0 || x === width - 1 || z === 0 || z === height - 1) {
          tiles[z][x] = 'wall';
        } else {
          tiles[z][x] = 'floor';
        }
      }
    }

    // Open Town Square Plaza of Thais (no interior pillar collisions)
    // Altar / Monument at top center
    tiles[3][11] = 'altar';
    tiles[3][12] = 'altar';

    // Portal to hunt areas at south
    tiles[20][11] = 'portal';
    tiles[20][12] = 'portal';

    const torchPositions = [
      { x: 2, z: 4 }, { x: 21, z: 4 },
      { x: 2, z: 12 }, { x: 21, z: 12 },
      { x: 2, z: 20 }, { x: 21, z: 20 },
      { x: 10, z: 3 }, { x: 13, z: 3 },
    ];

    return {
      mapId,
      width,
      height,
      tiles,
      spawnPoint: { x: 11.5, z: 11.5 },
      torchPositions,
      rooms: [{ x: 1, z: 1, w: width - 2, h: height - 2 }],
    };
  }

  // 1. Static Open World Hunts (Hunts Comuns)
  if (mapId.startsWith('HUNT_')) {
    return generateStaticOpenWorldGrid(mapId);
  }

  // 2. World Boss Arenas
  if (mapId.startsWith('WORLD_BOSS_')) {
    return generateWorldBossArenaGrid(mapId);
  }

  // 3. Procedural Dungeons & Rift Tower Floors
  const proc = generateProceduralDungeon(mapId, floorNumber, seed);
  return proc.grid;
}

export function isWalkable(grid: MapGrid, x: number, z: number): boolean {
  const gx = Math.floor(x);
  const gz = Math.floor(z);
  if (gx < 0 || gx >= grid.width || gz < 0 || gz >= grid.height) return false;
  const tile = grid.tiles[gz][gx];
  return tile === 'floor' || tile === 'portal' || tile === 'altar';
}

export function isPositionWalkableCircle(grid: MapGrid, x: number, z: number, radius = 0.32): boolean {
  if (!isWalkable(grid, x, z)) return false;
  if (!isWalkable(grid, x - radius, z)) return false;
  if (!isWalkable(grid, x + radius, z)) return false;
  if (!isWalkable(grid, x, z - radius)) return false;
  if (!isWalkable(grid, x, z + radius)) return false;
  return true;
}
