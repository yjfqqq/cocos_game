import { playerData } from './PlayerData';
import { BATTLE_BALANCE } from './BattleBalance';


export interface RunStatBonus {
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


// 每次进入关卡都会创建新的 BattleRunData。
// 它只保存本局等级、经验和属性，不会修改局外 PlayerData。
export class BattleRunData {

    level = 1;
    exp = 0;
    expToNextLevel: number = BATTLE_BALANCE.initialRunLevelExp;

    private baseMaxHp: number;
    private baseAtk: number;
    private baseDef: number;
    private baseCrit: number;

    private attackPercent = 0;
    private hpPercent = 0;
    private defPercent = 0;
    private attackSpeedPercent = 0;
    private critDamagePercent = 0;
    private attackRangePercent = 0;
    private skillDamagePercent = 0;
    private healthRegenPercent = 0;


    constructor() {
        this.baseMaxHp = playerData.hp;
        this.baseAtk = playerData.atk;
        this.baseDef = playerData.def;
        this.baseCrit = playerData.crit;
    }


    addExp(amount: number): number {

        if (amount <= 0) {
            return 0;
        }

        this.exp += amount;
        let levelsGained = 0;

        while (this.exp >= this.expToNextLevel) {
            this.exp -= this.expToNextLevel;
            this.level++;
            levelsGained++;

            // 局内升级自带小幅属性成长，保证前期节奏明显。
            this.baseMaxHp += 10;
            this.baseAtk += 1;

            if (this.level % 2 === 0) {
                this.baseDef += 1;
            }
            if (this.level % 5 === 0) {
                this.baseCrit += 1;
            }

            // 前五级升级极快，之后逐步增加，但上限仅为50经验。
            this.expToNextLevel = Math.min(
                BATTLE_BALANCE.maxRunLevelExp,
                BATTLE_BALANCE.initialRunLevelExp +
                (this.level - 1) * BATTLE_BALANCE.runLevelExpGrowth
            );
        }

        return levelsGained;
    }


    applyBonus(bonus: RunStatBonus): void {

        this.baseMaxHp += Math.max(0, bonus.hp ?? 0);
        this.baseAtk += Math.max(0, bonus.atk ?? 0);
        this.baseDef += Math.max(0, bonus.def ?? 0);
        this.baseCrit += Math.max(0, bonus.crit ?? 0);

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
        return Math.round(this.baseMaxHp * (1 + this.hpPercent / 100));
    }

    get atk(): number {
        return Math.round(this.baseAtk * (1 + this.attackPercent / 100));
    }

    get def(): number {
        return Math.round(this.baseDef * (1 + this.defPercent / 100));
    }

    get crit(): number {
        return this.baseCrit;
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
