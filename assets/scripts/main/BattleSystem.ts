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
    CardSystem
} from './Systems/CardSystem';
import {
    BattlePacingSystem
} from './Systems/BattlePacingSystem';
import type {
    BattlePacingEvent
} from './Systems/BattlePacingSystem';
import type { CardChoice } from './Systems/CardSystem';
import { EquipmentSystem } from './Systems/EquipmentSystem';
import { FactionSystem } from './Systems/FactionSystem';
import {
    BATTLE_RUN_LEVEL_POLICY,
    PlayerLevelSystem
} from './Systems/PlayerLevelSystem';
import { SkillSystem } from './Systems/SkillSystem';

import { BattleRunData } from './BattleRunData';

import {
    BATTLE_BALANCE,
    getWaveComposition
} from './BattleBalance';

const { ccclass } = _decorator;


export type EnemyType = 'melee' | 'ranged';

export interface MonsterData extends EnemyViewData {
    level: number;
    def: number;
    atk: number;
    expReward: number;
    goldReward: number;
    skillExpReward: number;
    isElite: boolean;
}


export function createWaveEnemies(wave: number): MonsterData[] {

    const composition = getWaveComposition(wave);
    const enemies: MonsterData[] = [];

    for (let index = 0; index < composition.total; index++) {
        enemies.push(createNormalEnemy(wave, index));
    }

    // 保留旧工厂函数的第10波Boss行为，供未迁移调用继续使用。
    if (wave === getBattleWaveCount() && enemies.length > 0) {
        enemies[0] = createBossEnemy(wave, 0);
    }

    return enemies;
}


export function createNormalEnemyPack(
    wave: number,
    startIndex: number,
    count: number
): MonsterData[] {
    const enemies: MonsterData[] = [];
    for (let offset = 0; offset < count; offset++) {
        enemies.push(createNormalEnemy(wave, startIndex + offset));
    }
    return enemies;
}


export function createEliteEnemy(wave: number): MonsterData {
    const baseHp = 10 + wave * 3;
    const baseAtk = 3 + Math.floor(wave / 3);
    const maxHp = Math.round(
        baseHp * BATTLE_PACING.elite.hpMultiplier
    );

    return {
        id: wave * 1000 + 900,
        name: '精英妖将',
        type: 'melee',
        isBoss: false,
        isElite: true,
        level: wave,
        maxHp,
        hp: maxHp,
        def: Math.floor(wave / 4) + BATTLE_PACING.elite.defenseBonus,
        atk: Math.round(baseAtk * BATTLE_PACING.elite.attackMultiplier),
        expReward: BATTLE_PACING.elite.expReward,
        goldReward: BATTLE_PACING.elite.goldReward,
        skillExpReward: BATTLE_PACING.elite.skillExpReward
    };
}


export function createBossEnemy(wave: number, index = 999): MonsterData {
    return {
        id: wave * 1000 + index,
        name: '镇关妖王',
        type: 'melee',
        isBoss: true,
        isElite: false,
        level: wave,
        maxHp: 500,
        hp: 500,
        def: 5 + wave,
        atk: 12 + wave,
        expReward: BATTLE_BALANCE.bossExp,
        goldReward: BATTLE_BALANCE.bossGold,
        skillExpReward: BATTLE_PACING.bossSkillExpReward
    };
}


function createNormalEnemy(wave: number, index: number): MonsterData {
    const composition = getWaveComposition(wave);
    const compositionIndex = composition.total > 0
        ? index % composition.total
        : index;
    const type: EnemyType = compositionIndex < composition.melee
        ? 'melee'
        : 'ranged';
    const maxHp = 10 + wave * 3;

    return {
        id: wave * 1000 + index,
        name: type === 'melee' ? '近战妖兽' : '远程妖兽',
        type,
        isBoss: false,
        isElite: false,
        level: wave,
        maxHp,
        hp: maxHp,
        def: Math.floor(wave / 4),
        atk: type === 'ranged'
            ? 4 + Math.floor(wave / 2)
            : 3 + Math.floor(wave / 3),
        expReward: BATTLE_BALANCE.normalEnemyExp,
        goldReward: BATTLE_BALANCE.normalEnemyGold,
        skillExpReward: BATTLE_PACING.normalSkillExpReward
    };
}


