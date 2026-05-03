# SmartWardrobe

SmartWardrobe is a comprehensive personal wardrobe management solution that helps users organize clothing, plan outfits, and iterate on cross-platform experiences. The repository currently keeps the new web app, the legacy web app, Android, and two backend variants side by side during a transition period.

## 🏗 Project Architecture

```mermaid
graph TD
    User[User] --> WebApp[Web Application]
    User --> AndroidApp[Android Application]
    WebApp --> LocalStorage[Local Storage]
    AndroidApp --> NativeModules[Native Modules]
    NativeModules --> WebApp
```

## 📦 Project Structure

### 📂 Directories

- **`apps/web-new/`**: Current main web app under active development.
- **`apps/android/`**: Android client.
- **`services/backend_lite/`**: Lightweight JSON-backed backend for frontend-first development.
- **`docs/product/`**: Product-facing documentation.
- **`docs/superpowers/`**: Planning and spec documents.
- **`scripts/dev/`**: Start scripts for local development.
- **`scripts/android/`**: Android tooling scripts.
- **`scripts/data/`**: Data/bootstrap scripts.
- **`assets/`**: Branding assets, APKs, and archived placeholders.

## 🧩 Local Backend

Run the lightweight integrated server for the new web app (static frontend + APIs):

```bash
zsh ./scripts/dev/start_lite_backend.sh
```

Default port is `8140` (set `LITE_BACKEND_PORT` to change).

## 🛠 Tech Stack

### Web Application
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: LocalStorage API
- **Internationalization**: Custom i18n implementation
- **Theme**: Light/Dark mode support

### Android Application
- **Language**: Kotlin/Java
- **IDE**: Android Studio
- **WebView**: Integration with WebApp

## 🚀 Quick Navigation

- [New Web App](apps/web-new/)
- [Android Application Documentation](apps/android/README.md)
- [User Guide](docs/product/USER_GUIDE.md)
- [Server Setup](docs/product/SERVER_SETUP.md)

## 💻 Developer Guide

### Web Development
For active web development tasks:
[Go to New Web App](apps/web-new/README.md)

### Android Development
For native feature implementation and APK building:
[Go to Android Development Guide](apps/android/README.md)

---
**Version**: 1.2.0
**Last Updated**: 2026-03-14
**Maintainer**: SmartWardrobe Team
