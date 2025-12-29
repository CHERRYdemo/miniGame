import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { logger } from './logger.js';
import { initLuxuryTree } from './luxuryTree.js';
import { state } from './state.js';

let scene, camera, renderer, composer;
let treePoints, snowPoints, ringPoints, starMesh, tangyuanMesh;
let isCountingDown = false;
let isCelebration = false;
let countdownMesh = null;
let fireworks = [];
let celebrationTextGroup = null;
let clock;
let isInitialized = false;
let animationId;
let controls;
let raycaster;
let mouse;
let loadedTextures = {}; // 用于存储预加载的纹理

// 预加载资源函数
export function preloadParticleResources() {
    return new Promise((resolve, reject) => {
        const manager = new THREE.LoadingManager();
        const textureLoader = new THREE.TextureLoader(manager);

        manager.onLoad = () => {
            console.log('Particle resources loaded');
            resolve(loadedTextures);
        };

        manager.onError = (url) => {
            console.error('There was an error loading ' + url);
            reject(new Error('Failed to load ' + url));
        };

        // 预加载 spoon 和 tangyuan
        loadedTextures.spoon = textureLoader.load('resource/spoon.png');
        loadedTextures.tangyuan = textureLoader.load('resource/tangyuan.png');
    });
}

// 顶点着色器: 处理位置抖动和呼吸动画
const vertexShader = `
    attribute float size;
    attribute vec3 customColor;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uTime;

    void main() {
        vColor = customColor;
        
        // 呼吸/波动动画
        vec3 pos = position;
        // 加上一些随机的微小波动 (正弦函数)
        float noise = sin(pos.y * 2.0 + uTime * 2.0) * 0.05 + sin(pos.x * 3.0 + uTime) * 0.02;
        pos.y += noise;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        
        // 距离衰减 (Perspective Size Attenuation)
        gl_PointSize = size * (300.0 / -mvPosition.z);
        
        gl_Position = projectionMatrix * mvPosition;
        
        // 闪烁 alpha
        vAlpha = 0.6 + 0.4 * sin(uTime * 3.0 + pos.x * 10.0 + pos.y * 5.0);
    }
`;

// 片元着色器: 处理颜色和光晕
const fragmentShader = `
    uniform vec3 color;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
        // 绘制圆形柔和边缘
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float ll = length(xy);
        if(ll > 0.5) discard;
        
        // 径向衰减模拟光晕: 中心亮(1.0)，边缘暗(0.0)
        float strength = 1.0 - (ll * 2.0);
        strength = pow(strength, 1.5); 
        
        // 核心颜色 + 外部光晕
        gl_FragColor = vec4(color * vColor, vAlpha * strength);
    }
`;

export function initParticleTree(startMode = 'tree') {
    logger.info(`initParticleTree called with mode: ${startMode}`);
    
    // 确保隐藏UI按钮
    const treeBtn = document.getElementById('tree-btn');
    const spoonBtn = document.getElementById('spoon-btn');
    if (treeBtn) treeBtn.style.display = 'none';
    if (spoonBtn) spoonBtn.style.display = 'none';

    if (isInitialized) {
        // 如果已经初始化，但需要切换模式，可以在这里处理
        if (startMode === 'sphere' && !isSphereMode) {
            initParticleSphere();
        }
        logger.info("Already initialized, starting animation");
        startAnimation();
        return;
    }

    const canvas = document.getElementById('three-canvas');
    if (!canvas) {
        logger.error("Three canvas not found!");
        return;
    }
    
    try {
        clock = new THREE.Clock();
        logger.info("Clock created");

        // 1. Scene & Camera
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000511, 0.02); // 深蓝色背景雾

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // 调整相机位置，使场景中心(树)位于屏幕右侧
        // 相机向左看 (-6)，这样位于 0 的树就会在右边
        const viewOffsetX = -2.0; 
        camera.position.set(viewOffsetX, 5, 15); 
        camera.lookAt(viewOffsetX, 4, 0);
        logger.info("Scene & Camera created");

        // 2. Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        logger.info("Renderer created");

        // 3. Post Processing (Bloom)
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.05; 
        bloomPass.strength = 2.5;   
        bloomPass.radius = 0.8;     

        composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
        logger.info("Post-processing setup");

        // 4. Controls
        controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = false; // 关闭自动旋转，避免干扰交互
        controls.autoRotateSpeed = 0.5;
        controls.target.set(viewOffsetX, 4, 0); // 旋转中心也移过去
        controls.maxPolarAngle = Math.PI / 2 - 0.1; 
        logger.info("Controls setup");

        // 5. Build Scene
        if (startMode === 'sphere') {
            logger.info("Starting in Sphere Mode");
            initParticleSphere();
        } else {
            logger.info("Starting in Tree Mode");
            buildTreeScene();
        }

        // 6. Interaction
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        window.addEventListener('click', onClick, false);

        window.addEventListener('resize', onWindowResize);
        isInitialized = true;
        startAnimation();
        logger.info("Initialization complete, animation started");
        
        // 7. 元旦树模式：添加左下角刷新按钮
        if (state.treeType === 'spoon') {
            createRefreshButton();
        }
        
    } catch (e) {
        logger.error(`Error in initParticleTree: ${e.message}`);
        console.error(e);
    }
}

