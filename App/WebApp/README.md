# SmartWardrobe Web Application

The core logic and UI of the SmartWardrobe application, built with standard web technologies.

## 🛠 Prerequisites

- **Node.js**: v14.0.0 or higher (for local development server if needed)
- **Browser**: Chrome/Safari/Edge (latest versions)
- **Editor**: VS Code (recommended)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   ```

2. **Navigate to the web app directory**
   ```bash
   cd App/WebApp
   ```

3. **Launch Development Server**
   You can use any static file server. For example with Python:
   ```bash
   python3 -m http.server 8000
   ```
   Or using `http-server` (npm):
   ```bash
   npx http-server .
   ```

4. **Access the App**
   Open your browser and navigate to `http://localhost:8000/wardrobe/index.html`.

## 📦 Project Structure

```
App/WebApp/wardrobe/
├── css/            # Stylesheets (Sass/CSS)
├── js/             # Application Logic
│   ├── app.js      # Main entry point
│   ├── i18n.js     # Localization logic
│   └── theme.js    # Theme management
├── images/         # Assets
└── *.html          # HTML Templates
```

## 🔧 Debugging

- Use Chrome DevTools for inspecting elements and console logs.
- LocalStorage can be inspected in the "Application" tab.
- Mobile responsiveness can be tested using the "Device Toolbar" in DevTools.

## 📚 API Reference

While this is a client-side app, it mocks backend interactions.
See [API_DOCUMENTATION.md](wardrobe/API_DOCUMENTATION.md) for details on data structures.

## 📝 Code Style

- Use ES6+ syntax.
- Follow BEM naming convention for CSS classes.
- Ensure all text is internationalized using `data-i18n` attributes.

---
**Version**: 1.1.0
**Last Updated**: 2026-02-19
**Maintainer**: SmartWardrobe Web Team
