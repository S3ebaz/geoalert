"use client";

import { useEffect, useMemo, useState } from "react";
import { haversineKm } from "@/lib/geo";
import {
  cloudMotion,
  fetchPointForecast,
  fetchStateForecasts,
  type PlaceForecast
} from "@/lib/state-forecast";
import type { Coord } from "@/lib/types";

function hourLabel(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function Card({ f, highlight }: { f: PlaceForecast; highlight?: boolean }) {
  return (
    <article
      className={`rounded-2xl border p-3 ${
        highlight
          ? "border-sky-600 bg-sky-50 dark:bg-sky-950"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{f.state}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{f.place}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums leading-none">
        {Number.isFinite(f.tempC) ? f.tempC.toFixed(1) : "—"}
        <span className="text-lg"> °C</span>
      </p>
      {f.feelsC != null ? (
        <p className="mt-1 text-xs text-slate-500">Sensación {f.feelsC.toFixed(1)} °C</p>
      ) : null}
      <p className="mt-2 text-sm">
        Lluvia ahora {Math.round(f.rainProbNow)}% · máx. 6 h {Math.round(f.rainProb6h)}%
      </p>
      <p className="text-sm">Nubes {cloudMotion(f)}</p>
      <p className="text-xs text-slate-500">Cobertura nubosa {Math.round(f.cloudCover)}%</p>
      {f.hours.length > 0 ? (
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {f.hours.slice(0, 8).map((h) => (
            <div
              key={h.time}
              className="min-w-[3.4rem] rounded-lg bg-slate-100 px-1 py-1 text-center text-[10px] dark:bg-slate-900"
            >
              <div>{hourLabel(h.time)}</div>
              <div className="font-semibold">{Number.isFinite(h.tempC) ? `${Math.round(h.tempC)}°` : "—"}</div>
              <div>{Math.round(h.rainProb)}%</div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function StateForecast({ user }: { user: Coord | null }) {
  const [rows, setRows] = useState<PlaceForecast[]>([]);
  const [here, setHere] = useState<PlaceForecast | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const next = await fetchStateForecasts();
        if (!stop) {
          setRows(next);
          setError(null);
        }
      } catch {
        if (!stop) setError("No se pudo leer el pronóstico de Open-Meteo.");
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 15 * 60_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setHere(null);
      return;
    }
    let stop = false;
    void fetchPointForecast(user.lat, user.lon, user.label ?? "GPS")
      .then((f) => {
        if (!stop) setHere(f);
      })
      .catch(() => {
        if (!stop) setHere(null);
      });
    return () => {
      stop = true;
    };
  }, [user]);

  const nearest = useMemo(() => {
    if (!user || rows.length === 0) return null;
    return rows.reduce((best, row) =>
      haversineKm(user, row) < haversineKm(user, best) ? row : best
    );
  }, [user, rows]);

  const shown = rows.filter((r) => {
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return r.state.toLowerCase().includes(n) || r.place.toLowerCase().includes(n);
  });

  return (
    <section className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
      <h2 className="text-base font-semibold">Pronóstico por estado</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Grados Celsius, probabilidad de lluvia y movimiento de las nubes (dirección a la que empuja
        el viento). Cada estado usa su capital como punto de mayor precisión del modelo; no es el
        promedio de todo el territorio. Fuente: Open-Meteo.
      </p>
      {here ? (
        <div className="mt-3">
          <Card f={here} highlight />
        </div>
      ) : null}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar estado"
        className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
      />
      {error ? <p className="mt-2 text-amber-700">{error}</p> : null}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <Card key={r.id} f={r} highlight={nearest?.id === r.id} />
        ))}
      </div>
    </section>
  );
}
