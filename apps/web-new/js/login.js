import { redirectIfAuthenticated } from './lib/authGuard.js'
import { renderLoginPage } from './pages/loginPage.js'

if (!redirectIfAuthenticated()) {
    renderLoginPage()
}
