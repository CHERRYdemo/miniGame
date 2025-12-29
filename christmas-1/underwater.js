import { state } from './state.js';
import { initParticleTree } from './particleTree.js'; 

// --- 像素风格海底效果与交互逻辑 ---

const canvas = document.getElementById('underwater-canvas');
const ctx = canvas.getContext('2d');

// 资源加载
const bgImage = new Image();
bgImage.src = 'resource/underwater_bg.png';

const fishImages = [];
const totalFishImages = 39;
for (let i = 1; i <= totalFishImages; i++) {
    const img = new Image();
    img.src = `resource/fish/${i}.png`;
    fishImages.push(img);
}

const fishOrientations = [
    'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right',
    'right', 'right', 'left',  'right', 'right', 'right', 'right', 'right', 'left',  'right',
    'right', 'right', 'right', 'right', 'right', 'right', 'left',  'right', 'right', 'right',
    'right', 'right', 'right', 'right', 'left',  'right', 'right', 'right', 'right'
];

let bubbles = [];
let particles = [];
let fish = [];
let lastIsFist = false;

// 召唤阶段粒子
let summonParticles = [];
let sparks = []; // 打铁花火花
const summonColors = [
    'rgba(255, 182, 193, ', // 浅粉
    'rgba(224, 224, 224, ', // 浅银
    'rgba(65, 105, 225, ', // 蓝色
    'rgba(144, 238, 144, ', // 绿色
    'rgba(255, 215, 0, '    // 金色
];

// 隐藏不必要的 UI
const wishContainer = document.getElementById('wish-container');
if (wishContainer) wishContainer.style.display = 'none';

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 类定义 ---

class Spark {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        
        if (vx !== undefined && vy !== undefined) {
            this.vx = vx;
            this.vy = vy;
        } else {
            // 默认随机
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2; 
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }
        
