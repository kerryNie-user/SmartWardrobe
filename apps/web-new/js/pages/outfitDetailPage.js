import { renderTopbar } from '../components/topbar.js'
import { renderOutfitDetailPanel } from '../components/outfitDetailPanel.js'
import { getOutfitDetailContent } from '../data/outfitDetail.js'
import { dispatchAction } from '../lib/actions/dispatchAction.js'
import {
    buildAddOutfitToScheduleAction,
    buildShowAlternativesAction,
    buildToggleSaveLookAction
} from '../lib/actions/outfitDetailActions.js'
import { applyLocaleDocument, getLocale } from '../lib/locale.js'
import { buildHomeRecommendationInput } from '../lib/homeSelectors.js'
import { getQueryParam } from '../lib/navigationAdapter.js'
import { bindPageStores } from '../lib/pageStoreBinding.js'
import { getFavoriteIds, hydrateFavorites, isFavorite, subscribeFavoritesStore, toggleFavorite } from '../lib/favoritesStore.js'
import { navigateTo } from '../lib/navigation.js'
import { getScheduleSummary, hydrateSchedule, subscribeScheduleStore } from '../lib/scheduleStore.js'
import { saveScheduleDraft } from '../lib/scheduleDraft.js'
import { getSettingsState, hydrateSettings, subscribeSettingsStore } from '../lib/settingsStore.js'
import { getRecentWardrobeItems, getWardrobeCount, hydrateWardrobe, subscribeWardrobeStore } from '../lib/wardrobeStore.js'

function getLookId() {
    return getQueryParam('id')
}

function buildRecommendationInput(locale) {
    return buildHomeRecommendationInput({
        locale,
        favorites: {
            lookIds: getFavoriteIds('looks')
        },
        wardrobe: {
            totalCount: getWardrobeCount(locale),
            recentItems: getRecentWardrobeItems(3, locale)
        },
        schedule: {
            nextEvent: getScheduleSummary(locale)
        },
        settings: getSettingsState()
    })
}

export function renderOutfitDetailPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]')
    const detailRoot = document.querySelector('[data-ct-outfit-detail]')
    let showAlternatives = false

    const paint = () => {
        const locale = getLocale()
        const recommendationInput = buildRecommendationInput(locale)
        const { activeLook, alternativeLooks } = getOutfitDetailContent(locale, getLookId(), recommendationInput)
        if (!detailRoot) return
        applyLocaleDocument('outfitDetail', locale)

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: locale === 'zh-CN' ? '返回首页' : 'Back to home',
                leftIcon: '←',
                leftHref: 'index.html',
                rightLabel: locale === 'zh-CN' ? '打开个人资料' : 'Open profile',
                rightIcon: '◐',
                rightHref: 'profile.html'
            })
        }

        detailRoot.innerHTML = renderOutfitDetailPanel(
            activeLook,
            isFavorite('looks', activeLook.id),
            showAlternatives ? alternativeLooks : []
        )
    }

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeFavoritesStore(listener),
            (listener) => subscribeWardrobeStore(listener),
            (listener) => subscribeScheduleStore(listener),
            (listener) => subscribeSettingsStore(listener)
        ],
        hydrators: [
            () => hydrateFavorites(),
            () => hydrateWardrobe(getLocale()),
            () => hydrateSchedule(getLocale()),
            () => hydrateSettings()
        ]
    })

    if (detailRoot) {
        detailRoot.addEventListener('click', (event) => {
            const locale = getLocale()
            const recommendationInput = buildRecommendationInput(locale)
            const saveButton = event.target.closest('[data-ct-outfit-save]')
            const addToScheduleButton = event.target.closest('[data-ct-outfit-add-to-schedule]')
            const alternativesButton = event.target.closest('[data-ct-outfit-see-alternatives]')
            const { activeLook } = getOutfitDetailContent(locale, getLookId(), recommendationInput)
            const actionContext = {
                toggleFavorite,
                saveScheduleDraft,
                navigateTo,
                showAlternatives() {
                    showAlternatives = true
                    binding.paintNow()
                }
            }

            if (saveButton) {
                dispatchAction(buildToggleSaveLookAction(activeLook), actionContext)
                binding.paintNow()
                return
            }

            if (addToScheduleButton) {
                dispatchAction(buildAddOutfitToScheduleAction(activeLook, {
                    locale,
                    reminderEnabled: getSettingsState()['outfit-reminders']
                }), actionContext)
                return
            }

            if (!alternativesButton) return
            dispatchAction(buildShowAlternativesAction(), actionContext)
        })
    }

    return binding
}
