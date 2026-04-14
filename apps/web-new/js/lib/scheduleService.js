import { getScheduleContent } from '../data/schedule.js'

const SCHEDULE_TABS = ['upcoming', 'travel', 'archive']

function clone(value) {
    return JSON.parse(JSON.stringify(value))
}

function createSeed(locale) {
    return clone(getScheduleContent(locale).views)
}

function normalizeEventTags(tags) {
    return Array.isArray(tags) ? tags : []
}

function normalizeEvent(event) {
    return {
        ...event,
        tags: normalizeEventTags(event.tags),
        reminderEnabled: Boolean(event.reminderEnabled),
        version: Number(event.version || 1),
        updatedAt: Number(event.updatedAt || Date.now())
    }
}

function parseTimeValue(time = '') {
    const match = time.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i)
    if (!match) return Number.MAX_SAFE_INTEGER

    let hours = Number(match[1])
    const minutes = Number(match[2])
    const meridiem = match[3]?.toUpperCase()

    if (meridiem === 'PM' && hours < 12) hours += 12
    if (meridiem === 'AM' && hours === 12) hours = 0

    return (hours * 60) + minutes
}

function getTimelineEntries(groups, tab) {
    return groups.flatMap((group) => group.events.map((event) => ({
        ...normalizeEvent(event),
        day: group.day,
        label: group.label,
        tab
    })))
}

function getSortedTimelineEntries(state) {
    return SCHEDULE_TABS
        .flatMap((tab) => getTimelineEntries(state[tab].groups, tab))
        .sort((left, right) => {
            const dayDelta = Number(left.day || 0) - Number(right.day || 0)
            if (dayDelta !== 0) return dayDelta

            const timeDelta = parseTimeValue(left.time) - parseTimeValue(right.time)
            if (timeDelta !== 0) return timeDelta

            return SCHEDULE_TABS.indexOf(left.tab) - SCHEDULE_TABS.indexOf(right.tab)
        })
}

function upsertEventGroup(groups, nextEvent, day, label) {
    const nextGroups = clone(groups)
    const existingGroup = nextGroups.find((group) => group.day === day && group.label === label)

    if (existingGroup) {
        existingGroup.events.unshift(normalizeEvent(nextEvent))
        return nextGroups
    }

    return [
        {
            day,
            label,
            events: [normalizeEvent(nextEvent)]
        },
        ...nextGroups
    ]
}

function removeEventFromState(state, tab, eventId) {
    state[tab].groups = state[tab].groups
        .map((group) => ({
            ...group,
            events: group.events.filter((item) => item.id !== eventId)
        }))
        .filter((group) => group.events.length)
}

function buildTabsFromItems(items, locale) {
    const seed = createSeed(locale)
    const state = SCHEDULE_TABS.reduce((tabs, key) => {
        tabs[key] = {
            groups: []
        }
        return tabs
    }, {})

    const sortedItems = [...items].sort((left, right) => {
        const tabDelta = SCHEDULE_TABS.indexOf(left.tab || 'upcoming') - SCHEDULE_TABS.indexOf(right.tab || 'upcoming')
        if (tabDelta !== 0) return tabDelta
        const dayDelta = Number(left.day || 0) - Number(right.day || 0)
        if (dayDelta !== 0) return dayDelta
        return parseTimeValue(left.time) - parseTimeValue(right.time)
    })

    sortedItems.forEach((item) => {
        const tab = SCHEDULE_TABS.includes(item.tab) ? item.tab : 'upcoming'
        state[tab].groups = upsertEventGroup(
            state[tab].groups,
            normalizeEvent(item),
            item.day || seed[tab].groups[0]?.day || '',
            item.label || seed[tab].groups[0]?.label || ''
        )
    })

    return state
}

function replaceScheduleFromItems(localRepository, items, locale, scope) {
    const nextTabs = buildTabsFromItems(items, locale)
    localRepository.write(nextTabs, locale, scope)
    return localRepository.read(locale, scope)
}

