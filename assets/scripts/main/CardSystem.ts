import { RunStatBonus } from './BattleRunData';
import { BATTLE_BALANCE } from './BattleBalance';


export type CardCategory = '基础卡' | '神将卡';
export type GeneralQuality = '绿色' | '蓝色' | '紫色';
export type TiangongBranch = '战神' | '雷部' | '天王';

export interface CardChoice {
    id: string;
    name: string;
    description: string;
    category: CardCategory;
}

export interface CardSelectResult {
    success: boolean;
    message: string;
    bonus?: RunStatBonus;
}

export interface CardProgressResult {
    messages: string[];
    bonuses: RunStatBonus[];
}

interface BasicCardDefinition extends CardChoice {
    maxLevel: number;
    bonus: RunStatBonus;
}

interface GeneralDefinition {
    id: string;
    name: string;
    role: string;
    quality: GeneralQuality;
    branch: TiangongBranch;
    requiredKills: number;
}

interface GeneralState {
    definition: GeneralDefinition;
    kills: number;
}


const MAX_SKILL_SLOTS = 10;

const BASIC_CARDS: BasicCardDefinition[] = [
    {
        id: 'basic-attack',
        name: '攻击',
        description: '本局攻击 +2，升至 III 后释放槽位',
        category: '基础卡',
        maxLevel: 3,
        bonus: { atk: 2 }
    },
    {
        id: 'basic-health',
        name: '生命',
        description: '本局生命 +15，升至 III 后释放槽位',
        category: '基础卡',
        maxLevel: 3,
        bonus: { hp: 15 }
    },
    {
        id: 'basic-critical',
        name: '暴击',
        description: '本局暴击 +1%，升至 III 后释放槽位',
        category: '基础卡',
        maxLevel: 3,
        bonus: { crit: 1 }
    }
];

const GENERAL_DEFINITIONS: GeneralDefinition[] = [
    { id: 'nezha', name: '哪吒', role: '爆发攻击', quality: '绿色', branch: '战神', requiredKills: 10 },
    { id: 'juling', name: '巨灵神', role: '力量型战将', quality: '绿色', branch: '战神', requiredKills: 10 },
    { id: 'tianpeng', name: '天蓬元帅', role: '持续输出', quality: '绿色', branch: '战神', requiredKills: 10 },
    { id: 'yangjian', name: '杨戬', role: '暴击核心', quality: '蓝色', branch: '战神', requiredKills: 30 },
    { id: 'wanglingguan', name: '王灵官', role: '战斗强化', quality: '蓝色', branch: '战神', requiredKills: 30 },
    { id: 'zhenwu', name: '真武大帝', role: '战神核心', quality: '紫色', branch: '战神', requiredKills: 50 },

    { id: 'leigong', name: '雷公', role: '雷电基础', quality: '绿色', branch: '雷部', requiredKills: 10 },
    { id: 'dianmu', name: '电母', role: '雷电强化', quality: '绿色', branch: '雷部', requiredKills: 10 },
    { id: 'fengbo', name: '风伯', role: '范围扩散', quality: '绿色', branch: '雷部', requiredKills: 10 },
    { id: 'leizhenzi', name: '雷震子', role: '雷电爆发', quality: '蓝色', branch: '雷部', requiredKills: 30 },
    { id: 'wenzhong', name: '闻仲', role: '雷法统帅', quality: '蓝色', branch: '雷部', requiredKills: 30 },
    { id: 'puhuazun', name: '普化尊', role: '雷部核心', quality: '紫色', branch: '雷部', requiredKills: 50 },

    { id: 'zengzhang', name: '增长天王', role: '生命强化', quality: '绿色', branch: '天王', requiredKills: 10 },
    { id: 'guangmu', name: '广目天王', role: '防御强化', quality: '绿色', branch: '天王', requiredKills: 10 },
    { id: 'chiguo', name: '持国天王', role: '护盾强化', quality: '绿色', branch: '天王', requiredKills: 10 },
    { id: 'lijing', name: '李靖', role: '统帅防御', quality: '蓝色', branch: '天王', requiredKills: 30 },
    { id: 'duowen', name: '多闻天王', role: '坚韧提升', quality: '蓝色', branch: '天王', requiredKills: 30 },
    { id: 'zhaogongming', name: '赵公明', role: '天王核心', quality: '紫色', branch: '天王', requiredKills: 50 }
];

