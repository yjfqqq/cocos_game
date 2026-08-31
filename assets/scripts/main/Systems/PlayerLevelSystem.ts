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
    applyBonus?: (bonus: StatModifier) => void;
}

export interface PlayerLevelPolicy {
    getExpToNextLevel: (level: number) => number;
    getAttributeGrowth: (level: number) => StatModifier;
    maxLevel?: number;
}

export interface PlayerLevelResult {
    levelsGained: number;
    reachedLevels: number[];
    attributeGrowth: StatModifier;
}


export const PERSISTENT_PLAYER_LEVEL_POLICY: PlayerLevelPolicy = {
    getExpToNextLevel: (level) => 100 + (level - 1) * 50,
    getAttributeGrowth: () => ({ hp: 20, atk: 5, def: 2 })
};

export const BATTLE_RUN_LEVEL_POLICY: PlayerLevelPolicy = {
    maxLevel: BATTLE_BALANCE.maxRunLevel,
    getExpToNextLevel: (level) =>
        BATTLE_BALANCE.runLevelExpTable[level - 1] ??
        Number.POSITIVE_INFINITY,
    getAttributeGrowth: (level) => {
        const attackPercent = level <= 10
            ? 1
            : level <= 20
                ? 1.5
                : level <= 30
                    ? 2
                    : level <= 40
                        ? 2.5
                        : 3;
        const hpPercent = level <= 10
            ? 0.5
            : level <= 20
                ? 0.75
                : level <= 30
                    ? 1
                    : level <= 40
                        ? 1.25
                        : 1.5;
        const milestoneAttack = level === 10
            ? 5
            : level === 30 || level === 40
                ? 10
                : level === 50
                    ? 15
                    : 0;
        const milestoneHp = level === 20 || level === 40 ? 10 : 0;

        return {
            attackPercent: attackPercent + milestoneAttack,
            hpPercent: hpPercent + milestoneHp
        };
    }
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
            return {
                levelsGained: 0,
                reachedLevels: [],
                attributeGrowth: totalGrowth
            };
        }

        const maxLevel = this.policy.maxLevel ?? Number.POSITIVE_INFINITY;
        if (this.state.playerLevel >= maxLevel) {
            this.state.playerExp = 0;
            this.recalculatePower();
            return {
                levelsGained: 0,
                reachedLevels: [],
                attributeGrowth: totalGrowth
            };
        }

        this.state.playerExp += amount;
        let levelsGained = 0;
        const reachedLevels: number[] = [];

        while (
            this.state.playerLevel < maxLevel &&
            this.state.playerExp >= this.state.expToNextLevel
        ) {
            this.state.playerExp -= this.state.expToNextLevel;
            this.state.playerLevel++;
            levelsGained++;
            reachedLevels.push(this.state.playerLevel);

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

        return { levelsGained, reachedLevels, attributeGrowth: totalGrowth };
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
            (attributes.strength ?? 0) * 2 +
            (attributes.agility ?? 0) * 2 +
            (attributes.intelligence ?? 0) * 2 +
            attributes.crit * 10;
    }


    private applyLevelGrowth(growth: StatModifier): void {
        if (this.state.applyBonus) {
            this.state.applyBonus(growth);
            return;
        }
        this.state.attributes.hp += growth.hp ?? 0;
        this.state.attributes.atk += growth.atk ?? 0;
        this.state.attributes.def += growth.def ?? 0;
        this.state.attributes.crit += growth.crit ?? 0;
        this.state.attributes.strength += (growth.strength ?? 0) +
            (growth.allStats ?? 0);
        this.state.attributes.agility += (growth.agility ?? 0) +
            (growth.allStats ?? 0);
        this.state.attributes.intelligence += (growth.intelligence ?? 0) +
            (growth.allStats ?? 0);
    }


    private mergeGrowth(target: StatModifier, growth: StatModifier): void {
        const keys = Object.keys(growth) as (keyof StatModifier)[];
        for (const key of keys) {
            const value = growth[key];
            if (value !== undefined) {
                target[key] = (target[key] ?? 0) + value;
            }
        }
    }
}