function onClick(event) {
    if (state.isLuxuryMode) return; // 已经切换了

    // 元旦树逻辑：点击触发倒计时
    if (state.treeType === 'spoon') {
        if (!isCountingDown && !isCelebration) {
            startCountdown();
        }
        return;
    }

    // 圣诞树逻辑：点击页面任意位置跳转到 christmas-2
    console.log("Christmas Tree Page Clicked! Redirecting to Luxury Tree...");
    // 适配 GitHub Pages 部署路径（去除了 dist 目录）
    // 如果是本地开发环境，可能需要手动调整或启动对应的服务
    window.location.href = '../christmas-2/index.html';
}

function transitionToLuxuryTree() {
    if (state.isLuxuryMode) return;
    state.isLuxuryMode = true;
    
    logger.info("Starting Transition to Luxury Tree...");

    try {
        // 1. 停止当前循环
        if (animationId) {
            cancelAnimationFrame(animationId);
            logger.info("Old animation loop stopped");
        }
        
        // 2. 清理旧场景对象
        if (scene) {
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            scene.clear();
            logger.info("Old scene cleared and resources disposed");
        }

        // 3. 销毁旧的 Renderer (非常重要，否则 WebGL 上下文可能冲突或泄漏)
        if (renderer) {
            renderer.dispose();
            // 移除旧的 Canvas DOM (如果我们要创建新的) 或者重置它
            // 这里我们选择让 initLuxuryTree 接管同一个 Canvas 元素
            // 但 Three.js 建议 dispose 后不仅是 dispose，最好是丢弃这个 GL context
            const gl = renderer.getContext();
            if (gl) {
                const extension = gl.getExtension('WEBGL_lose_context');
                if (extension) extension.loseContext();
            }
            logger.info("Old renderer disposed");
            renderer = null; 
        }
        
        // 4. 隐藏人像
        const underwaterCanvas = document.getElementById('underwater-canvas');
        if (underwaterCanvas) {
            underwaterCanvas.style.transition = 'opacity 1s ease-out';
            underwaterCanvas.style.opacity = '0';
            setTimeout(() => {
                underwaterCanvas.style.display = 'none';
            }, 1000);
            logger.info("Underwater canvas hiding...");
        }

        // 5. 启动新树
        state.luxuryStartTime = null;
        
        // 给一点时间让浏览器回收资源
        setTimeout(() => {
            logger.info("Initializing Luxury Tree...");
            initLuxuryTree('three-canvas');
        }, 100);
        
    } catch (e) {
        logger.error(`Error during transition: ${e.message}`);
        console.error(e);
    }
}


function buildTreeScene() {
    createChristmasTree();
    createSnow();
    createRings();
    createStar();
}

// 全局位置配置
const TREE_BASE_Y = -2.0; 
const TREE_HEIGHT = 11.0; 
const TREE_TOP_Y = TREE_BASE_Y + TREE_HEIGHT; // 9.0
const SNAP_THRESHOLD = 3.0; // 吸附半径

