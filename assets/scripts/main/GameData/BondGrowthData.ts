import type { StatModifier } from './EffectData';


export type RuntimeBondId = 'combo' | 'merchant';
export type BondCardRarity = 'green' | 'blue' | 'purple' | 'red' | 'rainbow';
export type BondEffectType =
    | 'stat'
    | 'extra-attack'
    | 'extra-effect'
    | 'combo-damage'
    | 'combo-window'
    | 'endless-slash'
    | 'combo-ultimate'
    | 'spirit-gain'
    | 'draw-discount'
    | 'elite-bonus'
    | 'task-bonus'
    | 'refresh-rebate'
    | 'draw-rebate'
    | 'wealth-power';

export interface BondCardPrerequisite {
    cardId: string;
    rank: number;
}

export interface RuntimeBondDefinition {
    id: RuntimeBondId;
    name: string;
    description: string;
    tags: string[];
}

export interface RuntimeBondCardDefinition {
    id: string;
    bondId: RuntimeBondId;
    name: string;
    description: string;
    rarity: BondCardRarity;
    maxRank: number;
    baseWeight: number;
    prerequisites?: BondCardPrerequisite[];
    requiredMaxCombo?: number;
    requiredWealth?: number;
    effectType: BondEffectType;
    effectValues: Record<string, number | boolean>;
    bonus?: StatModifier;
    tags: string[];
}


export const BOND_GROWTH_CONFIG = {
    choiceCount: 3,
    // 前4抽快速启动羁绊方向，之后逐步回归长期成本。
    drawCosts: [20, 30, 40, 50, 65, 80, 95, 110, 130, 150],
    continuedDrawCost: 150,
    refreshCosts: [20, 40, 80, 160],
    continuedRefreshCost: 160,
    normalDropChance: 0.27,
    normalDropMin: 4,
    normalDropMax: 6,
    eliteReward: 45,
    bossReward: 70,
    taskRewards: [60, 85, 110, 160, 235],
    comboBaseWindowSeconds: 1.1,
    corePityWeightPerMiss: 35
} as const;


export const RUNTIME_BOND_DEFINITIONS: RuntimeBondDefinition[] = [
    {
        id: 'combo',
        name: '连击',
        description: '高频攻击、高频触发的战斗羁绊。',
        tags: ['combat', 'frequency']
    },
    {
        id: 'merchant',
        name: '商会',
        description: '前期投资灵石，后期用经济形成滚雪球。',
        tags: ['economy', 'growth']
    }
];


