import {
    Node,
    UITransform,
    Label,
    Color,
    Graphics,
    Button,
    Vec3,
    tween
} from 'cc';

import { playerData } from './PlayerData';

// =========================================================
// 战斗界面 UI
//
// 只负责：搭建战斗页面、更新 HP 条、显示伤害数字、
// 显示战斗日志、显示胜利 / 失败 / 返回按钮。
// 不负责战斗逻辑（逻辑在 BattleSystem）。
// =========================================================

export class BattleUI {

    private root!: Node;

    private playerPanel!: Node;
    private monsterPanel!: Node;
    private victoryPanel: Node | null = null;

    private playerHpG!: Graphics;
    private monsterHpG!: Graphics;

    private playerHpText!: Label;
    private monsterHpText!: Label;
    private monsterLevelText!: Label;

    private statusLabel!: Label;
    private logLabel!: Label;

    private logs: string[] = [];


    // =====================================================
    // 构建战斗界面
    // =====================================================

    build(parent: Node, onBack: () => void): void {

        this.root = parent;


        // 返回按钮（左上角）
        const backBtn = this.createPanel(
            parent,
            'BackButton',
            170,
            60,
            -560,
            320,
            new Color(39, 45, 66)
        );

        const backLabel = this.createLabel(
            backBtn,
            'Label',
            '← 返回',
            0,
            0,
            24,
            Color.WHITE
        );
        this.shrink(backLabel, 170, 60);

        const backButton = backBtn.addComponent(Button);
        backButton.transition = Button.Transition.NONE;
        backBtn.on(
            Button.EventType.CLICK,
            () => onBack()
        );


        // 标题
        this.createLabel(
            parent,
            'Title',
            '自动战斗',
            0,
            320,
            34,
            Color.WHITE
        );


        // 玩家面板
        this.playerPanel = this.createPanel(
            parent,
            'PlayerPanel',
            420,
            380,
            -380,
            -10,
            new Color(31, 36, 54)
        );

        this.createLabel(
            this.playerPanel,
            'Name',
            '玩家',
            0,
            150,
            30,
            Color.WHITE
        );

        this.createLabel(
            this.playerPanel,
            'Level',
            `Lv.${playerData.level}`,
            0,
            108,
            24,
            new Color(180, 185, 205)
        );

        this.playerHpG = this.createGraphics(
            this.playerPanel,
            'HpBar',
            0,
            50,
            320,
            26
        );

        this.playerHpText = this.createLabel(
            this.playerPanel,
            'HpText',
            'HP：100 / 100',
            0,
            5,
            22,
            Color.WHITE
        );


        // 怪物面板
        this.monsterPanel = this.createPanel(
            parent,
            'MonsterPanel',
            420,
            380,
            380,
            -10,
            new Color(31, 36, 54)
        );

        this.createLabel(
            this.monsterPanel,
            'Name',
            '妖兽',
            0,
            150,
            30,
            Color.WHITE
        );

        this.monsterLevelText = this.createLabel(
            this.monsterPanel,
            'Level',
            'Lv.1',
            0,
            108,
            24,
            new Color(180, 185, 205)
        );

        this.monsterHpG = this.createGraphics(
            this.monsterPanel,
            'HpBar',
            0,
            50,
            320,
            26
        );

        this.monsterHpText = this.createLabel(
            this.monsterPanel,
            'HpText',
            'HP：500 / 500',
            0,
            5,
            22,
            Color.WHITE
        );


        // VS
        this.createLabel(
            parent,
            'VS',
            'VS',
            0,
            -10,
            48,
            new Color(235, 205, 120)
        );


        // 状态（战斗进行中提示，独立于日志区，避免重叠）
        this.statusLabel = this.createLabel(
            parent,
            'BattleStatus',
            '准备中...',
            0,
            -180,
            26,
            Color.WHITE
        );


        // 战斗日志背景面板（固定高度，防止文字溢出界面）
        this.createPanel(
            parent,
            'LogBg',
            1000,
            120,
            0,
            -300,
            new Color(18, 22, 36)
        );


        // 战斗日志（最多 5 条，从上到下按时间顺序）
        this.logLabel = this.createLabel(
            parent,
            'BattleLog',
            '',
            0,
            -300,
            18,
            new Color(180, 185, 205)
        );

        const logTf = this.logLabel.node.getComponent(UITransform);
        if (logTf) {
            logTf.setContentSize(960, 110);
        }
        this.logLabel.verticalAlign = Label.VerticalAlign.TOP;
    }


