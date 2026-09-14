import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WiseBodyLogo } from "./components/brand/WiseBodyLogo";
import { useLanguage, ROUTINE_TRANSLATIONS } from "./services/i18n";
import { LanguageToggle } from "./components/brand/LanguageToggle";
import { getUserProfile, calculateActiveCalories, calculateSessionCalories, getExerciseMET } from "./services/calorieService";
import { audioFx } from "./services/audioFxService";
import { CURATED_ROUTINES } from "./data/routines";
import { AthleteProfileModal } from "./components/profile/AthleteProfileModal";
import { HeartRateWidget } from "./components/bluetooth/HeartRateWidget";
import { WorkoutShareModal } from "./components/workout/WorkoutShareModal";
import { CameraCoachModal } from "./components/workout/CameraCoachModal";
import type { UserProfile, HeartRateData, CuratedRoutine } from "./types/workout";

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}


type ThemePref = "system" | "light" | "dark";
const THEME_KEY = "fitvision.theme";
const LIGHT_BG = "#fafaf9";
const DARK_BG = "#09090b";

function readStoredTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function applyDomTheme(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", isDark ? DARK_BG : LIGHT_BG);
}

function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => readStoredTheme());
  const [isDark, setIsDark] = useState<boolean>(() => {
    const p = readStoredTheme();
    return p === "dark" || (p === "system" && systemPrefersDark());
  });

  // Apply DOM whenever resolved theme changes
  useEffect(() => {
    applyDomTheme(isDark);
  }, [isDark]);

  // Recompute resolved when pref changes; subscribe to system if "system"
  useEffect(() => {
    if (pref !== "system") {
      setIsDark(pref === "dark");
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [pref]);

  const setTheme = useCallback((next: ThemePref) => {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    setPref(next);
  }, []);

  return { pref, isDark, setTheme };
}

// ===== Generic localStorage helper =====
function useLocalStorage<T extends string>(
  key: string,
  initial: T,
  validate?: (v: string) => v is T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        if (!validate || validate(stored)) return stored as T;
      }
    } catch {
      /* ignore */
    }
    return initial;
  });
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        /* ignore */
      }
      setValue(next);
    },
    [key],
  );
  return [value, set];
}

// ===== Workout preference keys =====
const WORKOUT_TOTAL_SETS_KEY = "fitvision.workout.totalSets";
const WORKOUT_REST_SECONDS_KEY = "fitvision.workout.restSeconds";
const DASHBOARD_CATEGORY_KEY = "fitvision.dashboard.category";

function isCategory(v: string): v is Category {
  return v === "core" || v === "womens_health" || v === "recovery";
}

// ===== Workout history (logged completed sessions) =====
const HISTORY_KEY = "fitvision.history.v1";
const HISTORY_MAX = 200;

type WorkoutSession = {
  id: string;
  endedAt: number;
  durationSeconds: number;
  exercises: number;
  sets: number;
  category: "core" | "womens_health" | "recovery";
  firstExerciseName: string;
  caloriesBurned?: number;
};

function isWorkoutSession(v: unknown): v is WorkoutSession {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.endedAt === "number" &&
    typeof s.durationSeconds === "number" &&
    typeof s.exercises === "number" &&
    typeof s.sets === "number" &&
    (s.category === "core" || s.category === "womens_health" || s.category === "recovery") &&
    typeof s.firstExerciseName === "string" &&
    (s.caloriesBurned === undefined || typeof s.caloriesBurned === "number")
  );
}

function loadHistory(): WorkoutSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWorkoutSession);
  } catch {
    return [];
  }
}

const historyListeners = new Set<() => void>();

function persistHistory(list: WorkoutSession[]) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(list.slice(-HISTORY_MAX)),
    );
  } catch {
    /* ignore */
  }
  historyListeners.forEach((l) => l());
}

function useWorkoutHistory() {
  const [history, setHistory] = useState<WorkoutSession[]>(() => loadHistory());
  useEffect(() => {
    const sync = () => setHistory(loadHistory());
    historyListeners.add(sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      historyListeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const logSession = useCallback(
    (s: Omit<WorkoutSession, "id" | "endedAt"> & { endedAt?: number }) => {
      const session: WorkoutSession = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        endedAt: s.endedAt ?? Date.now(),
        durationSeconds: Math.max(0, Math.round(s.durationSeconds)),
        exercises: Math.max(0, Math.round(s.exercises)),
        sets: Math.max(0, Math.round(s.sets)),
        category: s.category,
        firstExerciseName: s.firstExerciseName,
        caloriesBurned: s.caloriesBurned !== undefined ? Math.max(0, Math.round(s.caloriesBurned)) : undefined,
      };
      const next = [...loadHistory(), session].slice(-HISTORY_MAX);
      persistHistory(next);
      setHistory(next);
    },
    [],
  );
  const clearHistory = useCallback(() => {
    persistHistory([]);
    setHistory([]);
  }, []);
  return { history, logSession, clearHistory };
}

// ===== Arabic voice coaching =====
const VOICE_MUTED_KEY = "fitvision.voiceMuted";

function useArabicVoice(muted: boolean) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [supported, setSupported] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const arSA = voices.find((v) => v.lang === "ar-SA");
      const anyAr =
        arSA ?? voices.find((v) => v.lang.toLowerCase().startsWith("ar"));
      setVoice(anyAr ?? null);
    };
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
    };
  }, []);

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (muted || !supported || !voice) return;
      try {
        // Cancel any in-flight utterance so cues don't pile up
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.lang = voice.lang || "ar-SA";
        u.rate = 0.95;
        u.pitch = 1;
        window.speechSynthesis.speak(u);
      } catch {
        /* ignore */
      }
    },
    [muted, supported, voice],
  );

  return {
    speak,
    cancel,
    supported,
    hasArabicVoice: !!voice,
  };
}

type ArabicCues = { start: string; mid: string; end: string };

const DEFAULT_CUES: ArabicCues = {
  start: "هيا نبدأ التمرين، ركّز على تنفسك",
  mid: "أحسنت، استمر، أنت تقترب من النهاية",
  end: "ممتاز، أكملت التمرين بنجاح",
};

const CUES_BY_SUB: Record<string, ArabicCues> = {
  Strength: {
    start: "تمرين قوة، حافظ على وضعية صحيحة",
    mid: "نصف الطريق، حافظ على شدتك",
    end: "ممتاز، أنهيت تمرين القوة",
  },
  Conditioning: {
    start: "نبدأ تمرين اللياقة، خذ نفسًا عميقًا",
    mid: "استمر، قلبك يقوى الآن",
    end: "أحسنت، أنهيت تمرين اللياقة",
  },
  "Pregnancy Safe": {
    start: "تمرين آمن للحمل، تحركي ببطء",
    mid: "تنفسي بهدوء، أنتِ بأمان",
    end: "ممتاز، أنهيتِ التمرين بأمان",
  },
  Postpartum: {
    start: "تمرين ما بعد الولادة، استمعي لجسمك",
    mid: "استمري بلطف، أنتِ تتعافين",
    end: "أحسنتِ، تمرين رائع",
  },
  Hormonal: {
    start: "تمرين توازن هرموني، استرخي",
    mid: "تابعي بهدوء، تنفسي بعمق",
    end: "ممتاز، شعور رائع",
  },
  "Tech Neck": {
    start: "نريح الرقبة، حركات بطيئة",
    mid: "استمر، رقبتك ترتاح الآن",
    end: "ممتاز، رقبة مرتاحة",
  },
  "Foot Care": {
    start: "نعتني بالقدمين، حركات لطيفة",
    mid: "استمر، قدماك تشكرانك",
    end: "ممتاز، قدمان منتعشتان",
  },
  "Tension Release": {
    start: "نطلق التوتر، أرخِ كتفيك",
    mid: "استمر، توتر أقل وراحة أكثر",
    end: "ممتاز، شعور بالراحة",
  },
};

function getCuesFor(ex: Exercise): ArabicCues {
  return CUES_BY_SUB[ex.sub_category] ?? DEFAULT_CUES;
}


import { ExerciseVideoPlayer } from "./components/video/ExerciseVideoPlayer";
import { getExerciseVideoUrl, EXERCISES } from "./data/exercises";
import { playCountdownBeep, playHalfwayChime, playCompleteChime } from "./services/soundEffects";
import { FormTipsDrawer } from "./components/workout/FormTipsDrawer";
import { CastDialog } from "./components/cast/CastDialog";

