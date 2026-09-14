import React, { useEffect, useState } from "react";
import type { HeartRateData, HeartRateZone } from "../../types/workout";
import { bluetoothHR } from "../../services/bluetoothHeartRateService";

interface HeartRateWidgetProps {
  className?: string;
  compact?: boolean;
  onHeartRateUpdate?: (data: HeartRateData) => void;
}

const ZONE_COLORS: Record<HeartRateZone, { bg: string; text: string; label: string }> = {
  warmup: { bg: "bg-blue-500/15 border-blue-500/30", text: "text-blue-400", label: "Warmup" },
  fat_burn: { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400", label: "Fat Burn" },
  cardio: { bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400", label: "Cardio" },
  peak: { bg: "bg-red-500/15 border-red-500/30", text: "text-red-400", label: "Peak" },
};

export function HeartRateWidget({ className = "", compact = false, onHeartRateUpdate }: HeartRateWidgetProps) {
  const [data, setData] = useState<HeartRateData>(bluetoothHR.getData());
  const [connecting, setConnecting] = useState(false);
  const supported = bluetoothHR.isSupported();

  useEffect(() => {
    const unsub = bluetoothHR.subscribe((d) => {
      setData(d);
      if (onHeartRateUpdate) onHeartRateUpdate(d);
    });
    return unsub;
  }, [onHeartRateUpdate]);

  const handleConnect = async () => {
    if (data.connected) {
      bluetoothHR.disconnect();
      return;
    }
    setConnecting(true);
    await bluetoothHR.connect();
    setConnecting(false);
  };

  if (!supported) return null;

  const zoneInfo = ZONE_COLORS[data.zone];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {data.connected ? (
        <button
          type="button"
          onClick={handleConnect}
          title={`${data.deviceName || "HR Monitor"}: ${data.bpm} BPM. Click to disconnect.`}
          className={`flex items-center gap-2 rounded-full px-3 py-1 border shadow-sm transition active:scale-95 ${zoneInfo.bg}`}
        >
          <span className="text-red-500 text-sm animate-ping duration-1000">❤️</span>
          <span className="font-mono font-black text-xs text-white tabular-nums">
            {data.bpm} <span className="text-[10px] font-bold text-zinc-400">BPM</span>
          </span>
          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-black/40 ${zoneInfo.text}`}>
            {zoneInfo.label}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          title="Connect Bluetooth Heart Rate Monitor (Apple Watch / Polar / Garmin)"
          className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 px-3 py-1 text-zinc-300 text-xs font-bold transition active:scale-95"
        >
          <span className="text-xs">💓</span>
          <span>{connecting ? "Pairing…" : "Pair HR"}</span>
        </button>
      )}
    </div>
  );
}
