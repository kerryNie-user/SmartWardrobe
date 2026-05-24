import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderScheduleOverview } from '../components/scheduleOverview.js';
import { renderScheduleTimeline } from '../components/scheduleTimeline.js';
import { renderScheduleConfirmDialog } from '../components/scheduleConfirmDialog.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { applyLocaleDocument, getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { selectScheduleView, selectScheduleDeleteCandidate } from '../lib/scheduleSelectors.js';
import { deleteScheduleEvent, getScheduleState, getScheduleSyncState, hydrateSchedule, retryScheduleSync, subscribeScheduleStore, subscribeScheduleSyncState, toggleScheduleReminder } from '../lib/scheduleStore.js';
import { getSettingsState, hydrateSettings, subscribeSettingsStore } from '../lib/settingsStore.js';

function renderScheduleHistorySection(view, locale) {
    const copy = getUiCopy(locale).schedule.history;
    return `
        <div class="ct-schedule-history">
            <header class="ct-schedule-history__header">
                <div>
                    <span class="ct-eyebrow">${copy.eyebrow}</span>
                    <h2 class="ct-schedule-history__title">${copy.title}</h2>
                </div>
                <span class="ct-schedule-history__count">${String(view.historyCount || 0).padStart(2, '0')}</span>
            </header>
            <p class="ct-schedule-history__note">${copy.description}</p>
            <div class="ct-schedule-history__list">
                ${renderScheduleTimeline(view.historyGroups, null, {
                    mode: 'history',
                    emptyEyebrow: copy.emptyEyebrow,
                    emptyDescription: copy.emptyDescription
                })}
            </div>
        </div>
    `;
}

export function renderSchedulePage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'schedule');
    const overviewRoot = document.querySelector('[data-ct-schedule-overview]');
    const historyRoot = document.querySelector('[data-ct-schedule-history]') || document.querySelector('[data-ct-schedule-tabs]');
    const timelineRoot = document.querySelector('[data-ct-schedule-timeline]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');

    let dialogRoot = document.querySelector('[data-ct-schedule-dialog-root]');
    if (!dialogRoot) {
        dialogRoot = document.createElement('div');
        dialogRoot.setAttribute('data-ct-schedule-dialog-root', '');
        document.body.appendChild(dialogRoot);
    }

    let locale = getSettingsState().language || getLocale();
    let sharedCopy = getSharedCopy(locale);
    let deleteCandidate = null;

    const hydrateScheduleWithSettings = async () => {
        const settings = await hydrateSettings();
        locale = settings?.language || getSettingsState().language || getLocale();
        await hydrateSchedule(locale);
    };

    const paint = () => {
        locale = getSettingsState().language || getLocale();
        sharedCopy = getSharedCopy(locale);
        const scheduleState = getScheduleState(locale);
        const view = selectScheduleView({
            locale,
            activeTab: 'upcoming',
            tabs: scheduleState.tabs || [],
            views: scheduleState.views || {},
            scheduleState,
            deleteCandidate,
            sharedCopy
        });

        applyLocaleDocument('schedule', locale);
        if (topbarRoot) {
            const uiCopy = getUiCopy(locale);
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: uiCopy.topbar.backToMe,
                leftIcon: '←',
                leftHref: 'me.html',
                rightLabel: sharedCopy.topbar.openProfile,
                rightIcon: '◐'
            });
        }
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('me');
        if (overviewRoot) {
            overviewRoot.innerHTML = renderScheduleOverview(view.overview);
        }
        if (timelineRoot) {
            const copy = getUiCopy(locale).schedule;
            timelineRoot.innerHTML = renderScheduleTimeline(view.groups, getScheduleSyncState(), {
                emptyDescription: copy.upcomingEmptyDescription || getUiCopy(locale).states.scheduleEmptyDescription
            });
        }
        if (historyRoot) {
            historyRoot.innerHTML = renderScheduleHistorySection(view, locale);
        }
        if (dialogRoot) {
            dialogRoot.innerHTML = renderScheduleConfirmDialog(view.deleteDialogCopy);
        }
    };

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeScheduleStore(listener),
            (listener) => subscribeScheduleSyncState(listener),
            (listener) => subscribeSettingsStore((nextSettings) => {
                const nextLocale = nextSettings?.language || getLocale();
                if (nextLocale !== locale) {
                    locale = nextLocale;
                    void hydrateSchedule(locale);
                }
                listener();
            })
        ],
        hydrators: [
            hydrateScheduleWithSettings
        ],
        syncFeedback: {
            root: syncFeedbackRoot,
            locale: () => getLocale(),
            bindings: [
                {
                    key: 'schedule',
                    domainKey: 'schedule',
                    getState: () => getScheduleSyncState(),
                    subscribe: (listener) => subscribeScheduleSyncState(listener),
                    retry: (nextLocale) => retryScheduleSync(nextLocale)
                }
            ]
        }
    });

    const handleScheduleListClick = async (event) => {
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
        deleteCandidate = selectScheduleDeleteCandidate(scheduleState, eventId);
        binding.paintNow();
    };

    if (timelineRoot) {
        timelineRoot.addEventListener('click', handleScheduleListClick);
    }

    if (historyRoot) {
        historyRoot.addEventListener('click', handleScheduleListClick);
    }

    if (dialogRoot) {
        dialogRoot.addEventListener('click', async (event) => {
            if (event.target.closest('[data-ct-confirm-schedule-delete]')) {
                await deleteScheduleEvent(deleteCandidate?.tab || 'upcoming', deleteCandidate?.id, locale)
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
