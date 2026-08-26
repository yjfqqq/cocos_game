import {
    _decorator,
    Component,
    Node,
    UITransform,
    Label,
    Color,
    Graphics,
    Button,
    Sprite,
    SpriteFrame,
    Texture2D,
    resources,
    view,
    macro,
    ResolutionPolicy
} from 'cc';

import {
    gamePlayerData,
    playerData,
    spendGold
} from './PlayerData';

import {
    buyItem,
    getInventoryItems,
    useItem
} from './InventoryData';

import {
    getArtifactBonusText,
    getArtifacts,
    upgradeArtifact
} from './ArtifactData';

import {
    BattleUI
} from './BattleUI';

import {
    BattleSystem
} from './BattleSystem';
import type {
    BattleBuildSelection
} from './GameData/BattleBuildData';
import {
    BATTLE_BUILD_LIMITS,
    getLastBattleBuildSelection,
    normalizeBattleBuildSelection,
    setLastBattleBuildSelection
} from './GameData/BattleBuildData';
import {
    getSkillDefinition,
    getSkillLevelDefinition,
    SKILL_FRAGMENT_SHOP_CONFIG,
    NORMAL_ATTACK_SKILL_ID
} from './GameData/SkillData';
import { SkillSystem } from './Systems/SkillSystem';
import {
    loadSkillProgress,
    saveSkillProgress
} from './Systems/PlayerProgressStorage';
import {
    getBondDefinition
} from './GameData/BondData';
import { RUNTIME_BOND_DEFINITIONS } from './GameData/BondGrowthData';

const { ccclass } = _decorator;

@ccclass('MainUIBuilder')
export class MainUIBuilder extends Component {

    private buttonMap: Map<string, Node> = new Map();
    private activePage = '';

    private battleRoot: Node | null = null;
    private battleSystem: BattleSystem | null = null;
    private battleConfigRoot: Node | null = null;

    private shopMessage = '';
    private bagMessage = '';
    private artifactMessage = '';
    private readonly skillSystem = new SkillSystem(gamePlayerData.skills);

    private readonly artFrames: Map<string, SpriteFrame> = new Map();
    private readonly artPaths: Record<string, string> = {
        // 背景图暂时停用，避免进入微信小游戏主包。
        // background: 'ui/main/main-bg-v1/texture',
        '主页': 'ui/main/icon-home-v1/texture',
        '角色': 'ui/main/icon-role-v1/texture',
        '神器': 'ui/main/icon-artifact-v1/texture',
        '图鉴': 'ui/main/icon-collection-v1/texture',
        '背包': 'ui/main/icon-bag-v1/texture',
        '商店': 'ui/main/icon-shop-v1/texture',
        '成就': 'ui/main/icon-achievement-v1/texture'
    };

    start() {

        loadSkillProgress(gamePlayerData);

        // =====================================================
        // 手机 Web 预览横屏与分辨率适配
        // =====================================================

        // 竖屏扫码打开时，Web 端会用 CSS 自动旋转 Canvas。
        view.setOrientation(
            macro.ORIENTATION_LANDSCAPE
        );

        // 浏览器工具栏收起、横竖屏切换后重新计算 Canvas 尺寸。
        view.resizeWithBrowserSize(true);

        view.setDesignResolutionSize(
            1280,
            720,
            // 保证整个 1280×720 界面始终完整可见，避免左右裁切。
            ResolutionPolicy.SHOW_ALL
        );

        // 美术资源加载成功后再构建，避免首帧出现灰盒界面。
        // 单张资源失败时仍会使用 Graphics 风格作为兜底。
        this.loadUIArt(() => this.build());
    }


    private loadUIArt(onComplete: () => void): void {

        const keys = Object.keys(this.artPaths);
        let remaining = keys.length;

        const finishOne = () => {
            remaining--;
            if (remaining <= 0) {
                onComplete();
            }
        };

        for (const key of keys) {
            const path = this.artPaths[key];
            resources.load(
                path,
                Texture2D,
                (error, texture) => {
                    if (!error && texture) {
                        const spriteFrame = new SpriteFrame();
                        spriteFrame.texture = texture;
                        this.artFrames.set(key, spriteFrame);
                    } else {
                        console.warn(`UI 美术资源加载失败：${path}`, error);
                    }
                    finishOne();
                }
            );
        }
    }


    // =====================================================
    // 构建主界面
    // =====================================================

    build(initialPage = '主页') {

        this.clearChildren(this.node);

        this.buttonMap.clear();

        // =====================================================
        // 主界面
        // =====================================================

        const main = this.createNode(
            this.node,
            'MainUI',
            1280,
            720
        );

        main.setPosition(0, 0, 0);

        // 背景图暂时停用；恢复资源后可取消以下代码的注释。
        // this.createSprite(
        //     main,
        //     'MainBackground',
        //     'background',
        //     1280,
        //     720,
        //     0,
        //     0
        // );

        // 轻微冷色遮罩保证文字在明亮云海上仍有足够对比度。
        this.createPanel(
            main,
            'AtmosphereTint',
            1280,
            720,
            0,
            0,
            new Color(5, 10, 27, 58)
        );


        // =====================================================
        // 1. 顶部玩家信息栏
        // =====================================================

        const topBar = this.createPanel(
            main,
            'TopBar',
            1248,
            68,
            0,
            326,
            new Color(18, 29, 52, 228)
        );

        this.createStatusOrb(topBar, -588, 0, new Color(80, 205, 226), '仙');

        // 顶部信息分组：避免所有文字挤在一行，突出战力与资源。
        this.createLabel(
            topBar,
            'PlayerName',
            `${playerData.name}`,
            -510,
            0,
            26,
            Color.WHITE
        );

        this.createLabel(
            topBar,
            'PlayerLevel',
            `Lv.${playerData.level}`,
            -365,
            0,
            24,
            new Color(205, 210, 225)
        );

        this.createLabel(
            topBar,
            'PlayerPower',
            `战力 ${playerData.power}`,
            -185,
            0,
            25,
            new Color(235, 205, 120)
        );

        this.createLine(
            topBar,
            95,
            0,
            1,
            new Color(75, 82, 105)
        );

        this.createLabel(
            topBar,
            'Gold',
            `金币 ${playerData.gold}`,
            415,
            0,
            23,
            Color.WHITE
        );

        this.createLabel(
            topBar,
            'Diamond',
            `◆ ${playerData.diamond}`,
            550,
            0,
            23,
            new Color(190, 205, 235)
        );


        // =====================================================
        // 2. 内容区域
        //
        // 所有页面都放这里
        //
        // HomePage
        // RolePage
        // ArtifactPage
        // CollectionPage
        // BagPage
        // ShopPage
        // AchievementPage
        // =====================================================

        const content = this.createNode(
            main,
            'Content',
            1280,
            550
        );

        content.setPosition(0, -20, 0);


        // =====================================================
        // 显示当前页面。重建界面时也能保留用户所在页并刷新顶部数据。
        // =====================================================

        this.activePage = initialPage;
        this.showPage(content, initialPage);


        // =====================================================
        // 3. 底部功能栏
        // =====================================================

        this.createBottomBar(main);

        this.updateButtonHighlight();
    }


