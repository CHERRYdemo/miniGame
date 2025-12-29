import { initVision, setZoomLevel } from './vision.js';
import { state } from './state.js';
// import { initLuxuryTree } from './luxuryTree.js'; // 暂时不需要直接导入，由 particleTree 动态调用或全局调用

// 调试信息：确认页面加载
console.log('=== Christmas-1 页面已加载 ===');
console.log('当前 URL:', window.location.href);
console.log('页面标题:', document.title);

// --- UI 逻辑 ---

const treeBtn = document.getElementById('tree-btn');
const spoonBtn = document.getElementById('spoon-btn');
const canvas = document.getElementById('underwater-canvas'); // 提前定义

// 安全检查：确保元素存在
if (!treeBtn) console.error('tree-btn 元素未找到');
if (!spoonBtn) console.error('spoon-btn 元素未找到');
if (!canvas) console.error('underwater-canvas 元素未找到');

// 初始隐藏
if (treeBtn) treeBtn.style.display = 'none';
if (spoonBtn) spoonBtn.style.display = 'none';

// 更新按钮状态函数
function updateAllButtons() {
    const isChristmasActive = state.isBuildingTree && state.treeType === 'christmas';
    const isSpoonActive = state.isBuildingTree && state.treeType === 'spoon';

    if (treeBtn) {
        if (isChristmasActive) {
            treeBtn.innerText = "🎄停止";
            treeBtn.style.background = "rgba(255, 100, 100, 0.5)";
        } else {
            treeBtn.innerText = "🎄开始";
            treeBtn.style.background = "rgba(50, 200, 50, 0.3)";
        }
    }

    if (spoonBtn) {
        if (isSpoonActive) {
            spoonBtn.innerText = "💡停止";
            spoonBtn.style.background = "rgba(255, 100, 100, 0.5)";
        } else {
            spoonBtn.innerText = "💡开始";
            spoonBtn.style.background = "rgba(50, 200, 50, 0.3)";
        }
    }
}

// --- 按钮事件逻辑 ---

if (treeBtn) {
    treeBtn.addEventListener('click', () => {
        if (state.isBuildingTree && state.treeType === 'christmas') {
             state.isBuildingTree = false;
        } else {
             state.treeType = 'christmas';
             state.isBuildingTree = true;
        }
        updateAllButtons();
    });
}

if (spoonBtn) {
    spoonBtn.addEventListener('click', () => {
        if (state.isBuildingTree && state.treeType === 'spoon') {
             state.isBuildingTree = false;
        } else {
             state.treeType = 'spoon';
             state.isBuildingTree = true;
        }
        updateAllButtons();
    });
}

// 初始调用
updateAllButtons();

// --- 召唤阶段交互逻辑 ---
if (canvas) {
    canvas.addEventListener('click', () => {
        if (state.stage === 'summoning') {
            state.stage = 'initial';
            
            // 显示控制按钮
            if (treeBtn) treeBtn.style.display = 'block';
            if (spoonBtn) spoonBtn.style.display = 'block';
            
            // 播放可能的转场音效(如果有)
            console.log("Transformed to Initial Stage!");
        }
    });
}

// --- 手势变焦逻辑 (Pinch to Zoom) ---
// const canvas = document.getElementById('underwater-canvas'); // 已在顶部定义
let initialPinchDistance = null;
let currentZoom = 1.0;

if (canvas) {
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            initialPinchDistance = Math.sqrt(dx*dx + dy*dy);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialPinchDistance) {
            e.preventDefault(); 
            
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            const newDistance = Math.sqrt(dx*dx + dy*dy);
            
            const zoomFactor = newDistance / initialPinchDistance;
            
            if (zoomFactor > 1) {
                currentZoom += 0.05;
            } else if (zoomFactor < 1) {
                currentZoom -= 0.05;
            }
            
            currentZoom = Math.min(Math.max(1.0, currentZoom), 5.0);
            
            setZoomLevel(currentZoom);
            
            initialPinchDistance = newDistance;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        initialPinchDistance = null;
    });
}

// 简单的图片预加载函数
function preloadImages(onProgress) {
    const images = [
        'resource/spoon.png', 
        'resource/tangyuan.png',
        'resource/underwater_bg.png'
    ];
    let loadedCount = 0;
    
    return Promise.all(images.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loadedCount++;
                if (onProgress) onProgress(loadedCount / images.length);
                resolve(src);
            };
            img.src = src;
        });
    }));
}

// 进度条更新函数
function updateLoadingUI(percent) {
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-percent');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.innerText = `${Math.floor(percent)}%`;
}

// --- 启动程序 ---

async function startApp() {
    try {
        const loadingText = document.querySelector('#loading p');
        
        // 进度状态
        let imgProgress = 0;
        let visionProgress = 0;
        
        const updateCombinedProgress = () => {
            // 权重: 图片 20%, 模型 80% (模型初始化更慢)
            const total = (imgProgress * 0.2) + (visionProgress * 0.8);
            updateLoadingUI(total * 100);
        };

        // 1. 启动资源预加载
        console.log("Starting resource preload...");
        const resourcePromise = preloadImages((p) => {
            imgProgress = p;
            updateCombinedProgress();
        });
        
        // 2. 启动 Vision
        console.log("Starting vision init...");
        if(loadingText) loadingText.innerText = "正在初始化视觉模型...";
        
        const visionPromise = initVision((p) => {
            visionProgress = p;
            updateCombinedProgress();
        });

        // 3. 等待所有任务完成
        await Promise.all([visionPromise, resourcePromise]);

        console.log("All systems ready!");
        if(loadingText) loadingText.innerText = "准备进入魔法世界...";
        
        // 4. 隐藏 Loading 界面
        // 稍微等待一下，确保渲染帧已经准备好
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                loadingScreen.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    
                    // 5. 延迟预加载 Christmas-2，实现无缝跳转体验
                    console.log("Scheduling Christmas-2 preload...");
                    setTimeout(() => {
                        console.log("Preloading Christmas-2 resources...");
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.style.width = '0';
                        iframe.style.height = '0';
                        iframe.style.border = '0';
                        // 使用正确的相对路径
                        iframe.src = '../christmas-2/index.html';
                        document.body.appendChild(iframe);
                    }, 3000); // 3秒后开始预加载，避免影响当前页面性能

                }, 500);
            }
        }, 800);

    } catch (e) {
        console.error("启动失败:", e);
        const loadingDiv = document.getElementById('loading');
        if(loadingDiv) {
            loadingDiv.innerHTML = `<p style="color: red">启动失败: ${e.message}</p><p>请检查摄像头权限或网络连接</p>`;
        }
    }
}

startApp();
