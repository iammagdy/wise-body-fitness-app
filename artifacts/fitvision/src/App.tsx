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
const LOOP_MANIFEST = new Set<string>([]);

function subCategorySlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function loopSourceFor(exercise: Exercise): string | null {
  if (LOOP_MANIFEST.has(exercise.id)) return `loops/${exercise.id}.mp4`;
  const slug = subCategorySlug(exercise.sub_category);
  if (LOOP_MANIFEST.has(slug)) return `loops/${slug}.mp4`;
  return null;
}

function GenericMovementLoop() {
  // Animated SVG: three concentric breathing rings + a sweeping
  // motion arc. Tasteful, theme-friendly, deterministic.
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="loop-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#loop-bg)" />
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        opacity="0.55"
      >
        <circle cx="100" cy="100" r="30">
          <animate
            attributeName="r"
            values="28;42;28"
            dur="3.2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.85;0.35;0.85"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="100" cy="100" r="50">
          <animate
            attributeName="r"
            values="46;64;46"
            dur="3.2s"
            begin="0.3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.55;0.18;0.55"
            dur="3.2s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="100" cy="100" r="74">
          <animate
            attributeName="r"
            values="70;88;70"
            dur="3.2s"
            begin="0.6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.35;0.08;0.35"
            dur="3.2s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <g transform="translate(100 100)">
        <g>
          <path
            d="M -36 0 A 36 36 0 0 1 36 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="6s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    </svg>
  );
}

