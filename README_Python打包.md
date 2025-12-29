# Python 便携式环境打包说明

## 概述

为了让游戏可以在没有安装 Python 的 Windows 电脑上运行，我们提供了便携式 Python 环境方案。

## 快速设置

### 方法1：自动下载（推荐）

1. **运行 `setup_python.bat`**
   - 脚本会自动下载 Python embeddable 版本
   - 自动解压到 `python` 文件夹
   - 完成配置

2. **运行 `开始游戏.bat`**
   - 脚本会自动使用本地的 Python 环境

### 方法2：手动设置

如果自动下载失败，可以手动设置：

1. **下载 Python embeddable**
   - 访问：https://www.python.org/downloads/windows/
   - 下载 "Windows embeddable package (64-bit)"
   - 推荐版本：Python 3.11.9
   - 直接下载链接：https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip

2. **解压到项目目录**
   - 将下载的 zip 文件解压
   - 将解压后的文件夹重命名为 `python`
   - 放到项目根目录（与 `开始游戏.bat` 同级）

3. **验证安装**
   - 运行 `python\python.exe --version` 应该显示版本号
   - 或者直接运行 `开始游戏.bat`

## 目录结构

设置完成后，项目结构应该是：

```
项目根目录/
├── python/                    ← Python 便携式环境
│   ├── python.exe
│   ├── python311._pth
│   └── ...
├── christmas-1/
├── christmas-2/
├── 开始游戏.bat
├── setup_python.bat
└── ...
```

## 优势

1. **无需安装**：不需要在系统安装 Python
2. **完全独立**：游戏可以打包成完整文件夹，复制到任何 Windows 电脑运行
3. **不影响系统**：不会修改系统环境变量
4. **易于分发**：可以将整个项目文件夹（包括 python）打包分发给用户

## 文件大小

- Python embeddable 压缩包：约 8-10 MB
- 解压后：约 15-20 MB

## 注意事项

1. **首次运行**：需要运行 `setup_python.bat` 下载 Python（需要网络）
2. **离线使用**：下载完成后，可以完全离线运行
3. **防火墙**：首次运行时，Windows 防火墙可能会询问，请选择"允许"
4. **端口占用**：如果 8080 端口被占用，需要关闭占用该端口的程序

## 分发给用户

如果要将游戏分发给其他用户，有两种方式：

### 方式1：包含 Python 环境（推荐）
- 将整个项目文件夹（包括 `python` 文件夹）打包
- 用户解压后直接运行 `开始游戏.bat` 即可
- 优点：用户无需任何配置
- 缺点：文件较大（约 20-30 MB）

### 方式2：不包含 Python 环境
- 只打包游戏文件，不包含 `python` 文件夹
- 用户需要运行 `setup_python.bat` 下载 Python
- 或者用户自己安装 Python/Node.js
- 优点：文件较小
- 缺点：用户需要网络或安装环境

## 故障排除

### 问题1：setup_python.bat 下载失败

**解决方案**：
1. 检查网络连接
2. 手动下载 Python embeddable zip
3. 解压到 `python` 文件夹
4. 运行 `开始游戏.bat` 测试

### 问题2：python\python.exe 无法运行

**解决方案**：
1. 检查 `python` 文件夹是否完整
2. 尝试直接运行 `python\python.exe --version`
3. 如果失败，重新下载并解压

### 问题3：http.server 启动失败

**解决方案**：
1. 检查 8080 端口是否被占用
2. 尝试修改 `开始游戏.bat` 中的端口号
3. 检查防火墙设置

## 技术细节

- **Python 版本**：3.11.9（64位）
- **类型**：Windows embeddable package
- **包含模块**：标准库（包括 http.server）
- **不需要**：pip、第三方库（游戏只使用标准库）

---

**提示**：如果用户已经有 Python 或 Node.js 安装，启动脚本会优先使用系统环境，本地 Python 作为备选方案。

