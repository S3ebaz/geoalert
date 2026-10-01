"use client";

import type { CrossAlert, ThreatLevel } from "@/lib/types";

const COPY: Record<Exclude<ThreatLevel, "none">, string> = {
  watch: "Vigilancia",
  warning: "Advertencia",
  emergency: "Alerta roja"
};

export function AlertBanner({
  level,
  alerts,
  onOpenEmergency
}: {
  level: ThreatLevel;
  alerts: CrossAlert[];
  onOpenEmergency: () => void;
}) {
  if (level === "none") {
    return (
      <div className="rounded-xl bg-emerald-700 px-4 py-3 text-sm text-white">
        Sin amenazas cercanas en los umbrales de este prototipo. Sigue las
        fuentes oficiales de tu país.
      </div>
    );
  }

  const top = alerts[0];
  const tone =
    level === "emergency"
      ? "bg-red-800 emergency-pulse"
      : level === "warning"
        ? "bg-amber-700"
        : "bg-sky-800";

  return (
    <div className={`rounded-xl px-4 py-3 text-white ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">{COPY[level]}</p>
          <p className="mt-1 font-medium">{top.title}</p>
          <p className="mt-1 text-sm text-white/90">{top.detail}</p>
        </div>
        {level === "emergency" ? (
          <button
            type="button"
            onClick={onOpenEmergency}
            className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-800"
          >
            Guía
          </button>
        ) : null}
      </div>
    </div>
  );
}
