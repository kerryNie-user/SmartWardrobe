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
   Open your browser and navigate to `http://localhost:8000/index.html`.

## 📦 Project Structure

### 📂 Directories

- **`css/`**: Stylesheets using CSS/Sass for application styling.
- **`docs/`**: Additional documentation files.
- **`images/`**: Static image assets used within the web application.
- **`js/`**: JavaScript source code files containing application logic.
- **`tests/`**: Unit and integration tests for the web application.

### 📄 Files

- **`API_DOCUMENTATION.md`**: Detailed reference for API endpoints and data structures.
- **`AUTO_LOCATION_GUIDE.md`**: Documentation for the auto-location feature implementation.
- **`BACKEND_INTEGRATION_GUIDE.md`**: Guide for connecting the frontend with backend services.
- **`en-US.json`**: English language translation file for internationalization.
- **`index.html`**: The main landing page of the application.
- **`login.html`**: User authentication and login interface.
- **`profile.html`**: User profile management page.
- **`README.md`**: Documentation specific to the Web Application module.
- **`register.html`**: New user registration interface.
- **`wardrobe.html`**: The core wardrobe management interface.
- **`zh-CN.json`**: Chinese (Simplified) language translation file.

## 🔧 Debugging

- Use Chrome DevTools for inspecting elements and console logs.
- LocalStorage can be inspected in the "Application" tab.
- Mobile responsiveness can be tested using the "Device Toolbar" in DevTools.

## 📚 API Reference

While this is a client-side app, it mocks backend interactions.
See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for details on data structures.

## 📝 Code Style

- Use ES6+ syntax.
- Follow BEM naming convention for CSS classes.
- Ensure all text is internationalized using `data-i18n` attributes.

---
**Version**: 1.1.0
**Last Updated**: 2026-02-20
**Maintainer**: SmartWardrobe Web Team