@ccclass('BattleSystem')
export class BattleSystem extends Component {

    private battleUI!: BattleUI;
    private runData!: BattleRunData;
    private playerLevelSystem!: PlayerLevelSystem;
    private skillSystem!: SkillSystem;
    private cardSystem!: CardSystem;
    private factionSystem!: FactionSystem;
    private equipmentSystem!: EquipmentSystem;
    private battlePacingSystem!: BattlePacingSystem;
    private enemies: MonsterData[] = [];

    private currentPlayerHp = 0;
    private currentWave = 1;
    private readonly totalWaves = getBattleWaveCount();
    private totalExpReward = 0;
    private totalGoldReward = 0;
    private pendingCardChoices = 0;
    private attackCursor = 0;
    private timelineComplete = false;

    private isPaused = false;
    private onExit: () => void = () => {};


    init(ui: BattleUI, onExit: () => void): void {

        this.battleUI = ui;
        this.onExit = onExit;
        this.skillSystem = new SkillSystem(
            gamePlayerData.skills.map((skill) => ({ ...skill }))
        );
        this.factionSystem = new FactionSystem(
            gamePlayerData.currentFaction,
            this.skillSystem
        );
        this.equipmentSystem = new EquipmentSystem(gamePlayerData.equipment);
        this.runData = new BattleRunData(
            this.equipmentSystem.calculateAttributes(gamePlayerData.attributes)
        );
        this.playerLevelSystem = new PlayerLevelSystem(
            this.runData,
            BATTLE_RUN_LEVEL_POLICY
        );
        this.cardSystem = new CardSystem(this.factionSystem);
        this.battlePacingSystem = new BattlePacingSystem();

        this.currentWave = 1;
        this.totalExpReward = 0;
        this.totalGoldReward = 0;
        this.pendingCardChoices = 0;
        this.attackCursor = 0;
        this.timelineComplete = false;
        this.currentPlayerHp = this.runData.maxHp;
        this.isPaused = false;
        this.enemies = [];
        this.handlePacingEvents(this.battlePacingSystem.start(), false);

        this.updateRunUI();
        this.renderCurrentWave();
        this.battleUI.updateSkillSlots([]);
        this.battleUI.updateFactionProgress(
            this.factionSystem.getProgressText()
        );
    }


    begin(): void {
        this.updateBattleStatus();
        this.battleUI.addLog(
            `十分钟试炼开始，第1批${this.enemies.length}只敌人进入战场！`
        );
        this.startCombatTimers();
    }


    stop(): void {
        this.unschedule(this.playerAttack);
        this.unschedule(this.enemyGroupAttack);
        this.unschedule(this.regeneratePlayer);
        this.unschedule(this.updateBattleTimeline);
        this.unscheduleAllCallbacks();
    }


