import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderProfileEditor } from '../components/profileEditor.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { bindFormNoticeActions, renderFormNotice } from '../components/formNotice.js';
import { getProfilePageContent } from '../data/profile.js';
import { applyLocaleDocument, getLocale } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createProfileEditPageContract } from '../lib/pageContracts.js';
import { getFormFeedbackCopy, focusFirstInvalidField, setFormSubmitting, validateRequired } from '../lib/formValidation.js';
import { getFallbackAvatar, getProfile, getProfileSyncState, hydrateProfile, retryProfileSync, saveProfile, subscribeProfileStore, subscribeProfileSyncState } from '../lib/profileStore.js';
import { navigateTo } from '../lib/navigation.js';

export function renderProfileEditPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const editorRoot = document.querySelector('[data-ct-profile-editor]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'profile-edit');

    let locale = getLocale();
    let content = getProfilePageContent(locale);
    let profile = getProfile(locale);
    let formNotice = null;
    let noticeCleanup = () => {};
    let syncCleanup = null;
    let submissionActive = false;
    const listenerCleanups = [];

    const paint = () => {
        locale = getLocale();
        content = getProfilePageContent(locale);
        const contract = createProfileEditPageContract({
            locale,
            content,
            profile,
            status: renderFormNotice(formNotice),
            syncStates: {
                profile: getProfileSyncState()
            }
        });
        applyLocaleDocument('profileEdit', locale);

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: contract.derivedView.topbar.leftLabel,
                leftIcon: '←',
                leftHref: contract.derivedView.topbar.leftHref,
                rightLabel: contract.derivedView.topbar.rightLabel,
                rightIcon: '◐',
                rightHref: ''
            });
        }

        if (editorRoot) {
            editorRoot.innerHTML = renderProfileEditor(contract.derivedView.content, contract.derivedView.profile, contract.state.status);
        }

        if (bottomNavRoot) {
            bottomNavRoot.innerHTML = renderBottomNav('me');
        }

        if (editorRoot) {
            const noticeRoot = editorRoot.querySelector('[data-ct-form-notice]');
            if (noticeRoot) {
                noticeCleanup();
                noticeCleanup = bindFormNoticeActions(noticeRoot, {
                    retry() {
                        const locale = getLocale();
                        const copy = getFormFeedbackCopy(locale);
                        submissionActive = true;
                        const form = editorRoot.querySelector('[data-ct-profile-form]');
                        setFormSubmitting(form, true);
                        formNotice = {
                            tone: 'info',
                            title: copy.status.syncing,
                            message: null,
                            actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
                        };
                        noticeRoot.innerHTML = renderFormNotice(formNotice);
                        retryProfileSync(locale);
                    },
                    leave() {
                        submissionActive = false;
                        syncCleanup?.();
                        syncCleanup = null;
                        navigateTo('profile.html');
                    }
                });
            }
        }
    };

    if (!editorRoot) return;

    const handleClick = (event) => {
        const restoreButton = event.target.closest('[data-ct-profile-restore]');
        if (!restoreButton) return;

        profile = {
            ...getProfilePageContent(locale).form.fallback,
            avatar: getFallbackAvatar()
        };
        formNotice = null;
        paint();
    };
    editorRoot.addEventListener('click', handleClick);
    listenerCleanups.push(() => editorRoot.removeEventListener('click', handleClick));

    const handleSubmit = (event) => {
        const form = event.target.closest('[data-ct-profile-form]');
        if (!form) return;
        event.preventDefault();

        const locale = getLocale();
        const copy = getFormFeedbackCopy(locale);
        const formData = new window.FormData(form);
        const validation = validateRequired(formData, [
            { field: 'name', label: content.form.labels.name }
        ], locale);

        if (!validation.ok) {
            formNotice = {
                tone: 'error',
                title: copy.status.validating,
                message: validation.errors[0]?.message || copy.status.validating,
                actions: []
            };
            const noticeRoot = form.querySelector('[data-ct-form-notice]');
            if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice);
            focusFirstInvalidField(form, validation.errors);
            return;
        }

        const name = String(formData.get('name') || '').trim();
        submissionActive = true;
        setFormSubmitting(form, true);
        formNotice = {
            tone: 'info',
            title: copy.status.saving,
            message: copy.status.syncing,
            actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
        };
        const noticeRoot = form.querySelector('[data-ct-form-notice]');
        if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice);

        profile = saveProfile({
            avatar: String(formData.get('avatar') || '').trim() || getFallbackAvatar(),
            name,
            bio: String(formData.get('bio') || '').trim() || content.form.fallback.bio
        }, locale);

        syncCleanup?.();
        syncCleanup = subscribeProfileSyncState((state) => {
            if (!submissionActive) return;
            const status = state?.status || 'idle';
            const locale = getLocale();
            const copy = getFormFeedbackCopy(locale);
            const noticeRoot = form.querySelector('[data-ct-form-notice]');

            if (status === 'synced') {
                setFormSubmitting(form, false);
                formNotice = { tone: 'success', title: copy.status.saved, message: null, actions: [] };
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice);
                submissionActive = false;
                syncCleanup?.();
                syncCleanup = null;
                window.setTimeout(() => navigateTo('profile.html'), 0);
                return;
            }

            if (status === 'failed') {
                setFormSubmitting(form, false);
                formNotice = {
                    tone: 'error',
                    title: copy.status.failed,
                    message: null,
                    actions: [
                        { key: 'retry', label: copy.actions.retry },
                        { key: 'leave', label: copy.actions.leave, variant: 'secondary' }
                    ]
                };
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice);
                return;
            }

            if (status === 'stale') {
                setFormSubmitting(form, false);
                formNotice = {
                    tone: 'warning',
                    title: copy.status.stale,
                    message: null,
                    actions: [
                        { key: 'retry', label: copy.actions.retry },
                        { key: 'leave', label: copy.actions.leave, variant: 'secondary' }
                    ]
                };
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice);
            }
        });
    };
    editorRoot.addEventListener('submit', handleSubmit);
    listenerCleanups.push(() => editorRoot.removeEventListener('submit', handleSubmit));

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeProfileStore(listener)
        ],
        hydrators: [
            () => hydrateProfile(getLocale()).then((nextProfile) => {
                profile = nextProfile;
            })
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'profile',
                    domainKey: 'profile',
                    getState: () => getProfileSyncState(),
                    subscribe: (listener) => subscribeProfileSyncState(listener),
                    retry: (nextLocale) => retryProfileSync(nextLocale)
                }
            ]
        }
    });

    return {
        ...binding,
        teardown() {
            binding.teardown();
            listenerCleanups.forEach((cleanup) => cleanup());
            noticeCleanup();
            syncCleanup?.();
        }
    };
}
