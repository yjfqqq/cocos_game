import {
    addPlayerStats,
    spendGold
} from './PlayerData';


export interface ArtifactBonus {
    hp: number;
    atk: number;
    def: number;
    crit: number;
}

export interface ArtifactDefinition {
    id: string;
    name: string;
    description: string;
    bonusPerLevel: ArtifactBonus;
}

export interface ArtifactState extends ArtifactDefinition {
    level: number;
    upgradeCost: number;
}

export interface ArtifactUpgradeResult {
    success: boolean;
    message: string;
}


const ARTIFACT_DEFINITIONS: ArtifactDefinition[] = [
    {
        id: 'tiangang-sword',
        name: '天罡剑',
        description: '每级攻击 +2',
        bonusPerLevel: { hp: 0, atk: 2, def: 0, crit: 0 }
    },
    {
        id: 'xuanwu-armor',
        name: '玄武甲',
        description: '每级生命 +10，防御 +1',
        bonusPerLevel: { hp: 10, atk: 0, def: 1, crit: 0 }
    },
    {
        id: 'thunder-pearl',
        name: '雷灵珠',
        description: '每级暴击 +1%',
        bonusPerLevel: { hp: 0, atk: 0, def: 0, crit: 1 }
    }
];

const artifactLevels = new Map<string, number>();


function getUpgradeCost(level: number): number {
    return 20 + level * 20;
}


export function getArtifacts(): ArtifactState[] {

    return ARTIFACT_DEFINITIONS.map((definition) => {
        const level = artifactLevels.get(definition.id) ?? 0;

        return {
            ...definition,
            level,
            upgradeCost: getUpgradeCost(level)
        };
    });
}


export function getArtifactBonusText(artifact: ArtifactState): string {

    if (artifact.level <= 0) {
        return artifact.description;
    }

    const bonus = artifact.bonusPerLevel;
    const parts: string[] = [];

    if (bonus.hp > 0) {
        parts.push(`生命 +${bonus.hp * artifact.level}`);
    }
    if (bonus.atk > 0) {
        parts.push(`攻击 +${bonus.atk * artifact.level}`);
    }
    if (bonus.def > 0) {
        parts.push(`防御 +${bonus.def * artifact.level}`);
    }
    if (bonus.crit > 0) {
        parts.push(`暴击 +${bonus.crit * artifact.level}%`);
    }

    return parts.join('  ');
}


export function upgradeArtifact(artifactId: string): ArtifactUpgradeResult {

    const artifact = ARTIFACT_DEFINITIONS.find((definition) => {
        return definition.id === artifactId;
    });

    if (!artifact) {
        return {
            success: false,
            message: '神器不存在'
        };
    }

    const currentLevel = artifactLevels.get(artifactId) ?? 0;
    const cost = getUpgradeCost(currentLevel);

    if (!spendGold(cost)) {
        return {
            success: false,
            message: `金币不足，需要 ${cost} 金币`
        };
    }

    const nextLevel = currentLevel + 1;
    artifactLevels.set(artifactId, nextLevel);

    const bonus = artifact.bonusPerLevel;
    addPlayerStats(bonus.hp, bonus.atk, bonus.def, bonus.crit);

    return {
        success: true,
        message: currentLevel === 0
            ? `${artifact.name}已激活，战力提升！`
            : `${artifact.name}强化至 Lv.${nextLevel}`
    };
}
