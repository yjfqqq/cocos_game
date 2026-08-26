import {
    FACTION_CARDS,
    NORMAL_CARDS
} from '../GameData/CardData';
import type {
    CardCategory,
    FactionCardDefinition,
    GeneralQuality,
    NormalCardDefinition
} from '../GameData/CardData';
import type { StatModifier } from '../GameData/EffectData';
import { BATTLE_BALANCE } from '../BattleBalance';
import { BondSystem } from './FactionSystem';


export interface CardChoice {
    id: string;
    name: string;
    description: string;
    category: CardCategory;
}

export interface CardSelectResult {
    success: boolean;
    message: string;
    bonus?: StatModifier;
}

export interface CardProgressResult {
    messages: string[];
    bonuses: StatModifier[];
}

interface FactionCardState {
    definition: FactionCardDefinition;
    kills: number;
}


export const MAX_BOND_CARD_SLOTS = 10;


export class CardSystem {

    private normalCardLevels = new Map<string, number>();
    private activeFactionCards = new Map<string, FactionCardState>();
    private completedFactionCards = new Set<string>();
    private choiceCount = 0;


    constructor(
        private readonly bondSystem: BondSystem,
        private readonly random: () => number = Math.random
    ) {}


    getBasicChoices(count = 3): CardChoice[] {
        return this.getNormalCardChoices().slice(0, count);
    }


    getBondChoices(count = 3): CardChoice[] {
        const choices: CardChoice[] = [];

        for (const branch of this.bondSystem.getBranches()) {
            const card = this.getNextFactionCard(branch.id);
            if (card) {
                choices.push(this.toFactionCardChoice(card));
            }
        }

        if (choices.length < count) {
            const bondPool = new Set(this.bondSystem.getBondCardPool());
            for (const card of FACTION_CARDS) {
                if (choices.length >= count) {
                    break;
                }
                if (
                    bondPool.has(card.id) &&
                    this.canOfferFactionCard(card) &&
                    !choices.some((choice) => choice.id === card.id)
                ) {
                    choices.push(this.toFactionCardChoice(card));
                }
            }
        }

        return choices.slice(0, count);
    }


    // 合法池无放回抽取，同一组不会出现重复卡牌；刷新会重新抽取。
    getCombinedBondChoices(count = 4): CardChoice[] {
        const candidates = [
            ...this.getBondChoices(Math.max(count, 6)),
            ...this.getBasicChoices(Math.max(count, NORMAL_CARDS.length))
        ].filter((choice, index, items) => {
            return items.findIndex((item) => item.id === choice.id) === index;
        });

        for (let index = candidates.length - 1; index > 0; index--) {
            const swapIndex = Math.min(
                index,
                Math.floor(this.random() * (index + 1))
            );
            [candidates[index], candidates[swapIndex]] =
                [candidates[swapIndex], candidates[index]];
        }

        return candidates.slice(0, count);
    }


    hasBasicChoices(): boolean {
        return this.getNormalCardChoices().length > 0;
    }


    hasBondChoices(): boolean {
        return this.getBondChoices(1).length > 0;
    }


    hasCombinedBondChoices(): boolean {
        return this.hasBondChoices() || this.hasBasicChoices();
    }


    getChoices(count = 3): CardChoice[] {

        const choices: CardChoice[] = [];
        const offerNormalCards =
            this.choiceCount % BATTLE_BALANCE.basicCardOfferEvery ===
            BATTLE_BALANCE.basicCardOfferEvery - 1;

        if (offerNormalCards) {
            choices.push(...this.getNormalCardChoices());
        } else {
            for (const branch of this.bondSystem.getBranches()) {
                const card = this.getNextFactionCard(branch.id);
                if (card) {
                    choices.push(this.toFactionCardChoice(card));
                }
            }
        }

        if (choices.length < count) {
            const factionPool = new Set(
                this.bondSystem.getBondCardPool()
            );
            const fallback = [
                ...this.getNormalCardChoices(),
                ...FACTION_CARDS
                    .filter((card) => {
                        return factionPool.has(card.id) &&
                            this.canOfferFactionCard(card);
                    })
                    .map((card) => this.toFactionCardChoice(card))
            ];

            for (const choice of fallback) {
                if (choices.length >= count) {
                    break;
                }
                if (!choices.some((item) => item.id === choice.id)) {
                    choices.push(choice);
                }
            }
        }

        this.choiceCount++;
        return choices.slice(0, count);
    }


    selectCard(cardId: string): CardSelectResult {

        const normalCard = NORMAL_CARDS.find((card) => card.id === cardId);
        if (normalCard) {
            return this.selectNormalCard(normalCard);
        }

        const factionCard = FACTION_CARDS.find((card) => card.id === cardId);
        if (factionCard) {
            return this.selectFactionCard(factionCard);
        }

        return { success: false, message: '卡牌不存在' };
    }


    recordKill(): CardProgressResult {

        const messages: string[] = [];
        const completedThisKill: string[] = [];

        this.activeFactionCards.forEach((state, id) => {
            state.kills++;

            if (state.kills >= state.definition.requiredKills) {
                completedThisKill.push(id);
                messages.push(
                    `${state.definition.quality}羁绊卡【${state.definition.name}】吞噬归位，释放卡槽！`
                );
            }
        });

        for (const id of completedThisKill) {
            this.activeFactionCards.delete(id);
            this.completedFactionCards.add(id);
        }

        const factionProgress = this.bondSystem.syncCardProgress(
            this.completedFactionCards
        );

        return {
            messages: [...messages, ...factionProgress.messages],
            bonuses: factionProgress.bonuses
        };
    }


