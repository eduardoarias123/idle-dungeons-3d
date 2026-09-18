import { CharacterData, OfflineReport } from '../types/game';
import { MAPS_DATABASE } from '../constants/maps';
import { MONSTERS_DATABASE } from '../constants/monsters';
import { ITEMS_DATABASE } from '../constants/items';
import { getExperienceForLevel, getLevelFromExperience, VOCATIONS } from '../constants/vocations';

export function calculateOfflineProgress(character: CharacterData): OfflineReport | null {
  const now = Date.now();
  const lastSaved = character.lastSavedAt || now;
  const elapsedMs = now - lastSaved;

  // Minimum offline threshold: 60 seconds (1 min). Maximum offline cap: 12 hours.
  const MIN_OFFLINE_MS = 60 * 1000;
  const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000;

  if (elapsedMs < MIN_OFFLINE_MS) {
    return null;
  }

  const effectiveMs = Math.min(elapsedMs, MAX_OFFLINE_MS);
  const effectiveSeconds = Math.floor(effectiveMs / 1000);

  const currentMap = MAPS_DATABASE[character.currentMapId] || MAPS_DATABASE.HUB_THAIS;

  // If resting in safe zone (Thais Temple), characters focus on passive Mana & HP regeneration and skill training!
  if (currentMap.isSafeZone) {
    // Regenerate HP & Mana to 100%
    character.hp = character.maxHp;
    character.mana = character.maxMana;

    // Passive meditation / skill dummy training: 1 skill advance point every 30s
    const skillTrainPoints = Math.floor(effectiveSeconds / 30);
    if (character.vocation === 'KNIGHT') {
      character.skills.sword += Math.min(2, Math.floor(skillTrainPoints / 50));
      character.skills.shielding += Math.min(2, Math.floor(skillTrainPoints / 50));
    } else if (character.vocation === 'PALADIN') {
      character.skills.distance += Math.min(2, Math.floor(skillTrainPoints / 50));
      character.skills.shielding += Math.min(2, Math.floor(skillTrainPoints / 60));
    } else {
      character.skills.magic += Math.min(1, Math.floor(skillTrainPoints / 60));
    }

    return {
      timeOfflineMs: effectiveMs,
      monstersKilled: 0,
      expGained: 0,
      goldGained: 0,
      itemsLooted: [],
      levelsGained: 0,
      mapName: currentMap.name,
    };
  }

  // Active Hunt Area Idle Calculation
  // Calculate character combat efficiency:
  // Base seconds per monster kill = 12s, reduced by player level / weapon power (down to 6s)
  const killSpeed = Math.max(6, 14 - Math.floor(character.level / 5));
  const totalKills = Math.floor(effectiveSeconds / killSpeed);

  if (totalKills <= 0) return null;

  // Pick monsters from the hunt pool
  const pool = currentMap.monsterSpawnPool;
  if (!pool || pool.length === 0) return null;

  let totalExp = 0;
  let totalGold = 0;
  const lootedItemsMap: Record<string, number> = {};

  for (let i = 0; i < totalKills; i++) {
    // Pick weighted monster
    const rand = Math.random() * 100;
    let acc = 0;
    let chosenMonster = MONSTERS_DATABASE[pool[0].monsterId];
    for (const p of pool) {
      acc += p.weight;
      if (rand <= acc) {
        chosenMonster = MONSTERS_DATABASE[p.monsterId] || chosenMonster;
        break;
      }
    }

    totalExp += chosenMonster.exp;
    totalGold += Math.floor(chosenMonster.goldMin + Math.random() * (chosenMonster.goldMax - chosenMonster.goldMin + 1));

    // Loot roll
    for (const loot of chosenMonster.lootTable) {
      if (Math.random() <= loot.chance) {
        const count = Math.floor((loot.minCount || 1) + Math.random() * ((loot.maxCount || 1) - (loot.minCount || 1) + 1));
        lootedItemsMap[loot.defId] = (lootedItemsMap[loot.defId] || 0) + count;
      }
    }
  }

  // Apply experience and calculate level gains
  const initialLevel = character.level;
  character.experience += totalExp;
  character.gold += totalGold;
  character.killsCount = (character.killsCount || 0) + totalKills;

  const newLevel = getLevelFromExperience(character.experience);
  const levelsGained = newLevel - initialLevel;

  if (levelsGained > 0) {
    const voc = VOCATIONS[character.vocation];
    character.level = newLevel;
    character.maxHp += voc.hpPerLevel * levelsGained;
    character.maxMana += voc.manaPerLevel * levelsGained;
    character.capacity += voc.capPerLevel * levelsGained;
    character.hp = character.maxHp;
    character.mana = character.maxMana;
  }
  character.experienceToNext = getExperienceForLevel(character.level + 1);

  // Add items to inventory if backpack has room
  const itemsLooted: Array<{ defId: string; count: number }> = [];
  for (const [defId, count] of Object.entries(lootedItemsMap)) {
    itemsLooted.push({ defId, count });
    const def = ITEMS_DATABASE[defId];
    if (def && character.inventory.length < 24) {
      const existing = character.inventory.find(i => i.defId === defId && def.stackable);
      if (existing) {
        existing.count += count;
      } else {
        character.inventory.push({
          instanceId: 'loot_' + Math.random().toString(36).substring(2, 9),
          defId,
          count,
        });
      }
    }
  }

  // Train skills during hunting
  if (!character.skills) {
    character.skills = {
      sword: 10,
      swordTries: 0,
      axe: 10,
      axeTries: 0,
      club: 10,
      clubTries: 0,
      distance: 10,
      distanceTries: 0,
      shielding: 10,
      shieldingTries: 0,
      magic: 0,
      manaSpent: 0,
    };
  }
  const skillIncrements = Math.min(4, Math.floor(totalKills / 40));
  if (character.vocation === 'KNIGHT') {
    character.skills.sword = (character.skills.sword || 10) + skillIncrements;
    character.skills.shielding = (character.skills.shielding || 10) + skillIncrements;
  } else if (character.vocation === 'PALADIN') {
    character.skills.distance = (character.skills.distance || 10) + skillIncrements;
    character.skills.shielding = (character.skills.shielding || 10) + Math.floor(skillIncrements / 2);
  } else {
    character.skills.magic = (character.skills.magic || 0) + Math.min(2, Math.floor(skillIncrements / 2));
  }

  return {
    timeOfflineMs: effectiveMs,
    monstersKilled: totalKills,
    expGained: totalExp,
    goldGained: totalGold,
    itemsLooted,
    levelsGained,
    mapName: currentMap.name,
  };
}
