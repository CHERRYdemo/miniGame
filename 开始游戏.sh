#!/bin/bash

echo "正在启动魔法世界..."
echo ""

cd "$(dirname "$0")"

# 定义 URL（添加随机参数强制刷新）
RANDOM_PARAM=$(shuf -i 1-10000 -n 1)
URL="http://localhost:8080/christmas-1/index.html?t=$RANDOM_PARAM"

# 打开浏览器的函数
open_browser() {
    echo ""
    echo "服务器已启动！"
    echo "浏览器将自动打开网页..."
    echo ""
    echo "完整访问地址："
    echo "$URL"
    echo ""
    echo "如果没有自动打开，请手动访问上面的地址"
    echo ""
    echo "按 Ctrl+C 可以停止服务器"
    echo ""
    sleep 2
    if command -v open &> /dev/null; then
        open "$URL"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$URL"
    else
        echo "请手动打开浏览器访问: $URL"
    fi
}

# 尝试使用 Python
if command -v python3 &> /dev/null; then
    echo "使用 Python 3 启动服务器..."
    open_browser &
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    echo "使用 Python 启动服务器..."
    open_browser &
    python -m http.server 8080
elif command -v node &> /dev/null; then
    echo "使用 Node.js 启动服务器..."
    open_browser &
    npx --yes http-server -p 8080 -c-1
else
    echo "错误: 未找到 Python 或 Node.js"
    echo "请安装 Python 3"
    exit 1
fi
