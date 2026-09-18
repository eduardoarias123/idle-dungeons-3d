// Server-Side Grid A* & Steering Pathfinding
import { MapGrid, isWalkable } from './mapLayout';

interface PathNode {
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

export function findPath(
  grid: MapGrid,
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  maxSteps = 350
): Array<{ x: number; z: number }> {
  const sx = Math.floor(startX);
  const sz = Math.floor(startZ);
  const tx = Math.floor(targetX);
  const tz = Math.floor(targetZ);

  if (sx === tx && sz === tz) return [{ x: targetX, z: targetZ }];

  // If target tile is solid wall, find nearest adjacent walkable tile
  let effectiveTargetX = tx;
  let effectiveTargetZ = tz;
  if (!isWalkable(grid, tx, tz)) {
    const adjacents = [
      { x: tx + 1, z: tz },
      { x: tx - 1, z: tz },
      { x: tx, z: tz + 1 },
      { x: tx, z: tz - 1 },
    ];
    let found = false;
    for (const adj of adjacents) {
      if (isWalkable(grid, adj.x, adj.z)) {
        effectiveTargetX = adj.x;
        effectiveTargetZ = adj.z;
        found = true;
        break;
      }
    }
    if (!found) return [];
  }

  const openList: PathNode[] = [];
  const openMap = new Map<string, PathNode>();
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: sx,
    z: sz,
    g: 0,
    h: Math.abs(effectiveTargetX - sx) + Math.abs(effectiveTargetZ - sz),
    f: 0,
  };
  startNode.f = startNode.g + startNode.h;
  openList.push(startNode);
  openMap.set(`${sx},${sz}`, startNode);

  const neighbors = [
    { dx: 1, dz: 0, cost: 1 },
    { dx: -1, dz: 0, cost: 1 },
    { dx: 0, dz: 1, cost: 1 },
    { dx: 0, dz: -1, cost: 1 },
    // Diagonals with slightly higher cost & corner cutting prevention
    { dx: 1, dz: 1, cost: 1.414 },
    { dx: -1, dz: 1, cost: 1.414 },
    { dx: 1, dz: -1, cost: 1.414 },
    { dx: -1, dz: -1, cost: 1.414 },
  ];

  let steps = 0;
  let closestNode: PathNode = startNode;

  while (openList.length > 0 && steps < maxSteps) {
    steps++;
    // Get node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[bestIdx].f) bestIdx = i;
    }
    const current = openList.splice(bestIdx, 1)[0];
    const key = `${current.x},${current.z}`;
    openMap.delete(key);
    closedSet.add(key);

    if (current.h < closestNode.h) {
      closestNode = current;
    }

    if (current.x === effectiveTargetX && current.z === effectiveTargetZ) {
      return reconstructPath(current, targetX, targetZ);
    }

    for (const n of neighbors) {
      const nx = current.x + n.dx;
      const nz = current.z + n.dz;

      if (!isWalkable(grid, nx, nz)) continue;

      // Prevent corner cutting across diagonal walls
      if (n.dx !== 0 && n.dz !== 0) {
        if (!isWalkable(grid, current.x + n.dx, current.z) || !isWalkable(grid, current.x, current.z + n.dz)) {
          continue;
        }
      }

      const neighborKey = `${nx},${nz}`;
      if (closedSet.has(neighborKey)) continue;

      const tentativeG = current.g + n.cost;
      const existing = openMap.get(neighborKey);

      if (!existing) {
        const h = Math.abs(effectiveTargetX - nx) + Math.abs(effectiveTargetZ - nz);
        const node: PathNode = {
          x: nx,
          z: nz,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };
        openList.push(node);
        openMap.set(neighborKey, node);
      } else if (tentativeG < existing.g) {
        existing.g = tentativeG;
        existing.f = tentativeG + existing.h;
        existing.parent = current;
      }
    }
  }

  // If path wasn't completed, return partial path to closest point reached
  return reconstructPath(closestNode, targetX, targetZ);
}

