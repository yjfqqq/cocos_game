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

export const playerData: PlayerData = {
    name: '玩家',

    level: 1,
    exp: 0,
    expToNextLevel: 100,

    hp: 100,
    atk: 10,
    def: 5,
    crit: 5,

    power: 0,

    faction: '天宫',
    realm: '炼气期',

    gold: 0,
    diamond: 0
};
// 初始化战力
updatePlayerPower();

// =====================================================
// 增加经验
// =====================================================

export function addPlayerExp(amount: number) {

    if (amount <= 0) {
        return;
    }

    playerData.exp += amount;

    while (
        playerData.exp >= playerData.expToNextLevel
    ) {

        playerData.exp -= playerData.expToNextLevel;

        playerData.level++;

        playerData.expToNextLevel =
            100 + (playerData.level - 1) * 50;

        playerData.hp += 20;
        playerData.atk += 5;
        playerData.def += 2;

        updatePlayerPower();

        console.log(
            '玩家升级！',
            playerData.level
        );
    }

    updatePlayerPower();
}


// =====================================================
// 增加金币
// =====================================================

export function addGold(amount: number) {

    if (amount <= 0) {
        return;
    }

    playerData.gold += amount;
}


// =====================================================
// 计算战力
// =====================================================

export function updatePlayerPower() {

    playerData.power =
        playerData.hp +
        playerData.atk * 10 +
        playerData.def * 5 +
        playerData.crit * 10;
}