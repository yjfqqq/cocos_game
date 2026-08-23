import { _decorator, Component } from 'cc';

import {
    playerData,
    addPlayerExp,
    addGold,
    updatePlayerPower
} from './PlayerData';

import { BattleUI } from './BattleUI';

const { ccclass } = _decorator;

// =========================================================
// 怪物数据结构
// =========================================================

export interface MonsterData {
    name: string;
    level: number;
    maxHp: number;
    hp: number;
    def: number;
    atk: number;
    expReward: number;
    goldReward: number;
}


// =========================================================
// 妖兽工厂
//
// 等级越高，属性越强：
//   Lv.1  HP 500  ATK 6  DEF 2
//   Lv.2  HP 600  ATK 8  DEF 3
//   Lv.3  HP 720  ATK 10 DEF 4
// 经验 / 金币奖励第一版固定。
// =========================================================

export function createMonster(level: number): MonsterData {

    const hp = 500 + (level - 1) * 100;

    return {
        name: '妖兽',
        level: level,
        maxHp: hp,
        hp: hp,
        def: 1 + level,
        atk: 4 + level * 2,
        expReward: 50,
        goldReward: 20
    };
}

// =========================================================
// 战斗逻辑
//
// 负责：玩家 / 怪物自动攻击、伤害结算、
// 胜负判定、经验金币结算、Timer 的生命周期管理。
// UI 更新全部委托给 BattleUI。
// =========================================================

@ccclass('BattleSystem')
export class BattleSystem extends Component {

    private battleUI!: BattleUI;
    private monster!: MonsterData;

    // 战斗中玩家当前 HP（不直接改 playerData.hp）
    private currentPlayerHp = 0;
    private isOver = false;
    private onExit: () => void = () => {};


    // =====================================================
    // 初始化
    // =====================================================

    init(
        ui: BattleUI,
        onExit: () => void
    ): void {

        this.battleUI = ui;
        this.onExit = onExit;
        this.monster = createMonster(1);
        this.currentPlayerHp = playerData.hp;
        this.isOver = false;

        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            playerData.hp
        );

        this.battleUI.updateMonsterHp(
            this.monster.hp,
            this.monster.maxHp
        );

        this.battleUI.updateMonsterLevel(
            this.monster.level
        );
    }


    // =====================================================
    // 开始战斗
    // =====================================================

    begin(): void {

        this.battleUI.setStatus('自动战斗中...');
        this.battleUI.addLog('战斗开始！');

        // 玩家每 1 秒攻击一次
        this.schedule(this.playerAttack, 1);
        // 怪物每 2 秒攻击一次
        this.schedule(this.monsterAttack, 2);
    }


    // =====================================================
    // 停止所有 Timer（退出战斗 / 战斗结束时调用）
    // =====================================================

    stop(): void {
        this.unschedule(this.playerAttack);
        this.unschedule(this.monsterAttack);
        this.unscheduleAllCallbacks();
    }


    // =====================================================
    // 玩家攻击
    // =====================================================

    private playerAttack = (): void => {

        if (this.isOver) {
            return;
        }

        // 基础伤害 = 攻击 - 防御，并加入 90%~110% 随机浮动
        const base = Math.max(
            1,
            playerData.atk - this.monster.def
        );

        const damage = Math.max(
            1,
            Math.round(base * (0.9 + Math.random() * 0.2))
        );

        this.monster.hp = Math.max(
            0,
            this.monster.hp - damage
        );

        this.battleUI.updateMonsterHp(
            this.monster.hp,
            this.monster.maxHp
        );
        this.battleUI.showDamage('monster', damage);
        this.battleUI.playHit('monster');
        this.battleUI.addLog(
            `玩家对${this.monster.name}造成 ${damage} 点伤害`
        );

        if (this.monster.hp <= 0) {
            this.onMonsterDead();
        }
    };


    // =====================================================
    // 怪物攻击
    // =====================================================

    private monsterAttack = (): void => {

        if (this.isOver) {
            return;
        }

        const base = Math.max(
            1,
            this.monster.atk - playerData.def
        );

        const damage = Math.max(
            1,
            Math.round(base * (0.9 + Math.random() * 0.2))
        );

        this.currentPlayerHp = Math.max(
            0,
            this.currentPlayerHp - damage
        );

        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            playerData.hp
        );
        this.battleUI.showDamage('player', damage);
        this.battleUI.playHit('player');
        this.battleUI.addLog(
            `${this.monster.name}对玩家造成 ${damage} 点伤害`
        );

        if (this.currentPlayerHp <= 0) {
            this.onPlayerDead();
        }
    };


    // =====================================================
    // 怪物死亡
    // =====================================================

    private onMonsterDead(): void {

        if (this.isOver) {
            return;
        }

        this.isOver = true;
        this.stop();

        // 结算奖励（复用现有经验 / 金币系统）
        addPlayerExp(this.monster.expReward);
        addGold(this.monster.goldReward);
        updatePlayerPower();

        this.battleUI.addLog(`${this.monster.name}被击败！`);
        this.battleUI.addLog(`获得经验 +${this.monster.expReward}`);
        this.battleUI.addLog(`获得金币 +${this.monster.goldReward}`);
        this.battleUI.showVictory(
            this.monster.expReward,
            this.monster.goldReward,
            () => this.restartNext(),
            this.onExit
        );
    }


    // =====================================================
    // 玩家死亡
    // =====================================================

    private onPlayerDead(): void {

        if (this.isOver) {
            return;
        }

        this.isOver = true;
        this.stop();

        this.battleUI.addLog('玩家被击败......');
        this.battleUI.showDefeat(
            () => this.restart(),
            this.onExit
        );
    }


    // =====================================================
    // 重新挑战（失败以后）
    // =====================================================

    private restart(): void {

        this.battleUI.resetForRestart();

        // 重置 HP，不扣任何资源
        this.monster.hp = this.monster.maxHp;
        this.currentPlayerHp = playerData.hp;

        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            playerData.hp
        );
        this.battleUI.updateMonsterHp(
            this.monster.hp,
            this.monster.maxHp
        );

        this.isOver = false;
        this.battleUI.setStatus('自动战斗中...');
        this.battleUI.addLog('重新挑战！');

        this.schedule(this.playerAttack, 1);
        this.schedule(this.monsterAttack, 2);
    }


    // =====================================================
    // 继续战斗（胜利以后）
    //
    // 生成下一只更高等级的妖兽，重新开始自动战斗。
    // =====================================================

    private restartNext(): void {

        this.battleUI.resetForRestart();

        // 下一只妖兽等级 +1
        this.monster = createMonster(this.monster.level + 1);
        this.currentPlayerHp = playerData.hp;

        this.battleUI.updateMonsterLevel(this.monster.level);
        this.battleUI.updatePlayerHp(
            this.currentPlayerHp,
            playerData.hp
        );
        this.battleUI.updateMonsterHp(
            this.monster.hp,
            this.monster.maxHp
        );

        this.isOver = false;
        this.battleUI.setStatus('自动战斗中...');
        this.battleUI.addLog(
            `新的敌人 ${this.monster.name} Lv.${this.monster.level} 出现！`
        );

        this.schedule(this.playerAttack, 1);
        this.schedule(this.monsterAttack, 2);
    }
}