function ExerciseLoop({
  exercise,
  gender,
  videoRef,
}: {
  exercise: Exercise;
  gender: Gender | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const [trainerStyle, setTrainerStyle] = useState<"realistic" | "cartoon">("realistic");

  return (
    <div
      data-testid="workout-illustration"
      className="relative h-full w-full overflow-hidden rounded-3xl"
    >
      <ExerciseVideoPlayer
        exercise={exercise}
        gender={gender}
        trainerStyle={trainerStyle}
        videoRef={videoRef}
        onToggleTrainerStyle={() =>
          setTrainerStyle((s) => (s === "realistic" ? "cartoon" : "realistic"))
        }
      />
    </div>
  );
}

// ===== Cast to TV =====
type CastState = "idle" | "connecting" | "casting" | "unsupported";

type CastSupport = { remote: boolean; airplay: boolean };

type RemotePlaybackLike = {
  state: "disconnected" | "connecting" | "connected";
  prompt: () => Promise<void>;
  addEventListener: (type: string, cb: EventListener) => void;
  removeEventListener: (type: string, cb: EventListener) => void;
  watchAvailability?: (cb: (available: boolean) => void) => Promise<number>;
  cancelWatchAvailability?: (id: number) => Promise<void>;
};

type CastAvailability = "unknown" | "available" | "unavailable";

type AirPlayEvent = Event & { availability?: "available" | "not-available" };

type AirPlayVideo = HTMLVideoElement & {
  webkitShowPlaybackTargetPicker?: () => void;
  webkitCurrentPlaybackTargetIsWireless?: boolean;
};

function useCast(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  // attachKey changes whenever the video element identity changes
  // (e.g. exercise swap). Used to re-bind playback listeners after
  // the <video> remounts.
  attachKey: string | null,
) {
  const [support, setSupport] = useState<CastSupport>({
    remote: false,
    airplay: false,
  });
  const [state, setState] = useState<CastState>("idle");
  const [availability, setAvailability] = useState<CastAvailability>("unknown");

  // Detect support once
  useEffect(() => {
    if (typeof window === "undefined" || !("HTMLVideoElement" in window)) {
      setState("unsupported");
      return;
    }
    const proto = HTMLVideoElement.prototype as unknown as Record<
      string,
      unknown
    >;
    const remote = "remote" in proto;
    const airplay = "webkitShowPlaybackTargetPicker" in proto;
    setSupport({ remote, airplay });
    if (!remote && !airplay) setState("unsupported");
  }, []);

  // Subscribe to remote playback + AirPlay events. Re-runs whenever
  // the underlying <video> element changes (attachKey) so listeners
  // bind to the freshly-mounted node, not to a stale null ref.
  useEffect(() => {
    if (!attachKey) return;
    if (!support.remote && !support.airplay) return;

    // The <video> may not be in the DOM in the same tick attachKey
    // updates. Poll briefly until it appears, then wire listeners.
    // Cap retries at ~1s so we don't burn battery forever in screens
    // that never mount a <video> at all (Task #30: workout demo is
    // now SVG, not video — the ref will stay null permanently here).
    let cleanup: (() => void) | null = null;
    let cancelled = false;
    let attempts = 0;

    const wire = () => {
      if (cancelled) return;
      const v = videoRef.current as
        | (HTMLVideoElement & { remote?: RemotePlaybackLike })
        | null;
      if (!v) {
        attempts += 1;
        if (attempts > 20) return; // ~1s of polling, then give up
        window.setTimeout(wire, 50);
        return;
      }

      const disposers: Array<() => void> = [];

      if (support.remote && v.remote) {
        const remote = v.remote;
        // Hydrate from current state in case we're already connected
        const initial = remote.state;
        if (initial === "connected") setState("casting");
        else if (initial === "connecting") setState("connecting");

        const onConnecting = () => setState("connecting");
        const onConnect = () => setState("casting");
        const onDisconnect = () =>
          setState((prev) => (prev === "unsupported" ? prev : "idle"));
        remote.addEventListener("connecting", onConnecting);
        remote.addEventListener("connect", onConnect);
        remote.addEventListener("disconnect", onDisconnect);
        disposers.push(() => {
          remote.removeEventListener("connecting", onConnecting);
          remote.removeEventListener("connect", onConnect);
          remote.removeEventListener("disconnect", onDisconnect);
        });

        // Watch device availability so we can hint when no nearby
        // receivers exist. Some Chromium builds throw if called
        // without an active gesture or in insecure contexts; treat
        // any failure as "unknown" rather than blocking the button.
        if (
          typeof remote.watchAvailability === "function" &&
          typeof remote.cancelWatchAvailability === "function"
        ) {
          let watchId: number | null = null;
          let disposed = false;
          remote
            .watchAvailability((available) => {
              setAvailability(available ? "available" : "unavailable");
            })
            .then((id) => {
              if (disposed) {
                remote.cancelWatchAvailability?.(id).catch(() => {});
              } else {
                watchId = id;
              }
            })
            .catch(() => {
              setAvailability("unknown");
            });
          disposers.push(() => {
            disposed = true;
            if (watchId != null) {
              remote.cancelWatchAvailability?.(watchId).catch(() => {});
            }
          });
        }
      }

      if (support.airplay) {
        const av = v as AirPlayVideo;
        // Hydrate from AirPlay's "currently wireless" flag
        if (av.webkitCurrentPlaybackTargetIsWireless) setState("casting");

        const onWirelessChange = () => {
          if (av.webkitCurrentPlaybackTargetIsWireless) setState("casting");
          else
            setState((prev) => (prev === "unsupported" ? prev : "idle"));
        };
        const onAvailability = (e: AirPlayEvent) => {
          // Availability changes don't imply an active session,
          // but they do tell us whether nearby receivers exist.
          if (e.availability === "available") setAvailability("available");
          else if (e.availability === "not-available")
            setAvailability("unavailable");
        };
        av.addEventListener(
          "webkitcurrentplaybacktargetiswirelesschanged",
          onWirelessChange as EventListener,
        );
        av.addEventListener(
          "webkitplaybacktargetavailabilitychanged",
          onAvailability as EventListener,
        );
        disposers.push(() => {
          av.removeEventListener(
            "webkitcurrentplaybacktargetiswirelesschanged",
            onWirelessChange as EventListener,
          );
          av.removeEventListener(
            "webkitplaybacktargetavailabilitychanged",
            onAvailability as EventListener,
          );
        });
      }

      cleanup = () => disposers.forEach((d) => d());
    };

    wire();
    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [support.remote, support.airplay, videoRef, attachKey]);

  const start = useCallback(async (): Promise<
    "ok" | "unsupported" | "failed"
  > => {
    const v = videoRef.current as
      | (HTMLVideoElement & { remote?: RemotePlaybackLike })
      | null;
    if (!v) return "unsupported";
    if (support.remote && v.remote) {
      try {
        setState("connecting");
        await v.remote.prompt();
        // Reflect actual remote state in case events haven't fired yet
        const s = v.remote.state;
        if (s === "connected") setState("casting");
        else if (s === "connecting") setState("connecting");
        else setState("idle");
        return "ok";
      } catch {
        setState((prev) => (prev === "unsupported" ? prev : "idle"));
        return "failed";
      }
    }
    if (support.airplay) {
      const av = v as AirPlayVideo;
      if (typeof av.webkitShowPlaybackTargetPicker === "function") {
        try {
          av.webkitShowPlaybackTargetPicker();
          // The wireless-changed event will flip state to casting if
          // the user picks a target.
          return "ok";
        } catch {
          return "failed";
        }
      }
    }
    return "unsupported";
  }, [videoRef, support]);

  const stop = useCallback(() => {
    const v = videoRef.current;
    if (!v) {
      setState((prev) => (prev === "unsupported" ? prev : "idle"));
      return;
    }
    // Toggling disableRemotePlayback true forces a disconnect; we
    // restore it to false on the next tick so the element stays
    // castable for a future session.
    try {
      v.disableRemotePlayback = true;
      window.setTimeout(() => {
        try {
          v.disableRemotePlayback = false;
        } catch {
          /* ignore */
        }
      }, 50);
    } catch {
      /* ignore */
    }
    setState((prev) => (prev === "unsupported" ? prev : "idle"));
  }, [videoRef]);

  return { state, support, availability, start, stop };
}

type Platform = "ios" | "android" | "macos" | "windows" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh/i.test(ua)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  return "other";
}

function castInstructionsFor(p: Platform): { title: string; steps: string[] } {
  switch (p) {
    case "android":
      return {
        title: "Mirror your screen on Android",
        steps: [
          "Open Quick Settings (swipe down from the top).",
          "Tap Cast (or Smart View / Screen Cast).",
          "Pick your TV or Chromecast device.",
        ],
      };
    case "ios":
      return {
        title: "Mirror your screen on iPhone or iPad",
        steps: [
          "Open Control Center.",
          "Tap Screen Mirroring.",
          "Choose your Apple TV or AirPlay receiver.",
        ],
      };
    case "macos":
      return {
        title: "Mirror your Mac",
        steps: [
          "Click the Control Center icon in the menu bar.",
          "Click Screen Mirroring.",
          "Pick your Apple TV or AirPlay-enabled display.",
        ],
      };
    case "windows":
      return {
        title: "Mirror your Windows PC",
        steps: [
          "Press Windows key + K to open the Cast pane.",
          "Pick your wireless display or TV.",
        ],
      };
    default:
      return {
        title: "Open your device's screen mirroring",
        steps: [
          "Open your device's Quick Settings or Control Center.",
          "Find Cast, Screen Mirroring, AirPlay, or Smart View.",
          "Pick your TV.",
        ],
      };
  }
}

type Gender = "man" | "woman";
type Screen = "welcome" | "dashboard" | "workout";
type Mode = "timed" | "reps";
type Category = "core" | "womens_health" | "recovery";

type Equipment =
  | "none"
  | "mat"
  | "wall"
  | "chair"
  | "doorway"
  | "towel"
  | "band"
  | "light_dumbbell";

const EQUIPMENT_LABEL: Record<Equipment, string> = {
  none: "No equipment",
  mat: "Mat",
  wall: "Wall",
  chair: "Chair",
  doorway: "Doorway",
  towel: "Towel",
  band: "Band",
  light_dumbbell: "Light dumbbell",
};

type Exercise = {
  id: string;
  name: string;
  targetMuscle: string;
  durationSeconds: number;
  reps: number;
  genderFocus: "men" | "women" | "both";
  mode: Mode;
  category: Category;
  sub_category: string;
  equipment: Equipment;
};

// Dev-only safety net: catch any new exercise that forgets to declare equipment.
if (import.meta.env.DEV) {
  const allowed: ReadonlySet<Equipment> = new Set<Equipment>([
    "none",
    "mat",
    "wall",
    "chair",
    "doorway",
    "towel",
    "band",
    "light_dumbbell",
  ]);
  for (const ex of EXERCISES) {
    if (!ex.equipment || !allowed.has(ex.equipment)) {
      throw new Error(
        `Exercise "${ex.id}" (${ex.name}) is missing a valid equipment value`,
      );
    }
  }
}

function WiseBodyMark({ size = 64, showText = false }: { size?: number; showText?: boolean }) {
  return <WiseBodyLogo size={size} showText={showText} />;
}

function WelcomeScreen({ onSelect }: { onSelect: (gender: Gender) => void }) {
  const { t, isRTL } = useLanguage();
  const reduced = useReducedMotion();
  const introSeen = useMemo(() => {
    try {
      return sessionStorage.getItem("fitvision.welcomeIntroSeen") === "1";
    } catch {
      return false;
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem("fitvision.welcomeIntroSeen", "1");
    } catch {
      /* ignore */
    }
  }, []);
  const skip = reduced || introSeen;

  const baseTransition = skip
    ? { duration: introSeen && !reduced ? 0.2 : 0 }
    : { type: "spring" as const, stiffness: 220, damping: 26, mass: 0.9 };
  const fadeUp = (delay: number) => ({
    initial: skip ? { opacity: introSeen && !reduced ? 0 : 1, y: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { ...baseTransition, delay: skip ? 0 : delay },
  });
  const tap = reduced ? undefined : { scale: 0.97 };
  const hover = reduced ? undefined : { y: -3, scale: 1.01 };

  return (
    <div className="absolute inset-0 flex flex-col justify-between overflow-y-auto px-5 py-6 sm:px-8 bg-[#09090b] text-white no-scrollbar scroll-touch">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-30">
        <LanguageToggle />
      </div>
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[340px] w-[340px] sm:w-[480px] rounded-full blur-[100px] opacity-25"
        style={{
          background: "radial-gradient(circle, #10B981 0%, #059669 45%, transparent 70%)",
        }}
      />

      {/* Brand Hero Section */}
      <div className="relative z-10 flex flex-col items-center text-center pt-4 sm:pt-8">
        <motion.div
          initial={skip ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={skip ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 18 }}
          className="relative"
        >
          <WiseBodyLogo size={96} />
        </motion.div>

        <motion.div {...fadeUp(0.12)} className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t("welcomeTitle")}
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.18)}
          className="mt-3 text-4xl sm:text-5xl font-black tracking-tight text-white uppercase"
        >
          Wise<span className="text-emerald-500">Body</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.24)}
          className="mt-2 max-w-sm text-sm sm:text-base font-normal leading-relaxed text-zinc-400"
        >
          {t("welcomeSubtitle")}
        </motion.p>

        {/* Value Pills Grid */}
        <motion.div
          {...fadeUp(0.3)}
          className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-md"
        >
          <span className="rounded-full bg-zinc-900/90 border border-zinc-800/80 px-3 py-1 text-[11px] font-semibold text-zinc-300">
            ⚡ {t("feature1")}
          </span>
          <span className="rounded-full bg-zinc-900/90 border border-zinc-800/80 px-3 py-1 text-[11px] font-semibold text-zinc-300">
            📺 {t("feature2")}
          </span>
          <span className="rounded-full bg-zinc-900/90 border border-zinc-800/80 px-3 py-1 text-[11px] font-semibold text-zinc-300">
            🎯 {t("feature3")}
          </span>
          <span className="rounded-full bg-zinc-900/90 border border-zinc-800/80 px-3 py-1 text-[11px] font-semibold text-zinc-300">
            🔊 {t("feature4")}
          </span>
        </motion.div>
      </div>

      {/* Athlete Track Selection Cards */}
      <div className="relative z-10 my-6 flex w-full flex-col gap-4 max-w-md mx-auto">
        <motion.p
          {...fadeUp(0.36)}
          className="text-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-500"
        >
          {t("selectTrack")}
        </motion.p>

        {/* Card 1: Men's Strength & Conditioning */}
        <motion.button
          {...fadeUp(0.42)}
          whileTap={tap}
          whileHover={hover}
          type="button"
          onClick={() => onSelect("man")}
          className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-5 text-left transition-all duration-200 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20 active:scale-[0.98]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xl font-bold">
                ⚡
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Strength & Conditioning
                </span>
                <h2 className="text-xl font-black tracking-tight text-white group-hover:text-emerald-300 transition">
                  {t("mensTrackTitle")}
                </h2>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-emerald-500 group-hover:text-black transition">
              →
            </div>
          </div>

          <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
            Explosive pushups, core stability, high-knee conditioning, and full-body athletic power without any gear.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              Chest & Core
            </span>
            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              Conditioning
            </span>
            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              Posture & Back
            </span>
          </div>
        </motion.button>

        {/* Card 2: Women's Sculpt & Wellness */}
        <motion.button
          {...fadeUp(0.48)}
          whileTap={tap}
          whileHover={hover}
          type="button"
          onClick={() => onSelect("woman")}
          className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-5 text-left transition-all duration-200 hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-950/20 active:scale-[0.98]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 text-xl font-bold">
                ✨
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-400">
                  Sculpt, Pelvic & Wellness
                </span>
                <h2 className="text-xl font-black tracking-tight text-white group-hover:text-pink-300 transition">
                  {t("womensTrackTitle")}
                </h2>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 group-hover:bg-pink-500 group-hover:text-black transition">
              →
            </div>
          </div>

          <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
            Targeted core toning, glute activation, postpartum & pregnancy safe routines, plus mindful breathing.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              Glutes & Core
            </span>
            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              Pelvic Health
            </span>
            <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              Mobility & Recovery
            </span>
          </div>
        </motion.button>
      </div>

      {/* Footer reassuring note */}
      <motion.div {...fadeUp(0.54)} className="text-center pb-2">
        <p className="text-[11px] font-medium text-zinc-500">
          No sign-in required · 100% Free · Switch tracks anytime
        </p>
        <p className="mt-1 text-[10px] text-zinc-600">
          Part of The Wise Cloud · fitness.thewise.cloud
        </p>
      </motion.div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function ThemeMenu({
  pref,
  onSelect,
}: {
  pref: ThemePref;
  onSelect: (next: ThemePref) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    pref === "light" ? "Light" : pref === "dark" ? "Dark" : "System";
  const options: { value: ThemePref; label: string; icon: ReactNode }[] =
    [
      { value: "light", label: "Light", icon: <SunIcon /> },
      { value: "dark", label: "Dark", icon: <MoonIcon /> },
      { value: "system", label: "System", icon: <SystemIcon /> },
    ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Theme: ${label}. Tap to change.`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Theme: ${label}`}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700 shadow-sm transition active:scale-95 active:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:active:bg-stone-700"
      >
        {pref === "light" ? <SunIcon /> : pref === "dark" ? <MoonIcon /> : <SystemIcon />}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Choose theme"
          className="absolute right-0 top-12 z-10 w-40 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg dark:border-stone-800 dark:bg-stone-900"
        >
          {options.map((opt) => {
            const isActive = opt.value === pref;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50"
                    : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800/60"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center">
                  {opt.icon}
                </span>
                <span className="flex-1">{opt.label}</span>
                {isActive && (
                  <span aria-hidden="true" className="text-xs">●</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

function ProfileMenu({
  gender,
  onReset,
}: {
  gender: Gender | null;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = gender === "man" ? "Man" : gender === "woman" ? "Woman" : "Profile";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Profile: ${label}. Tap to change.`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Profile: ${label}`}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700 shadow-sm transition active:scale-95 active:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:active:bg-stone-700"
      >
        <UserIcon />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Profile settings"
          className="absolute right-0 top-12 z-10 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Current profile
          </div>
          <div className="px-3 pb-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
            {label}
          </div>
          <div className="border-t border-stone-100 dark:border-stone-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onReset();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800/60"
          >
            <span className="flex h-5 w-5 items-center justify-center">
              <UserIcon />
            </span>
            <span className="flex-1">Change profile</span>
          </button>
        </div>
      )}
    </div>
  );
}

type MovementFamily = "push" | "squat" | "stretch" | "breathing";

function movementFamilyFor(ex: Exercise): MovementFamily {
  const n = ex.name.toLowerCase();
  if (/breath|nostril/.test(n)) return "breathing";
  if (
    /push|plank|row|pull|climb|burpee|crawl|tap|press|superman|bug|bird/.test(n)
  )
    return "push";
  if (
    /squat|lunge|bridge|hinge|thrust|tilt|jump|kick|march|sit|raise|ball bounce|deadlift/.test(
      n,
    )
  )
    return "squat";
  if (
    /stretch|pose|fold|roll|cow|opener|circle|twist|angel|massage|splay|spinal|wall|fascia|pigeon|butterfly|goddess|yin|yoga|reset|walk|legs-up|knees|needle|release|flow/.test(
      n,
    )
  )
    return "stretch";
  if (ex.sub_category === "Hormonal" && ex.mode === "timed") return "breathing";
  if (ex.sub_category === "Strength" || ex.sub_category === "Conditioning")
    return "push";
  return "stretch";
}

function FamilyGlyph({ family }: { family: MovementFamily }) {
  // Tiny line glyph next to the exercise name. 20x20.
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (family === "push")
    return (
      <svg {...common}>
        <circle cx="5" cy="13" r="1.6" fill="currentColor" stroke="none" />
        <path d="M6 14 L18 15" />
        <path d="M9 14 L11 19 M16 15 L19 19" />
      </svg>
    );
  if (family === "squat")
    return (
      <svg {...common}>
        <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
        <path d="M12 7 v6" />
        <path d="M12 13 L9 17 v3 M12 13 L15 17 v3" />
      </svg>
    );
  if (family === "stretch")
    return (
      <svg {...common}>
        <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
        <path d="M12 7 v8" />
        <path d="M12 9 L17 5" />
        <path d="M12 9 L8 13" />
        <path d="M12 15 L9 20 M12 15 L15 20" />
      </svg>
    );
  // breathing
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6" opacity="0.6" />
      <circle cx="12" cy="12" r="9" opacity="0.3" />
    </svg>
  );
}

function NoEquipmentBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
      No equipment
    </span>
  );
}

function GearBadge({ equipment }: { equipment: Equipment }) {
  if (equipment === "none") return <NoEquipmentBadge />;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
      {EQUIPMENT_LABEL[equipment]}
    </span>
  );
}

