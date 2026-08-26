import type { StatModifier } from '../GameData/EffectData';
import {
    BOND_GROWTH_CONFIG,
    RUNTIME_BOND_CARDS,
    RUNTIME_BOND_DEFINITIONS
} from '../GameData/BondGrowthData';
import type {
    BondCardRarity,
    BondEffectType,
    RuntimeBondCardDefinition
} from '../GameData/BondGrowthData';


export interface BondGrowthChoice {
    id: string;
    bondId: string;
    bondName: string;
    name: string;
    description: string;
    rarity: BondCardRarity;
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
    bonus?: StatModifier;
}

export interface SpiritRewardResult {
    amount: number;
    total: number;
}

export interface ComboAttackResult {
    combo: number;
    extraAttack: boolean;
    extraDamageMultiplier: number;
    extraAttackTriggersEffects: boolean;
    areaStrikeTargets: number;
    areaStrikeDamageMultiplier: number;
    messages: string[];
}

interface WeightedBondChoice {
    definition: RuntimeBondCardDefinition;
    choice: BondGrowthChoice;
    weight: number;
}


export class BondGrowthSystem {

    private spiritStones = 0;
    private totalEarned = 0;
    private totalSpent = 0;
    private drawCount = 0;
    private refreshIndex = 0;
    private taskStage = 1;
    private currentOfferIds = new Set<string>();
    private readonly cardRanks = new Map<string, number>();
    private readonly missedCoreOffers = new Map<string, number>();
    private combo = 0;
    private maxCombo = 0;
    private lastAttackTime = Number.NEGATIVE_INFINITY;
    private attackSequence = 0;
    private triggeredComboMilestones = new Set<number>();


    constructor(private readonly random: () => number = Math.random) {}


    getSpiritStones(): number {
        return this.spiritStones;
    }

    getTotalEarned(): number {
        return this.totalEarned;
    }

    getTotalSpent(): number {
        return this.totalSpent;
    }

    getWealth(): number {
        return this.totalEarned + Math.floor(this.totalSpent * 0.5);
    }

    getCombo(): number {
        return this.combo;
    }

    getMaxCombo(): number {
        return this.maxCombo;
    }

    getDrawCount(): number {
        return this.drawCount;
    }


    getDrawCost(): number {
        const configured = BOND_GROWTH_CONFIG.drawCosts[
            Math.min(this.drawCount, BOND_GROWTH_CONFIG.drawCosts.length - 1)
        ] ?? BOND_GROWTH_CONFIG.continuedDrawCost;
        const discount = Math.min(
            45,
            this.getScaledEffectValue('draw-discount', 'percentPerRank')
        );
        return Math.max(1, Math.ceil(configured * (1 - discount / 100)));
    }


    getRefreshCost(): number {
        return BOND_GROWTH_CONFIG.refreshCosts[
            Math.min(
                this.refreshIndex,
                BOND_GROWTH_CONFIG.refreshCosts.length - 1
            )
        ] ?? BOND_GROWTH_CONFIG.continuedRefreshCost;
    }


    setTaskStage(stage: number): void {
        if (stage !== this.taskStage) {
            this.taskStage = stage;
            this.refreshIndex = 0;
        }
    }


    addSpiritStones(amount: number, applyGainBonus = false): SpiritRewardResult {
        const safeAmount = Math.max(0, Math.floor(amount));
        const gainPercent = applyGainBonus
            ? this.getScaledEffectValue('spirit-gain', 'percentPerRank')
            : 0;
        const granted = Math.max(
            0,
            Math.round(safeAmount * (1 + gainPercent / 100))
        );
        this.spiritStones += granted;
        this.totalEarned += granted;
        return { amount: granted, total: this.spiritStones };
    }


    grantEnemyReward(
        isElite: boolean,
        isBoss: boolean
    ): SpiritRewardResult {
        let base = 0;
        if (isBoss) {
            base = BOND_GROWTH_CONFIG.bossReward;
        } else if (isElite) {
            base = BOND_GROWTH_CONFIG.eliteReward +
                this.getScaledEffectValue('elite-bonus', 'amountPerRank');
        } else if (this.random() < BOND_GROWTH_CONFIG.normalDropChance) {
            const range = BOND_GROWTH_CONFIG.normalDropMax -
                BOND_GROWTH_CONFIG.normalDropMin + 1;
            base = BOND_GROWTH_CONFIG.normalDropMin +
                Math.floor(this.random() * range);
        }
        return this.addSpiritStones(base, true);
    }


