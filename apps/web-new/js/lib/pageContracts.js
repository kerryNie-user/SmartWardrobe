const PANEL_IDS = {
    home: 'ct-home-feed-panel',
    me: 'ct-me-panel',
    discovery: 'ct-discovery-feed-panel',
    favorites: 'ct-favorites-panel',
    wardrobe: 'ct-wardrobe-panel',
    schedule: 'ct-schedule-panel'
}

function buildTabState(activeKey, tabs = [], prefix, panelId) {
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

function createSyncSemantics(syncStates = {}, allowedKeys = [], surface = 'topbar') {
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

function createLoadingSemantics(sync) {
    return {
        initialLoading: false,
        backgroundSyncing: sync.backgroundSyncing
    }
}

function createErrorSemantics(sync) {
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

function createHomeEmpty(looks = []) {
    return {
        kind: 'fallbackContent',
        active: looks.length === 0
    }
}

function createCollectionEmpty(items = [], activeTab = 'all', query = '') {
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

function createStaticEmpty(active = false, kind = 'fallbackContent') {
    return {
        kind,
        active
    }
}

function createMeFavoritesView(locale, fallbackView, favorites) {
    const stats = favorites.stats
    if (!stats.total) return fallbackView

    return {
        summary: {
            ...fallbackView.summary,
            value: String(stats.total).padStart(2, '0')
        },
        stats: [
            locale === 'zh-CN'
                ? { label: '穿搭', value: String(stats.looks).padStart(2, '0'), detail: '已收藏' }
                : { label: 'Looks', value: String(stats.looks).padStart(2, '0'), detail: 'Saved' },
            locale === 'zh-CN'
                ? { label: '帖子', value: String(stats.posts).padStart(2, '0'), detail: '已存档' }
                : { label: 'Posts', value: String(stats.posts).padStart(2, '0'), detail: 'Saved' }
        ]
    }
}

function createMeSettingsView(locale, fallbackView, settings) {
    const isChinese = locale === 'zh-CN'
    const themeLabel = settings['display-mode'] === 'light'
        ? (isChinese ? '浅色' : 'Light')
        : (isChinese ? '深色' : 'Dark')
    const unitLabel = settings['temperature-unit'] === 'fahrenheit' ? '°F' : '°C'
    const unitDetail = settings['temperature-unit'] === 'fahrenheit'
        ? (isChinese ? '英制' : 'Imperial')
        : (isChinese ? '公制' : 'Metric')

    return {
        summary: {
            ...fallbackView.summary
        },
        stats: [
            { label: isChinese ? '主题' : 'Theme', value: themeLabel, detail: isChinese ? '已同步' : 'Synced' },
            { label: isChinese ? '单位' : 'Unit', value: unitLabel, detail: unitDetail }
        ]
    }
}

function createMeScheduleView(locale, fallbackView, schedule) {
    const summary = schedule.summary
    const stats = schedule.stats
    const isChinese = locale === 'zh-CN'

    if (!summary) return fallbackView

    return {
        summary: {
            ...fallbackView.summary,
            value: `${summary.label} ${summary.time.split('—')[0].trim()}`.trim(),
            meta: summary.location,
            note: isChinese
                ? `${summary.title} 已同步到新版日程。`
                : `${summary.title} is now synced from the persisted schedule.`
        },
        stats: [
            {
                label: isChinese ? '即将到来' : 'Upcoming',
                value: String(stats.upcoming).padStart(2, '0'),
                detail: isChinese ? '已同步' : 'Synced'
            },
            {
                label: isChinese ? '出行' : 'Travel',
                value: String(stats.travel).padStart(2, '0'),
                detail: isChinese ? '已同步' : 'Synced'
            }
        ]
    }
}

function createMeWardrobeView(locale, fallbackView, wardrobe) {
    const count = wardrobe.count
    const items = wardrobe.recentItems
    const allItems = wardrobe.allItems
    const leadItem = items[0]
    const isChinese = locale === 'zh-CN'

    if (!count || !leadItem) return fallbackView

    return {
        summary: {
            ...fallbackView.summary,
            value: String(count).padStart(2, '0'),
            meta: `${leadItem.category} · ${leadItem.material}`,
            note: isChinese
                ? `${leadItem.title} 已作为最新衣橱单品同步到模块页。`
                : `${leadItem.title} is now leading the live wardrobe module.`
        },
        stats: [
            {
                label: isChinese ? '收藏单品' : 'Favorites',
                value: String(allItems.filter((item) => item.favorite).length).padStart(2, '0'),
                detail: isChinese ? '全量统计' : 'All Items'
            },
            {
                label: isChinese ? '最新单品' : 'Latest Item',
                value: leadItem.size,
                detail: leadItem.color
            }
        ]
    }
}

export function createHomePageContract({
    locale,
    activeTab,
    content,
    recommendationInput,
    homeView,
    syncStates = {}
}) {
    const tabs = buildTabState(activeTab, content.tabs, 'ct-home-tab', PANEL_IDS.home)
    const sync = createSyncSemantics(syncStates, ['favorites', 'wardrobe', 'schedule'])
    return {
        state: {
            tab: activeTab
        },
        derivedView: {
            tabs,
            activeTab,
            weather: homeView.weather,
            scheduleCard: homeView.scheduleCard,
            looks: homeView.looks,
            favoriteIds: recommendationInput.favorites.lookIds
        },
        actions: {
            switchTab: { type: 'ui', retryable: false },
            toggleLookFavorite: { type: 'domain', optimistic: true, retryable: true },
            openOutfitDetail: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createHomeEmpty(homeView.looks),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createMePageContract({
    locale,
    activeTab,
    content,
    profile,
    favorites,
    settings,
    schedule,
    wardrobe,
    syncStates = {}
}) {
    const fallbackView = content.views[activeTab]
    const activeView = activeTab === 'favorites'
        ? createMeFavoritesView(locale, content.views.favorites, favorites)
        : activeTab === 'settings'
            ? createMeSettingsView(locale, content.views.settings, settings)
            : activeTab === 'schedule'
                ? createMeScheduleView(locale, content.views.schedule, schedule)
                : activeTab === 'wardrobe'
                    ? createMeWardrobeView(locale, content.views.wardrobe, wardrobe)
                    : fallbackView
    const tabs = buildTabState(activeTab, content.tabs, 'ct-me-tab', PANEL_IDS.me)
    const sync = createSyncSemantics(syncStates, ['profile', 'favorites', 'wardrobe', 'settings', 'schedule'])

    return {
        state: {
            tab: activeTab
        },
        derivedView: {
            hero: {
                ...(content.profile || {}),
                ...profile,
                label: content.profile?.label
            },
            tabs,
            summary: activeView.summary,
            stats: activeView.stats
        },
        actions: {
            switchTab: { type: 'ui', retryable: false },
            openSettings: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: {
            kind: activeView === fallbackView ? 'fallbackContent' : 'notApplicable',
            active: activeView === fallbackView
        },
        error: createErrorSemantics(sync),
        sync
    }
}

export function createDiscoveryPageContract({
    locale,
    content,
    query,
    trendStrip,
    feed,
    shareFeedbackPostId = '',
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['discoveryView', 'discoverySocial'])
    const items = Array.isArray(feed?.items) ? feed.items : []
    return {
        state: {
            query,
            shareFeedbackPostId
        },
        derivedView: {
            topbar: {
                rightHref: 'profile.html'
            },
            query,
            search: {
                placeholder: content.searchPlaceholder?.editorials || '',
                value: query
            },
            trendStrip,
            panel: {
                id: PANEL_IDS.discovery
            },
            feed: {
                kind: feed?.kind || (items.length ? 'ready' : 'empty'),
                items
            }
        },
        actions: {
            setQuery: { type: 'ui', retryable: false },
            togglePostLike: { type: 'domain', optimistic: true, retryable: true },
            togglePostSave: { type: 'domain', optimistic: true, retryable: true },
            sharePost: { type: 'ui', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: items.length
            ? createStaticEmpty(false, 'notApplicable')
            : createCollectionEmpty([], 'all', query),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createProfilePageContract({
    locale,
    content,
    profile,
    favorites,
    wardrobe,
    syncStates = {}
}) {
    const previewItems = [...favorites.items].slice(0, 3)
    const sync = createSyncSemantics(syncStates, ['profile', 'favorites', 'wardrobe'])

    return {
        state: {},
        derivedView: {
            summary: {
                content,
                profile,
                favoritesTotal: favorites.stats.total,
                wardrobeCount: wardrobe.count
            },
            previewItems
        },
        actions: {
            openEditProfile: { type: 'navigation', retryable: false },
            openFavorites: { type: 'navigation', retryable: false },
            openWardrobe: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: {
            kind: previewItems.length ? 'notApplicable' : 'noData',
            active: !previewItems.length
        },
        error: createErrorSemantics(sync),
        sync
    }
}

export function createProfileEditPageContract({
    locale,
    content,
    profile,
    status = '',
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['profile'])
    return {
        state: {
            status
        },
        derivedView: {
            content,
            profile,
            status,
            topbar: {
                leftLabel: locale === 'zh-CN' ? '返回资料' : 'Back to profile',
                leftHref: 'profile.html',
                rightLabel: content.topbar?.rightLabel || ''
            }
        },
        actions: {
            restoreProfile: { type: 'ui', retryable: false },
            saveProfile: { type: 'domain', optimistic: true, retryable: true },
            backToProfile: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(false),
        error: createErrorSemantics(sync),
        sync
    }
}

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

export function createFavoritesPageContract({
    locale,
    activeTab,
    content,
    stats,
    items,
    syncStates = {}
}) {
    const tabs = buildTabState(activeTab, content.tabs, 'ct-favorites-tab', PANEL_IDS.favorites)
    const sync = createSyncSemantics(syncStates, ['favorites'])
    return {
        state: {
            tab: activeTab
        },
        derivedView: {
            tabs,
            summaryMetrics: [
                { label: content.metrics.total, value: String(stats.total).padStart(2, '0') },
                { label: content.metrics.current, value: String(items.length).padStart(2, '0') }
            ],
            items,
            emptyCopy: content.empty[activeTab]
        },
        actions: {
            switchTab: { type: 'ui', retryable: false },
            removeFavorite: { type: 'domain', optimistic: true, rollback: true, retryable: true },
            openFavoriteItem: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createCollectionEmpty(items, activeTab),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createWardrobePageContract({
    locale,
    activeTab,
    query,
    isFormOpen,
    content,
    items,
    searchedItems,
    syncStates = {}
}) {
    const tabs = buildTabState(activeTab, content.tabs, 'ct-wardrobe-tab', PANEL_IDS.wardrobe)
    const visibleItems = activeTab === 'all'
        ? searchedItems
        : searchedItems.filter((item) => item.filter === activeTab)
    const sync = createSyncSemantics(syncStates, ['wardrobe'])
    return {
        state: {
            tab: activeTab,
            query,
            isFormOpen
        },
        derivedView: {
            hero: content.hero,
            tabs,
            archiveItems: visibleItems,
            totalItems: items.length,
            query
        },
        actions: {
            switchTab: { type: 'ui', retryable: false },
            setQuery: { type: 'ui', retryable: false },
            saveWardrobeItem: { type: 'domain', optimistic: true, retryable: true },
            deleteWardrobeItem: { type: 'domain', optimistic: true, rollback: true, retryable: true },
            toggleWardrobeFavorite: { type: 'domain', optimistic: true, rollback: true, retryable: true }
        },
        loading: createLoadingSemantics(sync),
        empty: createCollectionEmpty(visibleItems, activeTab, query),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createWardrobeItemPageContract({
    locale,
    itemId,
    imagePreview = '',
    content,
    item,
    pageCopy,
    submitLabel,
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['wardrobe'])
    return {
        state: {
            itemId,
            isEditing: Boolean(itemId),
            imagePreview
        },
        derivedView: {
            item,
            pageCopy,
            tabs: content.tabs,
            form: content.form,
            submitLabel,
            topbar: {
                leftLabel: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                leftHref: 'wardrobe.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightHref: 'profile.html'
            }
        },
        actions: {
            previewUpload: { type: 'ui', retryable: false },
            saveWardrobeItem: { type: 'domain', optimistic: true, retryable: true },
            backToWardrobe: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(false),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createWardrobeDetailPageContract({
    locale,
    itemId,
    item,
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['wardrobe'])
    return {
        state: {
            itemId
        },
        derivedView: {
            item,
            topbar: {
                leftLabel: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                leftHref: 'wardrobe.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightHref: 'profile.html'
            },
            missingState: item ? null : {
                kind: 'error',
                eyebrow: locale === 'zh-CN' ? '单品不存在' : 'Missing Item',
                title: locale === 'zh-CN' ? '这件单品暂时不可用' : 'This wardrobe item is unavailable',
                description: locale === 'zh-CN' ? '请返回衣橱重新选择单品。' : 'Return to wardrobe and choose another item.',
                action: {
                    label: locale === 'zh-CN' ? '返回衣橱' : 'Back to wardrobe',
                    href: 'wardrobe.html'
                }
            }
        },
        actions: {
            openEditItem: { type: 'navigation', retryable: false },
            backToWardrobe: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(!item, 'noData'),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createSchedulePageContract({
    locale,
    activeTab,
    content,
    scheduleState,
    deleteCandidate,
    syncStates = {}
}) {
    const tabs = buildTabState(activeTab, content.tabs, 'ct-schedule-tab', PANEL_IDS.schedule)
    const activeView = scheduleState[activeTab]
    const eventCount = activeView.groups.reduce((total, group) => total + group.events.length, 0)
    const sync = createSyncSemantics(syncStates, ['schedule'])
    return {
        state: {
            tab: activeTab,
            deleteCandidate
        },
        derivedView: {
            tabs,
            overview: {
                ...activeView.overview,
                value: String(eventCount).padStart(2, '0')
            },
            timelineGroups: activeView.groups,
            deleteDialog: {
                visible: Boolean(deleteCandidate),
                candidate: deleteCandidate
            }
        },
        actions: {
            switchTab: { type: 'ui', retryable: false },
            toggleReminder: { type: 'domain', optimistic: true, rollback: true, retryable: true },
            requestDelete: { type: 'ui', needsConfirm: true, retryable: false },
            confirmDelete: { type: 'domain', optimistic: true, rollback: true, retryable: true },
            openCreateEvent: { type: 'navigation', retryable: false },
            openEditEvent: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createCollectionEmpty(activeView.groups.flatMap((group) => group.events), activeTab),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createScheduleEventPageContract({
    locale,
    eventId,
    content,
    event,
    scheduleDraft,
    syncStates = {}
}) {
    const activeEvent = event || scheduleDraft || null
    const isEditing = Boolean(eventId && activeEvent?.id)
    const sync = createSyncSemantics(syncStates, ['schedule'])
    return {
        state: {
            eventId,
            isEditing
        },
        derivedView: {
            content,
            event: activeEvent,
            topbar: {
                leftLabel: locale === 'zh-CN' ? '返回日程' : 'Back to schedule',
                leftHref: 'schedule.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightHref: 'profile.html'
            }
        },
        actions: {
            saveScheduleEvent: { type: 'domain', optimistic: true, retryable: true },
            backToSchedule: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(Boolean(eventId && !activeEvent), 'noData'),
        error: createErrorSemantics(sync),
        sync
    }
}

export function createPostDetailPageContract({
    locale,
    postId,
    post,
    social,
    comments = [],
    shareFeedback = '',
    syncStates = {}
}) {
    const sync = createSyncSemantics(syncStates, ['discoverySocial', 'discoveryComments'])
    return {
        state: {
            postId,
            shareFeedback
        },
        derivedView: {
            topbar: {
                leftLabel: locale === 'zh-CN' ? '返回发现' : 'Back to discovery',
                leftHref: 'discovery.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightHref: 'profile.html'
            },
            article: post,
            social,
            comments,
            missingState: post ? null : {
                kind: 'error',
                eyebrow: locale === 'zh-CN' ? '帖子未找到' : 'Post Missing',
                title: locale === 'zh-CN' ? '当前帖子不存在' : 'This post is unavailable',
                description: locale === 'zh-CN' ? '请返回发现页重新选择帖子。' : 'Return to discovery and choose another post.',
                action: {
                    label: locale === 'zh-CN' ? '返回发现' : 'Back to discovery',
                    href: 'discovery.html'
                }
            }
        },
        actions: {
            togglePostSave: { type: 'domain', optimistic: true, retryable: true },
            togglePostLike: { type: 'domain', optimistic: true, retryable: true },
            toggleAuthorFollow: { type: 'domain', optimistic: true, retryable: true },
            sharePost: { type: 'ui', retryable: false },
            saveComment: { type: 'domain', optimistic: true, retryable: true },
            backToDiscovery: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createStaticEmpty(!post, 'noData'),
        error: createErrorSemantics(sync),
        sync
    }
}