    // =====================================================
    // HP 更新
    // =====================================================

    updatePlayerHp(current: number, max: number): void {

        this.drawHp(this.playerHpG, current, max, 320, 26);

        this.playerHpText.string =
            `HP：${Math.max(0, Math.ceil(current))} / ${max}`;
    }

    updateMonsterHp(current: number, max: number): void {

        this.drawHp(this.monsterHpG, current, max, 320, 26);

        this.monsterHpText.string =
            `HP：${Math.max(0, Math.ceil(current))} / ${max}`;
    }

    private drawHp(
        graphics: Graphics,
        current: number,
        max: number,
        width: number,
        height: number
    ): void {

        graphics.clear();

        const ratio = max > 0
            ? Math.max(0, Math.min(1, current / max))
            : 0;


        // 背景
        graphics.fillColor = new Color(40, 40, 50);
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();


        // 当前值
        graphics.fillColor = new Color(86, 196, 108);
        graphics.rect(
            -width / 2,
            -height / 2,
            width * ratio,
            height
        );
        graphics.fill();


        // 边框
        graphics.strokeColor = new Color(20, 20, 28);
        graphics.lineWidth = 2;
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.stroke();
    }


    // =====================================================
    // 状态 / 日志
    // =====================================================

    setStatus(text: string): void {
        this.statusLabel.string = text;
    }

    updateMonsterLevel(level: number): void {
        this.monsterLevelText.string = `Lv.${level}`;
    }

    addLog(text: string): void {

        this.logs.push(text);

        if (this.logs.length > 5) {
            this.logs.shift();
        }

        this.logLabel.string = this.logs.join('\n');
    }


    // =====================================================
    // 伤害数字
    // =====================================================

    showDamage(target: 'player' | 'monster', amount: number): void {

        const panel = target === 'player'
            ? this.playerPanel
            : this.monsterPanel;

        const label = this.createLabel(
            panel,
            'Damage',
            '-' + amount,
            120,
            90,
            32,
            new Color(255, 90, 90)
        );

        const node = label.node;

        tween(node)
            .by(0.6, { position: new Vec3(0, 70, 0) })
            .call(() => {
                node.destroy();
            })
            .start();
    }


    // =====================================================
    // 受击缩放反馈
    // =====================================================

