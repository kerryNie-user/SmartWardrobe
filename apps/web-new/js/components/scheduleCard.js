export function renderScheduleCard(schedule) {
    return `
        <div class="ct-schedule-card">
            <div class="ct-home-schedule__header">
                <span class="ct-eyebrow">${schedule.label}</span>
                <a class="ct-home-schedule__link" href="${schedule.actionHref || '#'}">${schedule.actionText}</a>
            </div>
            <div class="ct-home-schedule__body">
                <h2 class="ct-home-schedule__title">${schedule.title}</h2>
                <div class="ct-home-schedule__meta">
                    <span>${schedule.location}</span>
                    <span>${schedule.time}</span>
                </div>
            </div>
        </div>
    `;
}
