export interface WaveComposition {
    total: number;
    melee: number;
    ranged: number;
    enhanced: number;
}

export interface MonsterGrowthContext {
    playerPower: number;
    challengeRound: number;
    playerAttack?: number;
    playerCrit?: number;
    playerCritDamageMultiplier?: number;
}

export interface MonsterGrowthScale {
    hpMultiplier: number;
    attackMultiplier: number;
    defenseBonus: number;
    level: number;
    expectedPlayerHit: number;
    targetHitsToDefeat: number;
}


// 第一关战斗数值集中配置。任务结构位于 BattleTaskData；
// 这里不允许根据玩家战力反向提高怪物属性。
export const BATTLE_BALANCE = {
    waveEnemyCounts: [30, 36, 42, 48, 58, 70, 80, 90, 98, 108],
    meleeRatio: 0.5,
    rangedRatio: 0.3,
    enhancedRatio: 0.2,
    normalEnemyExp: 5,
    normalEnemyGold: 1,
    normalBaseHp: 5,
    normalHpPerWave: 3,
    normalBaseDefense: 0,
    normalDefenseWaveInterval: 3,
    meleeBaseAttack: 2,
    meleeAttackPerWave: 0.3,
    rangedBaseAttack: 3,
    rangedAttackPerWave: 0.4,
    bossExp: 100,
    bossGold: 50,
    bossBaseHp: 500,
    bossHpPerWave: 25,
    bossBaseDefense: 4,
    bossDefensePerWave: 0.8,
    bossBaseAttack: 10,
    bossAttackPerWave: 0.8,
    maxRunLevel: 50,
    runLevelExpTable: [
        50, 60, 70, 80, 90, 105, 120, 140, 160, 190,
        220, 250, 285, 320, 360, 400, 445, 490, 540, 600,
        660, 725, 795, 870, 950, 1035, 1125, 1220, 1320, 1430,
        1550, 1680, 1820, 1970, 2130, 2300, 2480, 2670, 2870, 3100,
        3350, 3620, 3910, 4220, 4550, 4900, 5280, 5680, 6100
    ],
    bondChoiceLevelInterval: 2,
    bondChoiceCount: 4,
    freeRefreshesPerRun: 2,
    basicCardOfferEvery: 4,
    baseTargetCount: 1,
    levelsPerExtraTarget: 4,
    maxTargetCount: 1,

    // 每 10 只按 5 近战、3 远程、2 强化交错生成；
    // 两只强化怪分别采用近战和远程行为。
    enemyMixPattern: [
        'melee',
        'ranged',
        'enhanced-melee',
        'melee',
        'melee',
        'ranged',
        'enhanced-ranged',
        'melee',
        'ranged',
        'melee'
    ],
    enhancedHpMultiplier: 1.6,
    enhancedMeleeAttackMultiplier: 1.4,
    enhancedRangedAttackMultiplier: 1.12,
    enhancedDefenseBonus: 1,
    enhancedExpMultiplier: 2,
    enhancedGoldMultiplier: 3,
    enhancedSkillExpMultiplier: 2,
    enhancedHitsMultiplier: 1.35,
    enhancedMoveSpeedMultiplier: 0.92,

    // 固定关卡成长：仅由任务阶段决定，不读取玩家战力或挑战轮次。
    monsterReferencePlayerPower: 275,
    monsterHpGrowthPerWave: 0.16,
    monsterAttackGrowthPerWave: 0.1,
    monsterDefenseGrowthPerWave: 0.5,
    eliteHitsMultiplier: 2.5,
    bossHitsMultiplier: 6,

    // 战场坐标以 EnemyField 中心为原点。怪物从右侧入场，
    // 近战推进到主角身边，远程在剩余约三分之二距离处停下。
    monsterSpawnX: 510,
    monsterVisibleRightX: 455,
    meleeAttackX: -465,
    rangedAttackX: 175,
    monsterLaneYs: [-120, -72, -24, 24, 72, 120],
    monsterSpawnSpacingX: 32,
    monsterQueueSpacingX: 64,
    monsterMovementTick: 0.05,
    meleeMoveSpeed: 88,
    rangedMoveSpeed: 78,
    eliteMoveSpeed: 72,
    bossMoveSpeed: 52,
    monsterMoveSpeedGrowthPerWave: 0.035,
    monsterMoveSpeedGrowthPerRound: 0.08,
    maxMonsterMoveSpeedMultiplier: 1.65
} as const;


export const DEFAULT_MONSTER_GROWTH_CONTEXT: MonsterGrowthContext = {
    playerPower: BATTLE_BALANCE.monsterReferencePlayerPower,
    challengeRound: 1,
    playerAttack: 10,
    playerCrit: 5,
    playerCritDamageMultiplier: 1.5
};


// 怪物倍率只读取固定任务阶段。context 参数仅为兼容旧工厂调用保留，
// 不参与生命、攻击或防御计算。
export function getMonsterGrowthScale(
    wave: number,
    _context: MonsterGrowthContext = DEFAULT_MONSTER_GROWTH_CONTEXT
): MonsterGrowthScale {
    const safeWave = Number.isFinite(wave)
        ? Math.max(1, Math.floor(wave))
        : 1;

    return {
        hpMultiplier: 1 +
            (safeWave - 1) * BATTLE_BALANCE.monsterHpGrowthPerWave,
        attackMultiplier: 1 +
            (safeWave - 1) * BATTLE_BALANCE.monsterAttackGrowthPerWave,
        defenseBonus: Math.floor(
            (safeWave - 1) * BATTLE_BALANCE.monsterDefenseGrowthPerWave
        ),
        level: safeWave,
        expectedPlayerHit: 0,
        targetHitsToDefeat: 0
    };
}


export function getWaveComposition(wave: number): WaveComposition {

    const total = BATTLE_BALANCE.waveEnemyCounts[wave - 1] ?? 0;
    const enhanced = Math.round(total * BATTLE_BALANCE.enhancedRatio);
    const normalTotal = Math.max(0, total - enhanced);
    const normalRatio =
        BATTLE_BALANCE.meleeRatio + BATTLE_BALANCE.rangedRatio;
    const melee = normalRatio > 0
        ? Math.round(
            normalTotal * BATTLE_BALANCE.meleeRatio / normalRatio
        )
        : 0;
    const ranged = Math.max(0, normalTotal - melee);

    return {
        total,
        melee,
        ranged,
        enhanced
    };
}
