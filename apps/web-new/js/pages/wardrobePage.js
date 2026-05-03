import { getWardrobeContent } from '../data/wardrobe.js';
import { renderTopbar } from '../components/topbar.js';
import { renderSecondaryTabs } from '../components/secondaryTabs.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderWardrobeHero } from '../components/wardrobeHero.js';
import { renderWardrobeArchive } from '../components/wardrobeArchive.js';
import { renderSearchBar } from '../components/searchBar.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { bindFormNoticeActions, renderFormNotice } from '../components/formNotice.js';
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createWardrobePageContract } from '../lib/pageContracts.js';
import { getFormFeedbackCopy, focusFirstInvalidField, setFormSubmitting, validateRequired } from '../lib/formValidation.js';
import { buildWardrobePageSelectorInput, buildWardrobeSavePayload } from '../lib/wardrobeSelectors.js';
import { deleteWardrobeItem, getWardrobeItems, getWardrobeSyncState, hydrateWardrobe, retryWardrobeSync, saveWardrobeItem, subscribeWardrobeStore, subscribeWardrobeSyncState, toggleWardrobeFavorite } from '../lib/wardrobeStore.js';
import { hydrateSettings, subscribeSettingsStore } from '../lib/settingsStore.js';
const DEFAULT_WARDROBE_IMAGE = '/uploads/wardrobe/wool-trench.jpg';

function renderWardrobeForm(isOpen, content, locale) {
    const sharedCopy = getSharedCopy(locale);
    return `
        <form class="ct-wardrobe-form" data-ct-wardrobe-form ${isOpen ? '' : 'hidden'}>
            <div class="ct-wardrobe-form__grid">
                <div class="ct-wardrobe-form__field is-full">
                    <label for="ct-wardrobe-title">${content.form.labels.title}</label>
                    <input id="ct-wardrobe-title" name="title" type="text" placeholder="${content.form.placeholders.title}" aria-label="${content.form.labels.title}">
                </div>
                <div class="ct-wardrobe-form__field">
                    <label for="ct-wardrobe-category">${content.form.labels.category}</label>
                    <input id="ct-wardrobe-category" name="category" type="text" placeholder="${content.form.placeholders.category}" aria-label="${content.form.labels.category}">
                </div>
                <div class="ct-wardrobe-form__field">
                    <label for="ct-wardrobe-filter">${content.form.labels.filter}</label>
                    <select id="ct-wardrobe-filter" name="filter" aria-label="${content.form.labels.filter}">
                        ${content.tabs
                            .filter((tab) => tab.key !== 'all')
                            .map((tab) => `<option value="${tab.key}">${tab.label}</option>`)
                            .join('')}
                    </select>
                </div>
                <div class="ct-wardrobe-form__field">
                    <label for="ct-wardrobe-size">${content.form.labels.size}</label>
                    <input id="ct-wardrobe-size" name="size" type="text" placeholder="${content.form.placeholders.size}" aria-label="${content.form.labels.size}">
                </div>
                <div class="ct-wardrobe-form__field">
                    <label for="ct-wardrobe-color">${content.form.labels.color}</label>
                    <input id="ct-wardrobe-color" name="color" type="text" placeholder="${content.form.placeholders.color}" aria-label="${content.form.labels.color}">
                </div>
                <div class="ct-wardrobe-form__field is-full">
                    <label for="ct-wardrobe-material">${content.form.labels.material}</label>
                    <input id="ct-wardrobe-material" name="material" type="text" placeholder="${content.form.placeholders.material}" aria-label="${content.form.labels.material}">
                </div>
                <div class="ct-wardrobe-form__field is-full">
                    <label for="ct-wardrobe-image">${content.form.labels.image}</label>
                    <input id="ct-wardrobe-image" name="image" type="text" placeholder="${content.form.placeholders.image || DEFAULT_WARDROBE_IMAGE}" aria-label="${content.form.labels.image}">
                </div>
            </div>
            <label class="ct-wardrobe-form__check">
                <input name="favorite" type="checkbox" aria-label="${content.form.labels.favorite}">
                ${content.form.labels.favorite}
            </label>
            <div data-ct-form-notice></div>
            <div class="ct-wardrobe-form__actions">
                <button class="ct-wardrobe-form__cancel" type="button" data-ct-cancel-wardrobe>${sharedCopy.actions.cancel}</button>
                <button class="ct-wardrobe-form__submit" type="submit">${sharedCopy.actions.saveItem}</button>
            </div>
        </form>
    `;
}

