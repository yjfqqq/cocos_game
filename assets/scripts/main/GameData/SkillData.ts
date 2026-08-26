import type { StatModifier } from './EffectData';


export type SkillEffectType =
    | 'normal-damage'
    | 'normal-speed'
    | 'multishot'
    | 'penetration'
    | 'split'
    | 'tracking'
    | 'normal-crit'
    | 'awakening';

export interface SkillEffectDefinition {
    type: SkillEffectType;
    value?: number;
    params?: Record<string, number | string | boolean>;
}

export interface SkillLevelEffect {
    level: number;
    fragmentsRequired: number;
    effect: StatModifier;
    effects: SkillEffectDefinition[];
    description: string;
}

export interface SkillDefinition {
    skillId: string;
    skillName: string;
    description?: string;
    level: number;
    maxLevel: number;
    levelEffects: SkillLevelEffect[];
    expToNextLevel: number[];
}

export interface NormalAttackRuntimeConfig {
    damageMultiplier: number;
    scatterExtraTargets: number;
    scatterDamageMultiplier: number;
    penetrationTargets: number;
    penetrationDamageMultiplier: number;
    splitExtraAttacks: number;
    splitDamageMultiplier: number;
    splitTracksTargets: boolean;
    awakeningAttackInterval: number;
    awakeningMaxTargets: number;
    awakeningDamageMultiplier: number;
}

export type SkillNodeRarity =
    | 'basic'
    | 'core3'
    | 'core6'
    | 'core9'
    | 'core10';

export interface BattleSkillUpgradePrerequisite {
    nodeId: string;
    rank: number;
}

// 名称保留兼容既有导入；它现在代表完整的数据驱动局内技能节点。
export interface BattleSkillUpgradeDefinition {
    id: string;
    skillId: string;
    name: string;
    description: string;
    maxRank: number;
    requiredMetaLevel: number;
    prerequisites?: BattleSkillUpgradePrerequisite[];
    conflicts?: string[];
    weight: number;
    rarity: SkillNodeRarity;
    effectType: string;
    bonus: StatModifier;
    effects?: SkillEffectDefinition[];
    tags: string[];
}


export const NORMAL_ATTACK_SKILL_ID = 'normal-attack';

export const SKILL_FRAGMENT_SHOP_CONFIG = {
    drawCostGold: 30,
    drawMinFragments: 2,
    drawMaxFragments: 5
} as const;


