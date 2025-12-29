@echo off
chcp 65001 >nul
title 圣诞树互动网页服务器
color 0A

echo.
echo ========================================
echo    圣诞树互动网页 - 正在启动服务器
echo ========================================
echo.
echo 正在启动本地服务器...
echo.

cd /d "%~dp0"

REM 尝试使用 Python 3
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo 使用 Python 启动服务器...
    echo.
    echo 服务器已启动！
    echo 浏览器将自动打开网页
    echo.
    echo 如果没有自动打开，请手动在浏览器中访问：
    echo http://localhost:8080
    echo.
    echo 按 Ctrl+C 可以停止服务器
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8080
    python -m http.server 8080
    goto :end
)

REM 尝试使用 Python 3
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo 使用 Python 3 启动服务器...
    echo.
    echo 服务器已启动！
    echo 浏览器将自动打开网页
    echo.
    echo 如果没有自动打开，请手动在浏览器中访问：
    echo http://localhost:8080
    echo.
    echo 按 Ctrl+C 可以停止服务器
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8080
    python3 -m http.server 8080
    goto :end
)

REM 如果没有 Python，尝试使用 Node.js
where node >nul 2>&1
if %errorlevel% == 0 (
    echo 使用 Node.js 启动服务器...
    echo.
    echo 服务器已启动！
    echo 浏览器将自动打开网页
    echo.
    echo 如果没有自动打开，请手动在浏览器中访问：
    echo http://localhost:8080
    echo.
    echo 按 Ctrl+C 可以停止服务器
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8080
    npx --yes http-server -p 8080 -c-1
    goto :end
)

REM 如果都没有，显示错误信息
echo.
echo ========================================
echo           错误：未找到服务器
echo ========================================
echo.
echo 您的电脑需要安装以下软件之一才能运行：
echo.
echo 1. Python 3（推荐）
echo    下载地址：https://www.python.org/downloads/
echo    安装时请勾选 "Add Python to PATH"
echo.
echo 2. Node.js
echo    下载地址：https://nodejs.org/
echo.
echo 安装完成后，请重新运行此脚本。
echo.
echo ========================================
echo.
pause

:end

