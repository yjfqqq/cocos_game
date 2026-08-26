import { BattleRunData } from '../assets/scripts/main/BattleRunData';
import {
    createBattleBuildRuntime,
    DEFAULT_BATTLE_BUILD
} from '../assets/scripts/main/GameData/BattleBuildData';
import {
    gamePlayerData,
    getOrCreatePlayerSkillState
} from '../assets/scripts/main/GameData/PlayerData';
import {
    getBattleNormalAttackRuntimeConfig,
    NORMAL_ATTACK_SKILL_ID
} from '../assets/scripts/main/GameData/SkillData';
import { BondGrowthSystem } from '../assets/scripts/main/Systems/BondGrowthSystem';
import { UpgradeCardGenerator } from '../assets/scripts/main/Systems/UpgradeCardGenerator';
import { UpgradeManager } from '../assets/scripts/main/Systems/UpgradeManager';


function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}


function candidateIds(metaLevel: number, ranks: Record<string, number>): string[] {
    const runtime = createBattleBuildRuntime(DEFAULT_BATTLE_BUILD);
    runtime.skillMetaLevels[NORMAL_ATTACK_SKILL_ID] = metaLevel;
    runtime.skillUpgradeLevels[NORMAL_ATTACK_SKILL_ID] = { ...ranks };
    return new UpgradeCardGenerator(runtime, () => 0.37)
        .generateUpgradeCards(99, 'skill')
        .map((card) => card.upgradeId ?? '');
}


function acquireCard(system: BondGrowthSystem, cardId: string): void {
    system.addSpiritStones(10000);
    for (let attempt = 0; attempt < 40; attempt++) {
        const draw = system.drawChoices();
        assert(draw.success, `抽卡失败：${cardId}`);
        const target = draw.choices.find((choice) => choice.id === cardId);
        const selected = target ?? draw.choices[0];
        assert(Boolean(selected), '抽卡候选为空');
        const selection = system.selectCard(selected.id);
        assert(selection.success, `选择羁绊卡失败：${selected.id}`);
        if (selected.id === cardId) {
            return;
        }
    }
    throw new Error(`限定次数内未获得目标羁绊卡：${cardId}`);
}


// Test 1：局外Lv1不能出现任何核心节点。
const meta1 = candidateIds(1, {
    'strong-hit-1': 1,
    'strong-hit-2': 1,
    'multishot-1': 1,
    'multishot-2': 1,
    'haste-1': 1,
    'haste-2': 1
});
assert(meta1.indexOf('penetration') < 0, 'Lv1错误出现Lv3穿透');
assert(meta1.indexOf('split') < 0, 'Lv1错误出现Lv6分裂');
assert(meta1.indexOf('tracking') < 0, 'Lv1错误出现Lv9追踪');
assert(meta1.indexOf('awakening') < 0, 'Lv1错误出现Lv10觉醒');

// Test 2：局外Lv3满足前置后只开放穿透。
const meta3 = candidateIds(3, {
    'strong-hit-1': 1,
    'strong-hit-2': 1,
    'multishot-1': 1,
    'multishot-2': 1,
    'haste-1': 1,
    'haste-2': 1
});
assert(meta3.indexOf('penetration') >= 0, 'Lv3满足前置后未出现穿透');
assert(meta3.indexOf('split') < 0, 'Lv3错误出现Lv6分裂');
assert(meta3.indexOf('tracking') < 0, 'Lv3错误出现Lv9追踪');
assert(meta3.indexOf('awakening') < 0, 'Lv3错误出现Lv10觉醒');

// Test 3：局外Lv10但没有局内前置时，高级核心仍不可出现。
const meta10WithoutPrerequisites = candidateIds(10, {});
assert(
    !meta10WithoutPrerequisites.some((id) => {
        return ['penetration', 'split', 'tracking', 'awakening'].indexOf(id) >= 0;
    }),
    'Lv10在缺少前置时提前出现核心节点'
);

// Test 4：核心节点按3→6→9→10逐步开放。
const progressionRanks: Record<string, number> = {
    'strong-hit-1': 1,
    'strong-hit-2': 1,
    'multishot-1': 1,
    'multishot-2': 1,
    'haste-1': 1,
    'haste-2': 1
};
assert(candidateIds(10, progressionRanks).indexOf('penetration') >= 0, '穿透未开放');
progressionRanks.penetration = 1;
assert(candidateIds(10, progressionRanks).indexOf('split') >= 0, '分裂未开放');
progressionRanks.split = 1;
assert(candidateIds(10, progressionRanks).indexOf('tracking') >= 0, '追踪未开放');
progressionRanks.tracking = 1;
assert(candidateIds(10, progressionRanks).indexOf('awakening') >= 0, '觉醒未开放');
const finalConfig = getBattleNormalAttackRuntimeConfig({
    ...progressionRanks,
    awakening: 1
});
assert(finalConfig.penetrationTargets === 1, '穿透未进入战斗配置');
assert(finalConfig.splitExtraAttacks === 2, '追踪分裂未进入战斗配置');
assert(finalConfig.awakeningMaxTargets === 5, '觉醒未进入战斗配置');

// Test 5：连续升到Lv20只产生10次配置节点技能选择。
const levelRuntime = createBattleBuildRuntime(DEFAULT_BATTLE_BUILD);
const runData = new BattleRunData({ hp: 100, atk: 10, def: 5, crit: 5, power: 275 });
const manager = new UpgradeManager(runData, levelRuntime);
manager.addExp(100000);
assert(runData.level === 20, '角色没有在配置上限Lv20停止');
assert(manager.getPendingLevelUps() === 10, 'Lv1→20技能选择次数不是10次');

