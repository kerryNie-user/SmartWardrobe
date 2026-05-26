import { getHomeContent } from '../data/home.js'

const LOOK_RULES = {
    'urban-commute': {
        dark: -8,
        light: 0,
        studio: 18,
        travel: 34,
        gallery: 4
    },
    'midnight-formalism': {
        dark: 34,
        light: 0,
        studio: 12,
        travel: 4,
        gallery: 10
    },
    'weekend-minimal': {
        dark: -4,
        light: 0,
        studio: 2,
        travel: 8,
        gallery: 28
    },
    'runway-analysis': {
        dark: 28,
        light: 0,
        studio: 26,
        travel: -2,
        gallery: 16
    },
    'atelier-notes': {
        dark: 16,
        light: 0,
        studio: 30,
        travel: -4,
        gallery: 12
    }
}

function getLookPool(locale) {
    const content = getHomeContent(locale)
    return [
        ...content.recommendLooks.map((look, index) => ({
            ...look,
            bucket: 'recommend',
            baseIndex: index
        })),
        ...content.featuredLooks.map((look, index) => ({
            ...look,
            bucket: 'featured',
            baseIndex: index
        }))
    ]
}

function normalizeArray(value) {
    return Array.isArray(value) ? value.filter((entry) => entry !== null && entry !== undefined) : []
}

function normalizeAiPayload(item = {}) {
    const payload = item.ai || item.aiJson || item.ai_json || {}
    return {
        status: payload.status || '',
        source: payload.source || '',
        tags: normalizeArray(payload.tags).map((tag) => String(tag || '').trim()).filter(Boolean),
        metadata: payload.metadata || {},
        raw: payload.raw || null
    }
}

function normalizeWardrobeItems(items = []) {
    return normalizeArray(items).map((item) => ({
        id: item.id,
        title: item.title || item.name || '',
        category: item.category || '',
        material: item.material || '',
        color: item.color || '',
        filter: item.filter || '',
        image: item.image || item.imageUrl || item.image_url || '',
        favorite: Boolean(item.favorite),
        ai: normalizeAiPayload(item)
    }))
}

function normalizeScheduleSignals(scheduleSummary) {
    const text = [
        scheduleSummary?.id,
        scheduleSummary?.title,
        scheduleSummary?.location,
        scheduleSummary?.time,
        ...(Array.isArray(scheduleSummary?.tags) ? scheduleSummary.tags : [])
    ].filter(Boolean).join(' ').toLowerCase()

    return {
        studio: /(studio|review|atelier|product|工作室|评审|复盘|工坊)/.test(text),
        travel: /(travel|terminal|flight|airport|出行|航站楼|机场)/.test(text),
        gallery: /(gallery|museum|weekend|画廊|周末|展览)/.test(text)
    }
}

function normalizeWardrobeSignals(wardrobe = {}) {
    const items = normalizeWardrobeItems(wardrobe.items || wardrobe.recentItems)
    const text = items
        .map((item) => [item.title, item.category, item.material, item.color, item.filter, ...item.ai.tags].join(' '))
        .join(' ')
        .toLowerCase()

    return {
        hasOuterwear: /(outerwear|coat|jacket|风衣|外套|大衣)/.test(text),
        hasDarkPalette: /(black|onyx|charcoal|midnight|graphite|黑|墨|炭)/.test(text),
        hasSoftTailoring: /(wool|merino|tailor|suit|羊毛|西装|剪裁)/.test(text),
        hasFavorites: items.some((item) => item.favorite)
    }
}

function getThemeMode(settings) {
    return settings?.themeMode === 'light' || settings?.['display-mode'] === 'light' ? 'light' : 'dark'
}

function normalizeFavoriteIds(favoriteIds) {
    if (Array.isArray(favoriteIds)) return favoriteIds
    if (favoriteIds instanceof Set) return Array.from(favoriteIds)
    return []
}

function normalizeWeatherContext(weather = {}) {
    const temperature = weather.temperature || {}
    const location = weather.location || {}
    return {
        condition: weather.condition || '',
        summary: weather.summary || '',
        temperature: {
            current: temperature.current || '',
            low: temperature.low || '',
            high: temperature.high || ''
        },
        location: {
            label: location.label || '',
            precision: location.precision || ''
        }
    }
}

function normalizeScheduleEvent(event = null) {
    if (!event) return null
    return {
        id: event.id || '',
        dateISO: event.dateISO || event.eventDate || event.date || event.scheduledDate || '',
        day: event.day || '',
        label: event.label || '',
        time: event.time || '',
        title: event.title || '',
        location: event.location || '',
        tags: normalizeArray(event.tags).map((tag) => String(tag || '').trim()).filter(Boolean),
        tab: event.tab || ''
    }
}

function normalizeUsageScenario(event) {
    const signals = normalizeScheduleSignals(event)
    let intent = 'daily'
    if (signals.travel) {
        intent = 'travel'
    } else if (signals.studio) {
        intent = 'studio'
    } else if (signals.gallery) {
        intent = 'gallery'
    } else if (event) {
        intent = 'event'
    }

    return {
        intent,
        label: event?.title || event?.location || '',
        event: event || null,
        signals
    }
}

