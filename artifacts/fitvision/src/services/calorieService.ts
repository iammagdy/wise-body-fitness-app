import type { Exercise, Gender, UserProfile, WeightUnit } from "../types/workout";

const PROFILE_KEY = "fitvision.userProfile";

export const DEFAULT_WEIGHT_MAN_KG = 75;
export const DEFAULT_WEIGHT_WOMAN_KG = 62;

export function getUserProfile(gender?: Gender | null): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.weightKg === "number" && parsed.weightKg > 20 && parsed.weightKg < 300) {
        return {
          weightKg: Math.round(parsed.weightKg),
          heightCm: parsed.heightCm ? Math.round(parsed.heightCm) : undefined,
          unit: parsed.unit === "lbs" ? "lbs" : "kg",
        };
      }
    }
  } catch {
    /* ignore */
  }

  const defaultWeight = gender === "woman" ? DEFAULT_WEIGHT_WOMAN_KG : DEFAULT_WEIGHT_MAN_KG;
  return {
    weightKg: defaultWeight,
    unit: "kg",
  };
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

/**
 * Standard MET (Metabolic Equivalent of Task) values from
 * the Compendium of Physical Activities (Ainsworth et al.).
 */
export function getExerciseMET(exercise: Exercise): number {
  if (typeof exercise.met === "number" && exercise.met > 0) {
    return exercise.met;
  }

  const name = exercise.name.toLowerCase();
  const sub = (exercise.sub_category || "").toLowerCase();
  const muscle = (exercise.targetMuscle || "").toLowerCase();

  // High-intensity conditioning & explosive drills
  if (
    name.includes("burpee") ||
    name.includes("high knee") ||
    name.includes("jumping jack") ||
    name.includes("jump") ||
    sub.includes("conditioning")
  ) {
    return 8.0;
  }

  // Compound bodyweight resistance
  if (
    name.includes("push") ||
    name.includes("squat") ||
    name.includes("lunge") ||
    name.includes("dip") ||
    sub.includes("strength")
  ) {
    return 6.5;
  }

  // Core & abdominal stabilization
  if (
    name.includes("plank") ||
    name.includes("crunch") ||
    name.includes("mountain climber") ||
    name.includes("hollow") ||
    muscle.includes("core") ||
    muscle.includes("abs")
  ) {
    return 5.2;
  }

  // Pelvic floor, Barre & Women health sculpting
  if (
    sub.includes("postpartum") ||
    sub.includes("pregnancy") ||
    name.includes("bridge") ||
    name.includes("kegel") ||
    name.includes("bird-dog")
  ) {
    return 4.0;
  }

  // Recovery, Mobility, Stretching
  if (
    exercise.category === "recovery" ||
    sub.includes("neck") ||
    sub.includes("foot") ||
    sub.includes("tension")
  ) {
    return 2.8;
  }

  return 5.0; // Default active baseline
}

/**
 * Calculate active calories burned using:
 * Calories = (MET * 3.5 * weightKg / 200) * (durationSeconds / 60)
 */
export function calculateActiveCalories(
  exerciseOrMet: Exercise | number,
  durationSeconds: number,
  weightKg: number
): number {
  if (durationSeconds <= 0 || weightKg <= 0) return 0;
  const met = typeof exerciseOrMet === "number" ? exerciseOrMet : getExerciseMET(exerciseOrMet);
  const calPerMin = (met * 3.5 * weightKg) / 200;
  return (calPerMin * durationSeconds) / 60;
}

export function calculateSessionCalories(
  exercises: Exercise[],
  sets: number,
  durationSeconds: number,
  weightKg: number
): number {
  if (exercises.length === 0 || durationSeconds <= 0) return 0;
  const avgMet = exercises.reduce((acc, e) => acc + getExerciseMET(e), 0) / exercises.length;
  return calculateActiveCalories(avgMet, durationSeconds, weightKg);
}

/**
 * Calculate resting interval burn (1.5 MET)
 */
export function calculateRestCalories(
  restSeconds: number,
  weightKg: number
): number {
  return calculateActiveCalories(1.5, restSeconds, weightKg);
}

export function formatKcal(calories: number): string {
  return Math.round(calories).toString();
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462);
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462);
}
