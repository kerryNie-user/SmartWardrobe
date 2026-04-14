import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { getProfilePageContent } from '../data/profile.js';
import { applyLocaleDocument, getLocale } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createProfilePageContract } from '../lib/pageContracts.js';
import { buildProfilePageSelectorInput } from '../lib/profileSelectors.js';
import { getFavorites, getFavoritesStats, getFavoritesSyncState, hydrateFavorites, retryFavoritesSync, subscribeFavoritesStore, subscribeFavoritesSyncState } from '../lib/favoritesStore.js';
import { getProfile, getProfileSyncState, hydrateProfile, retryProfileSync, subscribeProfileStore, subscribeProfileSyncState } from '../lib/profileStore.js';
import { getWardrobeCount, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, subscribeWardrobeStore, subscribeWardrobeSyncState } from '../lib/wardrobeStore.js';
import { hydrateSettings, subscribeSettingsStore } from '../lib/settingsStore.js';

function renderProfileSummary(content, profile, stats, wardrobeCount) {
    return `
        <section class="ct-profile-summary" data-ct-profile-summary>
            <div class="ct-profile-summary__hero">
                <div class="ct-profile-summary__avatar-frame">
                    <img class="ct-profile-summary__avatar" src="${profile.avatar}" alt="${profile.name}">
                </div>
                <div class="ct-profile-summary__copy">
                    <span class="ct-eyebrow">${content.hero.eyebrow}</span>
                    <h1 class="ct-profile-summary__title">${profile.name}</h1>
                    <p class="ct-profile-summary__note">${profile.bio}</p>
                    <a class="ct-profile-summary__action" href="profile-edit.html" data-ct-profile-start-edit>${content.summary.action}</a>
                </div>
            </div>
            <div class="ct-profile-summary__stats">
                <article class="ct-profile-summary__stat">
                    <span class="ct-profile-summary__stat-label">${content.summary.metrics.favorites}</span>
                    <strong class="ct-profile-summary__stat-value">${String(stats.total).padStart(2, '0')}</strong>
                </article>
                <article class="ct-profile-summary__stat">
                    <span class="ct-profile-summary__stat-label">${content.summary.metrics.wardrobe}</span>
                    <strong class="ct-profile-summary__stat-value">${String(wardrobeCount).padStart(2, '0')}</strong>
                </article>
            </div>
        </section>
    `;
}

function renderProfilePreviewCollection(content, previewItems) {
    return `
        <section class="ct-profile-preview" data-ct-profile-preview-collection>
            <div class="ct-profile-preview__header">
                <span class="ct-eyebrow">${content.summary.heading}</span>
                <h2 class="ct-profile-preview__title">${content.summary.preview.heading}</h2>
            </div>
            ${previewItems.length ? `
                <ul class="ct-profile-preview__list">
                    ${previewItems.map((item) => `
                        <li class="ct-profile-preview__item">
                            <img class="ct-profile-preview__image" src="${item.image}" alt="${item.title}">
                            <div class="ct-profile-preview__body">
                                <h3 class="ct-profile-preview__item-title">${item.title}</h3>
                                <p class="ct-profile-preview__item-copy">${item.subtitle}</p>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            ` : `
                <p class="ct-profile-preview__empty">${content.summary.preview.empty}</p>
            `}
        </section>
    `;
}

export function renderProfilePage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'profile');
    const summaryRoot = document.querySelector('[data-ct-profile-summary]');
    const previewRoot = document.querySelector('[data-ct-profile-preview-collection]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let locale = getLocale();
    let content = getProfilePageContent(locale);
    const paint = () => {
        locale = getLocale();
        content = getProfilePageContent(locale);
        const profile = getProfile(locale);
        const favorites = getFavorites();
        const selectorInput = buildProfilePageSelectorInput({
            locale,
            content,
            profile,
            favorites,
            favoritesStats: getFavoritesStats(),
            wardrobeCount: getWardrobeCount(locale),
            syncStates: {
                profile: getProfileSyncState(),
                favorites: getFavoritesSyncState(),
                wardrobe: getWardrobeSyncState()
            }
        })
        const contract = createProfilePageContract(selectorInput);
        applyLocaleDocument('profile', locale);

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: content.topbar.leftLabel,
                leftIcon: '←',
                leftHref: 'me.html',
                rightLabel: content.topbar.rightLabel,
                rightIcon: '◐',
                rightHref: 'profile.html'
            });
        }

        if (summaryRoot) {
            const summaryView = contract.derivedView.summary;
            summaryRoot.innerHTML = renderProfileSummary(
                summaryView.content,
                summaryView.profile,
                { total: summaryView.favoritesTotal },
                summaryView.wardrobeCount
            );
        }

        if (previewRoot) {
            previewRoot.innerHTML = renderProfilePreviewCollection(content, contract.derivedView.previewItems);
        }

        if (bottomNavRoot) {
            bottomNavRoot.innerHTML = renderBottomNav('me');
        }
    };

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeProfileStore(listener),
            (listener) => subscribeFavoritesStore(listener),
            (listener) => subscribeWardrobeStore(listener),
            (listener) => subscribeSettingsStore(listener)
        ],
        hydrators: [
            () => hydrateProfile(locale),
            () => hydrateFavorites(),
            () => hydrateWardrobe(locale),
            () => hydrateSettings()
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'profile',
                    label: { 'zh-CN': '资料', 'en-US': 'Profile' },
                    getState: () => getProfileSyncState(),
                    subscribe: (listener) => subscribeProfileSyncState(listener),
                    retry: (nextLocale) => retryProfileSync(nextLocale)
                },
                {
                    key: 'favorites',
                    label: { 'zh-CN': '收藏', 'en-US': 'Favorites' },
                    getState: () => getFavoritesSyncState(),
                    subscribe: (listener) => subscribeFavoritesSyncState(listener),
                    retry: () => retryFavoritesSync()
                },
                {
                    key: 'wardrobe',
                    label: { 'zh-CN': '衣橱', 'en-US': 'Wardrobe' },
                    getState: () => getWardrobeSyncState(),
                    subscribe: (listener) => subscribeWardrobeSyncState(listener),
                    retry: (nextLocale) => retryWardrobeSync(nextLocale)
                }
            ]
        }
    });
    return binding;
}
