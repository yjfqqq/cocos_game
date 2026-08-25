import {
    FACTION_DEFINITIONS
} from './GameData/FactionData';
import {
    gamePlayerData
} from './GameData/PlayerData';
import {
    PERSISTENT_PLAYER_LEVEL_POLICY,
    PlayerLevelSystem
} from './Systems/PlayerLevelSystem';


// 旧的扁平 PlayerData 接口继续保留。新代码应使用 GameData/PlayerData。
export interface PlayerData {
    name: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    hp: number;
    atk: number;
    def: number;
    crit: number;
    power: number;
    faction: string;
    realm: string;
    gold: number;
    diamond: number;
}


// 兼容视图将旧字段映射到新的嵌套状态，不复制数据，避免迁移期双写。
export const playerData: PlayerData = {
    get name() { return gamePlayerData.name; },
    set name(value) { gamePlayerData.name = value; },

    get level() { return gamePlayerData.playerLevel; },
    set level(value) { gamePlayerData.playerLevel = value; },

    get exp() { return gamePlayerData.playerExp; },
    set exp(value) { gamePlayerData.playerExp = value; },

    get expToNextLevel() { return gamePlayerData.expToNextLevel; },
    set expToNextLevel(value) { gamePlayerData.expToNextLevel = value; },

    get hp() { return gamePlayerData.attributes.hp; },
    set hp(value) { gamePlayerData.attributes.hp = value; },

    get atk() { return gamePlayerData.attributes.atk; },
    set atk(value) { gamePlayerData.attributes.atk = value; },

    get def() { return gamePlayerData.attributes.def; },
    set def(value) { gamePlayerData.attributes.def = value; },

    get crit() { return gamePlayerData.attributes.crit; },
    set crit(value) { gamePlayerData.attributes.crit = value; },

    get power() { return gamePlayerData.attributes.power; },
    set power(value) { gamePlayerData.attributes.power = value; },

    get faction() {
        return FACTION_DEFINITIONS.find((item) => {
            return item.id === gamePlayerData.currentFaction;
        })?.name ?? gamePlayerData.currentFaction;
    },
    set faction(value) {
        gamePlayerData.currentFaction = FACTION_DEFINITIONS.find((item) => {
            return item.id === value || item.name === value;
        })?.id ?? value;
    },

    get realm() { return gamePlayerData.realm; },
    set realm(value) { gamePlayerData.realm = value; },

    get gold() { return gamePlayerData.gold; },
    set gold(value) { gamePlayerData.gold = value; },

    get diamond() { return gamePlayerData.diamond; },
    set diamond(value) { gamePlayerData.diamond = value; }
};


const persistentPlayerLevelSystem = new PlayerLevelSystem(
    gamePlayerData,
    PERSISTENT_PLAYER_LEVEL_POLICY
);


// 旧函数保留为兼容层，升级规则已经迁移到 PlayerLevelSystem。
export function addPlayerExp(amount: number): number {
    return persistentPlayerLevelSystem.addExp(
        amount,
        (level) => console.log('玩家升级！', level)
    ).levelsGained;
}


export function addGold(amount: number): void {
    if (amount > 0) {
        gamePlayerData.gold += amount;
    }
}


export function spendGold(amount: number): boolean {
    if (amount <= 0 || gamePlayerData.gold < amount) {
        return false;
    }

    gamePlayerData.gold -= amount;
    return true;
}


// 神器仍通过旧入口加永久属性；第二阶段可再迁移到专门的永久成长系统。
export function addPlayerStats(
    hp: number,
    atk: number,
    def: number,
    crit: number
): void {
    gamePlayerData.attributes.hp += Math.max(0, hp);
    gamePlayerData.attributes.atk += Math.max(0, atk);
    gamePlayerData.attributes.def += Math.max(0, def);
    gamePlayerData.attributes.crit += Math.max(0, crit);
    updatePlayerPower();
}


export function updatePlayerPower(): void {
    persistentPlayerLevelSystem.recalculatePower();
}


export { gamePlayerData } from './GameData/PlayerData';
export type { PlayerData as GamePlayerData } from './GameData/PlayerData';
