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
    startCircuit: "Start Circuit",
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
    noEquipment: "No equipment",

    // Tabs
    tab_workout: "Workout",
    tab_womens_health: "Women's Health",
    tab_recovery: "Recovery",

    // Categories headings
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
    getReady: "Get ready",
    tapToSkip: "Tap anywhere to skip",
    finalExerciseMsg: "Final exercise — finish strong! 🏆",
    exit: "Exit",
    castToTV: "Cast to TV",
    aiCoach: "AI Coach",
    soundOn: "Sound on",
    soundOff: "Sound off",
    coachingTips: "Technique Tips",
    hideTips: "Hide Tips",
    go: "GO",
    secondsSuffix: "s",
    repsSuffix: "reps",

    // Summary
    workoutComplete: "Workout complete",
    greatWork: "Great work!",
    summaryDesc: "Here's what you just accomplished.",
    exercisesDone: "Exercises",
    setsDone: "Sets",
    timeElapsed: "Time",
    burnedKcal: "Burned",
    shareStoryCard: "Share Story Card (9:16)",
    done: "Done",

    // Menus
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    profileCurrent: "Current profile",
    profileMan: "Men's Track",
    profileWoman: "Women's Sculpt",
    profileReset: "Reset Profile & History",

    // Athlete Profile Modal
    calibrateTitle: "Athlete Body Profile",
    calibrateSubtitle: "Scientific MET Calorie Calibration",
    weightLabel: "Current Body Weight",
    heightLabel: "Height",
    saveCalibration: "Save & Recalibrate Metrics",
    kg: "kg",
    lbs: "lbs",
    bmrLabel: "Estimated Basal Burn (BMR):",
    bmrNotice: "Calorie expenditure is calculated using the Stanford Compendium of Physical Activities MET formula, adjusted for your exact mass.",

    // Heart Rate & Bluetooth
    heartRate: "Heart Rate",
    connectHR: "Connect Heart Rate Monitor",
    hrConnected: "HR Connected",
    warmupZone: "Warmup",
    fatBurnZone: "Fat Burn",
    cardioZone: "Cardio",
    peakZone: "Peak",

    // Cast Dialog
    castTitle: "Cast Workout to TV",
    castSubtitle: "Stream your workout to your big screen with zero login.",
    castDirect: "AirPlay / Google Cast",
    castDirectDesc: "Wireless playback directly to your Smart TV.",
    castScreen: "Screen Mirroring",
    castScreenDesc: "Mirror your browser tab or phone screen.",
    castCinema: "Fullscreen Mode",
    castCinemaDesc: "Maximize video for TV browser view.",
    castConnecting: "Connecting to display…",
    castGuide: "TV Connection Guide",
    castGuideApple: "Apple TV / AirPlay",
    castGuideAndroid: "Chromecast / Android TV",
    castClose: "Close",

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
    startCircuit: "بدء الدائرة",
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
    noEquipment: "بدون أدوات",

    // Tabs
    tab_workout: "التمارين",
    tab_womens_health: "صحة المرأة",
    tab_recovery: "الاستشفاء",

    // Categories headings
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
    go: "انطلق!",
    secondsSuffix: "ثانية",
    repsSuffix: "تكرار",

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

    // Menus
    themeLight: "فاتح",
    themeDark: "داكن",
    themeSystem: "تلقائي",
    profileCurrent: "المسار الحالي",
    profileMan: "مسار الرجال",
    profileWoman: "مسار السيدات",
    profileReset: "إعادة ضبط الحساب والسجل",

    // Athlete Profile Modal
    calibrateTitle: "معايرة بيانات المتدرب",
    calibrateSubtitle: "معايرة وزن الجسم لحساب السعرات الحرارية بدقة علمية (معادلة MET).",
    weightLabel: "وزن الجسم الحالي",
    heightLabel: "الطول",
    saveCalibration: "حفظ المعايرة والبيانات",
    kg: "كجم",
    lbs: "باوند",
    bmrLabel: "معدل الحرق الأساسي (BMR):",
    bmrNotice: "يتم حساب معدل استهلاك الطاقة وفق دليل جامعة ستانفورد للنشاط البدني (معادلة MET) بناءً على كتلة جسمك الدقيقة.",

    // Heart Rate & Bluetooth
    heartRate: "نبضات القلب",
    connectHR: "ربط حساس نبضات القلب",
    hrConnected: "تم ربط النبض",
    warmupZone: "إحماء",
    fatBurnZone: "حرق دهون",
    cardioZone: "كارديو",
    peakZone: "الذروة",

    // Cast Dialog
    castTitle: "بث التمرين على التلفزيون الذكي",
    castSubtitle: "اعرض تمرينك مباشرة على الشاشة الكبيرة بدون تسجيل دخول.",
    castDirect: "بث مباشر (AirPlay / Google Cast)",
    castDirectDesc: "تشغيل لاسلكي مباشر على شاشة التلفزيون الذكي.",
    castScreen: "مشاركة الشاشة (Screen Mirror)",
    castScreenDesc: "عرض شاشة هاتفك أو متصفحك بالكامل على التلفزيون.",
    castCinema: "وضع السينما الكاملة (Fullscreen)",
    castCinemaDesc: "تكبير الفيديو لملء شاشة متصفح التلفزيون.",
    castConnecting: "جارٍ الاتصال بالشاشة…",
    castGuide: "إرشادات التوصيل بالتلفزيون",
    castGuideApple: "أجهزة Apple (iPhone / iPad / Mac)",
    castGuideAndroid: "أجهزة Android و Google TV",
    castClose: "إغلاق",

    // Language switcher
    switchLanguage: "English",
    languageName: "العربية",
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.en;

