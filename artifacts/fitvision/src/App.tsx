import { useEffect, useMemo, useRef, useState } from "react";


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
  subCategory: string;
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
    subCategory: "Strength",
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
    subCategory: "Strength",
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
    subCategory: "Strength",
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
    subCategory: "Strength",
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
    subCategory: "Strength",
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
    subCategory: "Strength",
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
    subCategory: "Conditioning",
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
    subCategory: "Conditioning",
  },

  // ----- Women's Health -----
  {
    id: "w1",
    name: "Hip Thrusts",
    targetMuscle: "Glutes",
    durationSeconds: 40,
    reps: 15,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    subCategory: "Glutes",
  },
  {
    id: "w3",
    name: "Cable Kickbacks",
    targetMuscle: "Glutes",
    durationSeconds: 30,
    reps: 20,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    subCategory: "Glutes",
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
    subCategory: "Pelvic Floor",
  },
  {
    id: "wh2",
    name: "Side-Lying Leg Raise",
    targetMuscle: "Hip Abductors",
    durationSeconds: 40,
    reps: 15,
    genderFocus: "women",
    mode: "reps",
    category: "womens_health",
    subCategory: "Mobility",
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
    subCategory: "Prenatal",
  },

  // ----- Recovery -----
  {
    id: "r1",
    name: "Foam Roll Quads",
    targetMuscle: "Quads",
    durationSeconds: 60,
    reps: 1,
    genderFocus: "both",
    mode: "timed",
    category: "recovery",
    subCategory: "Foam Rolling",
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
    subCategory: "Stretching",
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
    subCategory: "Mobility",
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
    subCategory: "Breathwork",
  },
];

function WelcomeScreen({ onSelect }: { onSelect: (gender: Gender) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      <div className="mb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-stone-900">
          FitVision
        </h1>
        <p className="mt-3 text-base text-stone-500">
          Your personal fitness journey
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <button
          type="button"
          onClick={() => onSelect("man")}
          className="w-full rounded-2xl bg-stone-900 px-6 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-stone-800"
          style={{ minHeight: 60 }}
        >
          I am a Man
        </button>
        <button
          type="button"
          onClick={() => onSelect("woman")}
          className="w-full rounded-2xl border border-stone-200 bg-white px-6 text-lg font-semibold text-stone-900 shadow-sm transition active:scale-[0.98] active:bg-stone-100"
          style={{ minHeight: 60 }}
        >
          I am a Woman
        </button>
      </div>
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
      className="mb-3 cursor-pointer rounded-2xl bg-white p-4 shadow-sm transition active:scale-[0.99] active:bg-stone-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-stone-900">
            {exercise.name}
          </h3>
          <p className="mt-1 text-sm text-stone-500">{exercise.targetMuscle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-stone-600">
          {exercise.genderFocus === "both" ? "All" : exercise.genderFocus}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 rounded-xl bg-stone-50 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
            {exercise.mode === "timed" ? "Duration" : "Reps"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-stone-900">
            {exercise.mode === "timed"
              ? `${exercise.durationSeconds}s`
              : exercise.reps}
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-stone-50 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
            Mode
          </p>
          <p className="mt-0.5 text-sm font-semibold capitalize text-stone-900">
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
      className="pb-safe absolute bottom-0 left-0 right-0 w-full max-w-md border-t border-stone-200 bg-white"
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
                isActive ? "text-stone-900" : "text-stone-400"
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
}: {
  gender: Gender | null;
  onSelectExercise: (exercise: Exercise) => void;
}) {
  const [category, setCategory] = useState<Category>("core");

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

  const filtered = useMemo(() => {
    if (!gender) return [];
    const focus = gender === "man" ? "men" : "women";
    return EXERCISES.filter((e) => {
      if (e.category !== category) return false;
      return e.genderFocus === focus || e.genderFocus === "both";
    });
  }, [gender, category]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <header className="shrink-0 px-6 pt-8 pb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
          {CATEGORY_HEADINGS[category]}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
          FitVision
        </h1>
      </header>

      <div
        className="no-scrollbar flex-1 overflow-y-auto px-6"
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
          <p className="mt-8 text-center text-sm text-stone-400">
            No exercises in this category yet.
          </p>
        )}
      </div>

      <BottomNav tabs={visibleTabs} active={category} onChange={setCategory} />
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

function TimedBody({
  exercise,
  active,
}: {
  exercise: Exercise;
  active: boolean;
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

  // Drive the interval based on `running` (only while active)
  useEffect(() => {
    if (!running || !active) {
      clearTimer();
      return;
    }
    clearTimer();
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearTimer();
    };
  }, [running, active]);

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
        className="text-center font-mono font-bold tabular-nums text-stone-900"
        style={{ fontSize: 72, lineHeight: 1 }}
      >
        {formatTime(secondsLeft)}
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? "Pause" : "Play"}
        className="mt-10 flex items-center justify-center rounded-full bg-stone-900 text-white shadow-lg transition active:scale-95 active:bg-stone-800"
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
}: {
  exercise: Exercise;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col px-6">
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          Reps
        </p>
        <div
          className="mt-2 text-center font-bold tabular-nums text-stone-900"
          style={{ fontSize: 120, lineHeight: 1 }}
        >
          {exercise.reps}
        </div>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="mb-6 w-full rounded-2xl bg-stone-900 px-6 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-stone-800"
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
  if (!exercise) return null;

  return (
    <div className="absolute inset-0 flex flex-col bg-stone-50">
      {/* Top bar with back button */}
      <div className="relative shrink-0 px-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-900 shadow-sm transition active:scale-95 active:bg-stone-100"
        >
          <BackIcon />
        </button>
      </div>

      {/* Top 40% media placeholder */}
      <div className="shrink-0 px-4 pt-3" style={{ height: "40%" }}>
        <div className="flex h-full w-full items-center justify-center rounded-3xl bg-stone-200">
          <div className="flex flex-col items-center text-stone-400">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
            <p className="mt-2 text-xs font-medium uppercase tracking-widest">
              Video preview
            </p>
          </div>
        </div>
      </div>

      {/* Exercise name */}
      <div className="shrink-0 px-6 pt-6 pb-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">
          {exercise.name}
        </h2>
        <p className="mt-1 text-sm text-stone-500">{exercise.targetMuscle}</p>
      </div>

      {/* Mode-conditional body */}
      {exercise.mode === "timed" ? (
        <TimedBody exercise={exercise} active={active} />
      ) : (
        <RepsBody exercise={exercise} onDone={onBack} />
      )}
    </div>
  );
}

function App() {
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
    <div className="relative mx-auto h-full w-full max-w-md overflow-hidden bg-stone-50">
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
