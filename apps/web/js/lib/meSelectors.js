export function buildMePageSelectorInput({
    locale,
    content,
    profile,
    favoritesStats,
    favoriteLooks,
    favoritePosts,
    settingsState,
    scheduleSummary,
    scheduleStats,
    scheduleFeed,
    wardrobeCount,
    wardrobeItems,
    recentWardrobeItems,
    syncStates = {}
}) {
    return {
        locale,
        surface: 'overview',
        content,
        profile,
        favorites: {
            stats: favoritesStats,
            looks: favoriteLooks,
            posts: favoritePosts
        },
        settings: settingsState,
        schedule: {
            summary: scheduleSummary,
            stats: scheduleStats,
            feed: scheduleFeed
        },
        wardrobe: {
            count: wardrobeCount,
            allItems: wardrobeItems,
            recentItems: recentWardrobeItems
        },
        syncStates
    }
}
