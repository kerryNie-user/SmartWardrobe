import { buildHref } from './navigationAdapter.js'

export function buildOutfitDetailHref(id) {
    return buildHref('outfit-detail.html', { id })
}

export function buildScheduleEventHref() {
    return 'schedule-event.html'
}