    // =====================================================
    // 首页
    // =====================================================

    showHomePage(content: Node) {

        // 清空 Content
        this.clearChildren(content);


        // =====================================================
        // 首页容器
        // =====================================================

        const homePage = this.createNode(
            content,
            'HomePage',
            1280,
            550
        );

        homePage.setPosition(0, 0, 0);


        // =====================================================
        // 左侧羁绊面板
        // =====================================================

        const leftPanel = this.createPanel(
            homePage,
            'FactionPanel',
            270,
            486,
            -493,
            35,
            new Color(15, 27, 48, 220)
        );

        this.createLabel(
            leftPanel,
            'FactionTitle',
            'CURRENT BOND  ·  当前羁绊',
            0,
            204,
            17,
            new Color(128, 191, 211)
        );

        this.createLabel(
            leftPanel,
            'FactionName',
            '天宫',
            0,
            158,
            40,
            new Color(244, 222, 159)
        );

        this.createLabel(
            leftPanel,
            'FactionSubTitle',
            '三部神将 · 共筑仙庭',
            0,
            122,
            16,
            new Color(155, 170, 194)
        );


        // 分割线

        this.createLine(
            leftPanel,
            0,
            98,
            216,
            new Color(116, 137, 173, 150)
        );


        // 羁绊进度

        this.createFactionProgress(
            leftPanel,
            '战神',
            '0 / 6',
            0,
            52
        );

        this.createFactionProgress(
            leftPanel,
            '雷部',
            '0 / 6',
            0,
            -12
        );

        this.createFactionProgress(
            leftPanel,
            '天王',
            '0 / 6',
            0,
            -76
        );


        // =====================================================
        // 当前终极目标
        // =====================================================

        this.createLabel(
            leftPanel,
            'UltimateTitle',
            '终极路线',
            0,
            -132,
            17,
            new Color(139, 158, 187)
        );

        const ultimatePlate = this.createPanel(
            leftPanel,
            'UltimatePlate',
            218,
            52,
            0,
            -184,
            new Color(43, 44, 72, 232)
        );
        this.redrawPanel(ultimatePlate, new Color(43, 44, 72, 232), true);

        this.createLabel(
            ultimatePlate,
            'Ultimate',
            '✦  彩色 · 天宫  ✦',
            0,
            0,
            21,
            new Color(242, 211, 126)
        );


        // =====================================================
        // 中间主区域
        // =====================================================

        const centerPanel = this.createPanel(
            homePage,
            'CenterPanel',
            928,
            486,
            145,
            35,
            new Color(13, 23, 44, 205)
        );


        this.createLabel(
            centerPanel,
            'CenterTitle',
            '天宫 · 羁绊核心',
            0,
            204,
            30,
            new Color(241, 226, 181)
        );

        this.createLabel(
            centerPanel,
            'CenterSubtitle',
            '修仙之路 · 从炼气期开始',
            0,
            168,
            16,
            new Color(135, 172, 198)
        );

        this.createLine(centerPanel, 0, 145, 620, new Color(110, 145, 181, 90));


        // =====================================================
        // 羁绊核心
        // =====================================================

        const core = this.createNode(
            centerPanel,
            'FactionCore',
            310,
            250
        );

        core.setPosition(0, 15, 0);
        this.drawFactionCore(core);

        this.createLabel(
            core,
            'CoreTitle',
            '羁绊核心',
            0,
            18,
            30,
            new Color(246, 231, 188)
        );

        this.createLabel(
            core,
            'CoreSubTitle',
            '收集神将 · 吞噬成长',
            0,
            -22,
            18,
            new Color(167, 190, 207)
        );

        this.createLabel(
            core,
            'CoreStatus',
            '尚未激活',
            0,
            -58,
            18,
            new Color(110, 202, 217)
        );


        // =====================================================
        // 提示
        // =====================================================

        this.createLabel(
            centerPanel,
            'Hint',
            '收集战神、雷部、天王神将，逐步强化天宫羁绊',
            0,
            -137,
            17,
            new Color(148, 174, 198)
        );


        // =====================================================
        // 开始战斗按钮
        // =====================================================

        const startBattleBtn = this.createPanel(
            homePage,
            'StartBattleButton',
            326,
            66,
            145,
            -168,
            new Color(40, 98, 126, 246)
        );
        this.redrawPanel(startBattleBtn, new Color(40, 98, 126, 246), true);

        const startLabel = this.createLabel(
            startBattleBtn,
            'Label',
            '御剑出征   ›',
            0,
            0,
            27,
            new Color(255, 238, 191)
        );

        const startTf = startLabel.node.getComponent(UITransform);

        if (startTf) {
            startTf.setContentSize(326, 66);
        }

        const startBtn = startBattleBtn.addComponent(Button);
        this.configureButton(startBtn);

        startBattleBtn.on(
            Button.EventType.CLICK,
            () => {
                this.openBattleBuildConfig();
            }
        );
    }


    // =====================================================
    // 创建底部功能栏
    // =====================================================

