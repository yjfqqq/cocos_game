import type { StatModifier } from './EffectData';


export type BondBranchId = 'zhanshen' | 'leibu' | 'tianwang';

export interface BondBranchDefinition {
    id: BondBranchId;
    name: '战神' | '雷部' | '天王';
    cardPool: string[];
    completionBonus: StatModifier;
}

export interface BondDefinition {
    bondId: string;
    bondName: string;
    description: string;
    bondCardPool: string[];
    branches: BondBranchDefinition[];
    ultimateName: string;
    ultimateBonus: StatModifier;
}


export const TIANGONG_BOND_ID = 'tiangong-bond';

// 天宫旧“流派”三分支的合成效果。现在它们属于羁绊，
// 不会再注册为技能或占用4个技能格。
export const TIANGONG_BRANCH_BONUSES: Record<string, StatModifier> = {
    zhanshen: {
        attackPercent: 20,
        crit: 10,
        critDamagePercent: 30
    },
    leibu: {
        attackSpeedPercent: 25,
        attackRangePercent: 20,
        skillDamagePercent: 20
    },
    tianwang: {
        hpPercent: 30,
        defPercent: 25,
        healthRegenPercent: 50
    }
};

export const TIANGONG_ULTIMATE_BONUS: StatModifier = {
    attackPercent: 20,
    attackSpeedPercent: 20,
    hpPercent: 20,
    crit: 10
};

const ZHANSHEN_CARD_POOL = [
    'nezha',
    'juling',
    'tianpeng',
    'yangjian',
    'wanglingguan',
    'zhenwu'
];

const LEIBU_CARD_POOL = [
    'leigong',
    'dianmu',
    'fengbo',
    'leizhenzi',
    'wenzhong',
    'puhuazun'
];

const TIANWANG_CARD_POOL = [
    'zengzhang',
    'guangmu',
    'chiguo',
    'lijing',
    'duowen',
    'zhaogongming'
];


// 原“天宫流派”数据原样迁入羁绊：三条分支各自按绿、蓝、紫
// 依次吞噬，六张全部归位后合成分支，三分支再合成彩色天宫。
export const BOND_DEFINITIONS: BondDefinition[] = [
    {
        bondId: TIANGONG_BOND_ID,
        bondName: '天宫羁绊',
        description: '收集战神、雷部、天王神将，绿蓝紫吞噬共筑天宫。',
        bondCardPool: [
            ...ZHANSHEN_CARD_POOL,
            ...LEIBU_CARD_POOL,
            ...TIANWANG_CARD_POOL
        ],
        branches: [
            {
                id: 'zhanshen',
                name: '战神',
                cardPool: ZHANSHEN_CARD_POOL,
                completionBonus: TIANGONG_BRANCH_BONUSES.zhanshen
            },
            {
                id: 'leibu',
                name: '雷部',
                cardPool: LEIBU_CARD_POOL,
                completionBonus: TIANGONG_BRANCH_BONUSES.leibu
            },
            {
                id: 'tianwang',
                name: '天王',
                cardPool: TIANWANG_CARD_POOL,
                completionBonus: TIANGONG_BRANCH_BONUSES.tianwang
            }
        ],
        ultimateName: '彩色·天宫',
        ultimateBonus: TIANGONG_ULTIMATE_BONUS
    }
];


export function getBondDefinition(
    bondId: string
): BondDefinition | undefined {
    return BOND_DEFINITIONS.find((bond) => bond.bondId === bondId);
}
