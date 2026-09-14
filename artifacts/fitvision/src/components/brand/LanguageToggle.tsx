import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../services/i18n";

interface LanguageToggleProps {
  className?: string;
  compact?: boolean;
}

export function LanguageToggle({ className = "", compact = false }: LanguageToggleProps) {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <motion.button
      type="button"
      onClick={toggleLanguage}
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.03 }}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={lang === "ar" ? "Switch interface to English" : "تحويل واجهة التطبيق إلى اللغة العربية"}
      className={`flex items-center gap-1.5 rounded-full border border-zinc-700/70 bg-zinc-900/90 text-zinc-200 shadow-sm transition hover:border-emerald-500/50 hover:bg-zinc-800 active:scale-95 ${
        compact ? "h-9 px-2.5 text-xs font-bold" : "h-9 px-3 text-xs font-bold"
      } ${className}`}
    >
      <span className="text-sm" aria-hidden="true">🌐</span>
      <span className="font-extrabold uppercase tracking-wider text-emerald-400">
        {lang === "ar" ? "EN" : "عربي"}
      </span>
    </motion.button>
  );
}