    createBottomBar(main: Node) {

        const bottomBar = this.createPanel(
            main,
            'BottomBar',
            1248,
            94,
            0,
            -309,
            new Color(13, 24, 45, 236)
        );


        const buttons = [
            '主页',
            '角色',
            '神器',
            '图鉴',
            '背包',
            '商店',
            '成就'
        ];


        // 7 个入口在 1280 横屏下均匀分布，左右留出安全边距。
        const startX = -528;
        const gap = 176;


        for (let i = 0; i < buttons.length; i++) {

            const name = buttons[i];

            const button = this.createPanel(
                bottomBar,
                name,
                152,
                74,
                startX + i * gap,
                0,
                new Color(27, 43, 70, 220)
            );

            this.createSprite(
                button,
                `${name}Icon`,
                name,
                42,
                42,
                0,
                12
            );


            // =================================================
            // 按钮文字
            // =================================================

            const label = this.createLabel(
                button,
                'Label',
                name,
                0,
                -25,
                16,
                new Color(213, 224, 235)
            );

            // 文字命中区缩到和按钮一致，避免遮挡相邻按钮
            const labelTransform = label.node.getComponent(UITransform);

            if (labelTransform) {
                labelTransform.setContentSize(152, 28);
            }


            // =================================================
            // 点击事件
            //
            // 使用 Button 组件，保证真正可点击
            // =================================================

            const btn = button.addComponent(Button);
            this.configureButton(btn);

            button.on(
                Button.EventType.CLICK,
                () => {
                    this.onBottomButtonClick(name);
                }
            );

            this.buttonMap.set(name, button);
        }
    }


    // =====================================================
    // 底部按钮点击
    // =====================================================

    onBottomButtonClick(name: string) {

        console.log(
            '点击底部按钮:',
            name
        );


        const main = this.node.getChildByName(
            'MainUI'
        );

        if (!main) {
            return;
        }


        const content = main.getChildByName(
            'Content'
        );

        if (!content) {
            return;
        }


        this.activePage = name;
        this.showPage(content, name);
        this.updateButtonHighlight();
    }


    // =====================================================
    // 统一页面切换
    // =====================================================

    private showPage(content: Node, name: string): void {

        switch (name) {
            case '角色':
                this.showRolePage(content);
                break;
            case '神器':
                this.showArtifactPage(content);
                break;
            case '图鉴':
                this.showCollectionPage(content);
                break;
            case '背包':
                this.showBagPage(content);
                break;
            case '商店':
                this.showShopPage(content);
                break;
            case '成就':
                this.showAchievementPage(content);
                break;
            default:
                this.showHomePage(content);
                break;
        }
    }


    // =====================================================
    // 页签高亮
    // =====================================================

    updateButtonHighlight() {

        this.buttonMap.forEach((node, name) => {
            const active = name === this.activePage;

            this.redrawPanel(
                node,
                active
                    ? new Color(42, 85, 111, 246)
                    : new Color(27, 43, 70, 220),
                active
            );

            const icon = node.getChildByName(`${name}Icon`)?.getComponent(Sprite);
            if (icon) {
                icon.color = active
                    ? Color.WHITE
                    : new Color(178, 199, 215);
            }

            const label = node.getChildByName('Label')?.getComponent(Label);
            if (label) {
                label.color = active
                    ? new Color(251, 222, 153)
                    : new Color(182, 201, 217);
            }
        });
    }


    // =====================================================
    // 本局 Build 配置
    // =====================================================

    private openBattleBuildConfig(): void {
        const main = this.node.getChildByName('MainUI');
        if (main) {
            main.active = false;
        }

        this.destroyBattleBuildConfig();

        const selection = normalizeBattleBuildSelection(
            getLastBattleBuildSelection()
        );
        const root = this.createNode(
            this.node,
            'BattleBuildConfigRoot',
            1280,
            720
        );
        this.battleConfigRoot = root;

        this.createPanel(
            root,
            'Background',
            1280,
            720,
            0,
            0,
            new Color(10, 19, 35, 250)
        );
        this.createLabel(
            root,
            'Title',
            '本局配置',
            0,
            292,
            38,
            new Color(255, 232, 174)
        );
        this.createLabel(
            root,
            'Subtitle',
            '技能按局外等级解锁候选；羁绊通过局内灵石主动抽取',
            0,
            248,
            20,
            new Color(171, 193, 213)
        );

        const skillPanel = this.createPanel(
            root,
            'SkillBuildPanel',
            540,
            390,
            -290,
            25,
            new Color(23, 39, 62, 246)
        );
        this.createLabel(
            skillPanel,
            'Title',
            `技能  ${selection.selectedSkillIds.length} / ` +
                `${BATTLE_BUILD_LIMITS.maxEquippedSkills}`,
            0,
            155,
            29,
            new Color(126, 211, 237)
        );

        for (let index = 0; index < selection.selectedSkillIds.length; index++) {
            const skillId = selection.selectedSkillIds[index];
            const definition = getSkillDefinition(skillId);
            const isRequired = skillId === NORMAL_ATTACK_SKILL_ID;
            const row = this.createPanel(
                skillPanel,
                `EquippedSkill_${skillId}`,
                470,
                96,
                0,
                72 - index * 112,
                isRequired
                    ? new Color(44, 71, 91, 248)
                    : new Color(36, 53, 78, 245)
            );
            this.createLabel(
                row,
                'Name',
                `✓ ${definition?.skillName ?? skillId}` +
                    (isRequired ? '（必带 · 锁定）' : '（已携带）'),
                -70,
                19,
                23,
                Color.WHITE
            );
            this.createLabel(
                row,
                'Description',
                definition?.description ?? '本局可持续强化',
                -70,
                -22,
                17,
                new Color(181, 198, 214)
            );
        }

        const bondPanel = this.createPanel(
            root,
            'BondBuildPanel',
            540,
            390,
            290,
            25,
            new Color(32, 32, 58, 246)
        );
        this.createLabel(
            bondPanel,
            'Title',
            `V1羁绊卡池  ${RUNTIME_BOND_DEFINITIONS.length}套`,
            0,
            155,
            29,
            new Color(216, 170, 235)
        );

        for (let index = 0; index < RUNTIME_BOND_DEFINITIONS.length; index++) {
            const definition = RUNTIME_BOND_DEFINITIONS[index];
            const row = this.createPanel(
                bondPanel,
                `RuntimeBond_${definition.id}`,
                470,
                112,
                0,
                58 - index * 125,
                new Color(57, 45, 79, 245)
            );
            this.createLabel(
                row,
                'Name',
                `◇ ${definition.name}`,
                -85,
                25,
                23,
                Color.WHITE
            );
            this.createLabel(
                row,
                'Description',
                definition.description,
                -85,
                -8,
                17,
                new Color(198, 187, 214)
            );
            this.createLabel(
                row,
                'InitialLevel',
                '进入战斗后消耗灵石三选一，角色升级不会自动抽取',
                -85,
                -35,
                16,
                new Color(235, 205, 120)
            );
        }

        const backButtonNode = this.createPanel(
            root,
            'BackToMainButton',
            210,
            62,
            -135,
            -270,
            new Color(47, 57, 77)
        );
        this.createLabel(
            backButtonNode,
            'Label',
            '返回',
            0,
            0,
            23,
            Color.WHITE
        );
        const backButton = backButtonNode.addComponent(Button);
        this.configureButton(backButton);
        backButtonNode.on(
            Button.EventType.CLICK,
            () => this.closeBattleBuildConfig()
        );

        const startButtonNode = this.createPanel(
            root,
            'ConfirmBattleBuildButton',
            300,
            66,
            135,
            -270,
            new Color(40, 98, 126, 250)
        );
        this.createLabel(
            startButtonNode,
            'Label',
            '开始战斗  ›',
            0,
            0,
            26,
            new Color(255, 238, 191)
        );
        const startButton = startButtonNode.addComponent(Button);
        this.configureButton(startButton);
        startButtonNode.on(
            Button.EventType.CLICK,
            () => {
                setLastBattleBuildSelection(selection);
                this.enterBattle(selection);
            }
        );
    }


