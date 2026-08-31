// 数据层共享的属性增量。所有系统使用同一份结构，避免互相依赖运行时类。
export interface StatModifier {
    hp?: number;
    atk?: number;
    def?: number;
    crit?: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
    allStats?: number;
    attackPercent?: number;
    hpPercent?: number;
    defPercent?: number;
    strengthPercent?: number;
    agilityPercent?: number;
    intelligencePercent?: number;
    allStatsPercent?: number;
    attackSpeedPercent?: number;
    critDamagePercent?: number;
    attackRangePercent?: number;
    physicalDamagePercent?: number;
    magicDamagePercent?: number;
    basicAttackDamagePercent?: number;
    multiHitDamagePercent?: number;
    bounceDamagePercent?: number;
    skillDamagePercent?: number;
    physicalCrit?: number;
    magicCrit?: number;
    physicalCritDamagePercent?: number;
    magicCritDamagePercent?: number;
    block?: number;
    skillHaste?: number;
    healthRegenPercent?: number;
}

export type DamageType = 'physical' | 'magic' | 'true';
export type DamageSourceType = 'basicAttack' | 'skill' | 'other';

export type AttributeType =
    | 'attack' | 'maxHp' | 'armor'
    | 'strength' | 'agility' | 'intelligence'
    | 'attackSpeed' | 'skillHaste'
    | 'physicalDamage' | 'magicDamage'
    | 'basicAttackDamage' | 'multiHitDamage' | 'bounceDamage' | 'skillDamage'
    | 'criticalChance' | 'physicalCrit' | 'magicCrit'
    | 'criticalDamage' | 'physicalCritDamage' | 'magicCritDamage'
    | 'block' | 'healthRegen' | 'attackRange';

export interface AttributeModifier {
    sourceId: string;
    attribute: AttributeType;
    mode: 'flat' | 'percent';
    value: number;
}

export interface FinalCombatStats {
    attack: number;
    maxHp: number;
    armor: number;
    strength: number;
    agility: number;
    intelligence: number;
    attackSpeed: number;
    skillHaste: number;
    physicalDamageBonus: number;
    magicDamageBonus: number;
    basicAttackDamageBonus: number;
    multiHitDamageBonus: number;
    bounceDamageBonus: number;
    skillDamageBonus: number;
    physicalCritChance: number;
    magicCritChance: number;
    physicalCritDamage: number;
    magicCritDamage: number;
    blockChance: number;
}
