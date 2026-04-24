import { requireAuth } from './lib/authGuard.js';
import { renderScheduleEventPage } from './pages/scheduleEventPage.js';

if (requireAuth()) {
    renderScheduleEventPage();
}
