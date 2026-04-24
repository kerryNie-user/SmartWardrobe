import { buildOutfitScheduleDraft } from '../scheduleDraft.js'
import { buildOutfitDetailHref, buildScheduleEventHref } from '../routes.js'
import {
    NAVIGATE_TO_OUTFIT_DETAIL,
    OUTFIT_ADD_TO_SCHEDULE,
    OUTFIT_SHOW_ALTERNATIVES,
    OUTFIT_TOGGLE_SAVE
} from './actionIds.js'

export function buildToggleSaveLookAction(look) {
    return {
        id: OUTFIT_TOGGLE_SAVE,
        kind: 'domain',
        payload: {
            favoriteType: 'looks',
            favoriteItem: {
                id: look.id,
                title: look.title,
                subtitle: look.description,
                image: look.image,
                href: buildOutfitDetailHref(look.id)
            }
        },
        meta: {
            source: 'outfit-detail'
        }
    }
}

export function buildAddOutfitToScheduleAction(look, { locale = 'en-US', reminderEnabled = true } = {}) {
    return {
        id: OUTFIT_ADD_TO_SCHEDULE,
        kind: 'domain',
        payload: {
            draft: buildOutfitScheduleDraft(look, {
                locale,
                reminderEnabled
            }),
            href: buildScheduleEventHref()
        },
        meta: {
            source: 'outfit-detail'
        }
    }
}

export function buildShowAlternativesAction() {
    return {
        id: OUTFIT_SHOW_ALTERNATIVES,
        kind: 'ui',
        payload: {},
        meta: {
            source: 'outfit-detail'
        }
    }
}

export function buildNavigateToOutfitDetailAction(outfitId) {
    return {
        id: NAVIGATE_TO_OUTFIT_DETAIL,
        kind: 'navigation',
        payload: {
            href: buildOutfitDetailHref(outfitId)
        },
        meta: {
            source: 'outfit-detail'
        }
    }
}

