import { _decorator, Component } from 'cc';

import { addGold } from './PlayerData';
import { BattleUI } from './BattleUI';
import type { EnemyViewData } from './BattleUI';

import { gamePlayerData } from './GameData/PlayerData';
import {
    BATTLE_PACING,
    getBattleWaveCount,
    getNormalPackSize,
    getNormalPackStartIndex
} from './GameData/BattlePacingData';
import {
    BattlePacingSystem
} from './Systems/BattlePacingSystem';
import type {
    BattlePacingEvent
} from './Systems/BattlePacingSystem';
import { EquipmentSystem } from './Systems/EquipmentSystem';
import {
    DEFAULT_BATTLE_BUILD,
    createBattleBuildRuntime,
    normalizeBattleBuildSelection
} from './GameData/BattleBuildData';
import type {
    BattleBuildRuntime,
    BattleBuildSelection
} from './GameData/BattleBuildData';
import {
    getSkillDefinition
} from './GameData/SkillData';
import {
    getBondDefinition
} from './GameData/BondData';
import { UpgradeManager } from './Systems/UpgradeManager';
import { UpgradeCardGenerator } from './Systems/UpgradeCardGenerator';
import type {
    UpgradeCard,
    UpgradeCardKind
} from './Systems/UpgradeCardGenerator';
import { CardSystem } from './Systems/CardSystem';
import type { CardChoice } from './Systems/CardSystem';
import { BondSystem } from './Systems/FactionSystem';

import { BattleRunData } from './BattleRunData';

import {
    BATTLE_BALANCE,
    DEFAULT_MONSTER_GROWTH_CONTEXT,
    getMonsterGrowthScale,
    getWaveComposition
} from './BattleBalance';
import type { MonsterGrowthContext } from './BattleBalance';

const { ccclass } = _decorator;


export type EnemyType = 'melee' | 'ranged';

export interface MonsterData extends EnemyViewData {
    wave: number;
    level: number;
    def: number;
    atk: number;
    expReward: number;
    goldReward: number;
    skillExpReward: number;
    isElite: boolean;
    isEnhanced: boolean;
    baseMaxHp: number;
    baseDef: number;
    baseAtk: number;
    movementLane?: number;
    moveSpeed?: number;
}


export function createWaveEnemies(
    wave: number,
    growthContext: MonsterGrowthContext = DEFAULT_MONSTER_GROWTH_CONTEXT
): MonsterData[] {

    const composition = getWaveComposition(wave);
    const enemies: MonsterData[] = [];

    for (let index = 0; index < composition.total; index++) {
        enemies.push(createNormalEnemy(wave, index, growthContext));
    }

    // 保留旧工厂函数的第10波Boss行为，供未迁移调用继续使用。
    if (wave === getBattleWaveCount() && enemies.length > 0) {
        enemies[0] = createBossEnemy(wave, 0, growthContext);
    }

    return enemies;
}


export function createNormalEnemyPack(
    wave: number,
    startIndex: number,
    count: number,
    growthContext: MonsterGrowthContext = DEFAULT_MONSTER_GROWTH_CONTEXT
): MonsterData[] {
    const enemies: MonsterData[] = [];
    for (let offset = 0; offset < count; offset++) {
        enemies.push(createNormalEnemy(
            wave,
            startIndex + offset,
            growthContext
        ));
    }
    return enemies;
}


export function createEliteEnemy(
    wave: number,
    growthContext: MonsterGrowthContext = DEFAULT_MONSTER_GROWTH_CONTEXT
): MonsterData {
    const baseHp = getNormalBaseHp(wave);
    const baseAtk = getNormalBaseAttack('melee', wave);
    const baseDef = getNormalBaseDefense(wave) +
        BATTLE_PACING.elite.defenseBonus;
    const baseMaxHp = Math.round(
        baseHp * BATTLE_PACING.elite.hpMultiplier
    );

    return createScaledMonster({
        id: wave * 1000 + 900,
        name: '精英妖将',
        type: 'melee',
        isBoss: false,
        isElite: true,
        isEnhanced: false,
        wave,
        level: wave,
        maxHp: baseMaxHp,
        hp: baseMaxHp,
        def: baseDef,
        atk: Math.round(baseAtk * BATTLE_PACING.elite.attackMultiplier),
        expReward: BATTLE_PACING.elite.expReward,
        goldReward: BATTLE_PACING.elite.goldReward,
        skillExpReward: BATTLE_PACING.elite.skillExpReward,
        baseMaxHp,
        baseDef,
        baseAtk: Math.round(baseAtk * BATTLE_PACING.elite.attackMultiplier)
    }, growthContext);
}


