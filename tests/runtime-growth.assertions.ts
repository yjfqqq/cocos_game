import { BattleRunData } from '../assets/scripts/main/BattleRunData';
import {
    normalizeBattleBuildSelection
} from '../assets/scripts/main/GameData/BattleBuildData';
import { BOND_GROWTH_CONFIG } from '../assets/scripts/main/GameData/BondGrowthData';
import { FIRST_STAGE_TASKS } from '../assets/scripts/main/GameData/BattleTaskData';
import {
    THREE_KINGDOMS_BOND_ID,
    THREE_KINGDOMS_CONFIG,
    THREE_KINGDOMS_CORE_CARDS,
    THREE_KINGDOMS_EX_CARD,
    THREE_KINGDOMS_MATERIAL_CARDS,
    THREE_KINGDOMS_STARTER_CARD,
    THREE_KINGDOMS_UR_CARDS
} from '../assets/scripts/main/GameData/ThreeKingdomsCardData';
import type {
    ThreeKingdomsCardDefinition,
    ThreeKingdomsFactionId
} from '../assets/scripts/main/GameData/ThreeKingdomsCardData';
import { BondGrowthSystem } from '../assets/scripts/main/Systems/BondGrowthSystem';
import { BondSlotSystem } from '../assets/scripts/main/Systems/BondSlotSystem';
import { KillGrowthSystem } from '../assets/scripts/main/Systems/KillGrowthSystem';
import {
    ThreeKingdomsBondSystem
} from '../assets/scripts/main/Systems/ThreeKingdomsBondSystem';

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}

function close(actual: number, expected: number, message: string): void {
    assert(Math.abs(actual - expected) < 0.0001, `${message}: ${actual} !== ${expected}`);
}

function createRuntime(random: () => number = () => 0) {
    const run = new BattleRunData({ hp: 100, atk: 10, def: 5, crit: 5, power: 0 });
    const slots = new BondSlotSystem();
    const threeKingdoms = new ThreeKingdomsBondSystem(slots, run, random);
    const kills = new KillGrowthSystem(run, threeKingdoms);
    return { run, slots, threeKingdoms, kills };
}

function acquire(
    system: ThreeKingdomsBondSystem,
    cardId: string
): string {
    const result = system.acquireCard(cardId);
    assert(result.success, `${cardId} 获取失败：${result.message}`);
    return result.instanceId!;
}

function recordKills(system: ThreeKingdomsBondSystem, count: number): void {
    for (let index = 0; index < count; index++) system.recordKill();
}

function core(factionId: ThreeKingdomsFactionId): ThreeKingdomsCardDefinition {
    return THREE_KINGDOMS_CORE_CARDS.find((card) => {
        return card.factionId === factionId;
    })!;
}

function materials(
    factionId: ThreeKingdomsFactionId
): ThreeKingdomsCardDefinition[] {
    return THREE_KINGDOMS_MATERIAL_CARDS.filter((card) => {
        return card.factionId === factionId;
    });
}

function ur(factionId: ThreeKingdomsFactionId): ThreeKingdomsCardDefinition {
    return THREE_KINGDOMS_UR_CARDS.find((card) => {
        return card.factionId === factionId;
    })!;
}

function start(system: ThreeKingdomsBondSystem): void {
    acquire(system, THREE_KINGDOMS_STARTER_CARD.id);
}

function completeFaction(
    system: ThreeKingdomsBondSystem,
    factionId: ThreeKingdomsFactionId
): void {
    acquire(system, core(factionId).id);
    for (const material of materials(factionId).slice(0, 8)) {
        acquire(system, material.id);
        recordKills(system, THREE_KINGDOMS_CONFIG.coreConsumeKillInterval);
    }
}

