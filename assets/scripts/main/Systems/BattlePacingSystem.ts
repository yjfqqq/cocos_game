import {
    BATTLE_PACING,
    getBattleWaveCount,
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
    private readonly nextPackIndexByWave = new Map<number, number>();


    start(): BattlePacingEvent[] {
        this.elapsedSeconds = 0;
        this.timelineComplete = false;
        this.nextPackIndexByWave.clear();
        return this.getEventsAtSecond(0);
    }


    spawnNextPackNow(): BattlePacingEvent[] {

        if (this.timelineComplete) {
            return [];
        }

        const second = Math.floor(this.elapsedSeconds);
        const wave = getWaveAtSecond(second);
        return [this.createNextPackEvent(second, wave)];
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

        const wave = getWaveAtSecond(second);

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
        const waveSecond = second % BATTLE_PACING.waveDurationSeconds;

        if (waveSecond === 0) {
            events.push({ type: 'wave-start', second, wave });
        }

        if (waveSecond % BATTLE_PACING.spawnIntervalSeconds === 0) {
            const scheduledPackIndex = Math.floor(
                waveSecond / BATTLE_PACING.spawnIntervalSeconds
            );
            const nextPackIndex = this.nextPackIndexByWave.get(wave) ?? 0;

            // 已因提前清场而生成的批次，不再按固定时间重复生成。
            if (nextPackIndex <= scheduledPackIndex) {
                events.push(this.createNextPackEvent(second, wave));
            }
        }

        if (BATTLE_PACING.eliteSpawnSeconds.indexOf(second) >= 0) {
            events.push({ type: 'spawn-elite', second, wave });
        }

        if (second === BATTLE_PACING.bossSpawnSecond) {
            events.push({ type: 'spawn-boss', second, wave });
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