export function renderWardrobePage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'wardrobe');
    const heroRoot = document.querySelector('[data-ct-wardrobe-hero]');
    const searchRoot = document.querySelector('[data-ct-wardrobe-search]');
    const tabsRoot = document.querySelector('[data-ct-wardrobe-tabs]');
    const archiveRoot = document.querySelector('[data-ct-wardrobe-archive]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let activeTab = 'all';
    let isFormOpen = false;
    let query = '';
    let quickAddNotice = null;
    let quickAddNoticeCleanup = () => {};
    let quickAddSyncCleanup = null;
    let quickAddSubmitting = false;

    const paint = () => {
        const locale = getLocale();
        const sharedCopy = getSharedCopy(locale);
        const content = getWardrobeContent(locale);
        const items = getWardrobeItems(locale).map((item) => ({ ...item }));
        const selectorInput = buildWardrobePageSelectorInput({
            locale,
            activeTab,
            query,
            isFormOpen,
            content,
            items,
            syncStates: {
                wardrobe: getWardrobeSyncState()
            }
        })
        const contract = createWardrobePageContract({
            ...selectorInput,
            searchedItems: selectorInput.visibleItems
        });
        const activeTabState = contract.derivedView.tabs.find((tab) => tab.active) || contract.derivedView.tabs[0];

        applyLocaleDocument('wardrobe', locale);
        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: locale === 'zh-CN' ? '返回我的' : 'Back to me',
                leftIcon: '←',
                leftHref: 'me.html',
                rightLabel: locale === 'zh-CN' ? '库存焦点' : 'Inventory Focus',
                rightIcon: '+',
                rightHref: ''
            });
        }
        if (heroRoot) heroRoot.innerHTML = renderWardrobeHero(content.hero, renderWardrobeForm(isFormOpen, content, locale));
        if (searchRoot) searchRoot.innerHTML = renderSearchBar(locale === 'zh-CN' ? '搜索标题、分类、材质' : 'Search title, category, material', query);
        if (tabsRoot) tabsRoot.innerHTML = renderSecondaryTabs(contract.derivedView.tabs, sharedCopy.tabs.wardrobe);
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('me');
        if (archiveRoot) {
            archiveRoot.id = activeTabState.panelId;
            archiveRoot.setAttribute('role', 'tabpanel');
            archiveRoot.setAttribute('aria-labelledby', activeTabState.tabId);
            archiveRoot.innerHTML = renderWardrobeArchive(contract.derivedView.archiveItems, getWardrobeSyncState());
        }

        if (heroRoot) {
            const form = heroRoot.querySelector('[data-ct-wardrobe-form]');
            const noticeRoot = form?.querySelector('[data-ct-form-notice]');
            if (noticeRoot) {
                quickAddNoticeCleanup();
                noticeRoot.innerHTML = renderFormNotice(quickAddNotice);
                quickAddNoticeCleanup = bindFormNoticeActions(noticeRoot, {
                    retry() {
                        const nextLocale = getLocale();
                        const copy = getFormFeedbackCopy(nextLocale);
                        quickAddSubmitting = true;
                        setFormSubmitting(form, true);
                        quickAddNotice = {
                            tone: 'info',
                            title: copy.status.syncing,
                            message: null,
                            actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
                        };
                        noticeRoot.innerHTML = renderFormNotice(quickAddNotice);
                        retryWardrobeSync(nextLocale);
                    },
                    leave() {
                        quickAddSubmitting = false;
                        quickAddSyncCleanup?.();
                        quickAddSyncCleanup = null;
                        quickAddNotice = null;
                        isFormOpen = false;
                        binding.paintNow();
                    }
                });
            }

            const submitButton = form?.querySelector('.ct-wardrobe-form__submit');
            if (submitButton) submitButton.disabled = Boolean(quickAddSubmitting);
        }
    };

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeWardrobeStore(listener),
            (listener) => subscribeSettingsStore(listener),
            (listener) => subscribeWardrobeSyncState(listener)
        ],
        hydrators: [
            () => hydrateWardrobe(getLocale()),
            () => hydrateSettings()
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'wardrobe',
                    label: { 'zh-CN': '衣橱', 'en-US': 'Wardrobe' },
                    getState: () => getWardrobeSyncState(),
                    subscribe: (listener) => subscribeWardrobeSyncState(listener),
                    retry: (locale) => retryWardrobeSync(locale)
                }
            ]
        }
    });

    if (heroRoot) {
        heroRoot.addEventListener('click', (event) => {
            if (event.target.closest('[data-ct-add-wardrobe]')) {
                isFormOpen = true;
                quickAddNotice = null;
                binding.paintNow();
            }

            if (event.target.closest('[data-ct-cancel-wardrobe]')) {
                isFormOpen = false;
                quickAddNotice = null;
                quickAddSubmitting = false;
                quickAddSyncCleanup?.();
                quickAddSyncCleanup = null;
                binding.paintNow();
            }
        });

        heroRoot.addEventListener('submit', (event) => {
            const form = event.target.closest('[data-ct-wardrobe-form]');
            if (!form) return;
            event.preventDefault();

            const locale = getLocale();
            const content = getWardrobeContent(locale);
            const copy = getFormFeedbackCopy(locale);
            const formData = new window.FormData(form);
            const validation = validateRequired(formData, [
                { field: 'title', label: content.form.labels.title }
            ], locale);

            if (!validation.ok) {
                quickAddNotice = {
                    tone: 'error',
                    title: copy.status.validating,
                    message: validation.errors[0]?.message || copy.status.validating,
                    actions: []
                };
                const noticeRoot = form.querySelector('[data-ct-form-notice]');
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(quickAddNotice);
                focusFirstInvalidField(form, validation.errors);
                return;
            }

            const title = formData.get('title')?.toString().trim();
            const filter = formData.get('filter')?.toString() || 'essentials';

            saveWardrobeItem(buildWardrobeSavePayload({
                formValues: {
                    title,
                    category: formData.get('category')?.toString(),
                    size: formData.get('size')?.toString(),
                    color: formData.get('color')?.toString(),
                    material: formData.get('material')?.toString(),
                    image: formData.get('image')?.toString(),
                    filter,
                    favorite: formData.get('favorite') === 'on'
                },
                fallback: content.form.fallback,
                defaultImage: DEFAULT_WARDROBE_IMAGE
            }), locale);

            quickAddSubmitting = true;
            setFormSubmitting(form, true);
            quickAddNotice = {
                tone: 'info',
                title: copy.status.saving,
                message: copy.status.syncing,
                actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
            };
            const noticeRoot = form.querySelector('[data-ct-form-notice]');
            if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(quickAddNotice);

            quickAddSyncCleanup?.();
            quickAddSyncCleanup = subscribeWardrobeSyncState((state) => {
                const status = state?.status || 'idle';
                if (!quickAddSubmitting) return;
                const locale = getLocale();
                const copy = getFormFeedbackCopy(locale);
                const noticeRoot = form.querySelector('[data-ct-form-notice]');

                if (status === 'synced') {
                    quickAddSubmitting = false;
                    setFormSubmitting(form, false);
                    quickAddNotice = {
                        tone: 'success',
                        title: copy.status.saved,
                        message: null,
                        actions: []
                    };
                    if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(quickAddNotice);
                    activeTab = filter;
                    isFormOpen = false;
                    window.setTimeout(() => binding.paintNow(), 0);
                    quickAddSyncCleanup?.();
                    quickAddSyncCleanup = null;
                    return;
                }

                if (status === 'failed') {
                    quickAddSubmitting = false;
                    setFormSubmitting(form, false);
                    quickAddNotice = {
                        tone: 'error',
                        title: copy.status.failed,
                        message: null,
                        actions: [
                            { key: 'retry', label: copy.actions.retry },
                            { key: 'leave', label: copy.actions.leave, variant: 'secondary' }
                        ]
                    };
                    if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(quickAddNotice);
                    return;
                }

                if (status === 'stale') {
                    quickAddSubmitting = false;
                    setFormSubmitting(form, false);
                    quickAddNotice = {
                        tone: 'warning',
                        title: copy.status.stale,
                        message: null,
                        actions: [
                            { key: 'retry', label: copy.actions.retry },
                            { key: 'leave', label: copy.actions.leave, variant: 'secondary' }
                        ]
                    };
                    if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(quickAddNotice);
                }
            });
        });
    }

    if (tabsRoot) {
        tabsRoot.addEventListener('click', (event) => {
            const target = event.target.closest('[data-tab-key]');
            if (!target) return;
            activeTab = target.getAttribute('data-tab-key') || 'all';
            binding.paintNow();
        });
    }

    if (searchRoot) {
        searchRoot.addEventListener('input', (event) => {
            const target = event.target.closest('.ct-search-bar__input');
            if (!target) return;
            query = target.value;
            binding.paintNow();
        });
    }

    if (archiveRoot) {
        archiveRoot.addEventListener('click', (event) => {
            const favoriteTarget = event.target.closest('[data-ct-toggle-wardrobe-favorite]');
            if (favoriteTarget) {
                const itemId = favoriteTarget.getAttribute('data-ct-toggle-wardrobe-favorite');
                const locale = getLocale();
                toggleWardrobeFavorite(itemId, locale);
                binding.paintNow();
                return;
            }

            const target = event.target.closest('[data-ct-delete-wardrobe]');
            if (!target) return;

            const itemId = target.getAttribute('data-ct-delete-wardrobe');
            const locale = getLocale();
            deleteWardrobeItem(itemId, locale);
            binding.paintNow();
        });
    }

    return {
        ...binding,
        teardown() {
            binding.teardown();
            quickAddNoticeCleanup();
            quickAddSyncCleanup?.();
        }
    };
}
