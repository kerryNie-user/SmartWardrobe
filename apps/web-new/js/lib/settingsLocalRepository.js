import { getCurrentUserScope, readUserScopedValue, writeUserScopedValue } from './userScopedStorage.js'
import {
    DEFAULT_SETTINGS_STATE,
    normalizeLocale,
    normalizeTheme,
    normalizeWardrobeLayout,
    normalizeTemperatureUnit,
    normalizeBoolean
} from './settingsService.js'

const SETTINGS_KEY = 'ct_settings'
const LOCALE_KEY = 'app_locale'
const THEME_KEY = 'app_theme'
const WARDROBE_LAYOUT_KEY = 'wardrobe_display_mode'
const TEMPERATURE_UNIT_KEY = 'temperature_unit'

function resolveStorage(storage) {
    return storage || window.localStorage
}

function persistDedicatedKeys(state, storage = null) {
    const resolvedStorage = resolveStorage(storage)
    resolvedStorage?.setItem(LOCALE_KEY, state.language)
    resolvedStorage?.setItem(THEME_KEY, state['display-mode'])
    resolvedStorage?.setItem(WARDROBE_LAYOUT_KEY, state['wardrobe-layout'])
    resolvedStorage?.setItem(TEMPERATURE_UNIT_KEY, state['temperature-unit'])
}

function buildState(snapshot = {}, storage = null) {
    const resolvedStorage = resolveStorage(storage)
    return {
        language: normalizeLocale(snapshot.language || resolvedStorage?.getItem(LOCALE_KEY)),
        'display-mode': normalizeTheme(snapshot['display-mode'] || resolvedStorage?.getItem(THEME_KEY)),
        'wardrobe-layout': normalizeWardrobeLayout(snapshot['wardrobe-layout'] || resolvedStorage?.getItem(WARDROBE_LAYOUT_KEY)),
        'temperature-unit': normalizeTemperatureUnit(snapshot['temperature-unit'] || resolvedStorage?.getItem(TEMPERATURE_UNIT_KEY)),
        'public-profile': normalizeBoolean(snapshot['public-profile'], DEFAULT_SETTINGS_STATE['public-profile']),
        'outfit-reminders': normalizeBoolean(snapshot['outfit-reminders'], DEFAULT_SETTINGS_STATE['outfit-reminders'])
    }
}

export function createSettingsLocalRepository({ scope = null, storage = null } = {}) {
    function resolveScope(nextScope) {
        return nextScope || scope || getCurrentUserScope(storage)
    }

    return {
        read(nextScope) {
            const resolvedScope = resolveScope(nextScope)
            const snapshot = readUserScopedValue(SETTINGS_KEY, () => ({}), resolvedScope)
            return {
                ...DEFAULT_SETTINGS_STATE,
                ...buildState(snapshot && typeof snapshot === 'object' ? snapshot : {}, storage)
            }
        },
        write(nextState, nextScope) {
            const resolvedScope = resolveScope(nextScope)
            const normalized = {
                ...DEFAULT_SETTINGS_STATE,
                ...buildState(nextState, storage)
            }
            persistDedicatedKeys(normalized, storage)
            writeUserScopedValue(SETTINGS_KEY, normalized, resolvedScope)
            return normalized
        },
        clear(nextScope) {
            const resolvedScope = resolveScope(nextScope)
            return writeUserScopedValue(SETTINGS_KEY, null, resolvedScope)
        }
    }
}
