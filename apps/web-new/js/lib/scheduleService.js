import { getScheduleContent } from './liteBackendClient.js'

const DEFAULT_TABS = [
    { key: 'upcoming', label: 'Upcoming', active: true },
    { key: 'travel', label: 'Travel', active: false },
    { key: 'archive', label: 'Archive', active: false }
]

const EMPTY_FORM = { labels: {}, placeholders: {}, actions: {}, fallback: {} }

function normalizeEventRecord(event) {
    return {
        ...event,
        tags: Array.isArray(event?.tags) ? event.tags : [],
        reminderEnabled: Boolean(event?.reminderEnabled)
    }
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
}

function normalizeGroup(group) {
    const events = Array.isArray(group?.events) ? group.events : []
    return {
        ...group,
        events: events.map((event) => normalizeEventRecord(event))
    }
}

function normalizeView(view) {
    const groups = Array.isArray(view?.groups) ? view.groups : []
    return {
        ...view,
        groups: groups.map((group) => normalizeGroup(group))
    }
}

function normalizeViewWithKey(view, tabKey) {
    const groups = Array.isArray(view?.groups) ? view.groups : []
    let eventIndex = 1
    return {
        ...view,
        groups: groups.map((group) => {
            const events = Array.isArray(group?.events) ? group.events : []
            return {
                ...group,
                events: events.map((event) => {
                    const normalized = normalizeEventRecord(event)
                    const prefix = `${tabKey}-`
                    if (typeof normalized.id === 'string' && normalized.id.startsWith(prefix)) {
                        return normalized
                    }
                    const base = slugify(normalized.id || normalized.title || 'event')
                    const id = `${tabKey}-${base}-${eventIndex}`
                    eventIndex += 1
                    return { ...normalized, id }
                })
            }
        })
    }
}

function unwrapUserScopedSchedule(stored) {
    if (!stored || typeof stored !== 'object') return stored
    if (!stored.users || typeof stored.users !== 'object') return stored
    if (stored.users.guest !== undefined) return stored.users.guest
    const firstKey = Object.keys(stored.users)[0]
    return firstKey ? stored.users[firstKey] : null
}

function normalizeViews(views) {
    const normalized = {}
    const keys = ['upcoming', 'travel', 'archive']
    keys.forEach((key) => {
        normalized[key] = views && views[key] ? normalizeViewWithKey(views[key], key) : { groups: [] }
    })
    if (views && typeof views === 'object') {
        Object.keys(views).forEach((key) => {
            if (normalized[key]) return
            normalized[key] = normalizeViewWithKey(views[key], key)
        })
    }
    return normalized
}

function normalizeStoredSchedule(stored) {
    const unwrapped = unwrapUserScopedSchedule(stored)
    if (!unwrapped || typeof unwrapped !== 'object') return null

    if (unwrapped.views && typeof unwrapped.views === 'object') {
        return {
            ...unwrapped,
            views: normalizeViews(unwrapped.views),
            form: unwrapped.form || EMPTY_FORM
        }
    }

    const legacyTabs = ['upcoming', 'travel', 'archive']
    const hasLegacyViews = legacyTabs.some((key) => Boolean(unwrapped[key]))
    if (!hasLegacyViews) return null

    const legacyViews = {}
    legacyTabs.forEach((key) => {
        legacyViews[key] = unwrapped[key] ? normalizeView(unwrapped[key]) : { groups: [] }
    })

    return {
        ...unwrapped,
        views: legacyViews,
        form: unwrapped.form || EMPTY_FORM
    }
}

function normalizeEventPayload(evt) {
    return normalizeEventRecord({
        id: evt.id,
        tab: evt.tab,
        day: evt.day,
        label: evt.label,
        time: evt.time || '',
        title: evt.title || '',
        location: evt.location || '',
        image: evt.image || '',
        tags: evt.tags,
        reminderEnabled: evt.reminderEnabled,
        version: evt.version,
        updatedAt: evt.updatedAt
    })
}

function buildViewsFromItems(items = []) {
    const views = {
        upcoming: { groups: [] },
        travel: { groups: [] },
        archive: { groups: [] }
    }

    for (const item of Array.isArray(items) ? items : []) {
        const tab = item.tab || 'upcoming'
        if (!views[tab]) views[tab] = { groups: [] }
        const view = views[tab]
        const day = item.day || ''
        const label = item.label || ''
        let group = view.groups.find((g) => g.day === day && g.label === label)
        if (!group) {
            group = { day, label, events: [] }
            view.groups.push(group)
        }
        group.events.push(normalizeEventPayload(item))
    }

    return views
}

function mergeViews(contentViews = {}, eventViews = {}) {
    const keys = new Set([
        ...Object.keys(contentViews || {}),
        ...Object.keys(eventViews || {})
    ])
    const merged = {}

    for (const key of keys) {
        const fromContent = contentViews?.[key] || {}
        const fromEvents = eventViews?.[key] || {}
        merged[key] = {
            ...fromContent,
            ...fromEvents,
            groups: fromEvents.groups || []
        }
    }

    if (!merged.upcoming) merged.upcoming = { groups: [] }
    if (!merged.travel) merged.travel = { groups: [] }
    if (!merged.archive) merged.archive = { groups: [] }

    return merged
}

