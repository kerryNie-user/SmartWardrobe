import { renderTopbar } from '../components/topbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { ensureSyncFeedbackRoot } from '../components/syncFeedback.js';
import { bindFormNoticeActions, renderFormNotice } from '../components/formNotice.js';
import { applyLocaleDocument, getLocale, getSharedCopy } from '../lib/locale.js';
import { navigateTo } from '../lib/navigation.js';
import { getQueryParam } from '../lib/navigationAdapter.js';
import { getFormFeedbackCopy, focusFirstInvalidField, setFormSubmitting, validateRequired } from '../lib/formValidation.js';
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
                <div data-ct-form-notice></div>
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
    let formNotice = null;
    let isInvalidEventId = false;
    let noticeCleanup = () => {};
    let syncCleanup = null;
    let submissionActive = false;
    
    const paint = () => {
        const locale = getLocale();
        const content = getScheduleContent(locale);
        const scheduleDraft = eventId ? null : getScheduleDraft();
        const event = eventId ? getScheduleEventById(eventId, locale) : scheduleDraft;
        isInvalidEventId = Boolean(eventId) && !event;
        const copy = getFormFeedbackCopy(locale);
        if (isInvalidEventId) {
            formNotice = {
                tone: 'error',
                title: locale === 'zh-CN' ? '未找到日程' : 'Schedule event not found',
                message: locale === 'zh-CN'
                    ? '当前链接的日程不存在，无法继续编辑。'
                    : 'This schedule event does not exist and cannot be edited.',
                actions: [
                    { key: 'continue-create', label: copy.actions.continueCreate },
                    { key: 'leave', label: copy.actions.back, variant: 'secondary' }
                ]
            };
        }
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

        if (shellRoot) {
            const noticeRoot = shellRoot.querySelector('[data-ct-form-notice]');
            if (noticeRoot) {
                noticeCleanup();
                noticeRoot.innerHTML = renderFormNotice(formNotice);
                noticeCleanup = bindFormNoticeActions(noticeRoot, {
                    retry() {
                        const nextLocale = getLocale();
                        const copy = getFormFeedbackCopy(nextLocale);
                        submissionActive = true;
                        setFormSubmitting(shellRoot.querySelector('[data-ct-schedule-event-form]'), true);
                        formNotice = {
                            tone: 'info',
                            title: copy.status.syncing,
                            message: null,
                            actions: [{ key: 'leave', label: copy.actions.leave, variant: 'secondary' }]
                        };
                        noticeRoot.innerHTML = renderFormNotice(formNotice);
                        retryScheduleSync(nextLocale);
                    },
                    leave() {
                        submissionActive = false;
                        syncCleanup?.();
                        syncCleanup = null;
                        navigateTo('schedule.html');
                    },
                    'continue-create'() {
                        submissionActive = false;
                        syncCleanup?.();
                        syncCleanup = null;
                        navigateTo('schedule-event.html');
                    }
                });
            }

            const submitButton = shellRoot.querySelector('.ct-schedule-form__submit');
            if (submitButton) {
                submitButton.disabled = Boolean(isInvalidEventId);
            }
        }
    };

    const handleSubmit = (submitEvent) => {
        const form = submitEvent.target.closest('[data-ct-schedule-event-form]');
        if (!form) return;
        submitEvent.preventDefault();

        const locale = getLocale();
        const content = getScheduleContent(locale);
        const copy = getFormFeedbackCopy(locale);

        if (isInvalidEventId) {
            return;
        }

        const formData = new window.FormData(form);
        const validation = validateRequired(formData, [
            { field: 'title', label: content.form.labels.title }
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

        const title = String(formData.get('title') || '').trim();

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

        const nextId = String(formData.get('eventId') || '').trim();
        if (nextId) {
            updateScheduleEvent(nextId, payload, locale);
        } else {
            createScheduleEvent(payload, locale);
            clearScheduleDraft();
        }

        syncCleanup?.();
        syncCleanup = subscribeScheduleSyncState((state) => {
            if (!submissionActive) return;
            const current = state?.status || 'idle';
            const latestLocale = getLocale();
            const copy = getFormFeedbackCopy(latestLocale);
            const noticeRoot = form.querySelector('[data-ct-form-notice]');

            if (current === 'synced') {
                setFormSubmitting(form, false);
                formNotice = {
                    tone: 'success',
                    title: copy.status.saved,
                    message: null,
                    actions: []
                };
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice);
                submissionActive = false;
                syncCleanup?.();
                syncCleanup = null;
                window.setTimeout(() => navigateTo('schedule.html'), 0);
                return;
            }

            if (current === 'failed') {
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

            if (current === 'conflict') {
                setFormSubmitting(form, false);
                formNotice = {
                    tone: 'warning',
                    title: copy.status.conflict,
                    message: null,
                    actions: [
                        { key: 'retry', label: copy.actions.retry },
                        { key: 'leave', label: copy.actions.leave, variant: 'secondary' }
                    ]
                };
                if (noticeRoot) noticeRoot.innerHTML = renderFormNotice(formNotice);
                return;
            }

            if (current === 'stale') {
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
            noticeCleanup();
            syncCleanup?.();
        }
    };
}
