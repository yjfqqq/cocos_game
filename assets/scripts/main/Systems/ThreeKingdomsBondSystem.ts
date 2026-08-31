import type { BattleRunData } from '../BattleRunData';
import {
    THREE_KINGDOMS_CONFIG,
    THREE_KINGDOMS_CORE_CARDS,
    THREE_KINGDOMS_EX_CARD,
    THREE_KINGDOMS_FACTIONS,
    THREE_KINGDOMS_MATERIAL_CARDS,
    THREE_KINGDOMS_STARTER_CARD,
    THREE_KINGDOMS_UR_CARDS,
    getThreeKingdomsCard,
    getThreeKingdomsCoreId,
    getThreeKingdomsUrId
} from '../GameData/ThreeKingdomsCardData';
import type {
    ThreeKingdomsCardDefinition,
    ThreeKingdomsFactionId,
    ThreeKingdomsResourceEffect
} from '../GameData/ThreeKingdomsCardData';
import { BondSlotSystem } from './BondSlotSystem';
import type { BondCardInstance } from './BondSlotSystem';

export interface ThreeKingdomsAcquireResult {
    success: boolean;
    message: string;
    instanceId?: string;
    resourceEffect?: ThreeKingdomsResourceEffect;
}

export interface ThreeKingdomsKillResult {
    consumed: boolean;
    messages: string[];
}

export interface ThreeKingdomsUpdateResult {
    changed: boolean;
    messages: string[];
}

interface ThreeKingdomsFactionRuntime {
    factionId: ThreeKingdomsFactionId;
    coreAcquired: boolean;
    coreKillCounter: number;
    consumedCount: number;
    consumedCardIds: string[];
    countedDefinitionIds: Set<string>;
    urAdded: boolean;
}

const STARTER_GROWTH_ATTRIBUTES = [
    'strength',
    'agility',
    'intelligence'
] as const;

export class ThreeKingdomsBondSystem {
    private starterAcquired = false;
    private starterGrowthTimer = 0;
    private threeKingdomsClosed = false;
    private readonly factionRuntime =
        new Map<ThreeKingdomsFactionId, ThreeKingdomsFactionRuntime>();
    private readonly completedUrFactions = new Set<ThreeKingdomsFactionId>();
    private exActive = false;
    private exKillCounter = 0;
    private exConsumedCount = 0;

    constructor(
        private readonly slots: BondSlotSystem,
        private readonly runData: BattleRunData,
        private readonly random: () => number = Math.random
    ) {
        this.initializeFactionRuntime();
    }

    getAvailableCards(): ThreeKingdomsCardDefinition[] {
        if (this.threeKingdomsClosed || this.slots.getAvailableCount() <= 0) {
            return [];
        }
        if (!this.starterAcquired) return [THREE_KINGDOMS_STARTER_CARD];

        const result: ThreeKingdomsCardDefinition[] = [];
        for (const core of THREE_KINGDOMS_CORE_CARDS) {
            if (!core.factionId || this.getRuntime(core.factionId).coreAcquired) {
                continue;
            }
            result.push(core);
        }
        for (const material of THREE_KINGDOMS_MATERIAL_CARDS) {
            const factionId = material.factionId;
            if (!factionId) continue;
            const runtime = this.getRuntime(factionId);
            if (!runtime.coreAcquired) continue;
            if (
                THREE_KINGDOMS_CONFIG.closeMaterialPoolAfterUr &&
                runtime.urAdded
            ) {
                continue;
            }
            if (
                !THREE_KINGDOMS_CONFIG.duplicateConsumeCounts &&
                (
                    runtime.countedDefinitionIds.has(material.id) ||
                    this.slots.getOccupied().some((slot) => {
                        return slot.definitionId === material.id;
                    })
                )
            ) {
                continue;
            }
            result.push(material);
        }
        return result;
    }

