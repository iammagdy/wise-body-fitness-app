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

function subCategorySlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function loopSourceFor(exercise: Exercise): string | null {
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

// ===== ID → illustration map =====
const ILLUSTRATION_BY_ID: Record<string, React.ComponentType> = {
  // ----- Strength
  m1: PushUpIllustration,
  m2: GluteBridgeIllustration,
  m3: StandingHoldIllustration, // Doorway Row
  m4: PikePushUpIllustration,
  w2: SplitSquatIllustration,
  w4: SquatIllustration,
  s1: JumpIllustration, // Jump Squat
  s2: PlankIllustration, // Superman Hold (held isometric)
  s3: SplitSquatIllustration, // Reverse Lunge
  s4: WallAngelsIllustration, // Towel Pull-Down
  s5: BirdDogIllustration, // Single-Leg Deadlift
  s6: PlankIllustration, // Pike Shoulder Tap
  // ----- Conditioning
  b1: PlankIllustration,
  b2: MountainClimberIllustration,
  c1: JumpIllustration, // Invisible Jump Rope
  c2: BurpeeIllustration,
  c3: SplitSquatIllustration, // Bodyweight Hip Hinge
  c4: JumpIllustration, // Tuck Jumps
  c5: PlankIllustration, // Plank Shoulder Taps
  c6: BearCrawlIllustration,
  c7: HighKneesIllustration,
  c8: DeadBugIllustration, // Bicycle Crunches (alt opposite limbs)
  // ----- Pregnancy Safe
  wh2: GluteBridgeIllustration, // Side-Lying Leg Raise
  wh3: CatCowIllustration, // Prenatal Cat-Cow
  wh4: GluteBridgeIllustration, // Pelvic Tilt
  ps1: StandingHoldIllustration, // Wall Sit
  ps2: SplitSquatIllustration, // Seated Towel Curl (held)
  ps3: StandingHoldIllustration, // Standing Calf Raise
  ps4: PlankIllustration, // Modified Side Plank
  ps5: HipCircleIllustration, // Standing Pelvic Rocks
  ps6: SquatIllustration, // Prenatal Squat Hold
  ps7: SeatedTwistIllustration, // Seated Spinal Twist
  // ----- Postpartum
  w1: GluteBridgeIllustration, // Hip Thrusts
  wh1: GluteBridgeIllustration, // Pelvic Floor Bridge
  wh5: BoxBreathingIllustration, // Diastasis Recovery Breath
  pp1: GluteBridgeIllustration,
  pp2: BirdDogIllustration,
  pp3: GluteBridgeIllustration, // Heel Slides
  pp4: WallPushUpIllustration,
  pp5: HipCircleIllustration, // Standing Pelvic Tilt
  pp6: DeadBugIllustration,
  pp7: HighKneesIllustration, // Seated March
  // ----- Hormonal
  w3: GluteBridgeIllustration, // Standing Donkey Kicks
  wh6: HeldStretchIllustration, // Hormonal Yoga Flow
  wh7: WalkIllustration, // Cortisol Reset Walk
  h1: HeldStretchIllustration, // Slow Yin Stretch
  h2: LegsUpWallIllustration,
  h3: HipCircleIllustration,
  h4: GluteBridgeIllustration, // Supported Bridge
  h5: NostrilBreathingIllustration,
  h6: SquatIllustration, // Goddess Pose (wide squat)
  h7: HeldStretchIllustration, // Reclined Butterfly
  // ----- Tech Neck
  rn1: NeckRollIllustration,
  rn2: ChinTuckIllustration,
  rn3: NeckRollIllustration, // Upper Trap Stretch
  tn1: WallAngelsIllustration, // Doorway Chest Opener
  tn2: NeckRollIllustration, // Levator Scapulae
  tn3: WallAngelsIllustration, // Scapular Squeezes
  tn4: WallAngelsIllustration,
  tn5: CatCowIllustration, // Thread the Needle
  tn6: ChinTuckIllustration, // Suboccipital Release
  tn7: ChinTuckIllustration, // Seated Neck Flexion
  // ----- Foot Care
  rf1: FootArchIllustration,
  rf2: FootCircleIllustration, // Toe Yoga
  rf3: CalfStretchIllustration,
  fc1: FootArchIllustration, // Plantar Fascia Press
  fc2: FootCircleIllustration, // Toe Splay
  fc3: WalkIllustration, // Heel Walks
  fc4: FootCircleIllustration, // Ankle Circles
  fc5: FootCircleIllustration, // Towel Scrunches
  fc6: StandingHoldIllustration, // Single-Leg Balance
  fc7: FootCircleIllustration, // Big Toe Stretch
  // ----- Tension Release
  r1: SplitSquatIllustration, // Standing Quad Stretch
  r2: HeldStretchIllustration, // Hamstring Stretch
  r3: ChildsPoseIllustration,
  r4: BoxBreathingIllustration,
  tr1: PigeonIllustration,
  tr2: HeldStretchIllustration, // Seated Forward Fold
  tr3: CatCowIllustration,
  tr4: CatCowIllustration, // Thoracic Extension
  tr5: HeldStretchIllustration, // Standing Forward Fold
  tr6: SeatedTwistIllustration, // Supine Twist
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
  videoRef,
}: {
  exercise: Exercise;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const src = loopSourceFor(exercise);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-gradient-to-br from-stone-200 to-stone-100 text-stone-600 shadow-inner ring-1 ring-stone-200/60 dark:from-stone-800 dark:to-stone-900 dark:text-stone-300 dark:ring-stone-800/60">
      <div className="absolute inset-0">
        <ResolvedIllustration exercise={exercise} />
      </div>
      {src && (
        <video
          ref={videoRef}
          key={src}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
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
};

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
        const onAvailability = (_e: AirPlayEvent) => {
          // Availability changes don't imply an active session;
          // only update if we're already mid-connect.
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

  return { state, support, start, stop };
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
    name: "Push-Up",
    targetMuscle: "Chest & Triceps",
    durationSeconds: 40,
    reps: 12,
    genderFocus: "men",
    mode: "reps",
    category: "core",
    sub_category: "Strength",
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
    name: "Standing Donkey Kicks",
    targetMuscle: "Glutes",
    durationSeconds: 30,
    reps: 15,
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
    name: "Standing Quad Stretch",
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
  { id: "s1", name: "Jump Squat", targetMuscle: "Quads & Glutes", durationSeconds: 40, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s2", name: "Superman Hold", targetMuscle: "Mid Back", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Strength" },
  { id: "s3", name: "Reverse Lunge", targetMuscle: "Legs & Glutes", durationSeconds: 45, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s4", name: "Towel Pull-Down", targetMuscle: "Lats", durationSeconds: 40, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s5", name: "Single-Leg Deadlift", targetMuscle: "Hamstrings", durationSeconds: 45, reps: 10, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },
  { id: "s6", name: "Pike Shoulder Tap", targetMuscle: "Shoulders", durationSeconds: 40, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Strength" },

  // Conditioning (additions)
  { id: "c1", name: "Invisible Jump Rope", targetMuscle: "Cardio", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning" },
  { id: "c2", name: "Burpees", targetMuscle: "Full Body", durationSeconds: 45, reps: 12, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning" },
  { id: "c3", name: "Bodyweight Hip Hinge", targetMuscle: "Posterior Chain", durationSeconds: 40, reps: 20, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning" },
  { id: "c4", name: "Tuck Jumps", targetMuscle: "Legs", durationSeconds: 30, reps: 10, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning" },
  { id: "c5", name: "Plank Shoulder Taps", targetMuscle: "Shoulders & Core", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning" },
  { id: "c6", name: "Bear Crawl", targetMuscle: "Full Body", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning" },
  { id: "c7", name: "High Knees", targetMuscle: "Cardio", durationSeconds: 30, reps: 1, genderFocus: "both", mode: "timed", category: "core", sub_category: "Conditioning" },
  { id: "c8", name: "Bicycle Crunches", targetMuscle: "Core", durationSeconds: 40, reps: 30, genderFocus: "both", mode: "reps", category: "core", sub_category: "Conditioning" },

  // Pregnancy Safe (additions)
  { id: "ps1", name: "Wall Sit", targetMuscle: "Quads", durationSeconds: 30, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps2", name: "Seated Towel Curl", targetMuscle: "Biceps", durationSeconds: 40, reps: 12, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps3", name: "Standing Calf Raise", targetMuscle: "Calves", durationSeconds: 40, reps: 15, genderFocus: "women", mode: "reps", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps4", name: "Modified Side Plank", targetMuscle: "Obliques", durationSeconds: 30, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe" },
  { id: "ps5", name: "Standing Pelvic Rocks", targetMuscle: "Hips", durationSeconds: 60, reps: 1, genderFocus: "women", mode: "timed", category: "womens_health", sub_category: "Pregnancy Safe" },
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
  { id: "fc1", name: "Plantar Fascia Press", targetMuscle: "Plantar Fascia", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Foot Care" },
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
  { id: "tr4", name: "Thoracic Extension", targetMuscle: "Thoracic", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release" },
  { id: "tr5", name: "Standing Forward Fold", targetMuscle: "Posterior Chain", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release" },
  { id: "tr6", name: "Supine Twist", targetMuscle: "Lower Back", durationSeconds: 60, reps: 1, genderFocus: "both", mode: "timed", category: "recovery", sub_category: "Tension Release" },
];

function WelcomeScreen({ onSelect }: { onSelect: (gender: Gender) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col px-6 pt-safe pb-safe">
      {/* Hero illustration */}
      <div className="relative mt-10 flex h-56 w-full items-center justify-center">
        <div
          className="absolute inset-0 mx-auto h-56 w-56 rounded-full opacity-80 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0) 70%)",
          }}
        />
        <div
          className="absolute inset-0 mx-auto h-56 w-56 translate-x-10 translate-y-4 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.30) 0%, rgba(245,158,11,0) 70%)",
          }}
        />
        <div className="relative z-10 h-44 w-44 text-stone-700 dark:text-stone-200">
          <BreathingLoop />
        </div>
      </div>

      <div className="mt-2 flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
          Home workouts · No equipment
        </p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          FitVision
        </h1>
        <p className="mt-3 max-w-xs text-base leading-snug text-stone-500 dark:text-stone-400">
          Strength, recovery and breathing sessions you can do in your living room — no gear required.
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
            <NoEquipmentBadge />
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
  onSelectExercise: (playlist: Exercise[], index: number) => void;
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
        {filtered.map((exercise, idx) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onClick={() => onSelectExercise(filtered, idx)}
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
}: {
  initialSeconds: number;
  nextLabel: string;
  onComplete: () => void;
  onSkip: () => void;
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
  onBack,
  onChangeIndex,
  videoRef,
  cast,
  onOpenCastModal,
}: {
  playlist: Exercise[];
  index: number;
  active: boolean;
  onBack: () => void;
  onChangeIndex: (next: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cast: ReturnType<typeof useCast>;
  onOpenCastModal: () => void;
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
  const [totalSets, setTotalSets] = useState(1);
  const [setNumber, setSetNumber] = useState(1);
  const [phase, setPhase] = useState<"intro" | "exercise" | "rest">("intro");
  const REST_SECONDS = 20;

  // Reset session whenever the exercise changes
  useEffect(() => {
    if (!exercise) return;
    setSetNumber(1);
    setTotalSets(1);
    setPhase("intro");
  }, [exercise?.id]);

  // Stop intro/rest if the screen becomes inactive
  useEffect(() => {
    if (!active) {
      cancel();
    }
  }, [active, cancel]);

  const handleSetComplete = useCallback(() => {
    if (setNumber < totalSets) {
      setPhase("rest");
      return;
    }
    // Last set finished — auto-advance if there's a next exercise,
    // otherwise drop back to dashboard.
    if (hasNext) {
      setPhase("rest");
    } else {
      window.setTimeout(onBack, 350);
    }
  }, [setNumber, totalSets, hasNext, onBack]);

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
      window.setTimeout(onBack, 200);
    }
  }, [setNumber, totalSets, hasNext, onChangeIndex, index, onBack]);

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
          <button
            type="button"
            onClick={async () => {
              if (cast.state === "casting") {
                cast.stop();
                return;
              }
              const result = await cast.start();
              // Only fall back to the help modal when the platform
              // genuinely can't cast. A "failed" result usually means
              // the user dismissed the picker — don't nag them.
              if (result === "unsupported") onOpenCastModal();
            }}
            aria-label={
              cast.state === "casting" ? "Stop casting to TV" : "Cast to TV"
            }
            aria-pressed={cast.state === "casting"}
            title={cast.state === "casting" ? "Casting…" : "Cast to TV"}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-full px-3 shadow-sm transition active:scale-95 ${
              cast.state === "casting"
                ? "bg-stone-900 text-white active:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:active:bg-stone-200"
                : "bg-white text-stone-900 active:bg-stone-100 dark:bg-stone-800 dark:text-stone-50 dark:active:bg-stone-700"
            }`}
          >
            {cast.state === "casting" ? <CastingIcon /> : <CastIcon />}
            {cast.state === "casting" && (
              <span className="text-xs font-semibold uppercase tracking-wide">
                Casting · Stop
              </span>
            )}
            {cast.state === "connecting" && (
              <span className="text-xs font-semibold uppercase tracking-wide">
                Connecting…
              </span>
            )}
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
        <ExerciseLoop exercise={exercise} videoRef={videoRef} />
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
          <NoEquipmentBadge />
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
      {active && phase === "intro" && (
        <CountdownIntro
          onDone={() => setPhase("exercise")}
          onSkip={() => setPhase("exercise")}
        />
      )}
      {active && phase === "rest" && (
        <RestScreen
          initialSeconds={REST_SECONDS}
          nextLabel={
            setNumber < totalSets
              ? `${exercise.name} · Set ${setNumber + 1}`
              : nextExercise?.name ?? "Workout complete"
          }
          onComplete={handleRestComplete}
          onSkip={handleRestComplete}
        />
      )}
    </div>
  );
}

function App() {
  const { pref: themePref, setTheme } = useTheme();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [gender, setGender] = useState<Gender | null>(null);
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

  const handleSelectGender = (g: Gender) => {
    setGender(g);
    setScreen("dashboard");
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
            onBack={handleBackFromWorkout}
            onChangeIndex={(next) =>
              setPlaylistIndex(Math.max(0, Math.min(playlist.length - 1, next)))
            }
            videoRef={videoRef}
            cast={cast}
            onOpenCastModal={() => setCastModalOpen(true)}
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
    </div>
  );
}

export default App;
