const LOG_SERVER_URL = 'http://localhost:3002';

function sendLog(message, level = 'INFO') {
    // 同时也打印到浏览器控制台，方便即时查看
    if (level === 'ERROR') {
        console.error(`[${level}] ${message}`);
    } else {
        console.log(`[${level}] ${message}`);
    }

    // 发送到本地 Python 日志服务器
    fetch(LOG_SERVER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, level })
    }).catch(err => {
        // 静默失败，不要因为日志挂了影响主程序
    });
}

export const logger = {
    info: (msg) => sendLog(msg, 'INFO'),
    warn: (msg) => sendLog(msg, 'WARN'),
    error: (msg) => sendLog(msg, 'ERROR')
};

