export function selectWardrobeSearchResult(items = [], query = '', activeTab = 'all') {
    const normalizedQuery = query.trim().toLowerCase()
    const searchedItems = !normalizedQuery
        ? items
        : items.filter((item) => [item.title, item.category, item.material]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery))

    return activeTab === 'all'
        ? searchedItems
        : searchedItems.filter((item) => item.filter === activeTab)
}

export function buildWardrobeSavePayload({
    formValues,
    fallback,
    defaultImage,
    now = Date.now()
}) {
    const title = (formValues.title || '').trim()
    const filter = formValues.filter || 'essentials'

    return {
        id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${now}`,
        category: (formValues.category || '').trim() || fallback.category,
        title,
        size: (formValues.size || '').trim() || fallback.size,
        color: (formValues.color || '').trim() || fallback.color,
        material: (formValues.material || '').trim() || fallback.material,
        image: (formValues.image || '').trim() || defaultImage,
        filter,
        favorite: Boolean(formValues.favorite)
    }
}

export function buildWardrobePageSelectorInput({
    locale,
    activeTab,
    query,
    isFormOpen,
    content,
    items,
    syncStates = {}
}) {
    return {
        locale,
        activeTab,
        query,
        isFormOpen,
        content,
        items,
        visibleItems: selectWardrobeSearchResult(items, query, activeTab),
        syncStates
    }
}
