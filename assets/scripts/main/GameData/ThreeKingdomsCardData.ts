import type { StatModifier } from './EffectData';

export const THREE_KINGDOMS_BOND_ID = 'three-kingdoms';

export type ThreeKingdomsRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR' | 'EX';
export type ThreeKingdomsCardRole =
    | 'starter' | 'core' | 'material' | 'evolution' | 'ex';
export type ThreeKingdomsFactionId = 'wei' | 'shu' | 'wu' | 'qun';

export interface ThreeKingdomsResourceEffect {
    gold?: number;
    spiritStones?: number;
    goldPerSecond?: number;
}

export interface ThreeKingdomsCardDefinition {
    id: string;
    name: string;
    description: string;
    rarity: ThreeKingdomsRarity;
    role: ThreeKingdomsCardRole;
    factionId?: ThreeKingdomsFactionId;
    effects: StatModifier[];
    resourceEffect?: ThreeKingdomsResourceEffect;
    consumedByCoreId?: string;
    canBeConsumed: boolean;
    baseWeight: number;
}

export const THREE_KINGDOMS_CONFIG = {
    maxSlots: 10,
    materialsRequiredForUr: 8,
    coreConsumeKillInterval: 200,
    starterGrowthInterval: 30,
    starterAllStatsPerThreeKingdomsCard: 1,
    // TODO_VERIFY_DUPLICATE_DEVOUR_COUNT
    duplicateConsumeCounts: false,
    // TODO_VERIFY_CONSUMED_CARD_STAT_RETENTION
    retainConsumedMaterialStats: false,
    closeMaterialPoolAfterUr: true,
    urRequiredForEx: 3,
    exConsumeKillInterval: 400
} as const;

export const THREE_KINGDOMS_FACTIONS: ReadonlyArray<{
    id: ThreeKingdomsFactionId;
    shortName: string;
    name: string;
    route: string;
}> = [
    { id: 'wei', shortName: '魏', name: '魏国', route: '智力 / 魔法' },
    { id: 'shu', shortName: '蜀', name: '蜀国', route: '敏捷 / 物理' },
    { id: 'wu', shortName: '吴', name: '吴国', route: '力量 / 通用' },
    { id: 'qun', shortName: '群', name: '群雄', route: '攻击 / 通用' }
];

const CORE_IDS: Record<ThreeKingdomsFactionId, string> = {
    wei: 'three-kingdoms-core-wei',
    shu: 'three-kingdoms-core-shu',
    wu: 'three-kingdoms-core-wu',
    qun: 'three-kingdoms-core-qun'
};

const UR_IDS: Record<ThreeKingdomsFactionId, string> = {
    wei: 'three-kingdoms-ur-wei',
    shu: 'three-kingdoms-ur-shu',
    wu: 'three-kingdoms-ur-wu',
    qun: 'three-kingdoms-ur-qun'
};

function describeEffects(effects: StatModifier[]): string {
    const effect = effects[0] ?? {};
    const labels: string[] = [];
    const add = (label: string, value?: number, suffix = ''): void => {
        if (value !== undefined) labels.push(`${label} +${value}${suffix}`);
    };
    add('攻击力', effect.atk);
    add('生命值', effect.hp);
    add('护甲', effect.def);
    add('力量', effect.strength);
    add('敏捷', effect.agility);
    add('智力', effect.intelligence);
    add('全属性', effect.allStats);
    add('攻速', effect.attackSpeedPercent, '%');
    add('技能急速', effect.skillHaste);
    add('物理伤害', effect.physicalDamagePercent, '%');
    add('魔法伤害', effect.magicDamagePercent, '%');
    add('普攻伤害', effect.basicAttackDamagePercent, '%');
    add('多重伤害', effect.multiHitDamagePercent, '%');
    add('弹射伤害', effect.bounceDamagePercent, '%');
    add('技能伤害', effect.skillDamagePercent, '%');
    add('物理暴击', effect.physicalCrit, '%');
    add('魔法暴击', effect.magicCrit, '%');
    add('物理暴伤', effect.physicalCritDamagePercent, '%');
    add('魔法暴伤', effect.magicCritDamagePercent, '%');
    add('格挡', effect.block);
    add('攻击增幅', effect.attackPercent, '%');
    add('力量增幅', effect.strengthPercent, '%');
    add('敏捷增幅', effect.agilityPercent, '%');
    add('智力增幅', effect.intelligencePercent, '%');
    return labels.join(' · ');
}