function ExerciseCard({
  exercise,
  onClick,
}: {
  exercise: Exercise;
  onClick: () => void;
}) {
  const family = movementFamilyFor(exercise);
  const reduced = useReducedMotion();
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      whileHover={reduced ? undefined : { y: -2, scale: 1.01 }}
      transition={
        reduced
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 28 }
      }
      className="group mb-3 cursor-pointer rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80 transition-all duration-200 hover:shadow-md active:scale-[0.985] dark:bg-zinc-900/90 dark:ring-zinc-800/80 dark:hover:ring-emerald-500/40 dark:hover:shadow-emerald-950/20"
    >
      <div className="flex items-center gap-3.5">
        <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 ring-1 ring-stone-200/70 dark:bg-zinc-950 dark:text-emerald-400 dark:ring-zinc-800 shadow-inner">
          <FamilyGlyph family={family} />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-black">
            ▶
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold leading-tight text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
            {exercise.name}
          </h3>
          <p className="mt-0.5 truncate text-[12px] font-medium text-stone-500 dark:text-zinc-400">
            {exercise.targetMuscle}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border dark:border-emerald-500/20">
              {exercise.mode === "timed"
                ? `⏱️ ${exercise.durationSeconds}s`
                : `🔁 ${exercise.reps} reps`}
            </span>
            <GearBadge equipment={exercise.equipment} />
            {exercise.genderFocus !== "both" && (
              <span className="inline-flex items-center rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                {exercise.genderFocus}
              </span>
            )}
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 group-hover:bg-emerald-500 group-hover:text-black dark:bg-zinc-800 dark:text-zinc-400 transition">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

type TabIconProps = { className?: string };
type TabDef = {
  id: Category;
  label: string;
  Icon: (props: TabIconProps) => React.JSX.Element;
};

function DumbbellIcon({ className }: TabIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.5 6.5l11 11" />
      <path d="M21 21l-1-1" />
      <path d="M3 3l1 1" />
      <path d="M18 22l4-4" />
      <path d="M2 6l4-4" />
      <path d="M3 10l7-7" />
      <path d="M14 21l7-7" />
    </svg>
  );
}

function FlowerIcon({ className }: TabIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 9.5c.7-2.4.7-4.4 0-6-1 .8-1.6 2-1.6 3.2 0 1.2.6 2.2 1.6 2.8z" />
      <path d="M12 14.5c-.7 2.4-.7 4.4 0 6 1-.8 1.6-2 1.6-3.2 0-1.2-.6-2.2-1.6-2.8z" />
      <path d="M9.5 12c-2.4-.7-4.4-.7-6 0 .8 1 2 1.6 3.2 1.6 1.2 0 2.2-.6 2.8-1.6z" />
      <path d="M14.5 12c2.4.7 4.4.7 6 0-.8-1-2-1.6-3.2-1.6-1.2 0-2.2.6-2.8 1.6z" />
    </svg>
  );
}

function BandageIcon({ className }: TabIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.5" y="8" width="19" height="8" rx="3" transform="rotate(-30 12 12)" />
      <line x1="10" y1="11" x2="10" y2="11" />
      <line x1="13" y1="10" x2="13" y2="10" />
      <line x1="11" y1="14" x2="11" y2="14" />
      <line x1="14" y1="13" x2="14" y2="13" />
    </svg>
  );
}

const ALL_TABS: TabDef[] = [
  { id: "core", label: "Workout", Icon: DumbbellIcon },
  { id: "womens_health", label: "Women's Health", Icon: FlowerIcon },
  { id: "recovery", label: "Recovery", Icon: BandageIcon },
];

const CATEGORY_HEADINGS: Record<Category, string> = {
  core: "Today's workout",
  womens_health: "Women's health",
  recovery: "Recovery & mobility",
};

const ALL_CHIP = "All";

const SUB_CATEGORIES: Record<Category, string[]> = {
  core: [ALL_CHIP, "Strength", "Conditioning"],
  womens_health: [ALL_CHIP, "Pregnancy Safe", "Postpartum", "Hormonal"],
  recovery: [ALL_CHIP, "Tech Neck", "Foot Care", "Tension Release"],
};

