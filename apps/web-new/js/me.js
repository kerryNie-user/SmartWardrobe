import { requireAuth } from './lib/authGuard.js';
import { renderMePage } from './pages/mePage.js';

if (requireAuth()) {
    renderMePage();
}
