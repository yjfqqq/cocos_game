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

export function addPlayerExp(amount: number): number {

    if (amount <= 0) {
        return 0;
    }

    playerData.exp += amount;
    let levelsGained = 0;

    while (
        playerData.exp >= playerData.expToNextLevel
    ) {

        playerData.exp -= playerData.expToNextLevel;

        playerData.level++;
        levelsGained++;

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

    return levelsGained;
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
// 消耗金币
//
// 商店等系统统一通过此方法扣除金币，避免出现负数。
// =====================================================

export function spendGold(amount: number): boolean {

    if (amount <= 0 || playerData.gold < amount) {
        return false;
    }

    playerData.gold -= amount;

    return true;
}


// =====================================================
// 增加永久属性
//
// 神器、装备等成长系统统一通过此方法改变玩家属性，
// 并在一次修改后重新计算战力。
// =====================================================

export function addPlayerStats(
    hp: number,
    atk: number,
    def: number,
    crit: number
): void {

    playerData.hp += Math.max(0, hp);
    playerData.atk += Math.max(0, atk);
    playerData.def += Math.max(0, def);
    playerData.crit += Math.max(0, crit);

    updatePlayerPower();
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