// 普通武将与带称号的UR也不能指向同一人物，避免卡牌栏出现“同名进阶版”。
const allThreeKingdomsCards = [
    ...THREE_KINGDOMS_CORE_CARDS,
    ...THREE_KINGDOMS_MATERIAL_CARDS,
    ...THREE_KINGDOMS_UR_CARDS
];
const characterNames = allThreeKingdomsCards.map((card) => {
    const titleSeparator = card.name.lastIndexOf('·');
    return titleSeparator >= 0 ? card.name.slice(titleSeparator + 1) : card.name;
});
assert(
    new Set(characterNames).size === characterNames.length,
    '三国卡表存在重复武将名称'
);

// VIDEO-TG-1：材料获得后真实占格，不立即吞噬。
const materialFlow = createRuntime();
start(materialFlow.threeKingdoms);
acquire(materialFlow.threeKingdoms, core('wei').id);
const zhangLiao = materials('wei')[0];
acquire(materialFlow.threeKingdoms, zhangLiao.id);
assert(Boolean(materialFlow.slots.getByDefinitionId(zhangLiao.id)), 'VIDEO-TG-1 张辽没有进入卡牌栏');
assert(materialFlow.threeKingdoms.getConsumedCount('wei') === 0, 'VIDEO-TG-1 材料获得后立即增加吞噬进度');
assert(materialFlow.threeKingdoms.getCoreKillCounter('wei') === 0, 'VIDEO-TG-1 曹操初始击杀计数错误');

// VIDEO-TG-2：199杀不吞。
recordKills(materialFlow.threeKingdoms, 199);
assert(Boolean(materialFlow.slots.getByDefinitionId(zhangLiao.id)), 'VIDEO-TG-2 199杀提前吞卡');
assert(materialFlow.threeKingdoms.getConsumedCount('wei') === 0, 'VIDEO-TG-2 199杀提前增加进度');
assert(materialFlow.threeKingdoms.getCoreKillCounter('wei') === 199, 'VIDEO-TG-2 计数不是199');

// VIDEO-TG-3：第200杀随机吞一张当前魏国材料。
const occupiedBeforeCoreDevour = materialFlow.slots.getOccupied().length;
const coreDevour = materialFlow.threeKingdoms.recordKill();
assert(coreDevour.consumed, 'VIDEO-TG-3 第200杀没有吞卡');
assert(!materialFlow.slots.getByDefinitionId(zhangLiao.id), 'VIDEO-TG-3 张辽未被移除');
assert(materialFlow.slots.getOccupied().length === occupiedBeforeCoreDevour - 1, 'VIDEO-TG-3 未释放卡槽');
assert(materialFlow.threeKingdoms.getConsumedCount('wei') === 1, 'VIDEO-TG-3 吞噬进度未+1');
assert(materialFlow.threeKingdoms.getCoreKillCounter('wei') === 0, 'VIDEO-TG-3 200杀后计数未归零');
assert(materialFlow.run.atk === 60, 'VIDEO-TG-3 被吞材料的持有型属性没有移除');

// VIDEO-TG-4：曹操只能吞魏材料，不能吞蜀材料或自己。
const factionFilter = createRuntime();
start(factionFilter.threeKingdoms);
acquire(factionFilter.threeKingdoms, core('wei').id);
const weiCandidate = materials('wei')[0];
const shuCandidate = materials('shu')[1];
acquire(factionFilter.threeKingdoms, weiCandidate.id);
assert(Boolean(factionFilter.slots.addCard(shuCandidate)), 'VIDEO-TG-4 测试卡加入失败');
recordKills(factionFilter.threeKingdoms, 200);
assert(!factionFilter.slots.getByDefinitionId(weiCandidate.id), 'VIDEO-TG-4 没有吞魏国材料');
assert(Boolean(factionFilter.slots.getByDefinitionId(shuCandidate.id)), 'VIDEO-TG-4 错吞蜀国材料');
assert(Boolean(factionFilter.slots.getByDefinitionId(core('wei').id)), 'VIDEO-TG-4 错吞曹操');

