import { requireAuth } from './lib/authGuard.js'
import { renderFavoritesPage } from './pages/favoritesPage.js'

if (requireAuth()) {
    renderFavoritesPage()
}