function ChipRow({
  chips,
  active,
  onChange,
}: {
  chips: string[];
  active: string;
  onChange: (chip: string) => void;
}) {
  return (
    <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto whitespace-nowrap p-4">
      {chips.map((chip) => {
        const isActive = chip === active;
        return (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            aria-pressed={isActive}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-[0.97] ${
              isActive
                ? "bg-stone-900 text-white shadow-sm dark:bg-stone-50 dark:text-stone-900"
                : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
            }`}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
}

function BottomNav({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: Category;
  onChange: (id: Category) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <nav
      className="pb-safe absolute bottom-0 left-0 right-0 w-full border-t border-stone-200 bg-white/90 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/90 z-20"
      aria-label="Primary"
    >
      <div className="max-w-md md:max-w-3xl mx-auto flex w-full items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              whileTap={reduced ? undefined : { scale: 0.94 }}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition active:scale-[0.97] ${
                isActive
                  ? "text-stone-900 dark:text-stone-50"
                  : "text-stone-400 dark:text-stone-500"
              }`}
              style={{ minHeight: 60 }}
            >
              {/* Spring-driven active-tab indicator: a small pill
                  underline that flies between tabs using framer-motion's
                  shared layoutId. */}
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  aria-hidden="true"
                  className="absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 rounded-full bg-[#A8121A] dark:bg-red-400"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 500, damping: 36 }
                  }
                />
              )}
              <tab.Icon
                className={isActive ? "h-6 w-6" : "h-6 w-6 opacity-90"}
              />

              <span
                className={`text-[11px] font-medium tracking-wide ${
                  isActive ? "font-semibold" : ""
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

function computeStreak(history: WorkoutSession[]): number {
  if (history.length === 0) return 0;
  const days = new Set<number>();
  for (const s of history) days.add(startOfDay(s.endedAt));
  const today = startOfDay(Date.now());
  let cursor = days.has(today) ? today : today - DAY_MS;
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

function ProgressOverview({
  history,
  onClear,
}: {
  history: WorkoutSession[];
  onClear: () => void;
}) {
  const { t, isRTL } = useLanguage();
  const today = startOfDay(Date.now());
  const todays = history.filter((s) => startOfDay(s.endedAt) === today);
  const todaysSets = todays.reduce((acc, s) => acc + s.sets, 0);
  const todaysSeconds = todays.reduce((acc, s) => acc + s.durationSeconds, 0);
  const streak = computeStreak(history);

  const days = Array.from({ length: 7 }, (_, i) => today - (6 - i) * DAY_MS);
  const perDay = days.map((d) => {
    const sessions = history.filter((s) => startOfDay(s.endedAt) === d);
    const seconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    return { day: d, count: sessions.length, seconds };
  });
  const maxSeconds = Math.max(60, ...perDay.map((p) => p.seconds));
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  const recent = [...history].sort((a, b) => b.endedAt - a.endedAt).slice(0, 3);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const minutesLabel = Math.round(todaysSeconds / 60);
  const todaysCalories = todays.reduce((acc, s) => acc + (s.caloriesBurned ?? Math.round((s.durationSeconds / 60) * 7.5)), 0);

  return (
    <section className="mb-5 rounded-3xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-xl text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-400">
              {t("todayActivity")}
            </p>
          </div>
          <p className="mt-1 text-sm font-medium text-zinc-400">
            {todays.length === 0 ? t("readyForAction") : t("loggedToday", { count: todays.length, plural: todays.length === 1 ? "" : "s" })}
          </p>
        </div>
        <div
          className="flex h-12 min-w-[3.5rem] flex-col items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-3 text-emerald-400 shadow-inner"
          aria-label={`${streak}-day streak`}
        >
          <span className="text-xl font-black leading-none tabular-nums">
            🔥 {streak}
          </span>
          <span className="mt-0.5 text-[8px] font-extrabold uppercase tracking-widest text-emerald-300">
            {t("dayStreak")}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 px-1.5 sm:px-2 py-3 text-center">
          <dt className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Sessions
          </dt>
          <dd className="mt-1 text-xl sm:text-2xl font-black tabular-nums text-white">
            {todays.length}
          </dd>
        </div>
        <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 px-1.5 sm:px-2 py-3 text-center">
          <dt className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Sets
          </dt>
          <dd className="mt-1 text-xl sm:text-2xl font-black tabular-nums text-white">
            {todaysSets}
          </dd>
        </div>
        <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 px-1.5 sm:px-2 py-3 text-center">
          <dt className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Minutes
          </dt>
          <dd className="mt-1 text-xl sm:text-2xl font-black tabular-nums text-emerald-400">
            {minutesLabel}
          </dd>
        </div>
        <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 px-1.5 sm:px-2 py-3 text-center">
          <dt className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Calories
          </dt>
          <dd className="mt-1 text-xl sm:text-2xl font-black tabular-nums text-amber-400">
            {todaysCalories}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {t("last7Days")}
          </p>
          <span className="text-[10px] font-semibold text-zinc-500">
            {t("activityVolume")}
          </span>
        </div>
        <div className="flex h-20 items-end justify-between gap-2 rounded-2xl bg-zinc-950/50 p-3 border border-zinc-800/50">
          {perDay.map((p, i) => {
            const h = p.seconds === 0 ? 6 : Math.max(8, Math.round((p.seconds / maxSeconds) * 52));
            const isToday = p.day === today;
            const date = new Date(p.day);
            return (
              <div key={p.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={`w-full rounded-md transition-all duration-300 ${
                    p.seconds > 0
                      ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/30"
                      : "bg-zinc-800"
                  } ${isToday ? "ring-2 ring-emerald-400" : ""}`}
                  style={{ height: `${h}px` }}
                  title={`${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: ${Math.round(p.seconds / 60)} min`}
                />
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    isToday
                      ? "text-emerald-400"
                      : "text-zinc-500"
                  }`}
                >
                  {dayLabels[date.getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-5 pt-4 border-t border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Recent Completed Workouts
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirmingClear) {
                  onClear();
                  setConfirmingClear(false);
                } else {
                  setConfirmingClear(true);
                  window.setTimeout(() => setConfirmingClear(false), 3000);
                }
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition"
            >
              {confirmingClear ? "Confirm Clear?" : "Clear"}
            </button>
          </div>
          <ul className="space-y-2">
            {recent.map((s) => {
              const date = new Date(s.endedAt);
              const isToday = startOfDay(s.endedAt) === today;
              const isYesterday = startOfDay(s.endedAt) === today - DAY_MS;
              const when = isToday
                ? `Today ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : isYesterday
                  ? `Yesterday ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">
                      {s.firstExerciseName}
                      {s.exercises > 1 ? ` +${s.exercises - 1}` : ""}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {when}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold tabular-nums text-emerald-400">
                      {Math.max(1, Math.round(s.durationSeconds / 60))}m
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {s.sets} {s.sets === 1 ? "set" : "sets"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function DashboardScreen({
  gender,
  onSelectExercise,
  themePref,
  onThemeChange,
  onResetProfile,
  history,
  onClearHistory,
  onOpenCastModal,
}: {
  gender: Gender | null;
  onSelectExercise: (playlist: Exercise[], index: number) => void;
  themePref: ThemePref;
  onThemeChange: (next: ThemePref) => void;
  onResetProfile: () => void;
  history: WorkoutSession[];
  onClearHistory: () => void;
  onOpenCastModal?: () => void;
}) {
  const [category, setCategory] = useLocalStorage<Category>(
    DASHBOARD_CATEGORY_KEY,
    "core",
    isCategory,
  );
  const chips = SUB_CATEGORIES[category];
  const [activeChip, setActiveChip] = useState<string>(ALL_CHIP);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile());
  const { t, lang, isRTL, translateSubCategory, translateEquipment, translateMuscle, translateCategory, translateCategoryHeading } = useLanguage();

  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter(
      (t) => !(t.id === "womens_health" && gender === "man"),
    );
  }, [gender]);

  useEffect(() => {
    if (gender === "man" && category === "womens_health") {
      setCategory("core");
    }
  }, [gender, category, setCategory]);

  useEffect(() => {
    setActiveChip(ALL_CHIP);
  }, [category]);

  const handleCategoryChange = (next: Category) => {
    setActiveChip(ALL_CHIP);
    setCategory(next);
  };

  const filtered = useMemo(() => {
    if (!gender) return [];
    const focus = gender === "man" ? "men" : "women";
    return EXERCISES.filter((e) => {
      if (e.category !== category) return false;
      if (!(e.genderFocus === focus || e.genderFocus === "both")) return false;
      if (activeChip !== ALL_CHIP && e.sub_category !== activeChip) return false;
      return true;
    });
  }, [gender, category, activeChip]);

  const featuredExercise = filtered[0] ?? null;

  const grouped = useMemo(() => {
    if (activeChip !== ALL_CHIP) return null;
    const order = chips.filter((c) => c !== ALL_CHIP);
    const map = new Map<string, Exercise[]>();
    for (const sub of order) map.set(sub, []);
    for (const ex of filtered) {
      if (!map.has(ex.sub_category)) map.set(ex.sub_category, []);
      map.get(ex.sub_category)!.push(ex);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [activeChip, chips, filtered]);

  return (
    <div className="absolute inset-0 flex flex-col bg-[#09090b] text-white">
      {/* World-Class Header */}
      <header className="pt-safe shrink-0 px-5 sm:px-6 pb-3" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 24px)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <WiseBodyLogo size={44} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase">
                  Wise<span className="text-emerald-500">Body</span>
                </h1>
                <span className="rounded-full bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">
                  {gender === "man" ? t("mensTrackBadge") : t("womensTrackBadge")}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {translateCategoryHeading(category)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCastModal && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={onOpenCastModal}
                aria-label="Cast to TV"
                title="Cast workout to Smart TV / Big Screen"
                className="flex h-9 items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 shadow-sm transition active:scale-95 hover:bg-amber-500/25"
              >
                <CastIcon />
                <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Cast TV</span>
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setProfileModalOpen(true)}
              aria-label="Athlete Profile & Calorie Calibration"
              title="Calibrate athlete weight and view MET calorie burn metrics"
              className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 sm:px-3 shadow-sm transition active:scale-95 hover:bg-emerald-500/25"
            >
              <span className="text-xs">🔥</span>
              <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
                {profile.weightKg} {profile.unit}
              </span>
            </motion.button>
            <LanguageToggle />
            <ThemeMenu pref={themePref} onSelect={onThemeChange} />
            <ProfileMenu gender={gender} onReset={onResetProfile} />
          </div>
        </div>
      </header>

      <ChipRow
        chips={chips}
        active={activeChip}
        onChange={setActiveChip}
      />

      <div
        className="no-scrollbar list-fade min-h-0 flex-1 overflow-y-auto px-5 sm:px-6 pt-2 scroll-touch"
        style={{ paddingBottom: 110 }}
      >
        {/* Featured Workout of the Day Hero Banner */}
        {featuredExercise && (
          <div className="mb-5 relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    ⚡ {t("dailyFeatured")}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-400">
                    {t("minBurn")}
                  </span>
                </div>
                <h3 className="mt-2 text-2xl font-black text-white tracking-tight">
                  {featuredExercise.name}
                </h3>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed max-w-sm">
                  Targeting {featuredExercise.targetMuscle} · No equipment needed · Complete technique coaching
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.04 }}
                type="button"
                onClick={() => onSelectExercise(filtered, filtered.indexOf(featuredExercise))}
                className="shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 transition font-black text-xl"
                aria-label={`Start ${featuredExercise.name}`}
              >
                ▶
              </motion.button>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-[11px] font-bold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span>🎯 {t("focusOn")}:</span>
                <span className="text-zinc-200">{featuredExercise.targetMuscle}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span>⚡ {t("gear")}:</span>
                <span className="text-zinc-200">{featuredExercise.equipment.replace('_', ' ')}</span>
              </span>
            </div>
          </div>
        )}

        {/* Curated Fast Routines Section */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-sm font-black">⚡</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                {t("curatedRoutines")}
              </h2>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
              {t("oneTapCircuit")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CURATED_ROUTINES.map((routine) => (
              <div
                key={routine.id}
                className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-4 transition hover:border-emerald-500/50 hover:bg-zinc-900 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl" role="img" aria-label={routine.title}>
                      {routine.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition">
                        {lang === "ar" && ROUTINE_TRANSLATIONS[routine.id] ? ROUTINE_TRANSLATIONS[routine.id].arTitle : routine.title}
                      </h3>
                      <p className="text-[11px] font-semibold text-zinc-400">
                        {lang === "ar" && ROUTINE_TRANSLATIONS[routine.id] ? ROUTINE_TRANSLATIONS[routine.id].arSubtitle : routine.subtitle}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                    {routine.estimatedMinutes}m · {routine.level}
                  </span>
                </div>

                <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {lang === "ar" && ROUTINE_TRANSLATIONS[routine.id] ? ROUTINE_TRANSLATIONS[routine.id].arDesc : routine.description}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2.5">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                    <span>🔥</span>
                    <span>~{routine.estimatedCalories} kcal</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const focus = gender === "man" ? "men" : "women";
                      const routineExercises: Exercise[] = [];
                      for (const id of routine.exerciseIds) {
                        const match = EXERCISES.find((e) => e.id === id && (e.genderFocus === focus || e.genderFocus === "both"))
                          || EXERCISES.find((e) => e.id === id);
                        if (match) routineExercises.push(match);
                      }
                      if (routineExercises.length > 0) {
                        onSelectExercise(routineExercises, 0);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 px-3.5 py-1 text-xs font-black text-black transition active:scale-95 shadow-md shadow-emerald-500/20"
                  >
                    <span>{t("start")}</span>
                    <span>▶</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ProgressOverview history={history} onClear={onClearHistory} />

        {grouped ? (
          grouped.map(([sub, items]) => (
            <section key={sub} className="mb-5">
              <h2 className="sticky top-0 z-10 -mx-5 sm:-mx-6 mb-3 bg-[#09090b]/90 px-5 sm:px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400 backdrop-blur border-b border-zinc-800/60">
                {sub}
                <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-emerald-400 font-extrabold">
                  {items.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((exercise) => {
                  const idxInFiltered = filtered.indexOf(exercise);
                  return (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      onClick={() => onSelectExercise(filtered, idxInFiltered)}
                    />
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((exercise, idx) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onClick={() => onSelectExercise(filtered, idx)}
              />
            ))}
          </div>
        )}
        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500">
            {t("noExercises")}
          </p>
        )}
      </div>

      <BottomNav
        tabs={visibleTabs}
        active={category}
        onChange={handleCategoryChange}
      />

      <AthleteProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        gender={gender}
        onSave={(updated: UserProfile) => setProfile(updated)}
      />
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5.14v13.72a1 1 0 0 0 1.55.83l10.29-6.86a1 1 0 0 0 0-1.66L9.55 4.31A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 6 9 12 15 18" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 6h2v12H6zM20 6 9 12l11 6V6z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 6h2v12h-2zM4 18l11-6L4 6v12z" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ProgressBar({ value }: { value: number }) {
  // value 0..1
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80 dark:bg-stone-800/80"
    >
      <div
        className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out dark:bg-emerald-400"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  min,
  max,
}: {
  label: string;
  value: number | string;
  onDec: () => void;
  onInc: () => void;
  min?: boolean;
  max?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-1.5 py-1 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700">
      <button
        type="button"
        onClick={onDec}
        disabled={min}
        aria-label={`Decrease ${label}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 transition active:scale-90 disabled:opacity-30 dark:text-stone-200"
      >
        <MinusIcon />
      </button>
      <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-50">
        {value}
      </span>
      <button
        type="button"
        onClick={onInc}
        disabled={max}
        aria-label={`Increase ${label}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 transition active:scale-90 disabled:opacity-30 dark:text-stone-200"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function CountdownIntro({
  onDone,
  onSkip,
}: {
  onDone: () => void;
  onSkip: () => void;
}) {
  const { t } = useLanguage();
  const [n, setN] = useState(3);
  useEffect(() => {
    audioFx.playCountdownBeep(n);
    if (n <= 0) {
      const t = window.setTimeout(onDone, 350);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setN((v) => v - 1), 800);
    return () => window.clearTimeout(t);
  }, [n, onDone]);
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-stone-50/95 backdrop-blur-sm dark:bg-stone-950/95"
      onClick={onSkip}
      role="button"
      aria-label="Skip countdown"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
        Get ready
      </p>
      <div
        key={n}
        className="ml-anim-pulse mt-4 font-bold tabular-nums text-stone-900 dark:text-stone-50"
        style={{ fontSize: 144, lineHeight: 1 }}
      >
        {n > 0 ? n : "GO"}
      </div>
      <p className="mt-6 text-xs font-medium text-stone-400 dark:text-stone-500">
        Tap anywhere to skip
      </p>
    </div>
  );
}

function RestScreen({
  initialSeconds,
  nextLabel,
  onComplete,
  onSkip,
  onAdjustDefault,
}: {
  initialSeconds: number;
  nextLabel: string;
  onComplete: () => void;
  onSkip: () => void;
  onAdjustDefault?: (deltaSeconds: number) => void;
}) {
  const { t } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const totalRef = useRef(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      const t = window.setTimeout(onComplete, 250);
      return () => window.clearTimeout(t);
    }
    const t = window.setInterval(() => {
      setSecondsLeft((v) => {
        const next = Math.max(0, v - 1);
        if (next <= 3 && next > 0) {
          audioFx.playCountdownBeep(next);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [secondsLeft, onComplete]);

  const adjust = (delta: number) => {
    setSecondsLeft((v) => {
      const next = Math.max(1, v + delta);
      totalRef.current = Math.max(totalRef.current, next);
      return next;
    });
    // Persist the user's preferred rest length for next session
    if (onAdjustDefault) onAdjustDefault(delta);
  };

  const C = 2 * Math.PI * 45; // 282.74
  const pct = Math.max(0, Math.min(1, secondsLeft / Math.max(1, totalRef.current)));
  const dashOffset = C * (1 - pct);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-stone-50/95 px-6 backdrop-blur-sm dark:bg-stone-950/95">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
        Rest
      </p>
      <div className="relative mt-5 flex h-44 w-44 items-center justify-center">
        <svg className="absolute inset-0" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-stone-200 dark:text-stone-800" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)", transition: "stroke-dashoffset 800ms linear" }}
            className="text-emerald-500 dark:text-emerald-400"
          />
        </svg>
        <div className="font-bold tabular-nums text-stone-900 dark:text-stone-50" style={{ fontSize: 56, lineHeight: 1 }}>
          {secondsLeft}
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
        Up next
      </p>
      <p className="mt-1 max-w-[16rem] truncate text-center text-base font-semibold text-stone-900 dark:text-stone-50">
        {nextLabel}
      </p>
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-15)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm transition active:scale-95 dark:bg-stone-800 dark:text-stone-50"
        >
          −15s
        </button>
        <button
          type="button"
          onClick={() => adjust(15)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm transition active:scale-95 dark:bg-stone-800 dark:text-stone-50"
        >
          +15s
        </button>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="mt-5 rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95 dark:bg-stone-50 dark:text-stone-900"
      >
        Skip rest
      </button>
    </div>
  );
}

function SpeakerOnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function CastIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 16.5V19a2 2 0 0 0 2 2h2.5" />
      <path d="M2 12.5a8.5 8.5 0 0 1 8.5 8.5" />
      <path d="M2 8.5A12.5 12.5 0 0 1 14.5 21" />
      <path d="M2 5V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3.5" />
    </svg>
  );
}

function CastingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="18" rx="2" fill="none" />
      <path d="M6 8 L18 8 L18 16 L6 16 Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function TimedBody({
  exercise,
  active,
  cues,
  speak,
  onSetComplete,
  setNumber,
  totalSets,
}: {
  exercise: Exercise;
  active: boolean;
  cues: ArabicCues;
  speak: (text: string) => void;
  onSetComplete: () => void;
  setNumber: number;
  totalSets: number;
}) {
  const { t } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(exercise.durationSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const reduced = useReducedMotion();

  const clearTimer = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Reset whenever a different exercise or set begins
  useEffect(() => {
    clearTimer();
    setSecondsLeft(exercise.durationSeconds);
    setRunning(false);
    return () => {
      clearTimer();
    };
  }, [exercise.id, exercise.durationSeconds, setNumber]);

  // Stop ticking immediately when the workout layer is no longer active
  useEffect(() => {
    if (!active) {
      clearTimer();
      setRunning(false);
    }
  }, [active]);

  const midCueFiredRef = useRef(false);
  useEffect(() => {
    midCueFiredRef.current = false;
  }, [exercise.id, setNumber]);

  useEffect(() => {
    if (!running || !active) {
      clearTimer();
      return;
    }
    clearTimer();
    const total = exercise.durationSeconds;
    const midpoint = Math.max(1, Math.floor(total / 2));
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          speak(cues.end);
          // Defer so the cue isn't cancelled by transition cleanup
          window.setTimeout(() => onSetComplete(), 500);
          return 0;
        }
        const next = prev - 1;
        if (!midCueFiredRef.current && next <= midpoint) {
          midCueFiredRef.current = true;
          speak(cues.mid);
        }
        return next;
      });
    }, 1000);
    return () => {
      clearTimer();
    };
  }, [running, active, exercise.durationSeconds, cues, speak, onSetComplete]);

  const toggle = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(exercise.durationSeconds);
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  };

  const elapsed = exercise.durationSeconds - secondsLeft;
  const progress = elapsed / Math.max(1, exercise.durationSeconds);

  return (
    <div className="flex flex-1 flex-col px-6">
      <div className="mt-2">
        <ProgressBar value={progress} />
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
          <span>{t("setCount", { current: setNumber, total: totalSets })}</span>
          <span>{formatTime(exercise.durationSeconds - secondsLeft)} / {formatTime(exercise.durationSeconds)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center py-2">
        <div className="relative h-44 w-44 sm:h-52 sm:w-52 max-w-[210px] max-h-[210px]">
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth={6}
              className="stroke-stone-200 dark:stroke-stone-800"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - progress)}
              className="stroke-emerald-500 transition-[stroke-dashoffset] duration-700 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-center font-mono font-bold tabular-nums text-stone-900 dark:text-stone-50 text-5xl sm:text-6xl"
              style={{ lineHeight: 1 }}
            >
              {formatTime(secondsLeft)}
            </div>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={toggle}
          aria-label={running ? "Pause" : "Play"}
          whileTap={reduced ? undefined : { scale: 0.92 }}
          whileHover={reduced ? undefined : { scale: 1.03 }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 22 }
          }
          className={`mt-4 sm:mt-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl transition active:scale-95 active:bg-emerald-600 dark:bg-emerald-500 dark:text-white ${running ? "cta-pulse" : ""}`}
        >
          {running ? <PauseIcon /> : <PlayIcon />}
        </motion.button>
      </div>
    </div>
  );
}

function RepsBody({
  exercise,
  onSetComplete,
  cues,
  speak,
  setNumber,
  totalSets,
  externalRepTrigger,
}: {
  exercise: Exercise;
  onSetComplete: (repsCompleted?: number) => void;
  cues: ArabicCues;
  speak: (text: string) => void;
  setNumber: number;
  totalSets: number;
  externalRepTrigger?: number;
}) {
  const { t } = useLanguage();
  const [reps, setReps] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    setReps(0);
  }, [exercise.id, exercise.reps, setNumber]);

  useEffect(() => {
    if (externalRepTrigger && externalRepTrigger > 0) {
      setReps((r) => r + 1);
      audioFx.playCountdownBeep(1);
    }
  }, [externalRepTrigger]);

  return (
    <div className="flex flex-1 flex-col px-6">
      <div className="mt-2">
        <ProgressBar value={Math.min(1, reps / Math.max(1, exercise.reps))} />
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
          <span>{t("setCount", { current: setNumber, total: totalSets })}</span>
          <span>{t("repsTarget", { count: exercise.reps })}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center py-2">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
          {t("reps")}
        </p>
        <div
          className="mt-1 text-center font-bold tabular-nums text-stone-900 dark:text-stone-50 text-6xl sm:text-7xl leading-none"
        >
          {reps}
        </div>
        <div className="mt-3">
          <Stepper
            label="reps"
            value={reps}
            onDec={() => setReps((r) => Math.max(0, r - 1))}
            onInc={() => setReps((r) => r + 1)}
            min={reps <= 0}
          />
        </div>
      </div>
      <motion.button
        type="button"
        onClick={() => {
          speak(cues.end);
          window.setTimeout(() => onSetComplete(reps || exercise.reps), 500);
        }}
        aria-label="Complete set"
        whileTap={reduced ? undefined : { scale: 0.97 }}
        whileHover={reduced ? undefined : { scale: 1.01 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 24 }
        }
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-lg font-semibold text-white shadow-md transition active:scale-[0.98] active:bg-emerald-600 min-h-[52px]"
      >
        <CheckIcon />
        {t("completeSet")}
      </motion.button>
    </div>
  );
}

function CastInstructionsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const platform = useMemo(() => detectPlatform(), []);
  const { title, steps } = useMemo(
    () => castInstructionsFor(platform),
    [platform],
  );
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-stone-900/50 px-4 pb-6 pt-10 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cast-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl bg-white p-5 shadow-xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3
            id="cast-modal-title"
            className="text-lg font-semibold text-stone-900 dark:text-stone-50"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
          The web can't open the screen-mirroring picker for you, so
          start it from your device:
        </p>
        <ol className="space-y-2 text-sm text-stone-700 dark:text-stone-200">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white dark:bg-stone-50 dark:text-stone-900">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-stone-900 px-6 py-3 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:active:bg-stone-200"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function WorkoutScreen({
  playlist,
  index,
  active,
  gender,
  videoRef,
  onBack,
  onChangeIndex,
  onOpenCastModal,
  onLogSession,
}: {
  playlist: Exercise[];
  index: number;
  active: boolean;
  gender: Gender | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onBack: () => void;
  onChangeIndex: (next: number) => void;
  onOpenCastModal: () => void;
  onLogSession: (s: Omit<WorkoutSession, "id" | "endedAt">) => void;
}) {
  const { t, isRTL, translateMuscle, translateEquipment } = useLanguage();
  const exercise = playlist[index] ?? null;
  const nextExercise = playlist[index + 1] ?? null;
  const hasPrev = index > 0;
  const hasNext = index + 1 < playlist.length;
  // Up-next preview honours OS reduced-motion just like the active
  // illustration; otherwise the thumbnail animates live.
  const upNextReducedMotion = useReducedMotion();

  const [mutedStr, setMutedStr] = useLocalStorage<"1" | "0">(
    VOICE_MUTED_KEY,
    "1",
    (v): v is "1" | "0" => v === "1" || v === "0",
  );
  const muted = mutedStr === "1";
  const { speak, cancel, supported, hasArabicVoice } = useArabicVoice(muted);

  const cues = exercise ? getCuesFor(exercise) : DEFAULT_CUES;

  // ===== Per-exercise session state =====
  const [totalSetsStr, setTotalSetsStr] = useLocalStorage<string>(
    WORKOUT_TOTAL_SETS_KEY,
    "1",
    (v): v is string => /^([1-9]|10)$/.test(v),
  );
  const totalSets = Math.min(10, Math.max(1, parseInt(totalSetsStr, 10) || 1));
  const setTotalSets = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const prev = Math.min(10, Math.max(1, parseInt(totalSetsStr, 10) || 1));
      const next = typeof updater === "function" ? (updater as (p: number) => number)(prev) : updater;
      const clamped = Math.min(10, Math.max(1, Math.round(next)));
      setTotalSetsStr(String(clamped));
    },
    [totalSetsStr, setTotalSetsStr],
  );
  const [restSecondsStr, setRestSecondsStr] = useLocalStorage<string>(
    WORKOUT_REST_SECONDS_KEY,
    "20",
    (v): v is string => /^\d{1,3}$/.test(v) && parseInt(v, 10) >= 1 && parseInt(v, 10) <= 600,
  );
  const restSeconds = Math.min(600, Math.max(1, parseInt(restSecondsStr, 10) || 20));
  const handleRestDefaultChange = useCallback(
    (delta: number) => {
      const prev = Math.min(600, Math.max(1, parseInt(restSecondsStr, 10) || 20));
      const clamped = Math.min(600, Math.max(1, Math.round(prev + delta)));
      setRestSecondsStr(String(clamped));
    },
    [restSecondsStr, setRestSecondsStr],
  );
  const [setNumber, setSetNumber] = useState(1);
  const [phase, setPhase] = useState<"intro" | "exercise" | "rest">("intro");

  // ===== Athlete Profile & Calorie Science =====
  const [profile] = useState<UserProfile>(() => getUserProfile());
  const [activeKcal, setActiveKcal] = useState(0);
  const [heartRate, setHeartRate] = useState<HeartRateData | null>(null);
  const [cameraCoachOpen, setCameraCoachOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [cameraRepTrigger, setCameraRepTrigger] = useState(0);

  // ===== Workout session totals (for end-of-workout summary) =====
  const [completedSets, setCompletedSets] = useState(0);
  const [completedExercises, setCompletedExercises] = useState(0);
  const [summary, setSummary] = useState<
    | {
        totalExercises: number;
        completedSets: number;
        elapsedSeconds: number;
        caloriesBurned: number;
      }
    | null
  >(null);
  const sessionStartRef = useRef<number | null>(null);

  // Start (or restart) a session whenever the workout screen becomes
  // active. We key the start on the first exercise id so re-entering
  // the same playlist starts fresh totals and an accurate timer.
  useEffect(() => {
    if (!active) {
      sessionStartRef.current = null;
      return;
    }
    sessionStartRef.current = Date.now();
    setCompletedSets(0);
    setCompletedExercises(0);
    setActiveKcal(0);
    setSummary(null);
  }, [active, playlist[0]?.id]);

  // Reset session whenever the exercise changes (keep totalSets — user pref is persisted)
  useEffect(() => {
    if (!exercise) return;
    setSetNumber(1);
    setPhase("intro");
  }, [exercise?.id]);

  // Stop intro/rest if the screen becomes inactive
  useEffect(() => {
    if (!active) {
      cancel();
    }
  }, [active, cancel]);

  const finishWorkout = useCallback(
    (finalSetCount: number, finalExerciseCount: number, finalKcal: number = activeKcal) => {
      const start = sessionStartRef.current ?? Date.now();
      const elapsedSeconds = Math.max(
        0,
        Math.round((Date.now() - start) / 1000),
      );
      cancel();
      audioFx.playVictoryFanfare();
      setPhase("exercise");
      const burned = Math.max(1, Math.round(finalKcal));
      setSummary({
        totalExercises: finalExerciseCount,
        completedSets: finalSetCount,
        elapsedSeconds,
        caloriesBurned: burned,
      });
      const first = playlist[0];
      if (first && finalSetCount > 0) {
        onLogSession({
          durationSeconds: elapsedSeconds,
          exercises: finalExerciseCount,
          sets: finalSetCount,
          category: first.category,
          firstExerciseName: first.name,
          caloriesBurned: burned,
        });
      }
    },
    [cancel, playlist, onLogSession],
  );

  const handleSetComplete = useCallback((repsDone?: number) => {
    audioFx.playSetComplete();
    const duration = exercise.mode === "timed" ? exercise.durationSeconds : ((repsDone ?? exercise.reps) * 3.5);
    const addedKcal = calculateActiveCalories(exercise, duration, profile.weightKg);
    const updatedKcal = activeKcal + addedKcal;
    setActiveKcal(updatedKcal);

    const nextCompletedSets = completedSets + 1;
    setCompletedSets(nextCompletedSets);
    if (setNumber < totalSets) {
      setPhase("rest");
      return;
    }
    // Last set of this exercise finished.
    const nextCompletedExercises = completedExercises + 1;
    setCompletedExercises(nextCompletedExercises);
    if (hasNext) {
      setPhase("rest");
    } else {
      finishWorkout(nextCompletedSets, nextCompletedExercises, updatedKcal);
    }
  }, [
    exercise,
    profile.weightKg,
    activeKcal,
    setNumber,
    totalSets,
    hasNext,
    completedSets,
    completedExercises,
    finishWorkout,
  ]);

  const handleRestComplete = useCallback(() => {
    if (setNumber < totalSets) {
      setSetNumber((n) => n + 1);
      setPhase("exercise");
      return;
    }
    // Move to next exercise
    if (hasNext) {
      onChangeIndex(index + 1);
      // Resetting via the index-change effect above will re-init phase.
    } else {
      finishWorkout(completedSets, completedExercises);
    }
  }, [
    setNumber,
    totalSets,
    hasNext,
    onChangeIndex,
    index,
    finishWorkout,
    completedSets,
    completedExercises,
  ]);

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    cancel();
    onChangeIndex(index - 1);
  }, [hasPrev, cancel, onChangeIndex, index]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    cancel();
    onChangeIndex(index + 1);
  }, [hasNext, cancel, onChangeIndex, index]);

  // Speak the start cue when the user transitions into the actual
  // exercise phase (after the 3-2-1 countdown / between-set rest).
  useEffect(() => {
    if (!exercise || !active || phase !== "exercise") return;
    const t = window.setTimeout(() => {
      speak(cues.start);
    }, 250);
    return () => {
      window.clearTimeout(t);
      cancel();
    };
  }, [exercise?.id, setNumber, phase, active, cues, speak, cancel]);

  // Always cancel speech on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  if (!exercise) return null;

  // Honest disclosure: surface the device limitation any time
  const showVoiceUnavailableHint = supported && !hasArabicVoice;

  const estCalories = Math.round(activeKcal);

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row bg-[#09090b] text-white overflow-y-auto md:overflow-hidden scroll-touch pb-36 md:pb-0 no-scrollbar">
      {/* 1. Left / Main Studio Stage (Video Demonstration) */}
      <div className="shrink-0 w-full md:flex-1 md:h-full flex flex-col min-w-0 p-4 md:p-6 justify-between md:overflow-y-auto">
        {/* Mobile Header (Back, Prev, Next, Cast, Mute) */}
        <div className="flex md:hidden items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                cancel();
                onBack();
              }}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 active:bg-stone-100 dark:bg-stone-800 dark:text-stone-50"
            >
              <BackIcon />
            </button>
            <button
              type="button"
              onClick={goPrev}
              disabled={!hasPrev}
              aria-label="Previous exercise"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 disabled:opacity-30 dark:bg-stone-800 dark:text-stone-50"
            >
              <PrevIcon />
            </button>
            <motion.button
              type="button"
              onClick={goNext}
              disabled={!hasNext}
              aria-label="Next exercise"
              whileTap={hasNext && !upNextReducedMotion ? { scale: 0.9 } : undefined}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 disabled:opacity-30 dark:bg-stone-800 dark:text-stone-50"
            >
              <NextIcon />
            </motion.button>
          </div>

          <div className="flex items-center gap-1.5">
            <LanguageToggle compact />
            <HeartRateWidget onHeartRateUpdate={setHeartRate} compact />

            <motion.button
              type="button"
              onClick={() => setCameraCoachOpen(true)}
              whileTap={{ scale: 0.95 }}
              aria-label="AI Camera Rep Coach"
              title="Hands-free AI Camera Rep Tracker"
              className="flex h-10 items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 shadow-sm transition active:scale-95 hover:bg-emerald-500/25"
            >
              <CameraIcon />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden xs:inline">AI</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={onOpenCastModal}
              whileTap={{ scale: 0.95 }}
              aria-label="Cast to TV"
              title="Cast workout to Smart TV / Big Screen"
              className="flex h-10 items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 shadow-sm transition active:scale-95"
            >
              <CastIcon />
              <span className="text-[10px] font-bold uppercase tracking-wider">Cast</span>
            </motion.button>

            {supported && (
              <button
                type="button"
                onClick={() => {
                  const next = muted ? "0" : "1";
                  setMutedStr(next);
                  if (next === "1") cancel();
                }}
                aria-pressed={!muted}
                aria-label={muted ? "Unmute coaching" : "Mute coaching"}
                title={muted ? "Sound cues off" : "Sound cues on"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 dark:bg-stone-800 dark:text-stone-50"
              >
                {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
              </button>
            )}
          </div>
        </div>

        {/* Desktop Header over Video Stage */}
        <div className="hidden md:flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
              {t("exerciseCount", { current: index + 1, total: playlist.length })}
            </span>
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              {exercise.sub_category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              🎯 {exercise.targetMuscle}
            </span>
            <GearBadge equipment={exercise.equipment} />
          </div>
        </div>

        {/* Studio Video Player Container */}
        <div className="relative w-full aspect-video max-h-[280px] sm:max-h-[360px] md:max-h-none md:flex-1 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80 bg-zinc-950">
          <ExerciseLoop exercise={exercise} gender={gender} videoRef={videoRef} />
        </div>

        {/* Mobile Exercise Title Under Video */}
        <div className="md:hidden shrink-0 pt-3 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            {exercise.name}
          </h2>
          <div className="mt-1 flex items-center justify-center gap-2">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {exercise.targetMuscle}
            </p>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-600">·</span>
            <GearBadge equipment={exercise.equipment} />
          </div>
        </div>

        {/* Form Coaching Tips Drawer */}
        <div className="shrink-0 pt-3">
          <FormTipsDrawer exercise={exercise} />
        </div>
      </div>

      {/* 2. Right / Telemetry & Controls Panel */}
      <div className="shrink-0 w-full md:flex-1 md:w-[420px] lg:w-[460px] md:h-full p-4 md:p-6 flex flex-col justify-between md:border-l border-zinc-800 bg-zinc-900/40 md:backdrop-blur-xl md:overflow-y-auto space-y-4">
        {/* Desktop Controls Header */}
        <div className="hidden md:flex items-center justify-between gap-2 pb-2 border-b border-stone-200/70 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                cancel();
                onBack();
              }}
              aria-label="Back to workouts"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 text-xs font-semibold transition"
            >
              <BackIcon />
              <span>{t("exit")}</span>
            </button>
            <button
              type="button"
              onClick={goPrev}
              disabled={!hasPrev}
              aria-label="Previous"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 disabled:opacity-30 transition"
            >
              <PrevIcon />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!hasNext}
              aria-label="Next"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 disabled:opacity-30 transition"
            >
              <NextIcon />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <HeartRateWidget onHeartRateUpdate={setHeartRate} />

            <motion.button
              type="button"
              onClick={() => setCameraCoachOpen(true)}
              whileTap={{ scale: 0.95 }}
              aria-label="AI Camera Rep Coach"
              title="Hands-free AI Camera Rep Tracker"
              className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 text-xs font-bold shadow-sm transition hover:bg-emerald-500/25"
            >
              <CameraIcon />
              <span>{t("aiCoach")}</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={onOpenCastModal}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs px-3 shadow-md transition"
            >
              <CastIcon />
              <span>{t("castToTV")}</span>
            </motion.button>
            {supported && (
              <button
                type="button"
                onClick={() => {
                  const next = muted ? "0" : "1";
                  setMutedStr(next);
                  if (next === "1") cancel();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 transition"
                title={muted ? "Sound off" : "Sound on"}
              >
                {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
              </button>
            )}
          </div>
        </div>

        {/* Progress & Live Calorie Tracker */}
        <div className="shrink-0">
          <ProgressBar value={(index + 1) / Math.max(1, playlist.length)} />
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            <span>{t("exerciseCount", { current: index + 1, total: playlist.length })}</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              🔥 ~{estCalories} kcal
            </span>
          </div>
        </div>

        {/* Sets Stepper */}
        <div className="shrink-0 flex items-center justify-between p-3 rounded-2xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/50 dark:border-stone-800">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
            Set {setNumber} of {totalSets}
          </span>
          <Stepper
            label="sets"
            value={totalSets}
            onDec={() => {
              setTotalSets((s) => {
                const next = Math.max(1, s - 1);
                if (setNumber > next) setSetNumber(next);
                return next;
              });
            }}
            onInc={() => setTotalSets((s) => Math.min(10, s + 1))}
            min={totalSets <= 1}
            max={totalSets >= 10}
          />
        </div>

        {/* Timer / Reps Active Body */}
        <div className="flex-1 flex flex-col justify-center min-h-[200px]">
          {exercise.mode === "timed" ? (
            <TimedBody
              key={`${exercise.id}-${setNumber}`}
              exercise={exercise}
              active={active && phase === "exercise"}
              cues={cues}
              speak={speak}
              onSetComplete={handleSetComplete}
              setNumber={setNumber}
              totalSets={totalSets}
            />
          ) : (
            <RepsBody
              key={`${exercise.id}-${setNumber}`}
              exercise={exercise}
              onSetComplete={(repsDone) => handleSetComplete(repsDone)}
              cues={cues}
              speak={speak}
              setNumber={setNumber}
              totalSets={totalSets}
              externalRepTrigger={cameraRepTrigger}
            />
          )}
        </div>

        {/* Up-Next Exercise Strip */}
        <div className="shrink-0 pb-safe">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white dark:bg-stone-800/90 p-3 shadow-sm border border-stone-200/60 dark:border-stone-700/60">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-stone-400">
              Up Next
            </span>
            {nextExercise ? (
              <>
                <div
                  data-testid="up-next-illustration"
                  className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-stone-900 ring-1 ring-white/10"
                >
                  <video
                    src={getExerciseVideoUrl(nextExercise, gender)}
                    data-anim-id={nextExercise.id}
                    data-anim-sig={nextExercise.id}
                    autoPlay
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      v.muted = true;
                      v.play().catch(() => {});
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-stone-900 dark:text-stone-50">
                    {nextExercise.name}
                  </p>
                  <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                    {nextExercise.targetMuscle} · {nextExercise.mode === "timed" ? `${nextExercise.durationSeconds}s` : `${nextExercise.reps} reps`}
                  </p>
                </div>
              </>
            ) : (
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-500 dark:text-stone-400">
                {t("finalExerciseMsg")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Phase overlays */}
      {active && phase === "intro" && !summary && (
        <CountdownIntro
          onDone={() => setPhase("exercise")}
          onSkip={() => setPhase("exercise")}
        />
      )}
      {active && phase === "rest" && !summary && (
        <RestScreen
          initialSeconds={restSeconds}
          nextLabel={
            setNumber < totalSets
              ? `${exercise.name} · Set ${setNumber + 1}`
              : nextExercise?.name ?? t("workoutComplete")
          }
          onComplete={handleRestComplete}
          onSkip={handleRestComplete}
          onAdjustDefault={handleRestDefaultChange}
        />
      )}
      {active && summary && (
        <WorkoutSummary
          totalExercises={summary.totalExercises}
          completedSets={summary.completedSets}
          elapsedSeconds={summary.elapsedSeconds}
          caloriesBurned={summary.caloriesBurned}
          onDone={() => {
            setSummary(null);
            onBack();
          }}
          onShare={() => setShareModalOpen(true)}
        />
      )}

      {summary && (
        <WorkoutShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          stats={{
            exercises: summary.totalExercises,
            sets: summary.completedSets,
            durationSeconds: summary.elapsedSeconds,
            caloriesBurned: summary.caloriesBurned,
            firstExerciseName: playlist[0]?.name ?? "WiseBody Workout",
          }}
        />
      )}

      <CameraCoachModal
        open={cameraCoachOpen}
        onClose={() => setCameraCoachOpen(false)}
        exerciseName={exercise.name}
        targetReps={exercise.reps}
        onRepDetected={() => {
          setCameraRepTrigger((v) => v + 1);
        }}
      />
    </div>
  );
}

// ===== Spring screen-slide wrapper =====
// Used by AnimatePresence to slide the active screen in from one
// side and the previous screen out the opposite way, with a soft
// spring. Honors prefers-reduced-motion by swapping the slide for
// a near-instant fade.
function ScreenSlide({
  children,
  direction,
  reduced,
  kind = "slide",
}: {
  children: ReactNode;
  direction: 1 | -1;
  reduced: boolean;
  // "slide" = horizontal directional push/pop (used between
  // dashboard and workout). "liftFade" = soft vertical lift +
  // opacity crossfade (used between welcome and dashboard so the
  // first impression doesn't feel like a sideways shove).
  kind?: "slide" | "liftFade";
}) {
  const spring = { type: "spring" as const, stiffness: 320, damping: 34, mass: 0.9 };
  if (reduced) {
    return (
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
      >
        {children}
      </motion.div>
    );
  }
  if (kind === "liftFade") {
    // Welcome -> Dashboard lifts up and fades; Dashboard -> Welcome
    // settles back down. Direction lets us reverse cleanly.
    const enterY = direction > 0 ? 24 : -16;
    const exitY = direction > 0 ? -16 : 24;
    return (
      <motion.div
        className="absolute inset-0"
        initial={{ y: enterY, opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: exitY, opacity: 0, scale: 0.99 }}
        transition={{ ...spring, damping: 30 }}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ x: direction > 0 ? "100%" : "-100%", opacity: 0.6 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction > 0 ? "-25%" : "25%", opacity: 0 }}
      transition={spring}
    >
      {children}
    </motion.div>
  );
}

// ===== Confetti burst =====
// Lightweight celebration: ~100 colored particles fired outward on
// a <canvas> with gravity/drag and rotation, then torn down once
// the run finishes (~1.5s). Canvas is preferred over DOM nodes
// because it scales to 100+ particles without layout thrash.
// Gated by prefers-reduced-motion (renders nothing).
function ConfettiBurst({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (reduced || !active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const cx = W / 2;
    const cy = H * 0.4;
    const colors = [
      "#A8121A",
      "#F59E0B",
      "#10B981",
      "#3B82F6",
      "#EC4899",
      "#FFD89B",
      "#FFFFFF",
    ];
    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      w: number;
      h: number;
      rot: number;
      vrot: number;
      color: string;
      life: number;
    };
    const N = 110;
    const particles: P[] = Array.from({ length: N }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const speed = 280 + Math.random() * 360;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 14,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
      };
    });

    const DURATION = 1.5;
    const GRAVITY = 1100;
    const DRAG = 0.985;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      elapsed += dt;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.vx *= DRAG;
        p.vy = p.vy * DRAG + GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        p.life += dt;
        const alpha = Math.max(0, 1 - elapsed / DURATION);
        if (alpha <= 0) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
    };
  }, [active, reduced]);
  if (reduced || !active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[60] h-full w-full"
    />
  );
}

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function WorkoutSummary({
  totalExercises,
  completedSets,
  elapsedSeconds,
  caloriesBurned,
  onDone,
  onShare,
}: {
  totalExercises: number;
  completedSets: number;
  elapsedSeconds: number;
  caloriesBurned: number;
  onDone: () => void;
  onShare?: () => void;
}) {
  const { t } = useLanguage();
  const doneRef = useRef<HTMLButtonElement | null>(null);
  const reduced = useReducedMotion();
  const dismissedRef = useRef(false);
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDone();
  }, [onDone]);
  useEffect(() => {
    doneRef.current?.focus();
    audioFx.playVictoryFanfare();
  }, []);
  const stat = (delay: number) => ({
    initial: reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.92 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: reduced
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 320, damping: 22, mass: 0.8, delay },
  });
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-summary-title"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-stone-50/95 px-6 backdrop-blur-sm dark:bg-stone-950/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={dismiss}
    >
      <ConfettiBurst active />
      <motion.div
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
        initial={reduced ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 260, damping: 22, mass: 0.95 }
        }
      >
        {/* Celebratory check badge */}
        <motion.div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"
          initial={reduced ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 380, damping: 16, delay: 0.18 }
          }
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </motion.div>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          Workout complete
        </p>
        <h2
          id="workout-summary-title"
          className="mt-2 text-center text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50"
        >
          {t("greatWork")}
        </h2>
        <p className="mt-1 text-center text-sm text-stone-500 dark:text-stone-400">
          {t("summaryDesc")}
        </p>

        <dl className="mt-6 grid grid-cols-4 gap-2">
          <motion.div
            {...stat(0.22)}
            className="rounded-2xl bg-stone-100 px-2 py-3 text-center dark:bg-stone-800"
          >
            <dt className="text-[9px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Exercises
            </dt>
            <dd className="mt-1 text-xl font-bold text-stone-900 tabular-nums dark:text-stone-50">
              {totalExercises}
            </dd>
          </motion.div>
          <motion.div
            {...stat(0.28)}
            className="rounded-2xl bg-stone-100 px-2 py-3 text-center dark:bg-stone-800"
          >
            <dt className="text-[9px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Sets
            </dt>
            <dd className="mt-1 text-xl font-bold text-stone-900 tabular-nums dark:text-stone-50">
              {completedSets}
            </dd>
          </motion.div>
          <motion.div
            {...stat(0.34)}
            className="rounded-2xl bg-stone-100 px-2 py-3 text-center dark:bg-stone-800"
          >
            <dt className="text-[9px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Time
            </dt>
            <dd className="mt-1 text-xl font-bold text-stone-900 tabular-nums dark:text-stone-50">
              {formatElapsed(elapsedSeconds)}
            </dd>
          </motion.div>
          <motion.div
            {...stat(0.40)}
            className="rounded-2xl bg-amber-500/15 border border-amber-500/30 px-2 py-3 text-center"
          >
            <dt className="text-[9px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400">
              Burned
            </dt>
            <dd className="mt-1 text-xl font-black text-amber-500 tabular-nums dark:text-amber-400">
              {caloriesBurned} <span className="text-[9px]">kcal</span>
            </dd>
          </motion.div>
        </dl>

        {onShare && (
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            whileHover={reduced ? undefined : { scale: 1.015 }}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500 text-sm font-black uppercase tracking-wider text-white shadow-lg transition active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {t("shareStoryCard")}
          </motion.button>
        )}

        <motion.button
          ref={doneRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          whileHover={reduced ? undefined : { scale: 1.015 }}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-stone-900 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] dark:bg-stone-50 dark:text-stone-900"
        >
          Done
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt: () => Promise<void>;
};