const RED_BONUSES: Record<TiangongBranch, RunStatBonus> = {
    战神: { attackPercent: 20, crit: 10, critDamagePercent: 30 },
    雷部: { attackSpeedPercent: 25, attackRangePercent: 20, skillDamagePercent: 20 },
    天王: { hpPercent: 30, defPercent: 25, healthRegenPercent: 50 }
};

const RAINBOW_TIAN_GONG_BONUS: RunStatBonus = {
    attackPercent: 20,
    attackSpeedPercent: 20,
    hpPercent: 20,
    crit: 10
};


export class BattleCardSystem {

    private basicLevels = new Map<string, number>();
    private activeGenerals = new Map<string, GeneralState>();
    private completedGenerals = new Set<string>();
    private redSkills = new Set<TiangongBranch>();
    private rainbowTiangong = false;
    private choiceCount = 0;


    getChoices(count = 3): CardChoice[] {

        const choices: CardChoice[] = [];
        const offerBasics =
            this.choiceCount % BATTLE_BALANCE.basicCardOfferEvery ===
            BATTLE_BALANCE.basicCardOfferEvery - 1;

        if (offerBasics) {
            choices.push(...this.getBasicChoices());
        } else {
            for (const branch of ['战神', '雷部', '天王'] as TiangongBranch[]) {
                const general = this.getNextGeneral(branch);
                if (general) {
                    choices.push(this.toGeneralChoice(general));
                }
            }
        }

        if (choices.length < count) {
            const fallback = [
                ...this.getBasicChoices(),
                ...GENERAL_DEFINITIONS
                    .filter((general) => this.canOfferGeneral(general))
                    .map((general) => this.toGeneralChoice(general))
            ];

            for (const choice of fallback) {
                if (choices.length >= count) {
                    break;
                }
                if (!choices.some((item) => item.id === choice.id)) {
                    choices.push(choice);
                }
            }
        }

        this.choiceCount++;
        return choices.slice(0, count);
    }


    selectCard(cardId: string): CardSelectResult {

        const basic = BASIC_CARDS.find((card) => card.id === cardId);
        if (basic) {
            return this.selectBasicCard(basic);
        }

        const general = GENERAL_DEFINITIONS.find((card) => card.id === cardId);
        if (general) {
            return this.selectGeneral(general);
        }

        return { success: false, message: '卡牌不存在' };
    }


    recordKill(): CardProgressResult {

        const messages: string[] = [];
        const bonuses: RunStatBonus[] = [];
        const completedThisKill: string[] = [];

        this.activeGenerals.forEach((state, id) => {
            state.kills++;

            if (state.kills >= state.definition.requiredKills) {
                completedThisKill.push(id);
                messages.push(
                    `${state.definition.quality}神将【${state.definition.name}】归位，释放技能槽！`
                );
            }
        });

        for (const id of completedThisKill) {
            this.activeGenerals.delete(id);
            this.completedGenerals.add(id);
        }

        for (const branch of ['战神', '雷部', '天王'] as TiangongBranch[]) {
            if (
                !this.rainbowTiangong &&
                !this.redSkills.has(branch) &&
                this.isBranchComplete(branch)
            ) {
                this.redSkills.add(branch);
                bonuses.push(RED_BONUSES[branch]);
                messages.push(`六名神将全部归位，合成红色【${branch}】！`);
            }
        }

        if (
            !this.rainbowTiangong &&
            this.redSkills.size === 3
        ) {
            this.rainbowTiangong = true;
            this.redSkills.clear();
            bonuses.push(RAINBOW_TIAN_GONG_BONUS);
            messages.push('战神、雷部、天王合一，彩色【天宫】降临！');
        }

        return { messages, bonuses };
    }


    getSlotDescriptions(): string[] {

        const slots: string[] = [];

        this.basicLevels.forEach((level, id) => {
            const card = BASIC_CARDS.find((item) => item.id === id);
            if (card && level < card.maxLevel) {
                slots.push(`${card.name} ${this.toRoman(level)}`);
            }
        });

        this.activeGenerals.forEach((state) => {
            slots.push(
                `${state.definition.name} ${state.kills}/${state.definition.requiredKills}`
            );
        });

        this.redSkills.forEach((branch) => slots.push(`红色·${branch}`));

        if (this.rainbowTiangong) {
            slots.push('彩色·天宫');
        }

        return slots;
    }


