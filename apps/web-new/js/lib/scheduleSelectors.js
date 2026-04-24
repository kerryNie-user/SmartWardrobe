function countEvents(groups = []) {
    return groups.reduce((total, group) => total + group.events.length, 0)
}

export function selectScheduleOverview(activeTab, scheduleState) {
    const overview = scheduleState[activeTab].overview
    return {
        ...overview,
        value: String(countEvents(scheduleState[activeTab].groups)).padStart(2, '0')
    }
}

export function selectScheduleDeleteCandidate(scheduleState, activeTab, eventId) {
    const scheduleEvent = scheduleState[activeTab]?.groups
        ?.flatMap((group) => group.events)
        .find((candidate) => candidate.id === eventId)

    return scheduleEvent ? { id: eventId, title: scheduleEvent.title } : { id: eventId, title: eventId }
}

export function selectScheduleDeleteDialogCopy(locale, deleteCandidate, sharedCopy) {
    return {
        eyebrow: locale === 'zh-CN' ? '删除确认' : 'Confirm Delete',
        title: locale === 'zh-CN' ? '确定删除这条日程吗？' : 'Delete this schedule entry?',
        description: locale === 'zh-CN'
            ? `你将删除「${deleteCandidate.title}」，该操作无法撤销。`
            : `You are about to delete “${deleteCandidate.title}”. This cannot be undone.`,
        cancelLabel: sharedCopy.actions.cancel,
        confirmLabel: sharedCopy.actions.delete
    }
}

export function buildSchedulePageSelectorInput({
    locale,
    activeTab,
    content,
    scheduleState,
    deleteCandidate,
    sharedCopy,
    syncStates = {}
}) {
    return {
        locale,
        activeTab,
        content,
        scheduleState,
        deleteCandidate,
        overview: selectScheduleOverview(activeTab, scheduleState),
        deleteDialogCopy: deleteCandidate ? selectScheduleDeleteDialogCopy(locale, deleteCandidate, sharedCopy) : null,
        syncStates
    }
}