export const RUNTIME_BOND_CARDS: RuntimeBondCardDefinition[] = [
    {
        id: 'combo-gale', bondId: 'combo', name: '疾风',
        description: '攻击速度 +8%', rarity: 'green', maxRank: 3,
        baseWeight: 100, effectType: 'stat', effectValues: {},
        bonus: { attackSpeedPercent: 8 }, tags: ['core', 'speed']
    },
    {
        id: 'combo-pursuit', bondId: 'combo', name: '追击',
        description: '普攻有8%概率追加一次55%伤害攻击',
        rarity: 'green', maxRank: 3, baseWeight: 100,
        effectType: 'extra-attack', effectValues: { chance: 0.08, damage: 0.55 },
        tags: ['core', 'trigger']
    },
    {
        id: 'combo-afterimage', bondId: 'combo', name: '残影',
        description: '追加攻击可以触发穿透与分裂效果',
        rarity: 'blue', maxRank: 1, baseWeight: 75,
        prerequisites: [{ cardId: 'combo-pursuit', rank: 2 }],
        effectType: 'extra-effect', effectValues: { enabled: true },
        tags: ['trigger', 'progression']
    },
    {
        id: 'combo-blade-intent', bondId: 'combo', name: '刀意',
        description: '达到20连击后，每级提高12%伤害',
        rarity: 'green', maxRank: 2, baseWeight: 90,
        effectType: 'combo-damage',
        effectValues: { threshold: 20, damagePerRank: 0.12 },
        tags: ['damage', 'combo']
    },
    {
        id: 'combo-frenzy', bondId: 'combo', name: '狂袭',
        description: '每级延长0.4秒连击保持时间',
        rarity: 'green', maxRank: 2, baseWeight: 85,
        effectType: 'combo-window', effectValues: { secondsPerRank: 0.4 },
        tags: ['utility', 'combo']
    },
    {
        id: 'combo-endless', bondId: 'combo', name: '无尽连斩',
        description: '30连击后每12次攻击发动一次3目标斩击',
        rarity: 'red', maxRank: 1, baseWeight: 55,
        prerequisites: [
            { cardId: 'combo-gale', rank: 2 },
            { cardId: 'combo-pursuit', rank: 2 },
            { cardId: 'combo-blade-intent', rank: 1 }
        ],
        requiredMaxCombo: 30,
        effectType: 'endless-slash',
        effectValues: { threshold: 30, interval: 12, targets: 3, damage: 0.8 },
        tags: ['core', 'red', 'combo']
    },
    {
        id: 'combo-unity', bondId: 'combo', name: '万刃归一',
        description: '50/100/300连击分别发动逐级强化的范围刀光',
        rarity: 'rainbow', maxRank: 1, baseWeight: 24,
        prerequisites: [
            { cardId: 'combo-endless', rank: 1 },
            { cardId: 'combo-afterimage', rank: 1 },
            { cardId: 'combo-frenzy', rank: 1 }
        ],
        requiredMaxCombo: 50,
        effectType: 'combo-ultimate',
        effectValues: { first: 50, second: 100, final: 300 },
        tags: ['core', 'rainbow', 'combo']
    },
    {
        id: 'merchant-small-business', bondId: 'merchant', name: '小本经营',
        description: '灵石获取提高5%', rarity: 'green', maxRank: 3,
        baseWeight: 100, effectType: 'spirit-gain',
        effectValues: { percentPerRank: 5 }, tags: ['core', 'economy']
    },
    {
        id: 'merchant-bargain', bondId: 'merchant', name: '讨价还价',
        description: '羁绊抽卡费用降低3%', rarity: 'green', maxRank: 3,
        baseWeight: 100, effectType: 'draw-discount',
        effectValues: { percentPerRank: 3 }, tags: ['core', 'economy']
    },
    {
        id: 'merchant-bounty', bondId: 'merchant', name: '赏金契约',
        description: '精英怪额外掉落4灵石', rarity: 'green', maxRank: 3,
        baseWeight: 90, effectType: 'elite-bonus',
        effectValues: { amountPerRank: 4 }, tags: ['economy', 'elite']
    },
    {
        id: 'merchant-investment', bondId: 'merchant', name: '任务投资',
        description: '任务完成额外获得5灵石', rarity: 'green', maxRank: 3,
        baseWeight: 90, effectType: 'task-bonus',
        effectValues: { amountPerRank: 5 }, tags: ['economy', 'task']
    },
    {
        id: 'merchant-rebate', bondId: 'merchant', name: '回扣',
        description: '刷新时有30%概率返还一半费用',
        rarity: 'blue', maxRank: 1, baseWeight: 70,
        prerequisites: [{ cardId: 'merchant-bargain', rank: 1 }],
        effectType: 'refresh-rebate',
        effectValues: { chance: 0.3, refundPercent: 50 },
        tags: ['economy', 'refresh']
    },
    {
        id: 'merchant-profit', bondId: 'merchant', name: '一本万利',
        description: '抽卡有25%概率返还30%费用',
        rarity: 'red', maxRank: 1, baseWeight: 52,
        prerequisites: [
            { cardId: 'merchant-small-business', rank: 2 },
            { cardId: 'merchant-bargain', rank: 2 },
            { cardId: 'merchant-investment', rank: 1 }
        ],
        requiredWealth: 600,
        effectType: 'draw-rebate',
        effectValues: { chance: 0.25, refundPercent: 30 },
        tags: ['core', 'red', 'economy']
    },
    {
        id: 'merchant-rich', bondId: 'merchant', name: '富可敌国',
        description: '累计财富达到阶段阈值时提高战斗伤害',
        rarity: 'rainbow', maxRank: 1, baseWeight: 22,
        prerequisites: [
            { cardId: 'merchant-profit', rank: 1 },
            { cardId: 'merchant-bounty', rank: 2 },
            { cardId: 'merchant-rebate', rank: 1 }
        ],
        requiredWealth: 1400,
        effectType: 'wealth-power',
        effectValues: { first: 700, second: 1400, third: 2600 },
        tags: ['core', 'rainbow', 'economy']
    }
];
