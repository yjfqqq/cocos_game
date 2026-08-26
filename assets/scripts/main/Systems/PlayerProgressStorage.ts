import { sys } from 'cc';
import type {
    PlayerData,
    PlayerSkillState
} from '../GameData/PlayerData';
import { getOrCreatePlayerSkillState } from '../GameData/PlayerData';
import { NORMAL_ATTACK_SKILL_ID } from '../GameData/SkillData';


interface StoredSkillProgress {
    version: 1;
    skills: PlayerSkillState[];
}


const SKILL_PROGRESS_KEY = 'cocos-game.skill-progress.v1';


export function loadSkillProgress(data: PlayerData): boolean {
    try {
        const raw = sys.localStorage.getItem(SKILL_PROGRESS_KEY);
        if (!raw) {
            getOrCreatePlayerSkillState(data, NORMAL_ATTACK_SKILL_ID);
            return false;
        }
        const parsed: unknown = JSON.parse(raw);
        if (!isStoredSkillProgress(parsed)) {
            getOrCreatePlayerSkillState(data, NORMAL_ATTACK_SKILL_ID);
            return false;
        }
        data.skills.splice(
            0,
            data.skills.length,
            ...parsed.skills.map((skill) => ({
                skillId: skill.skillId,
                level: Math.max(1, Math.min(10, Math.floor(skill.level || 1))),
                fragments: Math.max(0, Math.floor(skill.fragments || 0)),
                exp: Math.max(0, Math.floor(skill.exp || 0))
            }))
        );
        getOrCreatePlayerSkillState(data, NORMAL_ATTACK_SKILL_ID);
        return true;
    } catch (_error) {
        getOrCreatePlayerSkillState(data, NORMAL_ATTACK_SKILL_ID);
        return false;
    }
}


export function saveSkillProgress(data: PlayerData): boolean {
    try {
        const payload: StoredSkillProgress = {
            version: 1,
            skills: data.skills.map((skill) => ({ ...skill }))
        };
        sys.localStorage.setItem(SKILL_PROGRESS_KEY, JSON.stringify(payload));
        return true;
    } catch (_error) {
        return false;
    }
}


function isStoredSkillProgress(value: unknown): value is StoredSkillProgress {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value as Partial<StoredSkillProgress>;
    return candidate.version === 1 && Array.isArray(candidate.skills) &&
        candidate.skills.every((skill) => {
            return Boolean(skill) &&
                typeof skill.skillId === 'string' &&
                typeof skill.level === 'number';
        });
}