export function reconstructPath(endNode: PathNode, _targetRealX: number, _targetRealZ: number): Array<{ x: number; z: number }> {
  const path: Array<{ x: number; z: number }> = [];
  let curr: PathNode | undefined = endNode;

  while (curr) {
    path.push({ x: Math.floor(curr.x) + 0.5, z: Math.floor(curr.z) + 0.5 });
    curr = curr.parent;
  }
  path.reverse();

  // Remove the start position if multiple nodes
  if (path.length > 1) {
    path.shift();
  }

  return path;
}

/**
 * Checks whether there is a clear, unblocked Line of Sight (LoS) between two coordinates on the map grid.
 * Returns false if any wall/pillar obstructs the line of sight or blocks diagonal wall seams.
 */
export function hasLineOfSight(
  grid: MapGrid,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): boolean {
  const sx = Math.floor(x1);
  const sz = Math.floor(z1);
  const ex = Math.floor(x2);
  const ez = Math.floor(z2);

  // Same tile is always within direct line of sight
  if (sx === ex && sz === ez) {
    return true;
  }

  // Bounds check for start and end
  if (
    sx < 0 || sx >= grid.width || sz < 0 || sz >= grid.height ||
    ex < 0 || ex >= grid.width || ez < 0 || ez >= grid.height
  ) {
    return false;
  }

  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return true;

  // Fine-grained sampling along the line segment
  const steps = Math.max(12, Math.ceil(dist * 10));
  const stepX = dx / steps;
  const stepZ = dz / steps;

  let prevCellX = sx;
  let prevCellZ = sz;

  for (let i = 1; i < steps; i++) {
    const curX = x1 + stepX * i;
    const curZ = z1 + stepZ * i;
    const cellX = Math.floor(curX);
    const cellZ = Math.floor(curZ);

    // If still in start cell or reached target cell, skip
    if ((cellX === sx && cellZ === sz) || (cellX === ex && cellZ === ez)) {
      prevCellX = cellX;
      prevCellZ = cellZ;
      continue;
    }

    if (cellX < 0 || cellX >= grid.width || cellZ < 0 || cellZ >= grid.height) {
      return false;
    }

    // Direct solid tile check
    const tile = grid.tiles[cellZ]?.[cellX];
    if (tile === 'wall' || tile === 'pillar') {
      return false;
    }

    // Diagonal corner check (prevent shooting through touching diagonal wall seams)
    if (cellX !== prevCellX && cellZ !== prevCellZ) {
      const tileA = grid.tiles[prevCellZ]?.[cellX];
      const tileB = grid.tiles[cellZ]?.[prevCellX];
      if ((tileA === 'wall' || tileA === 'pillar') && (tileB === 'wall' || tileB === 'pillar')) {
        return false;
      }
    }

    prevCellX = cellX;
    prevCellZ = cellZ;
  }

  return true;
}

export interface KiteStepOptions {
  dangerDistance?: number;
  desiredDistance?: number;
  maxDistance?: number;
  otherObstacles?: Array<{ x: number; z: number }>;
}

/**
 * Calculates a tactical kiting retreat step for ranged characters and monsters.
 * When an enemy gets within danger distance (e.g. <= 2 SQMs), finds the best walkable tile
 * that increases distance from the threat, maintains clear Line of Sight, and stays within attack range.
 */
