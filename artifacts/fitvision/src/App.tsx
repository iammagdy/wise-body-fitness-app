import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";


type ThemePref = "system" | "light" | "dark";
const THEME_KEY = "fitvision.theme";
const LIGHT_BG = "#fafaf9";
const DARK_BG = "#0c0a09";

function readStoredTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
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
    typeof s.firstExerciseName === "string"
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

// ===== Loop animations =====
// Files placed in /public/loops must be registered here; see
// /public/loops/README.md.
const LOOP_MANIFEST = new Set<string>([
  // Sub-category fallback loops (one per sub-category)
  "strength",
  "conditioning",
  "pregnancy-safe",
  "postpartum",
  "hormonal",
  "tech-neck",
  "foot-care",
  "tension-release",
]);

// Exercises that ship with per-gender stylized cartoon demo clips
// at /loops/<id>__man.mp4 and /loops/<id>__woman.mp4 (Task #29).
const GENDERED_LOOP_MANIFEST = new Set<string>([
  "m1",   // Push-Up
  "w4",   // Bodyweight Squat
  "b1",   // Plank Hold
  "pp1",  // Glute Bridge
  "s3",   // Reverse Lunge
  "tr1",  // Pigeon Pose
]);

function subCategorySlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function loopSourceFor(
  exercise: Exercise,
  gender: Gender | null,
): string | null {
  if (gender && GENDERED_LOOP_MANIFEST.has(exercise.id)) {
    return `loops/${exercise.id}__${gender}.mp4`;
  }
  if (LOOP_MANIFEST.has(exercise.id)) return `loops/${exercise.id}.mp4`;
  const slug = subCategorySlug(exercise.sub_category);
  if (LOOP_MANIFEST.has(slug)) return `loops/${slug}.mp4`;
  return null;
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

function LoopFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className="movement-loop h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="loop-bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#loop-bg)" />
      {children}
    </svg>
  );
}

function PushLoop() {
  // Side view of a push-up silhouette: head, body bar, arm + leg.
  // Body bar dips up/down to suggest the rep.
  return (
    <LoopFrame>
      <g className="ml-anim-breathe-soft" opacity="0.6">
        <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <g
        className="ml-anim-push"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        {/* head */}
        <circle cx="50" cy="108" r="8" fill="currentColor" stroke="none" />
        {/* torso */}
        <line x1="58" y1="112" x2="148" y2="118" />
        {/* arm */}
        <line x1="68" y1="114" x2="80" y2="148" />
        {/* leg */}
        <line x1="148" y1="118" x2="170" y2="148" />
      </g>
      {/* floor */}
      <line
        x1="30"
        y1="156"
        x2="180"
        y2="156"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        strokeDasharray="3 5"
      />
    </LoopFrame>
  );
}

function SquatLoop() {
  // Front silhouette compressing/expanding vertically.
  return (
    <LoopFrame>
      <g className="ml-anim-breathe-soft" opacity="0.55">
        <circle cx="100" cy="110" r="62" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <g
        className="ml-anim-squat"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* head */}
        <circle cx="100" cy="58" r="9" fill="currentColor" stroke="none" />
        {/* torso */}
        <line x1="100" y1="68" x2="100" y2="108" />
        {/* arms forward */}
        <path d="M100 78 L78 96 M100 78 L122 96" />
        {/* legs bent */}
        <path d="M100 108 L82 132 L82 154" />
        <path d="M100 108 L118 132 L118 154" />
      </g>
      <line
        x1="30"
        y1="160"
        x2="180"
        y2="160"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        strokeDasharray="3 5"
      />
    </LoopFrame>
  );
}

function StretchLoop() {
  // Standing figure with one arm sweeping overhead, gentle sway.
  return (
    <LoopFrame>
      <g className="ml-anim-breathe-soft" opacity="0.55">
        <circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <g className="ml-anim-sway" style={{ transformOrigin: "100px 150px" }}>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* head */}
          <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
          {/* torso */}
          <line x1="100" y1="60" x2="100" y2="120" />
          {/* legs */}
          <path d="M100 120 L88 156" />
          <path d="M100 120 L112 156" />
        </g>
        {/* sweeping arm */}
        <g
          className="ml-anim-arm"
          style={{ transformOrigin: "100px 76px" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        >
          <line x1="100" y1="76" x2="100" y2="36" />
        </g>
        {/* opposite arm hanging */}
        <line
          x1="100"
          y1="76"
          x2="118"
          y2="110"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <line
        x1="30"
        y1="160"
        x2="180"
        y2="160"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        strokeDasharray="3 5"
      />
    </LoopFrame>
  );
}

function BreathingLoop() {
  // Slow nested rings + soft rising trails.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <g className="ml-anim-breathe">
          <circle cx="100" cy="100" r="32" />
        </g>
        <g className="ml-anim-breathe ml-delay-1" opacity="0.6">
          <circle cx="100" cy="100" r="50" />
        </g>
        <g className="ml-anim-breathe ml-delay-2" opacity="0.35">
          <circle cx="100" cy="100" r="70" />
        </g>
      </g>
      <g fill="currentColor">
        <g className="ml-anim-trail">
          <circle cx="80" cy="120" r="2.5" />
        </g>
        <g className="ml-anim-trail ml-delay-1">
          <circle cx="100" cy="120" r="2.5" />
        </g>
        <g className="ml-anim-trail ml-delay-2">
          <circle cx="120" cy="120" r="2.5" />
        </g>
      </g>
      <circle cx="100" cy="100" r="4" fill="currentColor" />
    </LoopFrame>
  );
}

// ===== Per-exercise illustrations =====
// All SVGs share the same 200x200 viewBox, line weight 6, and head r ~9
// so the workout screen feels like one design system.

function FloorLine() {
  return (
    <line
      x1="20"
      y1="160"
      x2="180"
      y2="160"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.3"
      strokeDasharray="3 5"
    />
  );
}

function WallLine() {
  return (
    <line
      x1="40"
      y1="20"
      x2="40"
      y2="170"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.3"
      strokeDasharray="3 5"
    />
  );
}

