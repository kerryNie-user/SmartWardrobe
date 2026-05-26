import { recommendClosetTwinDaily } from './closetTwinClient.js'

let latestLooks = []
const listeners = new Set()

function normalizeArray(value) {
    return Array.isArray(value) ? value : []
}

function normalizeFavoriteIds(value) {
    if (Array.isArray(value)) return value
    if (value instanceof Set) return Array.from(value)
    return []
}

function normalizeWardrobeItem(item = {}) {
    const ai = item.ai || item.aiJson || item.ai_json || {}
    return {
        id: item.id || '',
        title: item.title || item.name || '',
        category: item.category || '',
        material: item.material || '',
        color: item.color || '',
        image: item.image || item.imageUrl || item.image_url || '',
        favorite: Boolean(item.favorite),
        ai: {
            tags: normalizeArray(ai.tags).map((tag) => String(tag || '').trim()).filter(Boolean),
            status: ai.status || '',
            source: ai.source || '',
            metadata: ai.metadata || {},
            raw: ai.raw || null
        }
    }
}

function normalizeScenario(input = {}) {
    const nextEvent = input.schedule?.nextEvent || null
    const scenario = input.schedule?.scenario || {}
    return {
        intent: scenario.intent || 'daily',
        label: scenario.label || nextEvent?.title || '',
        event: scenario.event || nextEvent || null,
        signals: scenario.signals || input.schedule?.signals || {}
    }
}

function normalizeWeather(weather = {}) {
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

export function buildClosetTwinDailyRecommendationPayload(input = {}) {
    const wardrobeItems = normalizeArray(input.wardrobe?.items || input.wardrobe?.recentItems).map(normalizeWardrobeItem)
    const favoriteIds = normalizeFavoriteIds(input.favorites?.lookIds || input.favorites?.favoriteIds)
    const scenario = normalizeScenario(input)
    const model1Items = wardrobeItems
        .filter((item) => item.ai.status || item.ai.source || item.ai.tags.length || item.ai.raw)
        .map((item) => ({
            itemId: item.id,
            source: item.ai.source || 'closettwin-model1',
            status: item.ai.status || '',
            tags: item.ai.tags,
            metadata: item.ai.metadata,
            raw: item.ai.raw
        }))

    return {
        context: {
            locale: input.locale || 'en-US',
            activeTab: input.activeTab || 'recommend'
        },
        scenario,
        weather: normalizeWeather(input.weather),
        schedule: {
            nextEvent: input.schedule?.nextEvent || null,
            signals: input.schedule?.signals || scenario.signals || {}
        },
        wardrobe: {
            totalCount: Number(input.wardrobe?.totalCount ?? wardrobeItems.length),
            recentItemIds: normalizeArray(input.wardrobe?.recentItems).map((item) => item.id).filter(Boolean),
            items: wardrobeItems
        },
        model1: {
            source: 'wardrobe-ai-json',
            items: model1Items,
            coverage: {
                totalItems: wardrobeItems.length,
                annotatedItems: model1Items.length
            },
            scenario
        },
        feedback: {
            savedLookIds: favoriteIds
        },
        settings: {
            language: input.settings?.language || input.locale || 'en-US',
            temperatureUnit: input.settings?.temperatureUnit || 'celsius',
            wardrobeLayout: input.settings?.wardrobeLayout || 'grid',
            outfitReminders: Boolean(input.settings?.outfitReminders)
        }
    }
}

function normalizeLook(item = {}, index = 0) {
    const id = item.id || item.outfitId || item.outfit_id || `closettwin-look-${index + 1}`
    const title = item.title || item.name || item.outfitName || item.outfit_name || 'ClosetTwin Recommendation'
    const description = item.description || item.reason || item.summary || ''
    return {
        id,
        tag: item.tag || item.label || 'ClosetTwin',
        title,
        description,
        image: item.image || item.imageUrl || item.image_url || item.previewImage || item.preview_image || '/uploads/shared/editorial-look-01.jpg',
        openLabel: item.openLabel || `Open ${title}`,
        detailSerial: item.detailSerial || item.serial || `Recommendation ID: ${id}`,
        detailTags: normalizeArray(item.detailTags || item.tags),
        breakdown: normalizeArray(item.breakdown || item.items).map((entry = {}) => ({
            title: entry.title || entry.name || '',
            meta: entry.meta || [entry.category, entry.color, entry.material].filter(Boolean).join(' • '),
            note: entry.note || entry.reason || ''
        })),
        source: 'closettwin-model2'
    }
}

function normalizeModel2Looks(payload = {}) {
    const data = payload.data || payload
    return normalizeArray(
        data.looks
        || data.recommendations
        || data.outfits
        || data.items
    ).map(normalizeLook)
}

function notify() {
    listeners.forEach((listener) => listener(latestLooks))
}

export function getClosetTwinRecommendationLooks() {
    return latestLooks.map((look) => ({ ...look }))
}

export function getClosetTwinRecommendationLookById(id) {
    const look = latestLooks.find((item) => item.id === id)
    return look ? { ...look } : null
}

export function subscribeClosetTwinRecommendations(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export async function hydrateClosetTwinRecommendations(input = {}) {
    const payload = buildClosetTwinDailyRecommendationPayload(input)
    const response = await recommendClosetTwinDaily(payload)
    if (!response.ok || !response.data?.ok) {
        latestLooks = []
        notify()
        return latestLooks
    }

    latestLooks = normalizeModel2Looks(response.data)
    notify()
    return getClosetTwinRecommendationLooks()
}
