import { BOND_GROWTH_CONFIG } from '../GameData/BondGrowthData';
import {
    THREE_KINGDOMS_BOND_ID,
    THREE_KINGDOMS_STARTER_CARD
} from '../GameData/ThreeKingdomsCardData';
import type {
    ThreeKingdomsCardDefinition,
    ThreeKingdomsRarity
} from '../GameData/ThreeKingdomsCardData';

export interface BondGrowthChoice {
    id: string;
    bondId: typeof THREE_KINGDOMS_BOND_ID;
    bondName: '三国';
    name: string;
    description: string;
    rarity: ThreeKingdomsRarity;
    nextRank: number;
    maxRank: number;
    progress: string;
    weight: number;
}

export interface BondDrawResult {
    success: boolean;
    message: string;
    choices: BondGrowthChoice[];
    cost: number;
}

export interface BondSelectResult {
    success: boolean;
    message: string;
    cardId?: string;
}

export interface SpiritRewardResult {
    amount: number;
    total: number;
}

interface WeightedChoice {
    definition: ThreeKingdomsCardDefinition;
    weight: number;
}

// 只负责局内灵石、抽卡、三选一、刷新和敌人/任务资源奖励。
export class BondGrowthSystem {
    private spiritStones = BOND_GROWTH_CONFIG.initialSpiritStones;
    private totalEarned = BOND_GROWTH_CONFIG.initialSpiritStones;
    private totalSpent = 0;
    private drawCount = 0;
    private refreshIndex = 0;
    private taskStage = 1;
    private currentOffers = new Map<string, ThreeKingdomsCardDefinition>();

    constructor(
        private readonly random: () => number = Math.random,
        private readonly getCandidates: () => ThreeKingdomsCardDefinition[] =
            () => [THREE_KINGDOMS_STARTER_CARD]
    ) {}

    getSpiritStones(): number { return this.spiritStones; }
    getTotalEarned(): number { return this.totalEarned; }
    getTotalSpent(): number { return this.totalSpent; }
    getDrawCount(): number { return this.drawCount; }

    getDrawCost(): number {
        return BOND_GROWTH_CONFIG.drawCosts[
            Math.min(this.drawCount, BOND_GROWTH_CONFIG.drawCosts.length - 1)
        ] ?? BOND_GROWTH_CONFIG.continuedDrawCost;
    }

    getRefreshCost(): number {
        return BOND_GROWTH_CONFIG.refreshCosts[
            Math.min(this.refreshIndex, BOND_GROWTH_CONFIG.refreshCosts.length - 1)
        ] ?? BOND_GROWTH_CONFIG.continuedRefreshCost;
    }

    setTaskStage(stage: number): void {
        if (stage !== this.taskStage) {
            this.taskStage = stage;
            this.refreshIndex = 0;
        }
    }

    addSpiritStones(amount: number, _applyGainBonus = false): SpiritRewardResult {
        const granted = Math.max(0, Math.floor(amount));
        this.spiritStones += granted;
        this.totalEarned += granted;
        return { amount: granted, total: this.spiritStones };
    }

    grantEnemyReward(isElite: boolean, isBoss: boolean): SpiritRewardResult {
        let base = 0;
        if (isBoss) {
            base = BOND_GROWTH_CONFIG.bossReward;
        } else if (isElite) {
            base = BOND_GROWTH_CONFIG.eliteReward;
        } else if (this.random() < BOND_GROWTH_CONFIG.normalDropChance) {
            const range = BOND_GROWTH_CONFIG.normalDropMax -
                BOND_GROWTH_CONFIG.normalDropMin + 1;
            base = BOND_GROWTH_CONFIG.normalDropMin +
                Math.floor(this.random() * range);
        }
        return this.addSpiritStones(base);
    }

    grantTaskReward(taskId: number): SpiritRewardResult {
        return this.addSpiritStones(BOND_GROWTH_CONFIG.taskRewards[
            Math.max(0, taskId - 1)
        ] ?? 0);
    }

    drawChoices(): BondDrawResult {
        return this.createOffer(false);
    }

    refreshChoices(): BondDrawResult {
        if (this.currentOffers.size === 0) {
            return {
                success: false,
                message: '当前没有可刷新的羁绊候选',
                choices: [],
                cost: this.getRefreshCost()
            };
        }
        return this.createOffer(true);
    }

    selectCard(cardId: string): BondSelectResult {
        const definition = this.currentOffers.get(cardId);
        if (!definition) {
            return { success: false, message: '该羁绊卡不在当前候选中' };
        }
        this.currentOffers.clear();
        return {
            success: true,
            cardId,
            message: `已选择${definition.rarity}羁绊卡【${definition.name}】`
        };
    }

    getDebugWeightText(): string {
        const pool = this.getWeightedChoices();
        return pool.length > 0
            ? pool.map((item) => `${item.definition.name}:${item.weight}`).join(' · ')
            : '羁绊候选池为空';
    }

    private createOffer(refresh: boolean): BondDrawResult {
        const cost = refresh ? this.getRefreshCost() : this.getDrawCost();
        const pool = this.getWeightedChoices();
        if (pool.length === 0) {
            return { success: false, message: '当前没有可获得的羁绊卡', choices: [], cost };
        }
        if (this.spiritStones < cost) {
            return {
                success: false,
                message: `灵石不足，需要 ${cost}`,
                choices: [],
                cost
            };
        }
        this.spiritStones -= cost;
        this.totalSpent += cost;
        if (refresh) this.refreshIndex++;
        else this.drawCount++;

        const definitions = this.pickWeightedChoices(pool);
        this.currentOffers = new Map(definitions.map((definition) => [
            definition.id,
            definition
        ]));
        return {
            success: true,
            message: `${refresh ? '刷新羁绊候选' : '进行羁绊抽卡'}，消耗 ${cost} 灵石`,
            choices: definitions.map((definition) => this.toChoice(definition)),
            cost
        };
    }

    private getWeightedChoices(): WeightedChoice[] {
        return this.getCandidates()
            .filter((definition, index, items) => {
                return items.findIndex((item) => item.id === definition.id) === index;
            })
            .map((definition) => ({
                definition,
                weight: Math.max(1, definition.baseWeight)
            }));
    }

    private pickWeightedChoices(
        pool: WeightedChoice[]
    ): ThreeKingdomsCardDefinition[] {
        const candidates = [...pool];
        const selected: ThreeKingdomsCardDefinition[] = [];
        while (
            selected.length < BOND_GROWTH_CONFIG.choiceCount &&
            candidates.length > 0
        ) {
            const total = candidates.reduce((sum, item) => sum + item.weight, 0);
            let cursor = this.random() * total;
            let index = candidates.length - 1;
            for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
                cursor -= candidates[candidateIndex].weight;
                if (cursor <= 0) {
                    index = candidateIndex;
                    break;
                }
            }
            selected.push(candidates.splice(index, 1)[0].definition);
        }
        return selected;
    }

    private toChoice(
        definition: ThreeKingdomsCardDefinition
    ): BondGrowthChoice {
        const progress = definition.role === 'starter'
            ? '启动卡 · 开放四核'
            : definition.role === 'core'
                ? 'SSR 核心 · 开放阵营卡'
                : '阵营卡 · 10 选 8';
        return {
            id: definition.id,
            bondId: THREE_KINGDOMS_BOND_ID,
            bondName: '三国',
            name: definition.name,
            description: definition.description,
            rarity: definition.rarity,
            nextRank: 1,
            maxRank: 1,
            progress,
            weight: definition.baseWeight
        };
    }
}
