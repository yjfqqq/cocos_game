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

import { BATTLE_BALANCE } from './BattleBalance';
import type {
    UpgradeCard,
    UpgradeCardKind
} from './Systems/UpgradeCardGenerator';

export interface UpgradePanelOptions {
    title?: string;
    statusText?: string;
    refreshText?: string;
}

export interface BattleDebugActions {
    addExp: () => void;
    forceLevelUp: () => void;
    addSpiritStones: () => void;
    forceSkillChoice: () => void;
    forceBondDraw: () => void;
    cycleMetaLevel: () => void;
    inspectSkillNodes: () => void;
    inspectBondCards: () => void;
    inspectWeights: () => void;
    resetBuild: () => void;
}

export interface EnemyViewData {
    id: number;
    name: string;
    type: 'melee' | 'ranged';
    isBoss: boolean;
    isElite?: boolean;
    isEnhanced?: boolean;
    level?: number;
    maxHp: number;
    hp: number;
    positionX?: number;
    positionY?: number;
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
    private bondSlotLabels: Label[] = [];
    private bondSlotTitle!: Label;
    private spiritStoneText!: Label;
    private comboText!: Label;
    private bondDrawCostText!: Label;
    private bondDrawButton: Button | null = null;
    private bondDrawHandler: () => void = () => {};
    private debugActions: BattleDebugActions | null = null;
    private debugPanel: Node | null = null;
    private debugButtonCreated = false;
    private cardChoicePanel: Node | null = null;
    private upgradeCategoryPanel: Node | null = null;
    private upgradeTitleLabel: Label | null = null;
    private pendingUpgradeLabel: Label | null = null;

    private logs: string[] = [];


    // =====================================================
    // 构建战斗界面
    // =====================================================

