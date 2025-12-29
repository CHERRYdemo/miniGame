import { state } from './state.js';
import { GESTURE_CONFIG } from './config.js';
import { renderUnderwater } from './underwater.js';

// --- 全局变量 ---
let faceMesh = null;
let selfieSegmentation = null;
let hands = null; // 新增 Hands
let isPaused = false; 
let videoStream = null; 
let animationFrameId = null; 
let zoomCapabilities = null; // 存储摄像头变焦能力

// --- 模型初始化 ---

async function initFaceAndBody() {
    console.log("Checking MediaPipe globals...");
    if (!window.FaceMesh || !window.SelfieSegmentation || !window.Hands) {
        throw new Error("MediaPipe libraries not loaded. Please check network connection.");
    }
    
    if (faceMesh && selfieSegmentation && hands) return;

    // FaceMesh
    faceMesh = new window.FaceMesh({locateFile: (file) => `https://unpkg.com/@mediapipe/face_mesh/${file}`});
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onFaceResults);

    // SelfieSegmentation
    selfieSegmentation = new window.SelfieSegmentation({locateFile: (file) => `https://unpkg.com/@mediapipe/selfie_segmentation/${file}`});
    selfieSegmentation.setOptions({
        modelSelection: 1, // 1: Landscape (lighter but good), 0: General
    });
    selfieSegmentation.onResults(onSegmentationResults);
    
    // Hands
    hands = new window.Hands({locateFile: (file) => `https://unpkg.com/@mediapipe/hands/${file}`});
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    hands.onResults(onHandsResults);
}

// --- 结果处理回调 ---

let latestSegmentationMask = null;
let latestImage = null;

function onSegmentationResults(results) {
    if (isPaused) return;
    latestSegmentationMask = results.segmentationMask;
    latestImage = results.image;
    
    // 渲染循环驱动
    renderUnderwater({
        image: latestImage,
        segmentationMask: latestSegmentationMask
    });
}

function onFaceResults(results) {
    if (isPaused) return;
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        state.faceDetected = true;
        const landmarks = results.multiFaceLandmarks[0];
        
        // 嘴巴吹气检测
        const upperLip = landmarks[13];
        const lowerLip = landmarks[14];
        const leftCorner = landmarks[61];
        const rightCorner = landmarks[291];
        
        const mouthHeight = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y);
        const mouthWidth = Math.hypot(leftCorner.x - rightCorner.x, leftCorner.y - rightCorner.y);
        
        const ratio = mouthHeight / mouthWidth;
        
        // 更新嘴巴位置
        state.mouthPosition = {
            x: (leftCorner.x + rightCorner.x) / 2,
            y: (upperLip.y + lowerLip.y) / 2
        };
        
        // 判定是否吹气
        if (ratio > GESTURE_CONFIG.mouthRoundnessThreshold && mouthHeight > GESTURE_CONFIG.mouthOpenThreshold) {
            state.isBlowing = true;
        } else {
            state.isBlowing = false;
        }
        
    } else {
        state.faceDetected = false;
        state.isBlowing = false;
    }
}


function onHandsResults(results) {
    if (isPaused) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        state.handDetected = true;
        
        const hand1 = results.multiHandLandmarks[0];
        const hand2 = results.multiHandLandmarks.length > 1 ? results.multiHandLandmarks[1] : null;

        // 1. 单手握拳/张开判定 (使用第一只手作为主手)
        updateHandState(hand1);
        
        // 2. 双手合十判定
        if (hand1 && hand2) {
            const wrist1 = hand1[0];
            const wrist2 = hand2[0];
            const dist = Math.hypot(wrist1.x - wrist2.x, wrist1.y - wrist2.y);
            
            // 将距离存入 state 以便调试
            state.wristDistance = dist;

            // 放宽阈值到 0.25 (屏幕宽度的 1/4)
            // 只要两只手靠得够近，就认为是合在一起
            if (dist < 0.25) {
                state.isClasped = true;
                state.isPalmsUp = false;
            } else {
                state.isClasped = false;
                // 3. 双手托举判定 (非合十，且两手都张开，且手腕在指尖下方)
                if (isHandOpen(hand1) && isHandOpen(hand2) && isHandUpright(hand1) && isHandUpright(hand2)) {
                    state.isPalmsUp = true;
                } else {
                    state.isPalmsUp = false;
                }
            }
        } else {
            state.isClasped = false;
            state.isPalmsUp = false;
            state.wristDistance = -1; // -1 表示未检测到双手
        }

        // 4. 更新手部中心点 (用于旋转控制，取第一只手)
        // 使用 WRIST(0) 和 MIDDLE_FINGER_MCP(9) 的中点
        const palmX = (hand1[0].x + hand1[9].x) / 2;
        const palmY = (hand1[0].y + hand1[9].y) / 2;
        
        state.handCentroidX = palmX;
        state.palmPosition = { x: palmX, y: palmY };

        // 5. 捏合手势检测 (Thumb tip 4, Index tip 8)
        const thumbTip = hand1[4];
        const indexTip = hand1[8];
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        state.debugPinchDist = pinchDist; 
        // console.log("Pinch Dist:", pinchDist); // Uncomment if needed
        
        // 阈值设为 0.15 更加宽松
        if (pinchDist < 0.15) { 
            state.isPinching = true;
            state.pinchCenter = {
                x: (thumbTip.x + indexTip.x) / 2,
                y: (thumbTip.y + indexTip.y) / 2
            };
        } else {
            state.isPinching = false;
            state.pinchCenter = null;
        }

    } else {
        state.handDetected = false;
        state.isFist = false;
        state.isOpen = false;
        state.isClasped = false;
        state.isPalmsUp = false;
        state.isPinching = false; // Reset pinch
        state.pinchCenter = null;
        state.palmPosition = null;
    }
}