export function buildHomeRecommendationInput({
    locale = 'en-US',
    activeTab = 'recommend',
    favorites = {},
    wardrobe = {},
    schedule = {},
    weather = {},
    settings = {}
} = {}) {
    const lookIds = normalizeFavoriteIds(favorites.lookIds || favorites.favoriteIds)
    const wardrobeItems = normalizeWardrobeItems(wardrobe.items || wardrobe.allItems || wardrobe.recentItems)
    const recentItems = normalizeWardrobeItems(wardrobe.recentItems || wardrobeItems).slice(0, 3)
    const nextEvent = normalizeScheduleEvent(schedule.nextEvent || schedule.summary || null)
    const totalCount = Number(wardrobe.totalCount ?? wardrobe.count ?? wardrobeItems.length)

    return {
        locale,
        activeTab,
        favorites: {
            lookIds
        },
        weather: normalizeWeatherContext(weather),
        wardrobe: {
            totalCount,
            items: wardrobeItems,
            recentItems,
            signals: normalizeWardrobeSignals({
                items: wardrobeItems.length ? wardrobeItems : recentItems
            })
        },
        schedule: {
            nextEvent,
            scenario: normalizeUsageScenario(nextEvent),
            signals: normalizeScheduleSignals(nextEvent)
        },
        settings: {
            themeMode: getThemeMode(settings),
            language: settings.language || locale,
            temperatureUnit: settings.temperatureUnit || settings['temperature-unit'] || 'celsius',
            wardrobeLayout: settings.wardrobeLayout || settings['wardrobe-layout'] || 'grid',
            outfitReminders: Boolean(settings.outfitReminders ?? settings['outfit-reminders'])
        }
    }
}

function scoreLook(look, signals) {
    const rules = LOOK_RULES[look.id] || {}
    let score = 100 - look.baseIndex
    const hasBehaviorSignal = Boolean(
        signals.favoriteIds.length
        || signals.schedule.studio
        || signals.schedule.travel
        || signals.schedule.gallery
    )

    if (signals.favoriteIds.includes(look.id)) {
        score -= 80
    }

    if (hasBehaviorSignal) {
        score += rules[signals.themeMode] || 0
    }

    if (signals.schedule.studio) score += rules.studio || 0
    if (signals.schedule.travel) score += rules.travel || 0
    if (signals.schedule.gallery) score += rules.gallery || 0
    if (hasBehaviorSignal && signals.wardrobe.hasOuterwear && look.id === 'urban-commute') score += 12
    if (hasBehaviorSignal && signals.wardrobe.hasDarkPalette && look.id === 'midnight-formalism') score += 18
    if (hasBehaviorSignal && signals.wardrobe.hasSoftTailoring && look.id === 'atelier-notes') score += 16
    if (hasBehaviorSignal && signals.wardrobe.hasFavorites && look.id === 'runway-analysis') score += 8
    if (hasBehaviorSignal && signals.outfitReminders && look.id === 'urban-commute') score += 6

    return score
}

export function selectHomeLooksByTab(input = {}) {
    const recommendationInput = buildHomeRecommendationInput(input)
    const signals = {
        favoriteIds: recommendationInput.favorites.lookIds,
        themeMode: recommendationInput.settings.themeMode,
        outfitReminders: recommendationInput.settings.outfitReminders,
        schedule: recommendationInput.schedule.signals,
        wardrobe: recommendationInput.wardrobe.signals
    }

    return getLookPool(recommendationInput.locale)
        .filter((look) => look.bucket === recommendationInput.activeTab)
        .map((look) => ({
            ...look,
            score: scoreLook(look, signals)
        }))
        .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score
            return left.baseIndex - right.baseIndex
        })
        .map(({ score, ...look }) => look)
}

export function selectHomeScheduleCard(locale = 'en-US', scheduleSummary = null) {
    const content = getHomeContent(locale)
    if (!scheduleSummary) {
        return content.schedule
    }

    return {
        ...content.schedule,
        title: scheduleSummary.title,
        time: scheduleSummary.time,
        location: scheduleSummary.location
    }
}

export function selectHomeLookById(locale = 'en-US', id) {
    const looks = getLookPool(locale)
    return looks.find((look) => look.id === id) || looks[0]
}

export function selectAlternativeLooks(input = {}, activeLookId, limit = 3) {
    const recommendationInput = buildHomeRecommendationInput(input)
    const mergedLooks = [
        ...selectHomeLooksByTab({
            ...recommendationInput,
            activeTab: 'recommend'
        }),
        ...selectHomeLooksByTab({
            ...recommendationInput,
            activeTab: 'featured'
        })
    ]

    const seen = new Set()
    return mergedLooks
        .filter((look) => look.id !== activeLookId)
        .filter((look) => {
            if (seen.has(look.id)) return false
            seen.add(look.id)
            return true
        })
        .slice(0, limit)
}

export function selectHomeView(input = {}) {
    const recommendationInput = buildHomeRecommendationInput(input)
    const content = getHomeContent(recommendationInput.locale)
    return {
        input: recommendationInput,
        content,
        weather: content.weather,
        scheduleCard: selectHomeScheduleCard(recommendationInput.locale, recommendationInput.schedule.nextEvent),
        looks: selectHomeLooksByTab(recommendationInput)
    }
}
