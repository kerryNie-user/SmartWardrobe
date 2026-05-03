import { buildHomeRecommendationInput, selectAlternativeLooks, selectHomeLookById, selectHomeLooksByTab } from '../lib/homeSelectors.js'

export function getOutfitDetailContent(locale, id, recommendationInput = {}) {
    const looks = [
        ...selectHomeLooksByTab({ locale, activeTab: 'recommend' }),
        ...selectHomeLooksByTab({ locale, activeTab: 'featured' })
    ]
    const activeLook = selectHomeLookById(locale, id)
    const input = buildHomeRecommendationInput({
        locale,
        ...recommendationInput
    })

    return {
        activeLook,
        looks,
        alternativeLooks: selectAlternativeLooks(input, activeLook.id)
    }
}
