import type { StatModifier } from './EffectData';


export interface SkillLevelEffect {
    level: number;
    effect: StatModifier;
}

export interface SkillDefinition {
    skillId: string;
    skillName: string;
    level: number;
    maxLevel: number;
    levelEffects: SkillLevelEffect[];
    expToNextLevel: number[];
}


// 数值全部来自旧 CardSystem。这里只改变归属，不改变生效结果。
export const SKILL_DEFINITIONS: SkillDefinition[] = [
    {
        skillId: 'tiangong-basic-attack',
        skillName: '天宫御剑',
        level: 1,
        maxLevel: 5,
        levelEffects: [
            { level: 1, effect: {} },
            { level: 2, effect: { attackPercent: 5 } },
            { level: 3, effect: { attackSpeedPercent: 5 } },
            { level: 4, effect: { attackPercent: 10 } },
            {
                level: 5,
                effect: { attackSpeedPercent: 10, crit: 5 }
            }
        ],
        expToNextLevel: [40, 80, 120, 160]
    },
    {
        skillId: 'tiangong-zhanshen',
        skillName: '红色·战神',
        level: 1,
        maxLevel: 1,
        levelEffects: [
            {
                level: 1,
                effect: { attackPercent: 20, crit: 10, critDamagePercent: 30 }
            }
        ],
        expToNextLevel: []
    },
    {
        skillId: 'tiangong-leibu',
        skillName: '红色·雷部',
        level: 1,
        maxLevel: 1,
        levelEffects: [
            {
                level: 1,
                effect: {
                    attackSpeedPercent: 25,
                    attackRangePercent: 20,
                    skillDamagePercent: 20
                }
            }
        ],
        expToNextLevel: []
    },
    {
        skillId: 'tiangong-tianwang',
        skillName: '红色·天王',
        level: 1,
        maxLevel: 1,
        levelEffects: [
            {
                level: 1,
                effect: { hpPercent: 30, defPercent: 25, healthRegenPercent: 50 }
            }
        ],
        expToNextLevel: []
    },
    {
        skillId: 'tiangong-rainbow',
        skillName: '彩色·天宫',
        level: 1,
        maxLevel: 1,
        levelEffects: [
            {
                level: 1,
                effect: {
                    attackPercent: 20,
                    attackSpeedPercent: 20,
                    hpPercent: 20,
                    crit: 10
                }
            }
        ],
        expToNextLevel: []
    }
];
