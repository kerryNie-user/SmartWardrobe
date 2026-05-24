import {
    PANEL_IDS,
    buildTabState,
    createCollectionEmpty,
    createErrorSemantics,
    createLoadingSemantics,
    createStaticEmpty,
    createSyncSemantics
} from './shared.js'
import { getUiCopy } from '../locale.js'

export function createSchedulePageContract({
    activeTab,
    content,
    scheduleState,
    deleteCandidate,
    syncStates = {}
}) {
    const tabs = buildTabState('upcoming', (content.tabs || []).filter((tab) => tab.key === 'upcoming'), 'ct-schedule-tab', PANEL_IDS.schedule)
    const upcomingView = scheduleState.upcoming || { groups: [], overview: {} }
    const archiveView = scheduleState.archive || { groups: [], overview: {} }
    const countEvents = (groups = []) => groups.reduce((total, group) => total + group.events.length, 0)
    const sync = createSyncSemantics(syncStates, ['schedule'])
    return {
        state: {
            tab: 'upcoming',
            deleteCandidate
        },
        derivedView: {
            tabs,
            overview: {
                ...upcomingView.overview,
                value: String(countEvents(upcomingView.groups)).padStart(2, '0')
            },
            timelineGroups: upcomingView.groups,
            historyGroups: archiveView.groups,
            historyCount: countEvents(archiveView.groups),
            deleteDialog: {
                visible: Boolean(deleteCandidate),
                candidate: deleteCandidate
            }
        },
        actions: {
            toggleReminder: { type: 'domain', optimistic: true, rollback: true, retryable: true },
            requestDelete: { type: 'ui', needsConfirm: true, retryable: false },
            confirmDelete: { type: 'domain', optimistic: true, rollback: true, retryable: true },
            openCreateEvent: { type: 'navigation', retryable: false },
            openEditEvent: { type: 'navigation', retryable: false }
        },
        loading: createLoadingSemantics(sync),
        empty: createCollectionEmpty(upcomingView.groups.flatMap((group) => group.events), 'upcoming'),
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
    const copy = getUiCopy(locale)
    return {
        state: {
            eventId,
            isEditing
        },
        derivedView: {
            content,
            event: activeEvent,
            topbar: {
                leftLabel: copy.topbar.backToSchedule,
                leftHref: 'schedule.html',
                rightLabel: copy.topbar.openProfile,
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
