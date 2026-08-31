import type { BattleRunData } from '../BattleRunData';
import type {
    ThreeKingdomsFactionId
} from '../GameData/ThreeKingdomsCardData';
import type { ThreeKingdomsBondSystem } from './ThreeKingdomsBondSystem';

export interface KillGrowthResult {
    messages: string[];
}

export class KillGrowthSystem {
    constructor(
        private readonly runData: BattleRunData,
        private readonly threeKingdoms: ThreeKingdomsBondSystem
    ) {}

    recordKill(): KillGrowthResult {
        for (const factionId of this.threeKingdoms.getActiveUrFactions()) {
            this.runData.addRunGrowth(this.toGrowthAttribute(factionId), 0.3);
        }
        return this.threeKingdoms.recordKill();
    }

    private toGrowthAttribute(
        factionId: ThreeKingdomsFactionId
    ): 'attack' | 'strength' | 'agility' | 'intelligence' {
        return {
            wei: 'intelligence',
            shu: 'agility',
            wu: 'strength',
            qun: 'attack'
        }[factionId] as 'attack' | 'strength' | 'agility' | 'intelligence';
    }
}