// ALL 82 Exercise Names in Arabic
export const EXERCISE_NAMES_AR: Record<string, string> = {
  "Push-Up": "تمرين الضغط (Push-Up)",
  "Single-Leg Glute Bridge": "جسر الأرداف بساق واحدة",
  "Doorway Row": "سحب الظهر عند إطار الباب",
  "Pike Push-Up": "ضغط الأكتاف بايك",
  "Split Squat": "سكوات بوضعية متباعدة (Split Squat)",
  "Bodyweight Squat": "سكوات بوزن الجسم",
  "Plank Hold": "تثبيت البلانك (Plank)",
  "Mountain Climbers": "تسلق الجبل (Mountain Climbers)",
  "Side-Lying Leg Raise": "رفع الساق الجانبي",
  "Prenatal Cat-Cow": "تمرين القطة والجمل للحوامل",
  "Pregnancy Pelvic Tilt": "إمالة الحوض للحوامل",
  "Hip Thrusts": "دفع الحوض (Hip Thrust)",
  "Pelvic Floor Bridge": "جسر تقوية قاع الحوض",
  "Diastasis Recovery Breath": "تنفس علاج انفصال عضلات البطن",
  "Standing Donkey Kicks": "ركلات الحمار واقفاً (Donkey Kicks)",
  "Hormonal Yoga Flow": "تدفق يوجا التوازن الهرموني",
  "Cortisol Reset Walk": "مشي تفريغ الكورتيزول والتوتر",
  "Neck Rolls": "دوران الرقبة الحركي",
  "Chin Tucks": "سحب الذقن واستقامة الرقبة",
  "Upper Trap Stretch": "إطالة عضلات الأكتاف العلوية",
  "Foot Arch Massage": "تدليك قوس القدم",
  "Toe Yoga": "تمرين مرونة أصابع القدم",
  "Calf Wall Stretch": "إطالة السمانة على الجدار",
  "Standing Quad Stretch": "إطالة الفخذ الأمامي واقفاً",
  "Hamstring Stretch": "إطالة عضلات الفخذ الخلفية",
  "Child's Pose": "وضعية الطفل للاسترخاء (Child's Pose)",
  "Box Breathing": "تنفس الصندوق للهدوء والتركيز",
  "Jump Squat": "سكوات قفز انفجاري",
  "Superman Hold": "تثبيت سوبرمان لتقوية الظهر",
  "Reverse Lunge": "طعن خلفي (Reverse Lunge)",
  "Towel Pull-Down": "سحب المنشفة للأكتاف والظهر",
  "Single-Leg Deadlift": "رفعة ميتة بساق واحدة (Deadlift)",
  "Pike Shoulder Tap": "لمس الأكتاف بوضعية البايك",
  "Invisible Jump Rope": "نط الحبل الافتراضي",
  "Burpees": "تمرين البربي الانفجاري (Burpees)",
  "Bodyweight Hip Hinge": "ثني مفصل الورك بوزن الجسم",
  "Tuck Jumps": "قفز ضم الركبتين (Tuck Jumps)",
  "Plank Shoulder Taps": "لمس الأكتاف بوضعية البلانك",
  "Bear Crawl": "زحف الدب للياقة والثبات (Bear Crawl)",
  "High Knees": "الجري برفع الركبتين عالياً (High Knees)",
  "Bicycle Crunches": "عجلات البطن المتقاطعة (Bicycle Crunches)",
  "Wall Sit": "تثبيت الكرسي على الجدار (Wall Sit)",
  "Seated Towel Curl": "ثني القدم بالمنشفة جالساً",
  "Standing Calf Raise": "رفع السمانة واقفاً",
  "Modified Side Plank": "بلانك جانبي معدل",
  "Standing Pelvic Rocks": "تأرجح الحوض واقفاً",
  "Prenatal Squat Hold": "تثبيت السكوات للحوامل",
  "Seated Spinal Twist": "التواء العمود الفقري جالساً",
  "Glute Bridge": "جسر الأرداف الكلاسيكي (Glute Bridge)",
  "Bird Dog": "تمرين الطائر والكلب للثبات (Bird Dog)",
  "Heel Slides": "انزلاق الكعبين لتقوية الكور",
  "Wall Push-Up": "ضغط الجدار الخفيف",
  "Standing Pelvic Tilt": "إمالة الحوض واقفاً",
  "Dead Bug": "حشرة ميتة لتقوية البطن (Dead Bug)",
  "Seated March": "المشي الإيقاعي جالساً",
  "Slow Yin Stretch": "إطالة ين العميقة للاسترخاء",
  "Legs-Up-The-Wall": "رفع الساقين على الجدار لراحة الدورة الدموية",
  "Gentle Hip Circles": "دوائر الحوض المرنة",
  "Supported Bridge": "جسر مدعوم لراحة الظهر",
  "Alternate Nostril Breathing": "تنفس تنقية مسارات الطاقة والهدوء",
  "Goddess Pose": "وضعية آلهة القوة لفتح الحوض",
  "Reclined Butterfly": "فراشة مستلقية لإطالة الحوض",
  "Doorway Chest Opener": "فتح وإطالة الصدر عند الباب",
  "Levator Scapulae Stretch": "إطالة العضلة الرافعة للوح الكتف",
  "Scapular Squeezes": "ضم لوحي الكتف",
  "Wall Angels": "ملائكة الجدار لفتح الأكتاف (Wall Angels)",
  "Thread the Needle": "تمرير الإبرة لإطالة أعلى الظهر",
  "Suboccipital Release": "تحرير عضلات أسفل الجمجمة والصداع",
  "Seated Neck Flexion": "ثني الرقبة للأمام بلطف",
  "Plantar Fascia Press": "ضغط تحرير اللفافة الأخمصية للقدم",
  "Toe Splay": "مباعدة أصابع القدم",
  "Heel Walks": "المشي على الكعبين",
  "Ankle Circles": "دوائر الكاحل الحركية",
  "Towel Scrunches": "سحب وقبض المنشفة بأصابع القدم",
  "Single-Leg Balance": "توازن الثبات بساق واحدة",
  "Big Toe Stretch": "إطالة إبهام القدم",
  "Pigeon Pose": "وضعية الحمام لفتح مفصل الورك (Pigeon Pose)",
  "Seated Forward Fold": "انحناء للأمام جالساً لإطالة الظهر",
  "Cat-Cow Flow": "تدفق القطة والجمل لمرونة العمود الفقري",
  "Thoracic Extension": "تمديد الفقرات الصدرية",
  "Standing Forward Fold": "انحناء للأمام واقفاً لإطالة الجسم الخلفي",
  "Supine Twist": "التواء الظهر مستلقياً للاستشفاء"
};

