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


// 旧类型名暂时保留兼容；产品概念中的 Faction 已统一显示为“羁绊”。
// 天宫是顶层羁绊，战神、雷部、天王是其三条成长分支。
export const FACTION_DEFINITIONS: FactionDefinition[] = [
    {
        id: 'tiangong',
        name: '天宫',
        description: '收集三部神将，共筑仙庭。',
        startSkill: 'normal-attack',
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
