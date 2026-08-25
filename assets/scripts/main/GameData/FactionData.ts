import type { StatModifier } from './EffectData';


export type FactionId = string;
export type FactionBranchId = 'zhanshen' | 'leibu' | 'tianwang';

export interface FactionBranchDefinition {
    id: FactionBranchId;
    name: '战神' | '雷部' | '天王';
    cardPool: string[];
    strengtheningSkill: string;
}

export interface FactionDefinition {
    id: FactionId;
    name: string;
    description: string;
    startSkill: string;
    startWeapon: string | null;
    factionCardPool: string[];
    branches: FactionBranchDefinition[];
    ultimateSkill: string;
    passiveEffect?: StatModifier;
}


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


// 当前源码中只有“天宫”一个顶层流派；战神、雷部、天王是其三条成长分支。
export const FACTION_DEFINITIONS: FactionDefinition[] = [
    {
        id: 'tiangong',
        name: '天宫',
        description: '收集三部神将，共筑仙庭。',
        startSkill: 'tiangong-basic-attack',
        startWeapon: null,
        factionCardPool: [
            ...ZHANSHEN_CARD_POOL,
            ...LEIBU_CARD_POOL,
            ...TIANWANG_CARD_POOL
        ],
        branches: [
            {
                id: 'zhanshen',
                name: '战神',
                cardPool: ZHANSHEN_CARD_POOL,
                strengtheningSkill: 'tiangong-zhanshen'
            },
            {
                id: 'leibu',
                name: '雷部',
                cardPool: LEIBU_CARD_POOL,
                strengtheningSkill: 'tiangong-leibu'
            },
            {
                id: 'tianwang',
                name: '天王',
                cardPool: TIANWANG_CARD_POOL,
                strengtheningSkill: 'tiangong-tianwang'
            }
        ],
        ultimateSkill: 'tiangong-rainbow'
    }
];