function PlankIllustration() {
  // Side plank-on-toes silhouette with subtle isometric pulse.
  return (
    <LoopFrame>
      <g className="ml-anim-pulse">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="50" cy="108" r="9" fill="currentColor" stroke="none" />
          <line x1="60" y1="112" x2="160" y2="124" />
          <line x1="68" y1="114" x2="80" y2="148" />
          <line x1="160" y1="124" x2="174" y2="148" />
        </g>
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function PushUpIllustration() {
  return (
    <LoopFrame>
      <g
        className="ml-anim-push"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <circle cx="50" cy="108" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="112" x2="160" y2="120" />
        <line x1="68" y1="114" x2="80" y2="148" />
        <line x1="160" y1="120" x2="172" y2="148" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function PikePushUpIllustration() {
  // Inverted-V silhouette, head dips toward ground.
  return (
    <LoopFrame>
      <g
        className="ml-anim-push"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* hips at apex */}
        <line x1="50" y1="148" x2="100" y2="60" />
        <line x1="100" y1="60" x2="150" y2="148" />
        {/* head hanging down from apex */}
        <circle cx="100" cy="80" r="9" fill="currentColor" stroke="none" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function WallPushUpIllustration() {
  // Standing figure leaning into a vertical wall.
  return (
    <LoopFrame>
      <WallLine />
      <g
        className="ml-anim-push"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="60" cy="60" r="9" fill="currentColor" stroke="none" />
        {/* torso */}
        <line x1="60" y1="69" x2="120" y2="120" />
        {/* arms forward to wall */}
        <line x1="60" y1="72" x2="40" y2="76" />
        <line x1="68" y1="78" x2="40" y2="100" />
        {/* legs back */}
        <line x1="120" y1="120" x2="160" y2="160" />
        <line x1="118" y1="120" x2="140" y2="160" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function MountainClimberIllustration() {
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="108" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="112" x2="155" y2="122" />
        {/* arm */}
        <line x1="68" y1="114" x2="80" y2="148" />
      </g>
      {/* alternating legs */}
      <g
        className="ml-anim-knee-l"
        style={{ transformOrigin: "155px 122px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="155" y1="122" x2="170" y2="148" />
      </g>
      <g
        className="ml-anim-knee-r"
        style={{ transformOrigin: "155px 122px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="155" y1="122" x2="120" y2="118" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function BurpeeIllustration() {
  // Vertical stack: stand → squat → plank, animated by squashing.
  return (
    <LoopFrame>
      <g
        className="ml-anim-burpee"
        style={{ transformOrigin: "100px 158px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="110" />
        <line x1="100" y1="78" x2="80" y2="62" />
        <line x1="100" y1="78" x2="120" y2="62" />
        <line x1="100" y1="110" x2="84" y2="158" />
        <line x1="100" y1="110" x2="116" y2="158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function JumpIllustration() {
  return (
    <LoopFrame>
      <g
        className="ml-anim-jump"
        style={{ transformOrigin: "100px 160px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="56" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="66" x2="100" y2="116" />
        {/* arms swinging up */}
        <line x1="100" y1="80" x2="78" y2="62" />
        <line x1="100" y1="80" x2="122" y2="62" />
        {/* legs tucked */}
        <line x1="100" y1="116" x2="86" y2="148" />
        <line x1="100" y1="116" x2="114" y2="148" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function BearCrawlIllustration() {
  // Quadruped with subtle alternating limb fade.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="56" cy="100" r="9" fill="currentColor" stroke="none" />
        <line x1="64" y1="104" x2="148" y2="110" />
      </g>
      {/* front-left + back-right (in phase) */}
      <g
        className="ml-anim-fade-step"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="76" y1="106" x2="72" y2="148" />
        <line x1="148" y1="110" x2="160" y2="148" />
      </g>
      {/* front-right + back-left (out of phase) */}
      <g
        className="ml-anim-fade-step ml-delay-half"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="84" y1="108" x2="92" y2="148" />
        <line x1="138" y1="110" x2="132" y2="148" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function HighKneesIllustration() {
  // Standing front view with alternating knee lifts.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="110" />
        {/* arms bent at sides */}
        <path d="M100 78 L82 92 L86 110" />
        <path d="M100 78 L118 92 L114 110" />
      </g>
      {/* alternating legs */}
      <g
        className="ml-anim-knee-l"
        style={{ transformOrigin: "100px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M100 110 L86 134 L92 158" />
      </g>
      <g
        className="ml-anim-knee-r"
        style={{ transformOrigin: "100px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M100 110 L114 134 L108 158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function BirdDogIllustration() {
  // Quadruped extending opposite arm + leg.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="60" cy="98" r="9" fill="currentColor" stroke="none" />
        <line x1="68" y1="102" x2="148" y2="110" />
        {/* support: opposite arm + leg planted */}
        <line x1="78" y1="104" x2="84" y2="148" />
        <line x1="148" y1="110" x2="146" y2="148" />
      </g>
      {/* extended arm forward */}
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "78px 104px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="78" y1="104" x2="40" y2="92" />
      </g>
      {/* extended leg back */}
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "148px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="148" y1="110" x2="186" y2="100" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function DeadBugIllustration() {
  // Supine figure, opposite arm+leg lowered.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="138" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="138" x2="150" y2="138" />
      </g>
      {/* arms pointing up */}
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "80px 138px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="80" y1="138" x2="80" y2="92" />
      </g>
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "120px 138px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="120" y1="138" x2="120" y2="92" />
      </g>
      {/* legs bent up */}
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "150px 138px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M150 138 L160 110 L150 90" />
      </g>
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "150px 138px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M150 138 L172 116 L168 92" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function GluteBridgeIllustration() {
  return (
    <LoopFrame>
      <g
        className="ml-anim-bridge"
        style={{ transformOrigin: "100px 140px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="146" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="142" x2="120" y2="118" />
        <path d="M120 118 L140 142 L154 154" />
        {/* arms by sides */}
        <line x1="62" y1="142" x2="80" y2="156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SquatIllustration() {
  return (
    <LoopFrame>
      <g
        className="ml-anim-squat"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="56" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="66" x2="100" y2="106" />
        <path d="M100 76 L80 94 M100 76 L120 94" />
        <path d="M100 106 L82 130 L82 156" />
        <path d="M100 106 L118 130 L118 156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SplitSquatIllustration() {
  // Side view lunge with subtle vertical bob.
  return (
    <LoopFrame>
      <g
        className="ml-anim-squat"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="106" />
        {/* arms */}
        <line x1="100" y1="74" x2="86" y2="100" />
        <line x1="100" y1="74" x2="114" y2="100" />
        {/* front leg bent */}
        <path d="M100 106 L70 130 L70 156" />
        {/* back leg extended */}
        <path d="M100 106 L138 138 L150 156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function CatCowIllustration() {
  // Quadruped with spine arching up and down.
  return (
    <LoopFrame>
      <g
        className="ml-anim-arch"
        style={{ transformOrigin: "100px 120px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="116" r="9" fill="currentColor" stroke="none" />
        {/* arched spine */}
        <path d="M58 116 Q100 86 150 118" />
        {/* arms */}
        <line x1="62" y1="120" x2="68" y2="156" />
        {/* legs */}
        <line x1="148" y1="120" x2="154" y2="156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function HeldStretchIllustration() {
  // Forward fold silhouette with breathing pulse — used for forward
  // folds, child's pose, seated stretches.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="120" r="9" fill="currentColor" stroke="none" />
        {/* folded torso */}
        <path d="M100 120 Q92 100 96 70" />
        {/* arms reaching toward feet */}
        <path d="M96 100 L82 132" />
        <path d="M96 100 L116 132" />
        {/* legs straight */}
        <line x1="96" y1="70" x2="60" y2="60" />
        <line x1="96" y1="70" x2="156" y2="62" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function ChildsPoseIllustration() {
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* hips high, torso forward to floor */}
        <path d="M150 120 Q120 130 60 142" />
        <circle cx="50" cy="146" r="9" fill="currentColor" stroke="none" />
        {/* arms outstretched on floor */}
        <line x1="60" y1="146" x2="36" y2="156" />
        {/* shins on floor */}
        <line x1="150" y1="120" x2="150" y2="156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function PigeonIllustration() {
  // Front leg bent across, back leg extended — simplified.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="64" cy="84" r="9" fill="currentColor" stroke="none" />
        {/* torso leaning forward over front leg */}
        <line x1="70" y1="92" x2="100" y2="120" />
        {/* arms forward */}
        <line x1="74" y1="96" x2="60" y2="124" />
        <line x1="80" y1="100" x2="84" y2="130" />
        {/* front shin across */}
        <path d="M100 120 L60 138 L46 150" />
        {/* back leg extended */}
        <line x1="100" y1="120" x2="172" y2="146" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function BoxBreathingIllustration() {
  // Square with a glowing dot tracing each side in 4 steps.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="60" y="60" width="80" height="80" rx="6" opacity="0.5" />
      </g>
      <g fill="currentColor">
        <g className="ml-anim-fade-step">
          <circle cx="60" cy="60" r="5" />
        </g>
        <g className="ml-anim-fade-step ml-delay-1">
          <circle cx="140" cy="60" r="5" />
        </g>
        <g className="ml-anim-fade-step ml-delay-2">
          <circle cx="140" cy="140" r="5" />
        </g>
        <g className="ml-anim-fade-step ml-delay-3">
          <circle cx="60" cy="140" r="5" />
        </g>
      </g>
      <text
        x="100"
        y="106"
        textAnchor="middle"
        fontSize="11"
        fill="currentColor"
        opacity="0.6"
        fontFamily="ui-sans-serif, system-ui"
      >
        4 · 4 · 4 · 4
      </text>
    </LoopFrame>
  );
}

function NostrilBreathingIllustration() {
  // Face profile with alternating left/right glow over the nostrils.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* head profile */}
        <circle cx="100" cy="100" r="50" />
        {/* nose ridge */}
        <path d="M100 86 L100 114" />
      </g>
      <g fill="currentColor">
        <g className="ml-anim-fade-step">
          <circle cx="92" cy="118" r="4" />
        </g>
        <g className="ml-anim-fade-step ml-delay-half">
          <circle cx="108" cy="118" r="4" />
        </g>
      </g>
    </LoopFrame>
  );
}

function NeckRollIllustration() {
  // Standing upper body with head rotating side to side.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* shoulders + spine */}
        <line x1="100" y1="100" x2="100" y2="160" />
        <line x1="60" y1="100" x2="140" y2="100" />
      </g>
      <g
        className="ml-anim-head-roll"
        style={{ transformOrigin: "100px 100px" }}
      >
        <circle cx="100" cy="76" r="14" fill="currentColor" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function ChinTuckIllustration() {
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="100" y1="110" x2="100" y2="170" />
        <line x1="60" y1="110" x2="140" y2="110" />
      </g>
      <g
        className="ml-anim-push"
        style={{ transformOrigin: "100px 100px" }}
      >
        <circle cx="100" cy="84" r="14" fill="currentColor" />
        {/* "tuck" arrow */}
        <path
          d="M124 84 L114 84 M118 80 L114 84 L118 88"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function WallAngelsIllustration() {
  // Back-against-wall figure with arms sliding up.
  return (
    <LoopFrame>
      <WallLine />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="60" cy="60" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="69" x2="60" y2="140" />
        {/* legs */}
        <line x1="60" y1="140" x2="80" y2="160" />
        <line x1="60" y1="140" x2="46" y2="160" />
      </g>
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "60px 80px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M60 80 L100 70 L130 50" />
      </g>
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "60px 80px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M60 80 L100 100 L130 120" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function FootCircleIllustration() {
  // Foot in profile with rotating motion at the ankle.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* shin */}
        <line x1="100" y1="40" x2="100" y2="110" />
      </g>
      <g
        className="ml-anim-foot-flex"
        style={{ transformOrigin: "100px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* foot */}
        <path d="M100 110 L100 130 L150 140 L150 150 L100 150 Z" />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        opacity="0.45"
      >
        <circle cx="120" cy="130" r="20" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function FootArchIllustration() {
  // Foot footprint with a glowing pulse over the arch.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* foot outline (top-down) */}
        <path d="M80 50 Q60 100 70 150 Q90 162 110 150 Q140 100 120 50 Z" />
        {/* toes */}
        <circle cx="84" cy="44" r="5" fill="currentColor" stroke="none" />
        <circle cx="96" cy="40" r="5" fill="currentColor" stroke="none" />
        <circle cx="108" cy="42" r="5" fill="currentColor" stroke="none" />
        <circle cx="118" cy="46" r="4" fill="currentColor" stroke="none" />
      </g>
      <g className="ml-anim-breathe" fill="currentColor" opacity="0.45">
        <ellipse cx="92" cy="110" rx="14" ry="22" />
      </g>
    </LoopFrame>
  );
}

function CalfStretchIllustration() {
  // Lunge against a wall, back leg straight (calf stretch).
  return (
    <LoopFrame>
      <WallLine />
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="80" cy="58" r="9" fill="currentColor" stroke="none" />
        <line x1="80" y1="68" x2="120" y2="120" />
        {/* arms to wall */}
        <line x1="84" y1="74" x2="40" y2="86" />
        <line x1="92" y1="86" x2="40" y2="106" />
        {/* front leg bent (forward) */}
        <path d="M120 120 L96 138 L96 156" />
        {/* back leg straight (calf) */}
        <line x1="120" y1="120" x2="170" y2="158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function StandingHoldIllustration() {
  // Generic standing held pose with subtle pulse — used for warriors,
  // wall sit, modified plank-style holds.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="116" />
        <line x1="100" y1="74" x2="78" y2="64" />
        <line x1="100" y1="74" x2="122" y2="64" />
        <path d="M100 116 L80 140 L80 158" />
        <path d="M100 116 L120 140 L120 158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SeatedTwistIllustration() {
  // Seated figure with rotating torso.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* legs forward, hips at center */}
        <path d="M100 130 L60 138 L40 130" />
        <line x1="100" y1="130" x2="156" y2="138" />
      </g>
      <g
        className="ml-anim-sway"
        style={{ transformOrigin: "100px 130px" }}
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="100" cy="60" r="9" fill="currentColor" stroke="none" />
          <line x1="100" y1="70" x2="100" y2="124" />
          <line x1="100" y1="80" x2="74" y2="100" />
          <line x1="100" y1="80" x2="128" y2="92" />
        </g>
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function WalkIllustration() {
  // Side view of walking figure — used for cortisol-reset walk, heel walks.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="44" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="54" x2="100" y2="110" />
      </g>
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "100px 70px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="100" y1="70" x2="120" y2="100" />
      </g>
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "100px 70px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="100" y1="70" x2="80" y2="100" />
      </g>
      <g
        className="ml-anim-knee-l"
        style={{ transformOrigin: "100px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M100 110 L86 134 L92 158" />
      </g>
      <g
        className="ml-anim-knee-r"
        style={{ transformOrigin: "100px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M100 110 L114 134 L108 158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function LegsUpWallIllustration() {
  return (
    <LoopFrame>
      <WallLine />
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* legs vertical against wall */}
        <line x1="48" y1="40" x2="48" y2="140" />
        <line x1="60" y1="40" x2="60" y2="140" />
        {/* hips */}
        <path d="M48 140 L88 150" />
        <path d="M60 140 L88 150" />
        {/* torso on floor */}
        <line x1="88" y1="150" x2="160" y2="150" />
        {/* head */}
        <circle cx="170" cy="150" r="9" fill="currentColor" stroke="none" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function HipCircleIllustration() {
  // Standing figure with hips drawing a circle.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="48" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="58" x2="100" y2="100" />
        <line x1="100" y1="74" x2="80" y2="92" />
        <line x1="100" y1="74" x2="120" y2="92" />
      </g>
      <g
        className="ml-anim-sway"
        style={{ transformOrigin: "100px 100px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="100" y1="100" x2="80" y2="156" />
        <line x1="100" y1="100" x2="120" y2="156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

// ===== Additional per-exercise illustrations (Task #24) =====
// Each component below gives a previously-shared exercise its own loop while
// staying inside the 200×200 viewBox / strokeWidth 6 / currentColor system.
// Animations reuse the existing CSS keyframes so prefers-reduced-motion is
// still honoured.

function DoorwayRowIllustration() {
  // Standing figure pulling elbows back as if rowing toward a door frame.
  return (
    <LoopFrame>
      {/* door frame */}
      <line x1="40" y1="20" x2="40" y2="170" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <line x1="40" y1="20" x2="60" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="120" cy="56" r="9" fill="currentColor" stroke="none" />
        <line x1="120" y1="66" x2="120" y2="120" />
        <line x1="120" y1="120" x2="100" y2="158" />
        <line x1="120" y1="120" x2="140" y2="158" />
      </g>
      {/* rowing arms pulled back */}
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "120px 80px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M120 80 L88 88 L52 78" />
      </g>
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "120px 88px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M120 88 L88 96 L52 88" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SupermanHoldIllustration() {
  // Prone figure with arms forward and legs lifted into a gentle arch.
  return (
    <LoopFrame>
      <g
        className="ml-anim-arch"
        style={{ transformOrigin: "100px 120px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="40" cy="100" r="9" fill="currentColor" stroke="none" />
        {/* arched torso */}
        <path d="M48 102 Q100 86 152 110" />
        {/* arms forward */}
        <line x1="44" y1="98" x2="20" y2="86" />
        {/* lifted legs */}
        <path d="M152 110 Q170 100 184 84" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function ReverseLungeIllustration() {
  // Side view lunge — front leg vertical, back leg stepping behind.
  return (
    <LoopFrame>
      <g
        className="ml-anim-squat"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="80" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="80" y1="60" x2="80" y2="106" />
        <line x1="80" y1="74" x2="64" y2="100" />
        <line x1="80" y1="74" x2="96" y2="100" />
        {/* front leg straight down */}
        <line x1="80" y1="106" x2="80" y2="156" />
        {/* back leg sweeping back, bent knee */}
        <path d="M80 106 L132 132 L150 156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function PikeShoulderTapIllustration() {
  // Inverted V hold with one arm tapping the opposite shoulder.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="60" y1="148" x2="100" y2="60" />
        <line x1="100" y1="60" x2="140" y2="148" />
        <circle cx="100" cy="80" r="9" fill="currentColor" stroke="none" />
      </g>
      {/* tapping arm */}
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "100px 80px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M100 80 L80 100 L120 110" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function JumpRopeIllustration() {
  // Standing figure with a rope arc that spins through the loop.
  return (
    <LoopFrame>
      <g
        className="ml-anim-jump"
        style={{ transformOrigin: "100px 158px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="56" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="66" x2="100" y2="120" />
        {/* arms tucked, holding rope handles */}
        <line x1="100" y1="80" x2="76" y2="100" />
        <line x1="100" y1="80" x2="124" y2="100" />
        <line x1="100" y1="120" x2="88" y2="150" />
        <line x1="100" y1="120" x2="112" y2="150" />
      </g>
      {/* rope arcs alternating to suggest rotation */}
      <g
        className="ml-anim-fade-step"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.7"
      >
        <path d="M76 100 Q100 30 124 100" />
      </g>
      <g
        className="ml-anim-fade-step ml-delay-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.7"
      >
        <path d="M76 100 Q100 170 124 100" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function HipHingeIllustration() {
  // Side-view forward hinge at the hips, knees soft, arms hanging.
  return (
    <LoopFrame>
      <g
        className="ml-anim-arch"
        style={{ transformOrigin: "100px 120px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="80" r="9" fill="currentColor" stroke="none" />
        {/* hinged torso */}
        <line x1="58" y1="86" x2="120" y2="120" />
        {/* arms hanging */}
        <line x1="84" y1="100" x2="80" y2="140" />
        {/* legs slightly bent */}
        <path d="M120 120 L110 156" />
        <path d="M120 120 L132 156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function TuckJumpIllustration() {
  // Vertical jump with knees pulled high to chest.
  return (
    <LoopFrame>
      <g
        className="ml-anim-jump"
        style={{ transformOrigin: "100px 160px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="100" />
        {/* arms reaching down to wrap knees */}
        <path d="M100 78 L80 110 L100 120" />
        <path d="M100 78 L120 110 L100 120" />
        {/* tucked legs */}
        <path d="M100 100 L78 110 L96 138" />
        <path d="M100 100 L122 110 L104 138" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function PlankShoulderTapIllustration() {
  // Plank with one arm lifted to tap opposite shoulder.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="108" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="112" x2="160" y2="124" />
        {/* support arm */}
        <line x1="68" y1="114" x2="80" y2="148" />
        {/* legs */}
        <line x1="160" y1="124" x2="174" y2="148" />
        <line x1="150" y1="124" x2="156" y2="148" />
      </g>
      {/* tapping arm crossing to shoulder */}
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "100px 116px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M100 116 L88 100 L70 116" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function BicycleCrunchIllustration() {
  // Supine alternating-knee bicycle pedalling.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="138" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="138" x2="140" y2="138" />
      </g>
      {/* hands clasped behind head */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M60 138 L48 122 L62 116" />
      </g>
      {/* alternating bent legs (pedal) */}
      <g
        className="ml-anim-knee-l"
        style={{ transformOrigin: "140px 138px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M140 138 L156 110 L182 100" />
      </g>
      <g
        className="ml-anim-knee-r"
        style={{ transformOrigin: "140px 138px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M140 138 L168 124 L186 138" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SideLyingLegRaiseIllustration() {
  // Figure on side, top leg sweeping up.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="130" r="9" fill="currentColor" stroke="none" />
        {/* torso lying on side */}
        <line x1="60" y1="134" x2="120" y2="142" />
        {/* support arm under head */}
        <path d="M50 122 L60 110 L74 116" />
        {/* hand on hip */}
        <line x1="100" y1="138" x2="108" y2="124" />
        {/* bottom leg on floor */}
        <line x1="120" y1="146" x2="180" y2="150" />
      </g>
      {/* top leg lifting */}
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "120px 142px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="120" y1="142" x2="180" y2="120" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function PelvicTiltIllustration() {
  // Quadruped tilting pelvis under (posterior tilt) gently.
  return (
    <LoopFrame>
      <g
        className="ml-anim-arch"
        style={{ transformOrigin: "100px 120px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="120" r="9" fill="currentColor" stroke="none" />
        <path d="M58 120 Q100 110 150 124" />
        {/* arms */}
        <line x1="62" y1="124" x2="68" y2="156" />
        {/* legs */}
        <line x1="148" y1="124" x2="154" y2="156" />
      </g>
      {/* arc arrow under pelvis */}
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" strokeLinecap="round">
        <path d="M134 138 Q150 150 166 138" />
        <path d="M162 134 L166 138 L162 142" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function TowelCurlIllustration() {
  // Seated bicep curl — forearm lifts toward shoulder.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="80" cy="60" r="9" fill="currentColor" stroke="none" />
        <line x1="80" y1="70" x2="80" y2="118" />
        {/* hips on chair */}
        <line x1="60" y1="118" x2="120" y2="118" />
        {/* legs forward off chair */}
        <line x1="120" y1="118" x2="160" y2="140" />
        <line x1="160" y1="140" x2="160" y2="160" />
        <line x1="60" y1="118" x2="60" y2="160" />
        {/* upper arm down */}
        <line x1="80" y1="80" x2="80" y2="110" />
      </g>
      {/* curling forearm + towel handle */}
      <g
        className="ml-anim-arm"
        style={{ transformOrigin: "80px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="80" y1="110" x2="120" y2="86" />
        <line x1="116" y1="80" x2="124" y2="92" stroke="currentColor" strokeWidth="3" opacity="0.6" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function CalfRaiseIllustration() {
  // Standing figure rising onto toes (subtle vertical lift).
  return (
    <LoopFrame>
      <g
        className="ml-anim-bridge"
        style={{ transformOrigin: "100px 156px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="40" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="50" x2="100" y2="110" />
        <line x1="100" y1="64" x2="80" y2="100" />
        <line x1="100" y1="64" x2="120" y2="100" />
        <line x1="100" y1="110" x2="86" y2="150" />
        <line x1="100" y1="110" x2="114" y2="150" />
        {/* feet on toes */}
        <path d="M86 150 L80 156 L96 156" />
        <path d="M114 150 L104 156 L120 156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SidePlankIllustration() {
  // Side-supported plank with hips lifted.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="80" r="9" fill="currentColor" stroke="none" />
        {/* diagonal body */}
        <line x1="58" y1="86" x2="170" y2="150" />
        {/* support forearm */}
        <line x1="50" y1="90" x2="40" y2="156" />
        {/* top arm reaching up */}
        <line x1="100" y1="116" x2="100" y2="60" />
        {/* feet stacked */}
        <line x1="170" y1="150" x2="184" y2="156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function PelvicRockIllustration() {
  // Standing figure rocking pelvis forward/back via gentle sway.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="48" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="58" x2="100" y2="100" />
        {/* hands on hips */}
        <path d="M100 80 L82 96 L86 110" />
        <path d="M100 80 L118 96 L114 110" />
      </g>
      {/* hips + legs rocking */}
      <g
        className="ml-anim-sway"
        style={{ transformOrigin: "100px 100px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="100" y1="100" x2="86" y2="156" />
        <line x1="100" y1="100" x2="114" y2="156" />
        {/* pelvic indicator arc */}
        <path d="M82 110 Q100 130 118 110" stroke="currentColor" strokeWidth="2" opacity="0.45" fill="none" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function PrenatalSquatIllustration() {
  // Wide-stance held squat with rounded belly indicator.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="110" />
        {/* belly */}
        <path d="M100 78 Q124 92 100 110" stroke="currentColor" strokeWidth="3" opacity="0.55" fill="none" />
        {/* hands at chest in prayer */}
        <path d="M100 76 L84 86" />
        <path d="M100 76 L116 86" />
        {/* wide bent legs */}
        <path d="M100 110 L60 140 L48 158" />
        <path d="M100 110 L140 140 L152 158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function HeelSlideIllustration() {
  // Supine knee bent, heel sliding along floor.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="138" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="138" x2="120" y2="138" />
        {/* straight leg */}
        <line x1="120" y1="138" x2="180" y2="142" />
      </g>
      {/* sliding bent leg with motion arrow */}
      <g
        className="ml-anim-knee-l"
        style={{ transformOrigin: "120px 138px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M120 138 L150 110 L150 142" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" strokeLinecap="round">
        <path d="M156 154 L172 150" />
        <path d="M168 146 L172 150 L168 154" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function StandingPelvicTiltIllustration() {
  // Standing figure tucking pelvis under (subtle hinge with arrow).
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="116" />
        <path d="M100 76 L82 96 L86 110" />
        <path d="M100 76 L118 96 L114 110" />
        <line x1="100" y1="116" x2="86" y2="156" />
        <line x1="100" y1="116" x2="114" y2="156" />
      </g>
      {/* tilt arc indicator at pelvis */}
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" strokeLinecap="round">
        <path d="M82 122 Q100 136 118 122" />
        <path d="M114 118 L118 122 L114 126" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SeatedMarchIllustration() {
  // Seated on chair, alternating knees lifting.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="60" cy="60" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="70" x2="60" y2="120" />
        {/* hips on chair */}
        <line x1="50" y1="120" x2="110" y2="120" />
        {/* chair seat + back */}
        <line x1="40" y1="118" x2="40" y2="60" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <line x1="40" y1="158" x2="120" y2="158" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        {/* arms by sides */}
        <line x1="60" y1="80" x2="50" y2="116" />
      </g>
      {/* alternating knees */}
      <g
        className="ml-anim-knee-l"
        style={{ transformOrigin: "110px 120px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M110 120 L130 100 L150 124" />
      </g>
      <g
        className="ml-anim-knee-r"
        style={{ transformOrigin: "110px 120px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M110 120 L140 140 L156 158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function DonkeyKickIllustration() {
  // Standing figure with one leg sweeping back into a kick.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="80" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="80" y1="60" x2="80" y2="110" />
        {/* arms forward holding wall */}
        <line x1="80" y1="74" x2="50" y2="90" />
        <line x1="80" y1="74" x2="50" y2="104" />
        {/* support leg */}
        <line x1="80" y1="110" x2="80" y2="156" />
      </g>
      {/* kicking back leg */}
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "80px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M80 110 L130 110 L168 86" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function YogaFlowIllustration() {
  // Standing figure flowing through arm sweep with lingering trails.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="120" />
        <line x1="100" y1="120" x2="86" y2="156" />
        <line x1="100" y1="120" x2="114" y2="156" />
      </g>
      <g
        className="ml-anim-arm"
        style={{ transformOrigin: "100px 76px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="100" y1="76" x2="100" y2="30" />
      </g>
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "100px 76px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="100" y1="76" x2="60" y2="100" />
      </g>
      {/* trailing breath dots */}
      <g fill="currentColor">
        <g className="ml-anim-trail">
          <circle cx="140" cy="100" r="2.5" />
        </g>
        <g className="ml-anim-trail ml-delay-2">
          <circle cx="150" cy="84" r="2.5" />
        </g>
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function CortisolWalkIllustration() {
  // Walking silhouette with sun + tree to evoke an outdoor reset walk.
  return (
    <LoopFrame>
      {/* sun */}
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45">
        <circle cx="160" cy="44" r="14" />
        <line x1="160" y1="22" x2="160" y2="14" />
        <line x1="160" y1="74" x2="160" y2="66" />
        <line x1="138" y1="44" x2="130" y2="44" />
        <line x1="190" y1="44" x2="182" y2="44" />
      </g>
      {/* tree */}
      <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45">
        <line x1="40" y1="156" x2="40" y2="120" />
        <circle cx="40" cy="110" r="14" />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="60" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="70" x2="100" y2="118" />
      </g>
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "100px 84px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="100" y1="84" x2="118" y2="112" />
      </g>
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "100px 84px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="100" y1="84" x2="82" y2="112" />
      </g>
      <g
        className="ml-anim-knee-l"
        style={{ transformOrigin: "100px 118px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M100 118 L88 138 L96 156" />
      </g>
      <g
        className="ml-anim-knee-r"
        style={{ transformOrigin: "100px 118px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M100 118 L114 138 L106 156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function YinStretchIllustration() {
  // Long-held seated wide-leg fold with very slow breath pulse.
  return (
    <LoopFrame>
      <g
        className="ml-anim-breathe-soft"
        opacity="0.55"
      >
        <circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </g>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="120" r="9" fill="currentColor" stroke="none" />
        {/* slightly folded torso */}
        <path d="M100 120 Q98 106 102 90" />
        {/* arms reaching forward to floor */}
        <line x1="100" y1="106" x2="80" y2="130" />
        <line x1="100" y1="106" x2="120" y2="130" />
        {/* wide legs in V */}
        <line x1="102" y1="90" x2="40" y2="142" />
        <line x1="102" y1="90" x2="164" y2="142" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SupportedBridgeIllustration() {
  // Glute bridge with a block beneath the pelvis (held).
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="146" r="9" fill="currentColor" stroke="none" />
        <line x1="60" y1="142" x2="120" y2="120" />
        <path d="M120 120 L140 142 L154 154" />
        <line x1="62" y1="142" x2="80" y2="156" />
      </g>
      {/* block under hips */}
      <rect x="106" y="130" width="36" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.6" />
      <FloorLine />
    </LoopFrame>
  );
}

function GoddessPoseIllustration() {
  // Wide squat with arms in cactus shape.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="110" />
        {/* cactus arms */}
        <path d="M100 72 L60 72 L60 40" />
        <path d="M100 72 L140 72 L140 40" />
        {/* very wide bent legs */}
        <path d="M100 110 L48 132 L34 158" />
        <path d="M100 110 L152 132 L166 158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function ReclinedButterflyIllustration() {
  // Lying on back, soles together, knees out wide.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="40" cy="120" r="9" fill="currentColor" stroke="none" />
        {/* torso */}
        <line x1="50" y1="120" x2="120" y2="120" />
        {/* arms relaxed */}
        <line x1="70" y1="120" x2="70" y2="148" />
        <line x1="100" y1="120" x2="100" y2="148" />
        {/* butterfly legs out then meeting */}
        <path d="M120 120 L150 80 L170 120" />
        <path d="M120 120 L150 160 L170 120" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function UpperTrapStretchIllustration() {
  // Head tilted to side, hand pulling head down.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="100" y1="110" x2="100" y2="170" />
        <line x1="60" y1="110" x2="140" y2="110" />
      </g>
      <g
        className="ml-anim-sway"
        style={{ transformOrigin: "100px 110px" }}
      >
        <circle cx="86" cy="70" r="14" fill="currentColor" />
        {/* hand reaching over head */}
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        >
          <path d="M86 70 L120 50 L138 80" />
        </g>
      </g>
      {/* opposite arm relaxed down */}
      <line x1="140" y1="110" x2="146" y2="160" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <FloorLine />
    </LoopFrame>
  );
}

function DoorwayChestOpenerIllustration() {
  // Standing in a doorway with one arm braced on the frame.
  return (
    <LoopFrame>
      {/* door frame */}
      <line x1="40" y1="20" x2="40" y2="170" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <line x1="160" y1="20" x2="160" y2="170" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="56" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="66" x2="100" y2="120" />
        {/* braced arm to door frame (bent) */}
        <path d="M100 78 L60 70 L42 92" />
        {/* free arm down */}
        <line x1="100" y1="78" x2="118" y2="110" />
        {/* legs */}
        <line x1="100" y1="120" x2="86" y2="156" />
        <line x1="100" y1="120" x2="114" y2="156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function LevatorScapulaeIllustration() {
  // Head tilted diagonally down, hand pulling toward armpit.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="100" y1="110" x2="100" y2="170" />
        <line x1="60" y1="110" x2="140" y2="110" />
      </g>
      <g
        className="ml-anim-pulse"
        style={{ transformOrigin: "100px 110px" }}
      >
        {/* head turned + tilted (offset) */}
        <circle cx="78" cy="78" r="14" fill="currentColor" />
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        >
          {/* hand on back of head */}
          <path d="M78 78 L100 50 L130 70" />
        </g>
      </g>
      <line x1="140" y1="110" x2="146" y2="160" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <FloorLine />
    </LoopFrame>
  );
}

function ScapularSqueezeIllustration() {
  // Standing front view, elbows pulling back.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="120" />
        <line x1="100" y1="120" x2="86" y2="156" />
        <line x1="100" y1="120" x2="114" y2="156" />
      </g>
      {/* arms pulling back like wings */}
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "100px 76px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M100 76 L70 90 L50 70" />
      </g>
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "100px 76px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M100 76 L130 90 L150 70" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function ThreadTheNeedleIllustration() {
  // Quadruped with one arm threaded under the other.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="124" r="9" fill="currentColor" stroke="none" />
        <line x1="58" y1="120" x2="150" y2="116" />
        {/* hips + back leg */}
        <line x1="148" y1="116" x2="156" y2="156" />
        <line x1="138" y1="116" x2="142" y2="156" />
        {/* support arm planted */}
        <line x1="150" y1="116" x2="148" y2="130" />
      </g>
      {/* threaded arm crossing under torso */}
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M70 124 L110 152 L150 142" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SuboccipitalReleaseIllustration() {
  // Supine head with a small ball under the skull base.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* body lying on floor */}
        <line x1="60" y1="138" x2="160" y2="138" />
        {/* arms */}
        <line x1="100" y1="138" x2="100" y2="158" />
        <line x1="130" y1="138" x2="130" y2="158" />
      </g>
      {/* head */}
      <g
        className="ml-anim-pulse"
        style={{ transformOrigin: "60px 130px" }}
      >
        <circle cx="60" cy="124" r="14" fill="currentColor" />
      </g>
      {/* ball under skull base */}
      <circle cx="62" cy="142" r="6" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.65" />
      <FloorLine />
    </LoopFrame>
  );
}

function NeckFlexionIllustration() {
  // Seated figure dropping chin to chest.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="100" y1="110" x2="100" y2="160" />
        <line x1="70" y1="110" x2="130" y2="110" />
        {/* legs forward seated */}
        <line x1="100" y1="160" x2="160" y2="160" />
        <line x1="80" y1="120" x2="74" y2="150" />
      </g>
      <g
        className="ml-anim-arch"
        style={{ transformOrigin: "100px 110px" }}
      >
        {/* head dropping forward */}
        <circle cx="108" cy="80" r="14" fill="currentColor" />
        <line x1="100" y1="100" x2="108" y2="80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function ToeYogaIllustration() {
  // Top-down foot with big toe lifting independently.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M80 60 Q60 110 70 158 Q90 170 110 158 Q140 110 120 60 Z" />
      </g>
      {/* big toe pulsing up (lifted) */}
      <g className="ml-anim-pulse" style={{ transformOrigin: "84px 44px" }}>
        <circle cx="84" cy="40" r="6" fill="currentColor" />
      </g>
      {/* other toes pulsing later */}
      <g className="ml-anim-pulse ml-delay-half" style={{ transformOrigin: "104px 42px" }}>
        <circle cx="96" cy="40" r="5" fill="currentColor" opacity="0.85" />
        <circle cx="108" cy="42" r="5" fill="currentColor" opacity="0.85" />
        <circle cx="118" cy="46" r="4" fill="currentColor" opacity="0.85" />
      </g>
    </LoopFrame>
  );
}

function PlantarFasciaPressIllustration() {
  // Foot pressing down on a small ball.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* shin */}
        <line x1="100" y1="40" x2="100" y2="110" />
        {/* foot top of profile */}
        <path d="M100 110 L100 130 L150 132 L150 138" />
        {/* heel arc back to ground */}
        <path d="M100 130 L78 138 L100 142" />
      </g>
      {/* ball under arch with breathing pulse */}
      <g className="ml-anim-breathe" style={{ transformOrigin: "126px 144px" }}>
        <circle cx="126" cy="144" r="9" fill="currentColor" opacity="0.55" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function ToeSplayIllustration() {
  // Top-down foot with toes spreading apart (offset taps).
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M80 60 Q60 110 70 158 Q90 170 110 158 Q140 110 120 60 Z" />
      </g>
      {/* spreading toes */}
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "100px 60px" }}
      >
        <circle cx="80" cy="40" r="5" fill="currentColor" />
      </g>
      <circle cx="96" cy="36" r="5" fill="currentColor" />
      <circle cx="108" cy="38" r="5" fill="currentColor" />
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "100px 60px" }}
      >
        <circle cx="120" cy="44" r="4" fill="currentColor" />
      </g>
    </LoopFrame>
  );
}

function HeelWalkIllustration() {
  // Side-walking figure with toes lifted (heel-only contact).
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="44" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="54" x2="100" y2="110" />
      </g>
      <g
        className="ml-anim-arm-r"
        style={{ transformOrigin: "100px 70px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="100" y1="70" x2="120" y2="100" />
      </g>
      <g
        className="ml-anim-arm-l"
        style={{ transformOrigin: "100px 70px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="100" y1="70" x2="80" y2="100" />
      </g>
      {/* legs with toes raised */}
      <g
        className="ml-anim-knee-l"
        style={{ transformOrigin: "100px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M100 110 L86 134 L92 156 L102 148" />
      </g>
      <g
        className="ml-anim-knee-r"
        style={{ transformOrigin: "100px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M100 110 L114 134 L108 156 L120 150" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function TowelScrunchIllustration() {
  // Foot in profile gripping a small towel beneath the toes.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="100" y1="40" x2="100" y2="110" />
      </g>
      <g
        className="ml-anim-foot-flex"
        style={{ transformOrigin: "100px 110px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* foot curling toes downward */}
        <path d="M100 110 L100 130 L150 134 L156 144 L138 152 L100 150 Z" />
      </g>
      {/* towel waves under toes */}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.55" strokeLinecap="round">
        <path d="M120 158 Q130 152 140 158 Q150 164 160 158" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SingleLegBalanceIllustration() {
  // Standing on one leg, other knee lifted, arms out for balance.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="44" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="54" x2="100" y2="110" />
        {/* arms wide for balance */}
        <line x1="100" y1="68" x2="60" y2="80" />
        <line x1="100" y1="68" x2="140" y2="80" />
        {/* support leg */}
        <line x1="100" y1="110" x2="100" y2="158" />
        {/* lifted bent leg */}
        <path d="M100 110 L130 110 L120 150" />
      </g>
      {/* sway dot to suggest micro-balance */}
      <g className="ml-anim-sway" style={{ transformOrigin: "100px 158px" }}>
        <circle cx="100" cy="160" r="3" fill="currentColor" opacity="0.45" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function BigToeStretchIllustration() {
  // Hand pulling the big toe back from a seated foot view.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* shin angled */}
        <line x1="60" y1="40" x2="100" y2="120" />
        {/* foot */}
        <path d="M100 120 L100 142 L150 144 L150 152 L100 150" />
      </g>
      {/* big toe being pulled back */}
      <g
        className="ml-anim-pulse"
        style={{ transformOrigin: "150px 144px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <line x1="150" y1="144" x2="170" y2="124" />
      </g>
      {/* hand grasping */}
      <g
        className="ml-anim-pulse"
        style={{ transformOrigin: "170px 120px" }}
        fill="currentColor"
      >
        <circle cx="170" cy="120" r="6" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function QuadStretchIllustration() {
  // Standing balance with one heel pulled to glute.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="50" r="9" fill="currentColor" stroke="none" />
        <line x1="100" y1="60" x2="100" y2="116" />
        {/* support arm out */}
        <line x1="100" y1="74" x2="60" y2="86" />
        {/* support leg */}
        <line x1="100" y1="116" x2="100" y2="158" />
        {/* bent leg pulled up behind */}
        <path d="M100 116 L150 130 L130 96" />
        {/* hand grasping ankle */}
        <line x1="100" y1="74" x2="130" y2="96" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function HamstringStretchIllustration() {
  // Supine single-leg raise with strap (hand reaches the foot).
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="40" cy="138" r="9" fill="currentColor" stroke="none" />
        <line x1="50" y1="138" x2="100" y2="138" />
        {/* lifted straight leg */}
        <line x1="100" y1="138" x2="160" y2="60" />
        {/* hand reaching foot */}
        <path d="M70 138 L120 100 L156 64" />
        {/* other leg flat */}
        <line x1="100" y1="138" x2="160" y2="142" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SeatedForwardFoldIllustration() {
  // Sitting with legs forward, torso folding toward toes.
  return (
    <LoopFrame>
      <g
        className="ml-anim-arch"
        style={{ transformOrigin: "60px 130px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="80" cy="100" r="9" fill="currentColor" stroke="none" />
        {/* folded torso forward over legs */}
        <path d="M80 108 Q120 130 150 138" />
        {/* arms extending */}
        <line x1="120" y1="124" x2="160" y2="138" />
      </g>
      {/* legs flat */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="60" y1="142" x2="170" y2="146" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function ThoracicExtensionIllustration() {
  // Seated with hands behind head, chest opening up and back.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* hips on floor / stool */}
        <line x1="60" y1="150" x2="140" y2="150" />
        {/* legs crossed */}
        <path d="M140 150 L160 158" />
        <path d="M60 150 L40 158" />
      </g>
      <g
        className="ml-anim-arch"
        style={{ transformOrigin: "100px 150px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* extended torso reaching back */}
        <path d="M100 150 Q104 110 90 70" />
        <circle cx="90" cy="60" r="9" fill="currentColor" stroke="none" />
        {/* hands behind head, elbows wide */}
        <path d="M90 60 L60 50 L62 86" />
        <path d="M90 60 L120 50 L118 86" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function StandingForwardFoldIllustration() {
  // Standing figure folded over legs, hands toward floor.
  return (
    <LoopFrame>
      <g
        className="ml-anim-pulse"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* head down near floor */}
        <circle cx="100" cy="120" r="9" fill="currentColor" stroke="none" />
        {/* folded torso going up to hips */}
        <path d="M100 120 Q108 96 110 70" />
        {/* arms hanging toward floor */}
        <line x1="100" y1="120" x2="92" y2="156" />
        <line x1="100" y1="120" x2="116" y2="156" />
        {/* legs straight down */}
        <line x1="110" y1="70" x2="92" y2="156" />
        <line x1="110" y1="70" x2="124" y2="156" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

function SupineTwistIllustration() {
  // Lying on back with knees dropped to one side, arms out wide.
  return (
    <LoopFrame>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="40" cy="120" r="9" fill="currentColor" stroke="none" />
        {/* torso */}
        <line x1="50" y1="120" x2="120" y2="120" />
        {/* arms out wide for T-shape */}
        <line x1="80" y1="120" x2="80" y2="80" />
        <line x1="100" y1="120" x2="100" y2="80" />
      </g>
      {/* knees stacked, dropped to side (sway) */}
      <g
        className="ml-anim-sway"
        style={{ transformOrigin: "120px 120px" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M120 120 L160 96 L156 140" />
        <path d="M120 120 L160 108 L160 150" />
      </g>
      <FloorLine />
    </LoopFrame>
  );
}

// ===== ID → illustration map =====
const ILLUSTRATION_BY_ID: Record<string, React.ComponentType> = {
  // ----- Strength
  m1: PushUpIllustration,
  m2: GluteBridgeIllustration,
  m3: DoorwayRowIllustration,
  m4: PikePushUpIllustration,
  w2: SplitSquatIllustration,
  w4: SquatIllustration,
  s1: JumpIllustration, // Jump Squat
  s2: SupermanHoldIllustration,
  s3: ReverseLungeIllustration,
  s4: WallAngelsIllustration, // Towel Pull-Down
  s5: BirdDogIllustration, // Single-Leg Deadlift
  s6: PikeShoulderTapIllustration,
  // ----- Conditioning
  b1: PlankIllustration,
  b2: MountainClimberIllustration,
  c1: JumpRopeIllustration,
  c2: BurpeeIllustration,
  c3: HipHingeIllustration,
  c4: TuckJumpIllustration,
  c5: PlankShoulderTapIllustration,
  c6: BearCrawlIllustration,
  c7: HighKneesIllustration,
  c8: BicycleCrunchIllustration,
  // ----- Pregnancy Safe
  wh2: SideLyingLegRaiseIllustration,
  wh3: CatCowIllustration, // Prenatal Cat-Cow
  wh4: PelvicTiltIllustration,
  ps1: StandingHoldIllustration, // Wall Sit
  ps2: TowelCurlIllustration,
  ps3: CalfRaiseIllustration,
  ps4: SidePlankIllustration,
  ps5: PelvicRockIllustration,
  ps6: PrenatalSquatIllustration,
  ps7: SeatedTwistIllustration, // Seated Spinal Twist
  // ----- Postpartum
  w1: GluteBridgeIllustration, // Hip Thrusts
  wh1: GluteBridgeIllustration, // Pelvic Floor Bridge
  wh5: BoxBreathingIllustration, // Diastasis Recovery Breath
  pp1: GluteBridgeIllustration,
  pp2: BirdDogIllustration,
  pp3: HeelSlideIllustration,
  pp4: WallPushUpIllustration,
  pp5: StandingPelvicTiltIllustration,
  pp6: DeadBugIllustration,
  pp7: SeatedMarchIllustration,
  // ----- Hormonal
  w3: DonkeyKickIllustration,
  wh6: YogaFlowIllustration,
  wh7: CortisolWalkIllustration,
  h1: YinStretchIllustration,
  h2: LegsUpWallIllustration,
  h3: HipCircleIllustration,
  h4: SupportedBridgeIllustration,
  h5: NostrilBreathingIllustration,
  h6: GoddessPoseIllustration,
  h7: ReclinedButterflyIllustration,
  // ----- Tech Neck
  rn1: NeckRollIllustration,
  rn2: ChinTuckIllustration,
  rn3: UpperTrapStretchIllustration,
  tn1: DoorwayChestOpenerIllustration,
  tn2: LevatorScapulaeIllustration,
  tn3: ScapularSqueezeIllustration,
  tn4: WallAngelsIllustration,
  tn5: ThreadTheNeedleIllustration,
  tn6: SuboccipitalReleaseIllustration,
  tn7: NeckFlexionIllustration,
  // ----- Foot Care
  rf1: FootArchIllustration,
  rf2: ToeYogaIllustration,
  rf3: CalfStretchIllustration,
  fc1: PlantarFasciaPressIllustration,
  fc2: ToeSplayIllustration,
  fc3: HeelWalkIllustration,
  fc4: FootCircleIllustration, // Ankle Circles (canonical)
  fc5: TowelScrunchIllustration,
  fc6: SingleLegBalanceIllustration,
  fc7: BigToeStretchIllustration,
  // ----- Tension Release
  r1: QuadStretchIllustration,
  r2: HamstringStretchIllustration,
  r3: ChildsPoseIllustration,
  r4: BoxBreathingIllustration,
  tr1: PigeonIllustration,
  tr2: SeatedForwardFoldIllustration,
  tr3: CatCowIllustration,
  tr4: ThoracicExtensionIllustration,
  tr5: StandingForwardFoldIllustration,
  tr6: SupineTwistIllustration,
};

function MovementFamilyLoop({ family }: { family: MovementFamily }) {
  switch (family) {
    case "push":
      return <PushLoop />;
    case "squat":
      return <SquatLoop />;
    case "stretch":
      return <StretchLoop />;
    case "breathing":
    default:
      return <BreathingLoop />;
  }
}

function ResolvedIllustration({ exercise }: { exercise: Exercise }) {
  const Specific = ILLUSTRATION_BY_ID[exercise.id];
  if (Specific) return <Specific />;
  return <MovementFamilyLoop family={movementFamilyFor(exercise)} />;
}

function ExerciseLoop({
  exercise,
  gender,
  videoRef,
}: {
  exercise: Exercise;
  gender: Gender | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const src = loopSourceFor(exercise, gender);
  const reducedMotion = useReducedMotion();
  // iOS WebKit ignores an ancestor's border-radius when clipping a
  // <video> child (the video paints past the rounded corners). The
  // fixes that actually work cross-platform are: (1) establish a new
  // paint isolation context on the rounded container with
  // `isolation: isolate` + a GPU layer (`translateZ(0)`), and (2)
  // also apply the rounded clip directly to the video element so it
  // visually matches the frame even if the parent's clip leaks.
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-3xl bg-gradient-to-br from-stone-200 to-stone-100 text-stone-600 shadow-inner ring-1 ring-stone-200/60 dark:from-stone-800 dark:to-stone-900 dark:text-stone-300 dark:ring-stone-800/60"
      style={{ isolation: "isolate", transform: "translateZ(0)" }}
    >
      <div className="absolute inset-0">
        <ResolvedIllustration exercise={exercise} />
      </div>
      {src && !reducedMotion && (
        <video
          ref={videoRef}
          key={src}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full rounded-3xl object-cover"
          // Native casting attributes so this element is the real
          // surface for Remote Playback (Chromium) and AirPlay (Safari).
          disableRemotePlayback={false}
          {...{ "x-webkit-airplay": "allow" }}
          onError={(e) => {
            // Hide the broken video and keep the SVG fallback visible
            (e.currentTarget as HTMLVideoElement).style.display = "none";
          }}
        />
      )}
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
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    const wire = () => {
      if (cancelled) return;
      const v = videoRef.current as
        | (HTMLVideoElement & { remote?: RemotePlaybackLike })
        | null;
      if (!v) {
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

const EXERCISES: Exercise[] = [
  // ----- Core (Workout) -----
  {
    id: "m1",
    name: "Push-Up",
    targetMuscle: "Chest & Triceps",
    durationSeconds: 40,
    reps: 12,
    genderFocus: "men",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
    equipment: "none",
  },
  {
    id: "m2",
    name: "Single-Leg Glute Bridge",
    targetMuscle: "Glutes & Hamstrings",
    durationSeconds: 45,
    reps: 12,
    genderFocus: "men",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
    equipment: "mat",
  },
  {
    id: "m3",
    name: "Doorway Row",
    targetMuscle: "Back & Biceps",
    durationSeconds: 40,
    reps: 12,
    genderFocus: "men",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
    equipment: "doorway",
  },
  {
    id: "m4",
    name: "Pike Push-Up",
    targetMuscle: "Shoulders",
    durationSeconds: 40,
    reps: 8,
    genderFocus: "men",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
    equipment: "none",
  },
  {
    id: "w2",
    name: "Split Squat",
    targetMuscle: "Quads & Glutes",
    durationSeconds: 45,
    reps: 12,
    genderFocus: "women",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
    equipment: "none",
  },
  {
    id: "w4",
    name: "Bodyweight Squat",
    targetMuscle: "Quads & Glutes",
    durationSeconds: 40,
    reps: 15,
    genderFocus: "women",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
    equipment: "none",
  },
  {
    id: "b1",
    name: "Plank Hold",
    targetMuscle: "Core",
    durationSeconds: 60,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "core",
    sub_category: "Conditioning",
    equipment: "mat",
  },
  {
    id: "b2",
    name: "Mountain Climbers",
    targetMuscle: "Full Body",
    durationSeconds: 30,
    reps: 25,
    genderFocus: "both",
    mode: "reps",
    category: "core",
    sub_category: "Conditioning",
    equipment: "mat",
  },

  // ----- Women's Health -----
  // Pregnancy Safe
  {
    id: "wh2",
    name: "Side-Lying Leg Raise",
    targetMuscle: "Hip Abductors",
    durationSeconds: 40,
    reps: 15,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    sub_category: "Pregnancy Safe",
    equipment: "mat",
  },
  {
    id: "wh3",
    name: "Prenatal Cat-Cow",
    targetMuscle: "Spine",
    durationSeconds: 45,
    reps: 1,
    genderFocus: "women",
    mode: "timed",
    category: "womens_health",
    sub_category: "Pregnancy Safe",
    equipment: "mat",
  },
  {
    id: "wh4",
    name: "Pregnancy Pelvic Tilt",
    targetMuscle: "Lower Back",
    durationSeconds: 40,
    reps: 12,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    sub_category: "Pregnancy Safe",
    equipment: "mat",
  },
  // Postpartum
  {
    id: "w1",
    name: "Hip Thrusts",
    targetMuscle: "Glutes",
    durationSeconds: 40,
    reps: 15,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    sub_category: "Postpartum",
    equipment: "mat",
  },
  {
    id: "wh1",
    name: "Pelvic Floor Bridge",
    targetMuscle: "Pelvic Floor",
    durationSeconds: 30,
    reps: 12,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    sub_category: "Postpartum",
    equipment: "mat",
  },
  {
    id: "wh5",
    name: "Diastasis Recovery Breath",
    targetMuscle: "Deep Core",
    durationSeconds: 60,
    reps: 1,
    genderFocus: "women",
    mode: "timed",
    category: "womens_health",
    sub_category: "Postpartum",
    equipment: "mat",
  },
  // Hormonal
  {
    id: "w3",
    name: "Standing Donkey Kicks",
    targetMuscle: "Glutes",
    durationSeconds: 30,
    reps: 15,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    sub_category: "Hormonal",
    equipment: "none",
  },
  {
    id: "wh6",
    name: "Hormonal Yoga Flow",
    targetMuscle: "Full Body",
    durationSeconds: 120,
    reps: 1,
    genderFocus: "women",
    mode: "timed",
    category: "womens_health",
    sub_category: "Hormonal",
    equipment: "mat",
  },
  {
    id: "wh7",
    name: "Cortisol Reset Walk",
    targetMuscle: "Cardio",
    durationSeconds: 300,
    reps: 1,
    genderFocus: "women",
    mode: "timed",
    category: "womens_health",
    sub_category: "Hormonal",
    equipment: "none",
  },

  // ----- Recovery -----
  // Tech Neck
  {
    id: "rn1",
    name: "Neck Rolls",
    targetMuscle: "Neck",
    durationSeconds: 45,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Tech Neck",
    equipment: "none",
  },
  {
    id: "rn2",
    name: "Chin Tucks",
    targetMuscle: "Cervical Spine",
    durationSeconds: 30,
    reps: 12,
    genderFocus: "both",
    mode: "reps",
    category: "recovery",
    sub_category: "Tech Neck",
    equipment: "none",
  },
  {
    id: "rn3",
    name: "Upper Trap Stretch",
    targetMuscle: "Upper Traps",
    durationSeconds: 45,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Tech Neck",
    equipment: "none",
  },
  // Foot Care
  {
    id: "rf1",
    name: "Foot Arch Massage",
    targetMuscle: "Plantar Fascia",
    durationSeconds: 60,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Foot Care",
    equipment: "none",
  },
  {
    id: "rf2",
    name: "Toe Yoga",
    targetMuscle: "Toes",
    durationSeconds: 45,
    reps: 10,
    genderFocus: "both",
    mode: "reps",
    category: "recovery",
    sub_category: "Foot Care",
    equipment: "none",
  },
  {
    id: "rf3",
    name: "Calf Wall Stretch",
    targetMuscle: "Calves",
    durationSeconds: 45,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Foot Care",
    equipment: "wall",
  },
  // Tension Release
  {
    id: "r1",
    name: "Standing Quad Stretch",
    targetMuscle: "Quads",
    durationSeconds: 60,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Tension Release",
    equipment: "none",
  },
  {
    id: "r2",
    name: "Hamstring Stretch",
    targetMuscle: "Hamstrings",
    durationSeconds: 45,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Tension Release",
    equipment: "mat",
  },
  {
    id: "r3",
    name: "Child's Pose",
    targetMuscle: "Lower Back",
    durationSeconds: 60,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Tension Release",
    equipment: "mat",
  },
  {
    id: "r4",
    name: "Box Breathing",
    targetMuscle: "Nervous System",
    durationSeconds: 90,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Tension Release",
    equipment: "none",
  },

  // ===== Expanded library (Task #12) =====

  // Strength (additions)
  { id: "s1", name: "Jump Squat", targetMuscle: "Quads & Glutes", durationSeconds: 40, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength", equipment: "none" },
  { id: "s2", name: "Superman Hold", targetMuscle: "Mid Back", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Strength", equipment: "mat" },
  { id: "s3", name: "Reverse Lunge", targetMuscle: "Legs & Glutes", durationSeconds: 45, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength", equipment: "none" },
  { id: "s4", name: "Towel Pull-Down", targetMuscle: "Lats", durationSeconds: 40, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength", equipment: "towel" },
  { id: "s5", name: "Single-Leg Deadlift", targetMuscle: "Hamstrings", durationSeconds: 45, reps: 10, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength", equipment: "none" },
  { id: "s6", name: "Pike Shoulder Tap", targetMuscle: "Shoulders", durationSeconds: 40, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength", equipment: "mat" },

  // Conditioning (additions)
  { id: "c1", name: "Invisible Jump Rope", targetMuscle: "Cardio", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning", equipment: "none" },
  { id: "c2", name: "Burpees", targetMuscle: "Full Body", durationSeconds: 45, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning", equipment: "mat" },
  { id: "c3", name: "Bodyweight Hip Hinge", targetMuscle: "Posterior Chain", durationSeconds: 40, reps: 20, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning", equipment: "none" },
  { id: "c4", name: "Tuck Jumps", targetMuscle: "Legs", durationSeconds: 30, reps: 10, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning", equipment: "none" },
  { id: "c5", name: "Plank Shoulder Taps", targetMuscle: "Shoulders & Core", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning", equipment: "mat" },
  { id: "c6", name: "Bear Crawl", targetMuscle: "Full Body", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning", equipment: "mat" },
  { id: "c7", name: "High Knees", targetMuscle: "Cardio", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning", equipment: "none" },
  { id: "c8", name: "Bicycle Crunches", targetMuscle: "Core", durationSeconds: 40, reps: 30, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning", equipment: "mat" },

  // Pregnancy Safe (additions)
  { id: "ps1", name: "Wall Sit", targetMuscle: "Quads", durationSeconds: 30, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe", equipment: "wall" },
  { id: "ps2", name: "Seated Towel Curl", targetMuscle: "Biceps", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Pregnancy Safe", equipment: "towel" },
  { id: "ps3", name: "Standing Calf Raise", targetMuscle: "Calves", durationSeconds: 40, reps: 15, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Pregnancy Safe", equipment: "none" },
  { id: "ps4", name: "Modified Side Plank", targetMuscle: "Obliques", durationSeconds: 30, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe", equipment: "mat" },
  { id: "ps5", name: "Standing Pelvic Rocks", targetMuscle: "Hips", durationSeconds: 60, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe", equipment: "none" },
  { id: "ps6", name: "Prenatal Squat Hold", targetMuscle: "Pelvic Floor", durationSeconds: 30, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe", equipment: "none" },
  { id: "ps7", name: "Seated Spinal Twist", targetMuscle: "Spine", durationSeconds: 45, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe", equipment: "mat" },

  // Postpartum (additions)
  { id: "pp1", name: "Glute Bridge", targetMuscle: "Glutes", durationSeconds: 40, reps: 15, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum", equipment: "mat" },
  { id: "pp2", name: "Bird Dog", targetMuscle: "Core & Back", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum", equipment: "mat" },
  { id: "pp3", name: "Heel Slides", targetMuscle: "Deep Core", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum", equipment: "mat" },
  { id: "pp4", name: "Wall Push-Up", targetMuscle: "Chest", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum", equipment: "wall" },
  { id: "pp5", name: "Standing Pelvic Tilt", targetMuscle: "Lower Back", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum", equipment: "none" },
  { id: "pp6", name: "Dead Bug", targetMuscle: "Deep Core", durationSeconds: 45, reps: 10, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum", equipment: "mat" },
  { id: "pp7", name: "Seated March", targetMuscle: "Hip Flexors", durationSeconds: 45, reps: 20, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum", equipment: "chair" },

  // Hormonal (additions)
  { id: "h1", name: "Slow Yin Stretch", targetMuscle: "Full Body", durationSeconds: 180, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal", equipment: "mat" },
  { id: "h2", name: "Legs-Up-The-Wall", targetMuscle: "Lymphatic", durationSeconds: 240, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal", equipment: "wall" },
  { id: "h3", name: "Gentle Hip Circles", targetMuscle: "Hips", durationSeconds: 60, reps: 10, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Hormonal", equipment: "none" },
  { id: "h4", name: "Supported Bridge", targetMuscle: "Adrenals", durationSeconds: 120, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal", equipment: "mat" },
  { id: "h5", name: "Alternate Nostril Breathing", targetMuscle: "Nervous System", durationSeconds: 180, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal", equipment: "none" },
  { id: "h6", name: "Goddess Pose", targetMuscle: "Inner Thighs", durationSeconds: 60, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal", equipment: "none" },
  { id: "h7", name: "Reclined Butterfly", targetMuscle: "Hips & Pelvis", durationSeconds: 120, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal", equipment: "mat" },

  // Tech Neck (additions)
  { id: "tn1", name: "Doorway Chest Opener", targetMuscle: "Chest", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tech Neck", equipment: "doorway" },
  { id: "tn2", name: "Levator Scapulae Stretch", targetMuscle: "Neck Side", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tech Neck", equipment: "none" },
  { id: "tn3", name: "Scapular Squeezes", targetMuscle: "Rhomboids", durationSeconds: 30, reps: 15, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Tech Neck", equipment: "none" },
  { id: "tn4", name: "Wall Angels", targetMuscle: "Upper Back", durationSeconds: 45, reps: 12, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Tech Neck", equipment: "wall" },
  { id: "tn5", name: "Thread the Needle", targetMuscle: "Thoracic Spine", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tech Neck", equipment: "mat" },
  { id: "tn6", name: "Suboccipital Release", targetMuscle: "Skull Base", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tech Neck", equipment: "mat" },
  { id: "tn7", name: "Seated Neck Flexion", targetMuscle: "Neck", durationSeconds: 30, reps: 10, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Tech Neck", equipment: "none" },

  // Foot Care (additions)
  { id: "fc1", name: "Plantar Fascia Press", targetMuscle: "Plantar Fascia", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care", equipment: "none" },
  { id: "fc2", name: "Toe Splay", targetMuscle: "Toes", durationSeconds: 30, reps: 15, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Foot Care", equipment: "none" },
  { id: "fc3", name: "Heel Walks", targetMuscle: "Shin & Foot", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care", equipment: "none" },
  { id: "fc4", name: "Ankle Circles", targetMuscle: "Ankles", durationSeconds: 30, reps: 10, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Foot Care", equipment: "none" },
  { id: "fc5", name: "Towel Scrunches", targetMuscle: "Foot Intrinsics", durationSeconds: 45, reps: 15, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Foot Care", equipment: "towel" },
  { id: "fc6", name: "Single-Leg Balance", targetMuscle: "Foot & Ankle", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care", equipment: "none" },
  { id: "fc7", name: "Big Toe Stretch", targetMuscle: "Big Toe", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care", equipment: "none" },

  // Tension Release (additions)
  { id: "tr1", name: "Pigeon Pose", targetMuscle: "Hips", durationSeconds: 90, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release", equipment: "mat" },
  { id: "tr2", name: "Seated Forward Fold", targetMuscle: "Hamstrings", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release", equipment: "mat" },
  { id: "tr3", name: "Cat-Cow Flow", targetMuscle: "Spine", durationSeconds: 60, reps: 10, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Tension Release", equipment: "mat" },
  { id: "tr4", name: "Thoracic Extension", targetMuscle: "Thoracic", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release", equipment: "mat" },
  { id: "tr5", name: "Standing Forward Fold", targetMuscle: "Posterior Chain", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release", equipment: "none" },
  { id: "tr6", name: "Supine Twist", targetMuscle: "Lower Back", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release", equipment: "mat" },
];

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

function WiseBodyMark({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="180" height="180" rx="36" fill="#A8121A" />
      <path
        d="M38 70 L62 140 L90 100 L118 140 L142 70"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="18"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="138" cy="40" r="22" fill="#FFFFFF" />
      <g fill="#A8121A">
        <rect x="124" y="37" width="28" height="6" rx="2" />
        <rect x="119" y="30" width="6" height="20" rx="2" />
        <rect x="151" y="30" width="6" height="20" rx="2" />
      </g>
    </svg>
  );
}

function WelcomeScreen({ onSelect }: { onSelect: (gender: Gender) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col px-6 pt-safe pb-safe">
      {/* Hero brand mark */}
      <div className="relative mt-10 flex h-56 w-full items-center justify-center">
        <div
          className="absolute inset-0 mx-auto h-56 w-56 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(168,18,26,0.30) 0%, rgba(168,18,26,0) 70%)",
          }}
        />
        <div className="relative z-10">
          <WiseBodyMark size={156} />
        </div>
      </div>

      <div className="mt-2 flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A8121A] dark:text-red-400">
          Home workouts · No equipment
        </p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Wise Body
        </h1>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
          Fitness App
        </p>
        <p className="mt-3 max-w-xs text-base leading-snug text-stone-500 dark:text-stone-400">
          Strength, recovery and breathing sessions you can do in your living room — no gear required.
        </p>
        <p className="mt-4 text-[11px] font-medium tracking-wide text-stone-400 dark:text-stone-500">
          Part of The Wise Cloud · fitness.thewise.cloud
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 pb-4">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Pick what fits you
        </p>
        <button
          type="button"
          onClick={() => onSelect("man")}
          className="w-full rounded-2xl bg-stone-900 px-6 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:active:bg-stone-200"
          style={{ minHeight: 60 }}
        >
          I am a Man
        </button>
        <button
          type="button"
          onClick={() => onSelect("woman")}
          className="w-full rounded-2xl border border-stone-200 bg-white px-6 text-lg font-semibold text-stone-900 shadow-sm transition active:scale-[0.98] active:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50 dark:active:bg-stone-800"
          style={{ minHeight: 60 }}
        >
          I am a Woman
        </button>
      </div>
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
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group mb-3 cursor-pointer rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.985] active:bg-stone-50 dark:bg-stone-900 dark:ring-stone-800 dark:active:bg-stone-800"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 ring-1 ring-stone-200/70 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700/60">
          <FamilyGlyph family={family} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-stone-900 dark:text-stone-50">
            {exercise.name}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-stone-500 dark:text-stone-400">
            {exercise.targetMuscle}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <GearBadge equipment={exercise.equipment} />
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {exercise.mode === "timed"
                ? `${exercise.durationSeconds}s`
                : `${exercise.reps} reps`}
            </span>
            {exercise.genderFocus !== "both" && (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {exercise.genderFocus}
              </span>
            )}
          </div>
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-1 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400"
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </div>
    </div>
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
  return (
    <nav
      className="pb-safe absolute bottom-0 left-0 right-0 w-full max-w-md border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
      aria-label="Primary"
    >
      <div className="flex w-full items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition active:scale-[0.97] ${
                isActive
                  ? "text-stone-900 dark:text-stone-50"
                  : "text-stone-400 dark:text-stone-500"
              }`}
              style={{ minHeight: 60 }}
            >
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
            </button>
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

  return (
    <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70 dark:bg-stone-900 dark:ring-stone-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Today
          </p>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {todays.length === 0
              ? "No workouts yet — finish one to log it."
              : `${todays.length} workout${todays.length === 1 ? "" : "s"} logged`}
          </p>
        </div>
        <div
          className="flex h-12 min-w-[3.25rem] flex-col items-center justify-center rounded-2xl bg-emerald-50 px-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          aria-label={`${streak}-day streak`}
        >
          <span className="text-lg font-bold leading-none tabular-nums">
            {streak}
          </span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest">
            day streak
          </span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-stone-100 px-2 py-3 text-center dark:bg-stone-800">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Workouts
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
            {todays.length}
          </dd>
        </div>
        <div className="rounded-2xl bg-stone-100 px-2 py-3 text-center dark:bg-stone-800">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Sets
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
            {todaysSets}
          </dd>
        </div>
        <div className="rounded-2xl bg-stone-100 px-2 py-3 text-center dark:bg-stone-800">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Minutes
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
            {minutesLabel}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Last 7 days
        </p>
        <div className="flex h-20 items-end justify-between gap-1.5">
          {perDay.map((p, i) => {
            const h = p.seconds === 0 ? 6 : Math.max(8, Math.round((p.seconds / maxSeconds) * 64));
            const isToday = p.day === today;
            const date = new Date(p.day);
            return (
              <div key={p.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-md ${
                    p.seconds > 0
                      ? "bg-emerald-500 dark:bg-emerald-400"
                      : "bg-stone-200 dark:bg-stone-800"
                  } ${isToday ? "ring-2 ring-emerald-300 dark:ring-emerald-700" : ""}`}
                  style={{ height: `${h}px` }}
                  title={`${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: ${Math.round(p.seconds / 60)} min`}
                  aria-label={`${date.toLocaleDateString(undefined, { weekday: "short" })}: ${Math.round(p.seconds / 60)} minutes`}
                />
                <span
                  className={`text-[10px] font-semibold tabular-nums ${
                    isToday
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-stone-400 dark:text-stone-500"
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
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Recent workouts
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
              className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 transition active:scale-95 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
            >
              {confirmingClear ? "Tap to confirm" : "Clear"}
            </button>
          </div>
          <ul className="mt-2 space-y-1.5">
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
                  className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-50">
                      {s.firstExerciseName}
                      {s.exercises > 1 ? ` +${s.exercises - 1}` : ""}
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {when}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-50">
                      {Math.max(1, Math.round(s.durationSeconds / 60))}m
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
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
}: {
  gender: Gender | null;
  onSelectExercise: (playlist: Exercise[], index: number) => void;
  themePref: ThemePref;
  onThemeChange: (next: ThemePref) => void;
  onResetProfile: () => void;
  history: WorkoutSession[];
  onClearHistory: () => void;
}) {
  const [category, setCategory] = useLocalStorage<Category>(
    DASHBOARD_CATEGORY_KEY,
    "core",
    isCategory,
  );
  const chips = SUB_CATEGORIES[category];
  const [activeChip, setActiveChip] = useState<string>(ALL_CHIP);

  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter(
      (t) => !(t.id === "womens_health" && gender === "man"),
    );
  }, [gender]);

  // If the persisted/active tab is unavailable for the current profile
  // (e.g. saved tab was Women's Health but the user is now Man), reset.
  useEffect(() => {
    if (gender === "man" && category === "womens_health") {
      setCategory("core");
    }
  }, [gender, category, setCategory]);

  // Reset to "All" whenever the active tab changes.
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

  // When viewing "All", group exercises by sub_category preserving the
  // order declared in SUB_CATEGORIES so the layout is stable.
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
    <div className="absolute inset-0 flex flex-col">
      <header className="pt-safe shrink-0 px-6 pb-4" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 32px)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <WiseBodyMark size={40} />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {CATEGORY_HEADINGS[category]}
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                Wise Body
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        className="no-scrollbar list-fade min-h-0 flex-1 overflow-y-auto px-6 pt-2"
        style={{ paddingBottom: 100 }}
      >
        <ProgressOverview history={history} onClear={onClearHistory} />
        {grouped ? (
          grouped.map(([sub, items]) => (
            <section key={sub} className="mb-2">
              <h2 className="sticky top-0 z-10 -mx-6 mb-2 bg-stone-50/90 px-6 py-2 text-[11px] font-semibold uppercase tracking-widest text-stone-500 backdrop-blur dark:bg-stone-950/90 dark:text-stone-400">
                {sub}
                <span className="ml-2 text-stone-400 dark:text-stone-500">
                  {items.length}
                </span>
              </h2>
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
            </section>
          ))
        ) : (
          filtered.map((exercise, idx) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onClick={() => onSelectExercise(filtered, idx)}
            />
          ))
        )}
        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-stone-400 dark:text-stone-500">
            No exercises in this category yet.
          </p>
        )}
      </div>

      <BottomNav
        tabs={visibleTabs}
        active={category}
        onChange={handleCategoryChange}
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
  const [n, setN] = useState(3);
  useEffect(() => {
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
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const totalRef = useRef(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      const t = window.setTimeout(onComplete, 250);
      return () => window.clearTimeout(t);
    }
    const t = window.setInterval(() => {
      setSecondsLeft((v) => Math.max(0, v - 1));
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
  const [secondsLeft, setSecondsLeft] = useState(exercise.durationSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

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
          <span>Set {setNumber} of {totalSets}</span>
          <span>{formatTime(exercise.durationSeconds - secondsLeft)} / {formatTime(exercise.durationSeconds)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative" style={{ width: 240, height: 240 }}>
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 -rotate-90"
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
              className="text-center font-mono font-bold tabular-nums text-stone-900 dark:text-stone-50"
              style={{ fontSize: 64, lineHeight: 1 }}
            >
              {formatTime(secondsLeft)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={running ? "Pause" : "Play"}
          className={`mt-8 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl transition active:scale-95 active:bg-emerald-600 dark:bg-emerald-500 dark:text-white ${running ? "cta-pulse" : ""}`}
          style={{ width: 92, height: 92 }}
        >
          {running ? <PauseIcon /> : <PlayIcon />}
        </button>
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
}: {
  exercise: Exercise;
  onSetComplete: () => void;
  cues: ArabicCues;
  speak: (text: string) => void;
  setNumber: number;
  totalSets: number;
}) {
  const [reps, setReps] = useState(0);
  useEffect(() => {
    setReps(0);
  }, [exercise.id, exercise.reps, setNumber]);

  return (
    <div className="flex flex-1 flex-col px-6">
      <div className="mt-2">
        <ProgressBar value={Math.min(1, reps / Math.max(1, exercise.reps))} />
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
          <span>Set {setNumber} of {totalSets}</span>
          <span>Target {exercise.reps} reps</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Reps
        </p>
        <div
          className="mt-1 text-center font-bold tabular-nums text-stone-900 dark:text-stone-50"
          style={{ fontSize: 112, lineHeight: 1 }}
        >
          {reps}
        </div>
        <div className="mt-4">
          <Stepper
            label="reps"
            value={reps}
            onDec={() => setReps((r) => Math.max(0, r - 1))}
            onInc={() => setReps((r) => r + 1)}
            min={reps <= 0}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          speak(cues.end);
          window.setTimeout(() => onSetComplete(), 500);
        }}
        aria-label="Complete set"
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 text-lg font-semibold text-white shadow-md transition active:scale-[0.98] active:bg-emerald-600"
        style={{ minHeight: 64 }}
      >
        <CheckIcon />
        Complete set
      </button>
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
  onBack,
  onChangeIndex,
  videoRef,
  cast,
  onOpenCastModal,
  onLogSession,
}: {
  playlist: Exercise[];
  index: number;
  active: boolean;
  gender: Gender | null;
  onBack: () => void;
  onChangeIndex: (next: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cast: ReturnType<typeof useCast>;
  onOpenCastModal: () => void;
  onLogSession: (s: Omit<WorkoutSession, "id" | "endedAt">) => void;
}) {
  const exercise = playlist[index] ?? null;
  const nextExercise = playlist[index + 1] ?? null;
  const hasPrev = index > 0;
  const hasNext = index + 1 < playlist.length;

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

  // ===== Workout session totals (for end-of-workout summary) =====
  const [completedSets, setCompletedSets] = useState(0);
  const [completedExercises, setCompletedExercises] = useState(0);
  const [summary, setSummary] = useState<
    | {
        totalExercises: number;
        completedSets: number;
        elapsedSeconds: number;
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
    (finalSetCount: number, finalExerciseCount: number) => {
      const start = sessionStartRef.current ?? Date.now();
      const elapsedSeconds = Math.max(
        0,
        Math.round((Date.now() - start) / 1000),
      );
      cancel();
      setPhase("exercise");
      setSummary({
        totalExercises: finalExerciseCount,
        completedSets: finalSetCount,
        elapsedSeconds,
      });
      const first = playlist[0];
      if (first && finalSetCount > 0) {
        onLogSession({
          durationSeconds: elapsedSeconds,
          exercises: finalExerciseCount,
          sets: finalSetCount,
          category: first.category,
          firstExerciseName: first.name,
        });
      }
    },
    [cancel, playlist, onLogSession],
  );

  const handleSetComplete = useCallback(() => {
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
      finishWorkout(nextCompletedSets, nextCompletedExercises);
    }
  }, [
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
  // speech synthesis is supported but no Arabic voice is installed,
  // regardless of mute state, so the user understands why turning
  // voice on wouldn't speak Arabic.
  const showVoiceUnavailableHint = supported && !hasArabicVoice;

  return (
    <div className="absolute inset-0 flex flex-col bg-stone-50 dark:bg-stone-950">
      {/* Top bar with back + mute toggle */}
      <div
        className="pt-safe relative flex shrink-0 items-center justify-between gap-3 px-4"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              cancel();
              onBack();
            }}
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 active:bg-stone-100 dark:bg-stone-800 dark:text-stone-50 dark:active:bg-stone-700"
          >
            <BackIcon />
          </button>
          <button
            type="button"
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="Previous exercise"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 active:bg-stone-100 disabled:opacity-30 dark:bg-stone-800 dark:text-stone-50 dark:active:bg-stone-700"
          >
            <PrevIcon />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasNext}
            aria-label="Next exercise"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 active:bg-stone-100 disabled:opacity-30 dark:bg-stone-800 dark:text-stone-50 dark:active:bg-stone-700"
          >
            <NextIcon />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const isCasting = cast.state === "casting";
            const canPick = cast.support.remote || cast.support.airplay;
            const noDevices =
              canPick && !isCasting && cast.availability === "unavailable";
            const helpOnly = !canPick;
            const label = isCasting
              ? "Stop casting to TV"
              : helpOnly
                ? "Cast help"
                : noDevices
                  ? "Cast to TV — no nearby TVs found, see help"
                  : "Cast to TV";
            const titleText = isCasting
              ? "Casting…"
              : helpOnly
                ? "Cast help"
                : noDevices
                  ? "No nearby TVs found — see help"
                  : "Cast to TV";
            return (
              <button
                type="button"
                onClick={async () => {
                  if (isCasting) {
                    cast.stop();
                    return;
                  }
                  if (helpOnly) {
                    onOpenCastModal();
                    return;
                  }
                  const result = await cast.start();
                  // Only fall back to the help modal when the platform
                  // genuinely can't cast. A "failed" result usually means
                  // the user dismissed the picker — don't nag them.
                  if (result === "unsupported") onOpenCastModal();
                }}
                aria-label={label}
                aria-pressed={isCasting}
                title={titleText}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-full px-3 shadow-sm transition active:scale-95 ${
                  isCasting
                    ? "bg-stone-900 text-white active:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:active:bg-stone-200"
                    : helpOnly
                      ? "bg-white/60 text-stone-500 active:bg-stone-100 dark:bg-stone-800/60 dark:text-stone-400 dark:active:bg-stone-700"
                      : noDevices
                        ? "bg-white text-stone-500 active:bg-stone-100 dark:bg-stone-800 dark:text-stone-400 dark:active:bg-stone-700"
                        : "bg-white text-stone-900 active:bg-stone-100 dark:bg-stone-800 dark:text-stone-50 dark:active:bg-stone-700"
                }`}
              >
                {isCasting ? <CastingIcon /> : <CastIcon />}
                {isCasting && (
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Casting · Stop
                  </span>
                )}
                {cast.state === "connecting" && (
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Connecting…
                  </span>
                )}
                {!isCasting && cast.state !== "connecting" && noDevices && (
                  <span className="text-[10px] font-medium normal-case tracking-normal text-stone-500 dark:text-stone-400">
                    No TVs found
                  </span>
                )}
              </button>
            );
          })()}
          {supported && (
            <button
              type="button"
              onClick={() => {
                const next = muted ? "0" : "1";
                setMutedStr(next);
                if (next === "1") cancel();
              }}
              aria-pressed={!muted}
              aria-label={
                muted ? "Unmute Arabic coaching" : "Mute Arabic coaching"
              }
              title={muted ? "Voice off" : "Voice on"}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 active:bg-stone-100 dark:bg-stone-800 dark:text-stone-50 dark:active:bg-stone-700"
            >
              {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
            </button>
          )}
        </div>
      </div>

      {/* Top progress (exercise position in the playlist) */}
      <div className="shrink-0 px-4 pt-2">
        <ProgressBar value={(index + 1) / Math.max(1, playlist.length)} />
        <div className="mt-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
          <span>Exercise {index + 1} / {playlist.length}</span>
          <span>{exercise.sub_category}</span>
        </div>
      </div>

      {/* Looping animation */}
      <div className="shrink-0 px-4 pt-2" style={{ height: "34%" }}>
        <ExerciseLoop exercise={exercise} gender={gender} videoRef={videoRef} />
      </div>

      {/* Honest UX fallback if no Arabic voice available */}
      {showVoiceUnavailableHint && (
        <div className="shrink-0 px-6 pt-2">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Arabic voice unavailable on this device
          </p>
        </div>
      )}

      {/* Exercise name + sets stepper */}
      <div className="shrink-0 px-6 pt-3 pb-1 text-center">
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
        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            Sets
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
      </div>

      {/* Mode-conditional body */}
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
          onSetComplete={() => handleSetComplete()}
          cues={cues}
          speak={speak}
          setNumber={setNumber}
          totalSets={totalSets}
        />
      )}

      {/* Up-next strip with a small family glyph for the next move */}
      <div className="shrink-0 px-4 pb-safe" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
        <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-stone-800">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            Up next
          </span>
          {nextExercise ? (
            <>
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-900 dark:text-stone-400">
                <ResolvedIllustration exercise={nextExercise} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-50">
                  {nextExercise.name}
                </p>
                <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                  {nextExercise.targetMuscle} · {nextExercise.mode === "timed" ? `${nextExercise.durationSeconds}s` : `${nextExercise.reps} reps`}
                </p>
              </div>
            </>
          ) : (
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-stone-500 dark:text-stone-400">
              Last one — finish strong
            </p>
          )}
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
              : nextExercise?.name ?? "Workout complete"
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
          onDone={() => {
            setSummary(null);
            onBack();
          }}
        />
      )}
    </div>
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
  onDone,
}: {
  totalExercises: number;
  completedSets: number;
  elapsedSeconds: number;
  onDone: () => void;
}) {
  const doneRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    doneRef.current?.focus();
  }, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-summary-title"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-stone-50/95 px-6 backdrop-blur-sm dark:bg-stone-950/95"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          Workout complete
        </p>
        <h2
          id="workout-summary-title"
          className="mt-2 text-center text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50"
        >
          Great work!
        </h2>
        <p className="mt-1 text-center text-sm text-stone-500 dark:text-stone-400">
          Here's what you just did.
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-stone-100 px-3 py-4 text-center dark:bg-stone-800">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Exercises
            </dt>
            <dd className="mt-1 text-2xl font-bold text-stone-900 tabular-nums dark:text-stone-50">
              {totalExercises}
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-100 px-3 py-4 text-center dark:bg-stone-800">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Sets
            </dt>
            <dd className="mt-1 text-2xl font-bold text-stone-900 tabular-nums dark:text-stone-50">
              {completedSets}
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-100 px-3 py-4 text-center dark:bg-stone-800">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Time
            </dt>
            <dd className="mt-1 text-2xl font-bold text-stone-900 tabular-nums dark:text-stone-50">
              {formatElapsed(elapsedSeconds)}
            </dd>
          </div>
        </dl>

        <button
          ref={doneRef}
          type="button"
          onClick={onDone}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-stone-900 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:active:bg-stone-200"
        >
          Done
        </button>
      </div>
    </div>
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
    setScreen("dashboard");
  };

  const handleResetProfile = () => {
    try {
      localStorage.removeItem(GENDER_KEY);
    } catch {
      /* ignore */
    }
    clearHistory();
    setGender(null);
    setScreen("welcome");
  };

  const handleSelectExercise = (nextPlaylist: Exercise[], index: number) => {
    cancelPendingUnmount();
    setPlaylist(nextPlaylist);
    setPlaylistIndex(index);
    setScreen("workout");
  };

  const handleBackFromWorkout = () => {
    setScreen("dashboard");
    cancelPendingUnmount();
    // While casting, keep the workout layer (and therefore the
    // video element) mounted so the cast session survives in-app
    // navigation — the user can stop it via the dashboard pill.
    if (cast.state === "casting" || cast.state === "connecting") return;
    unmountTimeoutRef.current = window.setTimeout(() => {
      unmountTimeoutRef.current = null;
      setPlaylist([]);
      setPlaylistIndex(0);
    }, 350);
  };

  const handleStopCastFromDashboard = () => {
    cast.stop();
    // Once cast is stopped, allow the workout layer to unmount
    // shortly after if we're not on the workout screen.
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
    <div className="relative mx-auto h-dvh w-full max-w-md overflow-hidden bg-stone-50 dark:bg-stone-950">
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          screen === "welcome" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <WelcomeScreen onSelect={handleSelectGender} />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          screen === "dashboard" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <DashboardScreen
          gender={gender}
          onSelectExercise={handleSelectExercise}
          themePref={themePref}
          onThemeChange={setTheme}
          onResetProfile={handleResetProfile}
          history={history}
          onClearHistory={clearHistory}
        />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
          screen === "workout" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {activeExercise && playlist.length > 0 && (
          <WorkoutScreen
            playlist={playlist}
            index={playlistIndex}
            active={screen === "workout"}
            gender={gender}
            onBack={handleBackFromWorkout}
            onChangeIndex={(next) =>
              setPlaylistIndex(Math.max(0, Math.min(playlist.length - 1, next)))
            }
            videoRef={videoRef}
            cast={cast}
            onOpenCastModal={() => setCastModalOpen(true)}
            onLogSession={logSession}
          />
        )}
      </div>

      {/* Casting pill — visible on dashboard while a cast session is
          alive, so the user can always stop the cast even after
          navigating away from the workout screen. */}
      {screen === "dashboard" &&
        activeExercise &&
        (cast.state === "casting" || cast.state === "connecting") && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-stone-900 py-2 pl-4 pr-2 text-white shadow-lg dark:bg-stone-50 dark:text-stone-900">
              <CastingIcon />
              <span className="text-sm font-medium">
                {cast.state === "connecting"
                  ? "Connecting…"
                  : `Casting ${activeExercise.name}`}
              </span>
              <button
                type="button"
                onClick={handleStopCastFromDashboard}
                className="ml-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide active:scale-95 dark:bg-stone-900/15"
              >
                Stop
              </button>
            </div>
          </div>
        )}

      <CastInstructionsModal
        open={castModalOpen}
        onClose={() => setCastModalOpen(false)}
      />

      <InstallPrompt />
    </div>
  );
}

export default App;
