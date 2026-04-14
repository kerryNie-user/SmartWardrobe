export const DEFAULT_SETTINGS_STATE = {
    language: 'en-US',
    'display-mode': 'dark',
    'wardrobe-layout': 'grid',
    'temperature-unit': 'celsius',
    'public-profile': true,
    'outfit-reminders': true
}

export function normalizeLocale(value) {
    return value === 'zh-CN' ? 'zh-CN' : 'en-US'
}

export function normalizeTheme(value) {
    return value === 'light' ? 'light' : 'dark'
}

export function normalizeWardrobeLayout(value) {
    return value === 'list' ? 'list' : 'grid'
}

export function normalizeTemperatureUnit(value) {
    return value === 'fahrenheit' ? 'fahrenheit' : 'celsius'
}

export function normalizeBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback
}

export function normalizeSettingsState(snapshot = {}) {
    return {
        language: normalizeLocale(snapshot.language),
        'display-mode': normalizeTheme(snapshot['display-mode']),
        'wardrobe-layout': normalizeWardrobeLayout(snapshot['wardrobe-layout']),
        'temperature-unit': normalizeTemperatureUnit(snapshot['temperature-unit']),
        'public-profile': normalizeBoolean(snapshot['public-profile'], DEFAULT_SETTINGS_STATE['public-profile']),
        'outfit-reminders': normalizeBoolean(snapshot['outfit-reminders'], DEFAULT_SETTINGS_STATE['outfit-reminders'])
    }
}

export function createSettingsService({
    localRepository,
    remoteRepository,
    syncController,
    onStateChange = () => {}
}) {
    let pendingSettings = null

    return {
        async hydrate() {
            syncController.markLoading()
            const remote = await remoteRepository.fetch()
            if (!remote.ok || !remote.data?.settings) {
                syncController.markStale(remote.error)
                return localRepository.read()
            }

            const persisted = localRepository.write(remote.data.settings)
            pendingSettings = null
            onStateChange(persisted)
            syncController.markSynced()
            return persisted
        },

        async save(nextSettings) {
            pendingSettings = nextSettings
            syncController.markSyncing()
            const persisted = localRepository.write(nextSettings)
            onStateChange(persisted)
            const response = await remoteRepository.save(nextSettings)

            if (!response.ok) {
                syncController.markFailed(response.error)
                return localRepository.read()
            }

            const confirmed = localRepository.write(response.data?.settings || nextSettings)
            pendingSettings = null
            onStateChange(confirmed)
            syncController.markSynced()
            return confirmed
        },

        async retry() {
            if (!pendingSettings) {
                return this.hydrate()
            }

            return this.save(pendingSettings)
        }
    }
}