function updateHandState(landmarks) {
    let curledFingers = 0;
    if (isFingerCurled(landmarks, 8, 6)) curledFingers++;
    if (isFingerCurled(landmarks, 12, 10)) curledFingers++;
    if (isFingerCurled(landmarks, 16, 14)) curledFingers++;
    if (isFingerCurled(landmarks, 20, 18)) curledFingers++;
    
    if (curledFingers >= 4) {
        state.isFist = true;
        state.isOpen = false;
    } else if (curledFingers === 0) { 
        state.isFist = false;
        state.isOpen = true;
    } else {
        state.isFist = false;
        state.isOpen = false;
    }
}

function isHandOpen(landmarks) {
    let curledFingers = 0;
    if (isFingerCurled(landmarks, 8, 6)) curledFingers++;
    if (isFingerCurled(landmarks, 12, 10)) curledFingers++;
    if (isFingerCurled(landmarks, 16, 14)) curledFingers++;
    if (isFingerCurled(landmarks, 20, 18)) curledFingers++;
    return curledFingers === 0;
}

function isHandUpright(landmarks) {
    // 手腕(0) 在 中指根部(9) 的下方 (Y坐标更大)
    return landmarks[0].y > landmarks[9].y;
}

function isFingerCurled(landmarks, tipIdx, pipIdx) {
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    
    // 计算到手腕的距离
    const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    
    return dTip < dPip;
}


// --- 摄像头与设备管理 ---

async function getCameraDevices() {
    try {
        await navigator.mediaDevices.getUserMedia({ video: true }); 
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        const select = document.getElementById('camera-select');
        if (select) {
            select.innerHTML = '<option value="" disabled>📷 切换镜头</option>';
            
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `摄像头 ${index + 1}`;
                select.appendChild(option);
            });
            
            select.onchange = (e) => {
                startCamera(e.target.value);
            };
        }
        
        return videoDevices;
    } catch (e) {
        console.error("Error enumerating devices:", e);
    }
}

async function startCamera(deviceId) {
    const videoElement = document.getElementById('input-video');
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    
    try {
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                facingMode: deviceId ? undefined : 'user', 
                // width: { ideal: 480 }, 
                // height: { ideal: 640 },
                zoom: true // 请求变焦能力
            }
        };
        
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = videoStream;
        
        // 获取变焦能力
        const track = videoStream.getVideoTracks()[0];
        if (track.getCapabilities) {
            zoomCapabilities = track.getCapabilities().zoom;
            if (zoomCapabilities) {
                console.log("Camera supports zoom:", zoomCapabilities);
            } else {
                console.warn("Camera does not support zoom.");
            }
        }
        
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve();
            };
        });
        
        if (!animationFrameId) {
            processVideoLoop();
        }
        
    } catch (e) {
        console.error("Error starting camera:", e);
        alert("无法启动摄像头，请检查权限。");
    }
}

export function setZoomLevel(level) {
    if (!videoStream || !zoomCapabilities) return;
    
    const track = videoStream.getVideoTracks()[0];
    
    // 限制在硬件支持的范围内
    const min = zoomCapabilities.min || 1;
    const max = zoomCapabilities.max || 1;
    const constrainedLevel = Math.max(min, Math.min(max, level));
    
    // 应用变焦
    track.applyConstraints({
        advanced: [{ zoom: constrainedLevel }]
    }).catch(e => console.error("Zoom failed:", e));
}

async function processVideoLoop() {
    const videoElement = document.getElementById('input-video');
    
    if (!isPaused && videoElement.readyState >= 2) {
        if (faceMesh) await faceMesh.send({image: videoElement});
        if (selfieSegmentation) await selfieSegmentation.send({image: videoElement});
        if (hands) await hands.send({image: videoElement}); // 发送给 Hands
    }
    
    animationFrameId = requestAnimationFrame(processVideoLoop);
}


// --- 初始化入口 ---

export async function initVision() {
    console.log("initVision started");
    try {
        console.log("Initializing Face and Body...");
        await initFaceAndBody();
        console.log("Getting Camera Devices...");
        await getCameraDevices();
        console.log("Starting Camera...");
        await startCamera(); // 默认启动前置
        
        console.log("Vision Init Complete");
        document.getElementById('loading').style.display = 'none';

    } catch (e) {
        console.error("Vision Init Error:", e);
        document.getElementById('loading').innerText = "加载失败：" + e.message;
    }
}

export function togglePause(shouldPause) {
    isPaused = shouldPause;
    const videoElement = document.getElementById('input-video');
    if (isPaused) {
        videoElement.pause();
    } else {
        videoElement.play();
    }
}

