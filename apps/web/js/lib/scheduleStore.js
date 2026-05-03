import { createScheduleRemoteRepository } from './scheduleRemoteRepository.js'
import { createScheduleLocalRepository } from './scheduleLocalRepository.js'
import { createScheduleService } from './scheduleService.js'
import { createSyncController } from './syncState.js'

const SCHEDULE_TABS = ['upcoming', 'travel', 'archive']
const scheduleListeners = new Set()
const scheduleSyncController = createSyncController()

function notifyScheduleStore(locale) {
    const nextState = getScheduleState(locale)
    scheduleListeners.forEach((listener) => listener(nextState))
}

const scheduleLocalRepository = createScheduleLocalRepository()
const scheduleRemoteRepository = createScheduleRemoteRepository()
const scheduleService = createScheduleService({
    localRepository: scheduleLocalRepository,
    remoteRepository: scheduleRemoteRepository,
    syncController: scheduleSyncController,
    onStateChange: (locale) => notifyScheduleStore(locale)
})

export function getScheduleState(locale = 'en-US') {
    const s = scheduleService.getState()
    const fallback = {
        tabs: [
            { key: 'upcoming', label: 'Upcoming', active: true },
            { key: 'travel', label: 'Travel', active: false },
            { key: 'archive', label: 'Archive', active: false }
        ],
        views: {
            upcoming: { groups: [] },
            travel: { groups: [] },
            archive: { groups: [] }
        },
        form: { labels: {}, placeholders: {}, actions: {}, fallback: {} }
    }
    if (!s) return fallback
    return {
        ...fallback,
        ...s,
        tabs: s.tabs || fallback.tabs,
        views: s.views || fallback.views,
        form: s.form || fallback.form
    }
}

export async function createScheduleEvent(input, locale = 'en-US') {
    const tab = SCHEDULE_TABS.includes(input.tab) ? input.tab : 'upcoming'
    const nextEvent = {
        id: `${tab}-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        time: input.time,
        title: input.title,
        location: input.location,
        image: input.image,
        tags: input.tags,
        reminderEnabled: Boolean(input.reminderEnabled),
        version: 1,
        updatedAt: Date.now(),
        day: input.day,
        label: input.label,
        tab
    }

    await scheduleService.create(nextEvent, locale)
    return getScheduleState(locale)
}

export async function deleteScheduleEvent(tab, eventId, locale = 'en-US') {
    await scheduleService.remove(eventId, locale)
    return getScheduleState(locale)
}

export function getScheduleEventById(eventId, locale = 'en-US') {
    const state = getScheduleState(locale)
    for (const tab of SCHEDULE_TABS) {
        for (const group of state.views[tab]?.groups || []) {
            const event = group.events.find((e) => e.id === eventId)
            if (event) return { ...event, tab, day: group.day, label: group.label }
        }
    }
    return null
}

export async function updateScheduleEvent(eventId, input, locale = 'en-US') {
    const existing = getScheduleEventById(eventId, locale)
    if (!existing) return getScheduleState(locale)

    const targetTab = SCHEDULE_TABS.includes(input.tab) ? input.tab : existing.tab
    const nextEvent = {
        ...existing,
        ...input,
        id: eventId,
        tab: targetTab
    }

    await scheduleService.update(eventId, nextEvent, locale)
    return getScheduleState(locale)
}

export async function toggleScheduleReminder(eventId, locale = 'en-US') {
    const existing = getScheduleEventById(eventId, locale)
    if (!existing) return null

    const targetTab = SCHEDULE_TABS.includes(existing.tab) ? existing.tab : 'upcoming'
    await updateScheduleEvent(eventId, {
        ...existing,
        tab: targetTab,
        reminderEnabled: !existing.reminderEnabled
    }, locale)

    return getScheduleEventById(eventId, locale)
}

export function subscribeScheduleStore(listener) {
    scheduleListeners.add(listener)
    return () => {
        scheduleListeners.delete(listener)
    }
}

export function getScheduleSummary(locale = 'en-US') {
    const state = getScheduleState(locale)
    let nextEvent = null
    let nextTime = Infinity

    for (const tab of SCHEDULE_TABS) {
        for (const group of state.views[tab]?.groups || []) {
            for (const event of group.events) {
                const match = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
                if (match) {
                    let hours = parseInt(match[1], 10)
                    const minutes = parseInt(match[2], 10)
                    const ampm = match[3].toUpperCase()
                    if (ampm === 'PM' && hours < 12) hours += 12
                    if (ampm === 'AM' && hours === 12) hours = 0
                    
                    const eventTime = hours * 60 + minutes
                    if (eventTime < nextTime) {
                        nextTime = eventTime
                        nextEvent = event
                    }
                } else if (!nextEvent) {
                    nextEvent = event
                }
            }
        }
    }

    if (!nextEvent) return null

    return {
        title: nextEvent.title,
        time: nextEvent.time,
        location: nextEvent.location,
        day: nextEvent.day,
        label: nextEvent.label,
        tab: nextEvent.tab
    }
}

export function getScheduleStats(locale = 'en-US') {
    const state = getScheduleState(locale)
    const countEvents = (groups) => (groups || []).reduce((total, group) => total + group.events.length, 0)

    return {
        upcoming: countEvents(state.views.upcoming?.groups),
        travel: countEvents(state.views.travel?.groups),
        archive: countEvents(state.views.archive?.groups),
        total: SCHEDULE_TABS.reduce((total, key) => total + countEvents(state.views[key]?.groups), 0)
    }
}

export function getScheduleFeed(limit = 3, locale = 'en-US') {
    const state = getScheduleState(locale)
    const feed = []
    
    for (const tab of SCHEDULE_TABS) {
        for (const group of state.views[tab]?.groups || []) {
            for (const event of group.events) {
                feed.push(event)
                if (feed.length >= limit) return feed
            }
        }
    }
    return feed
}

export async function hydrateSchedule(locale = 'en-US') {
    return scheduleService.hydrate(locale)
}

export function getScheduleSyncState() {
    return scheduleSyncController.getState()
}

export function subscribeScheduleSyncState(listener) {
    return scheduleSyncController.subscribe(listener)
}

export function retryScheduleSync(locale = 'en-US') {
    return scheduleService.retry(locale)
}
