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
        const attributes: PlayerAttributes = {
            hp: Math.round(
                (base.hp + (effect.hp ?? 0)) *
                (1 + (effect.hpPercent ?? 0) / 100)
            ),
            atk: Math.round(
                (base.atk + (effect.atk ?? 0)) *
                (1 + (effect.attackPercent ?? 0) / 100)
            ),
            def: Math.round(
                (base.def + (effect.def ?? 0)) *
                (1 + (effect.defPercent ?? 0) / 100)
            ),
            crit: base.crit + (effect.crit ?? 0),
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
        target.hp = (target.hp ?? 0) + (effect.hp ?? 0);
        target.atk = (target.atk ?? 0) + (effect.atk ?? 0);
        target.def = (target.def ?? 0) + (effect.def ?? 0);
        target.crit = (target.crit ?? 0) + (effect.crit ?? 0);
        target.attackPercent =
            (target.attackPercent ?? 0) + (effect.attackPercent ?? 0);
        target.hpPercent =
            (target.hpPercent ?? 0) + (effect.hpPercent ?? 0);
        target.defPercent =
            (target.defPercent ?? 0) + (effect.defPercent ?? 0);
    }
}
