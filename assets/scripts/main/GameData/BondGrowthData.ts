export const BOND_GROWTH_CONFIG = {
    choiceCount: 3,
    // 开局可连续完成启动卡与三名主公选择，避免早期击杀无法累计。
    initialSpiritStones: 120,
    drawCosts: [15, 20, 25, 30, 40, 50, 60, 70, 80, 90],
    continuedDrawCost: 100,
    refreshCosts: [10, 20, 40, 80],
    continuedRefreshCost: 80,
    normalDropChance: 0.35,
    normalDropMin: 4,
    normalDropMax: 7,
    eliteReward: 60,
    bossReward: 180,
    taskRewards: [150, 225, 325, 450, 650]
} as const;
