import {
    createErrorSemantics,
    createLoadingSemantics,
    createSyncSemantics
} from './shared.js'
import { formatCopy, getUiCopy } from '../locale.js'

function padCount(value) {
    return String(Math.max(0, Number(value) || 0)).padStart(2, '0')
}

function getSettingsLabels(locale, settings = {}) {
    const copy = getUiCopy(locale).me.settingsLabels
    const theme = settings['display-mode'] === 'light'
        ? copy.light
        : copy.dark
    const unit = settings['temperature-unit'] === 'fahrenheit' ? '°F' : '°C'
    const layout = settings['wardrobe-layout'] === 'list'
        ? copy.list
        : copy.grid

    return { theme, unit, layout }
}

function getScheduleTimeStart(time = '') {
    return String(time).split('—')[0].trim()
}

function joinMeta(parts = []) {
    return parts.filter(Boolean).join(' · ')
}

function createFocusView(locale, dashboardCopy = {}, schedule = {}) {
    const copy = dashboardCopy.focus || {}
    const summary = schedule.summary
    const stats = schedule.stats || {}
    const uiCopy = getUiCopy(locale).me

    if (!summary) {
        return {
            label: copy.label || '',
            title: copy.title || '',
            primary: copy.fallbackTitle || '',
            meta: copy.fallbackMeta || '',
            note: copy.fallbackNote || '',
            actionText: copy.actionText || getUiCopy(locale).domains.schedule,
            actionHref: copy.actionHref || 'schedule.html',
            stats: [
                { label: uiCopy.focusStats.upcoming, value: padCount(stats.upcoming), detail: uiCopy.focusStats.planned },
                { label: uiCopy.focusStats.travel, value: padCount(stats.travel), detail: uiCopy.focusStats.planned }
            ]
        }
    }

    return {
        label: copy.label || '',
        title: copy.title || '',
        primary: summary.title,
        meta: joinMeta([summary.label, getScheduleTimeStart(summary.time), summary.location]),
        note: copy.syncedNote || uiCopy.focusSyncedNote,
        actionText: copy.actionText || getUiCopy(locale).domains.schedule,
        actionHref: copy.actionHref || 'schedule.html',
        stats: [
            { label: uiCopy.focusStats.upcoming, value: padCount(stats.upcoming), detail: getUiCopy(locale).domains.schedule },
            { label: uiCopy.focusStats.travel, value: padCount(stats.travel), detail: uiCopy.focusStats.events }
        ]
    }
}

function createQuickLinks(locale, dashboardCopy = {}, {
    favorites = {},
    settings = {},
    schedule = {},
    wardrobe = {}
}) {
    const copy = dashboardCopy.quickLinks || {}
    const uiCopy = getUiCopy(locale)
    const settingsLabels = getSettingsLabels(locale, settings)
    const leadWardrobe = wardrobe.recentItems?.[0]
    const favoriteStats = favorites.stats || {}
    const totalEvents = schedule.stats?.total || 0

    return {
        title: copy.title || '',
        items: [
            {
                key: 'wardrobe',
                icon: '□',
                label: copy.wardrobe?.label || uiCopy.domains.wardrobe,
                value: padCount(wardrobe.count),
                detail: leadWardrobe?.title || copy.wardrobe?.empty || '',
                href: copy.wardrobe?.href || 'wardrobe.html'
            },
            {
                key: 'favorites',
                icon: '♡',
                label: copy.favorites?.label || uiCopy.domains.favorites,
                value: padCount(favoriteStats.total),
                detail: formatCopy(uiCopy.me.quickLinks.favoriteDetail, {
                    looks: padCount(favoriteStats.looks),
                    posts: padCount(favoriteStats.posts)
                }),
                href: copy.favorites?.href || 'favorites.html'
            },
            {
                key: 'schedule',
                icon: '○',
                label: copy.schedule?.label || uiCopy.domains.schedule,
                value: padCount(totalEvents),
                detail: schedule.summary?.title || copy.schedule?.empty || '',
                href: copy.schedule?.href || 'schedule.html'
            },
            {
                key: 'settings',
                icon: '⚙',
                label: copy.settings?.label || uiCopy.domains.settings,
                value: settingsLabels.theme,
                detail: `${settingsLabels.layout} · ${settingsLabels.unit}`,
                href: copy.settings?.href || 'settings.html'
            }
        ]
    }
}

function createFavoriteRecentItem(locale, favorites = {}) {
    const copy = getUiCopy(locale).me.recent
    const item = favorites.looks?.[0] || favorites.posts?.[0]
    if (!item) return null

    return {
        key: `favorite-${item.id || item.title || 'item'}`,
        type: copy.favoriteType,
        title: item.title || copy.favoriteTitle,
        meta: item.subtitle || copy.favoriteMeta,
        href: 'favorites.html'
    }
}

function createRecentView(locale, dashboardCopy = {}, {
    favorites = {},
    schedule = {},
    wardrobe = {}
}) {
    const copy = dashboardCopy.recent || {}
    const uiCopy = getUiCopy(locale).me.recent
    const leadWardrobe = wardrobe.recentItems?.[0]
    const favoriteItem = createFavoriteRecentItem(locale, favorites)
    const items = [
        schedule.summary ? {
            key: 'schedule-next',
            type: uiCopy.scheduleType,
            title: schedule.summary.title,
            meta: joinMeta([schedule.summary.time, schedule.summary.location]),
            href: 'schedule.html'
        } : null,
        leadWardrobe ? {
            key: `wardrobe-${leadWardrobe.id || leadWardrobe.title}`,
            type: uiCopy.wardrobeType,
            title: leadWardrobe.title,
            meta: joinMeta([leadWardrobe.category, leadWardrobe.color, leadWardrobe.material]),
            href: 'wardrobe.html'
        } : null,
        favoriteItem
    ].filter(Boolean)

    return {
        title: copy.title || '',
        emptyTitle: copy.emptyTitle || '',
        emptyMeta: copy.emptyMeta || '',
        items
    }
}

export function createMePageContract({
    locale,
    content,
    profile,
    favorites,
    settings,
    schedule,
    wardrobe,
    syncStates = {}
}) {
    const dashboardCopy = content.dashboard || {}
    const sync = createSyncSemantics(syncStates, ['profile', 'favorites', 'wardrobe', 'settings', 'schedule'])

    return {
        state: {
            activeSurface: 'overview'
        },
        derivedView: {
            hero: {
                ...(content.profile || {}),
                ...profile,
                label: content.profile?.label
            },
            dashboard: {
                focus: createFocusView(locale, dashboardCopy, schedule),
                quickLinks: createQuickLinks(locale, dashboardCopy, {
                    favorites,
                    settings,
                    schedule,
                    wardrobe
                }),
                recent: createRecentView(locale, dashboardCopy, {
                    favorites,
                    schedule,
                    wardrobe
                })
            }
        },
        actions: {
            openSchedule: { type: 'navigation', retryable: false },
            openFavorites: { type: 'navigation', retryable: false },
            openWardrobe: { type: 'navigation', retryable: false },
            openSettings: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: {
            kind: 'notApplicable',
            active: false
        },
        error: createErrorSemantics(sync),
        sync
    }
}
