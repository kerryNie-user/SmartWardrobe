import { getLocale, getSharedCopy } from '../lib/locale.js';

export function renderScheduleOverview(overview, form = '') {
    const sharedCopy = getSharedCopy(getLocale());
    return `
        <section class="ct-schedule-overview">
            <div class="ct-schedule-overview__header">
                <div>
                    <span class="ct-eyebrow">${overview.eyebrow}</span>
                    <h1 class="ct-schedule-overview__title">${overview.title}</h1>
                </div>
                <a class="ct-schedule-overview__action" href="schedule-event.html">${sharedCopy.actions.addEvent}</a>
            </div>
            <div class="ct-schedule-overview__metric">
                <span class="ct-schedule-overview__value">${overview.value}</span>
                <span class="ct-schedule-overview__meta">${overview.meta}</span>
            </div>
            <p class="ct-schedule-overview__note">${overview.note}</p>
            ${form}
        </section>
    `;
}
