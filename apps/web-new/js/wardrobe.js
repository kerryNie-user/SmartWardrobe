import { requireAuth } from './lib/authGuard.js';
import { renderWardrobePage } from './pages/wardrobePage.js';

if (requireAuth()) {
    renderWardrobePage();
}
