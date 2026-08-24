export interface WaveComposition {
    total: number;
    melee: number;
    ranged: number;
}


// 单局节奏集中配置：调整这一处即可控制怪量、升级速度和多目标成长。
export const BATTLE_BALANCE = {
    waveEnemyCounts: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65],
    meleeRatio: 0.8,
    normalEnemyExp: 5,
    normalEnemyGold: 1,
    bossExp: 100,
    bossGold: 50,
    initialRunLevelExp: 20,
    runLevelExpGrowth: 5,
    maxRunLevelExp: 50,
    basicCardOfferEvery: 4,
    baseTargetCount: 3,
    levelsPerExtraTarget: 4,
    maxTargetCount: 10
} as const;


export function getWaveComposition(wave: number): WaveComposition {

    const total = BATTLE_BALANCE.waveEnemyCounts[wave - 1] ?? 0;
    const melee = Math.round(total * BATTLE_BALANCE.meleeRatio);

    return {
        total,
        melee,
        ranged: total - melee
    };
}
