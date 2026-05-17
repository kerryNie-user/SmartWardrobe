import {
    createErrorSemantics,
    createLoadingSemantics,
    createSyncSemantics
} from './shared.js'

export function createSettingsPageContract({
    locale,
    content,
    settingsState,
    profile,
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['profile', 'settings'])
    return {
        state: {
            locale,
            settingsSnapshot: settingsState
        },
        derivedView: {
            content,
            profile: {
                ...content.profile,
                ...profile,
                eyebrow: content.profile.eyebrow
            },
            panel: {
                heading: content.heading,
                items: content.items
            }
        },
        actions: {
            setSetting: { type: 'domain', optimistic: true, retryable: true },
            toggleSetting: { type: 'domain', optimistic: true, retryable: true },
            logout: { type: 'domain', optimistic: false, retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: {
            kind: 'fallbackContent',
            active: false
        },
        error: createErrorSemantics(sync),
        sync
    }
}