// 5任务经验节奏配置目标：约Lv6 / 10 / 14 / 18 / 20。
const pacingRuntime = createBattleBuildRuntime(DEFAULT_BATTLE_BUILD);
const pacingRun = new BattleRunData({
    hp: 100, atk: 10, def: 5, crit: 5, power: 275
});
const pacingManager = new UpgradeManager(pacingRun, pacingRuntime);
const taskExpTotals = [350, 576, 975, 1540, 1030];
const expectedTaskLevels = [6, 10, 14, 18, 20];
for (let index = 0; index < taskExpTotals.length; index++) {
    pacingManager.addExp(taskExpTotals[index]);
    assert(
        pacingRun.level === expectedTaskLevels[index],
        `任务${index + 1}等级节奏错误：Lv${pacingRun.level}`
    );
}

// Test 6：角色升级不会给羁绊资源或自动产生羁绊选择。
const isolatedBond = new BondGrowthSystem(() => 0.5);
assert(isolatedBond.getSpiritStones() === 0, '角色升级前羁绊资源不为0');
manager.addExp(1000);
assert(isolatedBond.getSpiritStones() === 0, '角色升级错误发放灵石');
assert(isolatedBond.getCardDescriptions().length === 0, '角色升级错误获得羁绊卡');

// Test 7：灵石主动抽卡会扣费、生成三选一并可选择。
const drawSystem = new BondGrowthSystem(() => 0);
drawSystem.addSpiritStones(100);
const draw = drawSystem.drawChoices();
assert(draw.success && draw.choices.length === 3, '灵石抽卡未生成三选一');
assert(drawSystem.getSpiritStones() === 80, '首次抽卡未正确扣除20灵石');
assert(drawSystem.selectCard(draw.choices[0].id).success, '羁绊卡选择失败');

// Test 8：商会卡真实影响抽卡费用和后续资源收益。
const merchantSystem = new BondGrowthSystem(() => 0.43);
acquireCard(merchantSystem, 'merchant-bargain');
acquireCard(merchantSystem, 'merchant-small-business');
assert(merchantSystem.getDrawCost() < 150, '讨价还价未降低后续抽卡费用');
const merchantGain = merchantSystem.addSpiritStones(100, true);
assert(merchantGain.amount > 100, '小本经营未提高灵石收益');

// Test 9：连击羁绊由真实攻击累计Combo并触发追加攻击。
const comboSystem = new BondGrowthSystem(() => 0);
acquireCard(comboSystem, 'combo-pursuit');
let triggeredExtraAttack = false;
for (let index = 0; index < 30; index++) {
    const attack = comboSystem.recordNormalAttack(index * 0.5);
    triggeredExtraAttack = triggeredExtraAttack || attack.extraAttack;
}
assert(comboSystem.getMaxCombo() >= 30, '真实攻击未累计Combo');
assert(triggeredExtraAttack, '追击没有触发追加攻击');

// Test 10：新一局清空局内节点，局外技能等级仍保留。
const persistentSkill = getOrCreatePlayerSkillState(
    gamePlayerData,
    NORMAL_ATTACK_SKILL_ID
);
const originalMetaLevel = persistentSkill.level;
persistentSkill.level = 9;
const freshRuntime = createBattleBuildRuntime(DEFAULT_BATTLE_BUILD);
freshRuntime.skillMetaLevels[NORMAL_ATTACK_SKILL_ID] = persistentSkill.level;
assert(
    Object.keys(freshRuntime.skillUpgradeLevels[NORMAL_ATTACK_SKILL_ID]).length === 0,
    '新一局没有清空局内技能节点'
);
assert(
    freshRuntime.skillMetaLevels[NORMAL_ATTACK_SKILL_ID] === 9,
    '新一局没有保留局外技能等级'
);
persistentSkill.level = originalMetaLevel;

// 额外节奏校准：10个固定随机种子的普通局平均抽数保持在18～22。
let totalEconomyDraws = 0;
const economyTasks = [
    { normal: 60, elite: 0, boss: 0 },
    { normal: 100, elite: 2, boss: 0 },
    { normal: 180, elite: 3, boss: 0 },
    { normal: 60, elite: 0, boss: 1 },
    { normal: 250, elite: 5, boss: 1 }
];
for (let seed = 1; seed <= 10; seed++) {
    let randomState = seed;
    const economy = new BondGrowthSystem(() => {
        randomState = (
            randomState * 1664525 + 1013904223
        ) >>> 0;
        return randomState / 4294967296;
    });
    let draws = 0;
    const drawWhileAffordable = (): void => {
        while (draws < 40) {
            const economyDraw = economy.drawChoices();
            if (!economyDraw.success) {
                break;
            }
            economy.selectCard(economyDraw.choices[0].id);
            draws++;
        }
    };
    for (let taskIndex = 0; taskIndex < economyTasks.length; taskIndex++) {
        const task = economyTasks[taskIndex];
        for (let index = 0; index < task.normal; index++) {
            economy.grantEnemyReward(false, false);
            drawWhileAffordable();
        }
        for (let index = 0; index < task.elite; index++) {
            economy.grantEnemyReward(true, false);
            drawWhileAffordable();
        }
        for (let index = 0; index < task.boss; index++) {
            economy.grantEnemyReward(false, true);
            drawWhileAffordable();
        }
        economy.grantTaskReward(taskIndex + 1);
        drawWhileAffordable();
    }
    totalEconomyDraws += draws;
}
const averageEconomyDraws = totalEconomyDraws / 10;
assert(
    averageEconomyDraws >= 18 && averageEconomyDraws <= 22,
    `羁绊抽卡节奏偏离目标：${averageEconomyDraws}`
);

console.log(
    `runtime growth assertions passed: 10/10; ` +
    `economy average ${averageEconomyDraws}`
);