function material(
    factionId: ThreeKingdomsFactionId,
    idSuffix: string,
    name: string,
    rarity: 'R' | 'SR' | 'SSR',
    effects: StatModifier,
    resourceEffect?: ThreeKingdomsResourceEffect
): ThreeKingdomsCardDefinition {
    const resourceLabels: string[] = [];
    if (resourceEffect?.gold) resourceLabels.push(`金币 +${resourceEffect.gold}`);
    if (resourceEffect?.spiritStones) {
        resourceLabels.push(`木材 +${resourceEffect.spiritStones}`);
    }
    if (resourceEffect?.goldPerSecond) {
        resourceLabels.push(`每秒金币 +${resourceEffect.goldPerSecond}`);
    }
    return {
        id: `three-kingdoms-${factionId}-${idSuffix}`,
        name,
        description: [describeEffects([effects]), ...resourceLabels]
            .filter(Boolean).join(' · '),
        rarity,
        role: 'material',
        factionId,
        effects: [effects],
        resourceEffect,
        consumedByCoreId: CORE_IDS[factionId],
        canBeConsumed: true,
        baseWeight: rarity === 'SSR' ? 45 : rarity === 'SR' ? 75 : 100
    };
}

export const THREE_KINGDOMS_STARTER_CARD: ThreeKingdomsCardDefinition = {
    id: 'three-kingdoms-starter',
    name: '乱世三国',
    description: [
        '攻击力 +50',
        '效果1：将曹操、刘备、孙权、董卓加入卡池',
        '效果2：每30秒，按当前三国卡数量获得等量全属性',
        '效果3：获得3张三国UR后，移除全部三国卡与卡组，将EX吞食天地加入卡牌栏'
    ].join(' · '),
    rarity: 'N',
    role: 'starter',
    effects: [{ atk: 50 }],
    canBeConsumed: true,
    baseWeight: 100
};

export const THREE_KINGDOMS_CORE_CARDS: ThreeKingdomsCardDefinition[] = [
    // TODO_VIDEO_CAOCAO_EFFECT1
    {
        id: CORE_IDS.wei,
        name: '曹操',
        description: '魏国核心 · 每200杀随机吞噬一张曹操以外的当前魏国卡 · 累计吞噬8张后将魏国UR加入卡牌栏 · 开启魏国卡组',
        rarity: 'SSR', role: 'core', factionId: 'wei', effects: [],
        canBeConsumed: true, baseWeight: 70
    },
    // TODO_VIDEO_LIUBEI_EFFECT1
    {
        id: CORE_IDS.shu,
        name: '刘备',
        description: '敏捷 +100 · 蜀国核心 · 每200杀随机吞噬一张刘备以外的当前蜀国卡 · 累计吞噬8张后将蜀国UR加入卡牌栏 · 开启蜀国卡组',
        rarity: 'SSR', role: 'core', factionId: 'shu', effects: [{ agility: 100 }],
        canBeConsumed: true, baseWeight: 70
    },
    // TODO_VIDEO_SUNQUAN_EFFECT1
    {
        id: CORE_IDS.wu,
        name: '孙权',
        description: '吴国核心 · 每200杀随机吞噬一张孙权以外的当前吴国卡 · 累计吞噬8张后将吴国UR加入卡牌栏 · 开启吴国卡组',
        rarity: 'SSR', role: 'core', factionId: 'wu', effects: [],
        canBeConsumed: true, baseWeight: 70
    },
    // TODO_VIDEO_DONGZHUO_EFFECT1
    {
        id: CORE_IDS.qun,
        name: '董卓',
        description: '群雄核心 · 每200杀随机吞噬一张董卓以外的当前群雄卡 · 累计吞噬8张后将群雄UR加入卡牌栏 · 开启群雄卡组',
        rarity: 'SSR', role: 'core', factionId: 'qun', effects: [],
        canBeConsumed: true, baseWeight: 70
    }
];

