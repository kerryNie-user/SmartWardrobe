import {
    PANEL_IDS,
    buildTabState,
    createCollectionEmpty,
    createErrorSemantics,
    createLoadingSemantics,
    createStaticEmpty,
    createSyncSemantics
} from './shared.js'

export function createSchedulePageContract({
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
