import { useLanguage } from "../../services/i18n";
import React, { useEffect, useRef, useState } from "react";

interface CameraCoachModalProps {
  open: boolean;
  onClose: () => void;
  onRepDetected: () => void;
  currentReps?: number;
  exerciseName?: string;
  targetReps?: number;
}

export function CameraCoachModal({
  open,
  onClose,
  onRepDetected,
  currentReps = 0,
  exerciseName = "Exercise",
  targetReps = 10,
}: CameraCoachModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);
  const { t, lang } = useLanguage();
  const [statusMsg, setStatusMsg] = useState(lang === "ar" ? "ضع نفسك داخل إطار الكاميرا…" : "Position yourself in frame…");
  const prevFrameData = useRef<Uint8ClampedArray | null>(null);
  const motionPhase = useRef<"idle" | "down" | "up">("idle");
  const lastRepTime = useRef<number>(0);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setActive(true);
          setStatusMsg("AI Coach Active. Begin repetitions!");
        }
      } catch {
        setStatusMsg("Camera permission required for AI Rep Counting.");
      }
    }

    initCamera();

    return () => {
      stopCamera();
    };
  }, [open]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setActive(false);
  };

  // Lightweight optical movement cycle tracker
  useEffect(() => {
    if (!active) return;
    let animId: number;

    function processFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = 64;
          canvas.height = 64;
          ctx.drawImage(video, 0, 0, 64, 64);
          const frame = ctx.getImageData(0, 0, 64, 64);
          const data = frame.data;

          if (prevFrameData.current) {
            let totalDiff = 0;
            let upperDiff = 0;
            let lowerDiff = 0;

            for (let i = 0; i < data.length; i += 16) {
              const diff = Math.abs(data[i] - prevFrameData.current[i]);
              totalDiff += diff;
              if (i < data.length / 2) {
                upperDiff += diff;
              } else {
                lowerDiff += diff;
              }
            }

            const now = Date.now();
            if (now - lastRepTime.current > 1200) {
              if (totalDiff > 18000 && lowerDiff > upperDiff * 1.2) {
                motionPhase.current = "down";
              } else if (motionPhase.current === "down" && totalDiff > 16000 && upperDiff > lowerDiff * 1.1) {
                motionPhase.current = "up";
                lastRepTime.current = now;
                onRepDetected();
              }
            }
          }

          prevFrameData.current = new Uint8ClampedArray(data);
        }
      }
      animId = requestAnimationFrame(processFrame);
    }

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [active, onRepDetected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-5 text-white shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-base font-black tracking-tight uppercase">{lang === "ar" ? "مدرب التكرارات بالذكاء الاصطناعي" : "AI Camera Rep Coach"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Video Canvas Container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-inner">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover -scale-x-100"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* HUD Overlay */}
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
              Reps Counted
            </span>
            <span className="font-mono font-black text-lg text-white">
              {currentReps}
            </span>
          </div>

          <div className="absolute bottom-3 inset-x-3 bg-black/75 backdrop-blur-md px-3 py-2 rounded-xl text-center border border-white/10">
            <p className="text-xs font-semibold text-zinc-300">{statusMsg}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">100% On-Device Private Tracking</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition"
        >
          Close Camera Coach
        </button>
      </div>
    </div>
  );
}
