import {
    BATTLE_PACING,
    getBattleWaveCount,
    getSpawnPackCountPerWave,
    getWaveAtSecond
} from '../GameData/BattlePacingData';


export type BattlePacingEvent =
    | { type: 'wave-start'; second: number; wave: number }
    | { type: 'spawn-pack'; second: number; wave: number; packIndex: number }
    | { type: 'spawn-elite'; second: number; wave: number }
    | { type: 'spawn-boss'; second: number; wave: number }
    | { type: 'timeline-complete'; second: number; wave: number };


export class BattlePacingSystem {

    private elapsedSeconds = 0;
    private timelineComplete = false;
    private currentWave = 0;
    private readonly nextPackIndexByWave = new Map<number, number>();


    start(): BattlePacingEvent[] {
        this.elapsedSeconds = 0;
        this.timelineComplete = false;
        this.currentWave = 0;
        this.nextPackIndexByWave.clear();
        return this.getEventsAtSecond(0);
    }


    spawnNextPackNow(): BattlePacingEvent[] {

        if (this.timelineComplete) {
            return [];
        }

        const second = Math.floor(this.elapsedSeconds);
        const nextPackIndex = this.nextPackIndexByWave.get(
            this.currentWave
        ) ?? 0;
        if (nextPackIndex < getSpawnPackCountPerWave()) {
            return [this.createNextPackEvent(second, this.currentWave)];
        }

        if (this.currentWave >= getBattleWaveCount()) {
            return [];
        }

        this.currentWave++;
        return [
            {
                type: 'wave-start',
                second,
                wave: this.currentWave
            },
            this.createNextPackEvent(second, this.currentWave)
        ];
    }


    advance(deltaSeconds: number): BattlePacingEvent[] {

        if (deltaSeconds <= 0 || this.timelineComplete) {
            return [];
        }

        const previousSecond = Math.floor(this.elapsedSeconds);
        this.elapsedSeconds = Math.min(
            BATTLE_PACING.totalDurationSeconds,
            this.elapsedSeconds + deltaSeconds
        );
        const currentSecond = Math.floor(this.elapsedSeconds);
        const events: BattlePacingEvent[] = [];

        for (
            let second = previousSecond + 1;
            second <= currentSecond;
            second++
        ) {
            events.push(...this.getEventsAtSecond(second));
        }

        return events;
    }


    getElapsedSeconds(): number {
        return this.elapsedSeconds;
    }


    getRemainingSeconds(): number {
        return Math.max(
            0,
            BATTLE_PACING.totalDurationSeconds - Math.floor(this.elapsedSeconds)
        );
    }


    isComplete(): boolean {
        return this.timelineComplete;
    }


    private getEventsAtSecond(second: number): BattlePacingEvent[] {

        if (second >= BATTLE_PACING.totalDurationSeconds) {
            this.timelineComplete = true;
            return [
                {
                    type: 'timeline-complete',
                    second: BATTLE_PACING.totalDurationSeconds,
                    wave: getBattleWaveCount()
                }
            ];
        }

        const events: BattlePacingEvent[] = [];
        const scheduledWave = getWaveAtSecond(second);

        // 30 秒是最迟进入下一波的保障；如果玩家提前清完本波，
        // spawnNextPackNow 会在同一帧先行推进，时间轴不会再让波次倒退。
        if (scheduledWave > this.currentWave) {
            this.currentWave = scheduledWave;
            events.push({
                type: 'wave-start',
                second,
                wave: this.currentWave
            });
        }

        if (second % BATTLE_PACING.spawnIntervalSeconds === 0) {
            const nextPackIndex = this.nextPackIndexByWave.get(
                this.currentWave
            ) ?? 0;
            if (nextPackIndex < getSpawnPackCountPerWave()) {
                events.push(this.createNextPackEvent(
                    second,
                    this.currentWave
                ));
            }
        }

        if (BATTLE_PACING.eliteSpawnSeconds.some((eliteSecond) => {
            return eliteSecond === second;
        })) {
            events.push({
                type: 'spawn-elite',
                second,
                wave: this.currentWave
            });
        }

        if (second === BATTLE_PACING.bossSpawnSecond) {
            events.push({
                type: 'spawn-boss',
                second,
                wave: this.currentWave
            });
        }

        return events;
    }


    private createNextPackEvent(
        second: number,
        wave: number
    ): BattlePacingEvent {

        const packIndex = this.nextPackIndexByWave.get(wave) ?? 0;
        this.nextPackIndexByWave.set(wave, packIndex + 1);

        return {
            type: 'spawn-pack',
            second,
            wave,
            packIndex
        };
    }
}
