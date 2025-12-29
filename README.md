# 🎄 圣诞树魔法世界

一个基于摄像头交互的创意圣诞树游戏，包含两个不同的游戏体验。

## 🎮 游戏介绍

### christmas-1 - 泡泡圣诞树
- **玩法**：对着摄像头做 "O" 型嘴吐泡泡，泡泡会累积成圣诞树
- **特效**：完成后做 ✊握拳 → ✋张开 手势，泡泡会炸开变成粒子圣诞树
- **技术**：纯前端，使用 MediaPipe 和 Three.js

### christmas-2 - 3D 装饰圣诞树
- **玩法**：使用手势控制装饰 3D 圣诞树
- **技术**：React + Three.js + MediaPipe

## 🚀 快速开始

### 方式一：GitHub Pages（推荐）

1. 查看 [GitHub 部署指南](./README_GitHub部署.md)
2. 访问部署后的网站即可游玩，无需本地环境

### 方式二：本地运行

#### Windows
1. 双击 `开始游戏.bat`
2. 如果提示需要 Python，运行 `setup_python.bat`

#### Mac/Linux
1. 运行 `开始游戏.sh`
2. 确保已安装 Python 3 或 Node.js

## 📁 项目结构

```
.
├── index.html              # 主入口，自动跳转到 christmas-1
├── christmas-1/            # 第一个游戏（纯前端）
│   ├── index.html
│   ├── main.js
│   └── resource/           # 游戏资源
├── christmas-2/            # 第二个游戏（React + Vite）
│   ├── src/                # 源代码
│   ├── dist/               # 构建输出
│   └── public/             # 静态资源
└── .github/workflows/      # GitHub Actions 配置
```

## 🛠️ 开发说明

### christmas-1
纯前端项目，直接打开 `christmas-1/index.html` 即可（需要本地服务器）。

### christmas-2
React + TypeScript + Vite 项目：

```bash
cd christmas-2
npm install
npm run dev      # 开发模式
npm run build    # 构建生产版本
```

## 📝 系统要求

- **浏览器**：Chrome、Edge、Firefox 等现代浏览器
- **摄像头**：需要允许浏览器访问摄像头权限
- **网络**：首次运行需要网络加载 CDN 资源

## 🌐 在线体验

部署到 GitHub Pages 后，访问：
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## 📄 许可证

根据你的需要添加许可证。

---

**祝您游戏愉快！** 🎄✨

