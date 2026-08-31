import type {
    ThreeKingdomsCardDefinition
} from '../GameData/ThreeKingdomsCardData';

export const MAX_BOND_SLOTS = 10;

export interface BondCardInstance {
    instanceId: string;
    definitionId: string;
    name: string;
    canBeConsumed: boolean;
}

export class BondSlotSystem {
    readonly slots: Array<BondCardInstance | null> =
        Array.from({ length: MAX_BOND_SLOTS }, () => null);
    private instanceSequence = 0;

    addCard(definition: ThreeKingdomsCardDefinition): BondCardInstance | null {
        const slotIndex = this.slots.findIndex((slot) => slot === null);
        if (slotIndex < 0) return null;
        const instance: BondCardInstance = {
            instanceId: `bond-card:${++this.instanceSequence}`,
            definitionId: definition.id,
            name: definition.name,
            canBeConsumed: definition.canBeConsumed
        };
        this.slots[slotIndex] = instance;
        return { ...instance };
    }

    removeCard(instanceId: string): BondCardInstance | null {
        const slotIndex = this.slots.findIndex((slot) => {
            return slot?.instanceId === instanceId;
        });
        if (slotIndex < 0) return null;
        const removed = this.slots[slotIndex];
        this.slots[slotIndex] = null;
        return removed ? { ...removed } : null;
    }

    getByDefinitionId(definitionId: string): BondCardInstance | undefined {
        const slot = this.slots.find((item) => item?.definitionId === definitionId);
        return slot ? { ...slot } : undefined;
    }

    getOccupied(): BondCardInstance[] {
        return this.slots.filter((slot): slot is BondCardInstance => Boolean(slot))
            .map((slot) => ({ ...slot }));
    }

    getAvailableCount(): number {
        return this.slots.filter((slot) => slot === null).length;
    }

    reset(): void {
        this.slots.fill(null);
        this.instanceSequence = 0;
    }
}
