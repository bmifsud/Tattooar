// @ts-nocheck
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCcw, Download, SlidersHorizontal, Settings2, Loader2, Maximize } from 'lucide-react';
import { type TattooStyle, getImage, getSavedStyles } from '../utils/storage';

interface TattooRendererProps {
  initialStyle?: TattooStyle | null;
  isEmbed?: boolean;
}

let Pose: any = null;
let FilesetResolver: any = null;
let DrawingUtils: any = null;

export default function TattooRenderer({ initialStyle, isEmbed = false }: TattooRendererProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [poseLandmarker, setPoseLandmarker] = useState<any>(null);
  const [tattooImage, setTattooImage] = useState<HTMLImageElement | null>(null);

  const [activeStyle, setActiveStyle] = useState<TattooStyle | null>(initialStyle || null);

  const [scaleAdjust, setScaleAdjust] = useState(1.0);
  const [rotationAdjust, setRotationAdjust] = useState(0);
  const [opacity, setOpacity] = useState(0.85);
  const [blendMode, setBlendMode] = useState<GlobalCompositeOperation>('multiply');
  const [showControls, setShowControls] = useState(!isEmbed);

  useEffect(() => {
      if (!activeStyle) {
          const styles = getSavedStyles();
          if (styles.length > 0) {
              setActiveStyle(styles[0]);
          }
      }
  }, [activeStyle]);

  useEffect(() => {
      if (activeStyle?.previewUrl) {
          const dataUrl = getImage(activeStyle.previewUrl);
          if (dataUrl) {
              const img = new Image();
              img.src = dataUrl;
              img.onload = () => setTattooImage(img);
          }
      }
  }, [activeStyle]);

  useEffect(() => {
    async function loadModel() {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        FilesetResolver = vision.FilesetResolver;
        Pose = vision.PoseLandmarker;
        DrawingUtils = vision.DrawingUtils;

        const visionLoader = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        const landmarker = await Pose.createFromOptions(visionLoader, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });

        setPoseLandmarker(landmarker);
        setIsModelLoading(false);
      } catch (error) {
        console.error("Failed to load MediaPipe model:", error);
        setIsModelLoading(false);
      }
    }
    loadModel();
  }, []);

  const renderLoop = useCallback(async () => {
    if (!webcamRef.current || !webcamRef.current.video || !canvasRef.current || !poseLandmarker) {
      requestAnimationFrame(renderLoop);
      return;
    }

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== 4) {
      requestAnimationFrame(renderLoop);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startTimeMs = performance.now();
    let results = poseLandmarker.detectForVideo(video, startTimeMs);

    if (results.landmarks && results.landmarks.length > 0 && tattooImage) {
      const landmarks = results.landmarks[0];

      const p1 = landmarks[13];
      const p2 = landmarks[15];

      if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {

        const x = (p1.x + p2.x) / 2 * canvas.width;
        const y = (p1.y + p2.y) / 2 * canvas.height;

        const dx = (p2.x - p1.x) * canvas.width;
        const dy = (p2.y - p1.y) * canvas.height;
        const distance = Math.sqrt(dx*dx + dy*dy);

        const angle = Math.atan2(dy, dx);

        const finalScale = (distance / tattooImage.width) * (activeStyle?.scale || 1.0) * scaleAdjust * 1.5;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + (Math.PI/2) + (rotationAdjust * Math.PI / 180));

        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = blendMode;

        const w = tattooImage.width * finalScale;
        const h = tattooImage.height * finalScale;
        ctx.drawImage(tattooImage, -w/2, -h/2, w, h);

        ctx.restore();
      } else {
          ctx.fillStyle = 'rgba(255,0,0,0.5)';
          ctx.font = '16px Arial';
          ctx.fillText('Move arm into view', 20, 40);
      }
    } else if (!tattooImage) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = '16px Arial';
        ctx.fillText('Select a style from studio', 20, 40);
    }

    requestAnimationFrame(renderLoop);
  }, [poseLandmarker, tattooImage, activeStyle, scaleAdjust, rotationAdjust, opacity, blendMode]);

  useEffect(() => {
    let animationId: number;
    if (poseLandmarker && webcamRef.current) {
        animationId = requestAnimationFrame(renderLoop);
    }
    return () => {
        if (animationId) cancelAnimationFrame(animationId);
    };
  }, [renderLoop, poseLandmarker]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const capture = () => {
    if (!webcamRef.current || !canvasRef.current) return;

    const video = webcamRef.current.video;
    if(!video) return;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = canvasRef.current.width;
    snapCanvas.height = canvasRef.current.height;
    const ctx = snapCanvas.getContext('2d');
    if(!ctx) return;

    ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
    ctx.drawImage(canvasRef.current, 0, 0);

    const dataUrl = snapCanvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `tattoo-tryon-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
      <div className="relative flex-1 w-full flex items-center justify-center">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{ facingMode }}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
        />

        {isModelLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white/10 p-6 rounded-2xl flex flex-col items-center gap-4 text-white">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-medium">Initializing AR Engine...</p>
                </div>
            </div>
        )}
      </div>

      {!isEmbed && (
        <div className="absolute top-0 left-0 right-0 p-4 z-30 flex justify-between items-start pointer-events-none">
            <button
                onClick={() => window.history.back()}
                className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white pointer-events-auto hover:bg-black/60 transition"
            >
                Studio
            </button>
            <div className="flex gap-2 pointer-events-auto">
                <button onClick={() => setShowControls(!showControls)} className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/60 transition">
                    <Settings2 className="w-6 h-6"/>
                </button>
                <button onClick={toggleCamera} className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/60 transition">
                    <RefreshCcw className="w-6 h-6"/>
                </button>
            </div>
        </div>
      )}

      {showControls && (
        <div className="absolute bottom-24 left-4 right-4 z-30 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white space-y-4 max-w-sm mx-auto shadow-2xl transition-all">
            <div className="flex justify-between items-center text-sm font-medium">
                <span className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4"/> Adjustments</span>
                <span className="text-white/50 text-xs">{activeStyle?.technique || 'No Style'}</span>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <span className="text-xs w-12 text-white/70">Scale</span>
                    <input type="range" min="0.5" max="2" step="0.1" value={scaleAdjust} onChange={e => setScaleAdjust(parseFloat(e.target.value))} className="flex-1 accent-white" />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs w-12 text-white/70">Rotate</span>
                    <input type="range" min="-180" max="180" step="1" value={rotationAdjust} onChange={e => setRotationAdjust(parseFloat(e.target.value))} className="flex-1 accent-white" />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs w-12 text-white/70">Opacity</span>
                    <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="flex-1 accent-white" />
                </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                    onClick={() => setBlendMode(blendMode === 'multiply' ? 'source-over' : 'multiply')}
                    className="flex-1 bg-white/10 py-2 rounded-lg text-xs font-medium hover:bg-white/20 transition"
                >
                    Mode: {blendMode}
                </button>
            </div>
        </div>
      )}

      <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center pointer-events-none">
          <button
            onClick={capture}
            className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full p-1 pointer-events-auto active:scale-95 transition-transform"
          >
              <div className="w-full h-full bg-white rounded-full border-4 border-black/10"></div>
          </button>
      </div>
    </div>
  );
}