export const THREE_KINGDOMS_MATERIAL_CARDS: ThreeKingdomsCardDefinition[] = [
    material('wei', 'zhang-liao', '张辽', 'SR', { atk: 100, skillHaste: 5 }),
    material('wei', 'guo-jia', '郭嘉', 'SR', { intelligence: 100, magicDamagePercent: 6 }),
    material('wei', 'si-ma-yi', '夏侯惇', 'SSR', { magicDamagePercent: 5, intelligencePercent: 5, magicCritDamagePercent: 15 }),
    material('wei', 'jia-xu', '贾诩', 'SR', { atk: 95, def: 5 }),
    material('wei', 'xun-yu', '荀彧', 'SR', {}, { gold: 5000, spiritStones: 100 }),
    material('wei', 'zhang-he', '张郃', 'R', { allStats: 40 }),
    material('wei', 'pang-de', '庞德', 'R', { atk: 50, strength: 50 }),
    material('wei', 'xun-you', '荀攸', 'R', { skillDamagePercent: 7 }),
    material('wei', 'xu-chu', '许褚', 'R', { atk: 100 }),
    material('wei', 'xu-huang', '徐晃', 'R', { hp: 300, block: 5 }),

    material('shu', 'zhu-ge-liang', '诸葛亮', 'SR', { intelligence: 100, skillHaste: 10 }),
    material('shu', 'guan-yu', '关羽', 'SR', { strength: 120, physicalDamagePercent: 6 }),
    material('shu', 'zhao-yun', '关平', 'SSR', { atk: 150, agility: 150, physicalDamagePercent: 5 }),
    material('shu', 'ma-chao', '马超', 'SR', { agility: 100, basicAttackDamagePercent: 5 }),
    material('shu', 'zhang-fei', '张飞', 'SR', { atk: 100, strength: 100 }),
    material('shu', 'huang-zhong', '黄忠', 'R', { agility: 10, multiHitDamagePercent: 10 }),
    material('shu', 'fa-zheng', '法正', 'R', { magicDamagePercent: 8 }),
    material('shu', 'jiang-wei', '姜维', 'R', { agility: 10, bounceDamagePercent: 10 }),
    material('shu', 'wei-yan', '魏延', 'R', { atk: 50, physicalDamagePercent: 5 }),
    material('shu', 'pang-tong', '庞统', 'R', { intelligence: 50, skillDamagePercent: 7 }),

    material('wu', 'zhou-yu', '周瑜', 'SR', { allStats: 50, skillDamagePercent: 5 }),
    material('wu', 'lu-su', '鲁肃', 'SR', { intelligence: 100, intelligencePercent: 3 }),
    material('wu', 'sun-ce', '孙坚', 'SSR', { strength: 150, strengthPercent: 10 }),
    material('wu', 'lu-xun', '陆逊', 'SR', { allStats: 50, skillHaste: 5 }),
    material('wu', 'lv-meng', '吕蒙', 'SR', { allStats: 50, magicDamagePercent: 5 }),
    material('wu', 'zhou-tai', '周泰', 'R', { hp: 200, strength: 50, strengthPercent: 2 }),
    material('wu', 'sun-shang-xiang', '孙尚香', 'R', { attackSpeedPercent: 20 }),
    material('wu', 'cheng-pu', '程普', 'R', { hp: 300, def: 5 }),
    material('wu', 'gan-ning', '甘宁', 'R', { strength: 50, physicalDamagePercent: 3 }),
    material('wu', 'tai-shi-ci', '太史慈', 'R', { atk: 75, strength: 50 }),

    material('qun', 'wen-chou', '文丑', 'SR', { atk: 100, physicalCritDamagePercent: 5 }),
    material('qun', 'yuan-shao', '袁绍', 'SR', { allStats: 50 }, { goldPerSecond: 10 }),
    material('qun', 'lv-bu', '华雄', 'SSR', { atk: 300, physicalCrit: 3, physicalCritDamagePercent: 5 }),
    material('qun', 'yan-liang', '颜良', 'SR', { atk: 100, physicalCrit: 3 }),
    material('qun', 'diao-chan', '貂蝉', 'SR', { atk: 100, intelligence: 100, magicDamagePercent: 5 }),
    material('qun', 'zhu-rong', '祝融', 'R', { basicAttackDamagePercent: 4, attackSpeedPercent: 10 }),
    material('qun', 'gong-sun-zan', '公孙瓒', 'R', { attackSpeedPercent: 25 }),
    material('qun', 'zhang-jiao', '张角', 'R', { skillHaste: 8 }),
    material('qun', 'chen-gong', '陈宫', 'R', { skillDamagePercent: 6 }),
    material('qun', 'li-ru', '李儒', 'R', { magicCrit: 3 })
];

