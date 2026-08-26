import { _decorator, Component } from 'cc';

import { addGold } from './PlayerData';
import { BattleUI } from './BattleUI';
import type { EnemyViewData } from './BattleUI';

import {
    gamePlayerData,
    getOrCreatePlayerSkillState
} from './GameData/PlayerData';
import {
    BATTLE_PACING,
    getBattleWaveCount
} from './GameData/BattlePacingData';
import {
    FIRST_STAGE_TASKS,
    getFirstStageTask
} from './GameData/BattleTaskData';
import type { BattleTaskConfig } from './GameData/BattleTaskData';
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
    BATTLE_SKILL_UPGRADES,
    getBattleNormalAttackRuntimeConfig,
    getSkillDefinition,
    NORMAL_ATTACK_SKILL_ID
} from './GameData/SkillData';
import { UpgradeManager } from './Systems/UpgradeManager';
import type {
    UpgradeCard
} from './Systems/UpgradeCardGenerator';
import { UpgradeCardGenerator } from './Systems/UpgradeCardGenerator';
import { BondGrowthSystem } from './Systems/BondGrowthSystem';
import type { BondGrowthChoice } from './Systems/BondGrowthSystem';
import { saveSkillProgress } from './Systems/PlayerProgressStorage';

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
    growthContext: MonsterGrowthContext = DEFAULT_MONSTER_GROWTH_CONTEXT,
    index = 900
): MonsterData {
    const baseHp = getNormalBaseHp(wave);
    const baseAtk = getNormalBaseAttack('melee', wave);
    const baseDef = getNormalBaseDefense(wave) +
        BATTLE_PACING.elite.defenseBonus;
    const baseMaxHp = Math.round(
        baseHp * BATTLE_PACING.elite.hpMultiplier
    );

    return createScaledMonster({
        id: wave * 1000 + index,
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
    growthContext: MonsterGrowthContext = DEFAULT_MONSTER_GROWTH_CONTEXT,
    hpMultiplier = 1,
    attackMultiplier = 1,
    expReward: number = BATTLE_BALANCE.bossExp,
    name = '镇关妖王'
): MonsterData {
    const baseMaxHp = Math.round((BATTLE_BALANCE.bossBaseHp +
        wave * BATTLE_BALANCE.bossHpPerWave) * hpMultiplier);
    const baseDef = Math.round(
        BATTLE_BALANCE.bossBaseDefense +
        wave * BATTLE_BALANCE.bossDefensePerWave
    );
    const baseAtk = Math.round((
        BATTLE_BALANCE.bossBaseAttack +
        wave * BATTLE_BALANCE.bossAttackPerWave
    ) * attackMultiplier);

    return createScaledMonster({
        id: wave * 1000 + index,
        name,
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
        expReward,
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
    monster.level = scale.level;
    monster.maxHp = Math.max(
        1,
        Math.round(monster.baseMaxHp * scale.hpMultiplier)
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
    private bondGrowthSystem!: BondGrowthSystem;
    private equipmentSystem!: EquipmentSystem;
    private enemies: MonsterData[] = [];

    private currentPlayerHp = 0;
    private currentWave = 1;
    private readonly totalWaves = FIRST_STAGE_TASKS.length;
    private totalExpReward = 0;
    private totalGoldReward = 0;
    private attackCursor = 0;
    private battleComplete = false;
    private nextSpawnLane = 0;
    private upgradeChoicesVisible = false;
    private taskKillCount = 0;
    private taskEliteKillCount = 0;
    private nextEnemyIndex = 0;
    private nextEliteThresholdIndex = 0;
    private finalBossPhase = false;
    private taskBossId: number | null = null;
    private awakeningCounter = 0;

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
        for (const skillId of this.buildRuntime.selectedSkillIds) {
            this.buildRuntime.skillMetaLevels[skillId] =
                getOrCreatePlayerSkillState(gamePlayerData, skillId).level;
        }
        this.equipmentSystem = new EquipmentSystem(gamePlayerData.equipment);
        this.runData = new BattleRunData(
            this.equipmentSystem.calculateAttributes(gamePlayerData.attributes)
        );
        this.upgradeManager = new UpgradeManager(
            this.runData,
            this.buildRuntime
        );
        this.upgradeCardGenerator = new UpgradeCardGenerator(
            this.buildRuntime
        );
        this.bondGrowthSystem = new BondGrowthSystem();
        this.currentWave = 1;
        this.totalExpReward = 0;
        this.totalGoldReward = 0;
        this.attackCursor = 0;
        this.battleComplete = false;
        this.nextSpawnLane = 0;
        this.upgradeChoicesVisible = false;
        this.awakeningCounter = 0;
        this.currentPlayerHp = this.runData.maxHp;
        this.isPaused = false;
        this.enemies = [];
        this.battleUI.hideUpgradeUI();
        this.bindBattleUIActions();
        this.startTask(1, false);

        this.updateRunUI();
        this.renderCurrentWave();
        this.updateBuildUI();
    }


    begin(): void {
        this.updateBattleStatus();
        this.battleUI.addLog(
            `第一关开始：完成五个主线任务并击败最终首领！`
        );
        this.startCombatTimers();
    }


    stop(): void {
        this.unschedule(this.playerAttack);
        this.unschedule(this.enemyGroupAttack);
        this.unschedule(this.regeneratePlayer);
        this.unschedule(this.updateTaskSpawner);
        this.unschedule(this.updateEnemyMovement);
        this.unscheduleAllCallbacks();
    }


    private startCombatTimers(): void {

        this.unschedule(this.playerAttack);
        this.unschedule(this.enemyGroupAttack);
        this.unschedule(this.regeneratePlayer);
        this.unschedule(this.updateTaskSpawner);
        this.unschedule(this.updateEnemyMovement);

        this.schedule(this.playerAttack, this.runData.attackInterval);
        this.schedule(this.enemyGroupAttack, 1.5);
        this.schedule(this.regeneratePlayer, 1);
        this.schedule(
            this.updateEnemyMovement,
            BATTLE_BALANCE.monsterMovementTick
        );
        if (!this.battleComplete) {
            this.schedule(this.updateTaskSpawner, 0.5);
        }
    }


    private updateTaskSpawner = (): void => {
        if (this.isPaused || this.battleComplete) {
            return;
        }
        this.spawnForCurrentTask();
        this.updateBattleStatus();
        this.showPendingUpgradeChoices();
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
        const attackTaskId = this.currentWave;
        const config = this.getNormalAttackConfig();
        const bondAttack = this.bondGrowthSystem.recordNormalAttack(
            Date.now() / 1000
        );
        const awakeningReady = config.awakeningAttackInterval > 0 &&
            this.awakeningCounter >= config.awakeningAttackInterval;
        const targetCount = awakeningReady
            ? Math.max(1, config.awakeningMaxTargets)
            : 1 + config.scatterExtraTargets;
        const primaryTargets = living.slice(0, targetCount);
        const unavailableForPenetration = new Set(
            primaryTargets.map((target) => target.id)
        );
        const attackedIds: number[] = [];
        let defeatedCount = 0;

        for (let index = 0; index < primaryTargets.length; index++) {
            if (this.battleComplete || this.currentWave !== attackTaskId) {
                break;
            }
            const multiplier = awakeningReady
                ? config.awakeningDamageMultiplier
                : index === 0
                    ? 1
                    : config.scatterDamageMultiplier;
            defeatedCount += this.executeNormalAttackProjectile(
                primaryTargets[index],
                multiplier,
                living,
                unavailableForPenetration,
                attackedIds,
                config,
                attackTaskId
            );
        }

        if (awakeningReady) {
            this.awakeningCounter = 0;
            this.battleUI.addLog('【终极觉醒】强化齐射！');
        } else if (!this.battleComplete && this.currentWave === attackTaskId) {
            this.awakeningCounter++;
        }

        if (
            bondAttack.extraAttack &&
            !this.battleComplete &&
            this.currentWave === attackTaskId
        ) {
            const extraCandidates = this.getVisibleLivingEnemies();
            const extraTarget = extraCandidates[0];
            if (extraTarget) {
                const unavailable = new Set<number>([extraTarget.id]);
                defeatedCount += bondAttack.extraAttackTriggersEffects
                    ? this.executeNormalAttackProjectile(
                        extraTarget,
                        bondAttack.extraDamageMultiplier,
                        extraCandidates,
                        unavailable,
                        attackedIds,
                        config,
                        attackTaskId
                    )
                    : this.dealNormalAttackDamage(
                        extraTarget,
                        bondAttack.extraDamageMultiplier,
                        config.damageMultiplier,
                        attackedIds
                    );
            }
        }

        if (
            bondAttack.areaStrikeTargets > 0 &&
            !this.battleComplete &&
            this.currentWave === attackTaskId
        ) {
            const areaTargets = this.getVisibleLivingEnemies().slice(
                0,
                bondAttack.areaStrikeTargets
            );
            for (const target of areaTargets) {
                defeatedCount += this.dealNormalAttackDamage(
                    target,
                    bondAttack.areaStrikeDamageMultiplier,
                    config.damageMultiplier,
                    attackedIds
                );
            }
        }
        for (const message of bondAttack.messages) {
            this.battleUI.addLog(message);
        }

        this.battleUI.updateGrowthResources(
            this.bondGrowthSystem.getSpiritStones(),
            this.bondGrowthSystem.getDrawCost(),
            bondAttack.combo
        );

        this.battleUI.playPlayerAttack(
            attackedIds.filter((id, index, ids) => ids.indexOf(id) === index)
        );

        if (defeatedCount > 0) {
            this.afterEnemyDefeats();
        }
    };


    private getVisibleLivingEnemies(): MonsterData[] {
        return this.getLivingEnemies()
            .filter((enemy) => {
                return (enemy.positionX ?? BATTLE_BALANCE.monsterSpawnX) <=
                    BATTLE_BALANCE.monsterVisibleRightX;
            })
            .sort((a, b) => {
                return (a.positionX ?? BATTLE_BALANCE.monsterSpawnX) -
                    (b.positionX ?? BATTLE_BALANCE.monsterSpawnX);
            });
    }


    private executeNormalAttackProjectile(
        target: MonsterData,
        damageMultiplier: number,
        candidates: MonsterData[],
        unavailable: Set<number>,
        attackedIds: number[],
        config: ReturnType<typeof getBattleNormalAttackRuntimeConfig>,
        taskId: number
    ): number {
        let defeatedCount = this.dealNormalAttackDamage(
            target,
            damageMultiplier,
            config.damageMultiplier,
            attackedIds
        );

        for (let index = 0; index < config.penetrationTargets; index++) {
            if (this.battleComplete || this.currentWave !== taskId) {
                break;
            }
            const penetrationTarget = candidates.find((candidate) => {
                return candidate.hp > 0 && !unavailable.has(candidate.id);
            });
            if (!penetrationTarget) {
                break;
            }
            unavailable.add(penetrationTarget.id);
            defeatedCount += this.dealNormalAttackDamage(
                penetrationTarget,
                damageMultiplier * config.penetrationDamageMultiplier,
                config.damageMultiplier,
                attackedIds
            );
        }

        for (let index = 0; index < config.splitExtraAttacks; index++) {
            if (this.battleComplete || this.currentWave !== taskId) {
                break;
            }
            const sourceX = target.positionX ?? 0;
            const splitTarget = candidates.find((candidate) => {
                const candidateX = candidate.positionX ?? 0;
                return candidate.hp > 0 &&
                    !unavailable.has(candidate.id) &&
                    (config.splitTracksTargets ||
                        Math.abs(candidateX - sourceX) <= 160);
            });
            if (!splitTarget) {
                break;
            }
            unavailable.add(splitTarget.id);
            defeatedCount += this.dealNormalAttackDamage(
                splitTarget,
                damageMultiplier * config.splitDamageMultiplier,
                config.damageMultiplier,
                attackedIds
            );
        }
        return defeatedCount;
    }


    private dealNormalAttackDamage(
        target: MonsterData,
        sourceMultiplier: number,
        permanentSkillMultiplier: number,
        attackedIds: number[]
    ): number {
        const base = Math.max(1, this.runData.atk - target.def);
        const isCritical = Math.random() * 100 < this.runData.crit;
        const damage = Math.max(
            1,
            Math.round(
                base *
                sourceMultiplier *
                permanentSkillMultiplier *
                this.runData.skillDamageMultiplier *
                this.bondGrowthSystem.getCombatDamageMultiplier() *
                (isCritical ? this.runData.critDamageMultiplier : 1) *
                (0.9 + Math.random() * 0.2)
            )
        );

        target.hp = Math.max(0, target.hp - damage);
        attackedIds.push(target.id);
        this.battleUI.updateEnemyHp(target.id, target.hp, target.maxHp);
        this.battleUI.showEnemyDamage(target.id, damage, isCritical);
        if (target.hp > 0) {
            return 0;
        }
        this.resolveEnemyDefeat(target);
        return 1;
    }


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

        const spiritReward = this.bondGrowthSystem.grantEnemyReward(
            enemy.isElite,
            enemy.isBoss
        );
        if (spiritReward.amount > 0 && (enemy.isElite || enemy.isBoss)) {
            this.battleUI.addLog(
                `${enemy.isBoss ? '首领' : '精英'}掉落灵石 ×` +
                `${spiritReward.amount}`
            );
        }

        this.battleUI.removeEnemy(enemy.id);
        this.recordTaskProgress(enemy);
    }


    private afterEnemyDefeats(): void {

        this.updateRunUI();
        this.updateBuildUI();
        this.updateBattleStatus();

        if (this.battleComplete) {
            return;
        }

        // 升级选择只叠加 UI，不停止刷怪、移动、攻击或计时。
        this.showPendingUpgradeChoices();

        this.spawnForCurrentTask();
    }


    private showPendingUpgradeChoices(): void {
        const pendingLevelUps = this.upgradeManager.getPendingLevelUps();
        this.battleUI.updatePendingUpgradeCount(pendingLevelUps);

        if (pendingLevelUps <= 0 || this.upgradeChoicesVisible) {
            return;
        }

        const choices = this.upgradeCardGenerator.generateUpgradeCards(
            BATTLE_BALANCE.skillChoiceCount,
            'skill'
        );
        if (choices.length === 0) {
            this.upgradeManager.clearPendingLevelUps();
            this.battleUI.addLog('本局技能树已无可选节点');
            return;
        }

        this.upgradeChoicesVisible = true;
        this.battleUI.showUpgradeCards(
            choices,
            pendingLevelUps,
            (choice) => this.onUpgradeSelected(choice),
            () => {
                this.upgradeChoicesVisible = false;
                this.battleUI.hideUpgradeUI();
            }
        );
    }


    private onUpgradeSelected(choice: UpgradeCard): void {
        this.upgradeChoicesVisible = false;
        const previousAttackInterval = this.runData.attackInterval;
        const previousMaxHp = this.runData.maxHp;
        const result = this.upgradeManager.selectUpgrade(choice);

        if (result.success && result.bonus) {
            this.runData.applyBonus(result.bonus);
            this.currentPlayerHp += Math.max(
                0,
                this.runData.maxHp - previousMaxHp
            );
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


    private toBondUpgradeCard(choice: BondGrowthChoice): UpgradeCard {
        return {
            id: `bond:${choice.id}`,
            kind: 'bond',
            sourceId: choice.id,
            name: `${choice.bondName}·${choice.name}`,
            description: choice.description,
            nextLevel: choice.nextRank,
            bonus: {},
            rarity: choice.rarity,
            progress: choice.progress,
            weight: choice.weight
        };
    }


    private openBondDraw(): void {
        if (this.upgradeChoicesVisible || this.battleComplete) {
            this.battleUI.addLog('当前有选择界面，请先完成或关闭');
            return;
        }
        const result = this.bondGrowthSystem.drawChoices();
        this.battleUI.addLog(result.message);
        if (!result.success) {
            this.updateRunUI();
            return;
        }
        this.showBondChoices(result.choices);
    }


    private showBondChoices(choices: BondGrowthChoice[]): void {
        this.upgradeChoicesVisible = true;
        this.battleUI.showUpgradeCards(
            choices.map((choice) => this.toBondUpgradeCard(choice)),
            0,
            (choice) => this.onBondSelected(choice),
            () => {
                this.upgradeChoicesVisible = false;
                this.battleUI.hideUpgradeUI();
                this.updateRunUI();
            },
            1,
            () => this.refreshBondChoices(),
            {
                title: '羁绊抽卡 · 三选一',
                statusText: `灵石 ${this.bondGrowthSystem.getSpiritStones()}`,
                refreshText: `刷新 ${this.bondGrowthSystem.getRefreshCost()}灵石`
            }
        );
        this.updateRunUI();
    }


    private refreshBondChoices(): void {
        const result = this.bondGrowthSystem.refreshChoices();
        this.battleUI.addLog(result.message);
        if (result.success) {
            this.showBondChoices(result.choices);
        } else {
            this.updateRunUI();
        }
    }


    private onBondSelected(choice: UpgradeCard): void {
        this.upgradeChoicesVisible = false;
        const previousAttackInterval = this.runData.attackInterval;
        const previousMaxHp = this.runData.maxHp;
        const result = this.bondGrowthSystem.selectCard(choice.sourceId);
        if (result.success && result.bonus) {
            this.runData.applyBonus(result.bonus);
            this.currentPlayerHp += Math.max(
                0,
                this.runData.maxHp - previousMaxHp
            );
        }
        this.battleUI.addLog(result.message);
        if (
            result.success &&
            this.runData.attackInterval !== previousAttackInterval
        ) {
            this.refreshPlayerAttackTimer();
        }
        this.updateBuildUI();
        this.updateRunUI();
        this.showPendingUpgradeChoices();
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


    private getCurrentTask(): BattleTaskConfig {
        return getFirstStageTask(this.currentWave);
    }


    private startTask(taskId: number, announce = true): void {
        const task = getFirstStageTask(taskId);
        this.bondGrowthSystem.setTaskStage(task.id);
        this.currentWave = task.id;
        this.taskKillCount = 0;
        this.taskEliteKillCount = 0;
        this.nextEnemyIndex = 0;
        this.nextEliteThresholdIndex = 0;
        this.finalBossPhase = false;
        this.taskBossId = null;
        this.attackCursor = 0;
        this.enemies = [];
        this.battleUI.clearEnemyGroup();

        if (announce) {
            this.battleUI.addLog(`主线 1-${task.id}【${task.title}】开始！`);
        }
        if (task.kind === 'vanguard-boss') {
            this.spawnTaskBoss(task, false);
        }
        this.spawnForCurrentTask();
        this.updateBattleStatus();
    }


    private spawnForCurrentTask(): void {
        if (this.isPaused || this.battleComplete || this.finalBossPhase) {
            return;
        }

        const task = this.getCurrentTask();
        this.spawnDueElites(task);
        if (task.kind !== 'vanguard-boss' &&
            this.taskKillCount >= task.killTarget) {
            return;
        }

        const livingCount = this.getLivingEnemies().length;
        const capacity = Math.max(
            0,
            Math.min(task.targetOnScreen, task.hardCap) - livingCount
        );
        const remainingObjective = task.kind === 'vanguard-boss'
            ? Math.max(
                0,
                (task.supportMonsterLimit ?? 0) - this.nextEnemyIndex
            )
            : Math.max(0, task.killTarget - this.taskKillCount - livingCount);
        const spawnCount = Math.min(
            task.spawnBatchSize,
            capacity,
            remainingObjective
        );

        if (spawnCount <= 0) {
            return;
        }

        const spawned = createNormalEnemyPack(
            task.id,
            this.nextEnemyIndex,
            spawnCount,
            DEFAULT_MONSTER_GROWTH_CONTEXT
        );
        this.nextEnemyIndex += spawnCount;
        for (const enemy of spawned) {
            enemy.expReward = Math.max(
                1,
                Math.round(enemy.expReward * task.normalExpMultiplier)
            );
        }
        this.prepareSpawnedEnemies(spawned);
        this.enemies.push(...spawned);
        this.renderCurrentWave();
    }


    private spawnDueElites(task: BattleTaskConfig): void {
        while (
            this.nextEliteThresholdIndex <
                task.eliteSpawnKillThresholds.length &&
            this.taskKillCount >=
                task.eliteSpawnKillThresholds[this.nextEliteThresholdIndex]
        ) {
            if (this.getLivingEnemies().length >= task.hardCap) {
                return;
            }
            const elite = createEliteEnemy(
                task.id,
                DEFAULT_MONSTER_GROWTH_CONTEXT,
                900 + this.nextEliteThresholdIndex
            );
            elite.expReward = Math.max(
                1,
                Math.round(elite.expReward * task.normalExpMultiplier)
            );
            this.prepareSpawnedEnemies([elite]);
            this.enemies.push(elite);
            this.nextEliteThresholdIndex++;
            this.battleUI.addLog('精英妖将降临！');
        }
    }


    private spawnTaskBoss(task: BattleTaskConfig, finalBoss: boolean): void {
        const boss = createBossEnemy(
            task.id,
            999,
            DEFAULT_MONSTER_GROWTH_CONTEXT,
            task.bossHpMultiplier ?? 1,
            task.bossAttackMultiplier ?? 1,
            task.bossExpReward ?? BATTLE_BALANCE.bossExp,
            finalBoss ? '终焉妖王' : '先锋妖王'
        );
        this.taskBossId = boss.id;
        this.prepareSpawnedEnemies([boss]);
        this.enemies.push(boss);
        this.renderCurrentWave();
        this.battleUI.addLog(
            finalBoss ? '最终首领降临！' : '先锋首领率领怪潮来袭！'
        );
    }


    private recordTaskProgress(enemy: MonsterData): void {
        if (this.battleComplete) {
            return;
        }
        const task = this.getCurrentTask();

        if (!enemy.isBoss) {
            this.taskKillCount++;
        }
        if (enemy.isElite) {
            this.taskEliteKillCount++;
        }

        if (enemy.isBoss && enemy.id === this.taskBossId) {
            if (task.kind === 'final-battle' && this.finalBossPhase) {
                this.battleComplete = true;
                this.finishStage();
                return;
            }
            if (task.kind === 'vanguard-boss') {
                this.completeCurrentTask();
                return;
            }
        }

        if (task.kind === 'kill' &&
            this.taskKillCount >= task.killTarget &&
            this.taskEliteKillCount >= task.eliteKillTarget) {
            this.completeCurrentTask();
            return;
        }

        if (task.kind === 'final-battle' &&
            !this.finalBossPhase &&
            this.taskKillCount >= task.killTarget) {
            this.beginFinalBoss(task);
            return;
        }

        this.updateBattleStatus();
    }


    private completeCurrentTask(): void {
        const task = this.getCurrentTask();
        this.grantTaskReward(task);
        if (task.id >= FIRST_STAGE_TASKS.length) {
            return;
        }
        this.startTask(task.id + 1);
    }


    private beginFinalBoss(task: BattleTaskConfig): void {
        this.grantTaskReward(task);
        const recovery = Math.round(
            this.runData.maxHp * (task.transitionHealPercent ?? 0)
        );
        if (recovery > 0) {
            this.currentPlayerHp = Math.min(
                this.runData.maxHp,
                this.currentPlayerHp + recovery
            );
            this.battleUI.addLog(`决战恢复生命 ${recovery}！`);
        }
        this.finalBossPhase = true;
        this.enemies = [];
        this.battleUI.clearEnemyGroup();
        this.spawnTaskBoss(task, true);
        this.updateBattleStatus();
    }


    private grantTaskReward(task: BattleTaskConfig): void {
        const previousMaxHp = this.runData.maxHp;
        this.upgradeManager.addExp(task.taskExpReward);
        const spiritReward = this.bondGrowthSystem.grantTaskReward(task.id);
        this.currentPlayerHp += Math.max(
            0,
            this.runData.maxHp - previousMaxHp
        );
        this.totalExpReward += task.taskExpReward;
        this.battleUI.addLog(
            `完成 1-${task.id}，获得 ${task.taskExpReward} EXP` +
            ` 和 ${spiritReward.amount} 灵石！`
        );
        this.updateRunUI();
    }


    private updateBattleStatus(): void {
        const task = this.getCurrentTask();
        const livingCount = this.getLivingEnemies().length;
        let progress = '';

        if (task.kind === 'vanguard-boss') {
            const boss = this.getLivingEnemies().find((enemy) => enemy.isBoss);
            progress = boss
                ? `首领 HP ${boss.hp}/${boss.maxHp}`
                : '首领降临中';
        } else if (task.kind === 'final-battle' && this.finalBossPhase) {
            const boss = this.getLivingEnemies().find((enemy) => enemy.isBoss);
            progress = boss
                ? `最终首领 HP ${boss.hp}/${boss.maxHp}`
                : '最终首领降临中';
        } else {
            progress = `击杀 ${Math.min(this.taskKillCount, task.killTarget)}/${task.killTarget}`;
            if (task.eliteKillTarget > 0) {
                progress += ` · 精英 ${Math.min(this.taskEliteKillCount, task.eliteKillTarget)}/${task.eliteKillTarget}`;
            }
        }

        this.battleUI.setStatus(
            `${progress} · 自动攻击${this.getMultiTargetCount()}目标 · 同屏 ${livingCount}/${task.hardCap}`
        );
        this.battleUI.updateTask(
            task.id,
            FIRST_STAGE_TASKS.length,
            task.title,
            progress
        );
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
        this.battleUI.addLog('恢复生命，继续当前主线任务！');
        this.startCombatTimers();
        this.showPendingUpgradeChoices();
    }


    private finishStage(): void {

        this.pauseCombat();
        this.upgradeChoicesVisible = false;
        this.battleUI.hideUpgradeUI();
        this.battleUI.addLog('五个主线任务完成，最终首领已被击败！');
        this.battleUI.showVictory(
            this.totalExpReward,
            this.totalGoldReward,
            () => this.restartStage(),
            this.onExit
        );
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
                    BATTLE_BALANCE.monsterMoveSpeedGrowthPerWave
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


    private getMultiTargetCount(): number {
        const config = this.getNormalAttackConfig();
        const awakeningReady = config.awakeningAttackInterval > 0 &&
            this.awakeningCounter >= config.awakeningAttackInterval;
        return awakeningReady
            ? Math.max(1, config.awakeningMaxTargets)
            : 1 + config.scatterExtraTargets;
    }


    private getNormalAttackConfig(): ReturnType<
        typeof getBattleNormalAttackRuntimeConfig
    > {
        return getBattleNormalAttackRuntimeConfig(
            this.buildRuntime.skillUpgradeLevels[NORMAL_ATTACK_SKILL_ID] ?? {}
        );
    }


    private updateBuildUI(): void {
        const skillSlots = this.buildRuntime.selectedSkillIds.map(
            (skillId, index) => {
                const definition = getSkillDefinition(skillId);
                const metaLevel = this.buildRuntime.skillMetaLevels[skillId] ?? 1;
                const ranks = this.buildRuntime.skillUpgradeLevels[skillId] ?? {};
                const coreNames = BATTLE_SKILL_UPGRADES
                    .filter((node) => {
                        return node.skillId === skillId &&
                            node.rarity !== 'basic' &&
                            (ranks[node.id] ?? 0) > 0;
                    })
                    .map((node) => node.name);
                return `${index + 1} ${definition?.skillName ?? skillId}` +
                    ` 元Lv${metaLevel} · 节点${Object.keys(ranks).length}` +
                    (coreNames.length > 0 ? ` · ${coreNames.join('/')}` : '');
            }
        );
        this.battleUI.updateSkillSlots(skillSlots);

        this.battleUI.updateBondSlots(
            this.bondGrowthSystem.getCardDescriptions()
        );
        this.battleUI.updateFactionProgress(
            this.bondGrowthSystem.getProgressText()
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
        this.battleUI.updateGrowthResources(
            this.bondGrowthSystem.getSpiritStones(),
            this.bondGrowthSystem.getDrawCost(),
            this.bondGrowthSystem.getCombo()
        );
    }


    private bindBattleUIActions(): void {
        this.battleUI.setBondDrawHandler(() => this.openBondDraw());
        this.battleUI.setDebugActions({
            addExp: () => {
                this.upgradeManager.addExp(100);
                this.afterDebugStateChange('调试：增加100经验');
            },
            forceLevelUp: () => {
                const needed = Math.max(
                    1,
                    this.runData.expToNextLevel - this.runData.exp
                );
                this.upgradeManager.addExp(needed);
                this.afterDebugStateChange('调试：强制角色升级');
            },
            addSpiritStones: () => {
                this.bondGrowthSystem.addSpiritStones(1000);
                this.afterDebugStateChange('调试：增加1000灵石');
            },
            forceSkillChoice: () => {
                this.upgradeManager.addPendingChoices(1);
                this.afterDebugStateChange('调试：增加1次技能选择');
            },
            forceBondDraw: () => {
                const missing = Math.max(
                    0,
                    this.bondGrowthSystem.getDrawCost() -
                        this.bondGrowthSystem.getSpiritStones()
                );
                this.bondGrowthSystem.addSpiritStones(missing);
                this.openBondDraw();
            },
            cycleMetaLevel: () => this.cycleDebugMetaLevel(),
            inspectSkillNodes: () => {
                const ranks = this.buildRuntime.skillUpgradeLevels[
                    NORMAL_ATTACK_SKILL_ID
                ] ?? {};
                const names = Object.keys(ranks).map((id) => {
                    return BATTLE_SKILL_UPGRADES.find((node) => {
                        return node.id === id;
                    })?.name ?? id;
                });
                this.battleUI.addLog(
                    `技能节点：${names.length > 0 ? names.join('、') : '无'}`
                );
            },
            inspectBondCards: () => {
                const cards = this.bondGrowthSystem.getCardDescriptions();
                this.battleUI.addLog(
                    `羁绊卡：${cards.length > 0 ? cards.join('、') : '无'}`
                );
            },
            inspectWeights: () => {
                this.battleUI.addLog(
                    `技能权重：${this.upgradeCardGenerator.getDebugWeightText()}`
                );
                this.battleUI.addLog(
                    `羁绊权重：${this.bondGrowthSystem.getDebugWeightText()}`
                );
            },
            resetBuild: () => this.restartStage()
        });
    }


    private cycleDebugMetaLevel(): void {
        const levels = [1, 3, 6, 9, 10];
        const current = this.buildRuntime.skillMetaLevels[
            NORMAL_ATTACK_SKILL_ID
        ] ?? 1;
        const index = levels.indexOf(current);
        const next = levels[(index + 1) % levels.length];
        const state = getOrCreatePlayerSkillState(
            gamePlayerData,
            NORMAL_ATTACK_SKILL_ID
        );
        state.level = next;
        saveSkillProgress(gamePlayerData);
        this.buildRuntime.skillMetaLevels[NORMAL_ATTACK_SKILL_ID] = next;
        this.afterDebugStateChange(`调试：局外普攻设为 Lv${next}`);
    }


    private afterDebugStateChange(message: string): void {
        this.battleUI.addLog(message);
        this.updateRunUI();
        this.updateBuildUI();
        this.showPendingUpgradeChoices();
    }


    private renderCurrentWave(): void {
        const livingEnemies = this.getLivingEnemies();
        this.battleUI.showEnemyGroup(livingEnemies);
    }
}
