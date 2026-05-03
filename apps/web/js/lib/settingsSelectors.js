export function buildSettingsPageSelectorInput({
    settingsState,
    content,
    profile,
    syncStates = {}
}) {
    return {
        locale: settingsState.language,
        settingsState,
        content,
        profile,
        syncStates
    }
}
