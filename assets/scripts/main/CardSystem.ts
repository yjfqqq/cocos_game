// 旧模块路径保留，避免 BattleUI 和外部脚本一次性迁移。
export {
    BattleCardSystem,
    CardSystem
} from './Systems/CardSystem';
export type {
    CardChoice,
    CardProgressResult,
    CardSelectResult
} from './Systems/CardSystem';
export {
    ALL_CARDS,
    FACTION_CARD,
    FACTION_CARDS,
    LEGEND_CARD,
    LEGEND_CARDS,
    NORMAL_CARD,
    NORMAL_CARDS
} from './GameData/CardData';
export type {
    CardCategory,
    CardDefinition,
    CardType,
    FactionCardDefinition,
    GeneralQuality,
    LegendCardDefinition,
    NormalCardDefinition,
    TiangongBranch
} from './GameData/CardData';