    private closeBattleBuildConfig(): void {
        this.destroyBattleBuildConfig();
        const main = this.node.getChildByName('MainUI');
        if (main) {
            main.active = true;
        }
    }


    private destroyBattleBuildConfig(): void {
        if (!this.battleConfigRoot) {
            return;
        }
        this.battleConfigRoot.removeFromParent();
        this.battleConfigRoot.destroy();
        this.battleConfigRoot = null;
    }


    // =====================================================
    // 进入战斗
    // =====================================================

    private enterBattle(selection: BattleBuildSelection): void {

        this.destroyBattleBuildConfig();

        // 隐藏主界面（含顶部栏 / 底部栏 / 内容区）
        const main = this.node.getChildByName('MainUI');

        if (main) {
            main.active = false;
        }


        // 在当前 Canvas 下创建战斗 UI（不新建场景）
        const battleRoot = this.createNode(
            this.node,
            'BattleRoot',
            1280,
            720
        );

        const battleUI = new BattleUI();
        battleUI.build(
            battleRoot,
            () => this.exitBattle()
        );


        const system = battleRoot.addComponent(BattleSystem);
        system.init(
            battleUI,
            () => this.exitBattle(),
            selection
        );

        this.battleRoot = battleRoot;
        this.battleSystem = system;

        system.begin();
    }


    // =====================================================
    // 退出战斗
    // =====================================================

    private exitBattle() {

        // 先停掉战斗系统的所有 Timer
        if (this.battleSystem) {
            this.battleSystem.stop();
            this.battleSystem = null;
        }

        this.battleRoot = null;
        this.battleConfigRoot = null;

        // 重建主界面：自动刷新顶部等级 / 战力 / 金币，
        // 并回到首页（不残留战斗 Timer，BattleRoot 一并销毁）
        this.build('主页');
    }


    // =====================================================
    // 角色页面
    // =====================================================

    showRolePage(content: Node) {

        this.clearChildren(content);


        const page = this.createPanel(
            content,
            'RolePage',
            1220,
            500,
            0,
            40,
            new Color(27, 32, 48)
        );

        this.createLabel(
            page,
            'Title',
            '角色',
            0,
            210,
            34,
            Color.WHITE
        );


        // 角色信息卡
        const infoCard = this.createPanel(
            page,
            'InfoCard',
            1120,
            105,
            0,
            120,
            new Color(31, 36, 54)
        );

        this.createLabel(infoCard, 'InfoTitle', '角色信息', -470, 45, 22, new Color(180, 185, 205));
        this.createLabel(infoCard, 'Player', '玩家', -470, -10, 28, Color.WHITE);
        this.createLabel(infoCard, 'Level', `等级 Lv.${playerData.level}`, -170, -10, 26, Color.WHITE);
        this.createLabel(infoCard, 'Power', `战力 ${playerData.power}`, 150, -10, 26, Color.WHITE);
        this.createLabel(infoCard, 'Bond', `当前羁绊：${playerData.bond}`, 460, -10, 24, new Color(235, 205, 120));


        // 基础属性卡
        const statCard = this.createPanel(
            page,
            'StatCard',
            1120,
            105,
            0,
            2,
            new Color(31, 36, 54)
        );

        this.createLabel(statCard, 'StatTitle', '基础属性', -470, 45, 22, new Color(180, 185, 205));
        this.createLabel(
            statCard,
            'Hp',
            `生命 ${playerData.hp}`,
            -420,
            -10,
            26,
            Color.WHITE
        );

        this.createLabel(
            statCard,
            'Atk',
            `攻击 ${playerData.atk}`,
            -140,
            -10,
            26,
            Color.WHITE
        );

        this.createLabel(
            statCard,
            'Def',
            `防御 ${playerData.def}`,
            140,
            -10,
            26,
            Color.WHITE
        );

        this.createLabel(
            statCard,
            'Crit',
            `暴击 ${playerData.crit}%`,
            420,
            -10,
            26,
            Color.WHITE
        );


        // 修炼境界卡
        const cultCard = this.createPanel(
            page,
            'CultCard',
            1120,
            105,
            0,
            -116,
            new Color(31, 36, 54)
        );
        

        this.createLabel(cultCard, 'CultTitle', '修炼境界', -470, 45, 22, new Color(180, 185, 205));
        this.createLabel(cultCard, 'Realm', `境界 ${playerData.realm}`, -300, -10, 28, Color.WHITE);
        this.createLabel(cultCard, 'Exp', `经验 ${playerData.exp} / ${playerData.expToNextLevel}`, 280, -10, 28, new Color(235, 205, 120));


        this.createLabel(
            page,
            'RoleHint',
            '通过战斗获得金币，在商店购买修炼丹后可于背包中使用。',
            0,
            -212,
            19,
            new Color(180, 185, 205)
        );
    }


