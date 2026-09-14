import { useState, useEffect, useCallback } from "react";
import type { Category, Equipment, Language } from "../types/workout";

export type { Language };

export const LANG_STORAGE_KEY = "fitvision.lang";

export const TRANSLATIONS = {
  en: {
    // Brand & general
    appName: "Wise Body",
    tagline: "Pro Athletic Fitness",
    version: "v2.0 Athletic",
    
    // Welcome screen
    welcomeTitle: "WISE BODY — WORLD-CLASS ATHLETIC TRAINING",
    welcomeSubtitle: "Choose your performance focus track. Customized video circuits, scientific calorie analytics, and wireless TV casting.",
    feature1: "82 HD Studio Video Loops",
    feature2: "Wireless TV Screen Cast",
    feature3: "Technique Coaching Tips",
    feature4: "Arabic & English Coaching",
    selectTrack: "Select your athletic track",
    mensTrackTitle: "Men's Athletic Track",
    mensTrackBadge: "Men's Track",
    mensTrackDesc: "Core hypertrophy, explosive conditioning, and upper-body power.",
    womensTrackTitle: "Women's Sculpt Track",
    womensTrackBadge: "Women's Sculpt",
    womensTrackDesc: "Pilates-inspired deep core, pelvic floor activation, and glute sculpting.",
    changeTrackNotice: "You can change tracks or recalibrate your metrics anytime in settings.",

    // Dashboard
    castTV: "Cast TV",
    dailyFeatured: "Daily Featured Session",
    minBurn: "~15 min burn",
    focusOn: "Focus",
    gear: "Gear",
    start: "Start",
    startWorkout: "Start Workout",
    curatedRoutines: "Curated Fast Routines",
    oneTapCircuit: "1-Tap Circuit",
    todayActivity: "Today's Athletic Activity",
    readyForAction: "Ready for action. Complete a session to log your metrics.",
    loggedToday: "{count} session{plural} logged today",
    dayStreak: "Day Streak",
    sessions: "Sessions",
    sets: "Sets",
    minutes: "Minutes",
    calories: "Calories",
    last7Days: "Last 7 Days Matrix",
    activityVolume: "Activity Volume",
    recentHistory: "Recent Sessions",
    clearHistory: "Clear",
    clearConfirm: "Clear all workout history?",
    yes: "Yes",
    no: "No",
    noExercises: "No exercises found in this category.",
    all: "All",
    estimatedCalories: "~{count} kcal",
    estimatedMinutes: "{count}m",

    // Categories
    cat_core: "Core & Abs",
    cat_womens_health: "Women's Health",
    cat_recovery: "Recovery & Mobility",
    cat_core_heading: "Core, Stability & Athletic Conditioning",
    cat_womens_health_heading: "Pelvic Floor, Hormonal Balance & Sculpt",
    cat_recovery_heading: "Mobility, Decompression & Breathing",

    // Workout Screen
    exerciseCount: "Exercise {current} of {total}",
    targetMuscle: "Target: {muscle}",
    setCount: "Set {current} of {total}",
    repsTarget: "Target {count} reps",
    reps: "Reps",
    completeSet: "Complete set",
    restTitle: "Rest",
    upNext: "Up Next",
    skipRest: "Skip rest",
    getReady: "Get Ready",
    tapToSkip: "Tap anywhere to skip",
    finalExerciseMsg: "Final exercise — finish strong! 🏆",
    exit: "Exit",
    castToTV: "Cast to TV",
    aiCoach: "AI Coach",
    soundOn: "Sound on",
    soundOff: "Sound off",
    coachingTips: "Technique Tips",
    hideTips: "Hide Tips",

    // Summary
    workoutComplete: "Workout Complete",
    greatWork: "Great work!",
    summaryDesc: "Here's what you just accomplished.",
    exercisesDone: "Exercises",
    setsDone: "Sets",
    timeElapsed: "Time",
    burnedKcal: "Burned",
    shareStoryCard: "Share Story Card (9:16)",
    done: "Done",

    // Athlete Profile Modal
    calibrateTitle: "Athlete Profile Calibration",
    calibrateSubtitle: "Calibrate your body weight for accurate MET calorie calculations.",
    weightLabel: "Body Weight",
    heightLabel: "Height (cm)",
    saveCalibration: "Save Profile",
    kg: "kg",
    lbs: "lbs",

    // Heart Rate & Bluetooth
    heartRate: "Heart Rate",
    connectHR: "Connect Heart Rate Monitor",
    hrConnected: "HR Connected",
    warmupZone: "Warmup",
    fatBurnZone: "Fat Burn",
    cardioZone: "Cardio",
    peakZone: "Peak",

    // Language switcher
    switchLanguage: "عربي",
    languageName: "English",
  },

  ar: {
    // Brand & general
    appName: "وايز بودي",
    tagline: "تدريب رياضي احترافي",
    version: "إصدار ٢.٠ رياضي",

    // Welcome screen
    welcomeTitle: "وايز بودي — تدريب رياضي بمستوى عالمي",
    welcomeSubtitle: "اختر مسارك الرياضي المركز. تمارين استوديو فيديو مخصصة، حساب سعرات علمي دقيق، وبث لاسلكي للشاشات الذكية.",
    feature1: "٨٢ تمريناً بفيديوهات استوديو عالية الدقة",
    feature2: "بث لاسلكي مباشر على شاشات التلفزيون",
    feature3: "إرشادات وتوجيهات تقنية للحركات",
    feature4: "توجيهات صوتية فورية بالعربية والإنجليزية",
    selectTrack: "اختر مسارك الرياضي",
    mensTrackTitle: "مسار الرجال الرياضي",
    mensTrackBadge: "مسار الرجال",
    mensTrackDesc: "تضخيم وبناء عضلات البطن، لياقة حركية متفجرة، وقوة الجزء العلوي.",
    womensTrackTitle: "مسار النحت للسيدات",
    womensTrackBadge: "مسار النحت",
    womensTrackDesc: "بيلاتس لنحت الكور العميق، تنشيط عضلات الحوض، ونحت وتقوية الأرداف.",
    changeTrackNotice: "يمكنك تغيير مسارك أو معايرة بياناتك في أي وقت من الإعدادات.",

    // Dashboard
    castTV: "بث TV",
    dailyFeatured: "جلسة الاستوديو اليومية",
    minBurn: "حرق ~١٥ دقيقة",
    focusOn: "التركيز",
    gear: "الأدوات",
    start: "ابدأ",
    startWorkout: "بدء التمرين",
    curatedRoutines: "دوائر تدريبية سريعة",
    oneTapCircuit: "دائرة بضغطة واحدة",
    todayActivity: "نشاطك الرياضي اليوم",
    readyForAction: "جاهز للبدء! أكمل جلسة تمرين لتسجيل مؤشراتك الرياضية.",
    loggedToday: "تم تسجيل {count} جلسة اليوم",
    dayStreak: "أيام متتالية",
    sessions: "الجلسات",
    sets: "المجموعات",
    minutes: "الدقائق",
    calories: "السعرات",
    last7Days: "مصفوفة آخر ٧ أيام",
    activityVolume: "حجم النشاط",
    recentHistory: "أحدث التمارين",
    clearHistory: "مسح",
    clearConfirm: "هل تريد مسح سجل التمارين بالكامل؟",
    yes: "نعم",
    no: "لا",
    noExercises: "لا توجد تمارين في هذا القسم حالياً.",
    all: "الكل",
    estimatedCalories: "~{count} سعرة",
    estimatedMinutes: "{count} دقيقة",

    // Categories
    cat_core: "عضلات البطن والوسط",
    cat_womens_health: "صحة المرأة والنحت",
    cat_recovery: "الاستشفاء والمرونة",
    cat_core_heading: "عضلات البطن، الثبات واللياقة الرياضية",
    cat_womens_health_heading: "قاع الحوض، التوازن الهرموني ونحت القوام",
    cat_recovery_heading: "المرونة الحركية، إطالة المفاصل والتنفس",

    // Workout Screen
    exerciseCount: "تمرين {current} من {total}",
    targetMuscle: "المستهدف: {muscle}",
    setCount: "المجموعة {current} من {total}",
    repsTarget: "المستهدف {count} تكرار",
    reps: "تكرارات",
    completeSet: "إنهاء المجموعة",
    restTitle: "فترة راحة",
    upNext: "التالي",
    skipRest: "تخطي الراحة",
    getReady: "استعد",
    tapToSkip: "اضغط في أي مكان للتخطي",
    finalExerciseMsg: "التمرين الأخير — أنهِ بقوة وأداء بطولي! 🏆",
    exit: "خروج",
    castToTV: "بث على التلفزيون",
    aiCoach: "مدرب AI",
    soundOn: "تشغيل الصوت",
    soundOff: "كتم الصوت",
    coachingTips: "إرشادات الأداء",
    hideTips: "إخفاء الإرشادات",

    // Summary
    workoutComplete: "اكتمل التمرين بنجاح",
    greatWork: "عمل رائع! أداء بطولي",
    summaryDesc: "إليك ملخص أدائك الرياضي في هذه الجلسة.",
    exercisesDone: "التمارين",
    setsDone: "المجموعات",
    timeElapsed: "الوقت",
    burnedKcal: "المحروق",
    shareStoryCard: "مشاركة بطاقة الستوري (9:16)",
    done: "تم",

    // Athlete Profile Modal
    calibrateTitle: "معايرة بيانات المتدرب",
    calibrateSubtitle: "معايرة وزن الجسم لحساب السعرات الحرارية بدقة علمية (معادلة MET).",
    weightLabel: "وزن الجسم",
    heightLabel: "الطول (سم)",
    saveCalibration: "حفظ المعايرة",
    kg: "كجم",
    lbs: "باوند",

    // Heart Rate & Bluetooth
    heartRate: "نبضات القلب",
    connectHR: "ربط حساس نبضات القلب",
    hrConnected: "تم ربط النبض",
    warmupZone: "إحماء",
    fatBurnZone: "حرق دهون",
    cardioZone: "كارديو",
    peakZone: "الذروة",

    // Language switcher
    switchLanguage: "English",
    languageName: "العربية",
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.en;

// Subcategories Arabic translation map
export const SUB_CATEGORIES_AR: Record<string, string> = {
  "Abs & Core": "عضلات البطن والوسط",
  "Strength": "القوة العضلية",
  "Conditioning": "اللياقة والتحمل",
  "Posture": "استقامة القوام",
  "Pelvic Floor": "قاع الحوض",
  "Postpartum Recovery": "استشفاء ما بعد الولادة",
  "Hormonal Health": "التوازن الهرموني",
  "Neck & Traps": "الرقبة والأكتاف",
  "Feet & Ankles": "القدمين والكاحل",
  "Total Body Reset": "استشفاء الجسم بالكامل",
};

// Equipment Arabic translation map
export const EQUIPMENT_AR: Record<string, string> = {
  none: "بدون أدوات",
  mat: "سجادة رياضية",
  wall: "حائط",
  chair: "كرسي",
  doorway: "إطار الباب",
  towel: "منشفة",
  band: "شريط مقاومة",
  light_dumbbell: "دمبل خفيف",
};

// Muscle groups Arabic translation map
export const MUSCLES_AR: Record<string, string> = {
  "Rectus Abdominis": "عضلات البطن المستقيمة",
  "Obliques": "العضلات الجانبية (الخواصر)",
  "Transverse Abdominis": "عضلات البطن العميقة",
  "Chest": "الصدر",
  "Back": "الظهر",
  "Glutes": "الأرداف والحوض",
  "Hamstrings": "الخلفيات",
  "Quadriceps": "الفخذ الأمامي",
  "Calves": "السمانة",
  "Shoulders": "الأكتاف",
  "Neck": "الرقبة",
  "Spine": "العمود الفقري",
  "Full Body": "كامل الجسم",
  "Pelvic Floor": "قاع الحوض",
  "Feet & Ankles": "القدمين والكاحل",
};

// Curated Routines localized titles & descriptions
export const ROUTINE_TRANSLATIONS: Record<string, { arTitle: string; arSubtitle: string; arDesc: string }> = {
  "morning-shred": {
    arTitle: "دائرة الحرق الصباحي المكثف",
    arSubtitle: "تنشيط فوري لمعدل الأيض",
    arDesc: "تمارين مركبة لرفع الحرق وبدء اليوم بطاقة ونشاط متفجر.",
  },
  "core-igniter": {
    arTitle: "نحت البطن ودرع الكور",
    arSubtitle: "تفعيل شامل لحزام البطن والوسط",
    arDesc: "تقوية العضلات المستقيمة والجانبية للثبات والقوة الرياضية.",
  },
  "posture-spine-reset": {
    arTitle: "استشفاء العمود الفقري والرقبة",
    arSubtitle: "علاج إجهاد الجلوس المكتبي",
    arDesc: "تخفيف الضغط عن الرقبة والفقرات الصدرية واستعادة توازن القوام.",
  },
  "lower-body-sculpt": {
    arTitle: "نحت وتقوية الحوض والأرداف",
    arSubtitle: "ثبات الحوض وقوة العضلات الخلفية",
    arDesc: "تقوية عضلات الحوض والأرداف لحماية أسفل الظهر ونحت القوام بدون أوزان.",
  },
};

export function readStoredLanguage(): Language {
  try {
    const val = localStorage.getItem(LANG_STORAGE_KEY);
    if (val === "ar" || val === "en") return val;
    // If user's device browser language is Arabic, default to Arabic
    if (typeof navigator !== "undefined" && navigator.language && navigator.language.startsWith("ar")) {
      return "ar";
    }
  } catch {
    /* ignore */
  }
  return "ar"; // Default to Arabic as requested by user
}

export function applyLanguageDom(lang: Language) {
  if (typeof document === "undefined") return;
  const isRtl = lang === "ar";
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.body.classList.toggle("rtl", isRtl);
}

const listeners = new Set<() => void>();

export function useLanguage() {
  const [lang, setLangState] = useState<Language>(() => {
    const initial = readStoredLanguage();
    applyLanguageDom(initial);
    return initial;
  });

  useEffect(() => {
    applyLanguageDom(lang);
  }, [lang]);

  useEffect(() => {
    const sync = () => {
      setLangState(readStoredLanguage());
    };
    listeners.add(sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setLang = useCallback((next: Language) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyLanguageDom(next);
    setLangState(next);
    listeners.forEach((l) => l());
  }, []);

  const toggleLanguage = useCallback(() => {
    setLang(lang === "ar" ? "en" : "ar");
  }, [lang, setLang]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
      let text: string = dict[key] || TRANSLATIONS.en[key] || key;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
        });
      }
      return text;
    },
    [lang]
  );

  const translateSubCategory = useCallback(
    (sub: string): string => {
      if (lang === "ar") {
        return SUB_CATEGORIES_AR[sub] || sub;
      }
      return sub;
    },
    [lang]
  );

  const translateEquipment = useCallback(
    (eq: Equipment | string): string => {
      if (lang === "ar") {
        return EQUIPMENT_AR[eq] || eq;
      }
      return eq.replace(/_/g, " ");
    },
    [lang]
  );

  const translateMuscle = useCallback(
    (muscle: string): string => {
      if (lang === "ar") {
        return MUSCLES_AR[muscle] || muscle;
      }
      return muscle;
    },
    [lang]
  );

  const translateCategory = useCallback(
    (cat: Category): string => {
      return t(`cat_${cat}` as TranslationKey);
    },
    [lang, t]
  );

  const translateCategoryHeading = useCallback(
    (cat: Category): string => {
      return t(`cat_${cat}_heading` as TranslationKey);
    },
    [lang, t]
  );

  const isRTL = lang === "ar";

  return {
    lang,
    setLang,
    toggleLanguage,
    t,
    isRTL,
    translateSubCategory,
    translateEquipment,
    translateMuscle,
    translateCategory,
    translateCategoryHeading,
  };
}