// VIDEO-TG-5：四主公独立计数，后获得的曹操不继承此前100杀。
const independentCounters = createRuntime();
start(independentCounters.threeKingdoms);
acquire(independentCounters.threeKingdoms, core('shu').id);
const shuMaterial = materials('shu')[0];
acquire(independentCounters.threeKingdoms, shuMaterial.id);
recordKills(independentCounters.threeKingdoms, 100);
acquire(independentCounters.threeKingdoms, core('wei').id);
recordKills(independentCounters.threeKingdoms, 100);
assert(!independentCounters.slots.getByDefinitionId(shuMaterial.id), 'VIDEO-TG-5 刘备200杀未触发');
assert(independentCounters.threeKingdoms.getCoreKillCounter('shu') === 0, 'VIDEO-TG-5 刘备计数未归零');
assert(independentCounters.threeKingdoms.getCoreKillCounter('wei') === 100, 'VIDEO-TG-5 曹操继承了获得前击杀');

// VIDEO-TG-6：第8吞新增UR实例，主公保留且不发生原槽进化。
const urAddition = createRuntime();
start(urAddition.threeKingdoms);
const liuBeiInstance = acquire(urAddition.threeKingdoms, core('shu').id);
const shuMaterials = materials('shu');
for (const material of shuMaterials.slice(0, 7)) {
    acquire(urAddition.threeKingdoms, material.id);
    recordKills(urAddition.threeKingdoms, 200);
}
assert(urAddition.threeKingdoms.getConsumedCount('shu') === 7, 'VIDEO-TG-6 第7吞进度错误');
assert(!urAddition.slots.getByDefinitionId(ur('shu').id), 'VIDEO-TG-6 第7吞提前获得UR赵云');

// VIDEO-TG-7：吞8前UR不在普通候选或三选一。
assert(!urAddition.threeKingdoms.getAvailableCards().some((card) => card.role === 'evolution'), 'VIDEO-TG-7 UR提前进入动态候选池');
const urDraws = new BondGrowthSystem(
    () => 0.37,
    () => urAddition.threeKingdoms.getAvailableCards()
);
urDraws.addSpiritStones(1000000);
const firstUrCheckDraw = urDraws.drawChoices();
assert(firstUrCheckDraw.success, 'VIDEO-TG-7 普通抽卡失败');
assert(!firstUrCheckDraw.choices.some((choice) => choice.rarity === 'UR'), 'VIDEO-TG-7 普通抽卡出现UR');
for (let index = 0; index < 5; index++) {
    const refresh = urDraws.refreshChoices();
    assert(refresh.success, 'VIDEO-TG-7 刷新失败');
    assert(!refresh.choices.some((choice) => choice.rarity === 'UR'), 'VIDEO-TG-7 刷新出现UR');
}

const eighthShuMaterial = shuMaterials[7];
acquire(urAddition.threeKingdoms, eighthShuMaterial.id);
recordKills(urAddition.threeKingdoms, 200);
const liuBeiAfterUr = urAddition.slots.getByDefinitionId(core('shu').id);
const zhaoYunUr = urAddition.slots.getByDefinitionId(ur('shu').id);
assert(!urAddition.slots.getByDefinitionId(eighthShuMaterial.id), 'VIDEO-TG-6 第8张材料未移除');
assert(liuBeiAfterUr?.instanceId === liuBeiInstance, 'VIDEO-TG-6 刘备被替换或移除');
assert(Boolean(zhaoYunUr), 'VIDEO-TG-6 UR赵云没有加入卡牌栏');
assert(zhaoYunUr?.instanceId !== liuBeiInstance, 'VIDEO-TG-6 UR错误复用SSR原实例');