// --- Sphere Logic ---
let sphereGroup = null;
let isSphereMode = false;
let targetSphereScale = 1.0; 

export function updateSphereScale(isOpen) {
    if (!isSphereMode || !sphereGroup) return;
    targetSphereScale = isOpen ? 1.5 : 0.6;
}

export function checkSphereClick(normalizedX, normalizedY) {
    if (!isSphereMode || !sphereGroup) return false;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(normalizedX, normalizedY);
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(sphereGroup.children, true);
    
    if (intersects.length > 0) {
        transitionSphereToTree();
        return true;
    }
    return false;
}

function updateSphereAnimation() {
    if (sphereGroup && isSphereMode) {
        sphereGroup.rotation.y += 0.005;
        const currentScale = sphereGroup.scale.x;
        const newScale = currentScale + (targetSphereScale - currentScale) * 0.1;
        sphereGroup.scale.setScalar(newScale);
    }
}

function initParticleSphere() {
    // 防止重复创建
    if (sphereGroup) return;

    isSphereMode = true;
    sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    
    targetSphereScale = 1.0;

    // 粒子球: 70% 金, 20% 红, 10% 绿
    const count = 3000;
    const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15); 
    const material = new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0x111111
    });
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    const colorGold = new THREE.Color(0xFFD700);
    const colorRed = new THREE.Color(0xDC143C);
    const colorGreen = new THREE.Color(0x556B2F);
    
    for (let i = 0; i < count; i++) {
        // 球体分布
        const r = 3.5 * Math.cbrt(Math.random()); 
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        dummy.position.set(x, y + 4.0, z); // 位于中心偏上
        dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        const s = Math.random() * 0.8 + 0.2;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        
        instancedMesh.setMatrixAt(i, dummy.matrix);
        
        const rand = Math.random();
        if (rand < 0.7) instancedMesh.setColorAt(i, colorGold);
        else if (rand < 0.9) instancedMesh.setColorAt(i, colorRed);
        else instancedMesh.setColorAt(i, colorGreen);
    }
    
    instancedMesh.instanceColor.needsUpdate = true;
    sphereGroup.add(instancedMesh);
    
    // 外围灰色粒子环
    const ringCount = 800;
    const ringGeo = new THREE.BufferGeometry();
    const ringPos = [];
    const ringSizes = [];
    
    for(let i=0; i<ringCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = 4.0 + Math.random() * 2.0;
        const y = (Math.random() - 0.5) * 4.0 + 4.0;
        
        ringPos.push(r * Math.cos(theta), y, r * Math.sin(theta));
        ringSizes.push(Math.random() * 0.1 + 0.05);
    }
    ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPos, 3));
    ringGeo.setAttribute('size', new THREE.Float32BufferAttribute(ringSizes, 1));
    const ringMat = new THREE.PointsMaterial({ color: 0x888888, size: 0.1, transparent: true, opacity: 0.6 });
    const outerRing = new THREE.Points(ringGeo, ringMat);
    sphereGroup.add(outerRing);
    
    // 添加环境光以照亮 Cube
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sphereGroup.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 7);
    sphereGroup.add(dirLight);
}

export function updateSphereRotation(deltaX) {
    if (isSphereMode && sphereGroup) {
        sphereGroup.rotation.y += deltaX * 0.005;
    }
}

export function transitionSphereToTree() {
    if (!isSphereMode || !sphereGroup) return;
    
    logger.info("Transitioning Sphere to Tree...");
    
    // 简单过渡：缩小消失
    const startScale = sphereGroup.scale.x;
    let progress = 0;
    
    function animateTrans() {
        progress += 0.02;
        const s = Math.max(0, 1 - progress);
        sphereGroup.scale.setScalar(s);
        sphereGroup.rotation.y += 0.1;
        
        if (progress < 1) {
            requestAnimationFrame(animateTrans);
        } else {
            sphereGroup.visible = false;
            isSphereMode = false;
            scene.remove(sphereGroup);
            sphereGroup = null; // 清理引用
            buildTreeScene(); // 创建树
        }
    }
    animateTrans();
}