// 局外等级只决定核心节点能否进入候选池；进入战斗永远只有基础普攻。
export const BATTLE_SKILL_UPGRADES: BattleSkillUpgradeDefinition[] = [
    {
        id: 'strong-hit-1', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '强击 I', description: '普攻伤害提高15%',
        maxRank: 1, requiredMetaLevel: 1, weight: 110,
        rarity: 'basic', effectType: 'stat',
        bonus: { skillDamagePercent: 15 },
        tags: ['basic', 'damage', 'progression']
    },
    {
        id: 'strong-hit-2', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '强击 II', description: '普攻伤害进一步提高20%',
        maxRank: 1, requiredMetaLevel: 1, weight: 125,
        rarity: 'basic', effectType: 'stat',
        prerequisites: [{ nodeId: 'strong-hit-1', rank: 1 }],
        bonus: { skillDamagePercent: 20 },
        tags: ['basic', 'damage', 'progression']
    },
    {
        id: 'haste-1', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '急速 I', description: '攻击速度提高10%',
        maxRank: 1, requiredMetaLevel: 1, weight: 110,
        rarity: 'basic', effectType: 'stat',
        bonus: { attackSpeedPercent: 10 },
        tags: ['basic', 'speed', 'progression']
    },
    {
        id: 'haste-2', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '急速 II', description: '攻击速度进一步提高15%',
        maxRank: 1, requiredMetaLevel: 1, weight: 125,
        rarity: 'basic', effectType: 'stat',
        prerequisites: [{ nodeId: 'haste-1', rank: 1 }],
        bonus: { attackSpeedPercent: 15 },
        tags: ['basic', 'speed', 'progression']
    },
    {
        id: 'multishot-1', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '多重 I', description: '额外攻击1个目标，额外弹体造成55%伤害',
        maxRank: 1, requiredMetaLevel: 1, weight: 105,
        rarity: 'basic', effectType: 'multishot', bonus: {},
        effects: [{
            type: 'multishot',
            params: { extraTargets: 1, damageMultiplier: 0.55 }
        }],
        tags: ['basic', 'projectile', 'progression']
    },
    {
        id: 'multishot-2', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '多重 II', description: '再增加1个额外目标，额外弹体造成60%伤害',
        maxRank: 1, requiredMetaLevel: 1, weight: 120,
        rarity: 'basic', effectType: 'multishot', bonus: {},
        prerequisites: [{ nodeId: 'multishot-1', rank: 1 }],
        effects: [{
            type: 'multishot',
            params: { extraTargets: 2, damageMultiplier: 0.6 }
        }],
        tags: ['basic', 'projectile', 'progression']
    },
    {
        id: 'penetration', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '穿透', description: '每条弹道额外贯穿1个目标，造成65%伤害',
        maxRank: 1, requiredMetaLevel: 3, weight: 170,
        rarity: 'core3', effectType: 'penetration', bonus: {},
        prerequisites: [{ nodeId: 'strong-hit-2', rank: 1 }],
        effects: [{
            type: 'penetration',
            params: { extraTargets: 1, damageMultiplier: 0.65 }
        }],
        tags: ['core', 'projectile', 'progression']
    },
    {
        id: 'split', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '分裂', description: '命中后产生1次45%伤害的分裂攻击',
        maxRank: 1, requiredMetaLevel: 6, weight: 190,
        rarity: 'core6', effectType: 'split', bonus: {},
        prerequisites: [
            { nodeId: 'penetration', rank: 1 },
            { nodeId: 'multishot-2', rank: 1 }
        ],
        effects: [{
            type: 'split',
            params: { extraAttacks: 1, damageMultiplier: 0.45 }
        }],
        tags: ['core', 'projectile', 'progression']
    },
    {
        id: 'tracking', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '追踪', description: '分裂攻击自动追踪合法目标，并增加1次分裂',
        maxRank: 1, requiredMetaLevel: 9, weight: 215,
        rarity: 'core9', effectType: 'tracking', bonus: {},
        prerequisites: [
            { nodeId: 'split', rank: 1 },
            { nodeId: 'haste-2', rank: 1 }
        ],
        effects: [{
            type: 'tracking',
            params: { extraAttacks: 2, damageMultiplier: 0.5 }
        }],
        tags: ['core', 'projectile', 'tracking', 'progression']
    },
    {
        id: 'awakening', skillId: NORMAL_ATTACK_SKILL_ID,
        name: '终极觉醒',
        description: '每10次普攻发动最多5目标的140%强化齐射',
        maxRank: 1, requiredMetaLevel: 10, weight: 260,
        rarity: 'core10', effectType: 'awakening', bonus: {},
        prerequisites: [
            { nodeId: 'penetration', rank: 1 },
            { nodeId: 'split', rank: 1 },
            { nodeId: 'tracking', rank: 1 },
            { nodeId: 'strong-hit-2', rank: 1 },
            { nodeId: 'haste-2', rank: 1 },
            { nodeId: 'multishot-2', rank: 1 }
        ],
        effects: [{
            type: 'awakening',
            params: {
                attackInterval: 10,
                maxTargets: 5,
                damageMultiplier: 1.4
            }
        }],
        tags: ['core', 'ultimate', 'progression']
    }
];


// 局外等级依旧由碎片升级并持久保留，但描述明确为候选资格。
export const SKILL_DEFINITIONS: SkillDefinition[] = [
    {
        skillId: NORMAL_ATTACK_SKILL_ID,
        skillName: '普攻',
        description: '局外等级解锁局内候选资格，效果需在战斗升级时选取。',
        level: 1,
        maxLevel: 10,
        levelEffects: [
            { level: 1, fragmentsRequired: 0, effect: {}, effects: [], description: '基础普攻；可选择基础技能节点' },
            { level: 2, fragmentsRequired: 5, effect: {}, effects: [], description: '提高基础节点构筑空间' },
            { level: 3, fragmentsRequired: 10, effect: {}, effects: [], description: '解锁Lv3核心节点【穿透】的候选资格' },
            { level: 4, fragmentsRequired: 15, effect: {}, effects: [], description: '局外普攻培养 Lv4' },
            { level: 5, fragmentsRequired: 25, effect: {}, effects: [], description: '局外普攻培养 Lv5' },
            { level: 6, fragmentsRequired: 35, effect: {}, effects: [], description: '解锁Lv6核心节点【分裂】的候选资格' },
            { level: 7, fragmentsRequired: 50, effect: {}, effects: [], description: '局外普攻培养 Lv7' },
            { level: 8, fragmentsRequired: 70, effect: {}, effects: [], description: '局外普攻培养 Lv8' },
            { level: 9, fragmentsRequired: 90, effect: {}, effects: [], description: '解锁Lv9核心节点【追踪】的候选资格' },
            { level: 10, fragmentsRequired: 150, effect: {}, effects: [], description: '解锁Lv10核心节点【终极觉醒】的候选资格' }
        ],
        expToNextLevel: []
    }
];


