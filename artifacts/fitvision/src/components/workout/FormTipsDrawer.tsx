import { useState } from "react";
import type { Exercise } from "../../types/workout";

interface FormTipsDrawerProps {
  exercise: Exercise;
  className?: string;
}

export function FormTipsDrawer({ exercise, className = "" }: FormTipsDrawerProps) {
  const [expanded, setExpanded] = useState(false);

  const tips = exercise.tips && exercise.tips.length > 0
    ? exercise.tips
    : [
        "Maintain steady, controlled breathing throughout the movement.",
        "Keep your core activated to protect the spine.",
        "Focus on smooth form over speed.",
      ];

  return (
    <div className={`rounded-2xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-md border border-stone-200/80 dark:border-stone-800/80 transition shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left group"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs">
            💡
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Form Coaching & Technique Tips
          </span>
        </div>
        <span className="text-xs font-semibold text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3.5 pt-1 border-t border-stone-100 dark:border-stone-800/60 animate-in fade-in duration-200">
          <ul className="space-y-2 mt-1">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
