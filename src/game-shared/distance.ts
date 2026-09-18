import { VocationType, MonsterDef } from '../types/game';

/**
 * Calculates Chebyshev distance in SQM (Square Meters / Grid Tiles).
 * In Tibia/Grid-based RPGs, adjacent tiles (North, South, East, West, and 4 diagonals)
 * have a distance of exactly 1 SQM.
 */
export function getSqmDistance(x1: number, z1: number, x2: number, z2: number): number {
  const sx1 = Math.floor(x1);
  const sz1 = Math.floor(z1);
  const sx2 = Math.floor(x2);
  const sz2 = Math.floor(z2);
  return Math.max(Math.abs(sx1 - sx2), Math.abs(sz1 - sz2));
}

/**
 * Manhattan distance in SQMs (ignoring diagonal direct jumps)
 */
export function getManhattanDistance(x1: number, z1: number, x2: number, z2: number): number {
  const sx1 = Math.floor(x1);
  const sz1 = Math.floor(z1);
  const sx2 = Math.floor(x2);
  const sz2 = Math.floor(z2);
  return Math.abs(sx1 - sx2) + Math.abs(sz1 - sz2);
}

/**
 * Checks if two positions are in adjacent SQMs (touching tiles: N, S, E, W, NE, NW, SE, SW or same tile)
 */
export function isAdjacentSqm(x1: number, z1: number, x2: number, z2: number): boolean {
  return getSqmDistance(x1, z1, x2, z2) <= 1;
}

/**
 * Attack range rules in SQMs for player vocations:
 * - KNIGHT: 1 SQM (True Melee / Corpo-a-Corpo adjacent 8 squares)
 * - PALADIN: 5 SQMs (Distance Weapons / Bows / Crossbows / Spears)
 * - SORCERER: 5 SQMs (Wands / Strike Spells)
 * - DRUID: 5 SQMs (Rods / Strike Spells)
 */
export function getVocationAttackRange(vocation: VocationType): number {
  switch (vocation) {
    case 'KNIGHT':
      return 1;
    case 'PALADIN':
      return 5;
    case 'SORCERER':
    case 'DRUID':
      return 5;
    default:
      return 1;
  }
}

/**
 * Spell casting range in SQMs
 */
export function getSpellRange(spellId: string): number {
  if (spellId.includes('wave') || spellId.includes('beam')) {
    return 6;
  }
  if (spellId.includes('sd') || spellId.includes('rune')) {
    return 6;
  }
  return 5;
}

/**
 * Attack range for monsters:
 * - Melee monsters: 1 SQM
 * - Ranged monsters: 4 SQMs
 */
export function getMonsterAttackRange(def: MonsterDef): number {
  return def.isRanged ? 4 : 1;
}

/**
 * Snaps coordinate to SQM center (e.g. 3.2 -> 3.5)
 */
export function snapToSqm(coord: number): number {
  return Math.floor(coord) + 0.5;
}

/**
 * Snaps an (x, z) point to exact SQM tile center
 */
export function snapPointToSqm(point: { x: number; z: number }): { x: number; z: number } {
  return {
    x: Math.floor(point.x) + 0.5,
    z: Math.floor(point.z) + 0.5,
  };
}

/**
 * Calculates step duration per SQM step in milliseconds based on level and equipment speed.
 * Gives that authentic Tibia fluid tile-stepping cadence.
 */
export function getStepDurationMs(level: number, hasHasteBoots: boolean = false): number {
  // Base speed in Tibia: higher level = faster step duration
  const baseMs = 320;
  const levelBonus = Math.min(140, Math.floor(level * 2.2));
  const hasteBonus = hasHasteBoots ? 55 : 0;
  return Math.max(130, baseMs - levelBonus - hasteBonus);
}

/**
 * Calculates monster step duration per SQM step in milliseconds based on monster speed stat.
 */
export function getMonsterStepDurationMs(speed: number): number {
  // Monster speed between 15 (slow rotworm/troll) and 35 (fast dragon/boss)
  const normSpeed = Math.max(10, Math.min(45, speed));
  return Math.max(160, Math.floor(520 - (normSpeed * 9.5)));
}