    acquireCard(cardId: string): ThreeKingdomsAcquireResult {
        const definition = getThreeKingdomsCard(cardId);
        if (
            !definition ||
            !this.getAvailableCards().some((card) => card.id === cardId)
        ) {
            return { success: false, message: '该三国羁绊卡当前无法获得' };
        }
        const instance = this.slots.addCard(definition);
        if (!instance) return { success: false, message: '羁绊卡槽已满' };

        this.applyCardEffects(instance, definition);
        const messages = [`获得${definition.rarity}卡【${definition.name}】`];

        if (definition.role === 'starter') {
            this.starterAcquired = true;
            this.starterGrowthTimer = 0;
            messages.push('曹操、刘备、孙权、董卓已加入后续羁绊卡池');
        } else if (definition.role === 'core' && definition.factionId) {
            const runtime = this.getRuntime(definition.factionId);
            runtime.coreAcquired = true;
            runtime.coreKillCounter = 0;
            messages.push(
                `${this.getFactionName(definition.factionId)} 10 张阵营卡已开放`
            );
        } else if (definition.role === 'material') {
            messages.push('材料已进入卡牌栏，将等待对应主公每 200 杀吞噬');
        }

        return {
            success: true,
            message: messages.join('；'),
            instanceId: instance.instanceId,
            resourceEffect: definition.resourceEffect
                ? { ...definition.resourceEffect }
                : undefined
        };
    }

    recordKill(): ThreeKingdomsKillResult {
        if (this.exActive) return this.processExKill();
        if (this.threeKingdomsClosed) {
            return { consumed: false, messages: [] };
        }

        const messages: string[] = [];
        let consumed = false;
        for (const faction of THREE_KINGDOMS_FACTIONS) {
            if (this.threeKingdomsClosed) break;
            const runtime = this.getRuntime(faction.id);
            // TODO_VERIFY_CORE_CONTINUES_DEVOUR_AFTER_UR
            if (!runtime.coreAcquired || runtime.urAdded) continue;
            runtime.coreKillCounter++;
            if (
                runtime.coreKillCounter <
                THREE_KINGDOMS_CONFIG.coreConsumeKillInterval
            ) {
                continue;
            }
            runtime.coreKillCounter -=
                THREE_KINGDOMS_CONFIG.coreConsumeKillInterval;
            const result = this.tryCoreDevour(faction.id);
            consumed = consumed || result.consumed;
            messages.push(...result.messages);
        }
        return { consumed, messages };
    }

    update(deltaTime: number): ThreeKingdomsUpdateResult {
        if (
            !this.starterAcquired ||
            this.threeKingdomsClosed ||
            this.exActive ||
            deltaTime <= 0
        ) {
            return { changed: false, messages: [] };
        }

        this.starterGrowthTimer += deltaTime;
        const messages: string[] = [];
        let changed = false;
        while (
            this.starterGrowthTimer >=
            THREE_KINGDOMS_CONFIG.starterGrowthInterval
        ) {
            this.starterGrowthTimer -=
                THREE_KINGDOMS_CONFIG.starterGrowthInterval;
            const cardCount = this.getHeldThreeKingdomsCardCount();
            const growth = cardCount *
                THREE_KINGDOMS_CONFIG.starterAllStatsPerThreeKingdomsCard;
            if (growth <= 0) continue;
            for (const attribute of STARTER_GROWTH_ATTRIBUTES) {
                this.runData.addRunGrowth(attribute, growth);
            }
            changed = true;
            messages.push(
                `乱世三国：当前持有 ${cardCount} 张三国卡，获得全属性 +${growth}`
            );
        }
        return { changed, messages };
    }

    getActiveUrFactions(): ThreeKingdomsFactionId[] {
        return THREE_KINGDOMS_FACTIONS
            .map((faction) => faction.id)
            .filter((factionId) => Boolean(
                this.slots.getByDefinitionId(getThreeKingdomsUrId(factionId))
            ));
    }

    getConsumedMaterialIds(factionId: ThreeKingdomsFactionId): string[] {
        return [...this.getRuntime(factionId).consumedCardIds];
    }

    getConsumedCount(factionId: ThreeKingdomsFactionId): number {
        return this.getRuntime(factionId).consumedCount;
    }

    getCoreKillCounter(factionId: ThreeKingdomsFactionId): number {
        return this.getRuntime(factionId).coreKillCounter;
    }

    getStarterGrowthTimer(): number { return this.starterGrowthTimer; }
    getCompletedUrCount(): number { return this.completedUrFactions.size; }
    isThreeKingdomsClosed(): boolean { return this.threeKingdomsClosed; }
    isExActive(): boolean { return this.exActive; }
    getExKillCounter(): number { return this.exKillCounter; }
    getExConsumedCount(): number { return this.exConsumedCount; }
    hasStarter(): boolean { return this.starterAcquired; }

