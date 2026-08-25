import { BATTLE_BALANCE } from './BattleBalance';
import type { StatModifier } from './GameData/EffectData';
import {
    gamePlayerData
} from './GameData/PlayerData';
import type {
    PlayerAttributes
} from './GameData/PlayerData';
import {
    BATTLE_RUN_LEVEL_POLICY,
    PlayerLevelSystem
} from './Systems/PlayerLevelSystem';


// 旧类型名保留，实际结构已经上移到共享数据层。
export type RunStatBonus = StatModifier;


// 每次进入关卡创建一份运行时状态，不会直接改写局外 PlayerData。
export class BattleRunData {

    playerLevel = 1;
    playerExp = 0;
    expToNextLevel: number = BATTLE_BALANCE.initialRunLevelExp;
    attributes: PlayerAttributes;

    private attackPercent = 0;
    private hpPercent = 0;
    private defPercent = 0;
    private attackSpeedPercent = 0;
    private critDamagePercent = 0;
    private attackRangePercent = 0;
    private skillDamagePercent = 0;
    private healthRegenPercent = 0;


    constructor(initialAttributes: PlayerAttributes = gamePlayerData.attributes) {
        this.attributes = { ...initialAttributes };
    }


    // 兼容旧字段名。
    get level(): number {
        return this.playerLevel;
    }

    set level(value: number) {
        this.playerLevel = value;
    }

    get exp(): number {
        return this.playerExp;
    }

    set exp(value: number) {
        this.playerExp = value;
    }


    // 兼容旧调用；新 BattleSystem 直接调用 PlayerLevelSystem。
    addExp(amount: number): number {
        return new PlayerLevelSystem(
            this,
            BATTLE_RUN_LEVEL_POLICY
        ).addExp(amount).levelsGained;
    }


    applyBonus(bonus: RunStatBonus): void {
        this.attributes.hp += Math.max(0, bonus.hp ?? 0);
        this.attributes.atk += Math.max(0, bonus.atk ?? 0);
        this.attributes.def += Math.max(0, bonus.def ?? 0);
        this.attributes.crit += Math.max(0, bonus.crit ?? 0);

        this.attackPercent += Math.max(0, bonus.attackPercent ?? 0);
        this.hpPercent += Math.max(0, bonus.hpPercent ?? 0);
        this.defPercent += Math.max(0, bonus.defPercent ?? 0);
        this.attackSpeedPercent += Math.max(0, bonus.attackSpeedPercent ?? 0);
        this.critDamagePercent += Math.max(0, bonus.critDamagePercent ?? 0);
        this.attackRangePercent += Math.max(0, bonus.attackRangePercent ?? 0);
        this.skillDamagePercent += Math.max(0, bonus.skillDamagePercent ?? 0);
        this.healthRegenPercent += Math.max(0, bonus.healthRegenPercent ?? 0);
    }


    get maxHp(): number {
        return Math.round(this.attributes.hp * (1 + this.hpPercent / 100));
    }

    get atk(): number {
        return Math.round(this.attributes.atk * (1 + this.attackPercent / 100));
    }

    get def(): number {
        return Math.round(this.attributes.def * (1 + this.defPercent / 100));
    }

    get crit(): number {
        return this.attributes.crit;
    }

    get critDamageMultiplier(): number {
        return 1.5 + this.critDamagePercent / 100;
    }

    get attackInterval(): number {
        return Math.max(0.2, 0.55 / (1 + this.attackSpeedPercent / 100));
    }

    get secondaryStatsText(): string {
        return `攻速 +${this.attackSpeedPercent}% · 范围 +${this.attackRangePercent}% · 技能 +${this.skillDamagePercent}%`;
    }

    get healthRegenBonus(): number {
        return this.healthRegenPercent;
    }
}