export function createBossEnemy(
    wave: number,
    index = 999,
    growthContext: MonsterGrowthContext = DEFAULT_MONSTER_GROWTH_CONTEXT
): MonsterData {
    const baseMaxHp = BATTLE_BALANCE.bossBaseHp +
        wave * BATTLE_BALANCE.bossHpPerWave;
    const baseDef = Math.round(
        BATTLE_BALANCE.bossBaseDefense +
        wave * BATTLE_BALANCE.bossDefensePerWave
    );
    const baseAtk = Math.round(
        BATTLE_BALANCE.bossBaseAttack +
        wave * BATTLE_BALANCE.bossAttackPerWave
    );

    return createScaledMonster({
        id: wave * 1000 + index,
        name: '镇关妖王',
        type: 'melee',
        isBoss: true,
        isElite: false,
        isEnhanced: false,
        wave,
        level: wave,
        maxHp: baseMaxHp,
        hp: baseMaxHp,
        def: baseDef,
        atk: baseAtk,
        expReward: BATTLE_BALANCE.bossExp,
        goldReward: BATTLE_BALANCE.bossGold,
        skillExpReward: BATTLE_PACING.bossSkillExpReward,
        baseMaxHp,
        baseDef,
        baseAtk
    }, growthContext);
}


function getNormalBaseHp(wave: number): number {
    return BATTLE_BALANCE.normalBaseHp +
        Math.max(1, wave) * BATTLE_BALANCE.normalHpPerWave;
}


function getNormalBaseDefense(wave: number): number {
    return BATTLE_BALANCE.normalBaseDefense + Math.floor(
        Math.max(0, wave - 1) /
        BATTLE_BALANCE.normalDefenseWaveInterval
    );
}


function getNormalBaseAttack(type: EnemyType, wave: number): number {
    const safeWave = Math.max(1, wave);
    return type === 'ranged'
        ? Math.round(
            BATTLE_BALANCE.rangedBaseAttack +
            safeWave * BATTLE_BALANCE.rangedAttackPerWave
        )
        : Math.round(
            BATTLE_BALANCE.meleeBaseAttack +
            safeWave * BATTLE_BALANCE.meleeAttackPerWave
        );
}


function createNormalEnemy(
    wave: number,
    index: number,
    growthContext: MonsterGrowthContext
): MonsterData {
    const mixPattern = BATTLE_BALANCE.enemyMixPattern;
    const patternIndex = (
        (index % mixPattern.length) + mixPattern.length
    ) % mixPattern.length;
    const patternType = mixPattern[patternIndex];
    const isEnhanced = patternType === 'enhanced-melee' ||
        patternType === 'enhanced-ranged';
    const type: EnemyType = patternType === 'ranged' ||
        patternType === 'enhanced-ranged'
        ? 'ranged'
        : 'melee';
    const normalMaxHp = getNormalBaseHp(wave);
    const normalDef = getNormalBaseDefense(wave);
    const normalAtk = getNormalBaseAttack(type, wave);
    const maxHp = isEnhanced
        ? Math.round(normalMaxHp * BATTLE_BALANCE.enhancedHpMultiplier)
        : normalMaxHp;
    const def = normalDef + (
        isEnhanced ? BATTLE_BALANCE.enhancedDefenseBonus : 0
    );
    const atk = isEnhanced
        ? Math.round(
            normalAtk * (
                type === 'ranged'
                    ? BATTLE_BALANCE.enhancedRangedAttackMultiplier
                    : BATTLE_BALANCE.enhancedMeleeAttackMultiplier
            )
        )
        : normalAtk;

    return createScaledMonster({
        id: wave * 1000 + index,
        name: isEnhanced
            ? type === 'melee' ? '强化近战妖兽' : '强化远程妖兽'
            : type === 'melee' ? '近战妖兽' : '远程妖兽',
        type,
        isBoss: false,
        isElite: false,
        isEnhanced,
        wave,
        level: wave,
        maxHp,
        hp: maxHp,
        def,
        atk,
        expReward: BATTLE_BALANCE.normalEnemyExp * (
            isEnhanced ? BATTLE_BALANCE.enhancedExpMultiplier : 1
        ),
        goldReward: BATTLE_BALANCE.normalEnemyGold * (
            isEnhanced ? BATTLE_BALANCE.enhancedGoldMultiplier : 1
        ),
        skillExpReward: BATTLE_PACING.normalSkillExpReward * (
            isEnhanced ? BATTLE_BALANCE.enhancedSkillExpMultiplier : 1
        ),
        baseMaxHp: maxHp,
        baseDef: def,
        baseAtk: atk
    }, growthContext);
}


