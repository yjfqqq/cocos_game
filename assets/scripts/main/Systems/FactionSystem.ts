import {
    BOND_DEFINITIONS,
    TIANGONG_BOND_ID
} from '../GameData/BondData';
import type {
    BondBranchDefinition,
    BondBranchId,
    BondDefinition
} from '../GameData/BondData';
import type { StatModifier } from '../GameData/EffectData';


export interface BondProgressResult {
    messages: string[];
    bonuses: StatModifier[];
}


// 文件名与部分方法名暂时保留兼容；实际产品概念已经统一为“羁绊”。
export class BondSystem {

    private currentBond: BondDefinition;
    private completedCardIds = new Set<string>();
    private activeBranchStrengthenings = new Set<BondBranchId>();
    private ultimateActive = false;


    constructor(bondId: string = TIANGONG_BOND_ID) {
        this.currentBond = this.resolveBond(bondId);
    }


    setCurrentBond(bondId: string): boolean {
        const bond = BOND_DEFINITIONS.find((item) => item.bondId === bondId);
        if (!bond) {
            return false;
        }
        this.currentBond = bond;
        return true;
    }


    getCurrentBond(): BondDefinition {
        return this.currentBond;
    }


    getBranches(): BondBranchDefinition[] {
        return this.currentBond.branches;
    }


    getBondCardPool(): string[] {
        return [...this.currentBond.bondCardPool];
    }


    isBranchStrengtheningActive(branchId: BondBranchId): boolean {
        return this.activeBranchStrengthenings.has(branchId);
    }


    isUltimateActive(): boolean {
        return this.ultimateActive;
    }


    syncCardProgress(completedCardIds: ReadonlySet<string>): BondProgressResult {

        this.completedCardIds = new Set(completedCardIds);
        const messages: string[] = [];
        const bonuses: StatModifier[] = [];

        for (const branch of this.currentBond.branches) {
            if (
                !this.ultimateActive &&
                !this.activeBranchStrengthenings.has(branch.id) &&
                branch.cardPool.every((id) => this.completedCardIds.has(id))
            ) {
                this.activeBranchStrengthenings.add(branch.id);
                bonuses.push({ ...branch.completionBonus });
                messages.push(
                    `六张${branch.name}羁绊卡吞噬归位，合成红色【${branch.name}】！`
                );
            }
        }

        if (
            !this.ultimateActive &&
            this.activeBranchStrengthenings.size ===
                this.currentBond.branches.length
        ) {
            this.ultimateActive = true;

            this.activeBranchStrengthenings.clear();
            bonuses.push({ ...this.currentBond.ultimateBonus });
            messages.push(
                `战神、雷部、天王羁绊合一，【${this.currentBond.ultimateName}】降临！`
            );
        }

        return { messages, bonuses };
    }


    getProgressText(): string {
        return this.currentBond.branches
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
            return [this.currentBond.ultimateName];
        }

        return this.currentBond.branches
            .filter((branch) => {
                return this.activeBranchStrengthenings.has(branch.id);
            })
            .map((branch) => `红色·${branch.name}`);
    }


    getOccupiedSlotCount(): number {
        return this.ultimateActive ? 1 : this.activeBranchStrengthenings.size;
    }


    // 以下旧名称只是兼容层，不参与新代码命名。
    setCurrentFaction(factionId: string): boolean {
        return this.setCurrentBond(
            factionId === 'tiangong' ? TIANGONG_BOND_ID : factionId
        );
    }

    getCurrentFaction(): BondDefinition {
        return this.getCurrentBond();
    }

    getFactionCardPool(): string[] {
        return this.getBondCardPool();
    }


    private resolveBond(bondId: string): BondDefinition {
        const normalizedId = bondId === 'tiangong'
            ? TIANGONG_BOND_ID
            : bondId;
        return BOND_DEFINITIONS.find((item) => {
            return item.bondId === normalizedId;
        }) ?? BOND_DEFINITIONS[0];
    }
}


// 旧导入名继续有效，避免尚未迁移的外围代码失效。
export { BondSystem as FactionSystem };
export type FactionProgressResult = BondProgressResult;