function ExerciseLoop({ exercise }: { exercise: Exercise }) {
  const src = loopSourceFor(exercise);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
      <div className="absolute inset-0">
        <GenericMovementLoop />
      </div>
      {src && (
        <video
          key={src}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            // Hide the broken video and keep the SVG fallback visible
            (e.currentTarget as HTMLVideoElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}

type Gender = "man" | "woman";
type Screen = "welcome" | "dashboard" | "workout";
type Mode = "timed" | "reps";
type Category = "core" | "womens_health" | "recovery";

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
};

const EXERCISES: Exercise[] = [
  // ----- Core (Workout) -----
  {
    id: "m1",
    name: "Barbell Bench Press",
    targetMuscle: "Chest",
    durationSeconds: 45,
    reps: 10,
    genderFocus: "men",
    mode: "timed",
    category: "core",
    sub_category: "Strength",
  },
  {
    id: "m2",
    name: "Deadlift",
    targetMuscle: "Back & Hamstrings",
    durationSeconds: 60,
    reps: 8,
    genderFocus: "men",
    mode: "timed",
    category: "core",
    sub_category: "Strength",
  },
  {
    id: "m3",
    name: "Pull-Ups",
    targetMuscle: "Lats & Biceps",
    durationSeconds: 30,
    reps: 12,
    genderFocus: "men",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
  },
  {
    id: "m4",
    name: "Overhead Press",
    targetMuscle: "Shoulders",
    durationSeconds: 40,
    reps: 10,
    genderFocus: "men",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
  },
  {
    id: "w2",
    name: "Bulgarian Split Squat",
    targetMuscle: "Quads & Glutes",
    durationSeconds: 45,
    reps: 12,
    genderFocus: "women",
    mode: "timed",
    category: "core",
    sub_category: "Strength",
  },
  {
    id: "w4",
    name: "Goblet Squat",
    targetMuscle: "Quads & Glutes",
    durationSeconds: 40,
    reps: 12,
    genderFocus: "women",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
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
  },
  // Hormonal
  {
    id: "w3",
    name: "Cable Kickbacks",
    targetMuscle: "Glutes",
    durationSeconds: 30,
    reps: 20,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    sub_category: "Hormonal",
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
  },
  // Tension Release
  {
    id: "r1",
    name: "Foam Roll Quads",
    targetMuscle: "Quads",
    durationSeconds: 60,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    sub_category: "Tension Release",
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
  },

  // ===== Expanded library (Task #12) =====

  // Strength (additions)
  { id: "s1", name: "Barbell Back Squat", targetMuscle: "Quads & Glutes", durationSeconds: 60, reps: 8, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s2", name: "Bent-Over Row", targetMuscle: "Mid Back", durationSeconds: 45, reps: 10, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s3", name: "Dumbbell Lunge", targetMuscle: "Legs & Glutes", durationSeconds: 45, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s4", name: "Lat Pulldown", targetMuscle: "Lats", durationSeconds: 40, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s5", name: "Romanian Deadlift", targetMuscle: "Hamstrings", durationSeconds: 45, reps: 10, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s6", name: "Seated Shoulder Press", targetMuscle: "Shoulders", durationSeconds: 40, reps: 10, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },

  // Conditioning (additions)
  { id: "c1", name: "Jump Rope", targetMuscle: "Cardio", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning" },
  { id: "c2", name: "Burpees", targetMuscle: "Full Body", durationSeconds: 45, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning" },
  { id: "c3", name: "Kettlebell Swings", targetMuscle: "Posterior Chain", durationSeconds: 40, reps: 20, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning" },
  { id: "c4", name: "Box Jumps", targetMuscle: "Legs", durationSeconds: 30, reps: 10, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning" },
  { id: "c5", name: "Battle Ropes", targetMuscle: "Shoulders & Cardio", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning" },
  { id: "c6", name: "Sled Push", targetMuscle: "Full Body", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning" },
  { id: "c7", name: "High Knees", targetMuscle: "Cardio", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning" },
  { id: "c8", name: "Bicycle Crunches", targetMuscle: "Core", durationSeconds: 40, reps: 30, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning" },

  // Pregnancy Safe (additions)
  { id: "ps1", name: "Wall Sit", targetMuscle: "Quads", durationSeconds: 30, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps2", name: "Seated Bicep Curl", targetMuscle: "Biceps", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps3", name: "Standing Calf Raise", targetMuscle: "Calves", durationSeconds: 40, reps: 15, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps4", name: "Modified Side Plank", targetMuscle: "Obliques", durationSeconds: 30, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps5", name: "Birth Ball Bounce", targetMuscle: "Hips", durationSeconds: 60, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps6", name: "Prenatal Squat Hold", targetMuscle: "Pelvic Floor", durationSeconds: 30, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps7", name: "Seated Spinal Twist", targetMuscle: "Spine", durationSeconds: 45, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe" },

  // Postpartum (additions)
  { id: "pp1", name: "Glute Bridge", targetMuscle: "Glutes", durationSeconds: 40, reps: 15, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum" },
  { id: "pp2", name: "Bird Dog", targetMuscle: "Core & Back", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum" },
  { id: "pp3", name: "Heel Slides", targetMuscle: "Deep Core", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum" },
  { id: "pp4", name: "Wall Push-Up", targetMuscle: "Chest", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum" },
  { id: "pp5", name: "Standing Pelvic Tilt", targetMuscle: "Lower Back", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum" },
  { id: "pp6", name: "Dead Bug", targetMuscle: "Deep Core", durationSeconds: 45, reps: 10, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum" },
  { id: "pp7", name: "Seated March", targetMuscle: "Hip Flexors", durationSeconds: 45, reps: 20, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Postpartum" },

  // Hormonal (additions)
  { id: "h1", name: "Slow Yin Stretch", targetMuscle: "Full Body", durationSeconds: 180, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal" },
  { id: "h2", name: "Legs-Up-The-Wall", targetMuscle: "Lymphatic", durationSeconds: 240, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal" },
  { id: "h3", name: "Gentle Hip Circles", targetMuscle: "Hips", durationSeconds: 60, reps: 10, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Hormonal" },
  { id: "h4", name: "Supported Bridge", targetMuscle: "Adrenals", durationSeconds: 120, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal" },
  { id: "h5", name: "Alternate Nostril Breathing", targetMuscle: "Nervous System", durationSeconds: 180, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal" },
  { id: "h6", name: "Goddess Pose", targetMuscle: "Inner Thighs", durationSeconds: 60, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal" },
  { id: "h7", name: "Reclined Butterfly", targetMuscle: "Hips & Pelvis", durationSeconds: 120, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Hormonal" },

  // Tech Neck (additions)
  { id: "tn1", name: "Doorway Chest Opener", targetMuscle: "Chest", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tech Neck" },
  { id: "tn2", name: "Levator Scapulae Stretch", targetMuscle: "Neck Side", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tech Neck" },
  { id: "tn3", name: "Scapular Squeezes", targetMuscle: "Rhomboids", durationSeconds: 30, reps: 15, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Tech Neck" },
  { id: "tn4", name: "Wall Angels", targetMuscle: "Upper Back", durationSeconds: 45, reps: 12, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Tech Neck" },
  { id: "tn5", name: "Thread the Needle", targetMuscle: "Thoracic Spine", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tech Neck" },
  { id: "tn6", name: "Suboccipital Release", targetMuscle: "Skull Base", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tech Neck" },
  { id: "tn7", name: "Seated Neck Flexion", targetMuscle: "Neck", durationSeconds: 30, reps: 10, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Tech Neck" },

  // Foot Care (additions)
  { id: "fc1", name: "Tennis Ball Roll", targetMuscle: "Plantar Fascia", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care" },
  { id: "fc2", name: "Toe Splay", targetMuscle: "Toes", durationSeconds: 30, reps: 15, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Foot Care" },
  { id: "fc3", name: "Heel Walks", targetMuscle: "Shin & Foot", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care" },
  { id: "fc4", name: "Ankle Circles", targetMuscle: "Ankles", durationSeconds: 30, reps: 10, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Foot Care" },
  { id: "fc5", name: "Towel Scrunches", targetMuscle: "Foot Intrinsics", durationSeconds: 45, reps: 15, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Foot Care" },
  { id: "fc6", name: "Single-Leg Balance", targetMuscle: "Foot & Ankle", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care" },
  { id: "fc7", name: "Big Toe Stretch", targetMuscle: "Big Toe", durationSeconds: 45, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care" },

  // Tension Release (additions)
  { id: "tr1", name: "Pigeon Pose", targetMuscle: "Hips", durationSeconds: 90, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release" },
  { id: "tr2", name: "Seated Forward Fold", targetMuscle: "Hamstrings", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release" },
  { id: "tr3", name: "Cat-Cow Flow", targetMuscle: "Spine", durationSeconds: 60, reps: 10, genderFocus: "both", mode: "reps", category: "recovery", sub_category: "Tension Release" },
  { id: "tr4", name: "Foam Roll Upper Back", targetMuscle: "Thoracic", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release" },
  { id: "tr5", name: "Standing Forward Fold", targetMuscle: "Posterior Chain", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release" },
  { id: "tr6", name: "Supine Twist", targetMuscle: "Lower Back", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release" },
];

function WelcomeScreen({ onSelect }: { onSelect: (gender: Gender) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      <div className="mb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          FitVision
        </h1>
        <p className="mt-3 text-base text-stone-500 dark:text-stone-400">
          Your personal fitness journey
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
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

function ExerciseCard({
  exercise,
  onClick,
}: {
  exercise: Exercise;
  onClick: () => void;
}) {
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
      className="mb-4 cursor-pointer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100 transition hover:shadow-md active:scale-[0.99] active:bg-stone-50 dark:bg-stone-900 dark:ring-stone-800 dark:active:bg-stone-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-stone-900 dark:text-stone-50">
            {exercise.name}
          </h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{exercise.targetMuscle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          {exercise.genderFocus === "both" ? "All" : exercise.genderFocus}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/60">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            {exercise.mode === "timed" ? "Duration" : "Reps"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-50">
            {exercise.mode === "timed"
              ? `${exercise.durationSeconds}s`
              : exercise.reps}
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/60">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Mode
          </p>
          <p className="mt-0.5 text-sm font-semibold capitalize text-stone-900 dark:text-stone-50">
            {exercise.mode}
          </p>
        </div>
      </div>
    </div>
  );
}

type TabDef = { id: Category; label: string; icon: string };

const ALL_TABS: TabDef[] = [
  { id: "core", label: "Workout", icon: "💪" },
  { id: "womens_health", label: "Women's Health", icon: "🌸" },
  { id: "recovery", label: "Recovery", icon: "🩹" },
];

const CATEGORY_HEADINGS: Record<Category, string> = {
  core: "Today's workout",
  womens_health: "Women's health",
  recovery: "Recovery & mobility",
};

const SUB_CATEGORIES: Partial<Record<Category, string[]>> = {
  womens_health: ["Pregnancy Safe", "Postpartum", "Hormonal"],
  recovery: ["Tech Neck", "Foot Care", "Tension Release"],
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
              <span className="text-2xl leading-none" aria-hidden="true">
                {tab.icon}
              </span>
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

function DashboardScreen({
  gender,
  onSelectExercise,
  themePref,
  onThemeChange,
}: {
  gender: Gender | null;
  onSelectExercise: (exercise: Exercise) => void;
  themePref: ThemePref;
  onThemeChange: (next: ThemePref) => void;
}) {
  const [category, setCategory] = useState<Category>("core");
  const chips = SUB_CATEGORIES[category];
  const [activeChip, setActiveChip] = useState<string>(chips?.[0] ?? "");

  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter(
      (t) => !(t.id === "womens_health" && gender === "man"),
    );
  }, [gender]);

  // If gender changes to man while womens_health is active, snap back to core.
  useEffect(() => {
    if (gender === "man" && category === "womens_health") {
      setCategory("core");
    }
  }, [gender, category]);

  // Reset to the first chip whenever the active tab changes.
  useEffect(() => {
    const next = SUB_CATEGORIES[category]?.[0] ?? "";
    setActiveChip(next);
  }, [category]);

  const handleCategoryChange = (next: Category) => {
    setActiveChip(SUB_CATEGORIES[next]?.[0] ?? "");
    setCategory(next);
  };

  const filtered = useMemo(() => {
    if (!gender) return [];
    const focus = gender === "man" ? "men" : "women";
    return EXERCISES.filter((e) => {
      if (e.category !== category) return false;
      if (!(e.genderFocus === focus || e.genderFocus === "both")) return false;
      if (chips && activeChip && e.sub_category !== activeChip) return false;
      return true;
    });
  }, [gender, category, chips, activeChip]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <header className="pt-safe shrink-0 px-6 pb-4" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 32px)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
              {CATEGORY_HEADINGS[category]}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
              FitVision
            </h1>
          </div>
          <ThemeMenu pref={themePref} onSelect={onThemeChange} />
        </div>
      </header>

      {chips && (
        <ChipRow
          chips={chips}
          active={activeChip}
          onChange={setActiveChip}
        />
      )}

      <div
        className="no-scrollbar list-fade min-h-0 flex-1 overflow-y-auto px-6 pt-2"
        style={{ paddingBottom: 100 }}
      >
        {filtered.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onClick={() => onSelectExercise(exercise)}
          />
        ))}
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

function SpeakerOnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
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
}: {
  exercise: Exercise;
  active: boolean;
  cues: ArabicCues;
  speak: (text: string) => void;
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

  // Reset whenever a different exercise is opened
  useEffect(() => {
    clearTimer();
    setSecondsLeft(exercise.durationSeconds);
    setRunning(false);
    return () => {
      clearTimer();
    };
  }, [exercise.id, exercise.durationSeconds]);

  // Stop ticking immediately when the workout layer is no longer active
  useEffect(() => {
    if (!active) {
      clearTimer();
      setRunning(false);
    }
  }, [active]);

  // Reset mid-cue gate when the exercise changes
  const midCueFiredRef = useRef(false);
  useEffect(() => {
    midCueFiredRef.current = false;
  }, [exercise.id]);

  // Drive the interval based on `running` (only while active)
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
          // End cue
          speak(cues.end);
          return 0;
        }
        const next = prev - 1;
        // Mid cue: fire once when we cross the midpoint
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
  }, [running, active, exercise.durationSeconds, cues, speak]);

  const toggle = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(exercise.durationSeconds);
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div
        className="text-center font-mono font-bold tabular-nums text-stone-900 dark:text-stone-50"
        style={{ fontSize: 72, lineHeight: 1 }}
      >
        {formatTime(secondsLeft)}
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? "Pause" : "Play"}
        className="mt-10 flex items-center justify-center rounded-full bg-stone-900 text-white shadow-lg transition active:scale-95 active:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:active:bg-stone-200"
        style={{ width: 80, height: 80 }}
      >
        {running ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}

function RepsBody({
  exercise,
  onDone,
  cues,
  speak,
}: {
  exercise: Exercise;
  onDone: () => void;
  cues: ArabicCues;
  speak: (text: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col px-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Reps
        </p>
        <div
          className="mt-2 text-center font-bold tabular-nums text-stone-900 dark:text-stone-50"
          style={{ fontSize: 120, lineHeight: 1 }}
        >
          {exercise.reps}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          // Speak the end cue, then defer navigation slightly so the
          // utterance isn't immediately cancelled by the workout
          // screen's unmount cleanup.
          speak(cues.end);
          window.setTimeout(onDone, 700);
        }}
        className="mb-6 w-full rounded-2xl bg-stone-900 px-6 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:active:bg-stone-200"
        style={{ minHeight: 60 }}
      >
        Done
      </button>
    </div>
  );
}

function WorkoutScreen({
  exercise,
  active,
  onBack,
}: {
  exercise: Exercise | null;
  active: boolean;
  onBack: () => void;
}) {
  const [mutedStr, setMutedStr] = useLocalStorage<"1" | "0">(
    VOICE_MUTED_KEY,
    "1",
    (v): v is "1" | "0" => v === "1" || v === "0",
  );
  const muted = mutedStr === "1";
  const { speak, cancel, supported, hasArabicVoice } = useArabicVoice(muted);

  const cues = exercise ? getCuesFor(exercise) : DEFAULT_CUES;

  // Speak the start cue shortly after the screen becomes active for
  // this exercise. Cancel any in-flight speech when we leave.
  useEffect(() => {
    if (!exercise || !active) return;
    const t = window.setTimeout(() => {
      speak(cues.start);
    }, 800);
    return () => {
      window.clearTimeout(t);
      cancel();
    };
  }, [exercise?.id, active, cues, speak, cancel]);

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

      {/* Top 40% looping animation slot */}
      <div className="shrink-0 px-4 pt-3" style={{ height: "40%" }}>
        <ExerciseLoop exercise={exercise} />
      </div>

      {/* Honest UX fallback if no Arabic voice available */}
      {showVoiceUnavailableHint && (
        <div className="shrink-0 px-6 pt-2">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Arabic voice unavailable on this device
          </p>
        </div>
      )}

      {/* Exercise name */}
      <div className="shrink-0 px-6 pt-4 pb-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          {exercise.name}
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {exercise.targetMuscle}
        </p>
      </div>

      {/* Mode-conditional body */}
      {exercise.mode === "timed" ? (
        <TimedBody
          exercise={exercise}
          active={active}
          cues={cues}
          speak={speak}
        />
      ) : (
        <RepsBody
          exercise={exercise}
          onDone={onBack}
          cues={cues}
          speak={speak}
        />
      )}
    </div>
  );
}

function App() {
  const { pref: themePref, setTheme } = useTheme();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [gender, setGender] = useState<Gender | null>(null);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
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

  const handleSelectGender = (g: Gender) => {
    setGender(g);
    setScreen("dashboard");
  };

  const handleSelectExercise = (exercise: Exercise) => {
    cancelPendingUnmount();
    setActiveExercise(exercise);
    setScreen("workout");
  };

  const handleBackFromWorkout = () => {
    setScreen("dashboard");
    // Unmount workout content after the fade-out completes so the
    // timer interval is fully torn down and no ticks linger. Cancel
    // any pending unmount first so a rapid reopen can't blank the
    // newly-opened workout screen.
    cancelPendingUnmount();
    unmountTimeoutRef.current = window.setTimeout(() => {
      unmountTimeoutRef.current = null;
      setActiveExercise(null);
    }, 350);
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
        />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
          screen === "workout" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {activeExercise && (
          <WorkoutScreen
            exercise={activeExercise}
            active={screen === "workout"}
            onBack={handleBackFromWorkout}
          />
        )}
      </div>
    </div>
  );
}

export default App;
