export function buildProfilePageSelectorInput({
    locale,
    content,
    profile,
    favorites,
    favoritesStats,
    wardrobeCount,
    syncStates = {}
}) {
    return {
        locale,
        content,
        profile,
        favorites: {
            stats: favoritesStats,
            items: [...favorites.looks, ...favorites.posts]
        },
        wardrobe: {
            count: wardrobeCount
        },
        syncStates
    }
}