export function createScheduleService({
    localRepository,
    remoteRepository,
    syncController,
    onStateChange = () => {}
}) {
    let pendingMutation = null

    return {
        async hydrate(locale = 'en-US', scope) {
            syncController.markLoading()
            const remote = await remoteRepository.fetch()
            if (!remote.ok || !Array.isArray(remote.data?.items)) {
                syncController.markStale(remote.error)
                return localRepository.read(locale, scope)
            }

            const nextState = replaceScheduleFromItems(localRepository, remote.data.items, locale, scope)
            onStateChange(locale)
            syncController.markSynced()
            return nextState
        },

        async create(payload, locale = 'en-US', scope) {
            pendingMutation = {
                kind: 'create',
                payload,
                locale
            }
            syncController.markSyncing()
            const response = await remoteRepository.create(payload)
            if (!response.ok) {
                syncController.markFailed(response.error)
                return null
            }

            const items = getSortedTimelineEntries(localRepository.read(locale, scope))
                .filter((event) => event.id !== payload.id)
            items.push(normalizeEvent(response.data?.item || payload))
            const nextState = replaceScheduleFromItems(localRepository, items, locale, scope)
            pendingMutation = null
            onStateChange(locale)
            syncController.markSynced()
            return nextState
        },

        async remove(eventId, previousState, locale = 'en-US', scope) {
            pendingMutation = {
                kind: 'delete',
                eventId,
                locale
            }
            syncController.markSyncing()
            const response = await remoteRepository.remove(eventId)
            if (!response.ok) {
                localRepository.write(previousState, locale, scope)
                onStateChange(locale)
                syncController.markFailed(response.error)
                return null
            }

            const nextState = localRepository.read(locale, scope)
            SCHEDULE_TABS.forEach((tab) => removeEventFromState(nextState, tab, eventId))
            localRepository.write(nextState, locale, scope)
            pendingMutation = null
            onStateChange(locale)
            syncController.markSynced()
            return localRepository.read(locale, scope)
        },

        async update(eventId, nextEvent, previousState = localRepository.read(), locale = 'en-US', scope) {
            pendingMutation = {
                kind: 'update',
                eventId,
                input: nextEvent,
                previousState,
                locale
            }
            syncController.markSyncing()
            const response = await remoteRepository.update(eventId, nextEvent)
            if (!response.ok) {
                if (response.kind === 'conflict') {
                    const remoteItem = response.data?.item || nextEvent
                    const mergedItems = getSortedTimelineEntries(previousState)
                        .filter((event) => event.id !== eventId)
                    mergedItems.push(normalizeEvent(remoteItem))
                    replaceScheduleFromItems(localRepository, mergedItems, locale, scope)
                    onStateChange(locale)
                    syncController.markConflict(remoteItem)
                    return null
                }

                localRepository.write(previousState, locale, scope)
                onStateChange(locale)
                syncController.markFailed(response.error)
                return null
            }

            const confirmedItem = normalizeEvent(response.data?.item || nextEvent)
            const items = getSortedTimelineEntries(localRepository.read(locale, scope))
                .filter((event) => event.id !== eventId)
            items.push(confirmedItem)
            const nextState = replaceScheduleFromItems(localRepository, items, locale, scope)
            pendingMutation = null
            onStateChange(locale)
            syncController.markSynced()
            return nextState
        },

        async retry(locale = 'en-US', scope) {
            if (!pendingMutation) {
                return this.hydrate(locale, scope)
            }

            if (pendingMutation.kind === 'create') {
                return this.create(pendingMutation.payload, pendingMutation.locale, scope)
            }

            if (pendingMutation.kind === 'delete') {
                return this.remove(
                    pendingMutation.eventId,
                    pendingMutation.previousState || localRepository.read(locale, scope),
                    pendingMutation.locale,
                    scope
                )
            }

            return this.update(
                pendingMutation.eventId,
                pendingMutation.input,
                pendingMutation.previousState || localRepository.read(locale, scope),
                pendingMutation.locale,
                scope
            )
        }
    }
}

export {
    buildTabsFromItems,
    getSortedTimelineEntries,
    normalizeEvent,
    removeEventFromState,
    upsertEventGroup
}