// VIDEO-TG-8：乱世三国每30秒按当前5张三国卡增加RunGrowth三维。
const starterGrowth = createRuntime();
start(starterGrowth.threeKingdoms);
acquire(starterGrowth.threeKingdoms, core('wei').id);
acquire(starterGrowth.threeKingdoms, core('shu').id);
acquire(starterGrowth.threeKingdoms, materials('wei')[0].id);
acquire(starterGrowth.threeKingdoms, materials('shu')[0].id);
starterGrowth.threeKingdoms.update(29.9);
close(starterGrowth.run.getRunGrowth().strength, 0, 'VIDEO-TG-8 29.9秒提前成长');
starterGrowth.threeKingdoms.update(0.1);
close(starterGrowth.run.getRunGrowth().strength, 5, 'VIDEO-TG-8 力量成长错误');
close(starterGrowth.run.getRunGrowth().agility, 5, 'VIDEO-TG-8 敏捷成长错误');
close(starterGrowth.run.getRunGrowth().intelligence, 5, 'VIDEO-TG-8 智力成长错误');

// VIDEO-TG-9：第三张UR加入时清空全部三国卡、关闭卡池，只留下EX。
const exCompletion = createRuntime(() => 0);
start(exCompletion.threeKingdoms);
completeFaction(exCompletion.threeKingdoms, 'wei');
completeFaction(exCompletion.threeKingdoms, 'shu');
assert(exCompletion.threeKingdoms.getCompletedUrCount() === 2, 'VIDEO-TG-9 两阵营UR计数错误');
assert(!exCompletion.threeKingdoms.isExActive(), 'VIDEO-TG-9 两张UR提前生成EX');
completeFaction(exCompletion.threeKingdoms, 'wu');
assert(exCompletion.threeKingdoms.isExActive(), 'VIDEO-TG-9 第三张UR未生成EX');
assert(exCompletion.threeKingdoms.isThreeKingdomsClosed(), 'VIDEO-TG-9 三国候选池未关闭');
assert(exCompletion.threeKingdoms.getAvailableCards().length === 0, 'VIDEO-TG-9 关闭后仍有三国候选');
assert(exCompletion.slots.getOccupied().length === 1, 'VIDEO-TG-9 旧三国卡没有全部清空');
assert(Boolean(exCompletion.slots.getByDefinitionId(THREE_KINGDOMS_EX_CARD.id)), 'VIDEO-TG-9 吞食天地未加入卡牌栏');
assert(exCompletion.threeKingdoms.getActiveUrFactions().length === 0, 'VIDEO-TG-9 UR仍留在卡牌栏');
const exStats = exCompletion.run.getFinalCombatStats();
close(exStats.strength, 600, 'VIDEO-TG-9 EX力量属性错误');
close(exStats.agility, 600, 'VIDEO-TG-9 EX敏捷属性错误');
close(exStats.intelligence, 600, 'VIDEO-TG-9 EX智力属性错误');
const growthBeforeClosedUpdate = exCompletion.run.getRunGrowth().strength;
exCompletion.threeKingdoms.update(60);
close(exCompletion.run.getRunGrowth().strength, growthBeforeClosedUpdate, 'VIDEO-TG-9 EX后启动卡仍在成长');

// VIDEO-TG-10：EX 399杀不吞，第400杀吞非EX卡并提高三维1%。
const exFood = materials('qun')[0];
assert(Boolean(exCompletion.slots.addCard(exFood)), 'VIDEO-TG-10 测试吞噬卡加入失败');
const strengthBeforeExDevour = exCompletion.run.strength;
recordKills(exCompletion.threeKingdoms, 399);
assert(Boolean(exCompletion.slots.getByDefinitionId(exFood.id)), 'VIDEO-TG-10 399杀提前吞卡');
const exDevour = exCompletion.threeKingdoms.recordKill();
assert(exDevour.consumed, 'VIDEO-TG-10 第400杀未吞卡');
assert(!exCompletion.slots.getByDefinitionId(exFood.id), 'VIDEO-TG-10 被吞卡仍在卡槽');
assert(Boolean(exCompletion.slots.getByDefinitionId(THREE_KINGDOMS_EX_CARD.id)), 'VIDEO-TG-10 EX吞掉自己');
assert(exCompletion.threeKingdoms.getExConsumedCount() === 1, 'VIDEO-TG-10 EX吞噬计数错误');
assert(exCompletion.run.strength > strengthBeforeExDevour, 'VIDEO-TG-10 力量增幅未+1%');
close(exCompletion.run.getFinalCombatStats().strength, 605, 'VIDEO-TG-10 EX三维增幅值错误');

