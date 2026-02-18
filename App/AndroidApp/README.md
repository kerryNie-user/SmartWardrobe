# SmartWardrobe Android App 开发与部署指南

这是一个基于 **Hybrid (混合开发)** 模式的 Android 项目。它本质上是一个原生的 Android "壳" (Shell)，内部使用 WebView 组件加载本地的 HTML/CSS/JS 网页应用。

这种架构让你只需维护一套 Web 代码，即可同时运行在浏览器和 Android 设备上。

---

## 📋 1. 环境准备 (Prerequisites)

在开始之前，你需要配置 Android 开发环境。

### 1.1 下载并安装 Android Studio (推荐)
这是官方集成开发环境 (IDE)，它会自动帮你安装 SDK、模拟器和构建工具。
- **下载地址**: [Android Studio 官网](https://developer.android.com/studio)
- **安装步骤**:
- **关键**: 首次启动时，选择 **"Standard" (标准)** 安装类型。它会自动下载：
     - Android SDK Platform
     - Android Virtual Device (模拟器)
     - 最新版的构建工具

### 1.2 检查 SDK 路径 (可选)
通常 Android Studio 会默认安装在：
- macOS: `/Users/你的用户名/Library/Android/sdk`
- Windows: `C:\Users\你的用户名\AppData\Local\Android\Sdk`

如果你需要手动配置环境变量（如在终端使用 `adb` 命令），请将以下内容添加到你的 `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## 🚀 2. 运行项目 (Run the App)

### 步骤 1: 导入项目
1. 打开 **Android Studio**。
2. 点击 **Open** (或 File -> Open)。
3. 选择本项目目录:
   `/Users/kerry-mac/SmartWardrobe/App/AndroidApp`
4. 点击 **Open**。
   > **注意**: 首次打开时，Gradle 会自动下载依赖库，这可能需要几分钟，请保持网络畅通。等待右下角的进度条完成。

### 步骤 2: VS Code 开发配置 (推荐)
如果你更习惯使用 VS Code 进行开发，请按以下步骤操作：

1. **安装插件**:
   - 在 VS Code 插件市场搜索并安装 `Android` 插件 (推荐 "Android iOS Emulator" 或 "Android WiFi ADB")。
   - 安装 `Kotlin` 插件以支持代码高亮。

2. **启动模拟器**:
   - 打开终端 (Terminal)，运行以下命令查看已安装的模拟器列表：
     ```bash
     emulator -list-avds
     ```
   - 启动模拟器 (替换 `Your_Device_Name` 为上一步查到的名称)：
     ```bash
     emulator -avd Your_Device_Name
     ```
     *(如果没有模拟器，请先通过 Android Studio 的 Device Manager 创建一个，只需做一次)*

### 步骤 3: 编译与运行
在 VS Code 终端中，确保你在 `App/AndroidApp` 目录下，然后运行：

1. **检查设备连接**:
   ```bash
   adb devices
   ```
   *确保看到类似 `emulator-5554 device` 的输出。*

2. **编译并安装**:
   ```bash
   ./gradlew installDebug
   ```
   *这将编译 App 并安装到模拟器上。*

3. **查看日志 (Logcat)**:
   ```bash
   adb logcat | grep "SmartWardrobe"
   ```
   *用于查看 App 的运行日志和调试信息。*

---

## 🛠 3. 开发与更新流程

核心逻辑是：**Web 代码修改后，需要手动同步到 Android 项目中**。

### 3.1 目录对应关系
- **Web 源码 (开发处)**: `/Users/kerry-mac/SmartWardrobe/App/WebApp/wardrobe/`
- **Android 资源 (发布处)**: `/Users/kerry-mac/SmartWardrobe/App/AndroidApp/app/src/main/assets/wardrobe/`

### 3.2 如何更新 App 内容
当你修改了 HTML/JS/CSS 后，执行以下命令将新代码同步到 App 中：

```bash
# 1. 确保在项目根目录 /Users/kerry-mac/SmartWardrobe
cd /Users/kerry-mac/SmartWardrobe

# 2. 清理旧资源 (可选但推荐)
rm -rf App/AndroidApp/app/src/main/assets/wardrobe/*

# 3. 复制新代码
cp -r App/WebApp/wardrobe/* App/AndroidApp/app/src/main/assets/wardrobe/
```

### 3.3 重新构建
同步文件后，在 Android Studio 中点击 **Apply Changes** (⚡️ 按钮) 或重新点击 **Run**，App 就会显示最新内容。

---

## 📂 4. 项目结构说明

```text
App/AndroidApp/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── assets/          # [关键] 存放 Web 网页文件的目录
│   │   │   │   └── wardrobe/    # 你的 HTML/CSS/JS 都在这里
│   │   │   ├── java/            # Android 原生代码
│   │   │   │   └── .../MainActivity.kt  # 负责加载网页的逻辑
│   │   │   └── res/             # 图标、布局文件
│   └── build.gradle.kts         # App 模块配置
├── gradle/                      # Gradle 包装器
├── build.gradle.kts             # 项目级配置
└── README.md                    # 本文档
```

## ❓ 5. 常见问题

**Q: 打开 App 显示 "Webpage not available" 或白屏?**
A: 检查 `app/src/main/assets/wardrobe` 目录下是否为空。如果没有文件，请运行上面的同步命令。同时检查 `MainActivity.kt` 中的路径是否为 `file:///android_asset/wardrobe/index.html`。

**Q: 样式显示不对?**
A: 确保你的 HTML 中引用 CSS/JS 的路径是**相对路径** (例如 `./css/style.css`)，不要使用绝对路径 (如 `/css/style.css`)，因为在 Android 本地文件系统中根路径不同。

**Q: 无法连接网络?**
A: 本项目已在 `AndroidManifest.xml` 中配置了 `<uses-permission android:name="android.permission.INTERNET" />`，App 可以正常访问互联网 API。
