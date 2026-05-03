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
import { selectScheduleView, selectScheduleDeleteCandidate } from '../lib/scheduleSelectors.js';
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
        const view = selectScheduleView({
            locale,
            activeTab,
            tabs: scheduleState.tabs || [],
            views: scheduleState.views || {},
            scheduleState,
            deleteCandidate,
            sharedCopy
        });

        if (overviewRoot) {
            overviewRoot.innerHTML = renderScheduleOverview(view.overview);
        }
        if (tabsRoot) tabsRoot.innerHTML = renderSecondaryTabs(view.tabs, sharedCopy.schedule?.tabsAria);
        if (timelineRoot) {
            timelineRoot.innerHTML = renderScheduleTimeline(view.groups, getScheduleSyncState());
        }
        if (dialogRoot) {
            dialogRoot.innerHTML = renderScheduleConfirmDialog(view.deleteDialogCopy);
        }
    };

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeScheduleStore(listener),
            (listener) => subscribeScheduleSyncState(listener)
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
        timelineRoot.addEventListener('click', async (event) => {
            const reminderTarget = event.target.closest('[data-ct-toggle-schedule-reminder]');
            if (reminderTarget) {
                const eventId = reminderTarget.getAttribute('data-ct-toggle-schedule-reminder');
                await toggleScheduleReminder(eventId, locale);
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
        dialogRoot.addEventListener('click', async (event) => {
            if (event.target.closest('[data-ct-confirm-schedule-delete]')) {
                await deleteScheduleEvent(activeTab, deleteCandidate?.id, locale)
                deleteCandidate = null
                binding.paintNow()
                return
            }

            if (event.target.matches('[data-ct-cancel-schedule-delete]') || event.target.closest('[data-dialog-action="cancel"]')) {
                deleteCandidate = null
                binding.paintNow()
            }
        });
    }

    return binding;
}
