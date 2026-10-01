"use client";

import { useEffect, useState } from "react";
import {
  QUAKE_CLASSES,
  STORM_CATEGORIES,
  quakeDiameter,
  stormGlyphSvg
} from "@/lib/symbology";

/** Magnitud representativa de cada clase, solo para dibujar su tamaño real. */
const SAMPLE_MAG: Record<string, number> = {
  micro: 2.5,
  menor: 3.5,
  ligero: 4.5,
  moderado: 5.5,
  fuerte: 6.5,
  mayor: 7.5
};

const QUAKE_TICKS: Record<string, string> = {
  micro: "<3",
  menor: "3",
  ligero: "4",
  moderado: "5",
  fuerte: "6",
  mayor: "7+"
};

/** Los glifos de ciclón se dibujan al 60 % para que la tira quepa. */
const STORM_SCALE = 0.6;

export function MapLegend() {
  const [open, setOpen] = useState(true);

  // En pantallas angostas arranca colapsada para no tapar el mapa.
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  }, []);

  return (
    <aside
      className="pointer-events-none max-w-[17rem] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs text-slate-800 shadow-md dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
      aria-label="Simbología del mapa"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="pointer-events-auto flex w-full items-center justify-between gap-3 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        <span>Simbología</span>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>

      {open ? (
        <div className="mt-2 space-y-3">
          <p className="flex items-center gap-2">
            <span className="ga-user-dot shrink-0" />
            <span>Tu posición</span>
          </p>

          <div>
            <p className="font-medium">Sismo · magnitud (tamaño y color)</p>
            <div className="mt-1.5 flex items-end justify-between">
              {QUAKE_CLASSES.map((c) => {
                const d = quakeDiameter(SAMPLE_MAG[c.key]);
                return (
                  <div key={c.key} className="flex flex-col items-center gap-1">
                    <span
                      className="ga-q"
                      style={{ width: d, height: d, background: c.color }}
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {QUAKE_TICKS[c.key]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-medium">Ciclón · categoría (viento sostenido)</p>
            <div className="mt-1.5 flex items-end justify-between">
              {STORM_CATEGORIES.map((c) => (
                <div key={c.key} className="flex flex-col items-center gap-1">
                  <span
                    className="block leading-none"
                    dangerouslySetInnerHTML={{
                      __html: stormGlyphSvg(c.color, Math.round(c.size * STORM_SCALE))
                    }}
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {c.key === "TD" || c.key === "TS" ? c.key : c.key.slice(1)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              TD depresión · TS tormenta · 1–5 huracán (Saffir–Simpson)
            </p>
          </div>

          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border-2"
                style={{ borderColor: "#ef4444" }}
              />
              <span>Anillo: evento de la última hora</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white opacity-70"
                style={{ background: "#fb923c", boxShadow: "0 0 0 1px rgb(15 23 42 / 0.55)" }}
              />
              <span>Atenuado: más de 6 h</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white bg-sky-700 text-[10px] font-bold text-white">
                ≈
              </span>
              <span>Región oceánica (indicador USGS)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-red-700/70 bg-red-700/20" />
              <span>Halo: área aproximada, no oficial</span>
            </li>
          </ul>

          <p className="border-t border-slate-200 pt-2 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Toca un símbolo para ver toda su información.
          </p>
        </div>
      ) : null}
    </aside>
  );
}
