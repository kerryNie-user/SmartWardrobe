function normalizeText(value) {
    return String(value || '').trim()
}

function slugifyCategory(value) {
    const label = normalizeText(value)
    if (!label) return ''
    const ascii = label
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    if (ascii) return ascii
    return `cat-${Array.from(label).map((char) => char.codePointAt(0).toString(36)).join('-')}`
}

function getItemFilterKey(item = {}) {
    return normalizeText(item.filter) || slugifyCategory(item.category)
}

export function buildWardrobeCategoryTabs(items = [], baseTabs = []) {
    const allTab = baseTabs.find((tab) => tab.key === 'all') || { key: 'all', label: 'All' }
    const categoryMap = new Map()

    for (const item of items) {
        const label = normalizeText(item.category) || normalizeText(item.filter)
        const key = getItemFilterKey(item)
        if (!label || !key) continue
        const current = categoryMap.get(key) || {
            key,
            label,
            count: 0
        }
        current.count += 1
        categoryMap.set(key, current)
    }

    const categoryTabs = Array.from(categoryMap.values())
        .sort((left, right) => left.label.localeCompare(right.label))

    return [
        {
            ...allTab,
            count: items.length
        },
        ...categoryTabs
    ]
}

function resolveWardrobeActiveTab(activeTab, tabs) {
    const nextActive = normalizeText(activeTab) || 'all'
    return tabs.some((tab) => tab.key === nextActive) ? nextActive : 'all'
}

export function selectWardrobeSearchResult(items = [], query = '', activeTab = 'all') {
    const normalizedQuery = query.trim().toLowerCase()
    const searchedItems = !normalizedQuery
        ? items
        : items.filter((item) => [item.title, item.category, item.material, item.color, ...(item.aiJson?.tags || [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery))

    return activeTab === 'all'
        ? searchedItems
        : searchedItems.filter((item) => getItemFilterKey(item) === activeTab)
}

export function buildScannedWardrobeSavePayload({
    itemId = '',
    scanResult = {},
    imagePreview = '',
    existingItem = {},
    fallback = {},
    now = Date.now()
}) {
    const scannedItem = scanResult.item || {}
    const title = normalizeText(scannedItem.title) || normalizeText(existingItem.title) || normalizeText(fallback.title)
    const category = normalizeText(scannedItem.category) || normalizeText(existingItem.category) || normalizeText(fallback.category)
    const filter = normalizeText(scannedItem.filter)
        || normalizeText(existingItem.filter)
        || slugifyCategory(category)
        || normalizeText(fallback.filter)
        || 'essentials'
    const image = normalizeText(scannedItem.image) || normalizeText(imagePreview) || normalizeText(existingItem.image)

    return {
        id: normalizeText(itemId) || normalizeText(scannedItem.id) || `wardrobe-${now}`,
        title,
        category,
        size: normalizeText(scannedItem.size) || normalizeText(existingItem.size),
        color: normalizeText(scannedItem.color) || normalizeText(existingItem.color),
        material: normalizeText(scannedItem.material) || normalizeText(existingItem.material),
        image,
        filter,
        favorite: Boolean(scannedItem.favorite || existingItem.favorite),
        aiJson: {
            schema: 'ct_wardrobe_scan_v1',
            status: scanResult.status || 'unavailable',
            source: scanResult.source || 'wardrobe-item-scanner',
            tags: Array.isArray(scannedItem.tags) ? scannedItem.tags : [],
            metadata: scanResult.metadata || {},
            raw: scanResult.raw || null
        }
    }
}

export function buildWardrobePageSelectorInput({
    locale,
    activeTab,
    query,
    content,
    items,
    syncStates = {}
}) {
    const tabs = buildWardrobeCategoryTabs(items, content.tabs)
    const resolvedActiveTab = resolveWardrobeActiveTab(activeTab, tabs)

    return {
        locale,
        activeTab: resolvedActiveTab,
        query,
        content: {
            ...content,
            tabs
        },
        items,
        visibleItems: selectWardrobeSearchResult(items, query, resolvedActiveTab),
        syncStates
    }
}