function createScaledMonster(
    monster: MonsterData,
    growthContext: MonsterGrowthContext
): MonsterData {
    applyMonsterGrowth(monster, growthContext, false);
    return monster;
}


// 已在场的怪物也会跟随玩家成长。刷新时保持当前生命百分比，
// 避免属性提升把残血怪物直接回满。
export function applyMonsterGrowth(
    monster: MonsterData,
    growthContext: MonsterGrowthContext,
    preserveHealthRatio = true
): void {
    const previousMaxHp = monster.maxHp;
    const healthRatio = previousMaxHp > 0
        ? monster.hp / previousMaxHp
        : 1;
    const scale = getMonsterGrowthScale(monster.wave, growthContext);
    const archetypeHitsMultiplier = monster.isBoss
        ? BATTLE_BALANCE.bossHitsMultiplier
        : monster.isElite
            ? BATTLE_BALANCE.eliteHitsMultiplier
            : monster.isEnhanced
                ? BATTLE_BALANCE.enhancedHitsMultiplier
                : 1;
    const minimumCombatHp = Math.round(
        scale.expectedPlayerHit *
        scale.targetHitsToDefeat *
        archetypeHitsMultiplier
    );

    monster.level = scale.level;
    monster.maxHp = Math.max(
        1,
        Math.round(monster.baseMaxHp * scale.hpMultiplier),
        minimumCombatHp
    );
    monster.atk = Math.max(
        1,
        Math.round(monster.baseAtk * scale.attackMultiplier)
    );
    monster.def = Math.max(0, monster.baseDef + scale.defenseBonus);
    monster.hp = preserveHealthRatio
        ? Math.max(0, Math.round(monster.maxHp * healthRatio))
        : monster.maxHp;
}


@ccclass('BattleSystem')
export class BattleSystem extends Component {

    private battleUI!: BattleUI;
    private runData!: BattleRunData;
    private buildSelection!: BattleBuildSelection;
    private buildRuntime!: BattleBuildRuntime;
    private upgradeManager!: UpgradeManager;
    private upgradeCardGenerator!: UpgradeCardGenerator;
    private battleCardSystem!: CardSystem;
    private bondSystem!: BondSystem;
    private equipmentSystem!: EquipmentSystem;
    private battlePacingSystem!: BattlePacingSystem;
    private enemies: MonsterData[] = [];

    private currentPlayerHp = 0;
    private currentWave = 1;
    private readonly totalWaves = getBattleWaveCount();
    private totalExpReward = 0;
    private totalGoldReward = 0;
    private attackCursor = 0;
    private timelineComplete = false;
    private challengeRound = 1;
    private nextSpawnLane = 0;
    private upgradeChoicesVisible = false;

    private isPaused = false;
    private onExit: () => void = () => {};


    init(
        ui: BattleUI,
        onExit: () => void,
        selection: BattleBuildSelection = DEFAULT_BATTLE_BUILD
    ): void {

        this.battleUI = ui;
        this.onExit = onExit;
        this.buildSelection = normalizeBattleBuildSelection(selection);
        this.buildRuntime = createBattleBuildRuntime(this.buildSelection);
        this.equipmentSystem = new EquipmentSystem(gamePlayerData.equipment);
        this.runData = new BattleRunData(
            this.equipmentSystem.calculateAttributes(gamePlayerData.attributes)
        );
        this.applyInitialBuildEffects();
        this.upgradeManager = new UpgradeManager(
            this.runData,
            this.buildRuntime
        );
        this.upgradeCardGenerator = new UpgradeCardGenerator(
            this.buildRuntime
        );
        this.bondSystem = new BondSystem(
            this.buildRuntime.selectedBondIds[0]
        );
        this.battleCardSystem = new CardSystem(this.bondSystem);
        this.battlePacingSystem = new BattlePacingSystem();

        this.currentWave = 1;
        this.totalExpReward = 0;
        this.totalGoldReward = 0;
        this.attackCursor = 0;
        this.timelineComplete = false;
        this.challengeRound = 1;
        this.nextSpawnLane = 0;
        this.upgradeChoicesVisible = false;
        this.currentPlayerHp = this.runData.maxHp;
        this.isPaused = false;
        this.enemies = [];
        this.battleUI.hideUpgradeUI();
        this.handlePacingEvents(this.battlePacingSystem.start(), false);

        this.updateRunUI();
        this.renderCurrentWave();
        this.updateBuildUI();
    }


    begin(): void {
        this.updateBattleStatus();
        this.battleUI.addLog(
            `五分钟试炼开始，第1批${this.enemies.length}只敌人进入战场！`
        );
        this.startCombatTimers();
    }


