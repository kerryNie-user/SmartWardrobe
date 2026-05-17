import {
    PANEL_IDS,
    buildTabState,
    createErrorSemantics,
    createLoadingSemantics,
    createSyncSemantics
} from './shared.js'

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
