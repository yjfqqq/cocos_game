import {
    FACTION_DEFINITIONS
} from '../GameData/FactionData';
import type {
    FactionBranchDefinition,
    FactionBranchId,
    FactionDefinition
} from '../GameData/FactionData';
import type { StatModifier } from '../GameData/EffectData';
import { SkillSystem } from './SkillSystem';


export interface FactionProgressResult {
    messages: string[];
    bonuses: StatModifier[];
}


export class FactionSystem {

    private currentFaction: FactionDefinition;
    private completedCardIds = new Set<string>();
    private activeBranchStrengthenings = new Set<FactionBranchId>();
    private ultimateActive = false;


    constructor(
        factionId: string,
        private readonly skillSystem: SkillSystem
    ) {
        this.currentFaction = this.resolveFaction(factionId);
    }


    setCurrentFaction(factionId: string): boolean {
        const faction = FACTION_DEFINITIONS.find((item) => item.id === factionId);
        if (!faction) {
            return false;
        }
        this.currentFaction = faction;
        return true;
    }


    getCurrentFaction(): FactionDefinition {
        return this.currentFaction;
    }


    getBranches(): FactionBranchDefinition[] {
        return this.currentFaction.branches;
    }


    getFactionCardPool(): string[] {
        return [...this.currentFaction.factionCardPool];
    }


    isBranchStrengtheningActive(branchId: FactionBranchId): boolean {
        return this.activeBranchStrengthenings.has(branchId);
    }


    isUltimateActive(): boolean {
        return this.ultimateActive;
    }


    syncCardProgress(completedCardIds: ReadonlySet<string>): FactionProgressResult {

        this.completedCardIds = new Set(completedCardIds);
        const messages: string[] = [];
        const bonuses: StatModifier[] = [];

        for (const branch of this.currentFaction.branches) {
            if (
                !this.ultimateActive &&
                !this.activeBranchStrengthenings.has(branch.id) &&
                branch.cardPool.every((id) => this.completedCardIds.has(id))
            ) {
                this.activeBranchStrengthenings.add(branch.id);
                this.skillSystem.learnSkill(branch.strengtheningSkill);
                bonuses.push(
                    this.skillSystem.getSkillEffect(branch.strengtheningSkill)
                );
                messages.push(`六名神将全部归位，合成红色【${branch.name}】！`);
            }
        }

        if (
            !this.ultimateActive &&
            this.activeBranchStrengthenings.size ===
                this.currentFaction.branches.length
        ) {
            this.ultimateActive = true;

            for (const branch of this.currentFaction.branches) {
                this.skillSystem.forgetSkill(branch.strengtheningSkill);
            }
            this.activeBranchStrengthenings.clear();

            this.skillSystem.learnSkill(this.currentFaction.ultimateSkill);
            bonuses.push(
                this.skillSystem.getSkillEffect(this.currentFaction.ultimateSkill)
            );
            messages.push('战神、雷部、天王合一，彩色【天宫】降临！');
        }

        return { messages, bonuses };
    }


    getProgressText(): string {
        return this.currentFaction.branches
            .map((branch) => {
                const completed = branch.cardPool.filter((id) => {
                    return this.completedCardIds.has(id);
                }).length;
                return `${branch.name} ${completed}/${branch.cardPool.length}`;
            })
            .join(' · ');
    }


    getSlotDescriptions(): string[] {
        if (this.ultimateActive) {
            return ['彩色·天宫'];
        }

        return this.currentFaction.branches
            .filter((branch) => {
                return this.activeBranchStrengthenings.has(branch.id);
            })
            .map((branch) => `红色·${branch.name}`);
    }


    getOccupiedSlotCount(): number {
        return this.ultimateActive ? 1 : this.activeBranchStrengthenings.size;
    }


    private resolveFaction(factionId: string): FactionDefinition {
        return FACTION_DEFINITIONS.find((item) => item.id === factionId) ??
            FACTION_DEFINITIONS[0];
    }
}
