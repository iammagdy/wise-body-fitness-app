export type Category = "core" | "womens_health" | "recovery";

export type Gender = "man" | "woman";

export type TrainerStyle = "realistic" | "cartoon";

export type ExerciseMode = "timed" | "reps";

export type Equipment =
  | "none"
  | "mat"
  | "wall"
  | "chair"
  | "doorway"
  | "towel"
  | "band"
  | "light_dumbbell";

export type Exercise = {
  id: string;
  name: string;
  targetMuscle: string;
  secondaryMuscles?: string[];
  category: Category;
  sub_category: string;
  mode: ExerciseMode;
  durationSeconds: number;
  reps: number;
  genderFocus: "men" | "women" | "both";
  equipment: Equipment;
  tips?: string[];
};

export type WorkoutSession = {
  id: string;
  endedAt: number;
  durationSeconds: number;
  exercises: number;
  sets: number;
  category: Category;
  firstExerciseName: string;
};

export type ArabicCues = {
  start: string;
  mid: string;
  end: string;
};

export type ThemePref = "system" | "light" | "dark";

export type Screen = "welcome" | "dashboard" | "workout";