        this.life = 1.0;
        this.decay = Math.random() * 0.04 + 0.01; 
        this.gravity = 0.2; // 重力
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; 
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        let r=255, g, b;
        if (this.life > 0.7) { g=255; b=200; } // 白金
        else if (this.life > 0.4) { g=165; b=0; } // 橙
        else { g=50; b=0; } // 红
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.life})`;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5 * this.life, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

class SummonParticle {
    constructor() {
        this.baseSize = Math.random() * 3 + 1; // 原始大小
        this.baseAlpha = Math.random() * 0.5 + 0.3;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.extraAlpha = 0; // 额外粒子渐变用
        this.colorPrefix = summonColors[Math.floor(Math.random() * summonColors.length)];
        this.reset();
    }

    reset() {
        // 初始化时随机分布在屏幕内，或者从底部开始
        this.x = Math.random() * canvas.width;
        // 随机选择：从底部开始，或者屏幕内随机位置
        if (Math.random() > 0.5) {
            this.y = canvas.height + 10; // 从底部开始
        } else {
            this.y = Math.random() * canvas.height; // 屏幕内随机
        }
        this.size = this.baseSize;
        this.alpha = this.baseAlpha;
        this.speedY = Math.random() * 0.5 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.wobble = Math.random() * Math.PI * 2;
    }

    update(isMagicActive, index) {
        this.isMagic = isMagicActive; 
        
        let alphaMultiplier = 1.0;
        
        // 后150个粒子为额外粒子，需要渐入渐出
        if (index >= 150) {
            if (isMagicActive) {
                this.extraAlpha += 0.05;
                if (this.extraAlpha > 1) this.extraAlpha = 1;
            } else {
                this.extraAlpha -= 0.05;
                if (this.extraAlpha < 0) this.extraAlpha = 0;
            }
            alphaMultiplier = this.extraAlpha;
        }
        
        if (isMagicActive) {
            // 魔法模式：呼吸光点，变小但极亮
            this.pulsePhase += 0.25; // 加快闪烁
            const pulse = (Math.sin(this.pulsePhase) + 1) / 2; // 0-1
            
            this.size = this.baseSize * 0.7; 
            // 基础透明度 * 呼吸 * 额外渐变
            this.alpha = (0.5 + pulse * 0.5) * alphaMultiplier;
            
            // 依然保持轻微浮动
            this.y -= this.speedY * 0.5; 
            this.x += Math.sin(this.wobble) * 0.2;
            this.wobble += 0.02;
            
            if (this.y < -10) this.y = canvas.height + 10;

        } else {
            // 常规模式：自由浮动
            this.size = this.baseSize; 
            this.alpha = this.baseAlpha * alphaMultiplier; 
            
            this.y -= this.speedY;
            this.x += Math.sin(this.wobble) * 0.5 + this.speedX;
            this.wobble += 0.02;

            if (this.y < -10) {
                this.reset();
            }
        }
    }

    draw(ctx) {
        if (this.alpha <= 0.01) return; // 不绘制不可见粒子

        ctx.save();
        if (this.isMagic) {
            // 极致闪耀模式
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 10; // 光晕
            ctx.shadowColor = this.colorPrefix + '1)'; // 本色光晕
            // 核心为高亮白+本色混合
            ctx.fillStyle = 'rgba(255, 255, 255, ' + this.alpha + ')'; 
        } else {
            // 普通模式
            ctx.fillStyle = this.colorPrefix + this.alpha + ')';
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Bubble {
    constructor(x, y, isTreePart = false) {
        this.x = x;
        this.y = y;
        this.isTreePart = isTreePart;
        this.active = true;
        this.isExploding = false;
        this.explodeProgress = 0;
        this.size = Math.random() * 40 + 20; 
        
        if (this.isTreePart) {
            const target = getTreeTargetPosition();
            this.targetX = target.x;
            this.targetY = target.y;
            this.speedX = (this.targetX - this.x) * 0.05; 
            this.speedY = (this.targetY - this.y) * 0.05;
            this.arrived = false;
        } else {
            this.speedY = Math.random() * 2 + 1; // 向上飘
            this.wobble = Math.random() * Math.PI * 2; 
            this.wobbleSpeed = 0.05;
        }
    }
    
    explode() {
        this.isExploding = true;
    }

    update() {
        if (this.isExploding) {
            this.explodeProgress += 0.08;
            this.size *= 1.1;
            if (this.explodeProgress >= 1) this.active = false;
            return;
        }
        
        if (this.isTreePart) {
            if (!this.arrived) {
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 5) {
                    this.x = this.targetX;
                    this.y = this.targetY;
                    this.arrived = true;
                } else {
                    this.x += dx * 0.05;
                    this.y += dy * 0.05;
                }
            }
        } else {
            // 普通飘荡泡泡
            this.y -= this.speedY; 
            this.x += Math.sin(this.wobble) * 1.0; 
            this.wobble += this.wobbleSpeed;
            
            // 超出顶部一段距离后消失
            if (this.y < -50) this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        
        if (this.isExploding) {
            ctx.save();
            ctx.translate(this.x, this.y);
            const alpha = 1.0 - this.explodeProgress;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.shadowBlur = 30;
            ctx.shadowColor = 'white';
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath();
            ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        const radius = this.size / 2;
        
        const gradient = ctx.createRadialGradient(-radius*0.3, -radius*0.3, 0, 0, 0, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');  
        gradient.addColorStop(1, 'rgba(0, 100, 200, 0.1)');   
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(200, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.ellipse(-radius*0.4, -radius*0.4, radius*0.25, radius*0.15, Math.PI/4, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }
}

class ImageFish {
    constructor() {
        this.reset();
        this.x = Math.random() * canvas.width;
        this.fishIndex = Math.floor(Math.random() * fishImages.length);
        this.image = fishImages[this.fishIndex];
    }
    reset() {
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.x = this.direction === 1 ? -150 : canvas.width + 150;
        this.y = Math.random() * (canvas.height - 150) + 50;
        this.speed = Math.random() * 2 + 1;
        this.scale = Math.random() * 0.4 + 0.3;
        this.fishIndex = Math.floor(Math.random() * fishImages.length);
        this.image = fishImages[this.fishIndex];
    }
    update() {
        this.x += this.speed * this.direction;
        if ((this.direction === 1 && this.x > canvas.width + 150) || 
            (this.direction === -1 && this.x < -150)) {
            this.reset();
        }
    }
    draw(ctx) {
        if (!this.image.complete) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        const orientation = fishOrientations[this.fishIndex] || 'left';
        let scaleX = this.scale;
        if (orientation === 'left') scaleX = this.direction === 1 ? -this.scale : this.scale;
        else scaleX = this.direction === 1 ? this.scale : -this.scale;
        ctx.scale(scaleX, this.scale); 
        ctx.drawImage(this.image, -this.image.width/2, -this.image.height/2);
        ctx.restore();
    }
}

// 树结构算法
function getTreeTargetPosition() {
    if (!state.treeLayerCounts) state.treeLayerCounts = [];
    if (!state.treeLayerSlots) state.treeLayerSlots = [];
    
    const treeTopY = canvas.height * 0.2;
    const bubbleSize = 30;
    const rowHeight = bubbleSize * 0.8;
    
    let k = 0;
    while (true) {
        const capacity = k + 1;
        const currentCount = state.treeLayerCounts[k] || 0;
        if (currentCount < capacity) break;
        k++;
    }
    
    if (!state.treeLayerSlots[k]) state.treeLayerSlots[k] = [];
    const layerSlots = state.treeLayerSlots[k];
    const capacity = k + 1;
    
    const rawX = state.mouthPosition ? state.mouthPosition.x : 0.5;
    const mouthX = 1.0 - rawX; // Mirror
    
    let targetIndex = -1;
    const allIndices = Array.from({length: capacity}, (_, i) => i);
    const availableIndices = allIndices.filter(i => !layerSlots.includes(i));
    
    if (availableIndices.length === 0) {
        k++;
        state.treeLayerSlots[k] = [];
        targetIndex = mouthX < 0.5 ? 0 : k;
    } else {
        const mid = k / 2;
        const leftCandidates = availableIndices.filter(i => i <= mid);
        const rightCandidates = availableIndices.filter(i => i > mid);
        
        if (mouthX < 0.5) {
            targetIndex = leftCandidates.length > 0 ? Math.min(...leftCandidates) : Math.min(...rightCandidates);
        } else {
            targetIndex = rightCandidates.length > 0 ? Math.max(...rightCandidates) : Math.max(...leftCandidates);
        }
    }
    
    if (!state.treeLayerSlots[k]) state.treeLayerSlots[k] = [];
    state.treeLayerSlots[k].push(targetIndex);
    if (!state.treeLayerCounts[k]) state.treeLayerCounts[k] = 0;
    state.treeLayerCounts[k]++;
    
    const y = treeTopY + k * rowHeight;
    const centerX = canvas.width / 2;
    const layerWidth = (k + 1) * bubbleSize * 0.9;
    const startX = centerX - layerWidth / 2 + (bubbleSize * 0.9) / 2;
    const x = startX + targetIndex * bubbleSize * 0.9;
    
    return { x: x + (Math.random()-0.5)*10, y: y + (Math.random()-0.5)*5 };
}

const initialFishCount = Math.floor(Math.random() * 3) + 5; 
for (let i = 0; i < initialFishCount; i++) fish.push(new ImageFish());

// 初始化召唤粒子 (300个，前150常驻，后150动态)
for (let i = 0; i < 300; i++) summonParticles.push(new SummonParticle());

let magicRotation = 0;
let bgDarkness = 0; // 背景变暗系数

// --- 主渲染 ---
export function renderUnderwater(results) {
    // 确保 results 不为 null
    if (!results) {
        results = { image: null, segmentationMask: null };
    }
    
    // 如果进入奢华模式，完全停止绘制并隐藏 Canvas
    if (state.isLuxuryMode) {
        const underwaterCanvas = document.getElementById('underwater-canvas');
        if (underwaterCanvas.style.display !== 'none') {
            underwaterCanvas.style.display = 'none';
        }
        return; 
    }

    // 初始化背景透明度
    if (typeof state.bgOpacity === 'undefined') state.bgOpacity = 1.0;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- 召唤阶段特殊处理 ---
    if (state.stage === 'summoning') {
        
        // 1. 预计算魔法状态 (提前计算以便控制背景)
        let isMagicActive = false;
        let magicTarget = null;
        if (results && state.isOpen && state.palmPosition && state.videoLayout) {
            const { drawX, drawY, drawW, drawH } = state.videoLayout;
            // Mirror x
            const palmCanvasX = drawX + (1.0 - state.palmPosition.x) * drawW;
            const palmCanvasY = drawY + state.palmPosition.y * drawH;
            magicTarget = { x: palmCanvasX, y: palmCanvasY };
            isMagicActive = true;
        }

        // 2. 更新背景亮度 (平滑过渡)
        if (isMagicActive) {
            bgDarkness += (1.0 - bgDarkness) * 0.08; // 渐变变黑
        } else {
            bgDarkness += (0.0 - bgDarkness) * 0.08; // 渐变恢复
        }

        // 3. 绘制背景 (颜色插值混合)
        // 蓝天色: rgb(135, 206, 235)
        // 黑色: rgb(0, 0, 0)
        const skyR = 135, skyG = 206, skyB = 235;
        const r = Math.floor(skyR * (1 - bgDarkness));
        const g = Math.floor(skyG * (1 - bgDarkness));
        const b = Math.floor(skyB * (1 - bgDarkness));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 4. 绘制人像 (先画人，粒子和魔法阵在最上层)
        if (results && results.segmentationMask && results.image) {
            drawPerson(results);
        }

        // 5. 绘制浮动光点 (传入 index) - 始终绘制，即使没有 results
        // 确保粒子在非魔法状态下也可见
        summonParticles.forEach((p, index) => {
            p.update(isMagicActive, index);
            // 强制确保前150个粒子在非魔法状态下可见
            if (!isMagicActive && index < 150 && p.alpha < 0.1) {
                p.alpha = p.baseAlpha;
            }
            p.draw(ctx);
        });

        // 6. 如果手掌张开，绘制魔法阵 和 火花
        if (isMagicActive && magicTarget) {
            drawMagicCircle(ctx, magicTarget.x, magicTarget.y);
            
            // 生成打铁花火花 (每帧生成多个)
            const spawnCount = 16; // 翻倍到16
            for(let k=0; k<spawnCount; k++) {
                const angle = Math.random() * Math.PI * 2;
                
                // 越靠近法阵边缘 (R=200) 越密集，越往外越稀疏
                const r = 190 + (Math.random() - 0.5) * 30;
                
                const sx = magicTarget.x + Math.cos(angle) * r;
                const sy = magicTarget.y + Math.sin(angle) * r;
                
                // 计算切线速度 (模拟最外层逆时针旋转)
                const speed = 6 + Math.random() * 4; // 高速甩出
                
                // 切线分量
                const tx = -Math.sin(angle);
                const ty = Math.cos(angle);
                
                // 离心分量 (向外)
                const rx = Math.cos(angle);
                const ry = Math.sin(angle);
                
                // 合成速度：切线为主(甩)，离心为辅(扩)
                const vx = tx * speed * 0.9 + rx * speed * 0.3;
                const vy = ty * speed * 0.9 + ry * speed * 0.3;

                sparks.push(new Spark(sx, sy, vx, vy));
            }
        }
        
        // 更新和绘制火花
        sparks = sparks.filter(s => s.life > 0);
        sparks.forEach(s => {
            s.update();
            s.draw(ctx);
        });
        
        // 召唤阶段不进行后续的鱼群、泡泡和手势逻辑
        return;
    }

    // --- 以下是正常游戏逻辑 (initial / treeBuilding) ---

    // 如果进入了粒子模式，背景透明度逐渐降低
    if (state.isTreeParticleMode) {
        state.bgOpacity -= 0.02; // 约 50 帧 (1秒) 淡出
        if (state.bgOpacity < 0) state.bgOpacity = 0;
    } else {
        state.bgOpacity = 1.0;
    }

    ctx.save();
    ctx.globalAlpha = state.bgOpacity;

    // 1. 绘制背景
    ctx.globalCompositeOperation = 'source-over';
    if (bgImage.complete) {
        const scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
        const x = (canvas.width / 2) - (bgImage.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImage.height / 2) * scale;
        ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
    } else {
        ctx.fillStyle = '#001133';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. 绘制鱼
    fish.forEach(f => { f.update(); f.draw(ctx); });
    
    ctx.restore(); // 恢复 globalAlpha 为 1.0 用于绘制人像

    // 3. 绘制人像 (始终不透明，直到进入奢华模式)
    if (results.segmentationMask && results.image && !state.isLuxuryMode) {
        drawPerson(results);
    }

    // 4. 绘制泡泡 (跟随背景淡出)
    ctx.save();
    ctx.globalAlpha = state.bgOpacity;
    
    // 气泡生成逻辑
    if (!state.isTreeParticleMode && state.isBlowing && state.mouthPosition) {
        if (state.isBuildingTree) {
            // 堆树模式：正常生成 (true 表示是树的一部分)
            spawnBubble(true);
        } else {
            // 闲置模式：生成零星环境泡泡 (false 表示不是树的一部分)
            spawnBubble(false);
        }
    }

    // 更新绘制气泡
    bubbles = bubbles.filter(b => b.active);
    bubbles.forEach(b => { 
        b.update(); 
        // 爆炸中的泡泡保持高亮，不受背景淡出影响太大，或者也一起淡出
        // 这里简单处理：都随背景淡出
        b.draw(ctx); 
    });
    
    ctx.restore();

    // --- 状态逻辑 ---

    // 手势触发特效：握拳 -> 张开
    if (!state.isTreeParticleMode && !state.isLuxuryMode && state.handDetected) {
        // 检测状态跳变：上一帧是握拳，当前帧是张开
        if (lastIsFist && state.isOpen) {
            
            // 只有当树上至少有一些泡泡时才触发
            const treeBubblesCount = bubbles.reduce((acc, b) => acc + (b.isTreePart ? 1 : 0), 0);
            
            // 只要有树的形状(>3个泡泡)就可以触发
            if (treeBubblesCount > 3) {
                state.isBuildingTree = false; 
                state.isTreeParticleMode = true;
                
                console.log("Triggering Explosion and 3D Particle Tree!");
                
                // 隐藏 🎄开始/停止 按钮 和 💡开始/停止 按钮
                const treeBtn = document.getElementById('tree-btn');
                const spoonBtn = document.getElementById('spoon-btn');
                if (treeBtn) treeBtn.style.display = 'none';
                if (spoonBtn) spoonBtn.style.display = 'none';
                
                // 1. 让所有树上的泡泡爆炸
                bubbles.forEach(b => {
                    if (b.isTreePart) b.explode();
                });
                
                // 2. 延迟启动 3D 场景
                setTimeout(() => {
                    const threeCanvas = document.getElementById('three-canvas');
                    threeCanvas.style.display = 'block';
                    threeCanvas.style.opacity = '0';
                    
                    // 启动 3D (Tree Mode)
                    initParticleTree('tree');
                    
                    // 3D 淡入
                    requestAnimationFrame(() => {
                        threeCanvas.style.transition = 'opacity 3s ease-in';
                        threeCanvas.style.opacity = '1';
                    });
                    
                    // 确保 underwaterCanvas 不透明度为 1 (内容通过 bgOpacity 淡出)
                    const underwaterCanvas = document.getElementById('underwater-canvas');
                    underwaterCanvas.style.opacity = '1';
                    
                }, 200);
            }
        }
        
        // 更新上一帧状态
        lastIsFist = state.isFist;
    } else if (!state.handDetected) {
        lastIsFist = false; // 手丢失重置
    }

    // Debug Info - Hidden for production
    // drawDebugInfo();
}

function drawMagicCircle(ctx, x, y) {
    magicRotation += 0.04; // 加快旋转速度

    const pulse = Math.sin(Date.now() * 0.005) * 0.02 + 1.0; 

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse); 

    // 全局辉光设置
    ctx.shadowBlur = 25; // 增强辉光
    ctx.shadowColor = '#FF6600'; // 深橙色辉光，对比度更强
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 半径基准
    const rBase = 200;

    // --- 1. 核心圆环 (Core Rings) - 顺时针 ---
    // 对应图中中心的同心圆
    ctx.save();
    ctx.rotate(magicRotation); 
    ctx.strokeStyle = '#FFCC00';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.stroke(); // 粗内圈
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI*2); ctx.stroke(); // 细内圈
    ctx.restore();

    // --- 2. 中间圆环与几何层 (Square & Curves) - 逆时针 ---
    ctx.save();
    ctx.rotate(-magicRotation * 0.5); // 逆向旋转
    
    // 中间圆环背景
    ctx.strokeStyle = '#FFAA00';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI*2); ctx.stroke();
    
    // 两个交错的正方形 (八角星)
    const sqSize = 160; 
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFDD00'; // 更亮
    ctx.strokeRect(-sqSize/2, -sqSize/2, sqSize, sqSize);
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-sqSize/2, -sqSize/2, sqSize, sqSize);
    ctx.restore();

    // 内部复杂的几何连线 (模拟图中的网格感)
    // 连接八角星的顶点形成内部纹理
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FF8800';
    const rSq = (sqSize/2) * Math.sqrt(2); // 顶点半径
    const rInner = sqSize/2; // 边心距
    
    // 简单的交叉连线
    ctx.beginPath();
    ctx.moveTo(0, -rSq); ctx.lineTo(0, rSq); // 竖中线
    ctx.moveTo(-rSq, 0); ctx.lineTo(rSq, 0); // 横中线
    ctx.stroke();
    
    // 弧线装饰
    ctx.beginPath(); ctx.arc(0, 0, rInner, 0, Math.PI*2); ctx.stroke(); // 切内圆
    
    ctx.restore();

    // --- 3. 外部符文圈 (Runes Layer) - 顺时针 ---
    // 参考图中的十字/土字纹样
    ctx.save();
    ctx.rotate(magicRotation * 0.3); // 慢速顺时针
    const rRunes = 170;
    const runeCount = 12; // 12个符文位
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FF9900';
    
    // 双轨圆环
    ctx.beginPath(); ctx.arc(0, 0, rRunes - 15, 0, Math.PI*2); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, rRunes + 15, 0, Math.PI*2); ctx.stroke();

    // 符文绘制
    ctx.strokeStyle = '#FFCC00';
    ctx.lineWidth = 2;
    for(let i=0; i<runeCount; i++) {
        ctx.save();
        const angle = i * (Math.PI * 2 / runeCount);
        ctx.rotate(angle);
        ctx.translate(rRunes, 0);
        
        // 绘制十字纹样 (参考图中的形状)
        // 竖线
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
        // 横线
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
        // 装饰点
        // ctx.beginPath(); ctx.arc(0, -12, 2, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    }
    ctx.restore();

    // --- 4. 最外层光环 (Outer Rim) - 逆时针 ---
    ctx.save();
    ctx.rotate(-magicRotation * 0.8);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FF5500'; // 深色边框
    ctx.beginPath(); ctx.arc(0, 0, 200, 0, Math.PI*2); ctx.stroke();
    
    // 装饰刻度
    /*
    for(let i=0; i<24; i++) {
        const ang = i * Math.PI * 2 / 24;
        const x1 = Math.cos(ang) * 195;
        const y1 = Math.sin(ang) * 195;
        const x2 = Math.cos(ang) * 205;
        const y2 = Math.sin(ang) * 205;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    */
    ctx.restore();

    ctx.restore();
}

function drawPerson(results) {
    ctx.save();
    const videoW = results.image.width;
    const videoH = results.image.height;
    const videoAspect = videoW / videoH;
    
    // 让人物更大 (95% 屏幕高度)
    const maxHeight = canvas.height * 0.95;
    const maxWidth = canvas.width;
    
    let drawW, drawH;
    drawH = maxHeight;
    drawW = drawH * videoAspect;
    if (drawW > maxWidth) { drawW = maxWidth; drawH = drawW / videoAspect; }
    
    // 计算目标 X 坐标
    let targetX;
    if (state.isTreeParticleMode) {
        // 粒子模式下
        targetX = canvas.width * 0.1; 
    } else {
        // 正常模式下：居中显示
        targetX = (canvas.width - drawW) / 2;
    }
    
    // 初始化平滑过渡位置
    if (typeof state.personCurrentX === 'undefined') {
        state.personCurrentX = targetX;
    }
    
    // Lerp 插值移动 (速度 0.05)
    state.personCurrentX += (targetX - state.personCurrentX) * 0.05;
    
    const drawX = state.personCurrentX;
    const drawY = canvas.height - drawH; 
    
    state.videoLayout = { drawX, drawY, drawW, drawH };
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.translate(canvas.width, 0);
    tempCtx.scale(-1, 1);
    
    const screenX = state.personCurrentX;
    const ctxX = canvas.width - screenX - drawW;
    
    tempCtx.drawImage(results.segmentationMask, ctxX, drawY, drawW, drawH);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.drawImage(results.image, ctxX, drawY, drawW, drawH);
    
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
}

function spawnBubble(isTreePart = false) {
    let x, y;
    if (state.videoLayout) {
        const { drawX, drawY, drawW, drawH } = state.videoLayout;
        x = drawX + (1 - state.mouthPosition.x) * drawW;
        y = drawY + state.mouthPosition.y * drawH;
    } else {
        x = (1 - state.mouthPosition.x) * canvas.width;
        y = state.mouthPosition.y * canvas.height;
    }
    
    const now = Date.now();
    if (!state.lastBubbleTime) state.lastBubbleTime = 0;
    
    // 间隔控制：堆树时快，闲置时慢且随机
    let interval;
    if (isTreePart) {
        interval = 50 + Math.random() * 50; // 50-100ms
    } else {
        interval = 300 + Math.random() * 500; // 300-800ms
    }
    
    if (now - state.lastBubbleTime > interval) {
        bubbles.push(new Bubble(x, y, isTreePart));
        state.lastBubbleTime = now;
    }
}