// Muscle groups in Arabic
export const MUSCLES_AR: Record<string, string> = {
  "Chest & Triceps": "الصدر والترايسبس",
  "Glutes & Hamstrings": "الأرداف والفخذ الخلفي",
  "Back & Biceps": "الظهر والبايسبس",
  "Shoulders": "الأكتاف",
  "Quads & Glutes": "الفخذ الأمامي والأرداف",
  "Core": "عضلات البطن والوسط",
  "Full Body": "كامل الجسم",
  "Hip Abductors": "مبعدات الفخذ والورك",
  "Spine": "العمود الفقري",
  "Lower Back": "أسفل الظهر",
  "Glutes": "عضلات الأرداف والحوض",
  "Pelvic Floor": "قاع الحوض",
  "Deep Core": "عضلات البطن العميقة",
  "Cardio": "اللياقة القلبية والتنفسية",
  "Neck": "الرقبة",
  "Cervical Spine": "الفقرات العنقية",
  "Upper Traps": "عضلات الأكتاف والترابيس العلوية",
  "Plantar Fascia": "اللفافة الأخمصية للقدم",
  "Toes": "أصابع القدمين",
  "Calves": "السمانة",
  "Quads": "الفخذ الأمامي",
  "Hamstrings": "الفخذ الخلفي",
  "Nervous System": "الجهاز العصبي والاسترخاء",
  "Mid Back": "منتصف الظهر",
  "Legs & Glutes": "الساقين والأرداف",
  "Lats": "عضلات الظهر الجانبية (المجنص)",
  "Posterior Chain": "السلسلة العضلية الخلفية",
  "Legs": "الساقين",
  "Shoulders & Core": "الأكتاف وعضلات البطن",
  "Biceps": "عضلات البايسبس",
  "Obliques": "العضلات الجانبية للبطن (الخواصر)",
  "Hips": "الوركين والحوض",
  "Core & Back": "البطن والظهر",
  "Chest": "عضلات الصدر",
  "Hip Flexors": "عضلات ثني الورك",
  "Lymphatic": "الجهاز اللمفاوي وتصريف السوائل",
  "Adrenals": "الغدد الكظرية وتخفيف الإجهاد",
  "Inner Thighs": "الفخذ الداخلي (الضامة)",
  "Hips & Pelvis": "الوركين وعظام الحوض",
  "Neck Side": "جانبي الرقبة",
  "Rhomboids": "العضلات المعينية بين لوحي الكتف",
  "Upper Back": "أعلى الظهر",
  "Thoracic Spine": "الفقرات الصدرية",
  "Skull Base": "قاعدة الجمجمة",
  "Shin & Foot": "قصبة الساق والقدم",
  "Ankles": "مفصل الكاحل",
  "Foot Intrinsics": "عضلات باطن القدم العميقة",
  "Foot & Ankle": "القدم والكاحل",
  "Big Toe": "إبهام القدم",
  "Thoracic": "القفص الصدري والفقرات الصدرية"
};

