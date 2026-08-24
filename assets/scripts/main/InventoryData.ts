import {
    addPlayerExp,
    spendGold
} from './PlayerData';


export interface ItemDefinition {
    id: string;
    name: string;
    description: string;
    price: number;
    expReward: number;
}

export interface InventoryItem extends ItemDefinition {
    quantity: number;
}

export interface ItemActionResult {
    success: boolean;
    message: string;
}


// 第一版只放入一个可验证完整流程的消耗品：
// 战斗获得金币 -> 商店购买 -> 背包使用 -> 获得经验。
export const ITEM_DEFINITIONS: ItemDefinition[] = [
    {
        id: 'cultivation-pill',
        name: '修炼丹',
        description: '服用后获得 50 点经验',
        price: 20,
        expReward: 50
    }
];

const itemQuantities = new Map<string, number>();


export function getInventoryItems(): InventoryItem[] {

    return ITEM_DEFINITIONS.map((definition) => ({
        ...definition,
        quantity: itemQuantities.get(definition.id) ?? 0
    }));
}


export function buyItem(itemId: string): ItemActionResult {

    const item = ITEM_DEFINITIONS.find((definition) => {
        return definition.id === itemId;
    });

    if (!item) {
        return {
            success: false,
            message: '商品不存在'
        };
    }

    if (!spendGold(item.price)) {
        return {
            success: false,
            message: `金币不足，需要 ${item.price} 金币`
        };
    }

    const quantity = itemQuantities.get(item.id) ?? 0;
    itemQuantities.set(item.id, quantity + 1);

    return {
        success: true,
        message: `获得 ${item.name} ×1`
    };
}


export function useItem(itemId: string): ItemActionResult {

    const item = ITEM_DEFINITIONS.find((definition) => {
        return definition.id === itemId;
    });

    const quantity = itemQuantities.get(itemId) ?? 0;

    if (!item || quantity <= 0) {
        return {
            success: false,
            message: '背包中没有该道具'
        };
    }

    itemQuantities.set(item.id, quantity - 1);
    addPlayerExp(item.expReward);

    return {
        success: true,
        message: `使用 ${item.name}，获得经验 +${item.expReward}`
    };
}
