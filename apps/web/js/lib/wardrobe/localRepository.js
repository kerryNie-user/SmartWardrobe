import { getWardrobeContent } from '../../data/wardrobe.js'
import { getCurrentUserScope, readUserScopedValue, writeUserScopedValue } from '../userScopedStorage.js'

const WARDROBE_KEY = 'ct_wardrobe'

export function normalizeWardrobeItem(item = {}) {
    return {
        favorite: false,
        image: '',
        ...item
    }
}

function createSeed(locale) {
    return getWardrobeContent(locale).items.map((item) => normalizeWardrobeItem({ ...item }))
}

export function createWardrobeLocalRepository({ scope = null, storage = null } = {}) {
    function resolveScope(nextScope) {
        return nextScope || scope || getCurrentUserScope(storage)
    }

    return {
        scope(nextScope) {
            return resolveScope(nextScope)
        },
        read(locale = 'en-US', nextScope) {
            const resolvedScope = resolveScope(nextScope)
            const stored = readUserScopedValue(WARDROBE_KEY, () => null, resolvedScope)
            if (Array.isArray(stored)) {
                return stored.map((item) => normalizeWardrobeItem(item))
            }

            const seed = createSeed(locale)
            writeUserScopedValue(WARDROBE_KEY, seed, resolvedScope)
            return seed
        },
        write(items, nextScope) {
            const resolvedScope = resolveScope(nextScope)
            const normalized = Array.isArray(items)
                ? items.map((item) => normalizeWardrobeItem(item))
                : []
            writeUserScopedValue(WARDROBE_KEY, normalized, resolvedScope)
            return normalized
        }
    }
}
