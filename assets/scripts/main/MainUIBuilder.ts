import {
    _decorator,
    Component,
    Node,
    UITransform,
    Label,
    Color,
    Graphics,
    Button,
    view,
    macro,
    ResolutionPolicy
} from 'cc';

import {
    playerData
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

const { ccclass } = _decorator;

@ccclass('MainUIBuilder')
export class MainUIBuilder extends Component {

    private buttonMap: Map<string, Node> = new Map();
    private activePage = '';

    private battleRoot: Node | null = null;
    private battleSystem: BattleSystem | null = null;

    private shopMessage = '';
    private bagMessage = '';
    private artifactMessage = '';

    start() {

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

        this.build();
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


        // =====================================================
        // 1. 顶部玩家信息栏
        // =====================================================

        const topBar = this.createPanel(
            main,
            'TopBar',
            1280,
            72,
            0,
            324,
            new Color(35, 41, 62)
        );

        // 顶部信息分组：避免所有文字挤在一行，突出战力与资源。
        this.createLabel(
            topBar,
            'PlayerName',
            `${playerData.name}`,
            -535,
            0,
            26,
            Color.WHITE
        );

        this.createLabel(
            topBar,
            'PlayerLevel',
            `Lv.${playerData.level}`,
            -390,
            0,
            24,
            new Color(205, 210, 225)
        );

        this.createLabel(
            topBar,
            'PlayerPower',
            `战力 ${playerData.power}`,
            -210,
            0,
            25,
            new Color(235, 205, 120)
        );

        this.createLine(
            topBar,
            30,
            0,
            1,
            new Color(75, 82, 105)
        );

        this.createLabel(
            topBar,
            'Gold',
            `金币 ${playerData.gold}`,
            390,
            0,
            23,
            Color.WHITE
        );

        this.createLabel(
            topBar,
            'Diamond',
            `◆ ${playerData.diamond}`,
            525,
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
        // 左侧流派面板
        // =====================================================

        const leftPanel = this.createPanel(
            homePage,
            'FactionPanel',
            260,
            500,
            -490,
            40,
            new Color(31, 36, 54)
        );

        this.createLabel(
            leftPanel,
            'FactionTitle',
            '当前流派',
            0,
            205,
            24,
            new Color(180, 185, 205)
        );

        this.createLabel(
            leftPanel,
            'FactionName',
            '天宫',
            0,
            155,
            42,
            Color.WHITE
        );


        // 分割线

        this.createLine(
            leftPanel,
            0,
            112,
            200,
            new Color(70, 76, 98)
        );


        // 流派进度

        this.createFactionProgress(
            leftPanel,
            '战神',
            '0 / 6',
            0,
            65
        );

        this.createFactionProgress(
            leftPanel,
            '雷部',
            '0 / 6',
            0,
            5
        );

        this.createFactionProgress(
            leftPanel,
            '天王',
            '0 / 6',
            0,
            -55
        );


        // =====================================================
        // 当前终极目标
        // =====================================================

        this.createLabel(
            leftPanel,
            'UltimateTitle',
            '终极路线',
            0,
            -125,
            20,
            new Color(180, 185, 205)
        );

        this.createLabel(
            leftPanel,
            'Ultimate',
            '天宫彩色技能',
            0,
            -165,
            24,
            new Color(235, 205, 120)
        );


        // =====================================================
        // 中间主区域
        // =====================================================

        const centerPanel = this.createPanel(
            homePage,
            'CenterPanel',
            960,
            500,
            140,
            40,
            new Color(27, 32, 48)
        );


        this.createLabel(
            centerPanel,
            'CenterTitle',
            '天宫 · 流派核心',
            0,
            210,
            28,
            Color.WHITE
        );

        this.createLabel(
            centerPanel,
            'CenterSubtitle',
            '修仙之路 · 从炼气期开始',
            0,
            178,
            16,
            new Color(145, 152, 175)
        );


        // =====================================================
        // 流派核心
        // =====================================================

        const core = this.createPanel(
            centerPanel,
            'FactionCore',
            280,
            280,
            0,
            20,
            new Color(48, 54, 78)
        );

        this.createLabel(
            core,
            'CoreTitle',
            '流派核心',
            0,
            25,
            30,
            Color.WHITE
        );

        this.createLabel(
            core,
            'CoreSubTitle',
            '收集神将 · 吞噬成长',
            0,
            -25,
            18,
            new Color(175, 180, 200)
        );

        this.createLabel(
            core,
            'CoreStatus',
            '尚未激活',
            0,
            -75,
            20,
            new Color(150, 155, 175)
        );


        // =====================================================
        // 提示
        // =====================================================

        this.createLabel(
            centerPanel,
            'Hint',
            '收集战神、雷部、天王神将，逐步解锁流派技能',
            0,
            -170,
            18,
            new Color(145, 150, 170)
        );


        // =====================================================
        // 开始战斗按钮
        // =====================================================

        const startBattleBtn = this.createPanel(
            homePage,
            'StartBattleButton',
            300,
            68,
            0,
            -222,
            new Color(67, 77, 110)
        );

        const startLabel = this.createLabel(
            startBattleBtn,
            'Label',
            '开始战斗',
            0,
            0,
            28,
            Color.WHITE
        );

        const startTf = startLabel.node.getComponent(UITransform);

        if (startTf) {
            startTf.setContentSize(300, 68);
        }

        const startBtn = startBattleBtn.addComponent(Button);
        startBtn.transition = Button.Transition.NONE;

        startBattleBtn.on(
            Button.EventType.CLICK,
            () => {
                this.enterBattle();
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
            1280,
            90,
            0,
            -315,
            new Color(39, 45, 66)
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
                150,
                68,
                startX + i * gap,
                0,
                new Color(48, 55, 80)
            );


            // =================================================
            // 按钮文字
            // =================================================

            const label = this.createLabel(
                button,
                'Label',
                name,
                0,
                0,
                22,
                Color.WHITE
            );

            // 文字命中区缩到和按钮一致，避免遮挡相邻按钮
            const labelTransform = label.node.getComponent(UITransform);

            if (labelTransform) {
                labelTransform.setContentSize(150, 68);
            }


            // =================================================
            // 点击事件
            //
            // 使用 Button 组件，保证真正可点击
            // =================================================

            const btn = button.addComponent(Button);
            btn.transition = Button.Transition.NONE;

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

            const g = node.getComponent(Graphics);

            if (g) {

                g.fillColor = (name === this.activePage)
                    ? new Color(78, 88, 126)
                    : new Color(48, 55, 80);
            }
        });
    }


    // =====================================================
    // 进入战斗
    // =====================================================

    private enterBattle() {

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
            () => this.exitBattle()
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
        this.createLabel(infoCard, 'Faction', `当前流派：${playerData.faction}`, 460, -10, 24, new Color(235, 205, 120));


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
            upgradeButtonComponent.transition = Button.Transition.NONE;
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
            useButtonComponent.transition = Button.Transition.NONE;
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


        // 商店商品。先提供一个完整的战斗资源闭环商品，
        // 其他类型会随神器、宝箱系统接入。
        const products = [
            {
                id: 'cultivation-pill',
                name: '修炼丹',
                desc: '背包使用后获得 50 经验',
                price: 20
            }
        ];
        const prodX = [0];

        for (let i = 0; i < products.length; i++) {

            const p = products[i];

            const card = this.createPanel(
                page,
                'Product_' + p.name,
                460,
                330,
                prodX[i],
                20,
                new Color(31, 36, 54)
            );

            this.createLabel(card, 'ProdName', p.name, 0, 130, 28, Color.WHITE);
            this.createLabel(card, 'ProdDesc', p.desc, 0, 80, 22, new Color(180, 185, 205));
            this.createLabel(card, 'ProdPrice', `价格：${p.price} 金币`, 0, 30, 24, new Color(235, 205, 120));

            // 购买按钮（真正的 Button）
            const buy = this.createPanel(
                card,
                'Buy_' + p.name,
                220,
                60,
                0,
                -90,
                new Color(52, 59, 84)
            );

            const buyLabel = this.createLabel(buy, 'Label', '购买', 0, 0, 24, Color.WHITE);
            const buyTf = buyLabel.node.getComponent(UITransform);

            if (buyTf) {
                buyTf.setContentSize(220, 60);
            }

            const buyBtn = buy.addComponent(Button);
            buyBtn.transition = Button.Transition.NONE;

            buy.on(
                Button.EventType.CLICK,
                () => {
                    const result = buyItem(p.id);
                    this.shopMessage = result.message;
                    this.build('商店');
                }
            );
        }

        this.createLabel(
            page,
            'ShopMessage',
            this.shopMessage || '战斗胜利可获得金币。',
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


        const graphics = node.addComponent(
            Graphics
        );


        graphics.fillColor = color;


        graphics.rect(
            -width / 2,
            -height / 2,
            width,
            height
        );


        graphics.fill();


        return node;
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
    // 创建流派进度
    // =====================================================

    createFactionProgress(
        parent: Node,
        name: string,
        progress: string,
        x: number,
        y: number
    ) {

        this.createLabel(
            parent,
            name + 'Name',
            name,
            x - 55,
            y,
            22,
            Color.WHITE
        );


        this.createLabel(
            parent,
            name + 'Progress',
            progress,
            x + 65,
            y,
            20,
            new Color(
                175,
                180,
                200
            )
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
