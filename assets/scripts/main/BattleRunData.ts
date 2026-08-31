import { BATTLE_BALANCE } from './BattleBalance';
import type {
    AttributeModifier,
    AttributeType,
    DamageSourceType,
    DamageType,
    FinalCombatStats,
    StatModifier
} from './GameData/EffectData';
import {
    gamePlayerData,
    normalizePlayerAttributes
} from './GameData/PlayerData';
import type { PlayerAttributes } from './GameData/PlayerData';
import {
    BATTLE_RUN_LEVEL_POLICY,
    PlayerLevelSystem
} from './Systems/PlayerLevelSystem';

export type RunStatBonus = StatModifier;

// TODO_VERIFY_PRIMARY_STAT_SCALING：第一版只保留真实三维，不写死派生公式。
export const PRIMARY_STAT_SCALING = {
    strengthToHealth: 0,
    agilityToAttackSpeed: 0,
    intelligenceToSkillDamage: 0
} as const;

interface RuntimeGrowth {
    attack: number;
    strength: number;
    agility: number;
    intelligence: number;
}

// 当前关卡唯一的属性汇总中心。永久属性只作为 base 输入，不会被本局成长回写。
export class BattleRunData {
    playerLevel = 1;
    playerExp = 0;
    expToNextLevel: number = BATTLE_BALANCE.runLevelExpTable[0];
    attributes: PlayerAttributes;

    private readonly baseAttributes: PlayerAttributes;
    private readonly modifiersBySource = new Map<string, AttributeModifier[]>();
    private legacySourceSequence = 0;
    private finalStatsCache!: FinalCombatStats;
    private readonly runGrowth: RuntimeGrowth = {
        attack: 0,
        strength: 0,
        agility: 0,
        intelligence: 0
    };

    constructor(
        initialAttributes: Partial<PlayerAttributes> = gamePlayerData.attributes
    ) {
        this.baseAttributes = normalizePlayerAttributes(initialAttributes);
        this.attributes = { ...this.baseAttributes };
        this.recalculateCombatStats();
    }

    get level(): number { return this.playerLevel; }
    set level(value: number) { this.playerLevel = value; }
    get exp(): number { return this.playerExp; }
    set exp(value: number) { this.playerExp = value; }

    addExp(amount: number): number {
        return new PlayerLevelSystem(
            this,
            BATTLE_RUN_LEVEL_POLICY
        ).addExp(amount).levelsGained;
    }

    // 兼容升级、技能和装备的旧入口；新系统应传稳定 sourceId。
    applyBonus(bonus: RunStatBonus, sourceId?: string): void {
        this.registerStatModifier(
            sourceId ?? `legacy:${++this.legacySourceSequence}`,
            bonus
        );
    }

    registerStatModifier(sourceId: string, bonus: StatModifier): void {
        this.removeModifiersBySource(sourceId, false);
        const modifiers = this.convertStatModifier(sourceId, bonus);
        if (modifiers.length > 0) {
            this.modifiersBySource.set(sourceId, modifiers);
        }
        this.recalculateCombatStats();
    }

    registerAttributeModifier(modifier: AttributeModifier): void {
        const existing = this.modifiersBySource.get(modifier.sourceId) ?? [];
        existing.push({ ...modifier });
        this.modifiersBySource.set(modifier.sourceId, existing);
        this.recalculateCombatStats();
    }

    removeModifiersBySource(sourceId: string, recalculate = true): boolean {
        const removed = this.modifiersBySource.delete(sourceId);
        if (removed && recalculate) {
            this.recalculateCombatStats();
        }
        return removed;
    }

    addRunGrowth(attribute: keyof RuntimeGrowth, amount: number): void {
        this.runGrowth[attribute] += amount;
        this.recalculateCombatStats();
    }

    getRunGrowth(): Readonly<RuntimeGrowth> {
        return { ...this.runGrowth };
    }

    getFinalCombatStats(): FinalCombatStats {
        return { ...this.finalStatsCache };
    }

