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

  const videoSrc = getExerciseVideoUrl(exercise, gender, trainerStyle);
  const hasCartoonAlternative = ["b1", "m1", "pp1", "s3", "tr1", "w4"].includes(exercise.id);

  // Playback control and seamless loop recovery
  useEffect(() => {
    setLoaded(false);
    setHasError(false);

    const video = activeVideoRef.current;
    if (!video) return;

    video.src = videoSrc;
    video.load();

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay may be restricted or aborted; fallback handled gracefully
      });
    }

    const onEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("ended", onEnded);
    };
  }, [videoSrc, activeVideoRef]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-3xl bg-stone-900 shadow-xl ring-1 ring-stone-800/80 ${className}`}
      style={{ isolation: "isolate", transform: "translateZ(0)" }}
    >
      {/* Loading Shimmer / Poster */}
      {!loaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-amber-400" />
            <span className="text-xs font-medium tracking-wide text-stone-400 uppercase">
              Loading demonstration…
            </span>
          </div>
        </div>
      )}

      {/* Main High-Definition Looping Video Element */}
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
        onLoadedData={() => {
          setLoaded(true);
          const v = activeVideoRef.current;
          if (v) v.play().catch(() => {});
        }}
        onError={() => {
          setHasError(true);
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Subtle top & bottom vignette for premium fitness UI readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      {/* Badges Overlay */}
      <div className="absolute top-3 right-3 left-3 flex items-center justify-between pointer-events-none">
        {/* Muscle Focus Chip */}
        <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold tracking-wide text-stone-200 backdrop-blur-md border border-white/10">
          🎯 {exercise.targetMuscle}
        </span>

        {/* Trainer Style Toggle (if cartoon available) */}
        {hasCartoonAlternative && onToggleTrainerStyle && (
          <button
            type="button"
            onClick={onToggleTrainerStyle}
            className="pointer-events-auto rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md transition active:scale-95 hover:bg-white/30"
          >
            {trainerStyle === "realistic" ? "Switch to 3D" : "Switch to Pro"}
          </button>
        )}
      </div>

      {/* Subcategory Pill at Bottom Right */}
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-medium text-stone-300 backdrop-blur-sm">
          {exercise.sub_category}
        </span>
      </div>

      {/* Fallback if video error occurs */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-stone-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-stone-400">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
