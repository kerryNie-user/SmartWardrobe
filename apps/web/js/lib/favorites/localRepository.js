import { getCurrentUserScope, readUserScopedValue, writeUserScopedValue } from '../userScopedStorage.js'

const FAVORITES_KEY = 'ct_favorites'

function normalizeFavorites(favorites = {}) {
    return {
        looks: Array.isArray(favorites.looks) ? favorites.looks : [],
        posts: Array.isArray(favorites.posts) ? favorites.posts : []
    }
}

export function createFavoritesLocalRepository({ scope = null } = {}) {
    function resolveScope(nextScope) {
        return nextScope || scope || getCurrentUserScope()
    }

    return {
        scope(nextScope) {
            return resolveScope(nextScope)
        },
        read(nextScope) {
            const resolvedScope = resolveScope(nextScope)
            return normalizeFavorites(readUserScopedValue(FAVORITES_KEY, () => ({}), resolvedScope))
        },
        write(favorites, nextScope) {
            const resolvedScope = resolveScope(nextScope)
            const normalized = normalizeFavorites(favorites)
            writeUserScopedValue(FAVORITES_KEY, normalized, resolvedScope)
            return normalized
        }
    }
}
