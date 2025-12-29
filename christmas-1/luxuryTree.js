import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

import { state } from './state.js';
import { logger } from './logger.js';

// Import components (resembling React structure)
import { Foliage } from './components/Foliage.js';
import { Ornaments } from './components/Ornaments.js';
import { TreeStar } from './components/TreeStar.js';

let scene, camera, renderer, composer, controls;
let foliageSystem, ornamentsSystem;
let requestID;
let clock;

export function initLuxuryTree(containerId) {
    logger.info(`[LuxuryTree] init called for ${containerId}`);
    
    const canvas = document.getElementById(containerId);
    if (!canvas) return;
    if (requestID) cancelAnimationFrame(requestID);

    try {
        clock = new THREE.Clock();
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        // 1. Environment & Lighting
        // REMOVED Complex Environment Map generation to avoid black screen issues
        // Relying on strong standard lighting instead
        setupLighting();

        // 2. Camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 20);

        // 3. Renderer
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: false, 
            alpha: false,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ReinhardToneMapping;

        // 4. Compose Scene Objects (acting as <Experience />)
        const mainGroup = new THREE.Group();
        mainGroup.position.y = -5;

        // <Foliage />
        foliageSystem = new Foliage(12000);
        mainGroup.add(foliageSystem.mesh);

        // <Ornaments />
        ornamentsSystem = new Ornaments(600);
        mainGroup.add(ornamentsSystem.group);

        // <TreeStar />
        const treeStar = new TreeStar();
        mainGroup.add(treeStar.mesh);

        // <ContactShadows /> (Simulated)
        const shadowPlane = createShadowPlane();
        mainGroup.add(shadowPlane);

        scene.add(mainGroup);

        // 5. Post Processing
        setupPostProcessing();

        // 6. Controls
        controls = new OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 10;
        controls.maxDistance = 40;
        controls.minPolarAngle = Math.PI / 4;
        controls.maxPolarAngle = Math.PI / 1.8;

        // 7. Animation Loop
        let currentProgress = 0;
        const animate = () => {
            if (!state.isLuxuryMode) return;
            requestID = requestAnimationFrame(animate);
            
            const delta = clock.getDelta();
            const time = clock.elapsedTime;

            // Transition Logic
            const target = 1; 
            currentProgress = THREE.MathUtils.lerp(currentProgress, target, delta * 1.5);

            // Update Components
            foliageSystem.update(time, currentProgress);
            ornamentsSystem.update(delta, time, true);

            controls.update();
            composer.render();
        };
        
        animate();
        logger.info("[LuxuryTree] Animation started");

        window.addEventListener('resize', onWindowResize);

    } catch (e) {
        logger.error(`[LuxuryTree] Error: ${e.message}`);
        console.error(e);
    }
}

function setupLighting() {
    // Strong Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); 
    scene.add(ambientLight);

    // Main Spot Light
    const spotLight = new THREE.SpotLight(0xfff5cc, 100);
    spotLight.position.set(10, 20, 10);
    spotLight.angle = 0.5;
    spotLight.penumbra = 1;
    scene.add(spotLight);

    // Warm Point Light (Gold)
    const pointLight = new THREE.PointLight(0xD4AF37, 50);
    pointLight.position.set(-10, 5, -10);
    scene.add(pointLight);
    
    // Front Light (Fill)
    const frontLight = new THREE.DirectionalLight(0xffffff, 2.0);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.5; // Lower threshold to ensure glow
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);

    const gammaPass = new ShaderPass(GammaCorrectionShader);
    composer.addPass(gammaPass);
}

function createShadowPlane() {
    const shadowGeo = new THREE.PlaneGeometry(30, 30);
    const shadowMat = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.8 
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.1;
    return shadowPlane;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

export function disposeLuxuryTree() {
    if (requestID) cancelAnimationFrame(requestID);
    window.removeEventListener('resize', onWindowResize);
    if (renderer) renderer.dispose();
    if (composer) composer.dispose();
}