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
import { FactionSystem } from './FactionSystem';


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


const MAX_SKILL_SLOTS = 10;


export class CardSystem {

    private normalCardLevels = new Map<string, number>();
    private activeFactionCards = new Map<string, FactionCardState>();
    private completedFactionCards = new Set<string>();
    private choiceCount = 0;


    constructor(private readonly factionSystem: FactionSystem) {}


    getChoices(count = 3): CardChoice[] {

        const choices: CardChoice[] = [];
        const offerNormalCards =
            this.choiceCount % BATTLE_BALANCE.basicCardOfferEvery ===
            BATTLE_BALANCE.basicCardOfferEvery - 1;

        if (offerNormalCards) {
            choices.push(...this.getNormalCardChoices());
        } else {
            for (const branch of this.factionSystem.getBranches()) {
                const card = this.getNextFactionCard(branch.id);
                if (card) {
                    choices.push(this.toFactionCardChoice(card));
                }
            }
        }

        if (choices.length < count) {
            const factionPool = new Set(
                this.factionSystem.getFactionCardPool()
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
                    `${state.definition.quality}神将【${state.definition.name}】归位，释放技能槽！`
                );
            }
        });

        for (const id of completedThisKill) {
            this.activeFactionCards.delete(id);
            this.completedFactionCards.add(id);
        }

        const factionProgress = this.factionSystem.syncCardProgress(
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

        slots.push(...this.factionSystem.getSlotDescriptions());
        return slots;
    }


    // 兼容旧调用；流派进度的真实归属已经迁移到 FactionSystem。
    getProgressText(): string {
        return this.factionSystem.getProgressText();
    }


    private getNormalCardChoices(): CardChoice[] {

        const usedSlots = this.getUsedSlotCount();

        return NORMAL_CARDS
            .filter((card) => {
                const level = this.normalCardLevels.get(card.id) ?? 0;
                const nextLevel = level + 1;
                const completesCard = nextLevel === card.maxLevel;
                return level < card.maxLevel &&
                    (completesCard || usedSlots < MAX_SKILL_SLOTS);
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
        const factionPool = new Set(this.factionSystem.getFactionCardPool());
        return FACTION_CARDS.find((card) => {
            return factionPool.has(card.id) &&
                card.branchId === branchId &&
                this.canOfferFactionCard(card);
        });
    }


    private canOfferFactionCard(card: FactionCardDefinition): boolean {
        return !this.factionSystem.isUltimateActive() &&
            !this.factionSystem.isBranchStrengtheningActive(card.branchId) &&
            this.isQualityUnlocked(card) &&
            !this.activeFactionCards.has(card.id) &&
            !this.completedFactionCards.has(card.id) &&
            this.getUsedSlotCount() < MAX_SKILL_SLOTS;
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
        const factionPool = new Set(this.factionSystem.getFactionCardPool());
        return FACTION_CARDS.filter((item) => {
            return factionPool.has(item.id) && item.branchId === card.branchId;
        });
    }


    private toFactionCardChoice(card: FactionCardDefinition): CardChoice {
        return {
            id: card.id,
            name: `${card.quality}·${card.name}`,
            description: `${card.role} · 击杀${card.requiredKills}个敌人后归位`,
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

        if (!completesCard && this.getUsedSlotCount() >= MAX_SKILL_SLOTS) {
            return { success: false, message: '技能槽已满' };
        }

        this.normalCardLevels.set(card.id, nextLevel);

        return {
            success: true,
            message: nextLevel === card.maxLevel
                ? `${card.name} III 吞噬完成，释放 ${card.maxLevel - 1} 个技能槽！`
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
            message: `获得${card.quality}神将【${card.name}】，开始累计击杀`
        };
    }


    private getUsedSlotCount(): number {

        let count = this.activeFactionCards.size +
            this.factionSystem.getOccupiedSlotCount();

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
