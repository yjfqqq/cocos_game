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


// 第一关 V2 测试配置。等级区间是数据观察目标，不是任务完成条件。
export const FIRST_STAGE_TASKS: BattleTaskConfig[] = [
    {
        id: 1,
        title: '清剿魔物',
        kind: 'kill',
        killTarget: 60,
        eliteKillTarget: 0,
        targetOnScreen: 12,
        hardCap: 20,
        spawnBatchSize: 4,
        normalExpMultiplier: 1,
        taskExpReward: 50,
        eliteSpawnKillThresholds: []
    },
    {
        id: 2,
        title: '精英来袭',
        kind: 'kill',
        killTarget: 100,
        eliteKillTarget: 2,
        targetOnScreen: 20,
        hardCap: 32,
        spawnBatchSize: 5,
        normalExpMultiplier: 0.5,
        taskExpReward: 250,
        eliteSpawnKillThresholds: [15, 55]
    },
    {
        id: 3,
        title: '兽潮',
        kind: 'kill',
        killTarget: 180,
        eliteKillTarget: 0,
        targetOnScreen: 34,
        hardCap: 50,
        spawnBatchSize: 7,
        normalExpMultiplier: 1,
        taskExpReward: 0,
        eliteSpawnKillThresholds: [45, 110, 160]
    },
    {
        id: 4,
        title: '先锋首领',
        kind: 'vanguard-boss',
        killTarget: 0,
        eliteKillTarget: 0,
        targetOnScreen: 28,
        hardCap: 46,
        spawnBatchSize: 6,
        normalExpMultiplier: 0.75,
        taskExpReward: 1000,
        eliteSpawnKillThresholds: [],
        supportMonsterLimit: 60,
        bossHpMultiplier: 1.8,
        bossAttackMultiplier: 0.45,
        bossExpReward: 300
    },
    {
        id: 5,
        title: '最终决战',
        kind: 'final-battle',
        killTarget: 250,
        eliteKillTarget: 0,
        targetOnScreen: 55,
        hardCap: 80,
        spawnBatchSize: 10,
        normalExpMultiplier: 0.6,
        taskExpReward: 205,
        eliteSpawnKillThresholds: [40, 90, 140, 190, 230],
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
