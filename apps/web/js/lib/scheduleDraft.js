import { getUiCopy } from './locale.js'

const SCHEDULE_DRAFT_KEY = 'ct_schedule_draft'

function canUseStorage() {
    return typeof window !== 'undefined' && window.localStorage
}

export function buildOutfitScheduleDraft(look, { locale = 'en-US', reminderEnabled = true } = {}) {
    return {
        source: {
            type: 'outfit',
            id: look.id
        },
        tab: 'upcoming',
        title: look.title,
        location: getUiCopy(locale).schedule.draftLocation,
        tags: [...(look.detailTags || [])].slice(0, 3),
        reminderEnabled
    }
}

export function saveScheduleDraft(draft) {
    if (!canUseStorage()) return null
    window.localStorage.setItem(SCHEDULE_DRAFT_KEY, JSON.stringify(draft))
    return draft
}

export function getScheduleDraft() {
    if (!canUseStorage()) return null
    const rawValue = window.localStorage.getItem(SCHEDULE_DRAFT_KEY)
    if (!rawValue) return null

    try {
        return JSON.parse(rawValue)
    } catch {
        return null
    }
}

export function clearScheduleDraft() {
    if (!canUseStorage()) return
    window.localStorage.removeItem(SCHEDULE_DRAFT_KEY)
}
