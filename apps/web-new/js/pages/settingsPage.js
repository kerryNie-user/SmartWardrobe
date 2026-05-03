import { getSettingsContent } from '../data/settings.js';
import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderSettingsProfile } from '../components/settingsProfile.js';
import { renderSettingsPanel } from '../components/settingsPanel.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { applyLocaleDocument } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createSettingsPageContract } from '../lib/pageContracts.js';
import { buildSettingsPageSelectorInput } from '../lib/settingsSelectors.js';
import { logoutUser } from '../lib/authStore.js';
import { getProfile, getProfileSyncState, hydrateProfile, retryProfileSync, subscribeProfileStore, subscribeProfileSyncState } from '../lib/profileStore.js';
import { navigateTo } from '../lib/navigation.js';
import { getSettingsState, getSettingsSyncState, hydrateSettings, retrySettingsSync, setSetting, subscribeSettingsStore, subscribeSettingsSyncState, toggleSetting } from '../lib/settingsStore.js';
import { renderLoadFailedPanel } from '../components/errorPanel.js';

export function renderSettingsPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'settings');
    const profileRoot = document.querySelector('[data-ct-settings-profile]');
    const panelRoot = document.querySelector('[data-ct-settings-panel]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let settingsState = getSettingsState();
    let locale = settingsState.language;

    const paint = () => {
        const content = getSettingsContent(locale, settingsState);
        const selectorInput = buildSettingsPageSelectorInput({
            settingsState,
            content,
            profile: getProfile(locale),
            syncStates: {
                profile: getProfileSyncState(),
                settings: getSettingsSyncState()
            }
        })
        locale = selectorInput.locale
        const contract = createSettingsPageContract(selectorInput);
        applyLocaleDocument('settings', locale);
        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: content.topbar.leftLabel,
                leftIcon: '←',
                leftHref: 'me.html',
                rightLabel: content.topbar.rightLabel,
                rightIcon: '⚙',
                rightHref: ''
            });
        }
        if (profileRoot) {
            const state = getProfileSyncState()
            if (state?.status === 'failed') {
                profileRoot.innerHTML = renderLoadFailedPanel(state?.error, locale === 'zh-CN' ? '资料加载失败。' : 'Failed to load profile.')
            } else {
                profileRoot.innerHTML = renderSettingsProfile(contract.derivedView.profile);
            }
        }
        if (panelRoot) {
            const state = getSettingsSyncState()
            if (state?.status === 'failed') {
                panelRoot.innerHTML = renderLoadFailedPanel(state?.error, locale === 'zh-CN' ? '设置加载失败。' : 'Failed to load settings.')
            } else {
                panelRoot.innerHTML = renderSettingsPanel(contract.derivedView.panel);
            }
        }
        if (bottomNavRoot) {
            bottomNavRoot.innerHTML = renderBottomNav('me');
        }
    };

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeProfileStore(() => {
                settingsState = getSettingsState();
                locale = settingsState.language;
                listener();
            }),
            (listener) => subscribeSettingsStore((nextSettingsState) => {
                settingsState = nextSettingsState;
                locale = settingsState.language;
                listener();
            }),
            (listener) => subscribeProfileSyncState(listener),
            (listener) => subscribeSettingsSyncState(listener)
        ],
        hydrators: [
            () => hydrateProfile(locale),
            () => hydrateSettings()
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => locale,
            bindings: [
                {
                    key: 'profile',
                    label: { 'zh-CN': '资料', 'en-US': 'Profile' },
                    getState: () => getProfileSyncState(),
                    subscribe: (listener) => subscribeProfileSyncState(listener),
                    retry: (nextLocale) => retryProfileSync(nextLocale)
                },
                {
                    key: 'settings',
                    label: { 'zh-CN': '设置', 'en-US': 'Settings' },
                    getState: () => getSettingsSyncState(),
                    subscribe: (listener) => subscribeSettingsSyncState(listener),
                    retry: () => retrySettingsSync()
                }
            ]
        }
    });

    if (panelRoot) {
        panelRoot.addEventListener('click', (event) => {
            const toggle = event.target.closest('[data-settings-toggle]');
            if (toggle) {
                const itemKey = toggle.getAttribute('data-settings-toggle');
                settingsState = toggleSetting(itemKey);
                locale = settingsState.language;
                binding.paintNow();
                return;
            }

            const choice = event.target.closest('[data-settings-choice]');
            if (choice) {
                const itemKey = choice.getAttribute('data-settings-choice');
                const nextValue = choice.getAttribute('data-settings-value');
                settingsState = setSetting(itemKey, nextValue);
                locale = settingsState.language;
                binding.paintNow();
                return;
            }

            const action = event.target.closest('[data-settings-action]');
            if (action?.getAttribute('data-settings-action') === 'logout') {
                logoutUser();
                navigateTo('login.html');
            }
        });
    }

    return binding;
}
