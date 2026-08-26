import type { StatModifier } from '../GameData/EffectData';
import type { BattleBuildRuntime } from '../GameData/BattleBuildData';
import type { BattleRunData } from '../BattleRunData';
import {
    BATTLE_RUN_LEVEL_POLICY,
    PlayerLevelSystem
} from './PlayerLevelSystem';
import {
    canOfferBattleSkillNode,
    getBattleSkillUpgradeDefinition,
    SKILL_DEFINITIONS
} from '../GameData/SkillData';
import type { UpgradeCard } from './UpgradeCardGenerator';
import { BATTLE_BALANCE } from '../BattleBalance';


export interface UpgradeExpResult {
    levelsGained: number;
    attributeGrowth: StatModifier;
    pendingLevelUps: number;
}

export interface UpgradeSelectResult {
    success: boolean;
    message: string;
    bonus?: StatModifier;
}


// 负责局内经验、基础属性成长和技能节点选择次数。
// 羁绊资源与抽卡由 BondGrowthSystem 独立处理。
export class UpgradeManager {

    private readonly playerLevelSystem: PlayerLevelSystem;


    constructor(
        runData: BattleRunData,
        private readonly runtime: BattleBuildRuntime
    ) {
        this.playerLevelSystem = new PlayerLevelSystem(
            runData,
            BATTLE_RUN_LEVEL_POLICY
        );
    }


    addExp(amount: number): UpgradeExpResult {
        const result = this.playerLevelSystem.addExp(amount);
        this.runtime.pendingLevelUps += result.reachedLevels.filter((level) => {
            return (BATTLE_BALANCE.skillChoiceLevels as readonly number[])
                .indexOf(level) >= 0;
        }).length;
        return {
            ...result,
            pendingLevelUps: this.runtime.pendingLevelUps
        };
    }


    addPendingChoices(amount = 1): number {
        this.runtime.pendingLevelUps += Math.max(0, Math.floor(amount));
        return this.runtime.pendingLevelUps;
    }


    getPendingLevelUps(): number {
        return this.runtime.pendingLevelUps;
    }


    selectUpgrade(card: UpgradeCard): UpgradeSelectResult {
        if (this.runtime.pendingLevelUps <= 0) {
            return { success: false, message: '当前没有待选择升级' };
        }

        if (card.kind !== 'skill') {
            return {
                success: false,
                message: '该入口只处理技能节点'
            };
        }

        const result = this.upgradeSkill(card);

        if (result.success) {
            this.runtime.pendingLevelUps--;
        }
        return result;
    }


    clearPendingLevelUps(): void {
        this.runtime.pendingLevelUps = 0;
    }


    consumePendingLevelUp(): boolean {
        if (this.runtime.pendingLevelUps <= 0) {
            return false;
        }
        this.runtime.pendingLevelUps--;
        return true;
    }


    private upgradeSkill(card: UpgradeCard): UpgradeSelectResult {
        if (this.runtime.selectedSkillIds.indexOf(card.sourceId) < 0) {
            return { success: false, message: '该技能未在战前携带' };
        }

        const skillDefinition = SKILL_DEFINITIONS.find((skill) => {
            return skill.skillId === card.sourceId;
        });
        const upgradeDefinition = card.upgradeId
            ? getBattleSkillUpgradeDefinition(card.upgradeId)
            : undefined;
        const levels = this.runtime.skillUpgradeLevels[card.sourceId] ?? {};
        const currentLevel = upgradeDefinition
            ? levels[upgradeDefinition.id] ?? 0
            : 0;
        const nextLevel = currentLevel + 1;

        if (
            !skillDefinition ||
            !upgradeDefinition ||
            currentLevel >= upgradeDefinition.maxRank ||
            card.nextLevel !== nextLevel ||
            !canOfferBattleSkillNode(
                upgradeDefinition,
                card.sourceId,
                this.runtime.skillMetaLevels[card.sourceId] ?? 1,
                levels
            )
        ) {
            return { success: false, message: '该技能升级已失效' };
        }

        levels[upgradeDefinition.id] = nextLevel;
        this.runtime.skillUpgradeLevels[card.sourceId] = levels;
        this.runtime.skillLevels[card.sourceId] = 1 + Object.keys(levels)
            .reduce((total, upgradeId) => total + levels[upgradeId], 0);
        return {
            success: true,
            message: `获得本局技能强化【${skillDefinition.skillName}·` +
                `${upgradeDefinition.name}` +
                `${upgradeDefinition.maxRank > 1 ? ` ${nextLevel}` : ''}】`,
            bonus: { ...upgradeDefinition.bonus }
        };
    }
}
