function countEvents(groups = []) {
    return groups.reduce((total, group) => total + group.events.length, 0)
}

function resolveViews(scheduleState, views) {
    if (views && typeof views === 'object') return views
    if (scheduleState?.views && typeof scheduleState.views === 'object') return scheduleState.views
    if (scheduleState && typeof scheduleState === 'object') return scheduleState
    return {}
}

export function selectScheduleOverview(activeTab, scheduleState) {
    const views = resolveViews(scheduleState)
    const current = views[activeTab] || views.upcoming || {}
    const groups = current.groups || []
    return {
        ...(current.overview || {}),
        value: String(countEvents(groups)).padStart(2, '0')
    }
}

export function selectScheduleDeleteDialogCopy(locale, deleteCandidate, sharedCopy = { actions: {} }) {
    if (!deleteCandidate) return null
    return {
        eyebrow: locale === 'zh-CN' ? '删除确认' : 'Confirm Delete',
        title: locale === 'zh-CN' ? '确定删除这条日程吗？' : 'Delete this schedule entry?',
        description: locale === 'zh-CN'
            ? `你将删除「${deleteCandidate.title}」，该操作无法撤销。`
            : `You are about to delete “${deleteCandidate.title}”. This cannot be undone.`,
        cancelLabel: sharedCopy.actions?.cancel || (locale === 'zh-CN' ? '取消' : 'Cancel'),
        confirmLabel: sharedCopy.actions?.delete || (locale === 'zh-CN' ? '删除' : 'Delete')
    }
}

export function selectScheduleDeleteCandidate(scheduleState, activeTab, eventId) {
    const views = resolveViews(scheduleState)
    const currentState = views[activeTab] || views.upcoming || {}
    const groups = currentState.groups || []
    for (const group of groups) {
        const found = group.events.find(e => e.id === eventId);
        if (found) return found;
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
    const currentView = resolvedViews[activeTab] || resolvedViews.upcoming || {}
    const currentGroups = currentView.groups || []

    return {
        tabs: (tabs || []).map(tab => ({
            ...tab,
            active: tab.key === activeTab
        })),
        overview: selectScheduleOverview(activeTab, { views: resolvedViews }),
        groups: currentGroups,
        deleteDialogCopy: selectScheduleDeleteDialogCopy(locale, deleteCandidate, sharedCopy),
        emptyStateCopy: {
            title: locale === 'zh-CN' ? '暂无日程' : 'No Schedule Yet',
            description: locale === 'zh-CN' ? '开始添加你的第一个行程安排。' : 'Start adding your first itinerary.',
            action: locale === 'zh-CN' ? '添加日程' : 'Add Event'
        }
    }
}
