import type { StatModifier } from './EffectData';


export type SkillEffectType =
    | 'normal-damage'
    | 'normal-speed'
    | 'scatter'
    | 'combo'
    | 'penetration'
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
    comboAttackInterval: number;
    comboDamageMultiplier: number;
    penetrationTargets: number;
    penetrationDamageMultiplier: number;
    awakeningAttackInterval: number;
    awakeningMaxTargets: number;
    awakeningDamageMultiplier: number;
}

export interface BattleSkillUpgradeDefinition {
    id: string;
    name: string;
    description: string;
    bonus: StatModifier;
}


export const NORMAL_ATTACK_SKILL_ID = 'normal-attack';

export const SKILL_FRAGMENT_SHOP_CONFIG = {
    drawCostGold: 30,
    drawMinFragments: 2,
    drawMaxFragments: 5
} as const;

// 局内技能选卡只提供本局临时强化，不改变永久技能等级或碎片。
export const BATTLE_SKILL_UPGRADES: BattleSkillUpgradeDefinition[] = [
    {
        id: 'skill-power',
        name: '技能力量',
        description: '本局普攻及技能伤害 +12%',
        bonus: { skillDamagePercent: 12 }
    },
    {
        id: 'skill-haste',
        name: '技能急速',
        description: '本局攻击速度 +8%',
        bonus: { attackSpeedPercent: 8 }
    },
    {
        id: 'skill-focus',
        name: '技能凝神',
        description: '本局暴击率 +3%',
        bonus: { crit: 3 }
    },
    {
        id: 'skill-fatal',
        name: '技能致命',
        description: '本局暴击伤害 +12%',
        bonus: { critDamagePercent: 12 }
    }
];


// fragmentsRequired 表示从上一级升到本级的消耗；Lv1 无消耗。
// 机制和数值均配置在这里，BattleSystem 只执行聚合后的 Runtime 配置。
export const SKILL_DEFINITIONS: SkillDefinition[] = [
    {
        skillId: NORMAL_ATTACK_SKILL_ID,
        skillName: '普攻',
        description: '局外永久技能，进入战斗后继承全部已解锁效果。',
        level: 1,
        maxLevel: 10,
        levelEffects: [
            {
                level: 1,
                fragmentsRequired: 0,
                effect: {},
                effects: [],
                description: '普通攻击：100%伤害，同时攻击1个目标'
            },
            {
                level: 2,
                fragmentsRequired: 5,
                effect: {},
                effects: [{ type: 'normal-damage', value: 0.1 }],
                description: '强化 I：普攻伤害 +10%'
            },
            {
                level: 3,
                fragmentsRequired: 10,
                effect: {},
                effects: [{
                    type: 'scatter',
                    params: { extraTargets: 1, damageMultiplier: 0.7 }
                }],
                description: '散射 I：额外攻击1个目标，造成70%伤害'
            },
            {
                level: 4,
                fragmentsRequired: 15,
                effect: { attackSpeedPercent: 10 },
                effects: [{ type: 'normal-speed', value: 0.1 }],
                description: '急速 I：攻击速度 +10%'
            },
            {
                level: 5,
                fragmentsRequired: 25,
                effect: {},
                effects: [{
                    type: 'combo',
                    params: { attackInterval: 5, damageMultiplier: 0.7 }
                }],
                description: '连击：每5次正常普攻追加1次70%伤害攻击'
            },
            {
                level: 6,
                fragmentsRequired: 35,
                effect: {},
                effects: [{ type: 'normal-damage', value: 0.15 }],
                description: '强化 II：普攻伤害额外 +15%'
            },
            {
                level: 7,
                fragmentsRequired: 50,
                effect: {},
                effects: [{
                    type: 'penetration',
                    params: { extraTargets: 1, damageMultiplier: 0.6 }
                }],
                description: '穿透：每条弹道额外穿透1个目标，造成60%伤害'
            },
            {
                level: 8,
                fragmentsRequired: 70,
                effect: { attackSpeedPercent: 15 },
                effects: [{ type: 'normal-speed', value: 0.15 }],
                description: '急速 II：攻击速度额外 +15%'
            },
            {
                level: 9,
                fragmentsRequired: 90,
                effect: { crit: 8, critDamagePercent: 20 },
                effects: [{
                    type: 'normal-crit',
                    params: { critRate: 8, critDamagePercent: 20 }
                }],
                description: '致命：暴击率 +8%，暴击伤害 +20%'
            },
            {
                level: 10,
                fragmentsRequired: 150,
                effect: {},
                effects: [{
                    type: 'awakening',
                    params: {
                        attackInterval: 10,
                        maxTargets: 5,
                        damageMultiplier: 1.5
                    }
                }],
                description: '火力全开：每10次正常普攻后发动最多5目标的150%强化齐射'
            }
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


export function getNormalAttackRuntimeConfig(
    level: number
): NormalAttackRuntimeConfig {
    const config: NormalAttackRuntimeConfig = {
        damageMultiplier: 1,
        scatterExtraTargets: 0,
        scatterDamageMultiplier: 0,
        comboAttackInterval: 0,
        comboDamageMultiplier: 0,
        penetrationTargets: 0,
        penetrationDamageMultiplier: 0,
        awakeningAttackInterval: 0,
        awakeningMaxTargets: 0,
        awakeningDamageMultiplier: 0
    };
    const definition = getSkillDefinition(NORMAL_ATTACK_SKILL_ID);
    const unlockedLevels = definition?.levelEffects.filter((item) => {
        return item.level <= Math.max(1, Math.min(level, definition.maxLevel));
    }) ?? [];

    for (const levelDefinition of unlockedLevels) {
        for (const effect of levelDefinition.effects) {
            const params = effect.params ?? {};
            if (effect.type === 'normal-damage') {
                config.damageMultiplier += effect.value ?? 0;
            } else if (effect.type === 'scatter') {
                config.scatterExtraTargets = Number(params.extraTargets ?? 0);
                config.scatterDamageMultiplier = Number(
                    params.damageMultiplier ?? 0
                );
            } else if (effect.type === 'combo') {
                config.comboAttackInterval = Number(params.attackInterval ?? 0);
                config.comboDamageMultiplier = Number(
                    params.damageMultiplier ?? 0
                );
            } else if (effect.type === 'penetration') {
                config.penetrationTargets = Number(params.extraTargets ?? 0);
                config.penetrationDamageMultiplier = Number(
                    params.damageMultiplier ?? 0
                );
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
