export interface MasteryMilestone {
  tier: number;
  name: string;
  killsRequired: number;
  bonusDescription: string;
  bonusHp: number;
  bonusMana: number;
  bonusSkill: number;
  bonusCrit: number;
}

export const HUNT_MASTERY_TIERS: MasteryMilestone[] = [
  {
    tier: 1,
    name: 'Novice Slayer',
    killsRequired: 25,
    bonusDescription: '+15 Max HP & +10 Max Mana',
    bonusHp: 15,
    bonusMana: 10,
    bonusSkill: 0,
    bonusCrit: 0,
  },
  {
    tier: 2,
    name: 'Veteran Hunter',
    killsRequired: 75,
    bonusDescription: '+1 All Weapon & Magic Skills',
    bonusHp: 0,
    bonusMana: 0,
    bonusSkill: 1,
    bonusCrit: 0,
  },
  {
    tier: 3,
    name: 'Dungeon Master',
    killsRequired: 175,
    bonusDescription: '+35 Max HP & +25 Max Mana',
    bonusHp: 35,
    bonusMana: 25,
    bonusSkill: 0,
    bonusCrit: 0,
  },
  {
    tier: 4,
    name: 'Apex Conqueror',
    killsRequired: 350,
    bonusDescription: '+3% Crit Rate & +2 All Skills',
    bonusHp: 0,
    bonusMana: 0,
    bonusSkill: 2,
    bonusCrit: 3,
  },
];

export function getMapMasteryProgress(kills: number) {
  let completedTier = 0;
  let nextTierMilestone = HUNT_MASTERY_TIERS[0];

  for (const tier of HUNT_MASTERY_TIERS) {
    if (kills >= tier.killsRequired) {
      completedTier = tier.tier;
    } else if (!nextTierMilestone || kills < nextTierMilestone.killsRequired) {
      nextTierMilestone = tier;
      break;
    }
  }

  const isMaxTier = completedTier >= HUNT_MASTERY_TIERS.length;
  const targetKills = isMaxTier
    ? HUNT_MASTERY_TIERS[HUNT_MASTERY_TIERS.length - 1].killsRequired
    : nextTierMilestone.killsRequired;
  const prevTargetKills =
    completedTier > 0 ? HUNT_MASTERY_TIERS[completedTier - 1].killsRequired : 0;

  const progressPercent = isMaxTier
    ? 100
    : Math.min(
        100,
        Math.max(
          0,
          Math.round(((kills - prevTargetKills) / (targetKills - prevTargetKills)) * 100)
        )
      );

  return {
    completedTier,
    nextTierMilestone,
    isMaxTier,
    progressPercent,
    targetKills,
  };
}

export function calculateTotalMasteryBonuses(huntMastery: Record<string, number> = {}) {
  let totalHp = 0;
  let totalMana = 0;
  let totalSkill = 0;
  let totalCrit = 0;
  let totalTiersUnlocked = 0;

  for (const kills of Object.values(huntMastery)) {
    for (const tier of HUNT_MASTERY_TIERS) {
      if (kills >= tier.killsRequired) {
        totalHp += tier.bonusHp;
        totalMana += tier.bonusMana;
        totalSkill += tier.bonusSkill;
        totalCrit += tier.bonusCrit;
        totalTiersUnlocked++;
      }
    }
  }

  return {
    totalHp,
    totalMana,
    totalSkill,
    totalCrit,
    totalTiersUnlocked,
  };
}