    build(parent: Node, onBack: () => void): void {

        this.root = parent;

        // 参考刷刷刷类游戏：顶部只承载关卡信息，中央尽量留给战场，
        // 属性、构筑和升级入口集中在底部 HUD。
        const topBar = this.createPanel(
            parent,
            'TopBattleHud',
            1240,
            72,
            0,
            320,
            new Color(13, 18, 28, 244)
        );

        const backBtn = this.createPanel(
            topBar,
            'BackButton',
            142,
            48,
            -535,
            0,
            new Color(116, 38, 48)
        );
        const backLabel = this.createLabel(
            backBtn,
            'Label',
            '← 退出战斗',
            0,
            0,
            20,
            Color.WHITE
        );
        this.shrink(backLabel, 142, 48);
        const backButton = backBtn.addComponent(Button);
        backButton.transition = Button.Transition.NONE;
        backBtn.on(Button.EventType.CLICK, () => onBack());

        this.createLabel(
            topBar,
            'Title',
            '第一关 · 主线征战',
            -410,
            0,
            25,
            new Color(241, 222, 169)
        );

        this.statusLabel = this.createLabel(
            topBar,
            'BattleStatus',
            '准备中...',
            0,
            10,
            20,
            Color.WHITE
        );

        this.waveText = this.createLabel(
            topBar,
            'Wave',
            '主线 1-1 / 1-5',
            430,
            10,
            20,
            new Color(235, 205, 120)
        );

        this.factionProgressText = this.createLabel(
            topBar,
            'BondProgress',
            '天宫羁绊 0/6层',
            0,
            -18,
            15,
            new Color(178, 190, 208)
        );

        // 中央全宽战场。
        this.enemyField = this.createPanel(
            parent,
            'EnemyField',
            1200,
            430,
            0,
            45,
            new Color(20, 27, 39)
        );

        const rangedLine = this.createGraphics(
            this.enemyField,
            'RangedAttackLine',
            BATTLE_BALANCE.rangedAttackX,
            0,
            2,
            360
        );
        rangedLine.strokeColor = new Color(74, 113, 160, 125);
        rangedLine.lineWidth = 2;
        rangedLine.moveTo(0, -180);
        rangedLine.lineTo(0, 180);
        rangedLine.stroke();
        this.createLabel(
            this.enemyField,
            'RangedAttackLabel',
            '远程射程线',
            BATTLE_BALANCE.rangedAttackX,
            188,
            13,
            new Color(105, 145, 190)
        );

        // 玩家战场标记，只负责攻击和受击动画。
        this.playerPanel = this.createPanel(
            this.enemyField,
            'PlayerPanel',
            132,
            168,
            -520,
            -5,
            new Color(40, 58, 75, 246)
        );
        this.createLabel(
            this.playerPanel,
            'Avatar',
            '主角',
            0,
            30,
            28,
            new Color(255, 238, 191)
        );
        this.createLabel(
            this.playerPanel,
            'AutoAttack',
            '自动攻击',
            0,
            -25,
            16,
            new Color(126, 211, 237)
        );

        // 左下角色 HUD。
        const playerHud = this.createPanel(
            parent,
            'PlayerBattleHud',
            360,
            122,
            -420,
            -275,
            new Color(17, 24, 37, 248)
        );
        this.playerLevelText = this.createLabel(
            playerHud,
            'Level',
            '局内 Lv.1',
            -125,
            36,
            20,
            new Color(235, 205, 120)
        );
        this.playerHpG = this.createGraphics(
            playerHud,
            'HpBar',
            55,
            38,
            220,
            18
        );
        this.playerHpText = this.createLabel(
            playerHud,
            'HpText',
            'HP：100 / 100',
            55,
            14,
            15,
            Color.WHITE
        );
        this.playerExpText = this.createLabel(
            playerHud,
            'RunExp',
            '局内经验 0 / 20',
            -100,
            -15,
            15,
            new Color(235, 205, 120)
        );
        this.playerStatText = this.createLabel(
            playerHud,
            'RunStats',
            '攻击 0 · 防御 0 · 暴击 0%',
            55,
            -15,
            14,
            Color.WHITE
        );
        this.playerSecondaryStatText = this.createLabel(
            playerHud,
            'RunSecondaryStats',
            '攻速 +0% · 技能 +0%',
            0,
            -43,
            12,
            new Color(160, 168, 190)
        );
        this.shrink(this.playerSecondaryStatText, 330, 28);
        this.playerSecondaryStatText.overflow = Label.Overflow.SHRINK;

        // 中下方构筑快捷栏，结构按技能携带上限预留四格。
        const buildHud = this.createPanel(
            parent,
            'BattleBuildHud',
            320,
            122,
            -70,
            -275,
            new Color(17, 24, 37, 248)
        );
        this.createLabel(
            buildHud,
            'Title',
            '本局技能栏',
            0,
            38,
            17,
            new Color(178, 190, 208)
        );
        this.skillSlotLabels = [];
        const slotStartX = -105;
        for (let i = 0; i < 4; i++) {
            const slot = this.createPanel(
                buildHud,
                `SkillSlot_${i + 1}`,
                62,
                54,
                slotStartX + i * 70,
                -18,
                new Color(42, 48, 68)
            );
            const label = this.createLabel(
                slot,
                'Label',
                `${i + 1} 空`,
                0,
                0,
                13,
                new Color(145, 152, 175)
            );
            this.shrink(label, 58, 50);
            label.overflow = Label.Overflow.SHRINK;
            this.skillSlotLabels.push(label);
        }

        // 基础卡已经归入羁绊卡池，共用10个吞噬卡槽；
        // 整套羁绊卡均不占用4个技能格。
        const bondHud = this.createPanel(
            parent,
            'BattleBondHud',
            520,
            122,
            350,
            -275,
            new Color(17, 24, 37, 248)
        );
        this.bondSlotTitle = this.createLabel(
            bondHud,
            'Title',
            '羁绊 0张',
            -185,
            38,
            17,
            new Color(202, 174, 226)
        );
        this.spiritStoneText = this.createLabel(
            bondHud,
            'SpiritStones',
            '灵石 0',
            -65,
            38,
            16,
            new Color(113, 220, 221)
        );
        this.comboText = this.createLabel(
            bondHud,
            'Combo',
            'Combo 0',
            55,
            38,
            15,
            new Color(244, 166, 96)
        );
        const drawNode = this.createPanel(
            bondHud,
            'BondDrawButton',
            128,
            38,
            184,
            37,
            new Color(91, 57, 120)
        );
        this.bondDrawCostText = this.createLabel(
            drawNode,
            'Label',
            '羁绊抽卡 50',
            0,
            0,
            15,
            Color.WHITE
        );
        this.bondDrawButton = drawNode.addComponent(Button);
        this.bondDrawButton.transition = Button.Transition.NONE;
        drawNode.on(Button.EventType.CLICK, () => this.bondDrawHandler());
        this.bondSlotLabels = [];
        const bondSlotStartX = -220;
        for (let i = 0; i < 10; i++) {
            const slot = this.createPanel(
                bondHud,
                `BondSlot_${i + 1}`,
                45,
                54,
                bondSlotStartX + i * 49,
                -18,
                new Color(48, 42, 63)
            );
            const label = this.createLabel(
                slot,
                'Label',
                `${i + 1}`,
                0,
                0,
                11,
                new Color(130, 128, 145)
            );
            this.shrink(label, 42, 50);
            label.overflow = Label.Overflow.SHRINK;
            this.bondSlotLabels.push(label);
        }

        // 战斗日志贴在战场左下角，不再单独占用整条底栏。
        const logPanel = this.createPanel(
            this.enemyField,
            'LogBg',
            480,
            90,
            -300,
            -160,
            new Color(10, 15, 24, 205)
        );
        this.logLabel = this.createLabel(
            logPanel,
            'BattleLog',
            '',
            0,
            0,
            14,
            new Color(180, 185, 205)
        );
        const logTf = this.logLabel.node.getComponent(UITransform);
        if (logTf) {
            logTf.setContentSize(450, 78);
        }
        this.logLabel.verticalAlign = Label.VerticalAlign.TOP;
    }