    getSlotDescriptions(): string[] {
        return this.slots.getOccupied().map((slot) => {
            const definition = getThreeKingdomsCard(slot.definitionId);
            if (definition?.role === 'core' && definition.factionId) {
                const runtime = this.getRuntime(definition.factionId);
                return `${definition.name} · 吞${runtime.consumedCount}/` +
                    `${THREE_KINGDOMS_CONFIG.materialsRequiredForUr} · ` +
                    `${runtime.coreKillCounter}/` +
                    `${THREE_KINGDOMS_CONFIG.coreConsumeKillInterval}`;
            }
            return slot.name;
        });
    }

    getProgressText(): string {
        if (this.exActive) {
            return `三国 EX·吞食天地 · 400杀 ${this.exKillCounter}/` +
                `${THREE_KINGDOMS_CONFIG.exConsumeKillInterval} · ` +
                `累计吞噬 ${this.exConsumedCount} · ` +
                `全属性增幅 +${this.exConsumedCount}%`;
        }
        const factionText = THREE_KINGDOMS_FACTIONS.map((faction) => {
            const runtime = this.getRuntime(faction.id);
            if (runtime.urAdded) return `${faction.shortName}UR已成型`;
            if (!runtime.coreAcquired) return `${faction.shortName}未启动`;
            const coreName = THREE_KINGDOMS_CORE_CARDS.find((card) => {
                return card.factionId === faction.id;
            })?.name ?? faction.name;
            return `${faction.shortName}${coreName} ` +
                `吞${runtime.consumedCount}/` +
                `${THREE_KINGDOMS_CONFIG.materialsRequiredForUr} ` +
                `${runtime.coreKillCounter}/` +
                `${THREE_KINGDOMS_CONFIG.coreConsumeKillInterval}`;
        }).join(' | ');
        return `${factionText} | UR ${Math.min(
            this.completedUrFactions.size,
            THREE_KINGDOMS_CONFIG.urRequiredForEx
        )}/${THREE_KINGDOMS_CONFIG.urRequiredForEx}`;
    }

    reset(): void {
        for (const slot of this.slots.getOccupied()) {
            this.runData.removeModifiersBySource(slot.instanceId);
        }
        this.runData.removeModifiersBySource(
            'three-kingdoms-ex-consume-growth'
        );
        this.slots.reset();
        this.starterAcquired = false;
        this.starterGrowthTimer = 0;
        this.threeKingdomsClosed = false;
        this.completedUrFactions.clear();
        this.factionRuntime.clear();
        this.initializeFactionRuntime();
        this.exActive = false;
        this.exKillCounter = 0;
        this.exConsumedCount = 0;
    }

    debugAddCoreKills(amount: number): ThreeKingdomsKillResult {
        const messages: string[] = [];
        let consumed = false;
        const granted = Math.max(0, Math.floor(amount));
        for (let index = 0; index < granted; index++) {
            const result = this.recordKill();
            consumed = consumed || result.consumed;
            messages.push(...result.messages);
        }
        return { consumed, messages };
    }

    debugAddFirstActiveFactionMaterial(): ThreeKingdomsAcquireResult {
        const factionId = this.getFirstActiveIncompleteFaction();
        if (!factionId) {
            return { success: false, message: '没有已启动且未成型的阵营' };
        }
        const material = THREE_KINGDOMS_MATERIAL_CARDS.find((card) => {
            return card.factionId === factionId;
        });
        return material
            ? this.acquireCard(material.id)
            : { success: false, message: '未找到对应阵营材料' };
    }

    debugTriggerFirstCoreDevour(): ThreeKingdomsKillResult {
        const factionId = this.getFirstActiveIncompleteFaction();
        return factionId
            ? this.tryCoreDevour(factionId)
            : { consumed: false, messages: ['没有可触发吞噬的主公'] };
    }

    debugSetFirstFactionConsumedCount(count: number): string {
        const factionId = this.getFirstActiveIncompleteFaction();
        if (!factionId) return '没有已启动且未成型的阵营';
        const runtime = this.getRuntime(factionId);
        runtime.consumedCount = Math.max(
            0,
            Math.min(
                THREE_KINGDOMS_CONFIG.materialsRequiredForUr - 1,
                Math.floor(count)
            )
        );
        return `${this.getFactionName(factionId)}已吞噬设为 ${runtime.consumedCount}/8`;
    }

