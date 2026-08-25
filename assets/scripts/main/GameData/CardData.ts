import type { StatModifier } from './EffectData';
import type { FactionBranchId } from './FactionData';


export const NORMAL_CARD = 'NORMAL_CARD' as const;
export const FACTION_CARD = 'FACTION_CARD' as const;
export const LEGEND_CARD = 'LEGEND_CARD' as const;

export type CardType =
    | typeof NORMAL_CARD
    | typeof FACTION_CARD
    | typeof LEGEND_CARD;

export type CardCategory = '基础卡' | '神将卡';
export type GeneralQuality = '绿色' | '蓝色' | '紫色';
export type TiangongBranch = '战神' | '雷部' | '天王';

export interface CardDefinition {
    id: string;
    name: string;
    description: string;
    category: CardCategory;
    type: CardType;
}

export interface NormalCardDefinition extends CardDefinition {
    type: typeof NORMAL_CARD;
    maxLevel: number;
    bonus: StatModifier;
}

export interface FactionCardDefinition extends CardDefinition {
    type: typeof FACTION_CARD;
    factionId: string;
    branchId: FactionBranchId;
    branch: TiangongBranch;
    role: string;
    quality: GeneralQuality;
    requiredKills: number;
}

export interface LegendCardDefinition extends CardDefinition {
    type: typeof LEGEND_CARD;
    effect: StatModifier;
}


// 以下卡牌定义逐项迁移自旧 CardSystem，包含本地尚未提交的槽位说明修订。
export const NORMAL_CARDS: NormalCardDefinition[] = [
    {
        id: 'basic-attack',
        name: '攻击',
        description: '本局攻击 +2，I、II 各占1格，获得 III 后吞噬并释放槽位',
        category: '基础卡',
        type: NORMAL_CARD,
        maxLevel: 3,
        bonus: { atk: 2 }
    },
    {
        id: 'basic-health',
        name: '生命',
        description: '本局生命 +15，I、II 各占1格，获得 III 后吞噬并释放槽位',
        category: '基础卡',
        type: NORMAL_CARD,
        maxLevel: 3,
        bonus: { hp: 15 }
    },
    {
        id: 'basic-critical',
        name: '暴击',
        description: '本局暴击 +1%，I、II 各占1格，获得 III 后吞噬并释放槽位',
        category: '基础卡',
        type: NORMAL_CARD,
        maxLevel: 3,
        bonus: { crit: 1 }
    }
];

export const FACTION_CARDS: FactionCardDefinition[] = [
    { id: 'nezha', name: '哪吒', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'zhanshen', branch: '战神', role: '爆发攻击', quality: '绿色', requiredKills: 10 },
    { id: 'juling', name: '巨灵神', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'zhanshen', branch: '战神', role: '力量型战将', quality: '绿色', requiredKills: 10 },
    { id: 'tianpeng', name: '天蓬元帅', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'zhanshen', branch: '战神', role: '持续输出', quality: '绿色', requiredKills: 10 },
    { id: 'yangjian', name: '杨戬', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'zhanshen', branch: '战神', role: '暴击核心', quality: '蓝色', requiredKills: 30 },
    { id: 'wanglingguan', name: '王灵官', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'zhanshen', branch: '战神', role: '战斗强化', quality: '蓝色', requiredKills: 30 },
    { id: 'zhenwu', name: '真武大帝', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'zhanshen', branch: '战神', role: '战神核心', quality: '紫色', requiredKills: 50 },

    { id: 'leigong', name: '雷公', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'leibu', branch: '雷部', role: '雷电基础', quality: '绿色', requiredKills: 10 },
    { id: 'dianmu', name: '电母', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'leibu', branch: '雷部', role: '雷电强化', quality: '绿色', requiredKills: 10 },
    { id: 'fengbo', name: '风伯', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'leibu', branch: '雷部', role: '范围扩散', quality: '绿色', requiredKills: 10 },
    { id: 'leizhenzi', name: '雷震子', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'leibu', branch: '雷部', role: '雷电爆发', quality: '蓝色', requiredKills: 30 },
    { id: 'wenzhong', name: '闻仲', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'leibu', branch: '雷部', role: '雷法统帅', quality: '蓝色', requiredKills: 30 },
    { id: 'puhuazun', name: '普化尊', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'leibu', branch: '雷部', role: '雷部核心', quality: '紫色', requiredKills: 50 },

    { id: 'zengzhang', name: '增长天王', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'tianwang', branch: '天王', role: '生命强化', quality: '绿色', requiredKills: 10 },
    { id: 'guangmu', name: '广目天王', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'tianwang', branch: '天王', role: '防御强化', quality: '绿色', requiredKills: 10 },
    { id: 'chiguo', name: '持国天王', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'tianwang', branch: '天王', role: '护盾强化', quality: '绿色', requiredKills: 10 },
    { id: 'lijing', name: '李靖', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'tianwang', branch: '天王', role: '统帅防御', quality: '蓝色', requiredKills: 30 },
    { id: 'duowen', name: '多闻天王', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'tianwang', branch: '天王', role: '坚韧提升', quality: '蓝色', requiredKills: 30 },
    { id: 'zhaogongming', name: '赵公明', description: '', category: '神将卡', type: FACTION_CARD, factionId: 'tiangong', branchId: 'tianwang', branch: '天王', role: '天王核心', quality: '紫色', requiredKills: 50 }
];

// 当前版本没有高级卡数据，保留独立卡池以便第二阶段扩展。
export const LEGEND_CARDS: LegendCardDefinition[] = [];

export const ALL_CARDS: CardDefinition[] = [
    ...NORMAL_CARDS,
    ...FACTION_CARDS,
    ...LEGEND_CARDS
];
