import { BATTLE_BALANCE } from '../BattleBalance';


export interface EliteBattleConfig {
    hpMultiplier: number;
    attackMultiplier: number;
    defenseBonus: number;
    expReward: number;
    goldReward: number;
    skillExpReward: number;
}

export const BATTLE_PACING = {
    totalDurationSeconds: 5 * 60,
    waveDurationSeconds: 30,
    spawnIntervalSeconds: 5,
    eliteSpawnSeconds: [90, 210],
    bossSpawnSecond: 270,
    normalSkillExpReward: 1,
    bossSkillExpReward: 30,
    elite: {
        hpMultiplier: 4.5,
        attackMultiplier: 1.6,
        defenseBonus: 2,
        expReward: 25,
        goldReward: 10,
        skillExpReward: 15
    } as EliteBattleConfig
} as const;


export function getBattleWaveCount(): number {
    return Math.ceil(
        BATTLE_PACING.totalDurationSeconds /
        BATTLE_PACING.waveDurationSeconds
    );
}


export function getWaveAtSecond(second: number): number {
    return Math.min(
        getBattleWaveCount(),
        Math.floor(Math.max(0, second) / BATTLE_PACING.waveDurationSeconds) + 1
    );
}


export function getSpawnPackCountPerWave(): number {
    return Math.floor(
        BATTLE_PACING.waveDurationSeconds /
        BATTLE_PACING.spawnIntervalSeconds
    );
}


export function getNormalEnemyCountForWave(wave: number): number {
    const configuredCount = BATTLE_BALANCE.waveEnemyCounts[wave - 1] ?? 0;
    const bossWave = getWaveAtSecond(BATTLE_PACING.bossSpawnSecond);
    return wave === bossWave
        ? Math.max(0, configuredCount - 1)
        : configuredCount;
}


export function getNormalPackSize(wave: number, packIndex: number): number {
    const total = getNormalEnemyCountForWave(wave);
    const packCount = getSpawnPackCountPerWave();
    const baseSize = Math.floor(total / packCount);
    const remainder = total % packCount;
    const patternIndex = packIndex % packCount;
    return baseSize + (patternIndex < remainder ? 1 : 0);
}


export function getNormalPackStartIndex(
    wave: number,
    packIndex: number
): number {
    let startIndex = 0;
    for (let index = 0; index < packIndex; index++) {
        startIndex += getNormalPackSize(wave, index);
    }
    return startIndex;
}
