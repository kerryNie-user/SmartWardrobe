import { getScheduleContent } from '../data/schedule.js';
import { renderTopbar } from '../components/topbar.js';
import { renderSecondaryTabs } from '../components/secondaryTabs.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderScheduleOverview } from '../components/scheduleOverview.js';
import { renderScheduleTimeline } from '../components/scheduleTimeline.js';
import { renderScheduleConfirmDialog } from '../components/scheduleConfirmDialog.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createSchedulePageContract } from '../lib/pageContracts.js';
import { buildSchedulePageSelectorInput, selectScheduleDeleteCandidate } from '../lib/scheduleSelectors.js';
import { deleteScheduleEvent, getScheduleState, getScheduleSyncState, hydrateSchedule, retryScheduleSync, subscribeScheduleStore, subscribeScheduleSyncState, toggleScheduleReminder } from '../lib/scheduleStore.js';

export function renderSchedulePage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'schedule');
    const overviewRoot = document.querySelector('[data-ct-schedule-overview]');
    const tabsRoot = document.querySelector('[data-ct-schedule-tabs]');
    const timelineRoot = document.querySelector('[data-ct-schedule-timeline]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let dialogRoot = document.querySelector('[data-ct-schedule-dialog-root]');
    if (!dialogRoot) {
        dialogRoot = document.createElement('div');
        dialogRoot.setAttribute('data-ct-schedule-dialog-root', '');
        document.body.appendChild(dialogRoot);
    }

    const locale = getLocale();
    const sharedCopy = getSharedCopy(locale);
    const content = getScheduleContent(locale);
    let activeTab = 'upcoming';
    let deleteCandidate = null;

    applyLocaleDocument('schedule', locale);
    if (topbarRoot) {
        topbarRoot.innerHTML = renderTopbar({
            leftLabel: locale === 'zh-CN' ? '返回我的' : 'Back to me',
            leftIcon: '←',
            leftHref: 'me.html',
            rightLabel: sharedCopy.topbar.openProfile,
            rightIcon: '◐'
        });
    }
    if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('me');

    const paint = () => {
        const scheduleState = getScheduleState(locale);
        const selectorInput = buildSchedulePageSelectorInput({
            locale,
            activeTab,
            content,
            scheduleState,
            deleteCandidate,
            sharedCopy,
            syncStates: {
                schedule: getScheduleSyncState()
            }
        })
        const contract = createSchedulePageContract(selectorInput);
        const activeTabState = contract.derivedView.tabs.find((tab) => tab.active) || contract.derivedView.tabs[0];

        if (overviewRoot) {
            overviewRoot.innerHTML = renderScheduleOverview(contract.derivedView.overview);
        }
        if (tabsRoot) tabsRoot.innerHTML = renderSecondaryTabs(contract.derivedView.tabs, sharedCopy.tabs.schedule);
        if (timelineRoot) {
            timelineRoot.id = activeTabState.panelId;
            timelineRoot.setAttribute('role', 'tabpanel');
            timelineRoot.setAttribute('aria-labelledby', activeTabState.tabId);
            timelineRoot.innerHTML = renderScheduleTimeline(contract.derivedView.timelineGroups);
        }
        if (dialogRoot) {
            dialogRoot.innerHTML = contract.derivedView.deleteDialog.visible ? renderScheduleConfirmDialog(selectorInput.deleteDialogCopy) : '';
        }
    };

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeScheduleStore(listener)
        ],
        hydrators: [
            () => hydrateSchedule(locale)
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'schedule',
                    label: { 'zh-CN': '日程', 'en-US': 'Schedule' },
                    getState: () => getScheduleSyncState(),
                    subscribe: (listener) => subscribeScheduleSyncState(listener),
                    retry: (nextLocale) => retryScheduleSync(nextLocale)
                }
            ]
        }
    });

    if (tabsRoot) {
        tabsRoot.addEventListener('click', (event) => {
            const target = event.target.closest('[data-tab-key]');
            if (!target) return;
            activeTab = target.getAttribute('data-tab-key') || 'upcoming';
            binding.paintNow();
        });
    }

    if (timelineRoot) {
        timelineRoot.addEventListener('click', (event) => {
            const reminderTarget = event.target.closest('[data-ct-toggle-schedule-reminder]');
            if (reminderTarget) {
                const eventId = reminderTarget.getAttribute('data-ct-toggle-schedule-reminder');
                toggleScheduleReminder(eventId, locale);
                binding.paintNow();
                return;
            }

            const target = event.target.closest('[data-ct-delete-schedule]');
            if (!target) return;

            const eventId = target.getAttribute('data-ct-delete-schedule');
            const scheduleState = getScheduleState(locale);
            deleteCandidate = selectScheduleDeleteCandidate(scheduleState, activeTab, eventId);
            binding.paintNow();
        });
    }

    if (dialogRoot) {
        dialogRoot.addEventListener('click', (event) => {
            if (event.target.closest('[data-ct-cancel-schedule-delete]')) {
                deleteCandidate = null;
                binding.paintNow();
                return;
            }

            if (!event.target.closest('[data-ct-confirm-schedule-delete]')) return;
            deleteScheduleEvent(activeTab, deleteCandidate?.id, locale);
            deleteCandidate = null;
            binding.paintNow();
        });
    }

    return binding;
}
