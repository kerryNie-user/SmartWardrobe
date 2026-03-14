# SmartWardrobe Web Application

SmartWardrobe 的 Web 端核心 UI 与前端逻辑（纯静态页面 + JavaScript）。

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
   You can use any static file server (UI only). For example with Python:
   ```bash
   python3 -m http.server 8001
   ```
   Or using `http-server` (npm):
   ```bash
   npx http-server .
   ```

4. **Access the App**
   Open your browser and navigate to `http://localhost:8001/index.html`.

### Using the Local Backend (Recommended for API features)
To use MySQL-backed APIs (e.g. i18n / favorites / schedules), run the integrated local server from repository root:

```bash
cd ../../
python3 server.py
```

Then open `http://localhost:8080/index.html`.

## 📦 Project Structure

### 📂 Directories

- **`css/`**: 样式文件（主题变量、页面布局、组件样式）。
- **`docs/`**: 设计规范与检查清单。
- **`images/`**: 静态图片资源（包含默认头像 SVG 等）。
- **`js/`**: 应用逻辑（i18n / theme / 页面交互）。
- **`tests/`**: 单测与 QA 产物（i18n、主题、定位等）。

### 📄 Files

- **`API_DOCUMENTATION.md`**: Detailed reference for API endpoints and data structures.
- **`AUTO_LOCATION_GUIDE.md`**: Documentation for the auto-location feature implementation.
- **`BACKEND_INTEGRATION_GUIDE.md`**: Guide for connecting the frontend with backend services.
- **`en-US.json`**: English language translation file for internationalization.
- **`index.html`**: The main landing page of the application.
- **`login.html`**: User authentication and login interface.
- **`favorites.html`**: 收藏页（Outfits / Picks 收藏列表）。
- **`profile.html`**: User profile management page.
- **`README.md`**: Documentation specific to the Web Application module.
- **`register.html`**: New user registration interface.
- **`schedule.html`**: 日程页（极简日程 + 日历条）。
- **`settings.html`**: 设置页（语言/主题/衣橱显示方式等）。
- **`wardrobe.html`**: The core wardrobe management interface.
- **`zh-CN.json`**: Chinese (Simplified) language translation file.

## ✅ Tests

From repository root:

```bash
npm test
```

## 🔧 Debugging

- Use Chrome DevTools for inspecting elements and console logs.
- LocalStorage can be inspected in the "Application" tab.
- Mobile responsiveness can be tested using the "Device Toolbar" in DevTools.

## 📚 API Reference

This project includes a lightweight local backend for API interactions.
See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for endpoints and data structures.

## 📝 Code Style

- Use ES6+ syntax.
- Follow BEM naming convention for CSS classes.
- Ensure all text is internationalized using `data-i18n` attributes.

---
**Version**: 1.4.0
**Last Updated**: 2026-03-14
**Maintainer**: SmartWardrobe Web Team