    recalculateCombatStats(): FinalCombatStats {
        const flat = new Map<AttributeType, number>();
        const percent = new Map<AttributeType, number>();
        for (const modifiers of this.modifiersBySource.values()) {
            for (const modifier of modifiers) {
                const target = modifier.mode === 'flat' ? flat : percent;
                target.set(
                    modifier.attribute,
                    (target.get(modifier.attribute) ?? 0) + modifier.value
                );
            }
        }
        const f = (attribute: AttributeType): number => flat.get(attribute) ?? 0;
        const p = (attribute: AttributeType): number =>
            percent.get(attribute) ?? 0;

        const strength = (
            this.baseAttributes.strength + f('strength') +
            this.runGrowth.strength
        ) * (1 + p('strength'));
        const agility = (
            this.baseAttributes.agility + f('agility') +
            this.runGrowth.agility
        ) * (1 + p('agility'));
        const intelligence = (
            this.baseAttributes.intelligence + f('intelligence') +
            this.runGrowth.intelligence
        ) * (1 + p('intelligence'));
        const attack = (
            this.baseAttributes.atk + f('attack') + this.runGrowth.attack
        ) * (1 + p('attack'));
        const maxHp = (this.baseAttributes.hp + f('maxHp')) *
            (1 + p('maxHp'));
        const armor = (this.baseAttributes.def + f('armor')) *
            (1 + p('armor'));
        const genericCrit = this.baseAttributes.crit + f('criticalChance');

        this.finalStatsCache = {
            attack,
            maxHp,
            armor,
            strength,
            agility,
            intelligence,
            attackSpeed: Math.max(0.01, (
                this.baseAttributes.attackSpeed + f('attackSpeed')
            ) * (1 + p('attackSpeed'))),
            skillHaste: this.baseAttributes.skillHaste + f('skillHaste'),
            physicalDamageBonus: this.baseAttributes.physicalDamageBonus +
                p('physicalDamage'),
            magicDamageBonus: this.baseAttributes.magicDamageBonus +
                p('magicDamage'),
            basicAttackDamageBonus: this.baseAttributes.basicAttackDamageBonus +
                p('basicAttackDamage'),
            multiHitDamageBonus: p('multiHitDamage'),
            bounceDamageBonus: p('bounceDamage'),
            skillDamageBonus: this.baseAttributes.skillDamageBonus +
                p('skillDamage'),
            physicalCritChance: genericCrit +
                this.baseAttributes.physicalCrit + f('physicalCrit'),
            magicCritChance: genericCrit +
                this.baseAttributes.magicCrit + f('magicCrit'),
            physicalCritDamage: this.baseAttributes.physicalCritDamage +
                p('criticalDamage') + p('physicalCritDamage'),
            magicCritDamage: this.baseAttributes.magicCritDamage +
                p('criticalDamage') + p('magicCritDamage'),
            blockChance: this.baseAttributes.block + f('block')
        };

        this.attributes = {
            ...this.baseAttributes,
            hp: maxHp,
            atk: attack,
            def: armor,
            strength,
            agility,
            intelligence,
            attackSpeed: this.finalStatsCache.attackSpeed,
            skillHaste: this.finalStatsCache.skillHaste,
            physicalCrit: this.finalStatsCache.physicalCritChance,
            magicCrit: this.finalStatsCache.magicCritChance,
            physicalCritDamage: this.finalStatsCache.physicalCritDamage,
            magicCritDamage: this.finalStatsCache.magicCritDamage,
            block: this.finalStatsCache.blockChance,
            physicalDamageBonus: this.finalStatsCache.physicalDamageBonus,
            magicDamageBonus: this.finalStatsCache.magicDamageBonus,
            basicAttackDamageBonus: this.finalStatsCache.basicAttackDamageBonus,
            skillDamageBonus: this.finalStatsCache.skillDamageBonus
        };
        return this.getFinalCombatStats();
    }

    getDamageMultiplier(type: DamageType, source: DamageSourceType): number {
        const typeBonus = type === 'physical'
            ? this.finalStatsCache.physicalDamageBonus
            : type === 'magic'
                ? this.finalStatsCache.magicDamageBonus
                : 0;
        const sourceBonus = source === 'basicAttack'
            ? this.finalStatsCache.basicAttackDamageBonus
            : source === 'skill'
                ? this.finalStatsCache.skillDamageBonus
                : 0;
        return Math.max(0, 1 + typeBonus + sourceBonus);
    }

    get multiHitDamageMultiplier(): number {
        return 1 + this.finalStatsCache.multiHitDamageBonus;
    }

    get bounceDamageMultiplier(): number {
        return 1 + this.finalStatsCache.bounceDamageBonus;
    }

