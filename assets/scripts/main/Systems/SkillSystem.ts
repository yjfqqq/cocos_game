import {
    SKILL_DEFINITIONS
} from '../GameData/SkillData';
import type {
    SkillDefinition
} from '../GameData/SkillData';
import type {
    PlayerSkillState
} from '../GameData/PlayerData';
import type { StatModifier } from '../GameData/EffectData';


export interface SkillProgressResult {
    success: boolean;
    levelsGained: number;
    level: number;
    exp: number;
}


// 技能状态独立于玩家等级。经验曲线由调用方提供，避免在第一阶段引入新数值。
export class SkillSystem {

    constructor(private readonly skills: PlayerSkillState[]) {}


    getSkills(): PlayerSkillState[] {
        return this.skills.map((skill) => ({ ...skill }));
    }


    learnSkill(skillId: string, level = 1): boolean {

        const definition = this.getDefinition(skillId);
        if (!definition) {
            return false;
        }

        const existing = this.skills.find((skill) => skill.skillId === skillId);
        if (existing) {
            existing.level = Math.min(
                definition.maxLevel,
                Math.max(existing.level, level)
            );
            return true;
        }

        this.skills.push({
            skillId,
            level: Math.min(definition.maxLevel, Math.max(1, level)),
            exp: 0
        });
        return true;
    }


    forgetSkill(skillId: string): boolean {
        const index = this.skills.findIndex((skill) => skill.skillId === skillId);
        if (index < 0) {
            return false;
        }
        this.skills.splice(index, 1);
        return true;
    }


    addSkillExp(
        skillId: string,
        amount: number,
        getExpToNextLevel?: (level: number) => number
    ): SkillProgressResult {

        const state = this.skills.find((skill) => skill.skillId === skillId);
        const definition = this.getDefinition(skillId);

        if (!state || !definition || amount <= 0) {
            return {
                success: false,
                levelsGained: 0,
                level: state?.level ?? 0,
                exp: state?.exp ?? 0
            };
        }

        state.exp += amount;
        let levelsGained = 0;

        while (state.level < definition.maxLevel) {
            const requiredExp = getExpToNextLevel
                ? getExpToNextLevel(state.level)
                : definition.expToNextLevel[state.level - 1];
            if (
                requiredExp === undefined ||
                requiredExp <= 0 ||
                state.exp < requiredExp
            ) {
                break;
            }
            state.exp -= requiredExp;
            state.level++;
            levelsGained++;
        }

        return {
            success: true,
            levelsGained,
            level: state.level,
            exp: state.exp
        };
    }


    getSkillEffect(skillId: string, level?: number): StatModifier {

        const state = this.skills.find((skill) => skill.skillId === skillId);
        const definition = this.getDefinition(skillId);
        const targetLevel = level ?? state?.level ?? definition?.level ?? 0;
        const levelEffect = definition?.levelEffects.find((item) => {
            return item.level === targetLevel;
        });

        return { ...(levelEffect?.effect ?? {}) };
    }


    getDefinition(skillId: string): SkillDefinition | undefined {
        return SKILL_DEFINITIONS.find((skill) => skill.skillId === skillId);
    }
}
