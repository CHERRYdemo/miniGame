@echo off
chcp 936 >nul
echo 正在修复批处理文件编码...
echo.

REM 使用 PowerShell 将文件转换为 GBK 编码
powershell -Command "$content = Get-Content '开始游戏.bat' -Raw -Encoding UTF8; [System.IO.File]::WriteAllText((Resolve-Path '开始游戏.bat'), $content, [System.Text.Encoding]::GetEncoding('GB2312'))"

if %errorlevel% == 0 (
    echo [成功] 文件编码已修复为 GBK
    echo 现在可以正常运行 开始游戏.bat 了
) else (
    echo [失败] 自动修复失败
    echo.
    echo 请手动修复：
    echo 1. 用记事本打开 开始游戏.bat
    echo 2. 点击 文件 -^> 另存为
    echo 3. 在编码下拉菜单中选择 "ANSI" 或 "GBK"
    echo 4. 保存并覆盖原文件
)
echo.
pause

