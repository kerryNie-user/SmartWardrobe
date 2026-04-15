import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js';
import { navigateTo } from '../lib/navigation.js';
import { getQueryParam } from '../lib/navigationAdapter.js';
import { getScheduleContent } from '../data/schedule.js';
import { bindPageStores } from '../lib/pageStoreBinding.js';
import { createScheduleEventPageContract } from '../lib/pageContracts.js';
import { createScheduleEvent, getScheduleEventById, getScheduleSyncState, hydrateSchedule, retryScheduleSync, subscribeScheduleStore, subscribeScheduleSyncState, updateScheduleEvent } from '../lib/scheduleStore.js';
import { clearScheduleDraft, getScheduleDraft } from '../lib/scheduleDraft.js';

function getEventId() {
    return getQueryParam('id');
}

function renderScheduleEventForm(content, locale, event) {
    const sharedCopy = getSharedCopy(locale);
    const isEditing = Boolean(event?.id);

    return `
        <section class="ct-schedule-event-shell">
            <form class="ct-schedule-form" data-ct-schedule-event-form>
                <input type="hidden" name="eventId" value="${event?.id || ''}">
                <div class="ct-schedule-form__header">
                    <div>
                        <span class="ct-eyebrow">${isEditing ? (locale === 'zh-CN' ? '编辑日程' : 'Edit Event') : (locale === 'zh-CN' ? '新增日程' : 'Add Event')}</span>
                        <h1 class="ct-schedule-form__heading">${isEditing ? (locale === 'zh-CN' ? '更新这条提醒事项' : 'Update this schedule entry') : (locale === 'zh-CN' ? '创建一条新提醒事项' : 'Create a new schedule entry')}</h1>
                    </div>
                    <p class="ct-schedule-form__intro">${locale === 'zh-CN' ? '只保留时间、地点、标签与提醒开关，适合作为纯日程系统使用。' : 'A plain schedule entry: time, location, tags, and an optional reminder.'}</p>
                </div>
                <div class="ct-schedule-form__grid">
                    <div class="ct-schedule-form__field">
                        <label for="ct-schedule-tab">${content.form.labels.tab}</label>
                        <select id="ct-schedule-tab" name="tab" aria-label="${content.form.labels.tab}">
                            ${content.tabs.map((tab) => `<option value="${tab.key}"${event?.tab === tab.key ? ' selected' : ''}>${tab.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ct-schedule-form__field">
                        <label for="ct-schedule-day">${content.form.labels.day}</label>
                        <input id="ct-schedule-day" name="day" type="text" value="${event?.day || ''}" placeholder="${content.form.placeholders.day}" aria-label="${content.form.labels.day}">
                    </div>
                    <div class="ct-schedule-form__field">
                        <label for="ct-schedule-label">${content.form.labels.dateLabel}</label>
                        <input id="ct-schedule-label" name="label" type="text" value="${event?.label || ''}" placeholder="${content.form.placeholders.dateLabel}" aria-label="${content.form.labels.dateLabel}">
                    </div>
                    <div class="ct-schedule-form__field">
                        <label for="ct-schedule-time">${content.form.labels.time}</label>
                        <input id="ct-schedule-time" name="time" type="text" value="${event?.time || ''}" placeholder="${content.form.placeholders.time}" aria-label="${content.form.labels.time}">
                    </div>
                    <div class="ct-schedule-form__field is-full">
                        <label for="ct-schedule-title">${content.form.labels.title}</label>
                        <input id="ct-schedule-title" name="title" type="text" value="${event?.title || ''}" placeholder="${content.form.placeholders.title}" aria-label="${content.form.labels.title}">
                    </div>
                    <div class="ct-schedule-form__field is-full">
                        <label for="ct-schedule-location">${content.form.labels.location}</label>
                        <input id="ct-schedule-location" name="location" type="text" value="${event?.location || ''}" placeholder="${content.form.placeholders.location}" aria-label="${content.form.labels.location}">
                    </div>
                    <div class="ct-schedule-form__field is-full">
                        <label for="ct-schedule-tags">${content.form.labels.tags}</label>
                        <input id="ct-schedule-tags" name="tags" type="text" value="${Array.isArray(event?.tags) ? event.tags.join(', ') : ''}" placeholder="${content.form.placeholders.tags}" aria-label="${content.form.labels.tags}">
                    </div>
                    <div class="ct-schedule-form__field is-full">
                        <label class="ct-schedule-form__toggle">
                            <input name="reminderEnabled" type="checkbox"${event?.reminderEnabled ? ' checked' : ''}>
                            <span>${content.form.labels.reminder || (locale === 'zh-CN' ? '提醒' : 'Reminder')}</span>
                        </label>
                    </div>
                </div>
                <div class="ct-schedule-form__actions">
                    <a class="ct-schedule-form__cancel" href="schedule.html">${sharedCopy.actions.cancel}</a>
                    <button class="ct-schedule-form__submit" type="submit">${isEditing ? (content.form.actions?.update || (locale === 'zh-CN' ? '更新日程' : 'Update Event')) : (content.form.actions?.save || sharedCopy.actions.saveEvent)}</button>
                </div>
            </form>
        </section>
    `;
}

export function renderScheduleEventPage() {
    const topbarRoot = document.querySelector('[data-ct-topbar]');
    const shellRoot = document.querySelector('[data-ct-schedule-event-shell]');
    const bottomNavRoot = document.querySelector('[data-ct-bottom-nav]');
    const syncFeedbackRoot = ensureSyncFeedbackRoot(topbarRoot, 'schedule-event');
    const eventId = getEventId();
    const listenerCleanups = [];
    
    const paint = () => {
        const locale = getLocale();
        const content = getScheduleContent(locale);
        const scheduleDraft = eventId ? null : getScheduleDraft();
        const event = eventId ? getScheduleEventById(eventId, locale) : scheduleDraft;
        const contract = createScheduleEventPageContract({
            locale,
            eventId,
            content,
            event,
            scheduleDraft,
            syncStates: {
                schedule: getScheduleSyncState()
            }
        });
        applyLocaleDocument('scheduleEvent', locale);

        if (topbarRoot) {
            topbarRoot.innerHTML = renderTopbar({
                leftLabel: contract.derivedView.topbar.leftLabel,
                leftIcon: '←',
                leftHref: contract.derivedView.topbar.leftHref,
                rightLabel: getSharedCopy(locale).topbar.openProfile,
                rightIcon: '◐',
                rightHref: contract.derivedView.topbar.rightHref
            });
        }

        if (shellRoot) shellRoot.innerHTML = renderScheduleEventForm(contract.derivedView.content, locale, contract.derivedView.event);
        if (bottomNavRoot) bottomNavRoot.innerHTML = renderBottomNav('me');
    };

    const handleSubmit = (submitEvent) => {
        const form = submitEvent.target.closest('[data-ct-schedule-event-form]');
        if (!form) return;
        submitEvent.preventDefault();

        const locale = getLocale();
        const content = getScheduleContent(locale);
        const formData = new window.FormData(form);
        const title = String(formData.get('title') || '').trim();
        if (!title) return;

        const payload = {
            tab: String(formData.get('tab') || 'upcoming'),
            day: String(formData.get('day') || '').trim() || content.form.fallback.day,
            label: String(formData.get('label') || '').trim() || content.form.fallback.dateLabel,
            time: String(formData.get('time') || '').trim() || content.form.fallback.time,
            title,
            location: String(formData.get('location') || '').trim() || content.form.fallback.location,
            tags: String(formData.get('tags') || '')
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            reminderEnabled: formData.get('reminderEnabled') === 'on'
        };

        const nextId = String(formData.get('eventId') || '').trim();
        if (nextId) {
            updateScheduleEvent(nextId, payload, locale);
        } else {
            createScheduleEvent(payload, locale);
            clearScheduleDraft();
        }

        navigateTo('schedule.html');
    };
    shellRoot?.addEventListener('submit', handleSubmit);
    if (shellRoot) {
        listenerCleanups.push(() => shellRoot.removeEventListener('submit', handleSubmit));
    }

    const binding = bindPageStores({
        paint,
        subscriptions: [
            (listener) => subscribeScheduleStore(listener)
        ],
        hydrators: [
            () => hydrateSchedule(getLocale())
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
                    retry: (locale) => retryScheduleSync(locale)
                }
            ]
        }
    });

    return {
        ...binding,
        teardown() {
            binding.teardown();
            listenerCleanups.forEach((cleanup) => cleanup());
        }
    };
}