    stop(): void {
        this.unschedule(this.playerAttack);
        this.unschedule(this.enemyGroupAttack);
        this.unschedule(this.regeneratePlayer);
        this.unschedule(this.updateBattleTimeline);
        this.unschedule(this.updateEnemyMovement);
        this.unscheduleAllCallbacks();
    }


    private startCombatTimers(): void {

        this.unschedule(this.playerAttack);
        this.unschedule(this.enemyGroupAttack);
        this.unschedule(this.regeneratePlayer);
        this.unschedule(this.updateBattleTimeline);
        this.unschedule(this.updateEnemyMovement);

        this.schedule(this.playerAttack, this.runData.attackInterval);
        this.schedule(this.enemyGroupAttack, 1.5);
        this.schedule(this.regeneratePlayer, 1);
        this.schedule(
            this.updateEnemyMovement,
            BATTLE_BALANCE.monsterMovementTick
        );
        if (!this.timelineComplete) {
            this.schedule(this.updateBattleTimeline, 1);
        }
    }


    private updateBattleTimeline = (): void => {
        if (this.isPaused || this.timelineComplete) {
            return;
        }

        this.handlePacingEvents(this.battlePacingSystem.advance(1), true);
        if (!this.isPaused) {
            this.updateBattleStatus();
        }
    };


    private playerAttack = (): void => {

        if (this.isPaused) {
            return;
        }

        const living = this.getLivingEnemies()
            .filter((enemy) => {
                return (enemy.positionX ?? BATTLE_BALANCE.monsterSpawnX) <=
                    BATTLE_BALANCE.monsterVisibleRightX;
            })
            .sort((a, b) => {
                return (a.positionX ?? BATTLE_BALANCE.monsterSpawnX) -
                    (b.positionX ?? BATTLE_BALANCE.monsterSpawnX);
            });
        if (living.length === 0) {
            return;
        }

        // 主角每次只攻击最靠近的 1 只怪物。
        const targetCount = Math.min(
            living.length,
            this.getMultiTargetCount()
        );
        const targets = living.slice(0, targetCount);

        let defeatedCount = 0;

        for (const target of targets) {
            const base = Math.max(1, this.runData.atk - target.def);
            const isCritical = Math.random() * 100 < this.runData.crit;
            const damage = Math.max(
                1,
                Math.round(
                    base *
                    (isCritical ? this.runData.critDamageMultiplier : 1) *
                    (0.9 + Math.random() * 0.2)
                )
            );

            target.hp = Math.max(0, target.hp - damage);
            this.battleUI.updateEnemyHp(target.id, target.hp, target.maxHp);
            this.battleUI.showEnemyDamage(target.id, damage, isCritical);

            if (target.hp <= 0) {
                defeatedCount++;
                this.resolveEnemyDefeat(target);
            }
        }

        this.battleUI.playPlayerAttack(targets.map((target) => target.id));

        if (defeatedCount > 0) {
            this.afterEnemyDefeats();
        }
    };


    private enemyGroupAttack = (): void => {

        if (this.isPaused) {
            return;
        }

        const living = this.getLivingEnemies();
        const meleeAttackers = living
            .filter((enemy) => {
                return enemy.type === 'melee' &&
                    this.isEnemyInAttackRange(enemy);
            })
            .sort((a, b) => {
                return (a.positionX ?? 0) - (b.positionX ?? 0);
            })
            .slice(0, 4);
        const rangedAttackers = living
            .filter((enemy) => {
                return enemy.type === 'ranged' &&
                    this.isEnemyInAttackRange(enemy);
            })
            .sort((a, b) => {
                return (a.positionX ?? 0) - (b.positionX ?? 0);
            })
            .slice(0, 2);
        const attackers = [...meleeAttackers, ...rangedAttackers];

        if (attackers.length === 0) {
            return;
        }

        let totalDamage = 0;

        for (const attacker of attackers) {
            totalDamage += Math.max(
                1,
                Math.round(
                    Math.max(1, attacker.atk - this.runData.def) *
                    (0.9 + Math.random() * 0.2)
                )
            );
        }

        this.currentPlayerHp = Math.max(
            0,
            this.currentPlayerHp - totalDamage
        );
        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            this.runData.maxHp
        );
        this.battleUI.showPlayerDamage(totalDamage);
        this.battleUI.playEnemyAttack(
            attackers.map((attacker) => attacker.id)
        );