    grantTaskReward(taskId: number): SpiritRewardResult {
        const base = BOND_GROWTH_CONFIG.taskRewards[
            Math.max(0, taskId - 1)
        ] ?? 0;
        const investment = this.getScaledEffectValue(
            'task-bonus',
            'amountPerRank'
        );
        return this.addSpiritStones(base + investment, true);
    }


    drawChoices(): BondDrawResult {
        const cost = this.getDrawCost();
        const pool = this.getWeightedChoices();
        if (pool.length === 0) {
            return {
                success: false,
                message: '当前没有可获得的羁绊卡',
                choices: [],
                cost
            };
        }
        if (this.spiritStones < cost) {
            return {
                success: false,
                message: `灵石不足，需要 ${cost}`,
                choices: [],
                cost
            };
        }

        this.spend(cost);
        this.drawCount++;
        const refund = this.tryRefund('draw-rebate', cost);
        const choices = this.pickWeightedChoices(pool);
        this.currentOfferIds = new Set(choices.map((choice) => choice.id));
        this.updateMissedCoreOffers(pool, choices);
        return {
            success: true,
            message: refund > 0
                ? `消耗 ${cost} 灵石，一本万利返还 ${refund}`
                : `消耗 ${cost} 灵石进行羁绊抽卡`,
            choices,
            cost
        };
    }


    refreshChoices(): BondDrawResult {
        if (this.currentOfferIds.size === 0) {
            return {
                success: false,
                message: '当前没有可刷新的羁绊候选',
                choices: [],
                cost: this.getRefreshCost()
            };
        }
        const cost = this.getRefreshCost();
        if (this.spiritStones < cost) {
            return {
                success: false,
                message: `灵石不足，刷新需要 ${cost}`,
                choices: [],
                cost
            };
        }
        this.spend(cost);
        this.refreshIndex++;
        const refund = this.tryRefund('refresh-rebate', cost);
        const pool = this.getWeightedChoices();
        const choices = this.pickWeightedChoices(pool);
        this.currentOfferIds = new Set(choices.map((choice) => choice.id));
        this.updateMissedCoreOffers(pool, choices);
        return {
            success: true,
            message: refund > 0
                ? `刷新消耗 ${cost}，回扣返还 ${refund}`
                : `刷新羁绊候选，消耗 ${cost} 灵石`,
            choices,
            cost
        };
    }


    selectCard(cardId: string): BondSelectResult {
        const definition = RUNTIME_BOND_CARDS.find((card) => {
            return card.id === cardId;
        });
        if (!definition || !this.currentOfferIds.has(cardId)) {
            return { success: false, message: '该羁绊卡不在当前候选中' };
        }
        const currentRank = this.cardRanks.get(cardId) ?? 0;
        if (currentRank >= definition.maxRank || !this.canOffer(definition)) {
            return { success: false, message: '该羁绊卡当前无法获得' };
        }
        const nextRank = currentRank + 1;
        this.cardRanks.set(cardId, nextRank);
        this.currentOfferIds.clear();
        return {
            success: true,
            message: `获得${this.getRarityName(definition.rarity)}羁绊卡` +
                `【${definition.name}】${nextRank > 1 ? ` Rank ${nextRank}` : ''}`,
            bonus: { ...(definition.bonus ?? {}) }
        };
    }


    recordNormalAttack(nowSeconds: number): ComboAttackResult {
        const comboWindow = BOND_GROWTH_CONFIG.comboBaseWindowSeconds +
            this.getScaledEffectValue('combo-window', 'secondsPerRank');
        if (nowSeconds - this.lastAttackTime > comboWindow) {
            this.combo = 0;
            this.attackSequence = 0;
            this.triggeredComboMilestones.clear();
        }
        this.lastAttackTime = nowSeconds;
        this.combo++;
        this.attackSequence++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);

        const extraChance = Math.min(
            0.65,
            this.getScaledEffectValue('extra-attack', 'chance')
        );
        const extraAttack = this.random() < extraChance;
        if (extraAttack) {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
        }
        const extraDamage = Math.max(
            0.55,
            this.getHighestEffectValue('extra-attack', 'damage')
        );
        let areaStrikeTargets = 0;
        let areaStrikeDamageMultiplier = 0;
        const messages: string[] = [];

