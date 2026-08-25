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


// 单局节奏集中配置：调整这一处即可控制怪量、升级速度和攻击目标数。
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
    meleeBaseAttack: 3.5,
    meleeAttackPerWave: 0.5,
    rangedBaseAttack: 5,
    rangedAttackPerWave: 0.6,
    bossExp: 100,
    bossGold: 50,
    bossBaseHp: 500,
    bossHpPerWave: 25,
    bossBaseDefense: 6,
    bossDefensePerWave: 1.2,
    bossBaseAttack: 15,
    bossAttackPerWave: 1.2,
    initialRunLevelExp: 30,
    runLevelExpGrowth: 8,
    maxRunLevelExp: 120,
    maxRunLevel: 50,
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

    // 怪物会追随玩家的实际战力成长，但只继承部分成长幅度，
    // 因此装备、神器和局内构筑依然能带来明确的变强体验。
    monsterReferencePlayerPower: 275,
    monsterHpGrowthPerPlayerPower: 0.55,
    monsterAttackGrowthPerPlayerPower: 0.25,
    monsterDefenseGrowthPerPlayerPower: 1.25,
    monsterHpGrowthPerWave: 0.07,
    monsterHpGrowthPerRound: 0.55,
    monsterAttackGrowthPerRound: 0.25,
    monsterDefenseGrowthPerRound: 2,

    // 前两波允许快速清怪发育；第三波起逐步提高最低承伤次数，
    // 防止后期攻击暴涨后仍然一刀清怪。
    monsterBaseHitsToDefeat: 0.85,
    monsterHitsGrowthStartWave: 2,
    monsterHitsGrowthPerWave: 0.45,
    monsterHitsGrowthPerRound: 1.25,
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


// 将玩家战力换算为怪物的部分追赶倍率。波次基础成长仍由怪物工厂负责，
// 这里额外覆盖玩家属性成长和重复挑战带来的难度提升。
export function getMonsterGrowthScale(
    wave: number,
    context: MonsterGrowthContext = DEFAULT_MONSTER_GROWTH_CONTEXT
): MonsterGrowthScale {

    const safePlayerPower = Number.isFinite(context.playerPower)
        ? Math.max(
            BATTLE_BALANCE.monsterReferencePlayerPower,
            context.playerPower
        )
        : BATTLE_BALANCE.monsterReferencePlayerPower;
    const playerGrowth =
        safePlayerPower / BATTLE_BALANCE.monsterReferencePlayerPower - 1;
    const completedRounds = Number.isFinite(context.challengeRound)
        ? Math.max(0, Math.floor(context.challengeRound) - 1)
        : 0;
    const safeWave = Number.isFinite(wave)
        ? Math.max(1, Math.floor(wave))
        : 1;
    const playerAttack = Number.isFinite(context.playerAttack)
        ? Math.max(1, context.playerAttack ?? 1)
        : DEFAULT_MONSTER_GROWTH_CONTEXT.playerAttack ?? 10;
    const playerCrit = Number.isFinite(context.playerCrit)
        ? Math.min(100, Math.max(0, context.playerCrit ?? 0))
        : DEFAULT_MONSTER_GROWTH_CONTEXT.playerCrit ?? 5;
    const critDamageMultiplier = Number.isFinite(
        context.playerCritDamageMultiplier
    )
        ? Math.max(1, context.playerCritDamageMultiplier ?? 1)
        : DEFAULT_MONSTER_GROWTH_CONTEXT.playerCritDamageMultiplier ?? 1.5;
    const expectedPlayerHit = playerAttack * (
        1 + playerCrit / 100 * (critDamageMultiplier - 1)
    );

    return {
        hpMultiplier: 1 +
            playerGrowth * BATTLE_BALANCE.monsterHpGrowthPerPlayerPower +
            (safeWave - 1) * BATTLE_BALANCE.monsterHpGrowthPerWave +
            completedRounds * BATTLE_BALANCE.monsterHpGrowthPerRound,
        attackMultiplier: 1 +
            playerGrowth * BATTLE_BALANCE.monsterAttackGrowthPerPlayerPower +
            completedRounds * BATTLE_BALANCE.monsterAttackGrowthPerRound,
        defenseBonus: Math.floor(
            playerGrowth * BATTLE_BALANCE.monsterDefenseGrowthPerPlayerPower +
            completedRounds * BATTLE_BALANCE.monsterDefenseGrowthPerRound
        ),
        level: safeWave +
            Math.floor(playerGrowth * 5) +
            completedRounds * BATTLE_BALANCE.waveEnemyCounts.length,
        expectedPlayerHit,
        targetHitsToDefeat:
            BATTLE_BALANCE.monsterBaseHitsToDefeat +
            Math.max(
                0,
                safeWave - BATTLE_BALANCE.monsterHitsGrowthStartWave
            ) * BATTLE_BALANCE.monsterHitsGrowthPerWave +
            completedRounds * BATTLE_BALANCE.monsterHitsGrowthPerRound
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
