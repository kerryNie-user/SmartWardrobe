import {
    NAVIGATE_TO_OUTFIT_DETAIL,
    OUTFIT_ADD_TO_SCHEDULE,
    OUTFIT_SHOW_ALTERNATIVES,
    OUTFIT_TOGGLE_SAVE
} from './actionIds.js'

export function dispatchAction(action, context = {}) {
    if (!action?.id) return null

    if (action.id === OUTFIT_TOGGLE_SAVE) {
        context.toggleFavorite?.(
            action.payload?.favoriteType || 'looks',
            action.payload?.favoriteItem
        )
        return action
    }

    if (action.id === OUTFIT_ADD_TO_SCHEDULE) {
        context.saveScheduleDraft?.(action.payload?.draft)
        context.navigateTo?.(action.payload?.href)
        return action
    }

    if (action.id === OUTFIT_SHOW_ALTERNATIVES) {
        context.showAlternatives?.()
        return action
    }

    if (action.id === NAVIGATE_TO_OUTFIT_DETAIL) {
        context.navigateTo?.(action.payload?.href)
        return action
    }

    return null
}

