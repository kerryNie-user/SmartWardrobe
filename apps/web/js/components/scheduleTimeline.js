import { getLocale, getSharedCopy, getUiCopy } from '../lib/locale.js';
import { renderStatePanel } from './statePanel.js';
import { renderLoadFailedPanel } from './errorPanel.js';

export function renderScheduleTimeline(groups, syncState = null, options = {}) {
    const locale = getLocale();
    const sharedCopy = getSharedCopy(locale);
    const uiCopy = getUiCopy(locale);
    const mode = options.mode || 'upcoming';
    if (!groups.length) {
        if (syncState?.status === 'failed') {
            const message = String(syncState?.error || '').trim();
            return renderLoadFailedPanel(message, uiCopy.states.scheduleLoadFailed);
        }
        return renderStatePanel({
            kind: 'empty',
            eyebrow: options.emptyEyebrow || sharedCopy.misc.noEvents,
            description: options.emptyDescription || uiCopy.states.scheduleEmptyDescription
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
                                <article class="ct-schedule-card${mode === 'history' ? ' is-history' : ''}">
                                    <div class="ct-schedule-card__content">
                                        <div class="ct-schedule-card__topline">
                                            <span class="ct-schedule-card__time">${event.time}</span>
                                            <div class="ct-schedule-card__controls">
                                                ${mode === 'history' ? '' : `
                                                    <button class="ct-schedule-card__toggle js-toggle-reminder${event.reminderEnabled ? ' is-active' : ''}" type="button" data-ct-toggle-schedule-reminder="${event.id}" aria-pressed="${event.reminderEnabled ? 'true' : 'false'}">${uiCopy.schedule.reminder}</button>
                                                    <a class="ct-schedule-card__edit" href="schedule-event.html?id=${event.id}">${uiCopy.schedule.edit}</a>
                                                `}
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