    // =====================================================
    // 神器页面
    // =====================================================

    showArtifactPage(content: Node) {

        this.clearChildren(content);


        const page = this.createPanel(
            content,
            'ArtifactPage',
            1220,
            500,
            0,
            40,
            new Color(27, 32, 48)
        );

        this.createLabel(
            page,
            'Title',
            '神器',
            0,
            215,
            34,
            Color.WHITE
        );

        const artifacts = getArtifacts();
        const slotX = [-400, 0, 400];

        for (let i = 0; i < artifacts.length; i++) {

            const artifact = artifacts[i];

            const slot = this.createPanel(
                page,
                'Slot_' + artifact.id,
                340,
                250,
                slotX[i],
                70,
                new Color(31, 36, 54)
            );

            this.createLabel(slot, 'Name', artifact.name, 0, 90, 28, Color.WHITE);
            this.createLabel(
                slot,
                'Level',
                artifact.level > 0 ? `Lv.${artifact.level}` : '未激活',
                0,
                52,
                21,
                artifact.level > 0
                    ? new Color(235, 205, 120)
                    : new Color(180, 185, 205)
            );
            this.createLine(slot, 0, 20, 280, new Color(70, 76, 98));
            this.createLabel(
                slot,
                'Bonus',
                getArtifactBonusText(artifact),
                0,
                -10,
                19,
                Color.WHITE
            );

            const upgradeButton = this.createPanel(
                slot,
                'UpgradeButton',
                230,
                52,
                0,
                -78,
                new Color(52, 59, 84)
            );

            const upgradeLabel = this.createLabel(
                upgradeButton,
                'Label',
                `${artifact.level === 0 ? '激活' : '强化'} · ${artifact.upgradeCost} 金币`,
                0,
                0,
                20,
                Color.WHITE
            );
            this.setLabelHitArea(upgradeLabel, 230, 52);

            const upgradeButtonComponent = upgradeButton.addComponent(Button);
            this.configureButton(upgradeButtonComponent);
            upgradeButton.on(
                Button.EventType.CLICK,
                () => {
                    const result = upgradeArtifact(artifact.id);
                    this.artifactMessage = result.message;
                    this.build('神器');
                }
            );
        }

        const strengthen = this.createPanel(
            page,
            'Strengthen',
            1120,
            130,
            0,
            -165,
            new Color(31, 36, 54)
        );

        const activeCount = artifacts.filter((artifact) => artifact.level > 0).length;
        const totalLevels = artifacts.reduce((total, artifact) => {
            return total + artifact.level;
        }, 0);

        this.createLabel(strengthen, 'StTitle', '神器共鸣', -430, 35, 28, Color.WHITE);
        this.createLabel(
            strengthen,
            'StLevel',
            `已激活 ${activeCount} / ${artifacts.length} · 总等级 ${totalLevels}`,
            -330,
            -10,
            22,
            new Color(180, 185, 205)
        );
        this.createLabel(
            strengthen,
            'StMessage',
            this.artifactMessage || '激活和强化会永久增加角色属性与战力。',
            250,
            -10,
            21,
            this.artifactMessage
                ? new Color(235, 205, 120)
                : new Color(180, 185, 205)
        );
    }


    // =====================================================
    // 图鉴页面
    // =====================================================

    showCollectionPage(content: Node) {

        this.clearChildren(content);


        const page = this.createPanel(
            content,
            'CollectionPage',
            1220,
            500,
            0,
            40,
            new Color(27, 32, 48)
        );

        this.createLabel(
            page,
            'Title',
            '神将图鉴',
            0,
            220,
            34,
            Color.WHITE
        );


        // 三个分类
        const cats = [
            ['战神', '0 / 6'],
            ['雷部', '0 / 6'],
            ['天王', '0 / 6']
        ];
        const catX = [-400, 0, 400];

        for (let i = 0; i < cats.length; i++) {

            const cat = this.createPanel(
                page,
                'Cat_' + cats[i][0],
                360,
                110,
                catX[i],
                150,
                new Color(31, 36, 54)
            );

            this.createLabel(cat, 'CatName', cats[i][0], 0, 25, 26, Color.WHITE);
            this.createLabel(cat, 'CatNum', cats[i][1], 0, -25, 24, new Color(180, 185, 205));
        }


        // 六个神将卡片
        const generals = [
            '战神·1', '战神·2',
            '雷部·1', '雷部·2',
            '天王·1', '天王·2'
        ];
        const genX = [-400, 0, 400];
        const genY = [-35, -175];

        for (let i = 0; i < generals.length; i++) {

            const col = i % 3;
            const row = Math.floor(i / 3);

            const card = this.createPanel(
                page,
                'Gen_' + generals[i],
                360,
                130,
                genX[col],
                genY[row],
                new Color(31, 36, 54)
            );

            this.createLabel(card, 'GenName', generals[i], 0, 25, 24, Color.WHITE);
            this.createLabel(card, 'GenStatus', '未收集', 0, -30, 22, new Color(120, 125, 145));
        }
    }


    // =====================================================
    // 背包页面
    // =====================================================

