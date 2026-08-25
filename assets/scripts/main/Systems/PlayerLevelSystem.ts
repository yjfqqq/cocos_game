import type {
    PlayerAttributes
} from '../GameData/PlayerData';
import type { StatModifier } from '../GameData/EffectData';
import { BATTLE_BALANCE } from '../BattleBalance';


export interface PlayerLevelState {
    playerLevel: number;
    playerExp: number;
    expToNextLevel: number;
    attributes: PlayerAttributes;
}

export interface PlayerLevelPolicy {
    getExpToNextLevel: (level: number) => number;
    getAttributeGrowth: (level: number) => StatModifier;
    maxLevel?: number;
}

export interface PlayerLevelResult {
    levelsGained: number;
    attributeGrowth: StatModifier;
}


export const PERSISTENT_PLAYER_LEVEL_POLICY: PlayerLevelPolicy = {
    getExpToNextLevel: (level) => 100 + (level - 1) * 50,
    getAttributeGrowth: () => ({ hp: 20, atk: 5, def: 2 })
};

export const BATTLE_RUN_LEVEL_POLICY: PlayerLevelPolicy = {
    maxLevel: BATTLE_BALANCE.maxRunLevel,
    getExpToNextLevel: (level) => Math.min(
        BATTLE_BALANCE.maxRunLevelExp,
        BATTLE_BALANCE.initialRunLevelExp +
            (level - 1) * BATTLE_BALANCE.runLevelExpGrowth
    ),
    getAttributeGrowth: (level) => ({
        hp: 10,
        atk: 1,
        def: level % 2 === 0 ? 1 : 0,
        crit: level % 5 === 0 ? 1 : 0
    })
};


// 只处理等级经验和等级带来的属性成长，不包含技能或卡牌规则。
export class PlayerLevelSystem {

    constructor(
        private readonly state: PlayerLevelState,
        private readonly policy: PlayerLevelPolicy
    ) {}


    addExp(
        amount: number,
        onLevelUp?: (level: number) => void
    ): PlayerLevelResult {

        const totalGrowth: StatModifier = {};

        if (amount <= 0) {
            return { levelsGained: 0, attributeGrowth: totalGrowth };
        }

        const maxLevel = this.policy.maxLevel ?? Number.POSITIVE_INFINITY;
        if (this.state.playerLevel >= maxLevel) {
            this.state.playerExp = 0;
            this.recalculatePower();
            return { levelsGained: 0, attributeGrowth: totalGrowth };
        }

        this.state.playerExp += amount;
        let levelsGained = 0;

        while (
            this.state.playerLevel < maxLevel &&
            this.state.playerExp >= this.state.expToNextLevel
        ) {
            this.state.playerExp -= this.state.expToNextLevel;
            this.state.playerLevel++;
            levelsGained++;

            const growth = this.policy.getAttributeGrowth(this.state.playerLevel);
            this.applyLevelGrowth(growth);
            this.mergeGrowth(totalGrowth, growth);

            this.state.expToNextLevel = this.policy.getExpToNextLevel(
                this.state.playerLevel
            );

            if (onLevelUp) {
                onLevelUp(this.state.playerLevel);
            }
        }

        if (this.state.playerLevel >= maxLevel) {
            this.state.playerExp = 0;
        }

        this.recalculatePower();

        return { levelsGained, attributeGrowth: totalGrowth };
    }


    recalculatePower(): number {
        this.state.attributes.power = PlayerLevelSystem.calculatePower(
            this.state.attributes
        );
        return this.state.attributes.power;
    }


    static calculatePower(attributes: PlayerAttributes): number {
        return attributes.hp +
            attributes.atk * 10 +
            attributes.def * 5 +
            attributes.crit * 10;
    }


    private applyLevelGrowth(growth: StatModifier): void {
        this.state.attributes.hp += growth.hp ?? 0;
        this.state.attributes.atk += growth.atk ?? 0;
        this.state.attributes.def += growth.def ?? 0;
        this.state.attributes.crit += growth.crit ?? 0;
    }


    private mergeGrowth(target: StatModifier, growth: StatModifier): void {
        target.hp = (target.hp ?? 0) + (growth.hp ?? 0);
        target.atk = (target.atk ?? 0) + (growth.atk ?? 0);
        target.def = (target.def ?? 0) + (growth.def ?? 0);
        target.crit = (target.crit ?? 0) + (growth.crit ?? 0);
    }
}
