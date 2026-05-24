import { formatCopy, getUiCopy } from './locale.js'
import { deriveScheduleCollections } from './scheduleDate.js'

function countEvents(groups = []) {
    return groups.reduce((total, group) => total + group.events.length, 0)
}

function resolveViews(scheduleState, views) {
    if (views && typeof views === 'object') return views
    if (scheduleState?.views && typeof scheduleState.views === 'object') return scheduleState.views
    return {}
}

export function selectScheduleOverview(activeTab, scheduleState) {
    const views = resolveViews(scheduleState)
    const current = views[activeTab] || views.upcoming || {}
    const groups = deriveScheduleCollections({ views }, { locale: scheduleState?.locale || 'en-US' }).upcomingGroups
    return {
        ...(current.overview || {}),
        value: String(countEvents(groups)).padStart(2, '0')
    }
}

export function selectScheduleDeleteDialogCopy(locale, deleteCandidate, sharedCopy = { actions: {} }) {
    if (!deleteCandidate) return null
    const copy = getUiCopy(locale).schedule
    return {
        eyebrow: copy.deleteConfirmEyebrow,
        title: copy.deleteConfirmTitle,
        description: formatCopy(copy.deleteConfirmDescription, { title: deleteCandidate.title }),
        cancelLabel: sharedCopy.actions?.cancel || '',
        confirmLabel: sharedCopy.actions?.delete || ''
    }
}

export function selectScheduleDeleteCandidate(scheduleState, activeTabOrEventId, maybeEventId) {
    const eventId = maybeEventId || activeTabOrEventId
    const views = resolveViews(scheduleState)
    const collections = deriveScheduleCollections({ views }, { locale: scheduleState?.locale || 'en-US' })
    for (const event of collections.allEvents) {
        if (event.id === eventId) return event
    }
    for (const tabKey in views) {
        const fallbackState = views[tabKey] || {}
        const fallbackGroups = fallbackState.groups || []
        for (const group of fallbackGroups) {
            const found = group.events.find(e => e.id === eventId);
            if (found) return found;
        }
    }
    return null;
}

export function selectScheduleView({ locale, activeTab, tabs, views, scheduleState, deleteCandidate, sharedCopy }) {
    const resolvedViews = resolveViews(scheduleState, views)
    const currentView = resolvedViews.upcoming || resolvedViews[activeTab] || {}
    const collections = deriveScheduleCollections({ views: resolvedViews }, { locale })
    const copy = getUiCopy(locale).schedule

    return {
        tabs: (tabs || []).filter((tab) => tab.key === 'upcoming').map(tab => ({
            ...tab,
            active: true
        })),
        overview: {
            ...(currentView.overview || {}),
            title: copy.upcomingTitle || currentView.overview?.title,
            note: copy.upcomingWindowNote || currentView.overview?.note,
            value: String(countEvents(collections.upcomingGroups)).padStart(2, '0')
        },
        groups: collections.upcomingGroups,
        historyGroups: collections.historyGroups,
        historyCount: collections.historyEvents.length,
        deleteDialogCopy: selectScheduleDeleteDialogCopy(locale, deleteCandidate, sharedCopy),
        emptyStateCopy: {
            title: getUiCopy(locale).schedule.empty.title,
            description: getUiCopy(locale).schedule.empty.description,
            action: getUiCopy(locale).schedule.empty.action
        }
    }
}
