import {
    getSkillLevelDefinition,
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

export interface SkillFragmentResult {
    success: boolean;
    message: string;
    level: number;
    fragments: number;
    fragmentsRequired: number;
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
            fragments: 0,
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

        state.exp = (state.exp ?? 0) + amount;
        let levelsGained = 0;

        while (state.level < definition.maxLevel) {
            const requiredExp = getExpToNextLevel
                ? getExpToNextLevel(state.level)
                : definition.expToNextLevel[state.level - 1];
            if (
                requiredExp === undefined ||
                requiredExp <= 0 ||
                (state.exp ?? 0) < requiredExp
            ) {
                break;
            }
            state.exp = (state.exp ?? 0) - requiredExp;
            state.level++;
            levelsGained++;
        }

        return {
            success: true,
            levelsGained,
            level: state.level,
            exp: state.exp ?? 0
        };
    }


    addSkillFragments(skillId: string, amount: number): SkillFragmentResult {
        const state = this.skills.find((skill) => skill.skillId === skillId);
        const definition = this.getDefinition(skillId);
        if (!state || !definition || amount <= 0) {
            return this.getFragmentResult(
                state,
                false,
                '技能不存在或碎片数量无效'
            );
        }
        state.fragments = Math.max(0, state.fragments ?? 0) +
            Math.floor(amount);
        return this.getFragmentResult(
            state,
            true,
            `获得${definition.skillName}碎片 ×${Math.floor(amount)}`
        );
    }


    upgradeWithFragments(skillId: string): SkillFragmentResult {
        const state = this.skills.find((skill) => skill.skillId === skillId);
        const definition = this.getDefinition(skillId);
        if (!state || !definition) {
            return this.getFragmentResult(state, false, '技能不存在');
        }
        if (state.level >= definition.maxLevel) {
            return this.getFragmentResult(state, false, '技能已满级');
        }

        const nextLevel = state.level + 1;
        const required = getSkillLevelDefinition(
            skillId,
            nextLevel
        )?.fragmentsRequired ?? Number.POSITIVE_INFINITY;
        if ((state.fragments ?? 0) < required) {
            return this.getFragmentResult(
                state,
                false,
                `碎片不足，还需要${required - (state.fragments ?? 0)}个`
            );
        }

        state.fragments -= required;
        state.level = nextLevel;
        return this.getFragmentResult(
            state,
            true,
            `${definition.skillName}永久提升至 Lv.${nextLevel}`
        );
    }


    getSkillState(skillId: string): PlayerSkillState | undefined {
        const state = this.skills.find((skill) => skill.skillId === skillId);
        return state ? { ...state } : undefined;
    }


    getSkillEffect(skillId: string, level?: number): StatModifier {

        const state = this.skills.find((skill) => skill.skillId === skillId);
        const definition = this.getDefinition(skillId);
        const targetLevel = level ?? state?.level ?? definition?.level ?? 0;
        const result: StatModifier = {};
        const keys: (keyof StatModifier)[] = [
            'hp', 'atk', 'def', 'crit', 'attackPercent', 'hpPercent',
            'defPercent', 'attackSpeedPercent', 'critDamagePercent',
            'attackRangePercent', 'skillDamagePercent', 'healthRegenPercent'
        ];
        const unlocked = definition?.levelEffects.filter((item) => {
            return item.level <= targetLevel;
        }) ?? [];
        for (const levelEffect of unlocked) {
            for (const key of keys) {
                const value = levelEffect.effect[key];
                if (value !== undefined) {
                    result[key] = (result[key] ?? 0) + value;
                }
            }
        }
        return result;
    }


    getDefinition(skillId: string): SkillDefinition | undefined {
        return SKILL_DEFINITIONS.find((skill) => skill.skillId === skillId);
    }


    private getFragmentResult(
        state: PlayerSkillState | undefined,
        success: boolean,
        message: string
    ): SkillFragmentResult {
        const definition = state
            ? this.getDefinition(state.skillId)
            : undefined;
        const fragmentsRequired = state && definition &&
            state.level < definition.maxLevel
            ? getSkillLevelDefinition(
                state.skillId,
                state.level + 1
            )?.fragmentsRequired ?? 0
            : 0;
        return {
            success,
            message,
            level: state?.level ?? 0,
            fragments: state?.fragments ?? 0,
            fragmentsRequired
        };
    }
}
