import { requireAuth } from './lib/authGuard.js';
import { renderProfileEditPage } from './pages/profileEditPage.js';

if (requireAuth()) {
    renderProfileEditPage();
}
