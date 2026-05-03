import { requireAuth } from './lib/authGuard.js'
import { renderWardrobeDetailPage } from './pages/wardrobeDetailPage.js'

if (requireAuth()) {
    renderWardrobeDetailPage()
}