    showBagPage(content: Node) {

        this.clearChildren(content);


        const page = this.createPanel(
            content,
            'BagPage',
            1220,
            500,
            0,
            40,
            new Color(27, 32, 48)
        );

        this.createLabel(
            page,
            'Title',
            '背包',
            0,
            220,
            34,
            Color.WHITE
        );

        this.createLabel(
            page,
            'Capacity',
            `容量 ${getInventoryItems().filter((item) => item.quantity > 0).length} / 100`,
            0,
            180,
            24,
            new Color(180, 185, 205)
        );

        // 道具格（4 列 x 2 行）。当前只展示已定义的道具，
        // 后续增加装备、材料时可继续沿用这个网格。
        const cellX = [-450, -150, 150, 450];
        const cellY = [40, -110];
        const items = getInventoryItems();

        for (let i = 0; i < 8; i++) {

            const col = i % 4;
            const row = Math.floor(i / 4);

            const cell = this.createPanel(
                page,
                'Cell_' + (i + 1),
                200,
                130,
                cellX[col],
                cellY[row],
                new Color(31, 36, 54)
            );

            const item = items[i];

            if (!item) {
                this.createLabel(cell, 'Empty', '空', 0, 0, 26, new Color(120, 125, 145));
                continue;
            }

            this.createLabel(cell, 'ItemName', item.name, 0, 42, 24, Color.WHITE);
            this.createLabel(
                cell,
                'ItemCount',
                `数量 ×${item.quantity}`,
                0,
                5,
                20,
                new Color(235, 205, 120)
            );

            const useButton = this.createPanel(
                cell,
                'UseButton',
                150,
                40,
                0,
                -42,
                new Color(52, 59, 84)
            );

            const useLabel = this.createLabel(
                useButton,
                'Label',
                '使用',
                0,
                0,
                20,
                Color.WHITE
            );
            this.setLabelHitArea(useLabel, 150, 40);

            const useButtonComponent = useButton.addComponent(Button);
            this.configureButton(useButtonComponent);
            useButtonComponent.interactable = item.quantity > 0;
            useButton.on(
                Button.EventType.CLICK,
                () => {
                    const result = useItem(item.id);
                    this.bagMessage = result.message;
                    this.build('背包');
                }
            );
        }

        this.createLabel(
            page,
            'BagMessage',
            this.bagMessage || '修炼丹可在商店用金币购买。',
            0,
            -215,
            20,
            this.bagMessage
                ? new Color(235, 205, 120)
                : new Color(180, 185, 205)
        );
    }


    // =====================================================
    // 商店页面
    // =====================================================

    showShopPage(content: Node) {

        this.clearChildren(content);


        const page = this.createPanel(
            content,
            'ShopPage',
            1220,
            500,
            0,
            40,
            new Color(27, 32, 48)
        );

        this.createLabel(
            page,
            'Title',
            '商店',
            0,
            220,
            34,
            Color.WHITE
        );


        const itemCard = this.createPanel(
            page,
            'Product_修炼丹',
            500,
            330,
            -275,
            20,
            new Color(31, 36, 54)
        );
        this.createLabel(itemCard, 'ProdName', '修炼丹', 0, 130, 28, Color.WHITE);
        this.createLabel(
            itemCard,
            'ProdDesc',
            '背包使用后获得 50 经验',
            0,
            80,
            22,
            new Color(180, 185, 205)
        );
        this.createLabel(
            itemCard,
            'ProdPrice',
            '价格：20 金币',
            0,
            30,
            24,
            new Color(235, 205, 120)
        );
        const buyItemButton = this.createPanel(
            itemCard,
            'Buy_修炼丹',
            220,
            60,
            0,
            -90,
            new Color(52, 59, 84)
        );
        const buyItemLabel = this.createLabel(
            buyItemButton,
            'Label',
            '购买',
            0,
            0,
            24,
            Color.WHITE
        );
        this.setLabelHitArea(buyItemLabel, 220, 60);
        const itemButton = buyItemButton.addComponent(Button);
        this.configureButton(itemButton);
        buyItemButton.on(Button.EventType.CLICK, () => {
            const result = buyItem('cultivation-pill');
            this.shopMessage = result.message;
            this.build('商店');
        });

        const skillDefinition = getSkillDefinition(NORMAL_ATTACK_SKILL_ID);
        const skillState = this.skillSystem.getSkillState(
            NORMAL_ATTACK_SKILL_ID
        );
        const isSkillMax = (skillState?.level ?? 1) >=
            (skillDefinition?.maxLevel ?? 10);
        const requiredFragments = isSkillMax
            ? 0
            : getSkillLevelDefinition(
                NORMAL_ATTACK_SKILL_ID,
                (skillState?.level ?? 1) + 1
            )?.fragmentsRequired ?? 0;
        const currentLevelDescription = getSkillLevelDefinition(
            NORMAL_ATTACK_SKILL_ID,
            skillState?.level ?? 1
        )?.description ?? '';
        const skillCard = this.createPanel(
            page,
            'SkillFragmentDraw',
            500,
            330,
            275,
            20,
            new Color(29, 42, 58)
        );
        this.createLabel(
            skillCard,
            'SkillName',
            `普攻 Lv.${skillState?.level ?? 1} / ${skillDefinition?.maxLevel ?? 10}`,
            0,
            130,
            28,
            new Color(126, 211, 237)
        );
        this.createLabel(
            skillCard,
            'SkillEffect',
            currentLevelDescription,
            0,
            88,
            17,
            new Color(180, 198, 214)
        );
        this.createLabel(
            skillCard,
            'Fragments',
            isSkillMax
                ? `普攻碎片：${skillState?.fragments ?? 0} · 已满级`
                : `普攻碎片：${skillState?.fragments ?? 0} / ${requiredFragments}`,
            0,
            42,
            21,
            new Color(235, 205, 120)
        );

        const drawButtonNode = this.createPanel(
            skillCard,
            'DrawSkillFragments',
            205,
            58,
            -112,
            -85,
            new Color(38, 96, 126)
        );
        const drawLabel = this.createLabel(
            drawButtonNode,
            'Label',
            `抽取 ${SKILL_FRAGMENT_SHOP_CONFIG.drawCostGold}金币`,
            0,
            0,
            20,
            Color.WHITE
        );
        this.setLabelHitArea(drawLabel, 205, 58);
        const drawButton = drawButtonNode.addComponent(Button);
        this.configureButton(drawButton);
        drawButtonNode.on(Button.EventType.CLICK, () => {
            if (!spendGold(SKILL_FRAGMENT_SHOP_CONFIG.drawCostGold)) {
                this.shopMessage = '金币不足，无法抽取技能碎片';
                this.build('商店');
                return;
            }
            const fragmentCount =
                SKILL_FRAGMENT_SHOP_CONFIG.drawMinFragments +
                Math.floor(
                    Math.random() * (
                        SKILL_FRAGMENT_SHOP_CONFIG.drawMaxFragments -
                        SKILL_FRAGMENT_SHOP_CONFIG.drawMinFragments + 1
                    )
                );
            const result = this.skillSystem.addSkillFragments(
                NORMAL_ATTACK_SKILL_ID,
                fragmentCount
            );
            saveSkillProgress(gamePlayerData);
            this.shopMessage = result.message;
            this.build('商店');
        });

        const upgradeButtonNode = this.createPanel(
            skillCard,
            'UpgradeNormalAttack',
            205,
            58,
            112,
            -85,
            isSkillMax
                ? new Color(54, 58, 68)
                : new Color(91, 57, 120)
        );
        const upgradeLabel = this.createLabel(
            upgradeButtonNode,
            'Label',
            isSkillMax ? '已满级' : '碎片升级',
            0,
            0,
            20,
            isSkillMax ? new Color(145, 150, 160) : Color.WHITE
        );
        this.setLabelHitArea(upgradeLabel, 205, 58);
        if (!isSkillMax) {
            const upgradeButton = upgradeButtonNode.addComponent(Button);
            this.configureButton(upgradeButton);
            upgradeButtonNode.on(Button.EventType.CLICK, () => {
                const result = this.skillSystem.upgradeWithFragments(
                    NORMAL_ATTACK_SKILL_ID
                );
                saveSkillProgress(gamePlayerData);
                this.shopMessage = result.message;
                this.build('商店');
            });
        }

        this.createLabel(
            page,
            'ShopMessage',
            this.shopMessage || '抽取普攻碎片，满足需求后可永久提升技能等级。',
            0,
            -205,
            20,
            this.shopMessage
                ? new Color(235, 205, 120)
                : new Color(180, 185, 205)
        );
    }