    getSlotDescriptions(): string[] {

        const slots: string[] = [];

        this.normalCardLevels.forEach((level, id) => {
            const card = NORMAL_CARDS.find((item) => item.id === id);
            if (card && level < card.maxLevel) {
                for (let cardLevel = 1; cardLevel <= level; cardLevel++) {
                    slots.push(`${card.name} ${this.toRoman(cardLevel)}`);
                }
            }
        });

        this.activeFactionCards.forEach((state) => {
            slots.push(
                `${state.definition.name} ${state.kills}/${state.definition.requiredKills}`
            );
        });

        slots.push(...this.bondSystem.getSlotDescriptions());
        return slots;
    }


    // 兼容旧调用；这里的 Faction 是“羁绊”的旧代码名称。
    getProgressText(): string {
        return this.bondSystem.getProgressText();
    }


    private getNormalCardChoices(): CardChoice[] {

        const usedSlots = this.getUsedSlotCount();

        return NORMAL_CARDS
            .filter((card) => {
                const level = this.normalCardLevels.get(card.id) ?? 0;
                const nextLevel = level + 1;
                const completesCard = nextLevel === card.maxLevel;
                return level < card.maxLevel &&
                    (completesCard || usedSlots < MAX_BOND_CARD_SLOTS);
            })
            .map((card) => {
                const level = this.normalCardLevels.get(card.id) ?? 0;
                return {
                    id: card.id,
                    name: `${card.name} ${this.toRoman(level + 1)}`,
                    description: card.description,
                    category: card.category
                };
            });
    }


    private getNextFactionCard(
        branchId: FactionCardDefinition['branchId']
    ): FactionCardDefinition | undefined {
        const factionPool = new Set(this.bondSystem.getBondCardPool());
        return FACTION_CARDS.find((card) => {
            return factionPool.has(card.id) &&
                card.branchId === branchId &&
                this.canOfferFactionCard(card);
        });
    }


    private canOfferFactionCard(card: FactionCardDefinition): boolean {
        return !this.bondSystem.isUltimateActive() &&
            !this.bondSystem.isBranchStrengtheningActive(card.branchId) &&
            this.isQualityUnlocked(card) &&
            !this.activeFactionCards.has(card.id) &&
            !this.completedFactionCards.has(card.id) &&
            this.getUsedSlotCount() < MAX_BOND_CARD_SLOTS;
    }


    private isQualityUnlocked(card: FactionCardDefinition): boolean {

        if (card.quality === '绿色') {
            return true;
        }

        const greenComplete = this.getBranchCards(card)
            .filter((item) => item.quality === '绿色')
            .every((item) => this.completedFactionCards.has(item.id));

        if (card.quality === '蓝色') {
            return greenComplete;
        }

        const blueComplete = this.getBranchCards(card)
            .filter((item) => item.quality === '蓝色')
            .every((item) => this.completedFactionCards.has(item.id));

        return greenComplete && blueComplete;
    }


    private getBranchCards(card: FactionCardDefinition): FactionCardDefinition[] {
        const factionPool = new Set(this.bondSystem.getBondCardPool());
        return FACTION_CARDS.filter((item) => {
            return factionPool.has(item.id) && item.branchId === card.branchId;
        });
    }


    private toFactionCardChoice(card: FactionCardDefinition): CardChoice {
        return {
            id: card.id,
            name: `${card.quality}·${card.name}`,
            description: `${card.role} · 击杀${card.requiredKills}个敌人后吞噬归位`,
            category: card.category
        };
    }


    private selectNormalCard(card: NormalCardDefinition): CardSelectResult {

        const currentLevel = this.normalCardLevels.get(card.id) ?? 0;

        if (currentLevel >= card.maxLevel) {
            return { success: false, message: `${card.name}已经完成` };
        }

        const nextLevel = currentLevel + 1;
        const completesCard = nextLevel === card.maxLevel;

        if (!completesCard && this.getUsedSlotCount() >= MAX_BOND_CARD_SLOTS) {
            return { success: false, message: '羁绊卡槽已满' };
        }

        this.normalCardLevels.set(card.id, nextLevel);

        return {
            success: true,
            message: nextLevel === card.maxLevel
                ? `${card.name} III 吞噬完成，释放 ${card.maxLevel - 1} 个卡槽！`
                : `获得 ${card.name} ${this.toRoman(nextLevel)}`,
            bonus: card.bonus
        };
    }


    private selectFactionCard(card: FactionCardDefinition): CardSelectResult {

        if (!this.canOfferFactionCard(card)) {
            return { success: false, message: '该神将当前无法获得' };
        }

        this.activeFactionCards.set(card.id, {
            definition: card,
            kills: 0
        });

        return {
            success: true,
            message: `获得${card.quality}羁绊卡【${card.name}】，开始累计击杀吞噬`
        };
    }


    private getUsedSlotCount(): number {

        let count = this.activeFactionCards.size +
            this.bondSystem.getOccupiedSlotCount();

        this.normalCardLevels.forEach((level, id) => {
            const card = NORMAL_CARDS.find((item) => item.id === id);
            if (card && level < card.maxLevel) {
                count += level;
            }
        });

        return count;
    }


    private toRoman(level: number): string {
        return ['I', 'II', 'III'][Math.max(0, level - 1)] ?? `${level}`;
    }
}


// 旧名称继续有效，供 BattleUI 和其他未迁移模块逐步过渡。
export { CardSystem as BattleCardSystem };
export type { CardCategory, GeneralQuality };
