@echo off
chcp 65001 >nul
title 环境检查
color 0B

echo.
echo ========================================
echo      游戏环境检查
echo ========================================
echo.

cd /d "%~dp0"

echo [检查项目]
echo.

REM 优先检查本地便携式 Python
if exist "python\python.exe" (
    python\python.exe --version
    echo [√] 本地 Python 环境已配置（推荐）
) else (
    echo [!] 本地 Python 环境未配置
    echo    提示：运行 "setup_python.bat" 可自动设置
    REM 检查系统 Python
    python --version >nul 2>&1
    if %errorlevel% == 0 (
        python --version
        echo [√] 系统 Python 已安装
    ) else (
        python3 --version >nul 2>&1
        if %errorlevel% == 0 (
            python3 --version
            echo [√] 系统 Python 3 已安装
        ) else (
            echo [×] Python 未安装
        )
    )
)
echo.

REM 检查 Edge 浏览器
where msedge.exe >nul 2>&1
if %errorlevel% == 0 (
    echo [√] Microsoft Edge 已安装
) else (
    echo [!] 未检测到 Edge，将使用默认浏览器
)
echo.

REM 检查游戏文件
if exist "christmas-1\index.html" (
    echo [√] christmas-1 游戏文件存在
) else (
    echo [×] christmas-1 游戏文件缺失
)
echo.

if exist "christmas-2\dist\index.html" (
    echo [√] christmas-2 游戏文件存在
) else (
    echo [!] christmas-2 游戏文件缺失（可能需要构建）
)
echo.

echo ========================================
echo.
echo 检查完成！
echo.
echo 如果所有项目都显示 [√]，可以运行 "开始游戏.bat"
echo.
pause

