import type { StatModifier } from './EffectData';


export interface SkillLevelEffect {
    level: number;
    effect: StatModifier;
    description?: string;
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


export const NORMAL_ATTACK_SKILL_ID = 'normal-attack';


// 当前版本只有“普攻”一个技能。天宫、战神、雷部、天王等
// 原“流派”内容属于羁绊系统，不再伪装成技能定义。
export const SKILL_DEFINITIONS: SkillDefinition[] = [
    {
        skillId: NORMAL_ATTACK_SKILL_ID,
        skillName: '普攻',
        description: '基础自动攻击，本局必定携带。',
        level: 1,
        maxLevel: 5,
        levelEffects: [
            { level: 1, effect: {}, description: '基础自动攻击' },
            {
                level: 2,
                effect: { attackPercent: 10 },
                description: '攻击 +10%'
            },
            {
                level: 3,
                effect: { attackSpeedPercent: 10 },
                description: '攻击速度 +10%'
            },
            {
                level: 4,
                effect: { attackPercent: 15 },
                description: '攻击 +15%'
            },
            {
                level: 5,
                effect: { crit: 5, critDamagePercent: 20 },
                description: '暴击 +5%，暴击伤害 +20%'
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
