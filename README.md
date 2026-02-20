# SmartWardrobe

SmartWardrobe is a comprehensive personal wardrobe management solution that helps users organize their clothing, plan outfits, and receive daily recommendations. The project consists of a cross-platform architecture with a Web Application and an Android Application.

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

- **`App/`**: Contains the source code for the Web and Android applications.
- **`images/`**: Stores general project assets and images.
- **`node_modules/`**: Dependencies installed via npm.
- **`scripts/`**: Utility scripts, including the automated Android installer.

### 📄 Files

- **`.gitignore`**: Specifies files and directories to be ignored by Git.
- **`AppLogo.jpg`**: The official logo of the SmartWardrobe application.
- **`package-lock.json`**: Auto-generated file that locks the versions of npm dependencies.
- **`package.json`**: Defines project metadata, scripts, and dependencies.
- **`README.md`**: The main entry point for project documentation.
- **`SERVER_SETUP.md`**: Comprehensive guide for setting up the backend server environment.
- **`server.py`**: A lightweight Python script to serve the web application locally.
- **`SmartWardrobe.apk`**: The compiled Android application package file.
- **`USER_GUIDE.md`**: Instructions and manual for end-users of the application.

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

- [Web Application Documentation](App/WebApp/README.md)
- [Android Application Documentation](App/AndroidApp/README.md)
- [User Guide](USER_GUIDE.md)

## 💻 Developer Guide

### Web Development
For web development tasks, including UI updates and logic changes:
[Go to Web Development Guide](App/WebApp/README.md)

### Android Development
For native feature implementation and APK building:
[Go to Android Development Guide](App/AndroidApp/README.md)

---
**Version**: 1.1.0
**Last Updated**: 2026-02-20
**Maintainer**: SmartWardrobe Team
