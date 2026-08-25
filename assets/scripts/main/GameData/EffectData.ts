// 数据层共享的属性增量。所有系统使用同一份结构，避免互相依赖运行时类。
export interface StatModifier {
    hp?: number;
    atk?: number;
    def?: number;
    crit?: number;
    attackPercent?: number;
    hpPercent?: number;
    defPercent?: number;
    attackSpeedPercent?: number;
    critDamagePercent?: number;
    attackRangePercent?: number;
    skillDamagePercent?: number;
    healthRegenPercent?: number;
}