// Subcategories in Arabic
export const SUB_CATEGORIES_AR: Record<string, string> = {
  "All": "الكل",
  "Strength": "القوة العضلية",
  "Conditioning": "اللياقة والتحمل",
  "Pregnancy Safe": "آمن للحمل",
  "Postpartum": "استشفاء ما بعد الولادة",
  "Hormonal": "التوازن الهرموني",
  "Tech Neck": "إجهاد الرقبة",
  "Foot Care": "صحة القدمين والكاحل",
  "Tension Release": "تخفيف التوتر والإجهاد",
  "Abs & Core": "عضلات البطن والوسط",
  "Posture": "استقامة القوام",
  "Pelvic Floor": "قاع الحوض",
  "Postpartum Recovery": "استشفاء ما بعد الولادة",
  "Hormonal Health": "التوازن الهرموني",
  "Neck & Traps": "الرقبة والأكتاف",
  "Feet & Ankles": "القدمين والكاحل",
  "Total Body Reset": "استشفاء الجسم بالكامل"
};

// Equipment in Arabic
export const EQUIPMENT_AR: Record<string, string> = {
  none: "بدون أدوات",
  mat: "سجادة رياضية",
  wall: "حائط",
  chair: "كرسي",
  doorway: "إطار الباب",
  towel: "منشفة",
  band: "شريط مقاومة",
  light_dumbbell: "دمبل خفيف"
};

