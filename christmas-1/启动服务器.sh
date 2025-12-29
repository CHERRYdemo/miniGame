#!/bin/bash

echo "正在启动本地服务器..."
echo ""
echo "服务器启动后，请在浏览器中访问显示的地址"
echo "按 Ctrl+C 可以停止服务器"
echo ""

cd "$(dirname "$0")"

# 尝试使用 Python
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    python -m http.server 8080
# 如果 Python 不可用，尝试使用 Node.js
elif command -v node &> /dev/null; then
    npx --yes http-server -p 8080 -c-1
else
    echo "错误: 未找到 Python 或 Node.js"
    echo "请安装 Python 3 或 Node.js"
    exit 1
fi