async function fetchScheduleContent(locale) {
    if (typeof window === 'undefined') return null
    const response = await getScheduleContent(locale)
    if (!response.ok) return null
    return response.data?.content || response.data || null
}

function withLegacyAliases(state) {
    if (!state || typeof state !== 'object') return state
    if (!state.views || typeof state.views !== 'object') return state
    return {
        ...state,
        upcoming: state.views.upcoming,
        travel: state.views.travel,
        archive: state.views.archive
    }
}

export function createScheduleService({
    locale = 'en-US',
    localRepository,
    remoteRepository,
    syncController,
    onStateChange = () => {}
}) {
    let currentState = null

    function readLocal(nextLocale = locale) {
        return normalizeStoredSchedule(localRepository?.read(nextLocale))
    }

    function ensureState(nextLocale = locale) {
        const local = readLocal(nextLocale)
        if (local) currentState = local
    }

    return {
        getState() {
            ensureState(locale)
            return currentState
        },

        async hydrate(nextLocale = locale) {
            syncController.markLoading()
            const localData = readLocal(nextLocale)

            const [content, itemsResponse] = await Promise.all([
                fetchScheduleContent(nextLocale),
                remoteRepository?.fetch ? remoteRepository.fetch() : Promise.resolve({ ok: false })
            ])

            if (!itemsResponse.ok) {
                syncController.markStale(itemsResponse.error)
                currentState = withLegacyAliases(localData || (content ? {
                    ...content,
                    views: normalizeViews(content.views || {}),
                    form: content.form || EMPTY_FORM,
                    tabs: content.tabs || DEFAULT_TABS
                } : null))
                if (currentState) onStateChange(nextLocale)
                return currentState
            }

            const eventViews = buildViewsFromItems(itemsResponse.data?.items || [])
            const mergedViews = mergeViews(content?.views, eventViews)
            currentState = withLegacyAliases({
                tabs: content?.tabs || localData?.tabs || DEFAULT_TABS,
                form: content?.form || localData?.form || EMPTY_FORM,
                views: mergedViews
            })

            localRepository?.write(currentState, nextLocale)
            onStateChange(nextLocale)
            syncController.markSynced()
            return currentState
        },

        async create(payload, nextLocale = locale) {
            ensureState(nextLocale)
            syncController.markSyncing()

            if (currentState && localRepository) {
                const targetTab = payload.tab || 'upcoming'
                const view = currentState.views?.[targetTab]
                if (view) {
                    let group = view.groups.find((g) => g.day === payload.day && g.label === payload.label)
                    if (!group) {
                        group = { day: payload.day, label: payload.label, events: [] }
                        view.groups.push(group)
                    }
                    group.events.push(normalizeEventPayload(payload))
                    localRepository.write(currentState, nextLocale)
                    onStateChange(nextLocale)
                }
            }

            const response = await remoteRepository.create(payload)
            if (!response.ok) {
                syncController.markFailed(response.error)
                return null
            }

            return this.hydrate(nextLocale)
        },

        async remove(eventId, nextLocale = locale) {
            ensureState(nextLocale)
            syncController.markSyncing()

            if (currentState && localRepository) {
                for (const tab in currentState.views) {
                    const view = currentState.views[tab]
                    for (const group of view.groups || []) {
                        const idx = group.events.findIndex((e) => e.id === eventId)
                        if (idx >= 0) {
                            group.events.splice(idx, 1)
                            localRepository.write(currentState, nextLocale)
                            onStateChange(nextLocale)
                            break
                        }
                    }
                }
            }

            const response = await remoteRepository.remove(eventId)
            if (!response.ok) {
                syncController.markFailed(response.error)
                return null
            }

            return this.hydrate(nextLocale)
        },

        async update(eventId, nextEvent, nextLocale = locale) {
            ensureState(nextLocale)
            syncController.markSyncing()

            if (currentState && localRepository) {
                for (const tab in currentState.views) {
                    const view = currentState.views[tab]
                    for (const group of view.groups || []) {
                        const idx = group.events.findIndex((e) => e.id === eventId)
                        if (idx >= 0) {
                            group.events.splice(idx, 1)
                            break
                        }
                    }
                }

                const targetTab = nextEvent.tab || 'upcoming'
                const view = currentState.views?.[targetTab]
                if (view) {
                    let group = view.groups.find((g) => g.day === nextEvent.day && g.label === nextEvent.label)
                    if (!group) {
                        group = { day: nextEvent.day, label: nextEvent.label, events: [] }
                        view.groups.push(group)
                    }
                    group.events.push(normalizeEventPayload(nextEvent))
                    localRepository.write(currentState, nextLocale)
                    onStateChange(nextLocale)
                }
            }

            const response = await remoteRepository.update(eventId, nextEvent)
            if (!response.ok) {
                if (response.kind === 'conflict') {
                    syncController.markConflict(response.data?.item || nextEvent)
                    return null
                }
                syncController.markFailed(response.error)
                return null
            }

            return this.hydrate(nextLocale)
        },

        async retry(nextLocale = locale) {
            return this.hydrate(nextLocale)
        }
    }
}
