import React, { useId } from "react";

interface WiseBodyLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * World-Class Athletic Brand Mark for Wise Body
 * Sleek, kinetic dual-wing "W" infinity mark with electric emerald & solar glow.
 */
export function WiseBodyLogo({ size = 48, className = "", showText = false }: WiseBodyLogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const idGrad = `wb-grad-${uid}`;
  const idGlow = `wb-glow-${uid}`;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-md"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={idGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <radialGradient id={idGlow} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Dark Carbon Squircle */}
        <rect
          x="4"
          y="4"
          width="112"
          height="112"
          rx="32"
          className="fill-stone-950 stroke-white/15"
          strokeWidth="1.5"
        />

        {/* Ambient Glow */}
        <rect x="4" y="4" width="112" height="112" rx="32" fill={`url(#${idGlow})`} />

        {/* Kinetic Athletic "W" Wings Emblem */}
        <g stroke={`url(#${idGrad})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
          {/* Left wing slash */}
          <path d="M28 42L44 82L60 52" />
          {/* Right wing slash */}
          <path d="M60 52L76 82L92 42" />
          {/* Center core pulse node */}
          <circle cx="60" cy="52" r="3" fill="#34D399" stroke="none" />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-black text-lg tracking-tight uppercase leading-none text-stone-900 dark:text-white">
            Wise<span className="text-emerald-500">Body</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400 dark:text-stone-500 mt-0.5">
            Pro Fitness
          </span>
        </div>
      )}
    </div>
  );
}