// VIDEO-TG-11：材料持续占10格，满格不能再获得；200杀吞卡后才恢复。
const slotPressure = createRuntime();
start(slotPressure.threeKingdoms);
acquire(slotPressure.threeKingdoms, core('wei').id);
for (let index = 0; index < 8; index++) {
    acquire(slotPressure.threeKingdoms, materials('wei')[index].id);
}
assert(slotPressure.slots.getOccupied().length === 10, 'VIDEO-TG-11 材料没有占满10格');
const fullAcquire = slotPressure.threeKingdoms.acquireCard(materials('wei')[8].id);
assert(!fullAcquire.success, 'VIDEO-TG-11 满10格仍能获得新卡');
recordKills(slotPressure.threeKingdoms, 200);
assert(slotPressure.slots.getOccupied().length === 9, 'VIDEO-TG-11 200杀未释放卡位');
assert(slotPressure.threeKingdoms.acquireCard(materials('wei')[8].id).success, 'VIDEO-TG-11 释放卡位后仍不能获得材料');

// 未确认项采用保守策略：空目标浪费触发；重复定义在当前配置下不重复计数。
const conservativeRules = createRuntime();
start(conservativeRules.threeKingdoms);
acquire(conservativeRules.threeKingdoms, core('wei').id);
recordKills(conservativeRules.threeKingdoms, 200);
assert(conservativeRules.threeKingdoms.getCoreKillCounter('wei') === 0, '空目标触发被错误保存');
assert(conservativeRules.threeKingdoms.getConsumedCount('wei') === 0, '空目标错误增加进度');
const duplicateMaterial = materials('wei')[0];
acquire(conservativeRules.threeKingdoms, duplicateMaterial.id);
recordKills(conservativeRules.threeKingdoms, 200);
assert(
    !conservativeRules.threeKingdoms.getAvailableCards().some((card) => {
        return card.id === duplicateMaterial.id;
    }),
    '已吞过的同名材料仍污染候选池'
);
assert(Boolean(conservativeRules.slots.addCard(duplicateMaterial)), '重复材料测试卡加入失败');
recordKills(conservativeRules.threeKingdoms, 200);
assert(conservativeRules.threeKingdoms.getConsumedMaterialIds('wei').length === 2, '重复材料没有真实吞掉两张');
assert(conservativeRules.threeKingdoms.getConsumedCount('wei') === 1, '当前配置错误重复计算同名材料');

// UR击杀成长继续保留，但3UR清卡后不再继续获得新成长。
const urGrowth = createRuntime();
start(urGrowth.threeKingdoms);
completeFaction(urGrowth.threeKingdoms, 'wei');
const intelligenceBeforeUrKill = urGrowth.run.intelligence;
urGrowth.kills.recordKill();
close(urGrowth.run.getRunGrowth().intelligence, 0.3, '魏UR击杀成长未写入RunGrowth');
assert(urGrowth.run.intelligence > intelligenceBeforeUrKill, '魏UR击杀成长未生效');

