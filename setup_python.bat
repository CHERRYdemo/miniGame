@echo off
chcp 65001 >nul
title 设置 Python 环境
color 0B

echo.
echo ========================================
echo      设置便携式 Python 环境
echo ========================================
echo.
echo 这将下载并设置一个便携式 Python 环境
echo 下载后，游戏可以完全离线运行
echo.

cd /d "%~dp0"

REM 检查是否已经存在
if exist "python\python.exe" (
    echo [√] Python 环境已存在
    echo.
    python\python.exe --version
    echo.
    echo 如果需要重新下载，请先删除 python 文件夹
    pause
    exit /b 0
)

echo 正在下载 Python embeddable 版本...
echo.

REM 创建临时目录
if not exist "temp" mkdir temp

REM Python embeddable 下载地址（Python 3.11.9 Windows 64位）
set "PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
set "PYTHON_ZIP=temp\python-embed.zip"

echo 下载地址: %PYTHON_URL%
echo 保存到: %PYTHON_ZIP%
echo.

REM 尝试使用 PowerShell 下载
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_ZIP%'}" 2>nul

if not exist "%PYTHON_ZIP%" (
    echo.
    echo [×] 下载失败
    echo.
    echo 请手动下载 Python embeddable:
    echo https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip
    echo.
    echo 下载后，请执行以下步骤:
    echo 1. 将 zip 文件重命名为 python-embed.zip
    echo 2. 解压到当前目录的 python 文件夹中
    echo 3. 运行此脚本再次检查
    echo.
    pause
    exit /b 1
)

echo [√] 下载完成
echo.
echo 正在解压...
echo.

REM 解压到 python 目录
powershell -Command "Expand-Archive -Path '%PYTHON_ZIP%' -DestinationPath 'python' -Force" 2>nul

if not exist "python\python.exe" (
    echo [×] 解压失败
    echo 请手动解压 %PYTHON_ZIP% 到 python 文件夹
    pause
    exit /b 1
)

echo [√] 解压完成
echo.

REM 启用 pip（可选，http.server 不需要）
REM 但为了完整性，我们可以设置一下
if exist "python\python311._pth" (
    echo 正在配置 Python...
    REM 取消注释 import site 以启用标准库
    powershell -Command "(Get-Content 'python\python311._pth') -replace '#import site', 'import site' | Set-Content 'python\python311._pth'"
)

REM 测试 Python
python\python.exe --version >nul 2>&1
if %errorlevel% == 0 (
    python\python.exe --version
    echo.
    echo ========================================
    echo      Python 环境设置成功！
    echo ========================================
    echo.
    echo 现在可以运行 "开始游戏.bat" 了
    echo.
) else (
    echo [×] Python 测试失败
    pause
    exit /b 1
)

REM 清理临时文件
if exist "temp" rmdir /s /q temp

pause

