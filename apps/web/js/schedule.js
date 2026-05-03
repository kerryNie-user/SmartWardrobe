import { requireAuth } from './lib/authGuard.js';
import { renderSchedulePage } from './pages/schedulePage.js';

if (requireAuth()) {
    renderSchedulePage();
}