    // =====================================================
    // HP 更新
    // =====================================================

    updatePlayerHp(current: number, max: number): void {

        this.drawHp(this.playerHpG, current, max, 220, 18);

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
        this.playerExpText.string = level >= BATTLE_BALANCE.maxRunLevel
            ? '局内经验 已满级'
            : `局内经验 ${exp} / ${expToNext}`;
        this.playerStatText.string = `攻击 ${atk} · 防御 ${def} · 暴击 ${crit}%`;
        this.playerSecondaryStatText.string = secondaryStats;
    }

    updateWave(current: number, total: number, remaining: number): void {
        this.waveText.string =
            `第 ${current} / ${total} 波 · 本波剩余 ${remaining} 只`;
    }

    updateTask(
        current: number,
        total: number,
        title: string,
        progress: string
    ): void {
        this.waveText.string =
            `主线 1-${current} / 1-${total} · ${title} · ${progress}`;
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


    setBondDrawHandler(handler: () => void): void {
        this.bondDrawHandler = handler;
    }


    updateGrowthResources(
        spiritStones: number,
        drawCost: number,
        combo: number
    ): void {
        this.spiritStoneText.string = `灵石 ${spiritStones}`;
        this.comboText.string = `Combo ${combo}`;
        this.bondDrawCostText.string = `羁绊抽卡 ${drawCost}`;
        if (this.bondDrawButton) {
            this.bondDrawButton.interactable = spiritStones >= drawCost;
            this.bondDrawCostText.color = spiritStones >= drawCost
                ? Color.WHITE
                : new Color(135, 138, 150);
        }
    }


    // 正式HUD只保留一个小型 DEV 入口，调试按钮默认折叠。
    setDebugActions(actions: BattleDebugActions): void {
        this.debugActions = actions;
        if (this.debugButtonCreated) {
            return;
        }
        this.debugButtonCreated = true;
        const node = this.createPanel(
            this.root,
            'DebugToggle',
            54,
            30,
            600,
            302,
            new Color(50, 55, 68, 225)
        );
        this.createLabel(node, 'Label', 'DEV', 0, 0, 13, Color.WHITE);
        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        node.on(Button.EventType.CLICK, () => this.toggleDebugPanel());
    }

    addLog(text: string): void {

        this.logs.push(text);

        if (this.logs.length > 5) {
            this.logs.shift();
        }

        this.logLabel.string = this.logs.join('\n');
    }


    // =====================================================
    // 旧升级分类入口保留兼容；V1战斗已改为技能自动弹出、羁绊主动抽卡。
    // =====================================================

    showUpgradeCategoryPrompt(
        pendingLevelUps: number,
        skillAvailable: boolean,
        bondAvailable: boolean,
        onSelectKind: (kind: UpgradeCardKind) => void
    ): void {
        this.hideUpgradeUI();

        const panel = this.createPanel(
            this.root,
            'UpgradeCategoryPanel',
            520,
            122,
            350,
            -275,
            new Color(17, 24, 37, 250)
        );
        this.upgradeCategoryPanel = panel;
        this.pendingUpgradeLabel = this.createLabel(
            panel,
            'PendingUpgradeLabel',
            `待选择升级 ×${pendingLevelUps}`,
            0,
            39,
            18,
            new Color(255, 221, 116)
        );

        this.createUpgradeCategoryButton(
            panel,
            'SkillUpgradeButton',
            '技能',
            '本局强化 · 四选一',
            -95,
            skillAvailable,
            new Color(38, 96, 126),
            () => onSelectKind('skill')
        );
        this.createUpgradeCategoryButton(
            panel,
            'BondUpgradeButton',
            '羁绊',
            '羁绊构筑 · 四选一',
            95,
            bondAvailable,
            new Color(91, 57, 120),
            () => onSelectKind('bond')
        );
    }


    showUpgradeCards(
        choices: UpgradeCard[],
        pendingLevelUps: number,
        onSelect: (choice: UpgradeCard) => void,
        onBack: () => void,
        refreshesRemaining = 0,
        onRefresh?: () => void,
        options: UpgradePanelOptions = {}
    ): void {
        this.hideUpgradeUI();

        // 参考图使用横向高卡牌覆盖在战场之上；这里不创建全屏遮罩，
        // 四周仍能观察怪物移动，BattleSystem 也始终继续运行。
        const panel = this.createPanel(
            this.root,
            'UpgradeChoicePanel',
            1120,
            420,
            0,
            45,
            new Color(10, 15, 24, 235)
        );
        this.cardChoicePanel = panel;

        const cardKind = choices[0]?.kind ?? 'skill';
        const cardTitle = cardKind === 'skill'
            ? '技能卡牌'
            : '羁绊卡牌';
        this.upgradeTitleLabel = this.createLabel(
            panel,
            'Title',
            options.title ?? `${cardTitle} · 待选择 ×${pendingLevelUps}`,
            0,
            184,
            28,
            new Color(235, 205, 120)
        );
        this.createLabel(
            panel,
            'RunningHint',
            options.statusText ?? '战斗仍在继续',
            -490,
            184,
            15,
            new Color(116, 215, 161)
        );

        const backNode = this.createPanel(
            panel,
            'BackToUpgradeCategory',
            116,
            42,
            490,
            181,
            new Color(54, 62, 82)
        );
        this.createLabel(
            backNode,
            'Label',
            '稍后选择',
            0,
            0,
            17,
            Color.WHITE
        );
        const backButton = backNode.addComponent(Button);
        backButton.transition = Button.Transition.NONE;
        backNode.on(Button.EventType.CLICK, () => {
            this.hideUpgradeCards();
            onBack();
        });

        if (onRefresh) {
            const refreshNode = this.createPanel(
                panel,
                'RefreshChoices',
                180,
                42,
                330,
                181,
                refreshesRemaining > 0
                    ? new Color(64, 91, 126)
                    : new Color(54, 58, 68)
            );
            this.createLabel(
                refreshNode,
                'Label',
                options.refreshText ?? `刷新（剩余 ${refreshesRemaining}）`,
                0,
                0,
                16,
                refreshesRemaining > 0
                    ? Color.WHITE
                    : new Color(130, 135, 148)
            );
            if (refreshesRemaining > 0) {
                const refreshButton = refreshNode.addComponent(Button);
                refreshButton.transition = Button.Transition.NONE;
                refreshNode.on(Button.EventType.CLICK, () => onRefresh());
            }
        }

        const positions = choices.length === 1
            ? [0]
            : choices.length === 2
                ? [-150, 150]
                : choices.length === 3
                    ? [-290, 0, 290]
                    : [-390, -130, 130, 390];

        for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];
            const card = this.createPanel(
                panel,
                `Choice_${choice.id}`,
                250,
                310,
                positions[i],
                -5,
                this.getUpgradeCardBackground(choice)
            );
            const cardGraphics = card.getComponent(Graphics);
            if (cardGraphics) {
                cardGraphics.strokeColor = this.getUpgradeCardStroke(choice);
                cardGraphics.lineWidth = 3;
                cardGraphics.rect(-123, -153, 246, 306);
                cardGraphics.stroke();
            }

            this.createLabel(
                card,
                'Category',
                choice.kind === 'skill'
                    ? this.getSkillRarityName(choice.rarity)
                    : choice.kind === 'bond'
                        ? this.getBondRarityName(choice.rarity)
                        : '基础属性',
                0,
                128,
                17,
                choice.kind === 'skill'
                    ? new Color(120, 205, 235)
                    : choice.kind === 'bond'
                        ? new Color(215, 165, 235)
                        : new Color(235, 196, 120)
            );
            this.createLabel(
                card,
                'Name',
                choice.name,
                0,
                75,
                25,
                Color.WHITE
            );

            if (choice.progress) {
                this.createLabel(
                    card,
                    'Progress',
                    choice.progress,
                    0,
                    102,
                    14,
                    new Color(235, 205, 120)
                );
            }

            const description = this.createLabel(
                card,
                'Description',
                choice.description,
                0,
                10,
                18,
                new Color(200, 205, 220)
            );
            this.shrink(description, 208, 100);
            description.overflow = Label.Overflow.SHRINK;

            const selectButton = this.createPanel(
                card,
                'SelectButton',
                178,
                50,
                0,
                -112,
                choice.kind === 'bond'
                    ? new Color(104, 61, 137)
                    : choice.kind === 'basic'
                        ? new Color(132, 88, 37)
                        : new Color(42, 105, 137)
            );
            const selectLabel = this.createLabel(
                selectButton,
                'Label',
                '选择',
                0,
                0,
                20,
                Color.WHITE
            );
            this.shrink(selectLabel, 178, 50);

            const button = selectButton.addComponent(Button);
            button.transition = Button.Transition.NONE;
            selectButton.on(
                Button.EventType.CLICK,
                () => {
                    this.hideUpgradeCards();
                    onSelect(choice);
                }
            );
        }
    }


    updateBondSlots(slots: string[]): void {
        for (let i = 0; i < this.bondSlotLabels.length; i++) {
            const text = slots[i];
            const label = this.bondSlotLabels[i];
            label.string = text || `${i + 1}`;
            label.color = text
                ? new Color(222, 194, 238)
                : new Color(130, 128, 145);
        }
        this.bondSlotTitle.string =
            `羁绊 ${slots.length}张`;
    }


    updatePendingUpgradeCount(pendingLevelUps: number): void {
        if (
            this.upgradeTitleLabel &&
            this.upgradeTitleLabel.string.indexOf('待选择') >= 0
        ) {
            const prefix = this.upgradeTitleLabel.string.split(' · ')[0];
            this.upgradeTitleLabel.string =
                `${prefix} · 待选择 ×${pendingLevelUps}`;
        }
        if (this.pendingUpgradeLabel) {
            this.pendingUpgradeLabel.string =
                `待选择升级 ×${pendingLevelUps}`;
        }
    }


    hideUpgradeCards(): void {

        if (!this.cardChoicePanel) {
            return;
        }

        this.cardChoicePanel.removeFromParent();
        this.cardChoicePanel.destroy();
        this.cardChoicePanel = null;
        this.upgradeTitleLabel = null;
    }


    hideUpgradeUI(): void {
        this.hideUpgradeCards();
        this.hideUpgradeCategoryPrompt();
    }


    private hideUpgradeCategoryPrompt(): void {
        if (!this.upgradeCategoryPanel) {
            return;
        }
        this.upgradeCategoryPanel.removeFromParent();
        this.upgradeCategoryPanel.destroy();
        this.upgradeCategoryPanel = null;
        this.pendingUpgradeLabel = null;
    }


    private toggleDebugPanel(): void {
        if (this.debugPanel) {
            this.debugPanel.removeFromParent();
            this.debugPanel.destroy();
            this.debugPanel = null;
            return;
        }
        const panel = this.createPanel(
            this.root,
            'BattleDebugPanel',
            430,
            350,
            385,
            105,
            new Color(15, 20, 31, 248)
        );
        this.debugPanel = panel;
        this.createLabel(
            panel,
            'Title',
            '开发调试 · 单局状态',
            0,
            145,
            20,
            new Color(235, 205, 120)
        );
        const buttons: Array<{
            label: string;
            action: keyof BattleDebugActions;
        }> = [
            { label: '+100经验', action: 'addExp' },
            { label: '强制升级', action: 'forceLevelUp' },
            { label: '+1000灵石', action: 'addSpiritStones' },
            { label: '技能选择', action: 'forceSkillChoice' },
            { label: '羁绊抽卡', action: 'forceBondDraw' },
            { label: '切换局外等级', action: 'cycleMetaLevel' },
            { label: '查看技能节点', action: 'inspectSkillNodes' },
            { label: '查看羁绊卡', action: 'inspectBondCards' },
            { label: '查看动态权重', action: 'inspectWeights' },
            { label: '重置本局构筑', action: 'resetBuild' }
        ];
        for (let index = 0; index < buttons.length; index++) {
            const item = buttons[index];
            const column = index % 2;
            const row = Math.floor(index / 2);
            this.createDebugActionButton(
                panel,
                item.label,
                -105 + column * 210,
                95 - row * 55,
                item.action
            );
        }
    }


    private createDebugActionButton(
        parent: Node,
        label: string,
        x: number,
        y: number,
        action: keyof BattleDebugActions
    ): void {
        const node = this.createPanel(
            parent,
            `Debug_${action}`,
            180,
            42,
            x,
            y,
            new Color(47, 68, 91)
        );
        this.createLabel(node, 'Label', label, 0, 0, 15, Color.WHITE);
        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        node.on(Button.EventType.CLICK, () => {
            const handler = this.debugActions?.[action];
            if (handler) {
                handler();
            }
        });
    }


    private getSkillRarityName(rarity?: string): string {
        const names: Record<string, string> = {
            basic: '基础技能节点',
            core3: 'Lv3核心节点',
            core6: 'Lv6核心节点',
            core9: 'Lv9核心节点',
            core10: 'Lv10终极节点'
        };
        return names[rarity ?? ''] ?? '技能强化';
    }


    private getBondRarityName(rarity?: string): string {
        const names: Record<string, string> = {
            green: '绿色羁绊',
            blue: '蓝色羁绊',
            purple: '紫色羁绊',
            red: '红色羁绊',
            rainbow: '彩色羁绊'
        };
        return names[rarity ?? ''] ?? '羁绊卡';
    }


    private getUpgradeCardBackground(choice: UpgradeCard): Color {
        if (choice.rarity === 'core10' || choice.rarity === 'rainbow') {
            return new Color(72, 45, 84, 252);
        }
        if (choice.rarity === 'core9' || choice.rarity === 'red') {
            return new Color(82, 38, 45, 252);
        }
        if (choice.rarity === 'core6' || choice.rarity === 'purple') {
            return new Color(55, 39, 76, 252);
        }
        if (choice.rarity === 'core3' || choice.rarity === 'blue') {
            return new Color(31, 55, 79, 252);
        }
        if (choice.rarity === 'green') {
            return new Color(31, 67, 55, 252);
        }
        return choice.kind === 'basic'
            ? new Color(64, 48, 29, 252)
            : new Color(29, 42, 58, 252);
    }


    private getUpgradeCardStroke(choice: UpgradeCard): Color {
        if (choice.rarity === 'core10' || choice.rarity === 'rainbow') {
            return new Color(242, 198, 92);
        }
        if (choice.rarity === 'core9' || choice.rarity === 'red') {
            return new Color(238, 96, 105);
        }
        if (choice.rarity === 'core6' || choice.rarity === 'purple') {
            return new Color(194, 137, 229);
        }
        if (choice.rarity === 'core3' || choice.rarity === 'blue') {
            return new Color(95, 184, 224);
        }
        if (choice.rarity === 'green') {
            return new Color(102, 205, 149);
        }
        return new Color(95, 184, 224);
    }


    private createUpgradeCategoryButton(
        parent: Node,
        name: string,
        title: string,
        subtitle: string,
        x: number,
        available: boolean,
        color: Color,
        onClick: () => void
    ): void {
        const node = this.createPanel(
            parent,
            name,
            164,
            62,
            x,
            -17,
            available ? color : new Color(46, 49, 58)
        );
        this.createLabel(
            node,
            'Title',
            available ? `✦ ${title} ✦` : `${title}（满）`,
            0,
            12,
            21,
            available ? Color.WHITE : new Color(145, 145, 150)
        );
        this.createLabel(
            node,
            'Subtitle',
            subtitle,
            0,
            -15,
            13,
            available
                ? new Color(203, 215, 230)
                : new Color(112, 112, 118)
        );

        if (!available) {
            return;
        }

        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        node.on(Button.EventType.CLICK, onClick);
        tween(node)
            .repeatForever(
                tween()
                    .to(0.42, { scale: new Vec3(1.055, 1.055, 1) })
                    .to(0.42, { scale: new Vec3(1, 1, 1) })
            )
            .start();
    }


    // =====================================================
    // 怪海显示与战斗反馈
    // =====================================================

    showEnemyGroup(enemies: EnemyViewData[]): void {
        const livingIds = new Set(enemies.map((enemy) => enemy.id));
        for (const [id, view] of this.enemyViews) {
            if (!livingIds.has(id)) {
                view.node.removeFromParent();
                view.node.destroy();
                this.enemyViews.delete(id);
            }
        }

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
            const positionX = enemy.positionX ?? startX + column * gapX;
            const positionY = enemy.positionY ?? startY - row * gapY;
            const existingView = this.enemyViews.get(enemy.id);
            if (existingView) {
                existingView.node.setPosition(positionX, positionY, 0);
                existingView.node.active =
                    positionX <= BATTLE_BALANCE.monsterVisibleRightX;
                this.updateEnemyHp(enemy.id, enemy.hp, enemy.maxHp);
                continue;
            }
            const node = this.createPanel(
                this.enemyField,
                `Enemy_${enemy.id}`,
                enemy.isBoss ? 76 : 62,
                enemy.isBoss ? 54 : 46,
                positionX,
                positionY,
                enemy.isBoss
                    ? new Color(130, 84, 45)
                    : enemy.isEnhanced
                        ? new Color(126, 87, 38)
                    : enemy.type === 'melee'
                        ? new Color(104, 56, 62)
                        : new Color(52, 74, 112)
            );

            const name = this.createLabel(
                node,
                'Name',
                `${enemy.isBoss
                    ? '妖王'
                    : enemy.isElite
                        ? '精'
                        : enemy.isEnhanced
                            ? '强'
                        : enemy.type === 'melee' ? '近' : '远'}` +
                    `${enemy.level ? `·${enemy.level}` : ''}`,
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
            node.active = positionX <= BATTLE_BALANCE.monsterVisibleRightX;
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


    clearEnemyGroup(): void {
        for (const view of this.enemyViews.values()) {
            view.node.removeFromParent();
            view.node.destroy();
        }
        this.enemyViews.clear();
    }


    updateEnemyPosition(id: number, x: number, y: number): void {
        const view = this.enemyViews.get(id);
        if (!view) {
            return;
        }
        view.node.setPosition(x, y, 0);
        view.node.active = x <= BATTLE_BALANCE.monsterVisibleRightX;
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
            0,
            62,
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


    playEnemyAttack(attackerIds: number[]): void {
        for (const id of attackerIds) {
            const view = this.enemyViews.get(id);
            if (!view) {
                continue;
            }
            tween(view.node)
                .to(0.08, { scale: new Vec3(1.1, 1.1, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
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
            '最终首领已击败！',
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


        // 使用相同战前配置开始新一局，局内成长全部重置。
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

        this.hideUpgradeUI();

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