    // =====================================================
    // 成就页面
    // =====================================================

    showAchievementPage(content: Node) {

        this.clearChildren(content);


        const page = this.createPanel(
            content,
            'AchievementPage',
            1220,
            500,
            0,
            40,
            new Color(27, 32, 48)
        );

        this.createLabel(
            page,
            'Title',
            '成就',
            0,
            220,
            34,
            Color.WHITE
        );


        // 四个成就
        const achievements = [
            { name: '初入仙途', desc: '达到 Lv.1', progress: '0 / 1' },
            { name: '初获神将', desc: '收集 1 名神将', progress: '0 / 1' },
            { name: '战力初成', desc: '战力达到 100', progress: '0 / 100' },
            { name: '财富积累', desc: '拥有 1000 金币', progress: '0 / 1000' }
        ];
        const achY = [145, 45, -55, -155];

        for (let i = 0; i < achievements.length; i++) {

            const a = achievements[i];

            const card = this.createPanel(
                page,
                'Ach_' + a.name,
                1120,
                90,
                0,
                achY[i],
                new Color(31, 36, 54)
            );

            this.createLabel(card, 'AchName', a.name, -440, 20, 26, Color.WHITE);
            this.createLabel(card, 'AchDesc', a.desc, -440, -20, 20, new Color(180, 185, 205));
            this.createLabel(card, 'AchProgress', a.progress, 230, 0, 24, Color.WHITE);
            this.createLabel(card, 'AchStatus', '未完成', 460, 0, 22, new Color(150, 150, 150));
        }
    }


    // =====================================================
    // 创建普通节点
    // =====================================================

    createNode(
        parent: Node,
        name: string,
        width: number,
        height: number
    ): Node {

        const node = new Node(name);

        parent.addChild(node);


        const transform = node.addComponent(
            UITransform
        );

        transform.setContentSize(
            width,
            height
        );

        transform.setAnchorPoint(
            0.5,
            0.5
        );


        return node;
    }


    // =====================================================
    // 创建面板
    // =====================================================

    createPanel(
        parent: Node,
        name: string,
        width: number,
        height: number,
        x: number,
        y: number,
        color: Color
    ): Node {

        const node = this.createNode(
            parent,
            name,
            width,
            height
        );


        node.setPosition(
            x,
            y,
            0
        );

        node.addComponent(Graphics);
        this.redrawPanel(node, color, false);


        return node;
    }


    private redrawPanel(node: Node, color: Color, highlighted: boolean): void {

        const transform = node.getComponent(UITransform);
        const graphics = node.getComponent(Graphics);

        if (!transform || !graphics) {
            return;
        }

        const width = transform.contentSize.width;
        const height = transform.contentSize.height;

        graphics.clear();

        if (node.name === 'AtmosphereTint') {
            graphics.fillColor = color;
            graphics.rect(-width / 2, -height / 2, width, height);
            graphics.fill();
            return;
        }

        const radius = Math.min(18, Math.max(8, height * 0.18));
        const fillAlpha = color.a < 255
            ? color.a
            : height > 120 ? 222 : 244;

        // 向下的柔和投影让面板从背景中分离出来。
        graphics.fillColor = new Color(2, 7, 18, height > 120 ? 78 : 115);
        graphics.roundRect(
            -width / 2 + 2,
            -height / 2 - 4,
            width - 4,
            height,
            radius
        );
        graphics.fill();

        graphics.fillColor = new Color(color.r, color.g, color.b, fillAlpha);
        graphics.roundRect(
            -width / 2,
            -height / 2,
            width,
            height,
            radius
        );
        graphics.fill();

        graphics.strokeColor = highlighted
            ? new Color(224, 188, 101, 230)
            : new Color(114, 145, 176, height > 120 ? 105 : 150);
        graphics.lineWidth = highlighted ? 2.4 : 1.2;
        graphics.roundRect(
            -width / 2 + 1,
            -height / 2 + 1,
            width - 2,
            height - 2,
            Math.max(7, radius - 1)
        );
        graphics.stroke();

        // 面板上沿的短高光使用国风牌匾式收口。
        if (width > 180) {
            graphics.strokeColor = highlighted
                ? new Color(248, 218, 147, 205)
                : new Color(137, 199, 215, 80);
            graphics.lineWidth = 1;
            graphics.moveTo(-Math.min(width * 0.28, 170), height / 2 - 4);
            graphics.lineTo(Math.min(width * 0.28, 170), height / 2 - 4);
            graphics.stroke();
        }
    }


