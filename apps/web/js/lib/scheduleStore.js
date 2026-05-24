import { createScheduleRemoteRepository } from './scheduleRemoteRepository.js'
import { createScheduleLocalRepository } from './scheduleLocalRepository.js'
import { createScheduleService } from './scheduleService.js'
import { createSyncController } from './syncState.js'
import { getUiCopy } from './locale.js'
import { deriveScheduleCollections, normalizeScheduleDateInput } from './scheduleDate.js'

const SCHEDULE_TABS = ['upcoming', 'travel', 'archive']
const scheduleListeners = new Set()
const scheduleSyncController = createSyncController()

function buildFallbackTabs(locale = 'en-US') {
    const copy = getUiCopy(locale).schedule.tabs || {}
    return SCHEDULE_TABS.map((key, index) => ({
        key,
        label: copy[key] || key,
        active: index === 0
    }))
}

function notifyScheduleStore(locale) {
    const nextState = getScheduleState(locale)
    scheduleListeners.forEach((listener) => listener(nextState))
}

function parseScheduleDateValue(event) {
    const match = String(event?.dateISO || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return Number.POSITIVE_INFINITY
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
}

function parseScheduleTimeValue(time = '') {
    const match = String(time || '').match(/(\d+):(\d+)\s*(AM|PM)?/i)
    if (!match) return Number.POSITIVE_INFINITY
    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const ampm = String(match[3] || '').toUpperCase()
    if (ampm === 'PM' && hours < 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    return hours * 60 + minutes
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
        tabs: buildFallbackTabs(locale),
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
    const tab = 'upcoming'
    const dateParts = normalizeScheduleDateInput(input, locale)
    const slug = String(input.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'event'
    const nextEvent = {
        id: `${tab}-${slug}-${Date.now()}`,
        time: input.time,
        title: input.title,
        location: input.location,
        image: input.image,
        tags: input.tags,
        reminderEnabled: Boolean(input.reminderEnabled),
        version: 1,
        updatedAt: Date.now(),
        day: dateParts?.day || input.day,
        label: dateParts?.label || input.label,
        dateISO: dateParts?.dateISO || input.dateISO || '',
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
            if (event) return { ...event, tab, day: group.day, label: group.label, dateISO: event.dateISO || group.dateISO || '' }
        }
    }
    return null
}

export async function updateScheduleEvent(eventId, input, locale = 'en-US') {
    const existing = getScheduleEventById(eventId, locale)
    if (!existing) return getScheduleState(locale)

    const dateParts = normalizeScheduleDateInput(input, locale)
    const nextEvent = {
        ...existing,
        ...input,
        id: eventId,
        tab: 'upcoming',
        day: dateParts?.day || input.day || existing.day,
        label: dateParts?.label || input.label || existing.label,
        dateISO: dateParts?.dateISO || input.dateISO || existing.dateISO || ''
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
    const nextEvent = deriveScheduleCollections(state, { locale }).upcomingEvents
        .slice()
        .sort((a, b) => {
            const dateDiff = parseScheduleDateValue(a) - parseScheduleDateValue(b)
            if (dateDiff !== 0) return dateDiff
            return parseScheduleTimeValue(a.time) - parseScheduleTimeValue(b.time)
        })[0] || null

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
    const collections = deriveScheduleCollections(state, { locale })

    return {
        upcoming: collections.upcomingEvents.length,
        travel: 0,
        archive: collections.historyEvents.length,
        history: collections.historyEvents.length,
        total: collections.allEvents.length
    }
}

export function getScheduleFeed(limit = 3, locale = 'en-US') {
    const state = getScheduleState(locale)
    return deriveScheduleCollections(state, { locale }).upcomingEvents.slice(0, limit)
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
