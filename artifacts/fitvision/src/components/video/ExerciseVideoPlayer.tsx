import { useEffect, useRef, useState } from "react";
import type { Exercise, Gender, TrainerStyle } from "../../types/workout";
import { getExerciseVideoUrl } from "../../data/exercises";

interface ExerciseVideoPlayerProps {
  exercise: Exercise;
  gender: Gender | null;
  trainerStyle?: TrainerStyle;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  className?: string;
  onToggleTrainerStyle?: () => void;
}

export function ExerciseVideoPlayer({
  exercise,
  gender,
  trainerStyle = "realistic",
  videoRef: externalVideoRef,
  className = "",
  onToggleTrainerStyle,
}: ExerciseVideoPlayerProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoRef = externalVideoRef || localVideoRef;
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const videoSrc = getExerciseVideoUrl(exercise, gender, trainerStyle);
  const hasCartoonAlternative = ["b1", "m1", "pp1", "s3", "tr1", "w4"].includes(exercise.id);

  // Robust play helper with browser autoplay policy handling
  const attemptPlay = () => {
    const video = activeVideoRef.current;
    if (!video) return;

    // Explicitly set DOM properties required for mobile browsers
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay blocked by browser policy until user interaction
          setIsPlaying(false);
        });
    }
  };

  useEffect(() => {
    setLoaded(false);
    setHasError(false);

    const video = activeVideoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const onEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    attemptPlay();

    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoSrc, activeVideoRef]);

  const togglePlayback = () => {
    const video = activeVideoRef.current;
    if (!video) return;
    if (video.paused) {
      attemptPlay();
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      onClick={togglePlayback}
      className={`relative h-full w-full overflow-hidden rounded-3xl bg-stone-950 shadow-xl ring-1 ring-stone-800/80 cursor-pointer select-none group ${className}`}
      style={{ isolation: "isolate", transform: "translateZ(0)" }}
    >
      {/* 1. Ambient blurred background to fill the frame seamlessly */}
      <video
        key={`bg-${videoSrc}`}
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          v.muted = true;
          v.play().catch(() => {});
        }}
        className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none"
      />

      {/* 2. Loading Shimmer */}
      {!loaded && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-950/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-amber-400" />
            <span className="text-xs font-medium tracking-wide text-stone-400 uppercase">
              Loading video…
            </span>
          </div>
        </div>
      )}

      {/* 3. Main Uncropped Video: object-contain guarantees full movement stays in frame */}
      <video
        ref={activeVideoRef}
        key={videoSrc}
        src={videoSrc}
        data-anim-id={exercise.id}
        data-anim-sig={exercise.id}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disableRemotePlayback={false}
        {...{ "x-webkit-airplay": "allow" }}
        onLoadedMetadata={() => {
          attemptPlay();
        }}
        onLoadedData={() => {
          setLoaded(true);
          attemptPlay();
        }}
        onCanPlay={() => {
          setLoaded(true);
          attemptPlay();
        }}
        onPlaying={() => setIsPlaying(true)}
        onError={() => {
          setHasError(true);
        }}
        className={`relative z-10 h-full w-full object-contain transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 4. Tap-to-Play Overlay if browser blocked autoplay */}
      {!isPlaying && loaded && !hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-all">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/95 text-stone-950 shadow-xl ring-4 ring-amber-500/30 transform transition hover:scale-105 active:scale-95">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </div>
        </div>
      )}

      {/* 5. Header Badges Overlay */}
      <div className="absolute top-3 right-3 left-3 z-20 flex items-center justify-between pointer-events-none">
        <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold tracking-wide text-stone-100 backdrop-blur-md border border-white/10 shadow-sm">
          🎯 {exercise.targetMuscle}
        </span>

        {hasCartoonAlternative && onToggleTrainerStyle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleTrainerStyle();
            }}
            className="pointer-events-auto rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition active:scale-95 hover:bg-white/30 border border-white/15 shadow-sm"
          >
            {trainerStyle === "realistic" ? "Switch to 3D" : "Switch to Pro"}
          </button>
        )}
      </div>

      {/* 6. Subcategory Pill at Bottom Right */}
      <div className="absolute bottom-3 right-3 z-20 pointer-events-none flex items-center gap-1.5">
        <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-medium text-stone-300 backdrop-blur-sm border border-white/5">
          {exercise.sub_category}
        </span>
      </div>

      {/* 7. Fallback on error */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center bg-stone-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-stone-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-semibold text-stone-200">{exercise.name}</p>
          <p className="mt-1 text-xs text-stone-400">{exercise.targetMuscle}</p>
        </div>
      )}
    </div>
  );
}
