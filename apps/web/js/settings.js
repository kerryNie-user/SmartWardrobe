import { requireAuth } from './lib/authGuard.js';
import { renderSettingsPage } from './pages/settingsPage.js';

if (requireAuth()) {
    renderSettingsPage();
}