        if (this.currentPlayerHp <= 0) {
            this.onPlayerDead();
        }
    };


    private regeneratePlayer = (): void => {

        if (this.isPaused || this.runData.healthRegenBonus <= 0) {
            return;
        }

        const amount = Math.max(
            1,
            Math.round(
                this.runData.maxHp * 0.01 *
                (1 + this.runData.healthRegenBonus / 100)
            )
        );
        this.currentPlayerHp = Math.min(
            this.runData.maxHp,
            this.currentPlayerHp + amount
        );
        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            this.runData.maxHp
        );
    };


    private resolveEnemyDefeat(enemy: MonsterData): void {

        const previousMaxHp = this.runData.maxHp;
        this.upgradeManager.addExp(enemy.expReward);
        this.currentPlayerHp += Math.max(
            0,
            this.runData.maxHp - previousMaxHp
        );

        addGold(enemy.goldReward);
        this.totalExpReward += enemy.expReward;
        this.totalGoldReward += enemy.goldReward;

        const previousAttackInterval = this.runData.attackInterval;
        const cardProgress = this.battleCardSystem.recordKill();
        for (const bonus of cardProgress.bonuses) {
            const oldMaxHp = this.runData.maxHp;
            this.runData.applyBonus(bonus);
            this.currentPlayerHp += Math.max(
                0,
                this.runData.maxHp - oldMaxHp
            );
        }
        for (const message of cardProgress.messages) {
            this.battleUI.addLog(message);
        }
        if (this.runData.attackInterval !== previousAttackInterval) {
            this.refreshPlayerAttackTimer();
        }

        this.refreshLivingMonsterGrowth();
        this.battleUI.removeEnemy(enemy.id);
    }


    private afterEnemyDefeats(): void {

        this.updateRunUI();
        this.updateBuildUI();
        this.battleUI.updateWave(
            this.currentWave,
            this.totalWaves,
            this.getLivingEnemies().length
        );

        // 升级选择只叠加 UI，不停止刷怪、移动、攻击或计时。
        this.showPendingUpgradeChoices();

        if (this.timelineComplete && this.getLivingEnemies().length === 0) {
            this.finishStage();
            return;
        }

        if (this.getLivingEnemies().length === 0) {
            this.spawnNextNormalPackImmediately();
        }
    }


    private showPendingUpgradeChoices(): void {
        const pendingLevelUps = this.upgradeManager.getPendingLevelUps();
        this.battleUI.updatePendingUpgradeCount(pendingLevelUps);

        if (pendingLevelUps <= 0 || this.upgradeChoicesVisible) {
            return;
        }

        const skillAvailable = this.upgradeCardGenerator.hasAvailableCards(
            'skill'
        );
        const actualBondAvailable =
            this.buildRuntime.selectedBondIds.length > 0 &&
            this.battleCardSystem.hasCombinedBondChoices();

        if (!skillAvailable && !actualBondAvailable) {
            this.upgradeManager.clearPendingLevelUps();
            this.battleUI.hideUpgradeUI();
            this.battleUI.addLog('本局携带内容均已满级，后续不再弹出升级卡。');
            return;
        }

        this.upgradeChoicesVisible = true;
        this.battleUI.showUpgradeCategoryPrompt(
            pendingLevelUps,
            skillAvailable,
            actualBondAvailable,
            (kind) => this.onUpgradeCategorySelected(kind)
        );
    }


    private onUpgradeCategorySelected(kind: UpgradeCardKind): void {
        const choices = kind === 'skill'
            ? this.upgradeCardGenerator.generateUpgradeCards(3, kind)
            : this.getBattleCardChoices(kind);

        if (choices.length === 0) {
            this.upgradeChoicesVisible = false;
            this.showPendingUpgradeChoices();
            return;
        }

        this.battleUI.showUpgradeCards(
            choices,
            this.upgradeManager.getPendingLevelUps(),
            (choice) => this.onUpgradeSelected(choice),
            () => {
                this.upgradeChoicesVisible = false;
                this.showPendingUpgradeChoices();
            }
        );
    }


    private onUpgradeSelected(choice: UpgradeCard): void {
        this.upgradeChoicesVisible = false;
        const previousAttackInterval = this.runData.attackInterval;
        const previousMaxHp = this.runData.maxHp;
        const result = choice.kind === 'skill'
            ? this.upgradeManager.selectUpgrade(choice)
            : this.battleCardSystem.selectCard(choice.sourceId);

        if (result.success && choice.kind !== 'skill') {
            this.upgradeManager.consumePendingLevelUp();
        }

        if (result.success && result.bonus) {
            this.runData.applyBonus(result.bonus);
            this.currentPlayerHp += Math.max(
                0,
                this.runData.maxHp - previousMaxHp
            );
            this.refreshLivingMonsterGrowth();
        }

        this.battleUI.addLog(result.message);
        this.updateBuildUI();
        this.updateRunUI();

        if (
            result.success &&
            this.runData.attackInterval !== previousAttackInterval
        ) {
            this.refreshPlayerAttackTimer();
        }
        this.showPendingUpgradeChoices();
    }


    private getBattleCardChoices(kind: UpgradeCardKind): UpgradeCard[] {
        const choices = kind === 'bond'
            ? this.battleCardSystem.getCombinedBondChoices(3)
            : [];
        return choices.map((choice) => {
            const cardKind: UpgradeCardKind = choice.category === '基础卡'
                ? 'basic'
                : 'bond';
            return this.toUpgradeCard(choice, cardKind);
        });
    }


    private toUpgradeCard(
        choice: CardChoice,
        kind: UpgradeCardKind
    ): UpgradeCard {
        return {
            id: `${kind}:${choice.id}`,
            kind,
            sourceId: choice.id,
            name: choice.name,
            description: choice.description,
            nextLevel: 0,
            bonus: {}
        };
    }


    private spawnNextNormalPackImmediately(): void {

        if (this.timelineComplete) {
            return;
        }

        const events = this.battlePacingSystem.spawnNextPackNow();
        if (events.length === 0) {
            return;
        }

        this.battleUI.addLog('本批怪物已清空，下一批立即进入战场！');
        this.handlePacingEvents(events, false);
        this.updateBattleStatus();
    }


    private refreshPlayerAttackTimer(): void {
        if (this.isPaused) {
            return;
        }

        // 不能在 playerAttack 回调执行过程中直接注销并重新注册自身，
        // 否则 Cocos Scheduler 会在本轮结束时移除新注册的定时器。
        this.scheduleOnce(() => {
            if (this.isPaused) {
                return;
            }
            this.unschedule(this.playerAttack);
            this.schedule(this.playerAttack, this.runData.attackInterval);
        }, 0);
    }


    private handlePacingEvents(
        events: BattlePacingEvent[],
        announce: boolean
    ): void {

        let battlefieldChanged = false;

        for (const event of events) {
            if (event.type === 'wave-start') {
                const carriedEnemyCount = this.getLivingEnemies().length;
                this.currentWave = event.wave;
                this.attackCursor = 0;
                if (announce) {
                    this.battleUI.addLog(
                        carriedEnemyCount > 0
                            ? `第${event.wave}波接续来袭！上一波${carriedEnemyCount}只与新怪同时压上。`
                            : `第${event.wave}波接续来袭！`
                    );
                }
                continue;
            }

            if (event.type === 'spawn-pack') {
                const packSize = getNormalPackSize(
                    event.wave,
                    event.packIndex
                );
                const startIndex = getNormalPackStartIndex(
                    event.wave,
                    event.packIndex
                );
                const spawnedEnemies = createNormalEnemyPack(
                    event.wave,
                    startIndex,
                    packSize,
                    this.getMonsterGrowthContext()
                );
                this.prepareSpawnedEnemies(spawnedEnemies);
                this.enemies.push(...spawnedEnemies);
                battlefieldChanged = true;
                continue;
            }

            if (event.type === 'spawn-elite') {
                const elite = createEliteEnemy(
                    event.wave,
                    this.getMonsterGrowthContext()
                );
                this.prepareSpawnedEnemies([elite]);
                this.enemies.push(elite);
                battlefieldChanged = true;
                if (announce) {
                    this.battleUI.addLog(
                        `${this.formatBattleTime(event.second)} 精英妖将降临！`
                    );
                }
                continue;
            }

            if (event.type === 'spawn-boss') {
                const boss = createBossEnemy(
                    event.wave,
                    999,
                    this.getMonsterGrowthContext()
                );
                this.prepareSpawnedEnemies([boss]);
                this.enemies.push(boss);
                battlefieldChanged = true;
                if (announce) {
                    this.battleUI.addLog('最终30秒，镇关妖王降临！');
                }
                continue;
            }

            this.timelineComplete = true;
            if (announce) {
                this.battleUI.addLog('五分钟倒计时结束，本轮立即结算！');
            }
        }

        if (battlefieldChanged) {
            this.renderCurrentWave();
        }

        if (this.timelineComplete) {
            this.finishStageAtTimeLimit();
        }
    }


    private updateBattleStatus(): void {
        const livingCount = this.getLivingEnemies().length;

        if (this.timelineComplete) {
            this.battleUI.setStatus(
                '5:00 · 本轮结算中'
            );
            return;
        }

        this.battleUI.setStatus(
            `剩余 ${this.formatBattleTime(this.battlePacingSystem.getRemainingSeconds())}` +
            ` · 第${this.currentWave}波 · 自动攻击${this.getMultiTargetCount()}目标` +
            ` · 怪物 ${livingCount}`
        );
    }


    private formatBattleTime(seconds: number): string {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(safeSeconds / 60);
        const remainder = safeSeconds % 60;
        return `${minutes}:${remainder < 10 ? '0' : ''}${remainder}`;
    }


    private onPlayerDead(): void {

        if (this.isPaused) {
            return;
        }

        this.pauseCombat();
        this.upgradeChoicesVisible = false;
        this.battleUI.hideUpgradeUI();
        this.battleUI.addLog('玩家被怪潮击败……');
        this.battleUI.showDefeat(
            () => this.retryRemainingWave(),
            this.onExit
        );
    }


    private retryRemainingWave(): void {

        this.battleUI.resetForRestart();
        this.currentPlayerHp = this.runData.maxHp;
        this.isPaused = false;

        this.updateRunUI();
        this.battleUI.addLog('恢复生命，继续清理本波剩余怪物！');
        this.startCombatTimers();
        this.showPendingUpgradeChoices();
    }


    private finishStage(): void {

        this.pauseCombat();
        this.upgradeChoicesVisible = false;
        this.battleUI.hideUpgradeUI();
        this.battleUI.addLog('五分钟试炼完成！');
        this.battleUI.showVictory(
            this.totalExpReward,
            this.totalGoldReward,
            () => this.restartStage(),
            this.onExit
        );
    }


    private finishStageAtTimeLimit(): void {
        this.battleUI.clearEnemyGroup();
        this.enemies = [];
        this.battleUI.updateWave(
            this.currentWave,
            this.totalWaves,
            0
        );
        this.finishStage();
    }


    private restartStage(): void {
        this.battleUI.resetForRestart();
        this.init(this.battleUI, this.onExit, this.buildSelection);
        this.battleUI.addLog('沿用战前携带方案，局内等级重置后开始新一局！');
        this.begin();
    }


    private pauseCombat(): void {
        this.isPaused = true;
        this.stop();
    }


    private getLivingEnemies(): MonsterData[] {
        return this.enemies.filter((enemy) => enemy.hp > 0);
    }


    private prepareSpawnedEnemies(enemies: MonsterData[]): void {
        const laneYs = BATTLE_BALANCE.monsterLaneYs;

        for (let index = 0; index < enemies.length; index++) {
            const enemy = enemies[index];
            const lane = (this.nextSpawnLane + index) % laneYs.length;
            const waveSpeedMultiplier = Math.min(
                BATTLE_BALANCE.maxMonsterMoveSpeedMultiplier,
                1 +
                Math.max(0, enemy.wave - 1) *
                    BATTLE_BALANCE.monsterMoveSpeedGrowthPerWave +
                Math.max(0, this.challengeRound - 1) *
                    BATTLE_BALANCE.monsterMoveSpeedGrowthPerRound
            );
            const baseSpeed = enemy.isBoss
                ? BATTLE_BALANCE.bossMoveSpeed
                : enemy.isElite
                    ? BATTLE_BALANCE.eliteMoveSpeed
                    : enemy.type === 'ranged'
                        ? BATTLE_BALANCE.rangedMoveSpeed
                        : BATTLE_BALANCE.meleeMoveSpeed;

            enemy.movementLane = lane;
            enemy.positionX = BATTLE_BALANCE.monsterSpawnX +
                index * BATTLE_BALANCE.monsterSpawnSpacingX;
            enemy.positionY = laneYs[lane];
            enemy.moveSpeed = baseSpeed * waveSpeedMultiplier * (
                enemy.isEnhanced
                    ? BATTLE_BALANCE.enhancedMoveSpeedMultiplier
                    : 1
            );
        }

        this.nextSpawnLane = (
            this.nextSpawnLane + enemies.length
        ) % laneYs.length;
    }


    private updateEnemyMovement = (): void => {
        if (this.isPaused) {
            return;
        }

        const groups = new Map<string, MonsterData[]>();
        for (const enemy of this.getLivingEnemies()) {
            const key = `${enemy.type}:${enemy.movementLane ?? 0}`;
            const group = groups.get(key) ?? [];
            group.push(enemy);
            groups.set(key, group);
        }

        for (const group of groups.values()) {
            group.sort((a, b) => {
                return (a.positionX ?? BATTLE_BALANCE.monsterSpawnX) -
                    (b.positionX ?? BATTLE_BALANCE.monsterSpawnX);
            });

            let previousX: number | null = null;
            for (const enemy of group) {
                const currentX = enemy.positionX ??
                    BATTLE_BALANCE.monsterSpawnX;
                const attackX = enemy.type === 'ranged'
                    ? BATTLE_BALANCE.rangedAttackX
                    : BATTLE_BALANCE.meleeAttackX;
                const queueX = previousX === null
                    ? attackX
                    : previousX + BATTLE_BALANCE.monsterQueueSpacingX;
                const targetX = Math.max(attackX, queueX);
                const movement = (enemy.moveSpeed ?? 0) *
                    BATTLE_BALANCE.monsterMovementTick;
                const nextX = currentX > targetX
                    ? Math.max(targetX, currentX - movement)
                    : currentX;

                enemy.positionX = nextX;
                previousX = nextX;
                this.battleUI.updateEnemyPosition(
                    enemy.id,
                    nextX,
                    enemy.positionY ?? 0
                );
            }
        }
    };


    private isEnemyInAttackRange(enemy: MonsterData): boolean {
        const attackX = enemy.type === 'ranged'
            ? BATTLE_BALANCE.rangedAttackX
            : BATTLE_BALANCE.meleeAttackX;
        return (enemy.positionX ?? BATTLE_BALANCE.monsterSpawnX) <=
            attackX + 1;
    }


    private getMonsterGrowthContext(): MonsterGrowthContext {
        return {
            playerPower: this.runData.maxHp +
                this.runData.atk * 10 +
                this.runData.def * 5 +
                this.runData.crit * 10,
            challengeRound: this.challengeRound,
            playerAttack: this.runData.atk,
            playerCrit: this.runData.crit,
            playerCritDamageMultiplier: this.runData.critDamageMultiplier
        };
    }


    private refreshLivingMonsterGrowth(): void {
        const growthContext = this.getMonsterGrowthContext();
        for (const enemy of this.getLivingEnemies()) {
            applyMonsterGrowth(enemy, growthContext);
            this.battleUI.updateEnemyHp(enemy.id, enemy.hp, enemy.maxHp);
        }
    }


    private getMultiTargetCount(): number {
        return Math.min(
            BATTLE_BALANCE.maxTargetCount,
            BATTLE_BALANCE.baseTargetCount +
            Math.floor(
                (this.runData.level - 1) /
                BATTLE_BALANCE.levelsPerExtraTarget
            )
        );
    }


    private applyInitialBuildEffects(): void {
        for (const skillId of this.buildRuntime.selectedSkillIds) {
            const definition = getSkillDefinition(skillId);
            const level = this.buildRuntime.skillLevels[skillId] ?? 1;
            const initialEffect = definition?.levelEffects.find((effect) => {
                return effect.level === level;
            });
            if (initialEffect) {
                this.runData.applyBonus(initialEffect.effect);
            }
        }
    }


    private updateBuildUI(): void {
        const skillSlots = this.buildRuntime.selectedSkillIds.map(
            (skillId, index) => {
                const definition = getSkillDefinition(skillId);
                const level = this.buildRuntime.skillLevels[skillId] ?? 1;
                return `${index + 1} ${definition?.skillName ?? skillId} Lv.${level}`;
            }
        );
        this.battleUI.updateSkillSlots(skillSlots);

        this.battleUI.updateBondSlots(
            this.battleCardSystem.getSlotDescriptions()
        );
        const bondProgress = this.buildRuntime.selectedBondIds.map((bondId) => {
            const definition = getBondDefinition(bondId);
            return definition?.bondName ?? bondId;
        });
        this.battleUI.updateFactionProgress(
            bondProgress.length > 0
                ? `${bondProgress.join(' · ')} · ` +
                    this.battleCardSystem.getProgressText()
                : '本局未携带羁绊'
        );
    }


    private updateRunUI(): void {
        this.currentPlayerHp = Math.min(
            this.currentPlayerHp,
            this.runData.maxHp
        );
        this.battleUI.updatePlayerRunInfo(
            this.runData.level,
            this.runData.exp,
            this.runData.expToNextLevel,
            this.runData.atk,
            this.runData.def,
            this.runData.crit,
            `${this.runData.secondaryStatsText}` +
            ` · 携带${this.buildRuntime.selectedSkillIds.length}技能` +
            ' · 单体攻击'
        );
        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            this.runData.maxHp
        );
    }


    private renderCurrentWave(): void {
        const livingEnemies = this.getLivingEnemies();
        this.battleUI.showEnemyGroup(livingEnemies);
        this.battleUI.updateWave(
            this.currentWave,
            this.totalWaves,
            livingEnemies.length
        );
    }
}