    debugForceThreeUrCompletion(): ThreeKingdomsKillResult {
        const messages: string[] = [];
        for (const faction of THREE_KINGDOMS_FACTIONS.slice(0, 3)) {
            if (this.threeKingdomsClosed) break;
            const runtime = this.getRuntime(faction.id);
            if (runtime.urAdded) continue;
            this.addFactionUrToBar(faction.id, messages);
        }
        return { consumed: false, messages };
    }

    private processExKill(): ThreeKingdomsKillResult {
        this.exKillCounter++;
        if (
            this.exKillCounter < THREE_KINGDOMS_CONFIG.exConsumeKillInterval
        ) {
            return { consumed: false, messages: [] };
        }
        this.exKillCounter -= THREE_KINGDOMS_CONFIG.exConsumeKillInterval;
        return this.consumeRandomCardForEx();
    }

    private tryCoreDevour(
        factionId: ThreeKingdomsFactionId
    ): ThreeKingdomsKillResult {
        const runtime = this.getRuntime(factionId);
        const coreId = getThreeKingdomsCoreId(factionId);
        const candidates = this.slots.getOccupied().filter((slot) => {
            const definition = getThreeKingdomsCard(slot.definitionId);
            return definition?.role === 'material' &&
                definition.factionId === factionId &&
                definition.id !== coreId &&
                definition.canBeConsumed &&
                definition.consumedByCoreId === coreId;
        });
        // TODO_VERIFY_CORE_DEVOUR_WHEN_NO_TARGET
        if (candidates.length === 0) {
            return {
                consumed: false,
                messages: [
                    `${this.getFactionName(factionId)}主公达到200杀，但没有可吞噬的当前阵营卡`
                ]
            };
        }

        const index = Math.min(
            candidates.length - 1,
            Math.floor(this.random() * candidates.length)
        );
        const consumed = candidates[index];
        const definition = getThreeKingdomsCard(consumed.definitionId)!;
        this.slots.removeCard(consumed.instanceId);
        if (!THREE_KINGDOMS_CONFIG.retainConsumedMaterialStats) {
            this.runData.removeModifiersBySource(consumed.instanceId);
        }

        runtime.consumedCardIds.push(definition.id);
        const firstDefinitionDevour =
            !runtime.countedDefinitionIds.has(definition.id);
        if (
            firstDefinitionDevour ||
            THREE_KINGDOMS_CONFIG.duplicateConsumeCounts
        ) {
            runtime.consumedCount++;
            runtime.countedDefinitionIds.add(definition.id);
        }

        const messages = [
            `${this.getFactionName(factionId)}主公吞噬【${definition.name}】，释放1个卡槽`,
            firstDefinitionDevour || THREE_KINGDOMS_CONFIG.duplicateConsumeCounts
                ? `已吞噬：${runtime.consumedCount}/${THREE_KINGDOMS_CONFIG.materialsRequiredForUr}`
                : `重复材料已吞噬但暂不重复计数：${runtime.consumedCount}/${THREE_KINGDOMS_CONFIG.materialsRequiredForUr}`
        ];

        if (
            !runtime.urAdded &&
            runtime.consumedCount >=
                THREE_KINGDOMS_CONFIG.materialsRequiredForUr
        ) {
            this.addFactionUrToBar(factionId, messages);
        }
        return { consumed: true, messages };
    }

    private addFactionUrToBar(
        factionId: ThreeKingdomsFactionId,
        messages: string[]
    ): void {
        const runtime = this.getRuntime(factionId);
        if (runtime.urAdded || this.threeKingdomsClosed) return;
        const ur = THREE_KINGDOMS_UR_CARDS.find((card) => {
            return card.factionId === factionId;
        });
        if (!ur) return;

        const instance = this.slots.addCard(ur);
        if (!instance) {
            messages.push(`${ur.name}加入卡牌栏失败：没有空余卡槽`);
            return;
        }
        this.applyCardEffects(instance, ur);
        runtime.urAdded = true;
        runtime.coreKillCounter = 0;
        this.completedUrFactions.add(factionId);
        messages.push(
            `${this.getFactionName(factionId)}累计吞噬8张，【${ur.name}】作为新卡加入卡牌栏`
        );
        this.tryCompleteThreeKingdomsEx(messages);
    }

