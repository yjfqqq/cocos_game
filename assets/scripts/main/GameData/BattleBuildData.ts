import {
    NORMAL_ATTACK_SKILL_ID,
    SKILL_DEFINITIONS
} from './SkillData';
import {
    BOND_DEFINITIONS,
    TIANGONG_BOND_ID
} from './BondData';


export interface BattleBuildSelection {
    selectedSkillIds: string[];
    selectedBondIds: string[];
}

export interface BattleBuildRuntime extends BattleBuildSelection {
    skillLevels: Record<string, number>;
    bondLevels: Record<string, number>;
    pendingLevelUps: number;
}


export const BATTLE_BUILD_LIMITS = {
    maxEquippedSkills: 4,
    maxEquippedBonds: 3
} as const;


export const DEFAULT_BATTLE_BUILD: BattleBuildSelection = {
    selectedSkillIds: [NORMAL_ATTACK_SKILL_ID],
    selectedBondIds: [TIANGONG_BOND_ID]
};


let lastBattleBuildSelection: BattleBuildSelection = {
    selectedSkillIds: [...DEFAULT_BATTLE_BUILD.selectedSkillIds],
    selectedBondIds: [...DEFAULT_BATTLE_BUILD.selectedBondIds]
};


export function normalizeBattleBuildSelection(
    selection: BattleBuildSelection = DEFAULT_BATTLE_BUILD
): BattleBuildSelection {
    const knownSkillIds = new Set(
        SKILL_DEFINITIONS.map((skill) => skill.skillId)
    );
    const knownBondIds = new Set(
        BOND_DEFINITIONS.map((bond) => bond.bondId)
    );
    const skillIds = [
        NORMAL_ATTACK_SKILL_ID,
        ...selection.selectedSkillIds
    ].filter((id, index, items) => {
        return knownSkillIds.has(id) && items.indexOf(id) === index;
    }).slice(0, BATTLE_BUILD_LIMITS.maxEquippedSkills);
    const bondIds = selection.selectedBondIds
        .filter((id, index, items) => {
            return knownBondIds.has(id) && items.indexOf(id) === index;
        })
        .slice(0, BATTLE_BUILD_LIMITS.maxEquippedBonds);

    return {
        selectedSkillIds: skillIds,
        selectedBondIds: bondIds
    };
}


export function createBattleBuildRuntime(
    selection: BattleBuildSelection
): BattleBuildRuntime {
    const normalized = normalizeBattleBuildSelection(selection);
    const skillLevels: Record<string, number> = {};
    const bondLevels: Record<string, number> = {};

    for (const skillId of normalized.selectedSkillIds) {
        skillLevels[skillId] = 1;
    }
    for (const bondId of normalized.selectedBondIds) {
        bondLevels[bondId] = 0;
    }

    return {
        ...normalized,
        skillLevels,
        bondLevels,
        pendingLevelUps: 0
    };
}


export function getLastBattleBuildSelection(): BattleBuildSelection {
    return normalizeBattleBuildSelection(lastBattleBuildSelection);
}


export function setLastBattleBuildSelection(
    selection: BattleBuildSelection
): void {
    lastBattleBuildSelection = normalizeBattleBuildSelection(selection);
}
