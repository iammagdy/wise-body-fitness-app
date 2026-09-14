import React, { useEffect, useRef, useState } from "react";

interface WorkoutShareModalProps {
  open: boolean;
  onClose: () => void;
  workoutTitle?: string;
  durationSeconds?: number;
  caloriesBurned?: number;
  sets?: number;
  streak?: number;
  stats?: {
    exercises: number;
    sets: number;
    durationSeconds: number;
    caloriesBurned: number;
    firstExerciseName?: string;
  };
}

export function WorkoutShareModal({
  open,
  onClose,
  workoutTitle: propTitle = "WiseBody Workout",
  durationSeconds: propDuration = 0,
  caloriesBurned: propCalories = 0,
  sets: propSets = 0,
  streak: propStreak = 1,
  stats,
}: WorkoutShareModalProps) {
  const workoutTitle = stats?.firstExerciseName || propTitle;
  const durationSeconds = stats ? stats.durationSeconds : propDuration;
  const caloriesBurned = stats ? stats.caloriesBurned : propCalories;
  const sets = stats ? stats.sets : propSets;
  const streak = propStreak;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 9:16 Instagram & WhatsApp Story Ratio (1080 x 1920)
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Deep Obsidian Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#050507");
    bgGrad.addColorStop(0.5, "#0D0D12");
    bgGrad.addColorStop(1, "#030304");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Kinetic Emerald Glow Auras
    const aura = ctx.createRadialGradient(W / 2, 400, 50, W / 2, 400, 600);
    aura.addColorStop(0, "rgba(16, 185, 129, 0.35)");
    aura.addColorStop(0.6, "rgba(16, 185, 129, 0.05)");
    aura.addColorStop(1, "transparent");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, W, H);

    // 3. Wise Body Brand Header
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 64px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WISE BODY", W / 2, 280);

    ctx.fillStyle = "#10B981";
    ctx.font = "800 28px Inter, sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("PRO ATHLETIC FITNESS", W / 2, 335);

    // 4. Central Medal / Kinetic "W" Wings Emblem
    ctx.save();
    ctx.translate(W / 2, 540);
    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#10B981";
    ctx.shadowBlur = 40;

    ctx.beginPath();
    ctx.moveTo(-120, -70);
    ctx.lineTo(-50, 80);
    ctx.lineTo(0, -20);
    ctx.lineTo(50, 80);
    ctx.lineTo(120, -70);
    ctx.stroke();

    ctx.fillStyle = "#34D399";
    ctx.beginPath();
    ctx.arc(0, -20, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Workout Completed Tag & Title
    ctx.fillStyle = "#94A3B8";
    ctx.font = "700 32px Inter, sans-serif";
    ctx.fillText("WORKOUT SESSION COMPLETED", W / 2, 790);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 76px Inter, sans-serif";
    ctx.fillText(workoutTitle, W / 2, 880);

    // 6. Metrics Grid Boxes
    const minutes = Math.max(1, Math.round(durationSeconds / 60));
    const metrics = [
      { label: "CALORIES BURNED", val: `${caloriesBurned} kcal`, color: "#10B981" },
      { label: "ACTIVE TIME", val: `${minutes} MIN`, color: "#FFFFFF" },
      { label: "SETS LOGGED", val: `${sets} SETS`, color: "#FFFFFF" },
      { label: "CURRENT STREAK", val: `🔥 ${streak} DAYS`, color: "#F59E0B" },
    ];

    const boxW = 420;
    const boxH = 200;
    const coords = [
      { x: 90, y: 980 },
      { x: 570, y: 980 },
      { x: 90, y: 1220 },
      { x: 570, y: 1220 },
    ];

    metrics.forEach((m, idx) => {
      const c = coords[idx];
      ctx.fillStyle = "rgba(24, 24, 27, 0.85)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, boxW, boxH, 36);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#71717A";
      ctx.font = "700 24px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(m.label, c.x + 36, c.y + 70);

      ctx.fillStyle = m.color;
      ctx.font = "900 52px Inter, sans-serif";
      ctx.fillText(m.val, c.x + 36, c.y + 145);
    });

    // 7. Footer Tagline
    ctx.textAlign = "center";
    ctx.fillStyle = "#A1A1AA";
    ctx.font = "600 32px Inter, sans-serif";
    ctx.fillText("No gear. Real results. Part of The Wise Cloud.", W / 2, 1680);

    ctx.fillStyle = "#10B981";
    ctx.font = "800 36px Inter, sans-serif";
    ctx.fillText("fitness.thewise.cloud", W / 2, 1740);

    setDataUrl(canvas.toDataURL("image/png"));
  }, [open, workoutTitle, durationSeconds, caloriesBurned, sets, streak]);

  if (!open) return null;

  const handleShare = async () => {
    if (!dataUrl) return;

    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "wise-body-workout.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Wise Body Workout Achievement",
            text: `Just crushed ${workoutTitle} on Wise Body! Burned ${caloriesBurned} kcal. 🔥`,
            files: [file],
          });
          return;
        }
      } catch {
        /* fallback to download */
      }
    }

    // Fallback: trigger download
    const link = document.createElement("a");
    link.download = "wise-body-workout.png";
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
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
            <span className="text-xl">✨</span>
            <h2 className="text-base font-black tracking-tight uppercase">Share Your Victory</h2>
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

        {/* Hidden Canvas for High-Res Generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scaled Preview */}
        {dataUrl && (
          <div className="relative aspect-[9/16] max-h-[380px] mx-auto overflow-hidden rounded-2xl border border-zinc-700 shadow-xl bg-black">
            <img src={dataUrl} alt="Workout Story Preview" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition active:scale-95"
          >
            Download / Share to Story
          </button>
        </div>
      </div>
    </div>
  );
}
