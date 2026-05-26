import { buildHomeRecommendationInput, selectAlternativeLooks, selectHomeLookById, selectHomeLooksByTab } from '../lib/homeSelectors.js'
import { getClosetTwinRecommendationLookById, getClosetTwinRecommendationLooks } from '../lib/closetTwinRecommendations.js'

export function getOutfitDetailContent(locale, id, recommendationInput = {}) {
    const closetTwinLooks = getClosetTwinRecommendationLooks()
    const looks = [
        ...closetTwinLooks,
        ...selectHomeLooksByTab({ locale, activeTab: 'recommend' }),
        ...selectHomeLooksByTab({ locale, activeTab: 'featured' })
    ]
    const activeLook = getClosetTwinRecommendationLookById(id) || selectHomeLookById(locale, id)
    const input = buildHomeRecommendationInput({
        locale,
        ...recommendationInput
    })
    const alternativeIds = new Set([activeLook.id])
    const alternativeLooks = [
        ...closetTwinLooks.filter((look) => look.id !== activeLook.id),
        ...selectAlternativeLooks(input, activeLook.id)
    ].filter((look) => {
        if (alternativeIds.has(look.id)) return false
        alternativeIds.add(look.id)
        return true
    })

    return {
        activeLook,
        looks,
        alternativeLooks
    }
}