        const endless = this.getCardByEffect('endless-slash');
        if (endless && this.combo >= Number(endless.effectValues.threshold) &&
            this.attackSequence % Number(endless.effectValues.interval) === 0) {
            areaStrikeTargets = Number(endless.effectValues.targets);
            areaStrikeDamageMultiplier = Number(endless.effectValues.damage);
            messages.push('【无尽连斩】发动！');
        }

        const ultimate = this.getCardByEffect('combo-ultimate');
        if (ultimate) {
            const milestones = [
                Number(ultimate.effectValues.first),
                Number(ultimate.effectValues.second),
                Number(ultimate.effectValues.final)
            ];
            for (let index = milestones.length - 1; index >= 0; index--) {
                const milestone = milestones[index];
                if (
                    this.combo >= milestone &&
                    !this.triggeredComboMilestones.has(milestone)
                ) {
                    this.triggeredComboMilestones.add(milestone);
                    areaStrikeTargets = index === 2 ? 99 : index === 1 ? 5 : 3;
                    areaStrikeDamageMultiplier = [0.8, 1.15, 1.8][index];
                    messages.push(`【万刃归一】${milestone}连击刀光！`);
                    break;
                }
            }
        }

        return {
            combo: this.combo,
            extraAttack,
            extraDamageMultiplier: extraDamage,
            extraAttackTriggersEffects: this.hasEffect('extra-effect'),
            areaStrikeTargets,
            areaStrikeDamageMultiplier,
            messages
        };
    }


    getCombatDamageMultiplier(): number {
        let multiplier = 1;
        const blade = this.getCardByEffect('combo-damage');
        if (blade && this.combo >= Number(blade.effectValues.threshold)) {
            multiplier += (this.cardRanks.get(blade.id) ?? 0) *
                Number(blade.effectValues.damagePerRank);
        }
        if (this.hasEffect('wealth-power')) {
            const wealth = this.getWealth();
            multiplier += wealth >= 2600
                ? 0.15
                : wealth >= 1400
                    ? 0.1
                    : wealth >= 700
                        ? 0.05
                        : 0;
        }
        return multiplier;
    }


    getCardDescriptions(): string[] {
        return [...this.cardRanks.entries()].map(([id, rank]) => {
            const card = RUNTIME_BOND_CARDS.find((item) => item.id === id);
            return card ? `${card.name}${rank > 1 ? ` ${rank}` : ''}` : id;
        });
    }


    getProgressText(): string {
        const comboCount = this.getOwnedCount('combo');
        const merchantCount = this.getOwnedCount('merchant');
        return `连击 ${comboCount} · 商会 ${merchantCount}` +
            ` · 最高Combo ${this.maxCombo} · 财富 ${this.getWealth()}`;
    }


    getDebugWeightText(): string {
        const pool = this.getWeightedChoices();
        return pool.length > 0
            ? pool.map((item) => {
                return `${item.definition.name}:${Math.round(item.weight)}`;
            }).join(' · ')
            : '羁绊候选池为空';
    }


    private getWeightedChoices(): WeightedBondChoice[] {
        const choices: WeightedBondChoice[] = [];
        for (const definition of RUNTIME_BOND_CARDS) {
            if (!this.canOffer(definition)) {
                continue;
            }
            const ownedInBond = this.getOwnedCount(definition.bondId);
            const pity = this.missedCoreOffers.get(definition.id) ?? 0;
            const isCore = definition.rarity === 'red' ||
                definition.rarity === 'rainbow';
            const weight = definition.baseWeight +
                Math.min(40, ownedInBond * 6) +
                (isCore ? pity * BOND_GROWTH_CONFIG.corePityWeightPerMiss : 0);
            const nextRank = (this.cardRanks.get(definition.id) ?? 0) + 1;
            const bondName = RUNTIME_BOND_DEFINITIONS.find((bond) => {
                return bond.id === definition.bondId;
            })?.name ?? definition.bondId;
            choices.push({
                definition,
                weight,
                choice: {
                    id: definition.id,
                    bondId: definition.bondId,
                    bondName,
                    name: definition.name,
                    description: definition.description,
                    rarity: definition.rarity,
                    nextRank,
                    maxRank: definition.maxRank,
                    progress: `${bondName} · Rank ${nextRank}/${definition.maxRank}`,
                    weight
                }
            });
        }
        return choices;
    }


    private pickWeightedChoices(
        candidates: WeightedBondChoice[]
    ): BondGrowthChoice[] {
        const pool = [...candidates];
        const selected: BondGrowthChoice[] = [];
        while (
            selected.length < BOND_GROWTH_CONFIG.choiceCount &&
            pool.length > 0
        ) {
            const total = pool.reduce((sum, item) => sum + item.weight, 0);
            let cursor = this.random() * total;
            let index = pool.length - 1;
            for (let candidateIndex = 0;
                candidateIndex < pool.length;
                candidateIndex++
            ) {
                cursor -= pool[candidateIndex].weight;
                if (cursor <= 0) {
                    index = candidateIndex;
                    break;
                }
            }
            selected.push(pool.splice(index, 1)[0].choice);
        }
        return selected;
    }


    private canOffer(definition: RuntimeBondCardDefinition): boolean {
        if ((this.cardRanks.get(definition.id) ?? 0) >= definition.maxRank) {
            return false;
        }
        if ((definition.requiredMaxCombo ?? 0) > this.maxCombo) {
            return false;
        }
        if ((definition.requiredWealth ?? 0) > this.getWealth()) {
            return false;
        }
        return (definition.prerequisites ?? []).every((prerequisite) => {
            return (this.cardRanks.get(prerequisite.cardId) ?? 0) >=
                prerequisite.rank;
        });
    }


    private spend(amount: number): void {
        this.spiritStones -= amount;
        this.totalSpent += amount;
    }


    private tryRefund(type: BondEffectType, cost: number): number {
        const card = this.getCardByEffect(type);
        if (!card || this.random() >= Number(card.effectValues.chance ?? 0)) {
            return 0;
        }
        const refund = Math.floor(
            cost * Number(card.effectValues.refundPercent ?? 0) / 100
        );
        this.spiritStones += refund;
        return refund;
    }


    private getScaledEffectValue(
        type: BondEffectType,
        key: string
    ): number {
        return RUNTIME_BOND_CARDS
            .filter((card) => card.effectType === type)
            .reduce((total, card) => {
                const rank = this.cardRanks.get(card.id) ?? 0;
                return total + rank * Number(card.effectValues[key] ?? 0);
            }, 0);
    }


    private getHighestEffectValue(type: BondEffectType, key: string): number {
        return RUNTIME_BOND_CARDS
            .filter((card) => {
                return card.effectType === type &&
                    (this.cardRanks.get(card.id) ?? 0) > 0;
            })
            .reduce((highest, card) => {
                return Math.max(highest, Number(card.effectValues[key] ?? 0));
            }, 0);
    }


    private getCardByEffect(
        type: BondEffectType
    ): RuntimeBondCardDefinition | undefined {
        return RUNTIME_BOND_CARDS.find((card) => {
            return card.effectType === type &&
                (this.cardRanks.get(card.id) ?? 0) > 0;
        });
    }


    private hasEffect(type: BondEffectType): boolean {
        return Boolean(this.getCardByEffect(type));
    }


    private getOwnedCount(bondId: string): number {
        return RUNTIME_BOND_CARDS.filter((card) => {
            return card.bondId === bondId &&
                (this.cardRanks.get(card.id) ?? 0) > 0;
        }).length;
    }


    private updateMissedCoreOffers(
        eligible: WeightedBondChoice[],
        selected: BondGrowthChoice[]
    ): void {
        const selectedIds = new Set(selected.map((choice) => choice.id));
        for (const item of eligible) {
            if (
                item.definition.rarity !== 'red' &&
                item.definition.rarity !== 'rainbow'
            ) {
                continue;
            }
            this.missedCoreOffers.set(
                item.definition.id,
                selectedIds.has(item.definition.id)
                    ? 0
                    : (this.missedCoreOffers.get(item.definition.id) ?? 0) + 1
            );
        }
    }


    private getRarityName(rarity: BondCardRarity): string {
        const names: Record<BondCardRarity, string> = {
            green: '绿色',
            blue: '蓝色',
            purple: '紫色',
            red: '红色',
            rainbow: '彩色'
        };
        return names[rarity];
    }
}