    playHit(target: 'player' | 'monster'): void {

        const panel = target === 'player'
            ? this.playerPanel
            : this.monsterPanel;

        tween(panel)
            .to(0.1, { scale: new Vec3(1.06, 1.06, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }


    // =====================================================
    // 胜利
    // =====================================================

    showVictory(
        expReward: number,
        goldReward: number,
        onContinue: () => void,
        onExit: () => void
    ): void {

        this.setStatus('战斗胜利！');

        const panel = this.createPanel(
            this.root,
            'VictoryPanel',
            600,
            320,
            0,
            40,
            new Color(20, 26, 40)
        );
        this.victoryPanel = panel;

        this.createLabel(
            panel,
            'Title',
            '战斗胜利！',
            0,
            110,
            42,
            new Color(235, 205, 120)
        );

        this.createLabel(
            panel,
            'Exp',
            `获得经验 +${expReward}`,
            0,
            40,
            28,
            Color.WHITE
        );

        this.createLabel(
            panel,
            'Gold',
            `获得金币 +${goldReward}`,
            0,
            -5,
            28,
            Color.WHITE
        );


        // 继续战斗（生成下一只更高等级妖兽）
        const continueBtn = this.createPanel(
            panel,
            'ContinueButton',
            240,
            60,
            -130,
            -90,
            new Color(52, 59, 84)
        );

        const continueLabel = this.createLabel(
            continueBtn,
            'Label',
            '继续战斗',
            0,
            0,
            26,
            Color.WHITE
        );
        this.shrink(continueLabel, 240, 60);

        const continueButton = continueBtn.addComponent(Button);
        continueButton.transition = Button.Transition.NONE;
        continueBtn.on(
            Button.EventType.CLICK,
            () => onContinue()
        );


        // 返回主界面
        const returnBtn = this.createPanel(
            panel,
            'ReturnButton',
            240,
            60,
            130,
            -90,
            new Color(52, 59, 84)
        );

        const returnLabel = this.createLabel(
            returnBtn,
            'Label',
            '返回',
            0,
            0,
            26,
            Color.WHITE
        );
        this.shrink(returnLabel, 240, 60);

        const returnButton = returnBtn.addComponent(Button);
        returnButton.transition = Button.Transition.NONE;
        returnBtn.on(
            Button.EventType.CLICK,
            () => onExit()
        );
    }


    // =====================================================
    // 失败
    // =====================================================

    showDefeat(
        onRetry: () => void,
        onExit: () => void
    ): void {

        this.setStatus('战斗失败');

        const panel = this.createPanel(
            this.root,
            'DefeatPanel',
            600,
            320,
            0,
            40,
            new Color(40, 20, 20)
        );

        this.createLabel(
            panel,
            'Title',
            '战斗失败',
            0,
            90,
            42,
            new Color(255, 120, 120)
        );

        // 重新挑战（同一等级妖兽，恢复玩家 HP）
        const retryBtn = this.createPanel(
            panel,
            'RetryButton',
            240,
            60,
            -130,
            -50,
            new Color(52, 59, 84)
        );

        const retryLabel = this.createLabel(
            retryBtn,
            'Label',
            '重新挑战',
            0,
            0,
            26,
            Color.WHITE
        );
        this.shrink(retryLabel, 240, 60);

        const retryButton = retryBtn.addComponent(Button);
        retryButton.transition = Button.Transition.NONE;
        retryBtn.on(
            Button.EventType.CLICK,
            () => onRetry()
        );

        // 返回主界面
        const returnBtn = this.createPanel(
            panel,
            'ReturnButton',
            240,
            60,
            130,
            -50,
            new Color(52, 59, 84)
        );

        const returnLabel = this.createLabel(
            returnBtn,
            'Label',
            '返回',
            0,
            0,
            26,
            Color.WHITE
        );
        this.shrink(returnLabel, 240, 60);

        const returnButton = returnBtn.addComponent(Button);
        returnButton.transition = Button.Transition.NONE;
        returnBtn.on(
            Button.EventType.CLICK,
            () => onExit()
        );
    }


    // =====================================================
    // 重新挑战时清理覆盖层
    // =====================================================

    resetForRestart(): void {

        const names = [
            'VictoryPanel',
            'DefeatPanel',
            'ReturnButton'
        ];

        for (const name of names) {
            const node = this.root.getChildByName(name);
            if (node) {
                node.destroy();
            }
        }

        this.victoryPanel = null;
    }


    // =====================================================
    // 基础节点工具
    // =====================================================

    private createNode(
        parent: Node,
        name: string,
        width: number,
        height: number
    ): Node {

        const node = new Node(name);
        parent.addChild(node);

        const transform = node.addComponent(UITransform);
        transform.setContentSize(width, height);
        transform.setAnchorPoint(0.5, 0.5);

        return node;
    }

    private createPanel(
        parent: Node,
        name: string,
        width: number,
        height: number,
        x: number,
        y: number,
        color: Color
    ): Node {

        const node = this.createNode(parent, name, width, height);
        node.setPosition(x, y, 0);

        const graphics = node.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();

        return node;
    }

    private createLabel(
        parent: Node,
        name: string,
        text: string,
        x: number,
        y: number,
        fontSize: number,
        color: Color
    ): Label {

        const node = new Node(name);
        parent.addChild(node);

        const transform = node.addComponent(UITransform);
        transform.setContentSize(500, 80);
        transform.setAnchorPoint(0.5, 0.5);
        node.setPosition(x, y, 0);

        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 8;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        return label;
    }

    private createGraphics(
        parent: Node,
        name: string,
        x: number,
        y: number,
        width: number,
        height: number
    ): Graphics {

        const node = this.createNode(parent, name, width, height);
        node.setPosition(x, y, 0);

        return node.addComponent(Graphics);
    }

    private shrink(label: Label, width: number, height: number): void {

        const transform = label.node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(width, height);
        }
    }
}