    get maxHp(): number { return Math.round(this.finalStatsCache.maxHp); }
    get atk(): number { return Math.round(this.finalStatsCache.attack); }
    get def(): number { return Math.round(this.finalStatsCache.armor); }
    get strength(): number { return this.finalStatsCache.strength; }
    get agility(): number { return this.finalStatsCache.agility; }
    get intelligence(): number { return this.finalStatsCache.intelligence; }
    get crit(): number { return this.finalStatsCache.physicalCritChance; }
    get critDamageMultiplier(): number {
        return this.finalStatsCache.physicalCritDamage;
    }
    get attackInterval(): number {
        return Math.max(0.2, 0.55 / this.finalStatsCache.attackSpeed);
    }
    get secondaryStatsText(): string {
        return `力量 ${Math.round(this.strength)} · 敏捷 ${Math.round(this.agility)}` +
            ` · 智力 ${Math.round(this.intelligence)}`;
    }
    get detailedStatsText(): string {
        return `攻速 ${this.finalStatsCache.attackSpeed.toFixed(2)}` +
            ` · 急速 ${Math.round(this.finalStatsCache.skillHaste)}` +
            ` · 物伤 ${Math.round(this.finalStatsCache.physicalDamageBonus * 100)}%` +
            ` · 法伤 ${Math.round(this.finalStatsCache.magicDamageBonus * 100)}%`;
    }
    get healthRegenBonus(): number {
        return this.getPercentTotal('healthRegen') * 100;
    }
    get skillDamageMultiplier(): number {
        return 1 + this.finalStatsCache.skillDamageBonus;
    }

    private getPercentTotal(attribute: AttributeType): number {
        let total = 0;
        for (const modifiers of this.modifiersBySource.values()) {
            for (const modifier of modifiers) {
                if (modifier.attribute === attribute && modifier.mode === 'percent') {
                    total += modifier.value;
                }
            }
        }
        return total;
    }

    private convertStatModifier(
        sourceId: string,
        bonus: StatModifier
    ): AttributeModifier[] {
        const result: AttributeModifier[] = [];
        const flat = (attribute: AttributeType, value?: number): void => {
            if (value !== undefined && value !== 0) {
                result.push({ sourceId, attribute, mode: 'flat', value });
            }
        };
        const percent = (attribute: AttributeType, value?: number): void => {
            if (value !== undefined && value !== 0) {
                result.push({
                    sourceId,
                    attribute,
                    mode: 'percent',
                    value: value / 100
                });
            }
        };

        flat('maxHp', bonus.hp);
        flat('attack', bonus.atk);
        flat('armor', bonus.def);
        flat('criticalChance', bonus.crit);
        flat('strength', (bonus.strength ?? 0) + (bonus.allStats ?? 0));
        flat('agility', (bonus.agility ?? 0) + (bonus.allStats ?? 0));
        flat('intelligence', (bonus.intelligence ?? 0) + (bonus.allStats ?? 0));
        flat('skillHaste', bonus.skillHaste);
        flat('physicalCrit', bonus.physicalCrit);
        flat('magicCrit', bonus.magicCrit);
        flat('block', bonus.block);

        percent('maxHp', bonus.hpPercent);
        percent('attack', bonus.attackPercent);
        percent('armor', bonus.defPercent);
        percent('strength', (bonus.strengthPercent ?? 0) +
            (bonus.allStatsPercent ?? 0));
        percent('agility', (bonus.agilityPercent ?? 0) +
            (bonus.allStatsPercent ?? 0));
        percent('intelligence', (bonus.intelligencePercent ?? 0) +
            (bonus.allStatsPercent ?? 0));
        percent('attackSpeed', bonus.attackSpeedPercent);
        percent('physicalDamage', bonus.physicalDamagePercent);
        percent('magicDamage', bonus.magicDamagePercent);
        percent('basicAttackDamage', bonus.basicAttackDamagePercent);
        percent('multiHitDamage', bonus.multiHitDamagePercent);
        percent('bounceDamage', bonus.bounceDamagePercent);
        percent('skillDamage', bonus.skillDamagePercent);
        percent('criticalDamage', bonus.critDamagePercent);
        percent('physicalCritDamage', bonus.physicalCritDamagePercent);
        percent('magicCritDamage', bonus.magicCritDamagePercent);
        percent('healthRegen', bonus.healthRegenPercent);
        percent('attackRange', bonus.attackRangePercent);
        return result;
    }
}
