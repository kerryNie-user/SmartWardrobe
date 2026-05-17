export const PANEL_IDS = {
    home: 'ct-home-feed-panel',
    me: 'ct-me-panel',
    discovery: 'ct-discovery-feed-panel',
    favorites: 'ct-favorites-panel',
    wardrobe: 'ct-wardrobe-panel',
    schedule: 'ct-schedule-panel'
}

export function buildTabState(activeKey, tabs = [], prefix, panelId) {
    return tabs.map((tab) => ({
        ...tab,
        active: tab.key === activeKey,
        tabId: `${prefix}-${tab.key}`,
        panelId
    }))
}

function normalizeSyncDomains(syncStates = {}, allowedKeys = []) {
    return allowedKeys
        .filter((key) => syncStates[key])
        .map((key) => ({
            key,
            status: syncStates[key]?.status || 'idle'
        }))
}

export function createSyncSemantics(syncStates = {}, allowedKeys = [], surface = 'topbar') {
    const domains = normalizeSyncDomains(syncStates, allowedKeys)
    return {
        surface,
        domains,
        backgroundSyncing: domains.some((domain) => domain.status === 'loading' || domain.status === 'syncing'),
        failedDomains: domains.filter((domain) => domain.status === 'failed').map((domain) => domain.key),
        staleDomains: domains.filter((domain) => domain.status === 'stale').map((domain) => domain.key),
        conflictDomains: domains.filter((domain) => domain.status === 'conflict').map((domain) => domain.key)
    }
}

export function createLoadingSemantics(sync) {
    return {
        initialLoading: false,
        backgroundSyncing: sync.backgroundSyncing
    }
}

export function createErrorSemantics(sync) {
    if (sync.conflictDomains.length) {
        return {
            kind: 'conflict',
            active: true,
            domains: sync.conflictDomains
        }
    }

    if (sync.failedDomains.length) {
        return {
            kind: 'failed',
            active: true,
            domains: sync.failedDomains
        }
    }

    if (sync.staleDomains.length) {
        return {
            kind: 'stale',
            active: true,
            domains: sync.staleDomains
        }
    }

    return {
        kind: 'notApplicable',
        active: false,
        domains: []
    }
}

export function createHomeEmpty(looks = []) {
    return {
        kind: 'fallbackContent',
        active: looks.length === 0
    }
}

export function createCollectionEmpty(items = [], activeTab = 'all', query = '') {
    if (items.length) {
        return {
            kind: 'notApplicable',
            active: false
        }
    }

    if (query || activeTab !== 'all') {
        return {
            kind: 'filteredEmpty',
            active: true
        }
    }

    return {
        kind: 'noData',
        active: true
    }
}

export function createStaticEmpty(active = false, kind = 'fallbackContent') {
    return {
        kind,
        active
    }
}
