import { requireAuth } from './lib/authGuard.js';
import { renderProfilePage } from './pages/profilePage.js';

if (requireAuth()) {
    renderProfilePage();
}
