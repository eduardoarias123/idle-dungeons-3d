import { CharacterData, CombatEvent, EntityState, MonsterDef, SpellDef } from '../types/game';
import { ITEMS_DATABASE } from '../constants/items';
import { SPELLS_DATABASE } from '../constants/spells';
import { VOCATIONS } from '../constants/vocations';
import { calculateMonsterBestiaryBonus } from '../constants/bestiary';

export interface CombatResult {
  damage: number;
  isCrit: boolean;
  isHeal: boolean;
  isMana: boolean;
  isBlocked?: boolean;
  spellWords?: string;
  color?: string;
  sourceName: string;
  targetName: string;
}

export function calculatePlayerAttack(
  player: CharacterData,
  monsterDef: MonsterDef
): CombatResult {
  const weaponItem = player.equipment.weapon ? ITEMS_DATABASE[player.equipment.weapon.defId] : null;
  const weaponAtk = weaponItem?.attack || 8;
  const vocation = player.vocation;

  let skill = 10;
  if (vocation === 'KNIGHT') {
    skill = Math.max(player.skills.sword, player.skills.axe, player.skills.club, 10);
  } else if (vocation === 'PALADIN') {
    skill = Math.max(player.skills.distance, 10);
  } else {
    skill = Math.max(player.skills.magic * 3, 15);
  }

  // Tibia-inspired formula with level scaling:
  const maxDmg = Math.max(12, Math.floor(0.085 * weaponAtk * skill + (player.level * 1.5)));
  const minDmg = Math.max(4, Math.floor(maxDmg * 0.35));

  let rawDmg = Math.floor(minDmg + Math.random() * (maxDmg - minDmg + 1));

  // Bestiary mastery bonuses
  const monsterKills = player.bestiaryKills?.[monsterDef.id] || 0;
  const bestiaryBonus = calculateMonsterBestiaryBonus(monsterDef.id, monsterKills);

  const critChance = 0.15 + (bestiaryBonus.critChanceBonus || 0) + (player.masteryBonuses?.bonusCrit ? player.masteryBonuses.bonusCrit / 100 : 0);
  const isCrit = Math.random() < critChance;
  if (isCrit) {
    rawDmg = Math.floor(rawDmg * 1.6);
  }

  // Armor reduction with guaranteed minimum hit damage
  const armorMitigation = Math.floor((monsterDef.armor || 2) * 0.4);
  let finalDmg = Math.max(Math.floor(rawDmg * 0.4), Math.max(4, rawDmg - armorMitigation));

  if (bestiaryBonus.damageBonus > 0) {
    finalDmg = Math.round(finalDmg * (1 + bestiaryBonus.damageBonus));
  }

  // Stance damage multiplier: full_attack = 1.25x, balanced = 1.0x, full_defense = 0.65x
  const stance = player.stance || 'balanced';
  const stanceMult = stance === 'full_attack' ? 1.25 : stance === 'full_defense' ? 0.65 : 1.0;
  finalDmg = Math.max(1, Math.round(finalDmg * stanceMult));

  return {
    damage: finalDmg,
    isCrit,
    isHeal: false,
    isMana: false,
    color: isCrit ? '#ff3b30' : '#fef08a',
    sourceName: player.name,
    targetName: monsterDef.name,
  };
}

export function calculateSpellCast(
  player: CharacterData,
  spell: SpellDef,
  target?: EntityState
): CombatResult {
  if (spell.isHeal) {
    // Healing scales with magic level + level * 0.2
    const healVal = Math.floor(spell.basePower + (player.skills.magic * 8) + (player.level * 0.4));
    return {
      damage: healVal,
      isCrit: false,
      isHeal: true,
      isMana: false,
      spellWords: spell.words,
      color: spell.color,
      sourceName: player.name,
      targetName: player.name,
    };
  }

  // Offensive spell damage
  // Damage = basePower + (magicLevel * multiplier) + (level / 4)
  const magicLevel = Math.max(1, player.skills.magic);
  const maxDmg = Math.floor(spell.basePower + (magicLevel * 9) + (player.level / 4));
  const minDmg = Math.floor(maxDmg * 0.7);
  let damage = Math.floor(minDmg + Math.random() * (maxDmg - minDmg + 1));

  const isCrit = Math.random() < 0.15;
  if (isCrit) {
    damage = Math.floor(damage * 1.4);
  }

  return {
    damage,
    isCrit,
    isHeal: false,
    isMana: false,
    spellWords: spell.words,
    color: spell.color,
    sourceName: player.name,
    targetName: target?.name || 'Monster',
  };
}

export function calculateMonsterAttack(
  monsterDef: MonsterDef,
  player: CharacterData
): CombatResult {
  const stance = player.stance || 'balanced';

  // Full Defense stance: 35% chance to block completely with shield
  if (stance === 'full_defense' && Math.random() < 0.35) {
    return {
      damage: 0,
      isCrit: false,
      isHeal: false,
      isMana: false,
      isBlocked: true,
      color: '#38bdf8',
      sourceName: monsterDef.name,
      targetName: player.name,
    };
  }

  // Monster physical attack roll
  const maxAtk = monsterDef.attack;
  const minAtk = Math.floor(maxAtk * 0.3);
  const rawDmg = Math.floor(minAtk + Math.random() * (maxAtk - minAtk + 1));

  // Player Defense Formula: 5 + shielding + armor*1.0 + helmet*0.6 + legs*0.5 + boots*0.3 + shield*1.5
  const getArmor = (slot: 'helmet' | 'armor' | 'legs' | 'boots') =>
    player.equipment[slot] ? ITEMS_DATABASE[player.equipment[slot]!.defId]?.armor || 0 : 0;
  const getShieldDef = () =>
    player.equipment.shield ? ITEMS_DATABASE[player.equipment.shield!.defId]?.defense || 0 : 0;

  const helmetArmor = getArmor('helmet');
  const armorArmor = getArmor('armor');
  const legsArmor = getArmor('legs');
  const bootsArmor = getArmor('boots');
  const shieldDef = getShieldDef();
  const shieldingSkill = player.skills.shielding || 10;

  const totalDefense = 5 + shieldingSkill + (armorArmor * 1.0) + (helmetArmor * 0.6) + (legsArmor * 0.5) + (bootsArmor * 0.3) + (shieldDef * 1.5);

  // Mitigation reduces raw monster damage
  const minMitigation = Math.floor(totalDefense * 0.35);
  const maxMitigation = Math.floor(totalDefense * 0.65);
  const mitigation = Math.floor(minMitigation + Math.random() * (maxMitigation - minMitigation + 1));

  const finalDmg = Math.max(1, rawDmg - mitigation);

  return {
    damage: finalDmg,
    isCrit: false,
    isHeal: false,
    isMana: false,
    color: '#ef4444',
    sourceName: monsterDef.name,
    targetName: player.name,
  };
}
