# ClosetTwin (SmartWardrobe)

ClosetTwin 是一款智能衣橱管理 Web 应用，旨在帮助用户数字化管理个人衣物，提供每日穿搭建议，并根据天气和场合推荐最佳搭配。

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

## 🚀 快速开始

### 1. 本地运行
由于项目是纯静态网页，你可以直接通过浏览器打开文件，但为了获得完整体验（如 JSON 加载、PWA 特性），建议使用本地服务器。

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

### 2. 部署

## 📖 文档资源

*   [API 文档](App/WebApp/wardrobe/API_DOCUMENTATION.md): 后端接口规范说明。
*   [自动定位功能指南](App/WebApp/wardrobe/AUTO_LOCATION_GUIDE.md): 自动定位功能的实现细节。
*   [后端集成指南](App/WebApp/wardrobe/BACKEND_INTEGRATION_GUIDE.md): 前后端对接说明。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进 ClosetTwin！

## 📝 作者

*   **Kerry Nie** - *项目负责人* - [KerryNie-user](https://github.com/kerryNie-user)