    getProgressText(): string {

        const parts = (['战神', '雷部', '天王'] as TiangongBranch[]).map((branch) => {
            const completed = GENERAL_DEFINITIONS.filter((general) => {
                return general.branch === branch && this.completedGenerals.has(general.id);
            }).length;
            return `${branch} ${completed}/6`;
        });

        return parts.join(' · ');
    }


    private getBasicChoices(): CardChoice[] {

        const usedSlots = this.getUsedSlotCount();

        return BASIC_CARDS
            .filter((card) => {
                const level = this.basicLevels.get(card.id) ?? 0;
                return level < card.maxLevel && (level > 0 || usedSlots < MAX_SKILL_SLOTS);
            })
            .map((card) => {
                const level = this.basicLevels.get(card.id) ?? 0;
                return {
                    id: card.id,
                    name: `${card.name} ${this.toRoman(level + 1)}`,
                    description: card.description,
                    category: card.category
                };
            });
    }


    private getNextGeneral(branch: TiangongBranch): GeneralDefinition | undefined {
        return GENERAL_DEFINITIONS.find((general) => {
            return general.branch === branch && this.canOfferGeneral(general);
        });
    }


    private canOfferGeneral(general: GeneralDefinition): boolean {
        return !this.rainbowTiangong &&
            !this.redSkills.has(general.branch) &&
            this.isQualityUnlocked(general) &&
            !this.activeGenerals.has(general.id) &&
            !this.completedGenerals.has(general.id) &&
            this.getUsedSlotCount() < MAX_SKILL_SLOTS;
    }


    // 卡池按品质逐层开放：
    // 3名绿色全部归位后才出现蓝色，2名蓝色全部归位后才出现紫色。
    private isQualityUnlocked(general: GeneralDefinition): boolean {

        if (general.quality === '绿色') {
            return true;
        }

        const greenComplete = GENERAL_DEFINITIONS
            .filter((item) => {
                return item.branch === general.branch && item.quality === '绿色';
            })
            .every((item) => this.completedGenerals.has(item.id));

        if (general.quality === '蓝色') {
            return greenComplete;
        }

        const blueComplete = GENERAL_DEFINITIONS
            .filter((item) => {
                return item.branch === general.branch && item.quality === '蓝色';
            })
            .every((item) => this.completedGenerals.has(item.id));

        return greenComplete && blueComplete;
    }


    private toGeneralChoice(general: GeneralDefinition): CardChoice {
        return {
            id: general.id,
            name: `${general.quality}·${general.name}`,
            description: `${general.role} · 击杀${general.requiredKills}个敌人后归位`,
            category: '神将卡'
        };
    }


    private selectBasicCard(card: BasicCardDefinition): CardSelectResult {

        const currentLevel = this.basicLevels.get(card.id) ?? 0;

        if (currentLevel >= card.maxLevel) {
            return { success: false, message: `${card.name}已经完成` };
        }
        if (currentLevel === 0 && this.getUsedSlotCount() >= MAX_SKILL_SLOTS) {
            return { success: false, message: '技能槽已满' };
        }

        const nextLevel = currentLevel + 1;
        this.basicLevels.set(card.id, nextLevel);

        return {
            success: true,
            message: nextLevel === card.maxLevel
                ? `${card.name} III 完成，释放技能槽！`
                : `获得 ${card.name} ${this.toRoman(nextLevel)}`,
            bonus: card.bonus
        };
    }


    private selectGeneral(general: GeneralDefinition): CardSelectResult {

        if (!this.canOfferGeneral(general)) {
            return { success: false, message: '该神将当前无法获得' };
        }

        this.activeGenerals.set(general.id, {
            definition: general,
            kills: 0
        });

        return {
            success: true,
            message: `获得${general.quality}神将【${general.name}】，开始累计击杀`
        };
    }


    private isBranchComplete(branch: TiangongBranch): boolean {
        return GENERAL_DEFINITIONS
            .filter((general) => general.branch === branch)
            .every((general) => this.completedGenerals.has(general.id));
    }


    private getUsedSlotCount(): number {

        let count = this.activeGenerals.size + this.redSkills.size;

        this.basicLevels.forEach((level, id) => {
            const card = BASIC_CARDS.find((item) => item.id === id);
            if (card && level < card.maxLevel) {
                count++;
            }
        });

        if (this.rainbowTiangong) {
            count++;
        }

        return count;
    }


    private toRoman(level: number): string {
        return ['I', 'II', 'III'][Math.max(0, level - 1)] ?? `${level}`;
    }
}