function createChristmasTree() {
    // 避免重复创建
    if (treePoints) return;

    const particleCount = 20000; 
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];

    const baseRadius = 4.5; 
    const height = TREE_HEIGHT; 
    const treeY = TREE_BASE_Y;

    for (let i = 0; i < particleCount; i++) {
        const y = Math.random() * height; 
        const percent = y / height; 
        const radius = baseRadius * (1 - percent);
        
        const angle = Math.random() * Math.PI * 2;
        const r = radius * Math.sqrt(Math.random()); 
        
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        positions.push(x, y + treeY, z);

        const color = new THREE.Color();
        const mixRatio = Math.random();
        const colorGreen = new THREE.Color(0x00FF7F);
        const colorPurple = new THREE.Color(0x9400D3);
        
        color.lerpColors(colorGreen, colorPurple, percent * 0.8 + mixRatio * 0.2);
        colors.push(color.r, color.g, color.b);
        sizes.push(Math.random() * 0.4 + 0.1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            uTime: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });

    treePoints = new THREE.Points(geometry, material);
    scene.add(treePoints);
}

function createSnow() {
    if (snowPoints) return;

    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 40;
        const y = Math.random() * 20;
        const z = (Math.random() - 0.5) * 40;
        positions.push(x, y, z);
        
        const color = new THREE.Color(0xFFFFFF);
        if(Math.random() > 0.8) color.setHex(0xFFC0CB);
        
        colors.push(color.r, color.g, color.b);
        sizes.push(Math.random() * 0.2 + 0.1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            uTime: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });

    snowPoints = new THREE.Points(geometry, material);
    scene.add(snowPoints);
}

