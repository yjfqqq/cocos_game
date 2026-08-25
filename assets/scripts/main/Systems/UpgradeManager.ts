import type { StatModifier } from '../GameData/EffectData';
import type { BattleBuildRuntime } from '../GameData/BattleBuildData';
import type { BattleRunData } from '../BattleRunData';
import {
    BATTLE_RUN_LEVEL_POLICY,
    PlayerLevelSystem
} from './PlayerLevelSystem';
import { SKILL_DEFINITIONS } from '../GameData/SkillData';
import type { UpgradeCard } from './UpgradeCardGenerator';


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


// 负责局内经验、角色等级和待选择次数。它不控制 BattleSystem 的暂停状态。
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
        this.runtime.pendingLevelUps += result.levelsGained;
        return {
            ...result,
            pendingLevelUps: this.runtime.pendingLevelUps
        };
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
                message: '羁绊卡和基础卡应由卡牌系统处理'
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

        const definition = SKILL_DEFINITIONS.find((skill) => {
            return skill.skillId === card.sourceId;
        });
        const currentLevel = this.runtime.skillLevels[card.sourceId] ?? 0;
        const nextLevel = currentLevel + 1;
        const levelEffect = definition?.levelEffects.find((effect) => {
            return effect.level === nextLevel;
        });

        if (
            !definition ||
            currentLevel >= definition.maxLevel ||
            card.nextLevel !== nextLevel ||
            !levelEffect
        ) {
            return { success: false, message: '该技能升级已失效' };
        }

        this.runtime.skillLevels[card.sourceId] = nextLevel;
        return {
            success: true,
            message: `${definition.skillName}提升至 Lv.${nextLevel}`,
            bonus: { ...levelEffect.effect }
        };
    }
}