    private startCombatTimers(): void {

        this.unschedule(this.playerAttack);
        this.unschedule(this.enemyGroupAttack);
        this.unschedule(this.regeneratePlayer);
        this.unschedule(this.updateBattleTimeline);

        this.schedule(this.playerAttack, this.runData.attackInterval);
        this.schedule(this.enemyGroupAttack, 1.5);
        this.schedule(this.regeneratePlayer, 1);
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

        const living = this.getLivingEnemies();
        if (living.length === 0) {
            return;
        }

        // 前期同时攻击3只；每4级增加1个目标，上限10只。
        const targetCount = Math.min(
            living.length,
            this.getMultiTargetCount()
        );
        const targets: MonsterData[] = [];

        for (let i = 0; i < targetCount; i++) {
            const index = (this.attackCursor + i) % living.length;
            targets.push(living[index]);
        }
        this.attackCursor = (this.attackCursor + targetCount) % living.length;

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
            .filter((enemy) => enemy.type === 'melee')
            .slice(0, 4);
        const rangedAttackers = living
            .filter((enemy) => enemy.type === 'ranged')
            .slice(0, 2);
        const attackers = [...meleeAttackers, ...rangedAttackers];

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
        this.pendingCardChoices += this.playerLevelSystem.addExp(
            enemy.expReward
        ).levelsGained;
        this.currentPlayerHp += Math.max(
            0,
            this.runData.maxHp - previousMaxHp
        );

        addGold(enemy.goldReward);
        this.totalExpReward += enemy.expReward;
        this.totalGoldReward += enemy.goldReward;

        this.grantSkillExp(enemy);

        const progress = this.cardSystem.recordKill();
        for (const bonus of progress.bonuses) {
            const oldMaxHp = this.runData.maxHp;
            this.runData.applyBonus(bonus);
            this.currentPlayerHp += Math.max(0, this.runData.maxHp - oldMaxHp);
        }
        for (const message of progress.messages) {
            this.battleUI.addLog(message);
        }

        this.battleUI.removeEnemy(enemy.id);
    }


    private afterEnemyDefeats(): void {

        this.updateRunUI();
        this.battleUI.updateSkillSlots(
            this.cardSystem.getSlotDescriptions()
        );
        this.battleUI.updateFactionProgress(
            this.factionSystem.getProgressText()
        );
        this.battleUI.updateWave(
            this.currentWave,
            this.totalWaves,
            this.getLivingEnemies().length
        );

        if (this.pendingCardChoices > 0) {
            this.pauseCombat();
            this.showNextCardChoice();
            return;
        }

        if (this.timelineComplete && this.getLivingEnemies().length === 0) {
            this.finishStage();
            return;
        }

        if (this.getLivingEnemies().length === 0) {
            this.spawnNextNormalPackImmediately();
        }
    }


    private showNextCardChoice(): void {

        const choices = this.cardSystem.getChoices(3);

        if (choices.length === 0) {
            this.pendingCardChoices = 0;
            this.resumeAfterChoices();
            return;
        }

        this.battleUI.setStatus(
            `局内 Lv.${this.runData.level} · 选择成长路线`
        );
        this.battleUI.showCardChoices(
            choices,
            (choice) => this.onCardSelected(choice)
        );
    }


    private onCardSelected(choice: CardChoice): void {

        const result = this.cardSystem.selectCard(choice.id);

        if (!result.success) {
            this.battleUI.addLog(result.message);
            this.showNextCardChoice();
            return;
        }

        if (result.bonus) {
            const oldMaxHp = this.runData.maxHp;
            this.runData.applyBonus(result.bonus);
            this.currentPlayerHp += Math.max(0, this.runData.maxHp - oldMaxHp);
        }

        this.pendingCardChoices--;
        this.battleUI.addLog(result.message);
        this.battleUI.updateSkillSlots(
            this.cardSystem.getSlotDescriptions()
        );
        this.updateRunUI();

        if (this.pendingCardChoices > 0) {
            this.showNextCardChoice();
        } else {
            this.resumeAfterChoices();
        }
    }