// 既有属性计算回归。
const stats = new BattleRunData({ hp: 100, atk: 100, def: 10, crit: 5, power: 0 });
stats.registerStatModifier('strength-card', { strength: 100 });
stats.registerStatModifier('agility-card', { agility: 100 });
stats.registerStatModifier('intelligence-card', { intelligence: 100 });
stats.registerStatModifier('all-card', { allStats: 50 });
close(stats.strength, 150, 'STAT 力量/全属性错误');
close(stats.agility, 150, 'STAT 敏捷/全属性错误');
close(stats.intelligence, 150, 'STAT 智力/全属性错误');
stats.registerStatModifier('all-percent', { allStatsPercent: 1 });
close(stats.strength, 151.5, 'STAT 全属性增幅错误');

// 数据对表与旧存档迁移回归。
assert(THREE_KINGDOMS_CONFIG.coreConsumeKillInterval === 200, '主公吞噬间隔不是200杀');
assert(THREE_KINGDOMS_CONFIG.starterGrowthInterval === 30, '启动卡成长间隔不是30秒');
assert(THREE_KINGDOMS_STARTER_CARD.name === '乱世三国', '启动卡名称错误');
assert(THREE_KINGDOMS_EX_CARD.name === '吞食天地', 'EX名称错误');
assert(
    1 + THREE_KINGDOMS_CORE_CARDS.length +
    THREE_KINGDOMS_MATERIAL_CARDS.length +
    THREE_KINGDOMS_UR_CARDS.length + 1 === 50,
    '三国卡定义总数不是50'
);
assert(
    normalizeBattleBuildSelection({
        selectedSkillIds: [],
        selectedBondIds: ['tiangong']
    }).selectedBondIds[0] === THREE_KINGDOMS_BOND_ID,
    '旧天宫存档没有迁移到三国羁绊'
);

// 第一关平衡：稳定怪量覆盖三阵营8次200杀，并提供足够的构筑经济。
const guaranteedStageKills = FIRST_STAGE_TASKS
    .filter((task) => task.kind !== 'vanguard-boss')
    .reduce((sum, task) => sum + task.killTarget, 0);
assert(guaranteedStageKills === 2150, '第一关稳定怪物总数不是2150');
assert(
    guaranteedStageKills >=
        THREE_KINGDOMS_CONFIG.coreConsumeKillInterval *
        THREE_KINGDOMS_CONFIG.materialsRequiredForUr,
    '第一关怪量不足以让并行三主公完成8吞'
);
assert(
    BOND_GROWTH_CONFIG.initialSpiritStones >=
        BOND_GROWTH_CONFIG.drawCosts.slice(0, 4)
            .reduce((sum, cost) => sum + cost, 0),
    '开局灵石不足以完成启动卡和三张主公选择'
);

let totalAffordableDraws = 0;
const eliteCount = FIRST_STAGE_TASKS.reduce((sum, task) => {
    return sum + task.eliteSpawnKillThresholds.length;
}, 0);
const normalCount = guaranteedStageKills - eliteCount;
for (let seed = 1; seed <= 20; seed++) {
    let state = seed;
    const economy = new BondGrowthSystem(() => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    });
    for (let index = 0; index < normalCount; index++) {
        economy.grantEnemyReward(false, false);
    }
    for (let index = 0; index < eliteCount; index++) {
        economy.grantEnemyReward(true, false);
    }
    economy.grantEnemyReward(false, true);
    economy.grantEnemyReward(false, true);
    for (const task of FIRST_STAGE_TASKS) economy.grantTaskReward(task.id);

    let draws = 0;
    while (draws < 200) {
        const draw = economy.drawChoices();
        if (!draw.success) break;
        economy.selectCard(draw.choices[0].id);
        draws++;
    }
    totalAffordableDraws += draws;
}
const averageAffordableDraws = totalAffordableDraws / 20;
assert(
    averageAffordableDraws >= 60,
    `平均可负担抽卡次数不足60：${averageAffordableDraws}`
);

console.log(
    `video three-kingdoms assertions passed: VIDEO-TG 11/11; ` +
    `stage kills ${guaranteedStageKills}; affordable draws ${averageAffordableDraws}`
);