// Curated Routines localized titles & descriptions
export const ROUTINE_TRANSLATIONS: Record<string, { arTitle: string; arSubtitle: string; arDesc: string; arLevel: string }> = {
  "morning-shred": {
    arTitle: "دائرة الحرق الصباحي المكثف",
    arSubtitle: "تنشيط فوري لمعدل الأيض",
    arDesc: "تمارين مركبة لرفع الحرق وبدء اليوم بطاقة ونشاط متفجر.",
    arLevel: "متوسط",
  },
  "core-igniter": {
    arTitle: "نحت البطن ودرع الكور",
    arSubtitle: "تفعيل شامل لحزام البطن والوسط",
    arDesc: "تقوية العضلات المستقيمة والجانبية للثبات والقوة الرياضية.",
    arLevel: "جميع المستويات",
  },
  "posture-spine-reset": {
    arTitle: "استشفاء العمود الفقري والرقبة",
    arSubtitle: "علاج إجهاد الجلوس المكتبي",
    arDesc: "تخفيف الضغط عن الرقبة والفقرات الصدرية واستعادة توازن القوام.",
    arLevel: "خفيف / مرن",
  },
  "lower-body-sculpt": {
    arTitle: "نحت وتقوية الحوض والأرداف",
    arSubtitle: "ثبات الحوض وقوة العضلات الخلفية",
    arDesc: "تقوية عضلات الحوض والأرداف لحماية أسفل الظهر ونحت القوام بدون أوزان.",
    arLevel: "متوسط",
  },
};

export const GENDER_FOCUS_AR: Record<string, string> = {
  men: "رجال",
  women: "سيدات",
  both: "للجميع",
};

/**
 * DEFAULT LANGUAGE MUST BE ENGLISH AS REQUESTED.
 * Only returns 'ar' if the user explicitly clicked to switch to Arabic.
 */
export function readStoredLanguage(): Language {
  try {
    const val = localStorage.getItem(LANG_STORAGE_KEY);
    if (val === "ar" || val === "en") return val;
  } catch {
    /* ignore */
  }
  return "en"; // Default is strictly English
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

  const translateExerciseName = useCallback(
    (name: string): string => {
      if (lang === "ar") {
        return EXERCISE_NAMES_AR[name] || name;
      }
      return name;
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

  const translateGenderFocus = useCallback(
    (focus: string): string => {
      if (lang === "ar") {
        return GENDER_FOCUS_AR[focus] || focus;
      }
      return focus;
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
    translateExerciseName,
    translateSubCategory,
    translateEquipment,
    translateMuscle,
    translateGenderFocus,
    translateCategory,
    translateCategoryHeading,
  };
}
