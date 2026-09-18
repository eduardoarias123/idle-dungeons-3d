import { DailyBounty } from '../types/game';

export const ALL_BOUNTY_TEMPLATES: Array<Omit<DailyBounty, 'currentKills' | 'completed' | 'claimed'>> = [
  {
    id: 'bounty_rat_1',
    title: 'Rat Extermination',
    description: 'Clear out aggressive sewer rats threatening the tavern cellars.',
    targetMonsterDefId: 'rat',
    targetMonsterName: 'Cave Rat',
    requiredKills: 10,
    rewardGold: 150,
    rewardExp: 200,
  },
  {
    id: 'bounty_goblin_1',
    title: 'Goblin Raid Threat',
    description: 'Defeat goblin scouts lurking near the ancient ruins entrance.',
    targetMonsterDefId: 'goblin',
    targetMonsterName: 'Goblin Scout',
    requiredKills: 8,
    rewardGold: 300,
    rewardExp: 450,
  },
  {
    id: 'bounty_orc_1',
    title: 'Orc Warrior Patrols',
    description: 'Push back the invading Orc warriors raiding supply caravans.',
    targetMonsterDefId: 'orc',
    targetMonsterName: 'Orc Warrior',
    requiredKills: 6,
    rewardGold: 600,
    rewardExp: 900,
  },
  {
    id: 'bounty_skeleton_1',
    title: 'Undead Catacomb Menace',
    description: 'Purge restless skeletons haunting the crypt depths.',
    targetMonsterDefId: 'skeleton',
    targetMonsterName: 'Skeleton',
    requiredKills: 8,
    rewardGold: 750,
    rewardExp: 1200,
  },
  {
    id: 'bounty_dragon_1',
    title: 'Draconic Terror',
    description: 'Slay the fearsome dragon lurking in the volcanic caverns.',
    targetMonsterDefId: 'dragon',
    targetMonsterName: 'Young Dragon',
    requiredKills: 2,
    rewardGold: 3000,
    rewardExp: 5000,
  },
];

export function ensureCharacterBounties(existingBounties?: DailyBounty[]): DailyBounty[] {
  if (existingBounties && existingBounties.length >= 3) {
    return existingBounties;
  }

  // Pick 3 random templates
  const shuffled = [...ALL_BOUNTY_TEMPLATES].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);

  return selected.map((tpl) => ({
    ...tpl,
    currentKills: 0,
    completed: false,
    claimed: false,
  }));
}
