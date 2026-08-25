import type { EquipmentSlot } from './EquipmentData';


export interface PlayerAttributes {
    hp: number;
    atk: number;
    def: number;
    crit: number;
    power: number;
}

export interface PlayerSkillState {
    skillId: string;
    level: number;
    exp: number;
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
        crit: 5,
        power: 275
    },
    currentBondId: 'tiangong-bond',
    skills: [
        {
            skillId: 'normal-attack',
            level: 1,
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
