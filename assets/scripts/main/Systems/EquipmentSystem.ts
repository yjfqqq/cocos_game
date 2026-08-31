import {
    EQUIPMENT_DEFINITIONS
} from '../GameData/EquipmentData';
import type {
    EquipmentDefinition,
    EquipmentSlot
} from '../GameData/EquipmentData';
import type {
    PlayerAttributes,
    PlayerEquipmentState
} from '../GameData/PlayerData';
import { normalizePlayerAttributes } from '../GameData/PlayerData';
import type { StatModifier } from '../GameData/EffectData';
import { PlayerLevelSystem } from './PlayerLevelSystem';


export interface EquipmentActionResult {
    success: boolean;
    message: string;
}


export class EquipmentSystem {

    constructor(private readonly equipment: PlayerEquipmentState) {}


    equip(equipmentId: string): EquipmentActionResult {

        const definition = this.getDefinition(equipmentId);
        if (!definition) {
            return { success: false, message: '装备不存在' };
        }

        this.equipment[definition.slot] = equipmentId;
        return { success: true, message: `已装备${definition.equipmentName}` };
    }


    unequip(slot: EquipmentSlot): void {
        this.equipment[slot] = null;
    }


    getEquipped(): PlayerEquipmentState {
        return { ...this.equipment };
    }


    getCombinedEffect(): StatModifier {

        const result: StatModifier = {};

        const equipmentIds = [
            this.equipment.weapon,
            this.equipment.armor,
            this.equipment.accessory
        ];

        for (const equipmentId of equipmentIds) {
            const effect = equipmentId
                ? this.getDefinition(equipmentId)?.effect
                : undefined;
            if (!effect) {
                continue;
            }
            this.mergeEffect(result, effect);
        }

        return result;
    }


    calculateAttributes(base: PlayerAttributes): PlayerAttributes {

        const effect = this.getCombinedEffect();
        const normalized = normalizePlayerAttributes(base);
        const attributes: PlayerAttributes = {
            ...normalized,
            hp: Math.round(
                (normalized.hp + (effect.hp ?? 0)) *
                (1 + (effect.hpPercent ?? 0) / 100)
            ),
            atk: Math.round(
                (normalized.atk + (effect.atk ?? 0)) *
                (1 + (effect.attackPercent ?? 0) / 100)
            ),
            def: Math.round(
                (normalized.def + (effect.def ?? 0)) *
                (1 + (effect.defPercent ?? 0) / 100)
            ),
            strength: normalized.strength + (effect.strength ?? 0) +
                (effect.allStats ?? 0),
            agility: normalized.agility + (effect.agility ?? 0) +
                (effect.allStats ?? 0),
            intelligence: normalized.intelligence +
                (effect.intelligence ?? 0) + (effect.allStats ?? 0),
            crit: normalized.crit + (effect.crit ?? 0),
            power: 0
        };
        attributes.power = PlayerLevelSystem.calculatePower(attributes);
        return attributes;
    }


    private getDefinition(equipmentId: string): EquipmentDefinition | undefined {
        return EQUIPMENT_DEFINITIONS.find((item) => {
            return item.equipmentId === equipmentId;
        });
    }


    private mergeEffect(target: StatModifier, effect: StatModifier): void {
        const keys = Object.keys(effect) as (keyof StatModifier)[];
        for (const key of keys) {
            const value = effect[key];
            if (value !== undefined) {
                target[key] = (target[key] ?? 0) + value;
            }
        }
    }
}
