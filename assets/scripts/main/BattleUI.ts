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

import { CardChoice } from './CardSystem';

export interface EnemyViewData {
    id: number;
    name: string;
    type: 'melee' | 'ranged';
    isBoss: boolean;
    maxHp: number;
    hp: number;
}

interface EnemyNodeView {
    node: Node;
    hpGraphics: Graphics;
    hpText: Label;
    hpWidth: number;
}

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
    private enemyField!: Node;
    private enemyViews = new Map<number, EnemyNodeView>();
    private victoryPanel: Node | null = null;

    private playerHpG!: Graphics;

    private playerHpText!: Label;
    private playerLevelText!: Label;
    private playerExpText!: Label;
    private playerStatText!: Label;
    private playerSecondaryStatText!: Label;
    private waveText!: Label;
    private factionProgressText!: Label;

    private statusLabel!: Label;
    private logLabel!: Label;
    private skillSlotLabels: Label[] = [];
    private cardChoicePanel: Node | null = null;

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

        this.waveText = this.createLabel(
            parent,
            'Wave',
            '第 1 / 10 波',
            0,
            278,
            22,
            new Color(235, 205, 120)
        );

        this.factionProgressText = this.createLabel(
            parent,
            'FactionProgress',
            '战神 0/6 · 雷部 0/6 · 天王 0/6',
            0,
            246,
            18,
            new Color(180, 185, 205)
        );


        // 左侧局内角色信息
        this.playerPanel = this.createPanel(
            parent,
            'PlayerPanel',
            250,
            330,
            -500,
            25,
            new Color(31, 36, 54)
        );

        this.createLabel(this.playerPanel, 'Name', '玩家', 0, 135, 27, Color.WHITE);

        this.playerLevelText = this.createLabel(
            this.playerPanel,
            'Level',
            '局内 Lv.1',
            0,
            98,
            21,
            new Color(180, 185, 205)
        );

        this.playerHpG = this.createGraphics(
            this.playerPanel,
            'HpBar',
            0,
            60,
            200,
            22
        );

        this.playerHpText = this.createLabel(
            this.playerPanel,
            'HpText',
            'HP：100 / 100',
            0,
            30,
            17,
            Color.WHITE
        );

        this.playerExpText = this.createLabel(
            this.playerPanel,
            'RunExp',
            '局内经验 0 / 20',
            0,
            -5,
            17,
            new Color(235, 205, 120)
        );

        this.playerStatText = this.createLabel(
            this.playerPanel,
            'RunStats',
            '攻击 0 · 防御 0 · 暴击 0%',
            0,
            -48,
            15,
            Color.WHITE
        );

        this.playerSecondaryStatText = this.createLabel(
            this.playerPanel,
            'RunSecondaryStats',
            '攻速 +0% · 范围 +0% · 技能 +0%',
            0,
            -100,
            13,
            new Color(160, 168, 190)
        );
        this.shrink(this.playerSecondaryStatText, 225, 70);
        this.playerSecondaryStatText.overflow = Label.Overflow.SHRINK;


        // 右侧怪海战场
        this.enemyField = this.createPanel(
            parent,
            'EnemyField',
            960,
            330,
            130,
            25,
            new Color(24, 29, 43)
        );


        // 状态（战斗进行中提示，独立于日志区，避免重叠）
        this.statusLabel = this.createLabel(
            parent,
            'BattleStatus',
            '准备中...',
            0,
            -155,
            23,
            Color.WHITE
        );

        // 10 个技能槽
        this.createPanel(
            parent,
            'SkillBarBg',
            1100,
            52,
            0,
            -220,
            new Color(25, 30, 46)
        );

        this.skillSlotLabels = [];
        const slotStartX = -495;

        for (let i = 0; i < 10; i++) {
            const slot = this.createPanel(
                parent,
                `SkillSlot_${i + 1}`,
                98,
                40,
                slotStartX + i * 110,
                -220,
                new Color(42, 48, 68)
            );

            const label = this.createLabel(
                slot,
                'Label',
                `${i + 1} 空`,
                0,
                0,
                14,
                new Color(145, 152, 175)
            );
            this.shrink(label, 94, 38);
            label.overflow = Label.Overflow.SHRINK;
            this.skillSlotLabels.push(label);
        }


        // 战斗日志背景面板（固定高度，防止文字溢出界面）
        this.createPanel(
            parent,
            'LogBg',
            1000,
            100,
            0,
            -310,
            new Color(18, 22, 36)
        );


        // 战斗日志（最多 5 条，从上到下按时间顺序）
        this.logLabel = this.createLabel(
            parent,
            'BattleLog',
            '',
            0,
            -310,
            16,
            new Color(180, 185, 205)
        );

        const logTf = this.logLabel.node.getComponent(UITransform);
        if (logTf) {
            logTf.setContentSize(960, 92);
        }
        this.logLabel.verticalAlign = Label.VerticalAlign.TOP;
    }


    // =====================================================
    // HP 更新
    // =====================================================

    updatePlayerHp(current: number, max: number): void {

        this.drawHp(this.playerHpG, current, max, 200, 22);

        this.playerHpText.string =
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

    updatePlayerRunInfo(
        level: number,
        exp: number,
        expToNext: number,
        atk: number,
        def: number,
        crit: number,
        secondaryStats: string
    ): void {
        this.playerLevelText.string = `局内 Lv.${level}`;
        this.playerExpText.string = `局内经验 ${exp} / ${expToNext}`;
        this.playerStatText.string = `攻击 ${atk} · 防御 ${def} · 暴击 ${crit}%`;
        this.playerSecondaryStatText.string = secondaryStats;
    }

    updateWave(current: number, total: number, remaining: number): void {
        this.waveText.string =
            `第 ${current} / ${total} 波 · 本波剩余 ${remaining} 只`;
    }

    updateFactionProgress(text: string): void {
        this.factionProgressText.string = text;
    }

    updateSkillSlots(slots: string[]): void {

        for (let i = 0; i < this.skillSlotLabels.length; i++) {
            const text = slots[i];
            const label = this.skillSlotLabels[i];

            label.string = text || `${i + 1} 空`;
            label.color = text
                ? new Color(235, 205, 120)
                : new Color(145, 152, 175);
        }
    }

    addLog(text: string): void {

        this.logs.push(text);

        if (this.logs.length > 5) {
            this.logs.shift();
        }

        this.logLabel.string = this.logs.join('\n');
    }


    // =====================================================
    // 升级三选一
    // =====================================================

    showCardChoices(
        choices: CardChoice[],
        onSelect: (choice: CardChoice) => void
    ): void {

        this.hideCardChoices();

        const panel = this.createPanel(
            this.root,
            'CardChoicePanel',
            900,
            410,
            0,
            20,
            new Color(20, 26, 40)
        );
        this.cardChoicePanel = panel;

        this.createLabel(
            panel,
            'Title',
            '境界提升 · 选择一张卡牌',
            0,
            165,
            32,
            new Color(235, 205, 120)
        );

        const positions = choices.length === 1
            ? [0]
            : choices.length === 2
                ? [-180, 180]
                : [-260, 0, 260];

        for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];
            const card = this.createPanel(
                panel,
                `Choice_${choice.id}`,
                230,
                250,
                positions[i],
                -5,
                choice.category === '神将卡'
                    ? new Color(55, 51, 78)
                    : new Color(39, 45, 66)
            );

            this.createLabel(
                card,
                'Category',
                choice.category,
                0,
                92,
                17,
                new Color(180, 185, 205)
            );
            this.createLabel(
                card,
                'Name',
                choice.name,
                0,
                55,
                26,
                Color.WHITE
            );

            const description = this.createLabel(
                card,
                'Description',
                choice.description,
                0,
                5,
                18,
                new Color(200, 205, 220)
            );
            this.shrink(description, 200, 70);
            description.overflow = Label.Overflow.SHRINK;

            const selectButton = this.createPanel(
                card,
                'SelectButton',
                170,
                48,
                0,
                -82,
                new Color(67, 77, 110)
            );
            const selectLabel = this.createLabel(
                selectButton,
                'Label',
                '选择',
                0,
                0,
                21,
                Color.WHITE
            );
            this.shrink(selectLabel, 170, 48);

            const button = selectButton.addComponent(Button);
            button.transition = Button.Transition.NONE;
            selectButton.on(
                Button.EventType.CLICK,
                () => {
                    this.hideCardChoices();
                    onSelect(choice);
                }
            );
        }
    }


    private hideCardChoices(): void {

        if (!this.cardChoicePanel) {
            return;
        }

        this.cardChoicePanel.removeFromParent();
        this.cardChoicePanel.destroy();
        this.cardChoicePanel = null;
    }


    // =====================================================
    // 怪海显示与战斗反馈
    // =====================================================

    showEnemyGroup(enemies: EnemyViewData[]): void {

        const oldChildren = [...this.enemyField.children];
        for (const child of oldChildren) {
            child.removeFromParent();
            child.destroy();
        }
        this.enemyViews.clear();

        // 远程单位排在战场后排，近战单位铺在前排。
        const ordered = [...enemies].sort((a, b) => {
            if (a.isBoss) {
                return -1;
            }
            if (b.isBoss) {
                return 1;
            }
            return a.type === b.type
                ? a.id - b.id
                : a.type === 'ranged' ? -1 : 1;
        });

        const columns = 13;
        const gapX = 70;
        const gapY = 60;
        const startX = -420;
        const startY = 125;

        for (let i = 0; i < ordered.length; i++) {
            const enemy = ordered[i];
            const column = i % columns;
            const row = Math.floor(i / columns);
            const node = this.createPanel(
                this.enemyField,
                `Enemy_${enemy.id}`,
                enemy.isBoss ? 76 : 62,
                enemy.isBoss ? 54 : 46,
                startX + column * gapX,
                startY - row * gapY,
                enemy.isBoss
                    ? new Color(130, 84, 45)
                    : enemy.type === 'melee'
                        ? new Color(104, 56, 62)
                        : new Color(52, 74, 112)
            );

            const name = this.createLabel(
                node,
                'Name',
                enemy.isBoss ? '妖王' : enemy.type === 'melee' ? '近' : '远',
                0,
                7,
                enemy.isBoss ? 16 : 14,
                Color.WHITE
            );
            this.shrink(name, enemy.isBoss ? 72 : 58, 26);

            const hpGraphics = this.createGraphics(
                node,
                'HpBar',
                0,
                -15,
                enemy.isBoss ? 64 : 52,
                6
            );
            const hpText = this.createLabel(
                node,
                'HpText',
                `${enemy.hp}`,
                0,
                -28,
                10,
                new Color(210, 215, 225)
            );
            this.shrink(hpText, 60, 18);

            this.enemyViews.set(enemy.id, {
                node,
                hpGraphics,
                hpText,
                hpWidth: enemy.isBoss ? 64 : 52
            });
            this.updateEnemyHp(enemy.id, enemy.hp, enemy.maxHp);
        }
    }


    updateEnemyHp(id: number, current: number, max: number): void {

        const view = this.enemyViews.get(id);
        if (!view) {
            return;
        }

        this.drawHp(view.hpGraphics, current, max, view.hpWidth, 6);
        view.hpText.string = `${Math.max(0, Math.ceil(current))}`;
    }


    removeEnemy(id: number): void {

        const view = this.enemyViews.get(id);
        if (!view) {
            return;
        }

        this.enemyViews.delete(id);
        tween(view.node)
            .to(0.16, { scale: new Vec3(0, 0, 1) })
            .call(() => view.node.destroy())
            .start();
    }


    showEnemyDamage(id: number, amount: number, critical: boolean): void {

        const view = this.enemyViews.get(id);
        if (!view) {
            return;
        }

        const position = view.node.position;
        const label = this.createLabel(
            this.enemyField,
            'Damage',
            critical ? `暴 ${amount}` : `-${amount}`,
            position.x,
            position.y + 20,
            critical ? 18 : 15,
            critical
                ? new Color(255, 215, 90)
                : new Color(255, 110, 110)
        );

        tween(label.node)
            .by(0.4, { position: new Vec3(0, 28, 0) })
            .call(() => label.node.destroy())
            .start();
    }


    showPlayerDamage(amount: number): void {

        const label = this.createLabel(
            this.playerPanel,
            'Damage',
            `-${amount}`,
            75,
            75,
            24,
            new Color(255, 90, 90)
        );
        tween(label.node)
            .by(0.45, { position: new Vec3(0, 35, 0) })
            .call(() => label.node.destroy())
            .start();
    }


    playPlayerAttack(targetIds: number[]): void {

        tween(this.playerPanel)
            .to(0.08, { scale: new Vec3(1.04, 1.04, 1) })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();

        for (const id of targetIds) {
            const view = this.enemyViews.get(id);
            if (!view) {
                continue;
            }
            tween(view.node)
                .to(0.06, { scale: new Vec3(1.12, 1.12, 1) })
                .to(0.08, { scale: new Vec3(1, 1, 1) })
                .start();
        }
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

        this.setStatus('关卡通关！');

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
            '十波通关！',
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


        // 开始下一轮十波挑战
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
            '继续挑战',
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

        this.hideCardChoices();

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
