import { getScheduleContent } from '../data/schedule.js'
import { getCurrentUserScope, readUserScopedValue, writeUserScopedValue } from './userScopedStorage.js'

const SCHEDULE_KEY = 'ct_schedule'
const SCHEDULE_TABS = ['upcoming', 'travel', 'archive']

function clone(value) {
    return JSON.parse(JSON.stringify(value))
}

function createSeed(locale) {
    return clone(getScheduleContent(locale).views)
}

function normalizeGroups(groups, fallbackGroups) {
    return Array.isArray(groups) ? clone(groups) : clone(fallbackGroups)
}

function normalizeStoredTabs(storedTabs, locale) {
    const seed = createSeed(locale)

    return SCHEDULE_TABS.reduce((tabs, key) => {
        tabs[key] = {
            groups: normalizeGroups(storedTabs?.[key]?.groups, seed[key].groups)
        }
        return tabs
    }, {})
}

function normalizeWritableTabs(nextTabs) {
    return SCHEDULE_TABS.reduce((tabs, key) => {
        tabs[key] = {
            groups: clone(nextTabs[key]?.groups || [])
        }
        return tabs
    }, {})
}

export function createScheduleLocalRepository({ locale = 'en-US', scope = null } = {}) {
    function resolveLocale(nextLocale) {
        return nextLocale || locale
    }

    function resolveScope(nextScope) {
        return nextScope || scope || getCurrentUserScope()
    }

    return {
        read(nextLocale, nextScope) {
            const resolvedLocale = resolveLocale(nextLocale)
            const resolvedScope = resolveScope(nextScope)
            return normalizeStoredTabs(
                readUserScopedValue(SCHEDULE_KEY, () => null, resolvedScope),
                resolvedLocale
            )
        },
        write(nextTabs, nextLocale, nextScope) {
            const resolvedScope = resolveScope(nextScope)
            return writeUserScopedValue(
                SCHEDULE_KEY,
                normalizeWritableTabs(nextTabs),
                resolvedScope
            )
        },
        clear(nextScope) {
            const resolvedScope = resolveScope(nextScope)
            return writeUserScopedValue(SCHEDULE_KEY, null, resolvedScope)
        }
    }
}
