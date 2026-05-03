import { redirectIfAuthenticated } from './lib/authGuard.js'
import { renderRegisterPage } from './pages/registerPage.js'

if (!redirectIfAuthenticated()) {
    renderRegisterPage()
}
