import type { StatModifier } from './EffectData';


export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

export interface EquipmentDefinition {
    equipmentId: string;
    equipmentName: string;
    description: string;
    slot: EquipmentSlot;
    effect: StatModifier;
}


// 扫描阶段未发现现有装备定义。神器继续由 ArtifactData 管理，避免改变旧玩法。
export const EQUIPMENT_DEFINITIONS: EquipmentDefinition[] = [];