export function findKiteStep(
  grid: MapGrid,
  currentX: number,
  currentZ: number,
  threatX: number,
  threatZ: number,
  options: KiteStepOptions = {}
): { x: number; z: number } | null {
  const {
    dangerDistance = 2,
    desiredDistance = 3,
    maxDistance = 5,
    otherObstacles = [],
  } = options;

  const curSx = Math.floor(currentX);
  const curSz = Math.floor(currentZ);
  const threatSx = Math.floor(threatX);
  const threatSz = Math.floor(threatZ);

  const curDist = Math.max(Math.abs(curSx - threatSx), Math.abs(curSz - threatSz));

  // If already further than danger distance, no retreat needed
  if (curDist > dangerDistance) {
    return null;
  }

  const directions = [
    { dx: 0, dz: -1 },
    { dx: 0, dz: 1 },
    { dx: -1, dz: 0 },
    { dx: 1, dz: 0 },
    { dx: -1, dz: -1 },
    { dx: 1, dz: -1 },
    { dx: -1, dz: 1 },
    { dx: 1, dz: 1 },
  ];

  interface Candidate {
    x: number;
    z: number;
    score: number;
  }

  const candidates: Candidate[] = [];

  // 1. Evaluate 1-step neighbors
  for (const dir of directions) {
    const nx = curSx + dir.dx;
    const nz = curSz + dir.dz;

    if (!isWalkable(grid, nx, nz)) continue;

    // Diagonal corner safety check
    if (dir.dx !== 0 && dir.dz !== 0) {
      if (!isWalkable(grid, curSx + dir.dx, curSz) || !isWalkable(grid, curSx, curSz + dir.dz)) {
        continue;
      }
    }

    // Check collision with other obstacles/monsters
    const isOccupied = otherObstacles.some(
      (obs) => Math.floor(obs.x) === nx && Math.floor(obs.z) === nz
    );
    if (isOccupied) continue;

    const tileDist = Math.max(Math.abs(nx - threatSx), Math.abs(nz - threatSz));

    // Must increase distance from threat and not overshoot max attack range
    if (tileDist <= curDist || tileDist > maxDistance) continue;

    // Must maintain clear Line of Sight to attack/shoot the threat
    if (!hasLineOfSight(grid, nx + 0.5, nz + 0.5, threatX, threatZ)) {
      continue;
    }

    // Scoring:
    // + Gaining distance from threat
    // - Distance error from ideal kiting range
    // - Proximity penalty to other obstacles
    let score = (tileDist - curDist) * 15;
    score -= Math.abs(tileDist - desiredDistance) * 4;

    for (const obs of otherObstacles) {
      const obsDist = Math.max(Math.abs(nx - Math.floor(obs.x)), Math.abs(nz - Math.floor(obs.z)));
      if (obsDist <= 1) score -= 12;
    }

    candidates.push({ x: nx + 0.5, z: nz + 0.5, score });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return { x: candidates[0].x, z: candidates[0].z };
  }

  // 2. If 1-step direct neighbors are boxed in by walls or monsters, evaluate 2-step routes
  for (const dir1 of directions) {
    const m1x = curSx + dir1.dx;
    const m1z = curSz + dir1.dz;
    if (!isWalkable(grid, m1x, m1z)) continue;
    if (dir1.dx !== 0 && dir1.dz !== 0) {
      if (!isWalkable(grid, curSx + dir1.dx, curSz) || !isWalkable(grid, curSx, curSz + dir1.dz)) continue;
    }

    for (const dir2 of directions) {
      const m2x = m1x + dir2.dx;
      const m2z = m1z + dir2.dz;
      if (!isWalkable(grid, m2x, m2z)) continue;
      if (dir2.dx !== 0 && dir2.dz !== 0) {
        if (!isWalkable(grid, m1x + dir2.dx, m1z) || !isWalkable(grid, m1x, m1z + dir2.dz)) continue;
      }

      const isOccupied = otherObstacles.some(
        (obs) => Math.floor(obs.x) === m2x && Math.floor(obs.z) === m2z
      );
      if (isOccupied) continue;

      const tileDist = Math.max(Math.abs(m2x - threatSx), Math.abs(m2z - threatSz));
      if (tileDist <= curDist || tileDist > maxDistance) continue;
      if (!hasLineOfSight(grid, m2x + 0.5, m2z + 0.5, threatX, threatZ)) continue;

      let score = (tileDist - curDist) * 10 - Math.abs(tileDist - desiredDistance) * 4;
      candidates.push({ x: m1x + 0.5, z: m1z + 0.5, score });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return { x: candidates[0].x, z: candidates[0].z };
  }

  return null;
}
