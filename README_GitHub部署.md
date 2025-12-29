# GitHub Pages 部署指南

这个项目可以通过 GitHub Pages 免费托管，无需本地服务器！

## 🚀 快速部署步骤

### 1. 创建 GitHub 仓库

1. 登录 GitHub，点击右上角 `+` → `New repository`
2. 仓库名称：`christmas-magic-game`（或你喜欢的名字）
3. 选择 `Public`（GitHub Pages 免费版需要公开仓库）
4. **不要**勾选 "Initialize this repository with a README"
5. 点击 `Create repository`

### 2. 上传代码到 GitHub

在项目根目录执行以下命令：

```bash
# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: 圣诞树魔法世界游戏"

# 添加远程仓库（替换 YOUR_USERNAME 和 YOUR_REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 3. 启用 GitHub Pages

1. 进入你的 GitHub 仓库页面
2. 点击 `Settings`（设置）
3. 在左侧菜单找到 `Pages`
4. 在 `Source` 下选择：
   - **Build and deployment** → **Source**: `GitHub Actions`
5. 保存设置

### 4. 触发部署

GitHub Actions 会自动运行并部署你的网站。你可以：

1. 在仓库页面点击 `Actions` 标签
2. 查看部署进度
3. 部署完成后，访问：`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## 📁 项目结构说明

部署后的网站结构：
- `/` - 主入口，自动跳转到 christmas-1
- `/christmas-1/` - 第一个游戏（纯前端，使用 CDN）
- `/christmas-2/dist/` - 第二个游戏（React 构建后的版本）

## ⚙️ 自动构建说明

项目已配置 GitHub Actions 工作流（`.github/workflows/deploy.yml`），会自动：

1. 检测到代码推送到 `main` 或 `master` 分支时触发
2. 安装 Node.js 和依赖
3. 构建 `christmas-2` 项目
4. 部署到 GitHub Pages

## 🔧 环境变量（可选）

如果你的 `christmas-2` 需要 API 密钥：

1. 进入仓库 `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret`
3. 添加 `GEMINI_API_KEY`（如果需要）

## 🌐 访问你的游戏

部署成功后，访问地址：
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

例如：
```
https://zhangsan.github.io/christmas-magic-game/
```

## 📝 更新游戏

每次更新代码后：

```bash
git add .
git commit -m "更新说明"
git push
```

GitHub Actions 会自动重新构建和部署！

## ❓ 常见问题

### Q: 部署后页面显示 404？
A: 
- 检查 GitHub Actions 是否成功完成
- 确认仓库是 Public（免费版需要）
- 等待几分钟让 GitHub Pages 生效

### Q: christmas-2 没有正常显示？
A: 
- 检查 GitHub Actions 构建日志
- 确认 `christmas-2/package.json` 中的构建脚本正确
- 查看浏览器控制台错误信息

### Q: 如何自定义域名？
A: 
1. 在仓库 `Settings` → `Pages` 中设置自定义域名
2. 在你的域名 DNS 中添加 CNAME 记录

### Q: 构建失败怎么办？
A: 
- 查看 GitHub Actions 日志
- 确认 `christmas-2/package.json` 依赖正确
- 检查 Node.js 版本兼容性

## 🎮 游戏说明

### christmas-1
- 纯前端游戏，使用摄像头交互
- 做 "O" 型嘴吐泡泡堆圣诞树
- 握拳→张开手势触发粒子效果

### christmas-2
- React + Three.js 3D 游戏
- 手势控制装饰圣诞树
- 需要摄像头权限

## 📄 许可证

根据你的需要添加许可证文件。

---

**享受你的游戏！** 🎄✨

如有问题，请查看 GitHub Actions 日志或提交 Issue。

