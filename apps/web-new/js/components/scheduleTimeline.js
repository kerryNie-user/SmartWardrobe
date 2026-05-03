import { getLocale, getSharedCopy } from '../lib/locale.js';
import { renderStatePanel } from './statePanel.js';
import { renderLoadFailedPanel } from './errorPanel.js';

export function renderScheduleTimeline(groups, syncState = null) {
    const sharedCopy = getSharedCopy(getLocale());
    if (!groups.length) {
        if (syncState?.status === 'failed') {
            const message = String(syncState?.error || '').trim();
            return renderLoadFailedPanel(message, getLocale() === 'zh-CN' ? '日程加载失败。' : 'Failed to load schedule.');
        }
        return renderStatePanel({
            kind: 'empty',
            eyebrow: sharedCopy.misc.noEvents,
            description: getLocale() === 'zh-CN' ? '添加一条新日程，开始完善这个时间视图。' : 'Add a new event to start shaping this schedule view.'
        });
    }

    return `
        <ol class="ct-schedule-timeline">
            ${groups.map((group) => `
                <li class="ct-schedule-group">
                    <div class="ct-schedule-group__date">
                        <span class="ct-schedule-group__day">${group.day}</span>
                        <span class="ct-schedule-group__label">${group.label}</span>
                    </div>
                    <ul class="ct-schedule-group__events">
                        ${group.events.map((event) => `
                            <li class="ct-schedule-group__event-item">
                                <article class="ct-schedule-card">
                                    <div class="ct-schedule-card__content">
                                        <div class="ct-schedule-card__topline">
                                            <span class="ct-schedule-card__time">${event.time}</span>
                                            <div class="ct-schedule-card__controls">
                                                <button class="ct-schedule-card__toggle js-toggle-reminder${event.reminderEnabled ? ' is-active' : ''}" type="button" data-ct-toggle-schedule-reminder="${event.id}" aria-pressed="${event.reminderEnabled ? 'true' : 'false'}">${getLocale() === 'zh-CN' ? '提醒' : 'Reminder'}</button>
                                                <a class="ct-schedule-card__edit" href="schedule-event.html?id=${event.id}">${getLocale() === 'zh-CN' ? '编辑' : 'Edit'}</a>
                                                <button class="ct-schedule-card__delete js-request-delete" type="button" data-ct-delete-schedule="${event.id}" aria-label="${sharedCopy.actions.delete} ${event.title}">${sharedCopy.actions.delete}</button>
                                            </div>
                                        </div>
                                        <h2 class="ct-schedule-card__title">${event.title}</h2>
                                        <p class="ct-schedule-card__location">${event.location}</p>
                                        <ul class="ct-schedule-card__tags">
                                            ${(Array.isArray(event.tags) ? event.tags : []).map((tag) => `
                                                <li class="ct-schedule-card__tag">${tag}</li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                </article>
                            </li>
                        `).join('')}
                    </ul>
                </li>
            `).join('')}
        </ol>
    `;
}
