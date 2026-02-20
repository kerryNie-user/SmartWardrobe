# SmartWardrobe Android Application

The Android shell for the SmartWardrobe web application, providing native capabilities and a standalone app experience.

## 🛠 Prerequisites

- **Android Studio**: Latest Stable Version (Koala or later recommended)
- **JDK**: JDK 11 or higher
- **Android SDK**: API Level 30+ (Android 11+)
- **Gradle**: Wrapper provided in the project

## 🚀 Getting Started

1. **Open the Project**
   - Launch Android Studio.
   - Select "Open an existing Android Studio project".
   - Navigate to `App/AndroidApp`.

2. **Sync Project**
   - Click "Sync Project with Gradle Files".
   - Wait for dependencies to resolve.

3. **Run on Emulator**
   - Create an AVD (Android Virtual Device) via AVD Manager.
   - Select a device (e.g., Pixel 4) with API 30+.
   - Click the "Run" button (Green Play Icon).

4. **Build APK**
   - Go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
   - Find the output in `app/build/outputs/apk/debug/`.

## 📦 Project Structure

### 📂 Directories

- **`.gradle/`**: Caches and internal files used by the Gradle build system.
- **`app/`**: The main Android application module containing source code and resources.
- **`build/`**: Directory containing build artifacts and intermediate files.
- **`gradle/`**: Wrapper files ensuring the correct Gradle version is used.

### 📄 Files

- **`build.gradle.kts`**: Root-level build configuration script using Kotlin DSL.
- **`gradle.properties`**: Configuration properties for the Gradle build environment.
- **`gradlew`**: Shell script to run Gradle tasks on Unix-based systems.
- **`gradlew.bat`**: Batch script to run Gradle tasks on Windows.
- **`local.properties`**: Local configuration file (e.g., SDK location), usually not version controlled.
- **`README.md`**: Documentation specific to the Android Application module.
- **`settings.gradle.kts`**: Defines the project structure and included modules.

## 🔧 Native Integration

This app uses a `WebView` to load the local HTML files from the `assets` folder.

- **WebView Config**: Located in `MainActivity.java` / `MainActivity.kt`.
- **JavaScript Interface**: Allows communication between web and native code.

## 📱 Testing

- Ensure "USB Debugging" is enabled on your physical device.
- Use Logcat to view logs from both native code and `console.log` from the WebView (filtered by `chromium`).

---
**Version**: 1.0.0
**Last Updated**: 2026-02-20
**Maintainer**: SmartWardrobe Android Team
