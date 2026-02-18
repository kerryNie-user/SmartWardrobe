# ClosetTwin (SmartWardrobe)

ClosetTwin 是一款智能衣橱管理 Web 应用，旨在帮助用户数字化管理个人衣物，提供每日穿搭建议，并根据天气和场合推荐最佳搭配。

## 目录 (Table of Contents)

*   [✨ 核心功能](#-核心功能)
*   [🛠️ 技术栈](#-技术栈)
*   [📂 项目结构](#-项目结构)
*   [🏗️ Development Environment Setup Guide](#-development-environment-setup-guide)
    *   [1. System Environment Preparation](#1-system-environment-preparation)
    *   [2. Development Tools Installation](#2-development-tools-installation)
    *   [3. Runtime & Environment Configuration](#3-runtime--environment-configuration)
    *   [4. Project Dependencies & Initialization](#4-project-dependencies--initialization)
    *   [5. Project Initialization & Build](#5-project-initialization--build)
    *   [6. Running the Application](#6-running-the-application)
    *   [7. Database & Services](#7-database--services)
    *   [8. Verification & Troubleshooting](#8-verification--troubleshooting)
*   [🚀 快速预览 (Web Only)](#-快速预览-web-only)
*   [📖 文档资源](#-文档资源)
*   [🤝 贡献](#-贡献)
*   [📝 作者](#-作者)

## ✨ 核心功能

*   **👗 数字化衣橱**: 拍照上传衣物，按类别（上装、下装、鞋履等）分类管理。
*   **📅 每日穿搭推荐**: 根据当前天气和用户职业，智能推荐每日穿搭组合。
*   **📍 自动定位与天气**: 集成地理位置服务，自动获取当地天气信息，为穿搭建议提供依据。
*   **👤 个性化资料**: 设置职业、地区偏好，定制专属的时尚建议。
*   **🌍 多语言支持**: 支持简体中文 (zh-CN) 和 英语 (en-US) 切换。
*   **📱 移动端优先设计**: 响应式布局，提供类似原生 App 的流畅体验（支持触摸反馈、滑动手势）。
*   **🌓 深色模式**: 支持系统自动切换或手动设置深色/浅色主题。

## 🛠️ 技术栈

*   **前端**: 原生 HTML5, CSS3, JavaScript (ES6+)
*   **UI 设计**: 极简主义黑白风格 (Minimalist Black & White)，Glassmorphism (毛玻璃效果)
*   **图标**: SVG 图标
*   **字体**: Inter (Google Fonts)
*   **数据存储**: LocalStorage (目前为纯前端演示版，数据存储在本地浏览器)

## 📂 项目结构

```
SmartWardrobe/
├── App/
│   ├── AndroidApp/        # Android 客户端项目
│   └── WebApp/
│       └── wardrobe/
│           ├── css/               # 样式文件 (style.css, auto-location.css 等)
│           ├── js/                # 逻辑脚本 (app.js, i18n.js, theme.js 等)
│           ├── images/            # 资源图片
│           ├── index.html         # 首页
│           ├── wardrobe.html      # 衣橱页
│           ├── profile.html       # 个人中心页
│           ├── login.html         # 登录页
│           ├── register.html      # 注册页
│           └── *.json             # 国际化语言包
└── README.md                      # 项目说明文档
```

## 🏗️ Development Environment Setup Guide

### 1. System Environment Preparation

#### Hardware Requirements
*   **RAM**: Minimum 8GB (16GB+ recommended for Android Studio).
*   **Disk Space**: At least 20GB of free space.
*   **Operating System**:
    *   **macOS**: macOS 12 (Monterey) or later.
    *   **Windows**: Windows 10/11 (64-bit).

#### Permissions
*   Ensure you have Administrator/Sudo privileges to install software.

### 2. Development Tools Installation

#### A. Java Development Kit (JDK)
The project uses Gradle 8.4, which requires **Java 17**.

1.  **Download**: Go to the [Oracle JDK 17 Downloads](https://www.oracle.com/java/technologies/downloads/#java17) or [Adoptium (Temurin) 17](https://adoptium.net/).
2.  **Install**: Follow the installer instructions for your OS.
3.  **Verify**:
    Open a terminal (Terminal on Mac, PowerShell/CMD on Windows) and run:
    ```bash
    java -version
    ```
    *Output should look like: `java version "17.0.x"...`*

#### B. Android Studio (IDE)
1.  **Download**: Get the latest version from [developer.android.com/studio](https://developer.android.com/studio).
2.  **Install**:
    *   **Windows**: Run the `.exe` and ensure "Android Virtual Device" is checked.
    *   **macOS**: Drag Android Studio to Applications.
3.  **Setup Wizard**:
    *   Choose **Standard** setup.
    *   Accept licenses to install the **Android SDK**.

#### C. Git (Version Control)
1.  **Download**: [git-scm.com](https://git-scm.com).
2.  **Install**: Use default settings.
3.  **Verify**:
    ```bash
    git --version
    ```

#### D. VS Code (Optional for Web Editing)
While Android Studio is main, VS Code is better for editing the HTML/JS files in `App/WebApp`.

1.  **Download**: [code.visualstudio.com](https://code.visualstudio.com).

### 3. Runtime & Environment Configuration

#### Android SDK Setup
1.  Open **Android Studio**.
2.  Go to **Settings/Preferences** > **Languages & Frameworks** > **Android SDK**.
3.  **SDK Platforms**: Ensure **Android 14.0 ("UpsideDownCake")** (API Level 34) is checked.
4.  **SDK Tools**: Ensure the following are checked:
    *   Android SDK Build-Tools
    *   Android Emulator
    *   Android SDK Platform-Tools

#### Environment Variables (Windows Only)
macOS usually handles this automatically, but for Windows:

1.  Search for "Edit the system environment variables".
2.  Click **Environment Variables**.
3.  Under **System variables**, add `JAVA_HOME` pointing to your JDK installation (e.g., `C:\Program Files\Java\jdk-17`).
4.  Add `%JAVA_HOME%\bin` to the `Path` variable.

### 4. Project Dependencies & Initialization

#### A. Get the Code
```bash
git clone <repository-url> SmartWardrobe
cd SmartWardrobe
```

#### B. Understanding the Project Structure
*   **`App/AndroidApp`**: The main Android project.
*   **`App/WebApp`**: The web frontend (HTML/CSS/JS).
*   **`App/AndroidApp/app/src/main/assets/wardrobe`**: A copy of the WebApp used by the Android app.

**Note on Dependencies**:
*   **Android**: Dependencies are managed by Gradle and will be downloaded automatically by Android Studio.
*   **Web**: This project uses vanilla HTML/JS and has **no `npm` or `yarn` dependencies** to install. It runs directly in the browser/WebView.

### 5. Project Initialization & Build

1.  **Open Project**:
    *   Launch **Android Studio**.
    *   Select **Open**.
    *   Navigate to and select `SmartWardrobe/App/AndroidApp` (select the folder containing `build.gradle.kts`).

2.  **Sync Gradle**:
    *   Android Studio will automatically start "Syncing Project with Gradle Files".
    *   Wait for the progress bar at the bottom right to finish.
    *   *If prompted to upgrade Gradle wrapper, you can accept, but the current version (8.4) works.*

3.  **Configure the Entry Point**:
    By default, the app is configured to open a test URL. You need to switch it to the local app.
    *   Open `App/AndroidApp/app/src/main/java/com/example/smartwardrobe/MainActivity.kt`.
    *   Locate lines 30-32:
        ```kotlin
        // webView.loadUrl("https://www.baidu.com")  <-- Comment this out
        webView.loadUrl("file:///android_asset/wardrobe/index.html") // <-- Uncomment this
        ```

### 6. Running the Application

#### Option A: Android Emulator
1.  In Android Studio, click the **Device Manager** icon (phone icon on top right).
2.  Click **Create Device**.
3.  Choose a device (e.g., Pixel 7) and click **Next**.
4.  Select a System Image (API 34 recommended) and click **Download** if needed, then **Next** > **Finish**.
5.  Click the green **Run** (Play) button in the toolbar.

#### Option B: Physical Device
1.  Enable **Developer Options** on your Android phone (Settings > About Phone > Tap "Build Number" 7 times).
2.  Enable **USB Debugging** in Developer Options.
3.  Connect phone via USB.
4.  Select your phone in the Android Studio device dropdown and click **Run**.

### 7. Database & Services
*   **Current State**: The application currently uses **Mock Data** stored in the browser's `localStorage`.
*   **No Database Installation Required**: You do *not* need to install MySQL, PostgreSQL, or MongoDB at this stage.
*   **Future Integration**: Refer to `App/WebApp/wardrobe/BACKEND_INTEGRATION_GUIDE.md` when you are ready to connect a real backend.

### 8. Verification & Troubleshooting

#### Verification
1.  **Build Successful**: Android Studio bottom bar shows "Build: successful".
2.  **App Launches**: The emulator/phone opens the "Smart Wardrobe" app.
3.  **Functionality**: You should see the login screen (Mock Login). You can click "Login" (usually auto-fills or accepts any input in mock mode) and see the Wardrobe inventory.

#### Common Issues & Solutions

| Issue | Solution |
| :--- | :--- |
| **"Grade sync failed: Unsupported Java"** | Ensure JDK 17 is selected in Android Studio: `Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK`. |
| **"SDK location not found"** | Create a `local.properties` file in `App/AndroidApp/` with `sdk.dir=/Users/yourname/Library/Android/sdk` (Mac) or `C:\\Users\\yourname\\AppData\\Local\\Android\\Sdk` (Windows). |
| **White Screen / 404 Error** | Double-check `MainActivity.kt`. Ensure you are loading `file:///android_asset/wardrobe/index.html` and NOT `https://...`. |
| **Emulator slow** | Enable HAQM (Hardware Accelerated Execution Manager) in SDK Tools or use a physical device. |

### Summary Checklist
- [ ] JDK 17 Installed
- [ ] Android Studio Installed & SDK 34 Downloaded
- [ ] Project Cloned
- [ ] `MainActivity.kt` updated to load local file
- [ ] Gradle Sync Successful
- [ ] App Runs on Emulator/Device

## 🚀 快速预览 (Web Only)

如果你只想查看 Web 前端效果，无需安装 Android Studio。

**使用 Live Server (VS Code 插件):**
1.  在 VS Code 中打开 `App/WebApp/wardrobe` 文件夹。
2.  右键 `index.html`，选择 "Open with Live Server"。

**使用 Python:**
```bash
cd App/WebApp/wardrobe
# Python 3
python -m http.server 8000
# 然后访问 http://localhost:8000
```

## 📖 文档资源

*   [API 文档](App/WebApp/wardrobe/API_DOCUMENTATION.md): 后端接口规范说明。
*   [自动定位功能指南](App/WebApp/wardrobe/AUTO_LOCATION_GUIDE.md): 自动定位功能的实现细节。
*   [后端集成指南](App/WebApp/wardrobe/BACKEND_INTEGRATION_GUIDE.md): 前后端对接说明。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进 ClosetTwin！

## 📝 作者

*   **Kerry Nie** - *项目负责人* - [KerryNie-user](https://github.com/kerryNie-user)
