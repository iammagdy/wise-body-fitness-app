import type { Category, Exercise, Gender, TrainerStyle } from "../types/workout";

export type Equipment =
  | "none"
  | "mat"
  | "wall"
  | "chair"
  | "doorway"
  | "towel"
  | "band"
  | "light_dumbbell";

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: "No equipment",
  mat: "Mat",
  wall: "Wall",
  chair: "Chair",
  doorway: "Doorway",
  towel: "Towel",
  band: "Band",
  light_dumbbell: "Light dumbbell",
};

export const EXERCISES: Exercise[] = [
  {
    "id": "m1",
    "name": "Push-Up",
    "targetMuscle": "Chest & Triceps",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "men",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "none",
    "tips": [
      "Maintain a straight line from head to heels, core engaged",
      "Lower until elbows form a 45 to 90-degree angle",
      "Exhale as you press up; avoid arching your lower back"
    ]
  },
  {
    "id": "m2",
    "name": "Single-Leg Glute Bridge",
    "targetMuscle": "Glutes & Hamstrings",
    "durationSeconds": 45,
    "reps": 12,
    "genderFocus": "men",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "mat",
    "tips": [
      "Plant feet flat on the floor, hip-width apart",
      "Squeeze glutes at the peak of contraction; avoid hyperextending spine",
      "Keep ribs tucked down and core firm throughout"
    ]
  },
  {
    "id": "m3",
    "name": "Doorway Row",
    "targetMuscle": "Back & Biceps",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "men",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "doorway",
    "tips": [
      "Focus on steady muscle engagement in the back & biceps",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "m4",
    "name": "Pike Push-Up",
    "targetMuscle": "Shoulders",
    "durationSeconds": 40,
    "reps": 8,
    "genderFocus": "men",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "none",
    "tips": [
      "Maintain a straight line from head to heels, core engaged",
      "Lower until elbows form a 45 to 90-degree angle",
      "Exhale as you press up; avoid arching your lower back"
    ]
  },
  {
    "id": "w2",
    "name": "Split Squat",
    "targetMuscle": "Quads & Glutes",
    "durationSeconds": 45,
    "reps": 12,
    "genderFocus": "women",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "none",
    "tips": [
      "Keep chest upright and weight distributed across entire foot",
      "Drive knees outward in line with toes, hips sinking down",
      "Inhale descending smoothly, exhale driving back to start"
    ]
  },
  {
    "id": "w4",
    "name": "Bodyweight Squat",
    "targetMuscle": "Quads & Glutes",
    "durationSeconds": 40,
    "reps": 15,
    "genderFocus": "women",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "none",
    "tips": [
      "Keep chest upright and weight distributed across entire foot",
      "Drive knees outward in line with toes, hips sinking down",
      "Inhale descending smoothly, exhale driving back to start"
    ]
  },
  {
    "id": "b1",
    "name": "Plank Hold",
    "targetMuscle": "Core",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "mat",
    "tips": [
      "Brace your abdominals as if preparing for a punch",
      "Keep shoulders directly stacked over elbows/wrists",
      "Maintain steady, rhythmic diaphragmatic breathing"
    ]
  },
  {
    "id": "b2",
    "name": "Mountain Climbers",
    "targetMuscle": "Full Body",
    "durationSeconds": 30,
    "reps": 25,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "mat",
    "tips": [
      "Land softly on midfoot/balls of feet to protect joints",
      "Maintain an active, braced core to stabilize your pelvis",
      "Pace yourself for sustainable cardiovascular rhythm"
    ]
  },
  {
    "id": "wh2",
    "name": "Side-Lying Leg Raise",
    "targetMuscle": "Hip Abductors",
    "durationSeconds": 40,
    "reps": 15,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "mat",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "wh3",
    "name": "Prenatal Cat-Cow",
    "targetMuscle": "Spine",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the spine",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "wh4",
    "name": "Pregnancy Pelvic Tilt",
    "targetMuscle": "Lower Back",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the lower back",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "w1",
    "name": "Hip Thrusts",
    "targetMuscle": "Glutes",
    "durationSeconds": 40,
    "reps": 15,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "mat",
    "tips": [
      "Plant feet flat on the floor, hip-width apart",
      "Squeeze glutes at the peak of contraction; avoid hyperextending spine",
      "Keep ribs tucked down and core firm throughout"
    ]
  },
  {
    "id": "wh1",
    "name": "Pelvic Floor Bridge",
    "targetMuscle": "Pelvic Floor",
    "durationSeconds": 30,
    "reps": 12,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "mat",
    "tips": [
      "Plant feet flat on the floor, hip-width apart",
      "Squeeze glutes at the peak of contraction; avoid hyperextending spine",
      "Keep ribs tucked down and core firm throughout"
    ]
  },
  {
    "id": "wh5",
    "name": "Diastasis Recovery Breath",
    "targetMuscle": "Deep Core",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "mat",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "w3",
    "name": "Standing Donkey Kicks",
    "targetMuscle": "Glutes",
    "durationSeconds": 30,
    "reps": 15,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the glutes",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "wh6",
    "name": "Hormonal Yoga Flow",
    "targetMuscle": "Full Body",
    "durationSeconds": 120,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the full body",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "wh7",
    "name": "Cortisol Reset Walk",
    "targetMuscle": "Cardio",
    "durationSeconds": 300,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the cardio",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "rn1",
    "name": "Neck Rolls",
    "targetMuscle": "Neck",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "none",
    "tips": [
      "Move with slow, deliberate control without sudden jerks",
      "Keep your spine elongated and gaze forward",
      "Stop immediately if you feel sharp pinching or tingling"
    ]
  },
  {
    "id": "rn2",
    "name": "Chin Tucks",
    "targetMuscle": "Cervical Spine",
    "durationSeconds": 30,
    "reps": 12,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the cervical spine",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "rn3",
    "name": "Upper Trap Stretch",
    "targetMuscle": "Upper Traps",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "none",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "rf1",
    "name": "Foot Arch Massage",
    "targetMuscle": "Plantar Fascia",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the plantar fascia",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "rf2",
    "name": "Toe Yoga",
    "targetMuscle": "Toes",
    "durationSeconds": 45,
    "reps": 10,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the toes",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "rf3",
    "name": "Calf Wall Stretch",
    "targetMuscle": "Calves",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "wall",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "r1",
    "name": "Standing Quad Stretch",
    "targetMuscle": "Quads",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "none",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "r2",
    "name": "Hamstring Stretch",
    "targetMuscle": "Hamstrings",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "mat",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "r3",
    "name": "Child's Pose",
    "targetMuscle": "Lower Back",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the lower back",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "r4",
    "name": "Box Breathing",
    "targetMuscle": "Nervous System",
    "durationSeconds": 90,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "none",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "s1",
    "name": "Jump Squat",
    "targetMuscle": "Quads & Glutes",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "none",
    "tips": [
      "Keep chest upright and weight distributed across entire foot",
      "Drive knees outward in line with toes, hips sinking down",
      "Inhale descending smoothly, exhale driving back to start"
    ]
  },
  {
    "id": "s2",
    "name": "Superman Hold",
    "targetMuscle": "Mid Back",
    "durationSeconds": 30,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the mid back",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "s3",
    "name": "Reverse Lunge",
    "targetMuscle": "Legs & Glutes",
    "durationSeconds": 45,
    "reps": 12,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "none",
    "tips": [
      "Keep chest upright and weight distributed across entire foot",
      "Drive knees outward in line with toes, hips sinking down",
      "Inhale descending smoothly, exhale driving back to start"
    ]
  },
  {
    "id": "s4",
    "name": "Towel Pull-Down",
    "targetMuscle": "Lats",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "towel",
    "tips": [
      "Focus on steady muscle engagement in the lats",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "s5",
    "name": "Single-Leg Deadlift",
    "targetMuscle": "Hamstrings",
    "durationSeconds": 45,
    "reps": 10,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the hamstrings",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "s6",
    "name": "Pike Shoulder Tap",
    "targetMuscle": "Shoulders",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Strength",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the shoulders",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "c1",
    "name": "Invisible Jump Rope",
    "targetMuscle": "Cardio",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "none",
    "tips": [
      "Land softly on midfoot/balls of feet to protect joints",
      "Maintain an active, braced core to stabilize your pelvis",
      "Pace yourself for sustainable cardiovascular rhythm"
    ]
  },
  {
    "id": "c2",
    "name": "Burpees",
    "targetMuscle": "Full Body",
    "durationSeconds": 45,
    "reps": 12,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "mat",
    "tips": [
      "Land softly on midfoot/balls of feet to protect joints",
      "Maintain an active, braced core to stabilize your pelvis",
      "Pace yourself for sustainable cardiovascular rhythm"
    ]
  },
  {
    "id": "c3",
    "name": "Bodyweight Hip Hinge",
    "targetMuscle": "Posterior Chain",
    "durationSeconds": 40,
    "reps": 20,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the posterior chain",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "c4",
    "name": "Tuck Jumps",
    "targetMuscle": "Legs",
    "durationSeconds": 30,
    "reps": 10,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "none",
    "tips": [
      "Land softly on midfoot/balls of feet to protect joints",
      "Maintain an active, braced core to stabilize your pelvis",
      "Pace yourself for sustainable cardiovascular rhythm"
    ]
  },
  {
    "id": "c5",
    "name": "Plank Shoulder Taps",
    "targetMuscle": "Shoulders & Core",
    "durationSeconds": 30,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "mat",
    "tips": [
      "Brace your abdominals as if preparing for a punch",
      "Keep shoulders directly stacked over elbows/wrists",
      "Maintain steady, rhythmic diaphragmatic breathing"
    ]
  },
  {
    "id": "c6",
    "name": "Bear Crawl",
    "targetMuscle": "Full Body",
    "durationSeconds": 30,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the full body",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "c7",
    "name": "High Knees",
    "targetMuscle": "Cardio",
    "durationSeconds": 30,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "none",
    "tips": [
      "Land softly on midfoot/balls of feet to protect joints",
      "Maintain an active, braced core to stabilize your pelvis",
      "Pace yourself for sustainable cardiovascular rhythm"
    ]
  },
  {
    "id": "c8",
    "name": "Bicycle Crunches",
    "targetMuscle": "Core",
    "durationSeconds": 40,
    "reps": 30,
    "genderFocus": "both",
    "mode": "reps",
    "category": "core",
    "sub_category": "Conditioning",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the core",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "ps1",
    "name": "Wall Sit",
    "targetMuscle": "Quads",
    "durationSeconds": 30,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "wall",
    "tips": [
      "Focus on steady muscle engagement in the quads",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "ps2",
    "name": "Seated Towel Curl",
    "targetMuscle": "Biceps",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "towel",
    "tips": [
      "Focus on steady muscle engagement in the biceps",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "ps3",
    "name": "Standing Calf Raise",
    "targetMuscle": "Calves",
    "durationSeconds": 40,
    "reps": 15,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the calves",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "ps4",
    "name": "Modified Side Plank",
    "targetMuscle": "Obliques",
    "durationSeconds": 30,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "mat",
    "tips": [
      "Brace your abdominals as if preparing for a punch",
      "Keep shoulders directly stacked over elbows/wrists",
      "Maintain steady, rhythmic diaphragmatic breathing"
    ]
  },
  {
    "id": "ps5",
    "name": "Standing Pelvic Rocks",
    "targetMuscle": "Hips",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the hips",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "ps6",
    "name": "Prenatal Squat Hold",
    "targetMuscle": "Pelvic Floor",
    "durationSeconds": 30,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "none",
    "tips": [
      "Keep chest upright and weight distributed across entire foot",
      "Drive knees outward in line with toes, hips sinking down",
      "Inhale descending smoothly, exhale driving back to start"
    ]
  },
  {
    "id": "ps7",
    "name": "Seated Spinal Twist",
    "targetMuscle": "Spine",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Pregnancy Safe",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the spine",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "pp1",
    "name": "Glute Bridge",
    "targetMuscle": "Glutes",
    "durationSeconds": 40,
    "reps": 15,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "mat",
    "tips": [
      "Plant feet flat on the floor, hip-width apart",
      "Squeeze glutes at the peak of contraction; avoid hyperextending spine",
      "Keep ribs tucked down and core firm throughout"
    ]
  },
  {
    "id": "pp2",
    "name": "Bird Dog",
    "targetMuscle": "Core & Back",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the core & back",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "pp3",
    "name": "Heel Slides",
    "targetMuscle": "Deep Core",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the deep core",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "pp4",
    "name": "Wall Push-Up",
    "targetMuscle": "Chest",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "wall",
    "tips": [
      "Maintain a straight line from head to heels, core engaged",
      "Lower until elbows form a 45 to 90-degree angle",
      "Exhale as you press up; avoid arching your lower back"
    ]
  },
  {
    "id": "pp5",
    "name": "Standing Pelvic Tilt",
    "targetMuscle": "Lower Back",
    "durationSeconds": 40,
    "reps": 12,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the lower back",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "pp6",
    "name": "Dead Bug",
    "targetMuscle": "Deep Core",
    "durationSeconds": 45,
    "reps": 10,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the deep core",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "pp7",
    "name": "Seated March",
    "targetMuscle": "Hip Flexors",
    "durationSeconds": 45,
    "reps": 20,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Postpartum",
    "equipment": "chair",
    "tips": [
      "Focus on steady muscle engagement in the hip flexors",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "h1",
    "name": "Slow Yin Stretch",
    "targetMuscle": "Full Body",
    "durationSeconds": 180,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "mat",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "h2",
    "name": "Legs-Up-The-Wall",
    "targetMuscle": "Lymphatic",
    "durationSeconds": 240,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "wall",
    "tips": [
      "Focus on steady muscle engagement in the lymphatic",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "h3",
    "name": "Gentle Hip Circles",
    "targetMuscle": "Hips",
    "durationSeconds": 60,
    "reps": 10,
    "genderFocus": "women",
    "mode": "reps",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the hips",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "h4",
    "name": "Supported Bridge",
    "targetMuscle": "Adrenals",
    "durationSeconds": 120,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "mat",
    "tips": [
      "Plant feet flat on the floor, hip-width apart",
      "Squeeze glutes at the peak of contraction; avoid hyperextending spine",
      "Keep ribs tucked down and core firm throughout"
    ]
  },
  {
    "id": "h5",
    "name": "Alternate Nostril Breathing",
    "targetMuscle": "Nervous System",
    "durationSeconds": 180,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "none",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "h6",
    "name": "Goddess Pose",
    "targetMuscle": "Inner Thighs",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the inner thighs",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "h7",
    "name": "Reclined Butterfly",
    "targetMuscle": "Hips & Pelvis",
    "durationSeconds": 120,
    "reps": 1,
    "genderFocus": "women",
    "mode": "timed",
    "category": "womens_health",
    "sub_category": "Hormonal",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the hips & pelvis",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tn1",
    "name": "Doorway Chest Opener",
    "targetMuscle": "Chest",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "doorway",
    "tips": [
      "Focus on steady muscle engagement in the chest",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tn2",
    "name": "Levator Scapulae Stretch",
    "targetMuscle": "Neck Side",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "none",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "tn3",
    "name": "Scapular Squeezes",
    "targetMuscle": "Rhomboids",
    "durationSeconds": 30,
    "reps": 15,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the rhomboids",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tn4",
    "name": "Wall Angels",
    "targetMuscle": "Upper Back",
    "durationSeconds": 45,
    "reps": 12,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "wall",
    "tips": [
      "Focus on steady muscle engagement in the upper back",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tn5",
    "name": "Thread the Needle",
    "targetMuscle": "Thoracic Spine",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the thoracic spine",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tn6",
    "name": "Suboccipital Release",
    "targetMuscle": "Skull Base",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the skull base",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tn7",
    "name": "Seated Neck Flexion",
    "targetMuscle": "Neck",
    "durationSeconds": 30,
    "reps": 10,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Tech Neck",
    "equipment": "none",
    "tips": [
      "Move with slow, deliberate control without sudden jerks",
      "Keep your spine elongated and gaze forward",
      "Stop immediately if you feel sharp pinching or tingling"
    ]
  },
  {
    "id": "fc1",
    "name": "Plantar Fascia Press",
    "targetMuscle": "Plantar Fascia",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "none",
    "tips": [
      "Maintain a straight line from head to heels, core engaged",
      "Lower until elbows form a 45 to 90-degree angle",
      "Exhale as you press up; avoid arching your lower back"
    ]
  },
  {
    "id": "fc2",
    "name": "Toe Splay",
    "targetMuscle": "Toes",
    "durationSeconds": 30,
    "reps": 15,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the toes",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "fc3",
    "name": "Heel Walks",
    "targetMuscle": "Shin & Foot",
    "durationSeconds": 30,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the shin & foot",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "fc4",
    "name": "Ankle Circles",
    "targetMuscle": "Ankles",
    "durationSeconds": 30,
    "reps": 10,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the ankles",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "fc5",
    "name": "Towel Scrunches",
    "targetMuscle": "Foot Intrinsics",
    "durationSeconds": 45,
    "reps": 15,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "towel",
    "tips": [
      "Focus on steady muscle engagement in the foot intrinsics",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "fc6",
    "name": "Single-Leg Balance",
    "targetMuscle": "Foot & Ankle",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the foot & ankle",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "fc7",
    "name": "Big Toe Stretch",
    "targetMuscle": "Big Toe",
    "durationSeconds": 45,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Foot Care",
    "equipment": "none",
    "tips": [
      "Breathe deeply into your lower abdomen and ribcage",
      "Relax facial muscles and drop shoulders away from ears",
      "Never force the movement; respect your comfortable range"
    ]
  },
  {
    "id": "tr1",
    "name": "Pigeon Pose",
    "targetMuscle": "Hips",
    "durationSeconds": 90,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the hips",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tr2",
    "name": "Seated Forward Fold",
    "targetMuscle": "Hamstrings",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the hamstrings",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tr3",
    "name": "Cat-Cow Flow",
    "targetMuscle": "Spine",
    "durationSeconds": 60,
    "reps": 10,
    "genderFocus": "both",
    "mode": "reps",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the spine",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tr4",
    "name": "Thoracic Extension",
    "targetMuscle": "Thoracic",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the thoracic",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tr5",
    "name": "Standing Forward Fold",
    "targetMuscle": "Posterior Chain",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "none",
    "tips": [
      "Focus on steady muscle engagement in the posterior chain",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  },
  {
    "id": "tr6",
    "name": "Supine Twist",
    "targetMuscle": "Lower Back",
    "durationSeconds": 60,
    "reps": 1,
    "genderFocus": "both",
    "mode": "timed",
    "category": "recovery",
    "sub_category": "Tension Release",
    "equipment": "mat",
    "tips": [
      "Focus on steady muscle engagement in the lower back",
      "Breathe smoothly and maintain controlled tempo",
      "Keep full-body tension and balanced alignment"
    ]
  }
];


export type ArabicCues = {
  start: string;
  mid: string;
  end: string;
};

export const DEFAULT_CUES: ArabicCues = {
  start: "هيا نبدأ التمرين، ركّز على تنفسك",
  mid: "أحسنت، استمر، أنت تقترب من النهاية",
  end: "ممتاز، أكملت التمرين بنجاح",
};

export const CUES_BY_SUB: Record<string, ArabicCues> = {
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


export function getCuesFor(ex: Exercise): ArabicCues {
  return CUES_BY_SUB[ex.sub_category] ?? DEFAULT_CUES;
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function getExercisesByCategory(category: Category, gender: Gender | null): Exercise[] {
  return EXERCISES.filter((e) => {
    if (e.category !== category) return false;
    // Gender filter: 'men' focus excluded for women, 'women' focus excluded for men
    const gf = (e as any).genderFocus;
    if (!gender || !gf || gf === "both" || gf === "all") return true;
    if (gender === "man" && gf === "women") return false;
    if (gender === "woman" && gf === "men") return false;
    return true;
  });
}

/**
 * Resolves the URL for the HD video loop demonstration.
 * Checks for gender-specific 3D cartoon or defaults to real athlete loop.
 */
export function getExerciseVideoUrl(
  exercise: Exercise,
  gender: Gender | null,
  style: TrainerStyle = "realistic"
): string {
  const base = import.meta.env.BASE_URL || "/";
  const cleanBase = base.endsWith("/") ? base : base + "/";
  
  if (style === "cartoon" && gender) {
    const genderSuffix = gender === "man" ? "man" : "woman";
    // Check if the specific cartoon loop exists (e.g. b1, m1, pp1, s3, tr1, w4)
    if (["b1", "m1", "pp1", "s3", "tr1", "w4"].includes(exercise.id)) {
      return cleanBase + "loops/" + exercise.id + "_" + genderSuffix + ".mp4";
    }
  }

  // Primary HD photo-realistic trainer loop
  return cleanBase + "loops/" + exercise.id + ".mp4";
}
