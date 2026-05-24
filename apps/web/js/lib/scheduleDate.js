const DAY_MS = 24 * 60 * 60 * 1000
const UPCOMING_WINDOW_DAYS = 3

const EN_MONTHS = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12
}

const ZH_WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function pad2(value) {
    return String(value).padStart(2, '0')
}

function parseISODate(value) {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return null
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
    const date = new Date(year, month - 1, day)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null
    }
    return date
}

function resolveMonth(label = '') {
    const value = String(label || '')
    const zh = value.match(/(\d{1,2})\s*月/)
    if (zh) {
        const month = Number(zh[1])
        return month >= 1 && month <= 12 ? month : null
    }

    const en = value.match(/[A-Za-z]+/)
    if (!en) return null
    return EN_MONTHS[en[0].toLowerCase()] || null
}

function resolveYear(label = '', now = new Date()) {
    const match = String(label || '').match(/\b(20\d{2}|19\d{2})\b/)
    return match ? Number(match[1]) : now.getFullYear()
}

function resolveDay(dayValue, label = '') {
    const fromDay = String(dayValue || '').match(/\d{1,2}/)
    if (fromDay) return Number(fromDay[0])
    const fromLabel = String(label || '').match(/\b(\d{1,2})\b/)
    return fromLabel ? Number(fromLabel[1]) : null
}

export function formatScheduleDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function getDefaultScheduleDateISO(now = new Date()) {
    return formatScheduleDateKey(startOfDay(now))
}

export function resolveScheduleDate(event = {}, group = {}, now = new Date()) {
    const explicit = event.dateISO || event.eventDate || event.date || event.scheduledDate
    const explicitDate = parseISODate(explicit)
    if (explicitDate) {
        return {
            date: explicitDate,
            dateISO: formatScheduleDateKey(explicitDate),
            reliable: true
        }
    }

    const day = resolveDay(event.day || group.day, event.label || group.label)
    const month = resolveMonth(event.label || group.label)
    if (!day || !month) return null

    const year = resolveYear(event.label || group.label, now)
    const date = new Date(year, month - 1, day)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null
    }

    return {
        date,
        dateISO: formatScheduleDateKey(date),
        reliable: false
    }
}

export function isWithinUpcomingScheduleWindow(date, now = new Date()) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false
    const diff = Math.floor((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS)
    return diff >= 0 && diff < UPCOMING_WINDOW_DAYS
}

export function getScheduleArchiveTab(event = {}, group = {}, now = new Date()) {
    const resolved = resolveScheduleDate(event, group, now)
    if (!resolved) return event.tab === 'archive' || event.tab === 'travel' ? 'archive' : 'upcoming'
    return isWithinUpcomingScheduleWindow(resolved.date, now) ? 'upcoming' : 'archive'
}

export function formatScheduleDateParts(dateISO, locale = 'en-US') {
    const date = parseISODate(dateISO)
    if (!date) return null
    const day = pad2(date.getDate())
    if (locale === 'zh-CN') {
        return {
            day,
            label: `${date.getMonth() + 1}月 / ${ZH_WEEKDAYS[date.getDay()]}`,
            dateISO: formatScheduleDateKey(date)
        }
    }
    const month = date.toLocaleString('en-US', { month: 'short' })
    const weekday = date.toLocaleString('en-US', { weekday: 'short' })
    return {
        day,
        label: `${month} / ${weekday}`,
        dateISO: formatScheduleDateKey(date)
    }
}

export function normalizeScheduleDateInput(input = {}, locale = 'en-US', now = new Date()) {
    const explicitDate = parseISODate(input.dateISO || input.eventDate || input.date || input.scheduledDate)
    if (explicitDate) {
        return formatScheduleDateParts(formatScheduleDateKey(explicitDate), locale)
    }

    const resolved = resolveScheduleDate(input, input, now)
    if (resolved) {
        return formatScheduleDateParts(resolved.dateISO, locale)
    }

    return formatScheduleDateParts(getDefaultScheduleDateISO(now), locale)
}

function parseScheduleTimeValue(time = '') {
    const match = String(time || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (!match) return Number.POSITIVE_INFINITY
    let hours = Number(match[1])
    const minutes = Number(match[2])
    const meridiem = String(match[3] || '').toUpperCase()
    if (meridiem === 'PM' && hours < 12) hours += 12
    if (meridiem === 'AM' && hours === 12) hours = 0
    return hours * 60 + minutes
}

function groupScheduleEvents(events, locale = 'en-US') {
    const groups = []
    const index = new Map()

    events.forEach((event) => {
        const parts = event.dateISO ? formatScheduleDateParts(event.dateISO, locale) : null
        const day = parts?.day || event.day || ''
        const label = parts?.label || event.label || ''
        const groupKey = `${event.dateISO || ''}|${day}|${label}`
        if (!index.has(groupKey)) {
            index.set(groupKey, {
                day,
                label,
                dateISO: event.dateISO || '',
                events: []
            })
            groups.push(index.get(groupKey))
        }
        index.get(groupKey).events.push(event)
    })

    groups.forEach((group) => {
        group.events.sort((a, b) => {
            const dateA = resolveScheduleDate(a, group)?.date?.getTime() || Number.POSITIVE_INFINITY
            const dateB = resolveScheduleDate(b, group)?.date?.getTime() || Number.POSITIVE_INFINITY
            if (dateA !== dateB) return dateA - dateB
            return parseScheduleTimeValue(a.time) - parseScheduleTimeValue(b.time)
        })
    })

    groups.sort((a, b) => {
        const dateA = parseISODate(a.dateISO)?.getTime() || Number.POSITIVE_INFINITY
        const dateB = parseISODate(b.dateISO)?.getTime() || Number.POSITIVE_INFINITY
        if (dateA !== dateB) return dateA - dateB
        return String(a.day || '').localeCompare(String(b.day || ''), undefined, { numeric: true })
    })

    return groups
}

export function flattenScheduleEvents(scheduleState = {}, now = new Date()) {
    const views = scheduleState?.views || scheduleState || {}
    const events = []
    Object.keys(views || {}).forEach((tabKey) => {
        const view = views[tabKey] || {}
        ;(view.groups || []).forEach((group) => {
            ;(group.events || []).forEach((event) => {
                const resolved = resolveScheduleDate(event, group, now)
                events.push({
                    ...event,
                    tab: event.tab || tabKey,
                    sourceTab: tabKey,
                    day: event.day || group.day || '',
                    label: event.label || group.label || '',
                    dateISO: event.dateISO || resolved?.dateISO || ''
                })
            })
        })
    })
    return events
}

export function deriveScheduleCollections(scheduleState = {}, { locale = 'en-US', now = new Date() } = {}) {
    const upcomingEvents = []
    const historyEvents = []

    flattenScheduleEvents(scheduleState, now).forEach((event) => {
        const resolved = resolveScheduleDate(event, event, now)
        const normalizedEvent = {
            ...event,
            tab: resolved && isWithinUpcomingScheduleWindow(resolved.date, now) ? 'upcoming' : 'archive',
            dateISO: event.dateISO || resolved?.dateISO || ''
        }

        if (resolved && isWithinUpcomingScheduleWindow(resolved.date, now)) {
            upcomingEvents.push(normalizedEvent)
            return
        }

        historyEvents.push(normalizedEvent)
    })

    return {
        upcomingEvents,
        historyEvents,
        allEvents: [...upcomingEvents, ...historyEvents],
        upcomingGroups: groupScheduleEvents(upcomingEvents, locale),
        historyGroups: groupScheduleEvents(historyEvents, locale)
    }
}
