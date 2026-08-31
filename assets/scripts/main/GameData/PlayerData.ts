import type { EquipmentSlot } from './EquipmentData';


export interface PlayerAttributes {
    hp: number;
    atk: number;
    def: number;
    strength: number;
    agility: number;
    intelligence: number;
    crit: number;
    attackSpeed: number;
    skillHaste: number;
    physicalCrit: number;
    magicCrit: number;
    physicalCritDamage: number;
    magicCritDamage: number;
    block: number;
    physicalDamageBonus: number;
    magicDamageBonus: number;
    basicAttackDamageBonus: number;
    skillDamageBonus: number;
    power: number;
}

export interface PlayerSkillState {
    skillId: string;
    level: number;
    fragments: number;
    /** @deprecated 旧技能经验字段，仅保留兼容。 */
    exp?: number;
}

export interface PlayerCardState {
    cardId: string;
    level: number;
}

export type PlayerEquipmentState = Record<EquipmentSlot, string | null>;

// PlayerData 仅保存状态；升级、技能、卡牌、羁绊和装备规则分别由 Systems 处理。
export interface PlayerData {
    name: string;
    playerLevel: number;
    playerExp: number;
    expToNextLevel: number;
    attributes: PlayerAttributes;
    currentBondId: string;
    skills: PlayerSkillState[];
    cards: PlayerCardState[];
    equipment: PlayerEquipmentState;
    realm: string;
    gold: number;
    diamond: number;
}


export const gamePlayerData: PlayerData = {
    name: '玩家',
    playerLevel: 1,
    playerExp: 0,
    expToNextLevel: 100,
    attributes: {
        hp: 100,
        atk: 10,
        def: 5,
        strength: 0,
        agility: 0,
        intelligence: 0,
        crit: 5,
        attackSpeed: 1,
        skillHaste: 0,
        physicalCrit: 0,
        magicCrit: 0,
        physicalCritDamage: 1.5,
        magicCritDamage: 1.5,
        block: 0,
        physicalDamageBonus: 0,
        magicDamageBonus: 0,
        basicAttackDamageBonus: 0,
        skillDamageBonus: 0,
        power: 275
    },
    currentBondId: 'three-kingdoms',
    skills: [
        {
            skillId: 'normal-attack',
            level: 1,
            fragments: 0,
            exp: 0
        }
    ],
    cards: [],
    equipment: {
        weapon: null,
        armor: null,
        accessory: null
    },
    realm: '炼气期',
    gold: 0,
    diamond: 0
};

// 旧存档只包含 hp/atk/def/crit/power；缺失字段在读取时统一补默认值。
export function normalizePlayerAttributes(
    attributes: Partial<PlayerAttributes>
): PlayerAttributes {
    return {
        hp: attributes.hp ?? 100,
        atk: attributes.atk ?? 10,
        def: attributes.def ?? 5,
        strength: attributes.strength ?? 0,
        agility: attributes.agility ?? 0,
        intelligence: attributes.intelligence ?? 0,
        crit: attributes.crit ?? 5,
        attackSpeed: attributes.attackSpeed ?? 1,
        skillHaste: attributes.skillHaste ?? 0,
        physicalCrit: attributes.physicalCrit ?? 0,
        magicCrit: attributes.magicCrit ?? 0,
        physicalCritDamage: attributes.physicalCritDamage ?? 1.5,
        magicCritDamage: attributes.magicCritDamage ?? 1.5,
        block: attributes.block ?? 0,
        physicalDamageBonus: attributes.physicalDamageBonus ?? 0,
        magicDamageBonus: attributes.magicDamageBonus ?? 0,
        basicAttackDamageBonus: attributes.basicAttackDamageBonus ?? 0,
        skillDamageBonus: attributes.skillDamageBonus ?? 0,
        power: attributes.power ?? 0
    };
}


// 旧存档缺少技能数组或普攻记录时按 Lv1 补齐，不覆盖已有培养等级。
export function getOrCreatePlayerSkillState(
    data: PlayerData,
    skillId: string
): PlayerSkillState {
    if (!Array.isArray(data.skills)) {
        data.skills = [];
    }
    let state = data.skills.find((skill) => skill.skillId === skillId);
    if (!state) {
        state = { skillId, level: 1, fragments: 0, exp: 0 };
        data.skills.push(state);
    }
    state.level = Math.max(1, Math.min(10, Math.floor(state.level || 1)));
    state.fragments = Math.max(0, Math.floor(state.fragments || 0));
    return state;
}
