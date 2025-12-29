import React, { useEffect, useRef, useState } from 'react';
import { TreeMode } from '../types';

// 扩展 Window 接口以包含 MediaPipe Hands
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
  }
}

interface GestureControllerProps {
  onModeChange: (mode: TreeMode) => void;
  currentMode: TreeMode;
  onHandPosition?: (x: number, y: number, detected: boolean) => void;
  onTwoHandsDetected?: (detected: boolean) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ 
  onModeChange, 
  currentMode, 
  onHandPosition, 
  onTwoHandsDetected 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [gestureStatus, setGestureStatus] = useState<string>("Initializing...");
  const [handPos, setHandPos] = useState<{ x: number; y: number } | null>(null);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [showCameraButton, setShowCameraButton] = useState(false);
  const lastModeRef = useRef<TreeMode>(currentMode);
  
  // Debounce logic refs
  const openFrames = useRef(0);
  const closedFrames = useRef(0);
  const CONFIDENCE_THRESHOLD = 5; // Number of consecutive frames to confirm gesture

  // 检查手指是否弯曲
  const isFingerCurled = (landmarks: any[], tipIdx: number, pipIdx: number): boolean => {
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    
    const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    
    return dTip < dPip;
  };

  // 检测手势（张开/握拳）
  const detectGesture = (landmarks: any[]) => {
    const wrist = landmarks[0];
    
    // 计算手掌中心
    const palmCenterX = (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5;
    const palmCenterY = (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5;
    
    setHandPos({ x: palmCenterX, y: palmCenterY });
    if (onHandPosition) {
      onHandPosition(palmCenterX, palmCenterY, true);
    }
    
    // 检测手指是否弯曲
    let curledFingers = 0;
    if (isFingerCurled(landmarks, 8, 6)) curledFingers++;  // 食指
    if (isFingerCurled(landmarks, 12, 10)) curledFingers++; // 中指
    if (isFingerCurled(landmarks, 16, 14)) curledFingers++; // 无名指
    if (isFingerCurled(landmarks, 20, 18)) curledFingers++; // 小指
    
    // 判断手势
    if (curledFingers >= 4) {
      // 握拳 -> FORMED
      closedFrames.current++;
      openFrames.current = 0;
      setGestureStatus("Detected: CLOSED (Restore)");
      
      if (closedFrames.current > CONFIDENCE_THRESHOLD) {
        if (lastModeRef.current !== TreeMode.FORMED) {
          lastModeRef.current = TreeMode.FORMED;
          onModeChange(TreeMode.FORMED);
        }
      }
    } else if (curledFingers === 0) {
      // 张开 -> CHAOS
      openFrames.current++;
      closedFrames.current = 0;
      setGestureStatus("Detected: OPEN (Unleash)");
      
      if (openFrames.current > CONFIDENCE_THRESHOLD) {
        if (lastModeRef.current !== TreeMode.CHAOS) {
          lastModeRef.current = TreeMode.CHAOS;
          onModeChange(TreeMode.CHAOS);
        }
      }
    } else {
      // 模糊状态
      setGestureStatus("Detected: ...");
      openFrames.current = 0;
      closedFrames.current = 0;
    }
  };

  // 绘制手势骨架
  const drawHands = (results: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // 检测双手
      const twoHandsDetected = results.multiHandLandmarks.length >= 2;
      if (onTwoHandsDetected) {
        onTwoHandsDetected(twoHandsDetected);
      }

      // 绘制每只手
      results.multiHandLandmarks.forEach((landmarks: any[]) => {
        // 绘制连接线
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
          [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16],
          [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]
        ];
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#D4AF37';
        connections.forEach(([start, end]) => {
          const startPoint = landmarks[start];
          const endPoint = landmarks[end];
          ctx.beginPath();
          ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
          ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
          ctx.stroke();
        });
        
        // 绘制关键点
        landmarks.forEach((landmark: any) => {
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#228B22';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });
      });

      // 使用第一只手进行手势检测
      detectGesture(results.multiHandLandmarks[0]);
    } else {
      setGestureStatus("No hand detected");
      setHandPos(null);
      if (onHandPosition) {
        onHandPosition(0.5, 0.5, false);
      }
      if (onTwoHandsDetected) {
        onTwoHandsDetected(false);
      }
      openFrames.current = Math.max(0, openFrames.current - 1);
      closedFrames.current = Math.max(0, closedFrames.current - 1);
    }
  };

  // 启动摄像头
  const startWebcam = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia is not supported in this browser");
      setGestureStatus("Camera not supported");
      setShowCameraButton(false);
      return;
    }
    
    setCameraRequested(true);
    setShowCameraButton(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" }
      });
      
      videoStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", () => {
          setIsLoaded(true);
          setGestureStatus("Waiting for hand...");
        });
      }
    } catch (err: any) {
      console.error("Error accessing webcam:", err);
      setCameraRequested(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setGestureStatus("Permission Denied - Please allow camera access");
        setShowCameraButton(true);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setGestureStatus("No camera found");
        setShowCameraButton(false);
      } else {
        setGestureStatus(`Camera error: ${err.message || err.name}`);
        setShowCameraButton(true);
      }
    }
  };

  // 初始化 MediaPipe Hands
  useEffect(() => {
    const setupMediaPipe = async () => {
      // 等待 MediaPipe Hands 库加载
      const checkMediaPipe = () => {
        if (window.Hands) {
          return true;
        }
        return false;
      };

      // 轮询检查 MediaPipe 是否加载完成
      const waitForMediaPipe = (): Promise<void> => {
        return new Promise((resolve) => {
          if (checkMediaPipe()) {
            resolve();
            return;
          }
          
          const interval = setInterval(() => {
            if (checkMediaPipe()) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
          
          // 10秒超时
          setTimeout(() => {
            clearInterval(interval);
            if (!checkMediaPipe()) {
              console.error("MediaPipe Hands library failed to load");
              setGestureStatus("MediaPipe library not loaded");
            }
          }, 10000);
        });
      };

      try {
        await waitForMediaPipe();
        
        if (!window.Hands) {
          throw new Error("MediaPipe Hands library not available");
        }

        console.log("Initializing MediaPipe Hands...");
        
        // 初始化 Hands
        handsRef.current = new window.Hands({
          locateFile: (file: string) => `https://unpkg.com/@mediapipe/hands/${file}`
        });
        
        handsRef.current.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        handsRef.current.onResults(drawHands);
        
        console.log("MediaPipe Hands initialized successfully");
        setGestureStatus("Ready - Starting camera...");
        
        // 自动启动摄像头
        await startWebcam();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setGestureStatus("Gesture control unavailable");
        setShowCameraButton(true);
        // 仍然尝试启动摄像头
        await startWebcam();
      }
    };

    setupMediaPipe();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, []);

  // 处理视频循环
  useEffect(() => {
    if (isLoaded && handsRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
      const processVideo = async () => {
        if (handsRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (error) {
            console.error("Error processing video:", error);
          }
        }
        animationFrameIdRef.current = requestAnimationFrame(processVideo);
      };
      
      if (animationFrameIdRef.current === null) {
        processVideo();
      }
    }
    
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [isLoaded]);

  // 同步模式状态
  useEffect(() => {
    lastModeRef.current = currentMode;
  }, [currentMode]);

  // 手动启用摄像头
  const handleEnableCamera = async () => {
    await startWebcam();
  };

  return (
    <div className="absolute top-6 right-[8%] z-50 flex flex-col items-end pointer-events-none">
      <div className="flex flex-row items-center gap-4">
        {/* Camera Preview Frame */}
        <div className="relative w-[18.75vw] h-[14.0625vw] border-2 border-[#D4AF37] rounded-lg overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-black">
          {/* Decorative Lines */}
        <div className="absolute inset-0 border border-[#F5E6BF]/20 m-1 rounded-sm z-10"></div>
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Canvas for hand skeleton overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none z-20"
        />
        
        {/* Enable Camera Button */}
        {showCameraButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 pointer-events-auto">
            <button
              onClick={handleEnableCamera}
              className="px-6 py-3 border-2 border-[#D4AF37] bg-black/70 backdrop-blur-md text-[#D4AF37] font-serif text-sm hover:bg-[#D4AF37]/20 hover:shadow-[0_0_20px_#D4AF37] transition-all duration-300"
            >
              启用摄像头
            </button>
          </div>
        )}
        
        {/* Status Text */}
        {!isLoaded && !showCameraButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <div className="text-[#D4AF37] text-xs font-serif text-center px-2">
              {gestureStatus}
            </div>
          </div>
        )}
        
        {/* Hand Position Indicator */}
        {handPos && (
          <div 
            className="absolute w-2 h-2 bg-[#D4AF37] rounded-full border border-white z-25"
            style={{
              left: `${(1 - handPos.x) * 100}%`,
              top: `${handPos.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </div>

      {/* Refresh/Back Button */}
      <button
        onClick={() => window.location.href = '../christmas-1/index.html'}
        className="p-3 border-2 border-[#D4AF37] bg-black/70 backdrop-blur-md rounded-full text-[#D4AF37] hover:bg-[#D4AF37]/30 hover:text-[#F5E6BF] hover:shadow-[0_0_20px_#D4AF37] transition-all duration-300 pointer-events-auto flex items-center justify-center w-14 h-14 group shadow-lg"
        title="重新开始"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 21h5v-5" />
        </svg>
      </button>
      </div>
    </div>
  );
};