    private createSprite(
        parent: Node,
        name: string,
        frameKey: string,
        width: number,
        height: number,
        x: number,
        y: number
    ): Node | null {

        const spriteFrame = this.artFrames.get(frameKey);
        if (!spriteFrame) {
            return null;
        }

        const node = this.createNode(parent, name, width, height);
        node.setPosition(x, y, 0);

        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = spriteFrame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.trim = false;

        // 设置 SpriteFrame 时 Cocos 会先把节点恢复为贴图原始尺寸。
        // 必须在绑定贴图之后重新指定显示尺寸，避免导航图标撑出按钮。
        const transform = node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(width, height);
        }

        return node;
    }


    private configureButton(button: Button): void {
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.94;
        button.duration = 0.08;
    }


    private createStatusOrb(
        parent: Node,
        x: number,
        y: number,
        color: Color,
        text: string,
        radius = 20
    ): Node {

        const orb = this.createNode(parent, `${text}Orb`, radius * 2, radius * 2);
        orb.setPosition(x, y, 0);

        const graphics = orb.addComponent(Graphics);
        graphics.fillColor = new Color(6, 16, 33, 245);
        graphics.circle(0, 0, radius);
        graphics.fill();
        graphics.strokeColor = new Color(color.r, color.g, color.b, 220);
        graphics.lineWidth = 2;
        graphics.circle(0, 0, radius - 1);
        graphics.stroke();
        graphics.fillColor = new Color(color.r, color.g, color.b, 72);
        graphics.circle(0, 0, radius - 5);
        graphics.fill();

        this.createLabel(
            orb,
            'Glyph',
            text,
            0,
            0,
            Math.max(12, radius - 3),
            new Color(245, 237, 207)
        );

        return orb;
    }


    private drawFactionCore(core: Node): void {

        const graphics = core.addComponent(Graphics);

        graphics.fillColor = new Color(10, 24, 46, 224);
        graphics.circle(0, 0, 108);
        graphics.fill();

        graphics.strokeColor = new Color(208, 176, 93, 170);
        graphics.lineWidth = 2;
        graphics.circle(0, 0, 108);
        graphics.stroke();

        graphics.strokeColor = new Color(83, 188, 215, 145);
        graphics.lineWidth = 1.5;
        graphics.circle(0, 0, 88);
        graphics.stroke();
        graphics.circle(0, 0, 72);
        graphics.stroke();

        // 三个能量节点对应战神、雷部、天王。
        this.createStatusOrb(core, -88, 55, new Color(221, 111, 79), '战', 17);
        this.createStatusOrb(core, 88, 55, new Color(90, 181, 246), '雷', 17);
        this.createStatusOrb(core, 0, -102, new Color(96, 205, 153), '王', 17);

        const star = this.createLabel(
            core,
            'CoreStar',
            '✦',
            0,
            72,
            32,
            new Color(238, 205, 122)
        );
        this.setLabelHitArea(star, 60, 50);
    }


    // =====================================================
    // 创建文字
    // =====================================================

    createLabel(
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


        const transform = node.addComponent(
            UITransform
        );


        transform.setContentSize(
            500,
            80
        );


        transform.setAnchorPoint(
            0.5,
            0.5
        );


        node.setPosition(
            x,
            y,
            0
        );


        const label = node.addComponent(
            Label
        );


        label.string = text;

        label.fontSize = fontSize;

        label.lineHeight =
            fontSize + 8;

        label.color = color;

        label.horizontalAlign =
            Label.HorizontalAlign.CENTER;

        label.verticalAlign =
            Label.VerticalAlign.CENTER;


        return label;
    }


    // =====================================================
    // 让文字节点的命中区域与按钮一致，避免文字拦截相邻按钮。
    // =====================================================

    private setLabelHitArea(label: Label, width: number, height: number): void {

        const transform = label.node.getComponent(UITransform);

        if (transform) {
            transform.setContentSize(width, height);
        }
    }


    // =====================================================
    // 创建羁绊进度
    // =====================================================

    createFactionProgress(
        parent: Node,
        name: string,
        progress: string,
        x: number,
        y: number
    ) {

        const branchColor = name === '战神'
            ? new Color(218, 105, 76)
            : name === '雷部'
                ? new Color(82, 170, 239)
                : new Color(86, 193, 139);

        const row = this.createPanel(
            parent,
            `${name}ProgressRow`,
            220,
            52,
            x,
            y,
            new Color(22, 38, 62, 218)
        );

        this.createStatusOrb(row, -86, 0, branchColor, name.slice(0, 1), 15);

        this.createLabel(
            row,
            name + 'Name',
            name,
            -38,
            0,
            20,
            new Color(231, 232, 225)
        );


        this.createLabel(
            row,
            name + 'Progress',
            progress,
            66,
            0,
            18,
            new Color(branchColor.r, branchColor.g, branchColor.b)
        );
    }


    // =====================================================
    // 创建分割线
    // =====================================================

    createLine(
        parent: Node,
        x: number,
        y: number,
        width: number,
        color: Color
    ) {

        const node = new Node(
            'Line'
        );

        parent.addChild(node);


        node.setPosition(
            x,
            y,
            0
        );


        const graphics =
            node.addComponent(
                Graphics
            );


        graphics.strokeColor =
            color;

        graphics.lineWidth = 2;


        graphics.moveTo(
            -width / 2,
            0
        );

        graphics.lineTo(
            width / 2,
            0
        );


        graphics.stroke();
    }


    // =====================================================
    // 清理旧 UI
    // =====================================================

    clearChildren(node: Node) {

        const children =
            [...node.children];


        for (const child of children) {

            child.removeFromParent();

            child.destroy();
        }
    }
}