function createRings() {
    if (ringPoints) return;

    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    
    const height = TREE_HEIGHT;
    const baseRadius = 3.5;
    const maxRadius = baseRadius * 1.5; 
    const loops = 2.5; 
    
    const startHeight = height * 0.85; 
    
    for(let i=0; i<particleCount; i++) {
        const t = i / particleCount; 
        const yRel = startHeight * (1 - t);
        const topRadius = baseRadius * 0.4;
        const rBase = topRadius * (1-t) + maxRadius * t; 
        const rFinal = rBase + 0.5 * Math.sin(t * Math.PI); 
        const angle = t * Math.PI * 2 * loops;
        const spread = 0.1 + t * 0.5;
        const r = rBase + (Math.random() - 0.5) * spread;
        
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const yFinal = yRel + (Math.random() - 0.5) * spread * 0.5 + TREE_BASE_Y;
        
        positions.push(x, yFinal, z);
        colors.push(2.0, 1.5, 0.4); 
        const baseSize = 0.05 + Math.random() * 0.1;
        sizes.push(baseSize * (1 + t * 1.5));
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            uTime: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    
    ringPoints = new THREE.Points(geometry, material);
    scene.add(ringPoints);
}

function createStar() {
    if (starMesh) return;

    // Spoon Mode: Use Sprite with Image
    if (state.treeType === 'spoon') {
        // 使用预加载的纹理
        if (!loadedTextures.spoon || !loadedTextures.tangyuan) {
            console.warn("Textures not preloaded, falling back to runtime loading");
            const textureLoader = new THREE.TextureLoader();
            loadedTextures.spoon = textureLoader.load('resource/spoon.png');
            loadedTextures.tangyuan = textureLoader.load('resource/tangyuan.png');
        }

        // Spoon
        const material = new THREE.SpriteMaterial({ 
            map: loadedTextures.spoon,
            color: 0x777777, 
            transparent: true,
            fog: false // 关闭雾效，避免看起来透明
        });
        starMesh = new THREE.Sprite(material);
        starMesh.scale.set(1.5, 1.5, 1); 
        starMesh.position.set(4.5, 3.5, 0);
        starMesh.renderOrder = 10; // 保证在最上层

        scene.add(starMesh);

        // Tangyuan (独立对象，固定位置)
        const tangyuanMaterial = new THREE.SpriteMaterial({
            map: loadedTextures.tangyuan,
            color: 0x777777, 
            transparent: true,
            fog: false // 关闭雾效，避免看起来透明
        });
        tangyuanMesh = new THREE.Sprite(tangyuanMaterial);
        
        // 调整汤圆位置和大小
        // 位置固定在初始点下方
        tangyuanMesh.position.set(4.5, 2.8, -0.1); 
        // 大小比勺子大 (勺子 1.5)
        tangyuanMesh.scale.set(2.5, 2.5, 1); 
        tangyuanMesh.renderOrder = 5; // 低于勺子

        scene.add(tangyuanMesh);

        return;
    }

    // Christmas Mode: Particle Star
    const particleCount = 1200; 
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    
    const points = 5;
    const outerRadius = 1.2;
    const innerRadius = 0.4; 
    const thickness = 0.8; 
    
    let i = 0;
    while(i < particleCount) {
        const z = (Math.random() - 0.5) * thickness;
        const scaleAtZ = Math.max(0, 1.0 - Math.abs(z / (thickness/2)));
        if (scaleAtZ <= 0.05) continue; 
        
        const currentOuterR = outerRadius * scaleAtZ;
        const xRaw = (Math.random() - 0.5) * 2 * currentOuterR;
        const yRaw = (Math.random() - 0.5) * 2 * currentOuterR;
        const rRaw = Math.sqrt(xRaw*xRaw + yRaw*yRaw);
        if (rRaw > currentOuterR) continue; 
        
        const phi = Math.atan2(yRaw, xRaw) + Math.PI; 
        const sectorAngle = Math.PI / points; 
        const relPhi = phi % (2 * sectorAngle);
        const symPhi = relPhi > sectorAngle ? (2*sectorAngle - relPhi) : relPhi; 
        const t = symPhi / sectorAngle; 
        const maxR_2d = (outerRadius * (1-t) + innerRadius * t) * scaleAtZ;
        
        if (rRaw < maxR_2d) {
             positions.push(xRaw, yRaw, z); 
             const c = new THREE.Color(0xFFD700);
             const distFactor = rRaw / maxR_2d;
             c.lerp(new THREE.Color(0xB8860B), distFactor * 0.5); 
             colors.push(c.r, c.g, c.b);
             sizes.push(Math.random() * 0.3 + 0.15);
             i++;
        }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            uTime: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    
    starMesh = new THREE.Points(geometry, material);
    // 恢复星星位置到右侧腰部，但不需要超前的Z值了
    starMesh.position.set(4.5, 3.5, 0);
    starMesh.rotation.z = -Math.PI / 2;
    scene.add(starMesh);
}

function startAnimation() {
    if (!animationId) {
        animate();
    }
}

function animate() {
    if (state.isLuxuryMode) return; // 停止旧循环

    animationId = requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    if (controls) controls.update();
    
    // 移除人像纹理更新
    
    // 更新球体动画 (缩放)
    updateSphereAnimation();
    
    if (treePoints) treePoints.material.uniforms.uTime.value = time;
    if (snowPoints) {
        snowPoints.material.uniforms.uTime.value = time;
        const positions = snowPoints.geometry.attributes.position.array;
        for(let i=1; i<positions.length; i+=3) {
            positions[i] -= 0.03; 
            if(positions[i] < 0) positions[i] = 20; 
        }
        snowPoints.geometry.attributes.position.needsUpdate = true;
    }
    if (ringPoints) {
        ringPoints.material.uniforms.uTime.value = time;
        ringPoints.rotation.y = -time * 0.3; 
    }
    if (starMesh) {
        if (state.treeType !== 'spoon') {
            starMesh.material.uniforms.uTime.value = time;
        }
        updateStarInteraction();
    }
    
    // 更新倒计时/庆祝动画
    if (countdownMesh) {
        countdownMesh.material.uniforms.uTime.value = time;
    }
    if (celebrationTextGroup) {
        celebrationTextGroup.children.forEach(mesh => {
            mesh.material.uniforms.uTime.value = time;
        });
    }
    if (isCelebration) {
        updateFireworks();
    }
    
    composer.render();
}

function updateStarInteraction() {
    if (!starMesh || !state.handDetected) return;

    // 1. 状态管理：如果没有捏合，就松开
    if (state.isDraggingStar && !state.isPinching) {
        state.isDraggingStar = false; 
        
        if (state.treeType === 'spoon') {
            // Spoon mode: no color change
        } else {
            starMesh.material.uniforms.color.value.setHex(0xFFD700); // 恢复金色
        }
        
        // 检查吸附：是否在树尖附近
        // 树尖坐标 (0, 9.0, 0)
        // 星星当前坐标 starMesh.position
        const distToTop = Math.sqrt(
            starMesh.position.x * starMesh.position.x + 
            (starMesh.position.y - TREE_TOP_Y) * (starMesh.position.y - TREE_TOP_Y) +
            starMesh.position.z * starMesh.position.z
        );
        
        if (distToTop < SNAP_THRESHOLD) {
            console.log("Snap to Tree Top!");
            // 吸附到树尖上方一点点 (留出空隙)
            starMesh.position.set(0, TREE_TOP_Y + 1.5, 0);
            
            // 不再自动跳转，仅吸附
            state.isStarPlaced = true; 
            
            // 可选：可以让星星变亮一点，表示就位
            if (state.treeType === 'spoon') {
                // Spoon mode effect (maybe nothing or flash)
            } else {
                starMesh.material.uniforms.color.value.setHex(0xFFFFFF); 
            }
        } else {
            // 如果没吸附，可以选择回弹或者留在原地
            // 这里选择回弹到初始位置 (4.5, 3.5, 0)
            starMesh.position.set(4.5, 3.5, 0);
        }
    }

    // 2. 尝试抓取：如果没有拖拽，但正在捏合
    if (!state.isDraggingStar && state.isPinching && state.pinchCenter && state.videoLayout) {
        const { drawX, drawY, drawW, drawH } = state.videoLayout;
        
        // 计算屏幕坐标 (基于镜像绘制逻辑)
        const screenX = drawX + (1.0 - state.pinchCenter.x) * drawW;
        const screenY = drawY + state.pinchCenter.y * drawH;
        
        // 转换为 NDC
        const ndcX = (screenX / window.innerWidth) * 2 - 1;
        const ndcY = -(screenY / window.innerHeight) * 2 + 1;
        
        mouse.set(ndcX, ndcY);
        raycaster.setFromCamera(mouse, camera);
        raycaster.params.Points.threshold = 2.0; 
        
        const intersects = raycaster.intersectObject(starMesh);
        if (intersects.length > 0) {
            console.log("Star Drag Started!"); 
            state.isDraggingStar = true;
            // 保持暖黄色，或者稍微变亮 (这里用原色 0xFFD700 稍微加亮到 0xFFE066)
            if (state.treeType === 'spoon') {
                // Spoon highlight (none)
            } else {
                starMesh.material.uniforms.color.value.setHex(0xFFE066); 
            }
        }
    }

    // 3. 执行拖拽：跟随手势位置
    if (state.isDraggingStar && state.pinchCenter && state.videoLayout) {
        const { drawX, drawY, drawW, drawH } = state.videoLayout;
        
        const screenX = drawX + (1.0 - state.pinchCenter.x) * drawW;
        const screenY = drawY + state.pinchCenter.y * drawH;
        
        const ndcX = (screenX / window.innerWidth) * 2 - 1;
        const ndcY = -(screenY / window.innerHeight) * 2 + 1;
        
        const dragRaycaster = new THREE.Raycaster();
        dragRaycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        
        // 恢复拖拽平面到 Z=0
        const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); 
        
        const targetPos = new THREE.Vector3();
        
        if (dragRaycaster.ray.intersectPlane(planeZ, targetPos)) {
            starMesh.position.lerp(targetPos, 0.3);
        }
    }
}

function onWindowResize() {
    if (state.isLuxuryMode) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// --- 元旦树倒计时与烟花逻辑 ---

function startCountdown() {
    isCountingDown = true;
    let count = 5;
    
    // 确保刷新按钮隐藏
    const refreshBtn = document.getElementById('spoon-refresh-btn');
    if (refreshBtn) {
        refreshBtn.style.display = 'none';
    }
    
    function showNum(n) {
        if (countdownMesh) {
            scene.remove(countdownMesh);
            if (countdownMesh.geometry) countdownMesh.geometry.dispose();
            if (countdownMesh.material) countdownMesh.material.dispose();
            countdownMesh = null;
        }
        
        if (n <= 0) {
            startCelebration();
            return;
        }
        
        // 创建粒子数字
        countdownMesh = createTextParticles(n.toString(), 0xFFD700, 2.0);
        countdownMesh.position.set(8, 4, 0); // 往右移 (原为6)
        scene.add(countdownMesh);
        
        setTimeout(() => showNum(n - 1), 1000);
    }
    
    showNum(count);
}

function startCelebration() {
    isCountingDown = false;
    isCelebration = true;
    
    // 隐藏所有物体
    if (treePoints) treePoints.visible = false;
    if (snowPoints) snowPoints.visible = false;
    if (ringPoints) ringPoints.visible = false;
    if (starMesh) starMesh.visible = false;
    if (tangyuanMesh) tangyuanMesh.visible = false;
    
    if (countdownMesh) {
         scene.remove(countdownMesh);
         countdownMesh = null;
    }

    // 创建庆祝文字
    celebrationTextGroup = new THREE.Group();
    
    // 屏幕适配计算
    const aspect = window.innerWidth / window.innerHeight;
    const visibleHeight = 17.3; 
    const visibleWidth = visibleHeight * aspect;
    const cameraCenterX = -2.0;
    
    // 估算文字原始宽度
    const textBaseWidth = 8.0; 
    
    // 计算缩放：最大不超过屏幕宽度的 80%
    let scale = (visibleWidth * 0.8) / textBaseWidth;
    scale = Math.min(scale, 1.5); 
    
    // 计算位置
    let targetX = 6;
    if (visibleWidth < 15) { 
        targetX = cameraCenterX; // 窄屏居中
    } else {
        const rightEdge = cameraCenterX + visibleWidth / 2;
        const textHalfWidth = (textBaseWidth * scale) / 2;
        if (targetX + textHalfWidth > rightEdge - 1) {
            targetX = rightEdge - textHalfWidth - 1;
        }
    }

    const text1 = createTextParticles("2026", 0xFFD700, scale);
    text1.scale.x = 0.8; // 文字变窄
    text1.position.set(targetX, 6.5, 0);
    
    const text2 = createTextParticles("元旦快乐", 0xFF0000, scale * 0.8);
    text2.scale.x = 0.8; // 文字变窄
    text2.position.set(targetX, 3.5, 0);
    
    celebrationTextGroup.add(text1);
    celebrationTextGroup.add(text2);
    scene.add(celebrationTextGroup);
    
    // 显示刷新按钮
    const refreshBtn = document.getElementById('spoon-refresh-btn');
    if (refreshBtn) {
        refreshBtn.style.display = 'flex';
    }
}

function createTextParticles(text, colorHex, scale = 1.0) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    
    ctx.font = 'bold 150px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size/2, size/2);
    
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    const positions = [];
    const colors = [];
    const sizes = [];
    const colorObj = new THREE.Color(colorHex);
    
    for(let y=0; y<size; y+=6) {
        for(let x=0; x<size; x+=6) {
             const i = (y * size + x) * 4;
             if (data[i+3] > 128) {
                  const px = (x - size/2) * 0.02 * scale;
                  const py = -(y - size/2) * 0.02 * scale;
                  positions.push(px, py, 0);
                  colors.push(colorObj.r, colorObj.g, colorObj.b);
                  sizes.push(Math.random() * 0.3 + 0.1);
             }
        }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    // 简化的粒子 Shader
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 customColor;
            varying vec3 vColor;
            uniform float uTime;
            void main() {
                vColor = customColor;
                vec3 pos = position;
                // 微微浮动
                pos.x += sin(uTime * 3.0 + pos.y) * 0.05; 
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 xy = gl_PointCoord.xy - vec2(0.5);
                if(length(xy) > 0.5) discard;
                gl_FragColor = vec4(vColor, 0.8);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    
    return new THREE.Points(geometry, material);
}

// 烟花逻辑
function updateFireworks() {
    if (Math.random() < 0.08) { // 提高生成频率
        fireworks.push(new Firework());
    }
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        if (fireworks[i].done) {
            fireworks[i].dispose();
            fireworks.splice(i, 1);
        }
    }
}

class Firework {
    constructor() {
        this.isExploded = false;
        this.done = false;
        this.particles = [];
        // 扩大烟花范围 (X: -20~20)
        this.pos = new THREE.Vector3((Math.random() - 0.5) * 40, -10, (Math.random() - 0.5) * 10);
        this.vel = new THREE.Vector3(0, Math.random() * 0.3 + 0.4, 0);
        this.color = new THREE.Color().setHSL(Math.random(), 1, 0.6);
        
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0)]);
        const mat = new THREE.PointsMaterial({ color: this.color, size: 0.8 });
        this.mesh = new THREE.Points(geo, mat);
        this.mesh.position.copy(this.pos);
        scene.add(this.mesh);
    }
    
    update() {
        if (!this.isExploded) {
            this.pos.add(this.vel);
            this.vel.y -= 0.01;
            this.mesh.position.copy(this.pos);
            if (this.vel.y <= 0) this.explode();
        } else {
            let aliveCount = 0;
            const positions = this.mesh.geometry.attributes.position.array;
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                if (p.life > 0) {
                    p.pos.add(p.vel);
                    p.vel.y -= 0.005;
                    p.life -= 0.02;
                    aliveCount++;
                    positions[i*3] = p.pos.x;
                    positions[i*3+1] = p.pos.y;
                    positions[i*3+2] = p.pos.z;
                }
            }
            this.mesh.geometry.attributes.position.needsUpdate = true;
            this.mesh.material.opacity -= 0.01;
            if (aliveCount === 0 || this.mesh.material.opacity <= 0) this.done = true;
        }
    }
    
    explode() {
        this.isExploded = true;
        scene.remove(this.mesh);
        
        const count = 100;
        const positions = [];
        this.particles = [];
        for (let i = 0; i < count; i++) {
            const vel = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(Math.random() * 0.3);
            this.particles.push({ pos: this.pos.clone(), vel: vel, life: 1.0 });
            positions.push(this.pos.x, this.pos.y, this.pos.z);
        }
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: this.color, size: 0.3, transparent: true, opacity: 1 });
        this.mesh = new THREE.Points(geo, mat);
        scene.add(this.mesh);
    }
    
    dispose() {
        if (this.mesh) {
            scene.remove(this.mesh);
            if(this.mesh.geometry) this.mesh.geometry.dispose();
            if(this.mesh.material) this.mesh.material.dispose();
        }
    }
}