    private resumeAfterChoices(): void {

        if (this.timelineComplete && this.getLivingEnemies().length === 0) {
            this.finishStage();
            return;
        }

        this.isPaused = false;
        if (this.getLivingEnemies().length === 0) {
            this.spawnNextNormalPackImmediately();
        }
        this.updateBattleStatus();
        this.startCombatTimers();
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


    private grantSkillExp(enemy: MonsterData): void {

        const skillId = this.factionSystem.getCurrentFaction().startSkill;
        const previousAttackInterval = this.runData.attackInterval;
        const previousState = this.skillSystem.getSkills().find((skill) => {
            return skill.skillId === skillId;
        });
        const previousLevel = previousState?.level ?? 0;
        const result = this.skillSystem.addSkillExp(
            skillId,
            enemy.skillExpReward
        );

        if (!result.success || result.levelsGained <= 0) {
            return;
        }

        const definition = this.skillSystem.getDefinition(skillId);

        for (
            let level = previousLevel + 1;
            level <= result.level;
            level++
        ) {
            const oldMaxHp = this.runData.maxHp;
            this.runData.applyBonus(
                this.skillSystem.getSkillEffect(skillId, level)
            );
            this.currentPlayerHp += Math.max(
                0,
                this.runData.maxHp - oldMaxHp
            );
            this.battleUI.addLog(
                `技能【${definition?.skillName ?? skillId}】提升至 Lv.${level}`
            );
        }

        if (this.runData.attackInterval !== previousAttackInterval) {
            this.refreshPlayerAttackTimer();
        }
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
                            ? `第${event.wave}波开始！上一波剩余${carriedEnemyCount}只继续留场。`
                            : `第${event.wave}波开始！`
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
                this.enemies.push(
                    ...createNormalEnemyPack(
                        event.wave,
                        startIndex,
                        packSize
                    )
                );
                battlefieldChanged = true;
                continue;
            }

            if (event.type === 'spawn-elite') {
                this.enemies.push(createEliteEnemy(event.wave));
                battlefieldChanged = true;
                if (announce) {
                    this.battleUI.addLog(
                        `${this.formatBattleTime(event.second)} 精英妖将降临！`
                    );
                }
                continue;
            }

            if (event.type === 'spawn-boss') {
                this.enemies.push(createBossEnemy(event.wave));
                battlefieldChanged = true;
                if (announce) {
                    this.battleUI.addLog('最终一分钟，镇关妖王降临！');
                }
                continue;
            }

            this.timelineComplete = true;
            if (announce) {
                this.battleUI.addLog('十分钟时间轴结束，开始清剿残敌！');
            }
        }

        if (battlefieldChanged) {
            this.renderCurrentWave();
        }

        if (
            this.timelineComplete &&
            this.pendingCardChoices <= 0 &&
            this.getLivingEnemies().length === 0
        ) {
            this.finishStage();
        }
    }


    private updateBattleStatus(): void {
        const livingCount = this.getLivingEnemies().length;

        if (this.timelineComplete) {
            this.battleUI.setStatus(
                `10:00 · 清剿残敌 · 怪物剩余 ${livingCount}`
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
    }


    private finishStage(): void {

        this.pauseCombat();
        this.battleUI.addLog('十分钟试炼完成，怪潮全部清空！');
        this.battleUI.showVictory(
            this.totalExpReward,
            this.totalGoldReward,
            () => this.restartStage(),
            this.onExit
        );
    }


    private restartStage(): void {

        this.battleUI.resetForRestart();
        this.currentWave = 1;
        this.totalExpReward = 0;
        this.totalGoldReward = 0;
        this.pendingCardChoices = 0;
        this.attackCursor = 0;
        this.currentPlayerHp = this.runData.maxHp;
        this.timelineComplete = false;
        this.enemies = [];
        this.isPaused = false;
        this.handlePacingEvents(this.battlePacingSystem.start(), false);

        this.updateRunUI();
        this.renderCurrentWave();
        this.battleUI.addLog('保留本局构筑，开始下一轮十分钟试炼！');
        this.updateBattleStatus();
        this.startCombatTimers();
    }


    private pauseCombat(): void {
        this.isPaused = true;
        this.stop();
    }


    private getLivingEnemies(): MonsterData[] {
        return this.enemies.filter((enemy) => enemy.hp > 0);
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
            ` · ${this.getStartSkillStatusText()}` +
            ` · 多目标 ${this.getMultiTargetCount()}`
        );
        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            this.runData.maxHp
        );
    }


    private getStartSkillStatusText(): string {
        const skillId = this.factionSystem.getCurrentFaction().startSkill;
        const definition = this.skillSystem.getDefinition(skillId);
        const state = this.skillSystem.getSkills().find((skill) => {
            return skill.skillId === skillId;
        });
        return `${definition?.skillName ?? '初始技能'} Lv.${state?.level ?? 1}`;
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
