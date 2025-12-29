chcp 65001 >nul 2>&1
@echo off
title 圣诞树魔法世界
color 0A

echo.
echo ========================================
echo      圣诞树魔法世界 - 启动中
echo ========================================
echo.
echo 正在启动本地服务器...
echo.

cd /d "%~dp0"

REM 检查是否在正确的目录
if not exist "christmas-1" (
    echo 错误：找不到游戏文件
    echo 请确保在游戏根目录运行此脚本
    pause
    exit /b 1
)

REM 生成随机参数避免缓存
set /a RANDOM_NUM=%RANDOM%
set "FULL_URL=http://localhost:8080/christmas-1/index.html?t=%RANDOM_NUM%"

REM 优先使用本地打包的 Python 环境
if exist "python\python.exe" (
    echo [√] 使用本地 Python 环境
    echo.
    echo 服务器地址: %FULL_URL%
    echo.
    echo 浏览器将在 3 秒后自动打开...
    echo 如果没有自动打开，请手动访问上面的地址
    echo.
    echo 提示：按 Ctrl+C 可以停止服务器
    echo.
    timeout /t 3 /nobreak >nul
    start msedge.exe "%FULL_URL%" 2>nul
    if %errorlevel% neq 0 (
        start "" "%FULL_URL%"
    )
    python\python.exe -m http.server 8080
    goto :end
)

REM 尝试使用系统的 Python 3 (优先)
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [√] 检测到 Python
    echo.
    echo 服务器地址: %FULL_URL%
    echo.
    echo 浏览器将在 3 秒后自动打开...
    echo 如果没有自动打开，请手动访问上面的地址
    echo.
    echo 提示：按 Ctrl+C 可以停止服务器
    echo.
    timeout /t 3 /nobreak >nul
    start msedge.exe "%FULL_URL%" 2>nul
    if %errorlevel% neq 0 (
        start "" "%FULL_URL%"
    )
    python -m http.server 8080
    goto :end
)

REM 尝试使用 Python 3 (python3 命令)
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo [√] 检测到 Python 3
    echo.
    echo 服务器地址: %FULL_URL%
    echo.
    echo 浏览器将在 3 秒后自动打开...
    echo 如果没有自动打开，请手动访问上面的地址
    echo.
    echo 提示：按 Ctrl+C 可以停止服务器
    echo.
    timeout /t 3 /nobreak >nul
    start msedge.exe "%FULL_URL%" 2>nul
    if %errorlevel% neq 0 (
        start "" "%FULL_URL%"
    )
    python3 -m http.server 8080
    goto :end
)

echo.
echo ========================================
echo           错误：未找到运行环境
echo ========================================
echo.
echo 请选择以下方案之一：
echo.
echo [方案1 - 推荐] 使用便携式 Python
echo   运行 "setup_python.bat" 自动下载和设置
echo   或者手动下载 Python embeddable 并解压到 python 文件夹
echo.
echo [方案2] 安装系统 Python 3
echo   下载地址: https://www.python.org/downloads/
echo   安装时请勾选 "Add Python to PATH"
echo.
echo ========================================
echo.
pause

:end