// 创建刷新按钮（元旦树模式）
function createRefreshButton() {
    // 检查是否已存在，避免重复创建
    let refreshBtn = document.getElementById('spoon-refresh-btn');
    if (refreshBtn) {
        // 已存在，初始隐藏
        refreshBtn.style.display = 'none';
        return refreshBtn;
    }
    
    refreshBtn = document.createElement('button');
    refreshBtn.id = 'spoon-refresh-btn';
    refreshBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
        </svg>
    `;
    refreshBtn.title = '重新开始';
    refreshBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 100;
        width: 56px;
        height: 56px;
        padding: 12px;
        border: 2px solid #D4AF37;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        border-radius: 50%;
        color: #D4AF37;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    `;
    
    // Hover 效果
    refreshBtn.addEventListener('mouseenter', () => {
        refreshBtn.style.background = 'rgba(212, 175, 55, 0.3)';
        refreshBtn.style.color = '#F5E6BF';
        refreshBtn.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.5)';
        refreshBtn.style.transform = 'scale(1.1)';
    });
    
    refreshBtn.addEventListener('mouseleave', () => {
        refreshBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        refreshBtn.style.color = '#D4AF37';
        refreshBtn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        refreshBtn.style.transform = 'scale(1)';
    });
    
    // 点击刷新
    refreshBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    // 旋转动画
    let rotation = 0;
    refreshBtn.addEventListener('mouseenter', () => {
        rotation += 180;
        refreshBtn.querySelector('svg').style.transform = `rotate(${rotation}deg)`;
        refreshBtn.querySelector('svg').style.transition = 'transform 0.5s';
    });
    
    document.body.appendChild(refreshBtn);
    return refreshBtn;
}
