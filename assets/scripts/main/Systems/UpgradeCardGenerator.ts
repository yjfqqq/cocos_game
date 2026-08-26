import type { StatModifier } from '../GameData/EffectData';
import type { BattleBuildRuntime } from '../GameData/BattleBuildData';
import {
    BATTLE_SKILL_UPGRADES,
    canOfferBattleSkillNode,
    SKILL_DEFINITIONS
} from '../GameData/SkillData';
import type {
    BattleSkillUpgradeDefinition,
    SkillNodeRarity
} from '../GameData/SkillData';


export type UpgradeCardKind = 'skill' | 'bond' | 'basic';

export interface UpgradeCard {
    id: string;
    kind: UpgradeCardKind;
    sourceId: string;
    upgradeId?: string;
    name: string;
    description: string;
    nextLevel: number;
    bonus: StatModifier;
    rarity?: SkillNodeRarity | string;
    progress?: string;
    weight?: number;
}

interface WeightedSkillCard {
    card: UpgradeCard;
    node: BattleSkillUpgradeDefinition;
    weight: number;
}


// 技能候选采用无放回加权随机。核心节点未进入候选时会积累隐藏权重，
// 但不会直接保底，保持中随机并让已成形的技能树有机会继续推进。
export class UpgradeCardGenerator {

    private readonly missedCoreOffers = new Map<string, number>();


    constructor(
        private readonly runtime: BattleBuildRuntime,
        private readonly random: () => number = Math.random
    ) {}


    generateUpgradeCards(
        count: number,
        kind: UpgradeCardKind
    ): UpgradeCard[] {
        if (kind !== 'skill') {
            return [];
        }
        const pool = this.getWeightedSkillCards();
        const choices: WeightedSkillCard[] = [];

        while (choices.length < count && pool.length > 0) {
            const totalWeight = pool.reduce((sum, item) => {
                return sum + item.weight;
            }, 0);
            let cursor = this.random() * totalWeight;
            let selectedIndex = pool.length - 1;
            for (let index = 0; index < pool.length; index++) {
                cursor -= pool[index].weight;
                if (cursor <= 0) {
                    selectedIndex = index;
                    break;
                }
            }
            choices.push(pool.splice(selectedIndex, 1)[0]);
        }

        this.updateCoreOfferMisses(choices, this.getWeightedSkillCards());
        return choices.map((item) => item.card);
    }


    hasAvailableCards(kind: UpgradeCardKind): boolean {
        return kind === 'skill' && this.getWeightedSkillCards().length > 0;
    }


    getDebugWeightText(): string {
        const candidates = this.getWeightedSkillCards();
        if (candidates.length === 0) {
            return '技能候选池为空';
        }
        return candidates
            .map((item) => `${item.node.name}:${Math.round(item.weight)}`)
            .join(' · ');
    }


    private getWeightedSkillCards(): WeightedSkillCard[] {
        const cards: WeightedSkillCard[] = [];

        for (const skillId of this.runtime.selectedSkillIds) {
            const definition = SKILL_DEFINITIONS.find((skill) => {
                return skill.skillId === skillId;
            });
            if (!definition) {
                continue;
            }
            const ranks = this.runtime.skillUpgradeLevels[skillId] ?? {};
            const metaLevel = this.runtime.skillMetaLevels[skillId] ?? 1;
            for (const node of BATTLE_SKILL_UPGRADES) {
                if (!canOfferBattleSkillNode(node, skillId, metaLevel, ranks)) {
                    continue;
                }
                const currentRank = ranks[node.id] ?? 0;
                const nextRank = currentRank + 1;
                const pity = this.missedCoreOffers.get(node.id) ?? 0;
                const progressionBonus = node.tags.indexOf('progression') >= 0
                    ? 25
                    : 0;
                const coreBonus = node.rarity === 'basic' ? 0 : 45;
                const weight = node.weight + progressionBonus +
                    coreBonus + pity * 40;
                cards.push({
                    node,
                    weight,
                    card: {
                        id: `skill:${skillId}:${node.id}`,
                        kind: 'skill',
                        sourceId: skillId,
                        upgradeId: node.id,
                        name: `${definition.skillName}·${node.name}`,
                        description: node.description,
                        nextLevel: nextRank,
                        bonus: { ...node.bonus },
                        rarity: node.rarity,
                        progress: node.rarity === 'basic'
                            ? `Rank ${nextRank}/${node.maxRank}`
                            : `局外Lv${node.requiredMetaLevel}核心`,
                        weight
                    }
                });
            }
        }
        return cards;
    }


    private updateCoreOfferMisses(
        choices: WeightedSkillCard[],
        eligible: WeightedSkillCard[]
    ): void {
        const selectedIds = new Set(choices.map((item) => item.node.id));
        for (const item of eligible) {
            if (item.node.rarity === 'basic') {
                continue;
            }
            this.missedCoreOffers.set(
                item.node.id,
                selectedIds.has(item.node.id)
                    ? 0
                    : (this.missedCoreOffers.get(item.node.id) ?? 0) + 1
            );
        }
    }
}
