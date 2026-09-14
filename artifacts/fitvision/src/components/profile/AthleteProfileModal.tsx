import React, { useState } from "react";
import type { Gender, UserProfile, WeightUnit } from "../../types/workout";
import { getUserProfile, saveUserProfile, kgToLbs, lbsToKg } from "../../services/calorieService";

interface AthleteProfileModalProps {
  open: boolean;
  onClose: () => void;
  gender: Gender | null;
  onProfileUpdated?: (profile: UserProfile) => void;
  onSave?: (profile: UserProfile) => void;
}

export function AthleteProfileModal({
  open,
  onClose,
  gender,
  onProfileUpdated,
  onSave,
}: AthleteProfileModalProps) {
  const initial = getUserProfile(gender);
  const [unit, setUnit] = useState<WeightUnit>(initial.unit);
  const [weightValue, setWeightValue] = useState<number>(
    unit === "lbs" ? kgToLbs(initial.weightKg) : initial.weightKg
  );
  const [heightCm, setHeightCm] = useState<number>(initial.heightCm || 175);

  if (!open) return null;

  const handleUnitToggle = (nextUnit: WeightUnit) => {
    if (nextUnit === unit) return;
    if (nextUnit === "lbs") {
      setWeightValue(kgToLbs(weightValue));
    } else {
      setWeightValue(lbsToKg(weightValue));
    }
    setUnit(nextUnit);
  };

  const handleSave = () => {
    const weightInKg = unit === "lbs" ? lbsToKg(weightValue) : weightValue;
    const clampedKg = Math.min(250, Math.max(30, weightInKg));
    const profile: UserProfile = {
      weightKg: clampedKg,
      heightCm,
      unit,
    };
    saveUserProfile(profile);
    if (onProfileUpdated) onProfileUpdated(profile);
    onClose();
  };

  // Rough Mifflin-St Jeor estimate for user education
  const estKg = unit === "lbs" ? lbsToKg(weightValue) : weightValue;
  const bmr = Math.round(10 * estKg + 6.25 * heightCm - 5 * 28 + (gender === "woman" ? -161 : 5));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-black">
              ⚡
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">Athlete Body Profile</h2>
              <p className="text-xs text-zinc-400">Scientific MET Calorie Calibration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center justify-between p-1 bg-zinc-950 rounded-2xl border border-zinc-800/80">
          <button
            type="button"
            onClick={() => handleUnitToggle("kg")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              unit === "kg"
                ? "bg-emerald-500 text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Kilograms (kg)
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle("lbs")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              unit === "lbs"
                ? "bg-emerald-500 text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Pounds (lbs)
          </button>
        </div>

        {/* Weight Input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Current Body Weight
            </label>
            <span className="text-emerald-400 font-mono font-black text-xl">
              {weightValue} {unit}
            </span>
          </div>
          <input
            type="range"
            min={unit === "lbs" ? 70 : 35}
            max={unit === "lbs" ? 380 : 180}
            step={1}
            value={weightValue}
            onChange={(e) => setWeightValue(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Height Input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Height
            </label>
            <span className="text-zinc-200 font-mono font-bold text-base">
              {heightCm} cm
            </span>
          </div>
          <input
            type="range"
            min={130}
            max={220}
            step={1}
            value={heightCm}
            onChange={(e) => setHeightCm(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Clinical Info Badge */}
        <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 p-3.5 space-y-1.5 text-xs text-zinc-400 leading-relaxed">
          <div className="flex items-center justify-between text-zinc-300 font-bold">
            <span>Estimated Basal Burn (BMR):</span>
            <span className="text-emerald-400 font-mono">~{bmr} kcal/day</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Calorie expenditure is calculated using the Stanford Compendium of Physical Activities MET formula, adjusted for your exact mass.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase text-sm tracking-wider shadow-lg shadow-emerald-500/25 transition active:scale-[0.98]"
        >
          Save & Recalibrate Metrics
        </button>
      </div>
    </div>
  );
}