function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);
  const installButtonRef = useRef<HTMLButtonElement | null>(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Already installed / running standalone — don't pester
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari exposes navigator.standalone
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem("fitvision.install.dismissedAt") || "0");
    } catch {
      /* ignore storage errors */
    }
    // Re-show at most every 7 days after dismissal
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (dismissedAt && Date.now() - dismissedAt < SEVEN_DAYS) return;

    const timers = new Set<number>();
    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!dismissedRef.current) fn();
      }, ms);
      timers.add(id);
    };

    let promptShown = false;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Dedupe: only schedule the surface once per mount
      if (promptShown) return;
      promptShown = true;
      schedule(() => setVisible(true), 1200);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari fallback: no beforeinstallprompt event support
    const ua = navigator.userAgent || "";
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos) {
      schedule(() => {
        setIosHint(true);
        setVisible(true);
      }, 1500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    };
  }, []);

  // Move focus to the primary action when surfaced; allow Escape to dismiss
  useEffect(() => {
    if (!visible) return;
    installButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismissedRef.current = true;
        setVisible(false);
        try {
          localStorage.setItem("fitvision.install.dismissedAt", String(Date.now()));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const dismiss = () => {
    dismissedRef.current = true;
    setVisible(false);
    try {
      localStorage.setItem("fitvision.install.dismissedAt", String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        setDeferred(null);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <div
      className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center px-4"
      style={{
        // Lift above the bottom navigation (60px) plus safe-area inset
        paddingBottom: "calc(max(env(safe-area-inset-bottom, 0px), 12px) + 72px)",
      }}
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-labelledby="install-prompt-title"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <polyline points="7 10 12 15 17 10" />
              <path d="M5 21h14" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="install-prompt-title"
              className="text-sm font-semibold text-stone-900 dark:text-stone-50"
            >
              Install Wise Body
            </p>
            <p className="mt-0.5 text-xs leading-snug text-stone-600 dark:text-stone-400">
              {iosHint
                ? "Tap the Share icon, then Add to Home Screen for the best experience."
                : "Add to your home screen for full-screen, offline workouts."}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Part of The Wise Cloud · fitness.thewise.cloud
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition active:scale-95 dark:text-stone-400"
          >
            Not now
          </button>
          {!iosHint && (
            <button
              ref={installButtonRef}
              type="button"
              onClick={install}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95 dark:bg-stone-50 dark:text-stone-900"
            >
              Install
            </button>
          )}
          {iosHint && (
            <button
              ref={installButtonRef}
              type="button"
              onClick={dismiss}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95 dark:bg-stone-50 dark:text-stone-900"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const GENDER_KEY = "fitvision.gender";

function readStoredGender(): Gender | null {
  try {
    const v = localStorage.getItem(GENDER_KEY);
    if (v === "man" || v === "woman") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function App() {
  const { pref: themePref, setTheme } = useTheme();
  const initialGender = readStoredGender();
  const [screen, setScreen] = useState<Screen>(
    initialGender ? "dashboard" : "welcome",
  );
  // Tracks navigation direction so screen transitions slide in the
  // correct direction (forward = next slides in from the right,
  // backward = next slides in from the left).
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  // Track which transition variant the next AnimatePresence cycle
  // should use. welcome <-> dashboard uses a vertical lift+fade
  // (gentle first impression). dashboard <-> workout uses a shared
  // horizontal directional spring so the screens feel like they
  // belong on the same horizontal stack.
  const [navKind, setNavKind] = useState<"slide" | "liftFade">("liftFade");
  const goScreen = useCallback(
    (next: Screen, dir: 1 | -1, kind: "slide" | "liftFade" = "slide") => {
      setNavDirection(dir);
      setNavKind(kind);
      setScreen(next);
    },
    [],
  );
  const reducedMotionApp = useReducedMotion();
  const [gender, setGender] = useState<Gender | null>(initialGender);
  const { history, logSession, clearHistory } = useWorkoutHistory();
  const [playlist, setPlaylist] = useState<Exercise[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const activeExercise = playlist[playlistIndex] ?? null;
  const [castModalOpen, setCastModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // attachKey re-binds cast listeners whenever the underlying video
  // element changes (exercise swap remounts <video src=...>).
  const cast = useCast(videoRef, activeExercise?.id ?? null);
  const unmountTimeoutRef = useRef<number | null>(null);

  const cancelPendingUnmount = () => {
    if (unmountTimeoutRef.current !== null) {
      window.clearTimeout(unmountTimeoutRef.current);
      unmountTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cancelPendingUnmount();
    };
  }, []);

  // Auto-clean the hidden workout layer if the cast session ends on
  // its own (TV powered off, network drop, picker cancelled) while
  // the user is already on the dashboard. Without this, the unmount
  // is gated on an explicit Stop tap from the casting pill.
  useEffect(() => {
    if (screen !== "dashboard") return;
    if (cast.state !== "idle") return;
    if (playlist.length === 0) return;
    if (unmountTimeoutRef.current !== null) return;
    unmountTimeoutRef.current = window.setTimeout(() => {
      unmountTimeoutRef.current = null;
      setPlaylist([]);
      setPlaylistIndex(0);
    }, 350);
  }, [screen, cast.state, playlist.length]);

  const handleSelectGender = (g: Gender) => {
    try {
      localStorage.setItem(GENDER_KEY, g);
    } catch {
      /* ignore */
    }
    setGender(g);
    goScreen("dashboard", 1, "liftFade");
  };

  const handleResetProfile = () => {
    try {
      localStorage.removeItem(GENDER_KEY);
    } catch {
      /* ignore */
    }
    clearHistory();
    setGender(null);
    goScreen("welcome", -1, "liftFade");
  };

  const handleSelectExercise = (nextPlaylist: Exercise[], index: number) => {
    cancelPendingUnmount();
    setPlaylist(nextPlaylist);
    setPlaylistIndex(index);
    goScreen("workout", 1, "slide");
  };

  const handleBackFromWorkout = () => {
    goScreen("dashboard", -1, "slide");
    cancelPendingUnmount();
    if (cast.state === "casting" || cast.state === "connecting") return;
    unmountTimeoutRef.current = window.setTimeout(() => {
      unmountTimeoutRef.current = null;
      setPlaylist([]);
      setPlaylistIndex(0);
    }, 350);
  };

  const handleStopCastFromDashboard = () => {
    cast.stop();
    if (screen !== "workout") {
      cancelPendingUnmount();
      unmountTimeoutRef.current = window.setTimeout(() => {
        unmountTimeoutRef.current = null;
        setPlaylist([]);
        setPlaylistIndex(0);
      }, 350);
    }
  };

  return (
    <div className={`relative mx-auto h-dvh w-full overflow-hidden bg-[#09090b] text-white transition-all duration-300 ${
      screen === "workout" ? "max-w-7xl shadow-2xl" : "max-w-md md:max-w-5xl"
    }`}>
      <AnimatePresence initial={false} mode="sync" custom={navDirection}>
        {screen === "welcome" && (
          <ScreenSlide
            key="welcome"
            direction={navDirection}
            reduced={reducedMotionApp}
            kind="liftFade"
          >
            <WelcomeScreen onSelect={handleSelectGender} />
          </ScreenSlide>
        )}
        {screen === "dashboard" && (
          <ScreenSlide
            key="dashboard"
            direction={navDirection}
            reduced={reducedMotionApp}
            kind={navKind}
          >
            <DashboardScreen
              gender={gender}
              onSelectExercise={handleSelectExercise}
              themePref={themePref}
              onThemeChange={setTheme}
              onResetProfile={handleResetProfile}
              history={history}
              onClearHistory={clearHistory}
              onOpenCastModal={() => setCastModalOpen(true)}
            />
          </ScreenSlide>
        )}
      </AnimatePresence>
      {activeExercise && playlist.length > 0 && (
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={
            reducedMotionApp
              ? { opacity: screen === "workout" ? 1 : 0 }
              : {
                  x: screen === "workout" ? "0%" : "100%",
                  opacity: screen === "workout" ? 1 : 0,
                }
          }
          transition={
            reducedMotionApp
              ? { duration: 0.12 }
              : { type: "spring", stiffness: 320, damping: 34, mass: 0.9 }
          }
          style={{
            pointerEvents: screen === "workout" ? "auto" : "none",
          }}
          aria-hidden={screen !== "workout"}
        >
          <WorkoutScreen
            playlist={playlist}
            index={playlistIndex}
            active={screen === "workout"}
            gender={gender}
            videoRef={videoRef}
            onBack={handleBackFromWorkout}
            onChangeIndex={(next) =>
              setPlaylistIndex(Math.max(0, Math.min(playlist.length - 1, next)))
            }
            onOpenCastModal={() => setCastModalOpen(true)}
            onLogSession={logSession}
          />
        </motion.div>
      )}

      {/* Casting pill */}
      {screen === "dashboard" &&
        activeExercise &&
        (cast.state === "casting" || cast.state === "connecting") && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-zinc-900 border border-zinc-700 py-2 pl-4 pr-2 text-white shadow-2xl">
              <CastingIcon />
              <span className="text-sm font-medium">
                {cast.state === "connecting"
                  ? "Connecting…"
                  : `Casting ${activeExercise.name}`}
              </span>
              <button
                type="button"
                onClick={handleStopCastFromDashboard}
                className="ml-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide active:scale-95 hover:bg-white/25"
              >
                Stop
              </button>
            </div>
          </div>
        )}

      <CastDialog
        open={castModalOpen}
        onClose={() => setCastModalOpen(false)}
        videoRef={videoRef}
        activeExerciseName={activeExercise?.name}
      />

      <InstallPrompt />
    </div>
  );
}

export default App;
