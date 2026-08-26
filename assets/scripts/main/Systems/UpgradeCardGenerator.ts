import type { StatModifier } from '../GameData/EffectData';
import type { BattleBuildRuntime } from '../GameData/BattleBuildData';
import {
    BATTLE_SKILL_UPGRADES,
    SKILL_DEFINITIONS
} from '../GameData/SkillData';


export type UpgradeCardKind = 'skill' | 'bond' | 'basic';

export interface UpgradeCard {
    id: string;
    kind: UpgradeCardKind;
    sourceId: string;
    name: string;
    description: string;
    nextLevel: number;
    bonus: StatModifier;
}


// 技能卡只读取 Battle Runtime 中已携带的技能 ID。
// 羁绊绿蓝紫卡与基础卡由 CardSystem 按10格吞噬进度生成。
export class UpgradeCardGenerator {

    constructor(
        private readonly runtime: BattleBuildRuntime,
        private readonly random: () => number = Math.random
    ) {}


    generateUpgradeCards(
        count: number,
        kind: UpgradeCardKind
    ): UpgradeCard[] {
        const skillCards = this.getSkillCards();
        const choices: UpgradeCard[] = [];
        const pool = kind === 'skill' ? skillCards : [];

        while (choices.length < count && pool.length > 0) {
            const index = Math.min(
                pool.length - 1,
                Math.floor(this.random() * pool.length)
            );
            choices.push(pool.splice(Math.max(0, index), 1)[0]);
        }

        return choices;
    }


    hasAvailableCards(kind: UpgradeCardKind): boolean {
        return kind === 'skill' && this.getSkillCards().length > 0;
    }


    private getSkillCards(): UpgradeCard[] {
        const cards: UpgradeCard[] = [];

        for (const skillId of this.runtime.selectedSkillIds) {
            const definition = SKILL_DEFINITIONS.find((skill) => {
                return skill.skillId === skillId;
            });
            if (!definition) {
                continue;
            }
            for (const upgrade of BATTLE_SKILL_UPGRADES) {
                cards.push({
                    id: `skill:${skillId}:${upgrade.id}`,
                    kind: 'skill',
                    sourceId: skillId,
                    name: `${definition.skillName}·${upgrade.name}`,
                    description: upgrade.description,
                    nextLevel: 0,
                    bonus: { ...upgrade.bonus }
                });
            }
        }

        return cards;
    }
}
