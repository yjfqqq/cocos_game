export type BattleTaskKind = 'kill' | 'vanguard-boss' | 'final-battle';

export interface BattleTaskConfig {
    id: number;
    title: string;
    kind: BattleTaskKind;
    killTarget: number;
    eliteKillTarget: number;
    targetOnScreen: number;
    hardCap: number;
    spawnBatchSize: number;
    normalExpMultiplier: number;
    taskExpReward: number;
    eliteSpawnKillThresholds: number[];
    supportMonsterLimit?: number;
    bossHpMultiplier?: number;
    bossAttackMultiplier?: number;
    bossExpReward?: number;
    transitionHealPercent?: number;
}


// 第一关三国构筑配置：稳定目标共 2150 杀，保证三名主公在前期到手后
// 有足够击杀并行完成 8 次 × 200 杀吞噬；高同屏配合多目标普攻控制时长。
export const FIRST_STAGE_TASKS: BattleTaskConfig[] = [
    {
        id: 1,
        title: '清剿魔物',
        kind: 'kill',
        killTarget: 250,
        eliteKillTarget: 0,
        targetOnScreen: 24,
        hardCap: 36,
        spawnBatchSize: 8,
        normalExpMultiplier: 0.2,
        taskExpReward: 50,
        eliteSpawnKillThresholds: []
    },
    {
        id: 2,
        title: '精英来袭',
        kind: 'kill',
        killTarget: 400,
        eliteKillTarget: 3,
        targetOnScreen: 34,
        hardCap: 50,
        spawnBatchSize: 10,
        normalExpMultiplier: 0.2,
        taskExpReward: 250,
        eliteSpawnKillThresholds: [80, 200, 320]
    },
    {
        id: 3,
        title: '兽潮',
        kind: 'kill',
        killTarget: 500,
        eliteKillTarget: 0,
        targetOnScreen: 50,
        hardCap: 72,
        spawnBatchSize: 14,
        normalExpMultiplier: 0.2,
        taskExpReward: 0,
        eliteSpawnKillThresholds: [100, 220, 350, 450]
    },
    {
        id: 4,
        title: '先锋首领',
        kind: 'vanguard-boss',
        killTarget: 0,
        eliteKillTarget: 0,
        targetOnScreen: 40,
        hardCap: 60,
        spawnBatchSize: 12,
        normalExpMultiplier: 0.2,
        taskExpReward: 1000,
        eliteSpawnKillThresholds: [],
        supportMonsterLimit: 300,
        bossHpMultiplier: 1.8,
        bossAttackMultiplier: 0.45,
        bossExpReward: 300
    },
    {
        id: 5,
        title: '最终决战',
        kind: 'final-battle',
        killTarget: 1000,
        eliteKillTarget: 0,
        targetOnScreen: 70,
        hardCap: 100,
        spawnBatchSize: 18,
        normalExpMultiplier: 0.2,
        taskExpReward: 205,
        eliteSpawnKillThresholds: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        bossHpMultiplier: 3,
        bossAttackMultiplier: 0.3,
        bossExpReward: 0,
        transitionHealPercent: 0.5
    }
];


export function getFirstStageTask(taskId: number): BattleTaskConfig {
    return FIRST_STAGE_TASKS[
        Math.max(0, Math.min(FIRST_STAGE_TASKS.length - 1, taskId - 1))
    ];
}
