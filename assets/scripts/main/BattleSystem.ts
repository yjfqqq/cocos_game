import { _decorator, Component } from 'cc';

import { addGold } from './PlayerData';
import { BattleUI } from './BattleUI';
import type { EnemyViewData } from './BattleUI';

import {
    BattleCardSystem,
    CardChoice
} from './CardSystem';

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
}


export function createWaveEnemies(wave: number): MonsterData[] {

    const composition = getWaveComposition(wave);
    const count = composition.total;
    const meleeCount = composition.melee;
    const enemies: MonsterData[] = [];

    for (let index = 0; index < count; index++) {
        const type: EnemyType = index < meleeCount ? 'melee' : 'ranged';
        const isBoss = wave === 10 && index === 0;
        const baseHp = 10 + wave * 3;
        const hp = isBoss ? 500 : baseHp;

        enemies.push({
            id: wave * 1000 + index,
            name: isBoss
                ? '镇关妖王'
                : type === 'melee'
                    ? '近战妖兽'
                    : '远程妖兽',
            type,
            isBoss,
            level: wave,
            maxHp: hp,
            hp,
            def: isBoss ? 5 + wave : Math.floor(wave / 4),
            atk: isBoss
                ? 12 + wave
                : type === 'ranged'
                    ? 4 + Math.floor(wave / 2)
                    : 3 + Math.floor(wave / 3),
            expReward: isBoss
                ? BATTLE_BALANCE.bossExp
                : BATTLE_BALANCE.normalEnemyExp,
            goldReward: isBoss
                ? BATTLE_BALANCE.bossGold
                : BATTLE_BALANCE.normalEnemyGold
        });
    }

    return enemies;
}


@ccclass('BattleSystem')
export class BattleSystem extends Component {

    private battleUI!: BattleUI;
    private runData!: BattleRunData;
    private cardSystem!: BattleCardSystem;
    private enemies: MonsterData[] = [];

    private currentPlayerHp = 0;
    private currentWave = 1;
    private readonly totalWaves = 10;
    private totalExpReward = 0;
    private totalGoldReward = 0;
    private pendingCardChoices = 0;
    private attackCursor = 0;

    private isPaused = false;
    private onExit: () => void = () => {};


    init(ui: BattleUI, onExit: () => void): void {

        this.battleUI = ui;
        this.onExit = onExit;
        this.runData = new BattleRunData();
        this.cardSystem = new BattleCardSystem();

        this.currentWave = 1;
        this.totalExpReward = 0;
        this.totalGoldReward = 0;
        this.pendingCardChoices = 0;
        this.attackCursor = 0;
        this.currentPlayerHp = this.runData.maxHp;
        this.isPaused = false;
        this.enemies = createWaveEnemies(this.currentWave);

        this.updateRunUI();
        this.renderCurrentWave();
        this.battleUI.updateSkillSlots([]);
        this.battleUI.updateFactionProgress(
            this.cardSystem.getProgressText()
        );
    }


    begin(): void {
        this.battleUI.setStatus('怪潮来袭 · 自动多目标攻击中');
        this.battleUI.addLog(
            `第1波：${this.enemies.length}只敌人同时进入战场！`
        );
        this.startCombatTimers();
    }


    stop(): void {
        this.unschedule(this.playerAttack);
        this.unschedule(this.enemyGroupAttack);
        this.unschedule(this.regeneratePlayer);
        this.unscheduleAllCallbacks();
    }


    private startCombatTimers(): void {

        this.unschedule(this.playerAttack);
        this.unschedule(this.enemyGroupAttack);
        this.unschedule(this.regeneratePlayer);

        this.schedule(this.playerAttack, this.runData.attackInterval);
        this.schedule(this.enemyGroupAttack, 1.5);
        this.schedule(this.regeneratePlayer, 1);
    }


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
        this.pendingCardChoices += this.runData.addExp(enemy.expReward);
        this.currentPlayerHp += Math.max(
            0,
            this.runData.maxHp - previousMaxHp
        );

        addGold(enemy.goldReward);
        this.totalExpReward += enemy.expReward;
        this.totalGoldReward += enemy.goldReward;

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
            this.cardSystem.getProgressText()
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

        if (this.getLivingEnemies().length === 0) {
            this.pauseCombat();
            this.finishWave();
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

        if (this.getLivingEnemies().length === 0) {
            this.finishWave();
            return;
        }

        this.isPaused = false;
        this.battleUI.setStatus(
            `自动攻击 ${this.getMultiTargetCount()} 个目标 · 怪物剩余 ${this.getLivingEnemies().length}`
        );
        this.startCombatTimers();
    }


    private finishWave(): void {

        if (this.currentWave >= this.totalWaves) {
            this.finishStage();
            return;
        }

        this.battleUI.setStatus('怪潮清空，下一波即将抵达……');
        this.scheduleOnce(() => this.startNextWave(), 0.7);
    }


    private startNextWave(): void {

        this.currentWave++;
        this.enemies = createWaveEnemies(this.currentWave);
        this.attackCursor = 0;
        this.isPaused = false;

        this.renderCurrentWave();
        this.battleUI.addLog(
            `第${this.currentWave}波：${this.enemies.length}只敌人同时出现！`
        );
        this.battleUI.setStatus(
            `自动攻击 ${this.getMultiTargetCount()} 个目标 · 怪物剩余 ${this.enemies.length}`
        );
        this.startCombatTimers();
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
        this.battleUI.addLog('十波怪潮全部清空！');
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
        this.enemies = createWaveEnemies(1);
        this.isPaused = false;

        this.updateRunUI();
        this.renderCurrentWave();
        this.battleUI.addLog('保留本局构筑，开始下一轮怪潮！');
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
            `${this.runData.secondaryStatsText} · 多目标 ${this.getMultiTargetCount()}`
        );
        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            this.runData.maxHp
        );
    }


    private renderCurrentWave(): void {
        this.battleUI.showEnemyGroup(this.enemies);
        this.battleUI.updateWave(
            this.currentWave,
            this.totalWaves,
            this.enemies.length
        );
    }
}
