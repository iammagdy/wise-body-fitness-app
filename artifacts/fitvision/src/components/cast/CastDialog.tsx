import { useLanguage } from "../../services/i18n";
import React, { useState } from "react";
import {
  detectCastCapabilities,
  startDirectVideoCast,
  startScreenShare,
  toggleFullscreen,
} from "../../services/castService";

interface CastDialogProps {
  open: boolean;
  onClose: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  activeExerciseName?: string;
}

export function CastDialog({
  open,
  onClose,
  videoRef,
  activeExerciseName,
}: CastDialogProps) {
  const [guideTab, setGuideTab] = useState<"ios" | "android">("ios");
  const { t, lang, isRTL } = useLanguage();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!open) return null;

  const caps = detectCastCapabilities(videoRef?.current);

  const handleDirectCast = async () => {
    if (!videoRef?.current) {
      setStatusMsg("No video currently mounted. Start a workout first.");
      return;
    }
    setStatusMsg("Opening wireless TV selector…");
    const res = await startDirectVideoCast(videoRef.current);
    if (res === "failed") {
      setStatusMsg(lang === "ar" ? "خاصية البث المباشر غير مدعومة في هذا المتصفح. جرب مشاركة الشاشة أدناه." : "Native cast dialog not supported in this browser. Try Screen Mirroring below.");
    } else {
      setStatusMsg(null);
      onClose();
    }
  };

  const handleScreenShare = async () => {
    setStatusMsg("Requesting display share…");
    const stream = await startScreenShare();
    if (stream) {
      setStatusMsg("Screen sharing active! Cast to your TV from the system dialog.");
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setStatusMsg(null);
      });
    } else {
      setStatusMsg("Screen share cancelled or not supported.");
    }
  };

  const handleFullscreen = async () => {
    await toggleFullscreen();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cast-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-stone-900 border border-stone-800 text-stone-100 shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-stone-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                  <line x1="2" y1="20" x2="2.01" y2="20" strokeWidth="3" />
                </svg>
              </div>
              <div>
                <h3 id="cast-dialog-title" className="text-lg font-bold tracking-tight text-stone-50">
                  Cast to TV / Big Screen
                </h3>
                <p className="text-xs text-stone-400">
                  {activeExerciseName ? `Streaming: ${activeExerciseName}` : "Zero-login wireless screen sharing"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
              aria-label="Close dialog"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {statusMsg && (
            <p className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-medium text-amber-300">
              {statusMsg}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
          {/* Direct Stream Option */}
          <button
            type="button"
            onClick={handleDirectCast}
            className="w-full text-left p-4 rounded-2xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 transition group active:scale-[0.99] flex items-start gap-4"
          >
            <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 shadow-md group-hover:scale-105 transition shrink-0 mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-100">
                  Cast Video to TV
                </p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  AirPlay · Google Cast
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Wirelessly sends the HD workout video to Apple TV, Samsung, LG, Sony, or Chromecast on your Wi-Fi.
              </p>
            </div>
          </button>

          {/* Screen Share Mirroring Option */}
          {caps.supportsScreenShare && (
            <button
              type="button"
              onClick={handleScreenShare}
              className="w-full text-left p-4 rounded-2xl bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 transition group active:scale-[0.99] flex items-start gap-4"
            >
              <div className="p-2.5 rounded-xl bg-stone-700 text-stone-200 shadow-md group-hover:scale-105 transition shrink-0 mt-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
                  <polyline points="8 21 12 17 16 21" />
                  <path d="M17 8l4-4m0 0h-4m4 0v4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-100">
                    Mirror Entire App Screen
                  </p>
                  <span className="text-[10px] font-semibold text-stone-400">
                    Live Timer & Reps
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Shares your whole workout screen including live countdown ring and controls directly to a display.
                </p>
              </div>
            </button>
          )}

          {/* Fullscreen TV Mode */}
          <button
            type="button"
            onClick={handleFullscreen}
            className="w-full text-left p-4 rounded-2xl bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 transition group active:scale-[0.99] flex items-start gap-4"
          >
            <div className="p-2.5 rounded-xl bg-stone-700 text-stone-200 shadow-md group-hover:scale-105 transition shrink-0 mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-100">
                {t("castCinema")}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Expands the app to borderless widescreen (ideal for Smart TV web browsers or HDMI-connected displays).
              </p>
            </div>
          </button>

          {/* Quick Wi-Fi Mirroring Instructions */}
          <div className="mt-4 pt-4 border-t border-stone-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Phone Wi-Fi Screen Mirroring
              </span>
              <div className="flex rounded-lg bg-stone-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setGuideTab("ios")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    guideTab === "ios" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  iPhone / iPad
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab("android")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    guideTab === "android" ? "bg-amber-500 text-stone-950 font-bold" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Android
                </button>
              </div>
            </div>

            {guideTab === "ios" ? (
              <ol className="space-y-1.5 text-xs text-stone-300 list-decimal list-inside pl-1 bg-stone-950/40 p-3 rounded-xl border border-stone-800/80">
                <li>Make sure iPhone and Smart TV are on the <strong>same Wi-Fi</strong>.</li>
                <li>Swipe down from the top-right corner to open <strong>Control Center</strong>.</li>
                <li>Tap <strong>Screen Mirroring</strong> (two overlapping rectangles).</li>
                <li>Select your Apple TV or AirPlay-compatible Smart TV.</li>
              </ol>
            ) : (
              <ol className="space-y-1.5 text-xs text-stone-300 list-decimal list-inside pl-1 bg-stone-950/40 p-3 rounded-xl border border-stone-800/80">
                <li>Connect your Android phone and TV to the <strong>same Wi-Fi</strong>.</li>
                <li>Swipe down the notification shade and tap <strong>Smart View</strong> or <strong>Cast</strong>.</li>
                <li>Tap your Smart TV or Chromecast from the list.</li>
                <li>The workout will instantly mirror in full widescreen.</li>
              </ol>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950/60 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