export const THREE_KINGDOMS_UR_CARDS: ThreeKingdomsCardDefinition[] = [
    {
        id: UR_IDS.wei,
        name: '谋略·司马懿',
        description: '智力 +200 · 智力增幅 +10% · 魔法伤害 +10% · 每击杀智力 +0.3',
        rarity: 'UR', role: 'evolution', factionId: 'wei',
        effects: [{ intelligence: 200, intelligencePercent: 10, magicDamagePercent: 10 }],
        canBeConsumed: true, baseWeight: 0
    },
    {
        id: UR_IDS.shu,
        name: '武神·赵云',
        description: '敏捷 +200 · 敏捷增幅 +10% · 攻速 +30% · 每击杀敏捷 +0.3',
        rarity: 'UR', role: 'evolution', factionId: 'shu',
        effects: [{ agility: 200, agilityPercent: 10, attackSpeedPercent: 30 }],
        canBeConsumed: true, baseWeight: 0
    },
    {
        id: UR_IDS.wu,
        name: '小霸王·孙策',
        description: '生命值 +500 · 力量 +200 · 力量增幅 +10% · 每击杀力量 +0.3',
        rarity: 'UR', role: 'evolution', factionId: 'wu',
        effects: [{ hp: 500, strength: 200, strengthPercent: 10 }],
        canBeConsumed: true, baseWeight: 0
    },
    {
        id: UR_IDS.qun,
        name: '战神·吕布',
        description: '攻击力 +300 · 攻击增幅 +10% · 物理暴击 +5% · 物理暴伤 +10% · 每击杀攻击 +0.3',
        rarity: 'UR', role: 'evolution', factionId: 'qun',
        effects: [{ atk: 300, attackPercent: 10, physicalCrit: 5, physicalCritDamagePercent: 10 }],
        canBeConsumed: true, baseWeight: 0
    }
];

export const THREE_KINGDOMS_EX_CARD: ThreeKingdomsCardDefinition = {
    id: 'three-kingdoms-ex',
    name: '吞食天地',
    description: '全属性 +500 · 力量/敏捷/智力增幅 +20% · 每 400 击杀随机吞噬一张卡牌',
    rarity: 'EX',
    role: 'ex',
    effects: [{
        allStats: 500,
        strengthPercent: 20,
        agilityPercent: 20,
        intelligencePercent: 20
    }],
    canBeConsumed: false,
    baseWeight: 0
};

export const THREE_KINGDOMS_CARDS: ThreeKingdomsCardDefinition[] = [
    THREE_KINGDOMS_STARTER_CARD,
    ...THREE_KINGDOMS_CORE_CARDS,
    ...THREE_KINGDOMS_MATERIAL_CARDS,
    ...THREE_KINGDOMS_UR_CARDS,
    THREE_KINGDOMS_EX_CARD
];

export function getThreeKingdomsCard(
    cardId: string
): ThreeKingdomsCardDefinition | undefined {
    return THREE_KINGDOMS_CARDS.find((card) => card.id === cardId);
}

export function getThreeKingdomsCoreId(
    factionId: ThreeKingdomsFactionId
): string {
    return CORE_IDS[factionId];
}

export function getThreeKingdomsUrId(
    factionId: ThreeKingdomsFactionId
): string {
    return UR_IDS[factionId];
}
