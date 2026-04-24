import { createSettingsLocalRepository } from './settingsLocalRepository.js'
import { createSettingsRemoteRepository } from './settingsRemoteRepository.js'
import { createSettingsService, DEFAULT_SETTINGS_STATE, normalizeLocale, normalizeTemperatureUnit, normalizeTheme, normalizeWardrobeLayout } from './settingsService.js'
import { createSyncController } from './syncState.js'
const settingsListeners = new Set()
const settingsSyncController = createSyncController()

function notifySettingsStore(state) {
    settingsListeners.forEach((listener) => listener(state))
}

const settingsLocalRepository = createSettingsLocalRepository()
const settingsRemoteRepository = createSettingsRemoteRepository()
const settingsService = createSettingsService({
    localRepository: settingsLocalRepository,
    remoteRepository: settingsRemoteRepository,
    syncController: settingsSyncController,
    onStateChange: (state) => notifySettingsStore(state)
})

export function getSettingsState() {
    return settingsLocalRepository.read()
}

export function setSetting(key, value) {
    const currentState = {
        ...DEFAULT_SETTINGS_STATE,
        ...getSettingsState()
    }
    const nextState = {
        ...currentState
    }

    if (key === 'language') {
        nextState.language = normalizeLocale(value)
    } else if (key === 'display-mode') {
        nextState['display-mode'] = normalizeTheme(value)
    } else if (key === 'wardrobe-layout') {
        nextState['wardrobe-layout'] = normalizeWardrobeLayout(value)
    } else if (key === 'temperature-unit') {
        nextState['temperature-unit'] = normalizeTemperatureUnit(value)
    } else if (key in DEFAULT_SETTINGS_STATE) {
        nextState[key] = Boolean(value)
    }

    const persisted = settingsLocalRepository.write(nextState)
    notifySettingsStore(persisted)
    void settingsService.save(persisted)
    return persisted
}

export function toggleSetting(key) {
    return setSetting(key, !getSettingsState()[key])
}

export function getThemePreference() {
    return getSettingsState()['display-mode']
}

export function getWardrobeLayoutPreference() {
    return getSettingsState()['wardrobe-layout']
}

export function getTemperatureUnitPreference() {
    return getSettingsState()['temperature-unit']
}

export function subscribeSettingsStore(listener) {
    settingsListeners.add(listener)
    return () => {
        settingsListeners.delete(listener)
    }
}

export async function hydrateSettings() {
    return settingsService.hydrate()
}

export function getSettingsSyncState() {
    return settingsSyncController.getState()
}

export function subscribeSettingsSyncState(listener) {
    return settingsSyncController.subscribe(listener)
}

export async function retrySettingsSync() {
    return settingsService.retry()
}
