export type Language = "en" | "ar";

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
  met?: number;
};

export type WorkoutSession = {
  id: string;
  endedAt: number;
  durationSeconds: number;
  exercises: number;
  sets: number;
  category: Category;
  firstExerciseName: string;
  caloriesBurned?: number;
};

export type ArabicCues = {
  start: string;
  mid: string;
  end: string;
};

export type ThemePref = "system" | "light" | "dark";

export type Screen = "welcome" | "dashboard" | "workout";

export type WeightUnit = "kg" | "lbs";

export interface UserProfile {
  weightKg: number;
  heightCm?: number;
  unit: WeightUnit;
}

export type HeartRateZone = "warmup" | "fat_burn" | "cardio" | "peak";

export interface HeartRateData {
  bpm: number;
  connected: boolean;
  deviceName?: string;
  zone: HeartRateZone;
}

export interface CuratedRoutine {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  durationSeconds: number;
  estimatedMinutes: number;
  estimatedCalories: number;
  icon: string;
  category: Category;
  level: string;
  exerciseIds: string[];
}
