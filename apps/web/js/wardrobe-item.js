import { requireAuth } from './lib/authGuard.js'
import { renderWardrobeItemPage } from './pages/wardrobeItemPage.js'

if (requireAuth()) {
    renderWardrobeItemPage()
}
