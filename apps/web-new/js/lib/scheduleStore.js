import { getScheduleContent } from '../data/schedule.js'
import { createScheduleLocalRepository } from './scheduleLocalRepository.js'
import { createScheduleRemoteRepository } from './scheduleRemoteRepository.js'
import { createScheduleService, getSortedTimelineEntries, normalizeEvent, removeEventFromState, upsertEventGroup } from './scheduleService.js'
import { createSyncController } from './syncState.js'
import { getCurrentUserScope } from './userScopedStorage.js'

const SCHEDULE_TABS = ['upcoming', 'travel', 'archive']
const scheduleListeners = new Set()
const scheduleSyncController = createSyncController()

function clone(value) {
    return JSON.parse(JSON.stringify(value))
}

function createSeed(locale) {
    return clone(getScheduleContent(locale).views)
}

function countEvents(groups) {
    return groups.reduce((total, group) => total + group.events.length, 0)
}

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

export function getScheduleState(locale = 'en-US', scope = getCurrentUserScope()) {
    const storedTabs = scheduleLocalRepository.read(locale, scope)
    const seed = createSeed(locale)

    return SCHEDULE_TABS.reduce((state, key) => {
        state[key] = {
            ...seed[key],
            groups: clone(storedTabs[key].groups)
        }
        return state
    }, {})
}

export function createScheduleEvent(input, locale = 'en-US') {
    const scope = getCurrentUserScope()
    const state = getScheduleState(locale, scope)
    const tab = SCHEDULE_TABS.includes(input.tab) ? input.tab : 'upcoming'
    const nextEvent = normalizeEvent({
        id: `${tab}-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        time: input.time,
        title: input.title,
        location: input.location,
        image: input.image,
        tags: input.tags,
        reminderEnabled: Boolean(input.reminderEnabled),
        version: 1,
        updatedAt: Date.now()
    })

    state[tab].groups = upsertEventGroup(
        state[tab].groups,
        nextEvent,
        input.day,
        input.label
    )

    scheduleLocalRepository.write(state, locale, scope)
    notifyScheduleStore(locale)
    void scheduleService.create({
        ...nextEvent,
        day: input.day,
        label: input.label,
        tab
    }, locale, scope)
    return getScheduleState(locale, scope)
}

export function deleteScheduleEvent(tab, eventId, locale = 'en-US') {
    const scope = getCurrentUserScope()
    const previousState = getScheduleState(locale, scope)
    const state = getScheduleState(locale, scope)
    const targetTab = SCHEDULE_TABS.includes(tab) ? tab : 'upcoming'

    removeEventFromState(state, targetTab, eventId)

    scheduleLocalRepository.write(state, locale, scope)
    notifyScheduleStore(locale)
    void scheduleService.remove(eventId, previousState, locale, scope)
    return getScheduleState(locale, scope)
}

export function getScheduleEventById(eventId, locale = 'en-US') {
    const state = getScheduleState(locale)
    return getSortedTimelineEntries(state).find((event) => event.id === eventId) || null
}

export function updateScheduleEvent(eventId, input, locale = 'en-US') {
    const scope = getCurrentUserScope()
    const existing = getScheduleEventById(eventId, locale)
    if (!existing) return getScheduleState(locale)

    const previousState = getScheduleState(locale, scope)
    const state = getScheduleState(locale, scope)
    const targetTab = SCHEDULE_TABS.includes(input.tab) ? input.tab : existing.tab
    const nextEvent = normalizeEvent({
        ...existing,
        ...input,
        id: eventId,
        tab: targetTab
    })

    removeEventFromState(state, existing.tab, eventId)
    state[targetTab].groups = upsertEventGroup(state[targetTab].groups, nextEvent, input.day || existing.day, input.label || existing.label)

    scheduleLocalRepository.write(state, locale, scope)
    notifyScheduleStore(locale)
    void scheduleService.update(eventId, nextEvent, previousState, locale, scope)
    return getScheduleState(locale, scope)
}

export function toggleScheduleReminder(eventId, locale = 'en-US') {
    const existing = getScheduleEventById(eventId, locale)
    if (!existing) return null

    updateScheduleEvent(eventId, {
        ...existing,
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
    const nextEvent = getSortedTimelineEntries(state)[0]

    if (!nextEvent) {
        return null
    }

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

    return {
        upcoming: countEvents(state.upcoming.groups),
        travel: countEvents(state.travel.groups),
        archive: countEvents(state.archive.groups),
        total: SCHEDULE_TABS.reduce((total, key) => total + countEvents(state[key].groups), 0)
    }
}

export function getScheduleFeed(limit = 3, locale = 'en-US') {
    const state = getScheduleState(locale)

    return getSortedTimelineEntries(state)
        .slice(0, limit)
}

export async function hydrateSchedule(locale = 'en-US') {
    return scheduleService.hydrate(locale, getCurrentUserScope())
}

export function getScheduleSyncState() {
    return scheduleSyncController.getState()
}

export function subscribeScheduleSyncState(listener) {
    return scheduleSyncController.subscribe(listener)
}

export function retryScheduleSync(locale = 'en-US') {
    return scheduleService.retry(locale, getCurrentUserScope())
}