export function getSkillDefinition(
    skillId: string
): SkillDefinition | undefined {
    return SKILL_DEFINITIONS.find((skill) => skill.skillId === skillId);
}


export function getSkillLevelDefinition(
    skillId: string,
    level: number
): SkillLevelEffect | undefined {
    return getSkillDefinition(skillId)?.levelEffects.find((item) => {
        return item.level === level;
    });
}


export function getBattleSkillUpgradeDefinition(
    nodeId: string
): BattleSkillUpgradeDefinition | undefined {
    return BATTLE_SKILL_UPGRADES.find((node) => node.id === nodeId);
}


export function areBattleSkillUpgradePrerequisitesMet(
    node: BattleSkillUpgradeDefinition,
    ranks: Record<string, number>
): boolean {
    return (node.prerequisites ?? []).every((prerequisite) => {
        return (ranks[prerequisite.nodeId] ?? 0) >= prerequisite.rank;
    });
}


export function canOfferBattleSkillNode(
    node: BattleSkillUpgradeDefinition,
    skillId: string,
    metaLevel: number,
    ranks: Record<string, number>
): boolean {
    if (
        node.skillId !== skillId ||
        metaLevel < node.requiredMetaLevel ||
        (ranks[node.id] ?? 0) >= node.maxRank ||
        !areBattleSkillUpgradePrerequisitesMet(node, ranks)
    ) {
        return false;
    }
    return !(node.conflicts ?? []).some((id) => (ranks[id] ?? 0) > 0);
}


export function getNormalAttackRuntimeConfig(
    _metaLevel: number
): NormalAttackRuntimeConfig {
    return getBattleNormalAttackRuntimeConfig({});
}


// 战斗配置只聚合本局实际获得的节点，局外等级不会在这里产生效果。
export function getBattleNormalAttackRuntimeConfig(
    nodeRanks: Record<string, number>
): NormalAttackRuntimeConfig {
    const config: NormalAttackRuntimeConfig = {
        damageMultiplier: 1,
        scatterExtraTargets: 0,
        scatterDamageMultiplier: 0,
        penetrationTargets: 0,
        penetrationDamageMultiplier: 0,
        splitExtraAttacks: 0,
        splitDamageMultiplier: 0,
        splitTracksTargets: false,
        awakeningAttackInterval: 0,
        awakeningMaxTargets: 0,
        awakeningDamageMultiplier: 0
    };

    for (const node of BATTLE_SKILL_UPGRADES) {
        if ((nodeRanks[node.id] ?? 0) <= 0) {
            continue;
        }
        for (const effect of node.effects ?? []) {
            const params = effect.params ?? {};
            if (effect.type === 'multishot') {
                config.scatterExtraTargets = Number(params.extraTargets ?? 0);
                config.scatterDamageMultiplier = Number(
                    params.damageMultiplier ?? 0
                );
            } else if (effect.type === 'penetration') {
                config.penetrationTargets = Number(params.extraTargets ?? 0);
                config.penetrationDamageMultiplier = Number(
                    params.damageMultiplier ?? 0
                );
            } else if (effect.type === 'split') {
                config.splitExtraAttacks = Number(params.extraAttacks ?? 0);
                config.splitDamageMultiplier = Number(
                    params.damageMultiplier ?? 0
                );
            } else if (effect.type === 'tracking') {
                config.splitExtraAttacks = Number(params.extraAttacks ?? 0);
                config.splitDamageMultiplier = Number(
                    params.damageMultiplier ?? 0
                );
                config.splitTracksTargets = true;
            } else if (effect.type === 'awakening') {
                config.awakeningAttackInterval = Number(
                    params.attackInterval ?? 0
                );
                config.awakeningMaxTargets = Number(params.maxTargets ?? 0);
                config.awakeningDamageMultiplier = Number(
                    params.damageMultiplier ?? 0
                );
            }
        }
    }
    return config;
}
