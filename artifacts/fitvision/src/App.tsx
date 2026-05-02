import { useMemo, useState } from "react";

type Gender = "man" | "woman";
type Screen = "welcome" | "dashboard";

type Exercise = {
  id: string;
  name: string;
  targetMuscle: string;
  durationSeconds: number;
  reps: number;
  genderFocus: "men" | "women" | "both";
};

const EXERCISES: Exercise[] = [
  {
    id: "m1",
    name: "Barbell Bench Press",
    targetMuscle: "Chest",
    durationSeconds: 45,
    reps: 10,
    genderFocus: "men",
  },
  {
    id: "m2",
    name: "Deadlift",
    targetMuscle: "Back & Hamstrings",
    durationSeconds: 60,
    reps: 8,
    genderFocus: "men",
  },
  {
    id: "m3",
    name: "Pull-Ups",
    targetMuscle: "Lats & Biceps",
    durationSeconds: 30,
    reps: 12,
    genderFocus: "men",
  },
  {
    id: "w1",
    name: "Hip Thrusts",
    targetMuscle: "Glutes",
    durationSeconds: 40,
    reps: 15,
    genderFocus: "women",
  },
  {
    id: "w2",
    name: "Bulgarian Split Squat",
    targetMuscle: "Quads & Glutes",
    durationSeconds: 45,
    reps: 12,
    genderFocus: "women",
  },
  {
    id: "w3",
    name: "Cable Kickbacks",
    targetMuscle: "Glutes",
    durationSeconds: 30,
    reps: 20,
    genderFocus: "women",
  },
  {
    id: "b1",
    name: "Plank Hold",
    targetMuscle: "Core",
    durationSeconds: 60,
    reps: 1,
    genderFocus: "both",
  },
  {
    id: "b2",
    name: "Mountain Climbers",
    targetMuscle: "Full Body",
    durationSeconds: 30,
    reps: 25,
    genderFocus: "both",
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
            Duration
          </p>
          <p className="mt-0.5 text-sm font-semibold text-stone-900">
            {exercise.durationSeconds}s
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-stone-50 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
            Reps
          </p>
          <p className="mt-0.5 text-sm font-semibold text-stone-900">
            {exercise.reps}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardScreen({ gender }: { gender: Gender | null }) {
  const filtered = useMemo(() => {
    if (!gender) return [];
    const focus = gender === "man" ? "men" : "women";
    return EXERCISES.filter(
      (e) => e.genderFocus === focus || e.genderFocus === "both",
    );
  }, [gender]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <header className="shrink-0 px-6 pt-8 pb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
          Today's workout
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
          FitVision
        </h1>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-6">
        {filtered.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onClick={() => {
              console.log("Selected exercise:", exercise.name);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [gender, setGender] = useState<Gender | null>(null);

  const handleSelect = (g: Gender) => {
    setGender(g);
    setScreen("dashboard");
  };

  return (
    <div className="relative mx-auto h-full w-full max-w-md bg-stone-50">
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          screen === "welcome" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <WelcomeScreen onSelect={handleSelect} />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          screen === "dashboard" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <DashboardScreen gender={gender} />
      </div>
    </div>
  );
}

export default App;