    private tryCompleteThreeKingdomsEx(messages: string[]): void {
        if (
            this.exActive ||
            this.completedUrFactions.size <
                THREE_KINGDOMS_CONFIG.urRequiredForEx
        ) {
            return;
        }

        const removedNames: string[] = [];
        for (const slot of this.slots.getOccupied()) {
            const definition = getThreeKingdomsCard(slot.definitionId);
            if (!definition || definition.role === 'ex') continue;
            this.slots.removeCard(slot.instanceId);
            this.runData.removeModifiersBySource(slot.instanceId, false);
            removedNames.push(slot.name);
        }

        const instance = this.slots.addCard(THREE_KINGDOMS_EX_CARD);
        if (!instance) {
            messages.push('三国卡已清理，但吞食天地加入卡牌栏失败');
            return;
        }
        this.applyCardEffects(instance, THREE_KINGDOMS_EX_CARD);
        this.starterAcquired = false;
        this.starterGrowthTimer = 0;
        this.threeKingdomsClosed = true;
        for (const runtime of this.factionRuntime.values()) {
            runtime.coreAcquired = false;
            runtime.coreKillCounter = 0;
        }
        this.exActive = true;
        messages.push(
            `获得3张三国UR，移除${removedNames.length}张三国卡并关闭三国卡组`
        );
        messages.push('EX【吞食天地】已加入卡牌栏');
        // TODO_VERIFY_UR_KILL_GROWTH_AFTER_EX
        // TODO_VERIFY_ACQUIRED_GROWTH_PERSISTS_AFTER_EX
    }

    private consumeRandomCardForEx(): ThreeKingdomsKillResult {
        const candidates = this.slots.getOccupied().filter((slot) => {
            return slot.canBeConsumed &&
                slot.definitionId !== THREE_KINGDOMS_EX_CARD.id;
        });
        if (candidates.length === 0) {
            return {
                consumed: false,
                messages: ['吞食天地达到400杀，但当前没有可吞卡']
            };
        }
        const index = Math.min(
            candidates.length - 1,
            Math.floor(this.random() * candidates.length)
        );
        const consumed = candidates[index];
        this.slots.removeCard(consumed.instanceId);
        this.runData.removeModifiersBySource(consumed.instanceId, false);
        this.exConsumedCount++;
        this.runData.registerStatModifier(
            'three-kingdoms-ex-consume-growth',
            { allStatsPercent: this.exConsumedCount }
        );
        return {
            consumed: true,
            messages: [
                `吞食天地吞噬【${consumed.name}】，释放1个卡槽`,
                `全属性增幅累计 +${this.exConsumedCount}%`
            ]
        };
    }

    private getHeldThreeKingdomsCardCount(): number {
        return this.slots.getOccupied().filter((slot) => {
            return Boolean(getThreeKingdomsCard(slot.definitionId));
        }).length;
    }

    private applyCardEffects(
        instance: Pick<BondCardInstance, 'instanceId'>,
        definition: ThreeKingdomsCardDefinition
    ): void {
        const combined = definition.effects.reduce((result, effect) => {
            for (const key of Object.keys(effect) as (keyof typeof effect)[]) {
                const value = effect[key];
                if (value !== undefined) result[key] = (result[key] ?? 0) + value;
            }
            return result;
        }, {} as ThreeKingdomsCardDefinition['effects'][number]);
        this.runData.registerStatModifier(instance.instanceId, combined);
    }

    private getRuntime(
        factionId: ThreeKingdomsFactionId
    ): ThreeKingdomsFactionRuntime {
        return this.factionRuntime.get(factionId)!;
    }

    private initializeFactionRuntime(): void {
        for (const faction of THREE_KINGDOMS_FACTIONS) {
            this.factionRuntime.set(faction.id, {
                factionId: faction.id,
                coreAcquired: false,
                coreKillCounter: 0,
                consumedCount: 0,
                consumedCardIds: [],
                countedDefinitionIds: new Set<string>(),
                urAdded: false
            });
        }
    }

    private getFirstActiveIncompleteFaction():
        ThreeKingdomsFactionId | undefined {
        return THREE_KINGDOMS_FACTIONS.find((faction) => {
            const runtime = this.getRuntime(faction.id);
            return runtime.coreAcquired && !runtime.urAdded;
        })?.id;
    }

    private getFactionName(factionId: ThreeKingdomsFactionId): string {
        return THREE_KINGDOMS_FACTIONS.find((faction) => {
            return faction.id === factionId;
        })?.name ?? factionId;
    }
}
