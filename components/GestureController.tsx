import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { TreeState } from '../types';

interface GestureControllerProps {
  setTreeState: (state: TreeState) => void;
  setPhotoScale: (scale: number) => void;
  setRotationMod: (mod: number) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ setTreeState, setPhotoScale, setRotationMod }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoTime = useRef(-1);
  const pinchSmoother = useRef(1.0);

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let videoElement: HTMLVideoElement | null = null;

    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        // Initialize Camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement = document.createElement('video');
        videoElement.className = "input-video";
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        document.body.appendChild(videoElement);
        
        videoElement.addEventListener('loadeddata', predict);
        videoRef.current = videoElement;

      } catch (err) {
        console.error("Gesture Controller Init Error:", err);
      }
    };

    const predict = () => {
      if (!landmarker || !videoRef.current) return;
      
      let startTimeMs = performance.now();
      
      if (lastVideoTime.current !== videoRef.current.currentTime) {
        lastVideoTime.current = videoRef.current.currentTime;
        const results = landmarker.detectForVideo(videoRef.current, startTimeMs);
        
        if (results.landmarks) {
           processLandmarks(results.landmarks);
        } else {
            // No hands detected, slowly reset rotation mod and scale
           setRotationMod(0);
           updateScale(false); 
        }
      }
      animationFrameId = requestAnimationFrame(predict);
    };

    const updateScale = (isPinching: boolean) => {
        const targetScale = isPinching ? 10.0 : 1.0;
        // Asymmetric smoothing: 
        // Slow engage (0.1) for smooth zoom in
        // Fast release (0.4) for "immediate" restore feeling
        const lerpSpeed = isPinching ? 0.1 : 0.4; 
        
        pinchSmoother.current += (targetScale - pinchSmoother.current) * lerpSpeed;
        
        // Snap to 1.0 if very close to avoid micro-jitters
        if (!isPinching && Math.abs(pinchSmoother.current - 1.0) < 0.05) {
            pinchSmoother.current = 1.0;
        }
        
        setPhotoScale(pinchSmoother.current);
    };

    const processLandmarks = (landmarks: any[][]) => {
      let isFist = false;
      let isOpen = false;
      let isPinching = false;
      let totalX = 0;

      if (landmarks.length === 0) {
          setRotationMod(0);
          updateScale(false);
          return;
      }

      for (const hand of landmarks) {
        // Points: 0=Wrist, 4=ThumbTip, 8=IndexTip, 12=MidTip, 16=RingTip, 20=PinkyTip
        const wrist = hand[0];
        const thumbTip = hand[4];
        const indexTip = hand[8];
        const middleTip = hand[12];
        const ringTip = hand[16];
        const pinkyTip = hand[20];

        totalX += wrist.x;

        // 1. PINCH DETECTION (Thumb to Index)
        const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y, thumbTip.z - indexTip.z);
        if (pinchDist < 0.05) {
          isPinching = true;
        }

        // 2. FIST vs OPEN DETECTION
        const dIndex = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
        const dMid = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
        const dRing = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
        const dPinky = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);
        
        const avgDist = (dIndex + dMid + dRing + dPinky) / 4;

        if (avgDist < 0.25) {
          isFist = true;
        } else if (avgDist > 0.4) {
          isOpen = true;
        }
      }

      // STATE LOGIC
      if (isOpen) {
        setTreeState(TreeState.SCATTERED);
      } else if (isFist) {
        setTreeState(TreeState.TREE_SHAPE);
      }

      // SCALE LOGIC
      updateScale(isPinching);

      // ROTATION LOGIC (Left/Right Hand Movement)
      const avgX = totalX / landmarks.length;
      const rotationInfluence = (0.5 - avgX) * 5.0; 
      setRotationMod(rotationInfluence);
    };

    setup();

    return () => {
       if (animationFrameId) cancelAnimationFrame(animationFrameId);
       if (videoElement && videoElement.parentNode) {
         videoElement.parentNode.removeChild(videoElement);
       }
       if (videoElement && videoElement.srcObject) {
         (videoElement.srcObject as MediaStream).getTracks().forEach(track => track.stop());
       }
    };
  }, [setTreeState, setPhotoScale, setRotationMod]);

  return null; 
};