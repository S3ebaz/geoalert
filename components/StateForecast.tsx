"use client";

"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { haversineKm } from "@/lib/geo";
import {
  cloudMotion,
  fetchPointForecast,
  fetchStateForecasts,
  type PlaceForecast
} from "@/lib/state-forecast";
import type { Coord } from "@/lib/types";

const MexicoTempMap = dynamic(() => import("./MexicoTempMap").then((m) => m.MexicoTempMap), {
  ssr: false,
  loading: () => (
    <div className="mt-3 flex h-[70vh] min-h-[420px] items-center justify-center rounded-2xl bg-slate-200 text-sm dark:bg-slate-800">
      Cargando mapa de estados…
    </div>
  )
});

export function StateForecast({ user }: { user: Coord | null }) {
  const [rows, setRows] = useState<PlaceForecast[]>([]);
  const [here, setHere] = useState<PlaceForecast | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    return rows.reduce((best, row) => (haversineKm(user, row) < haversineKm(user, best) ? row : best));
  }, [user, rows]);

  const selected = rows.find((r) => r.id === (selectedId ?? nearest?.id)) ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-800 sm:p-4">
      <h2 className="text-base font-semibold">Temperatura en cada estado</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        El número está sobre el estado, en °C. Toca un estado para ver lluvia y movimiento de las
        nubes. El color y la cifra son del punto de la capital, no el promedio de todo el territorio.
      </p>
      {here ? (
        <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-sm dark:bg-sky-950">
          Donde estás: <strong>{here.tempC.toFixed(1)} °C</strong> · lluvia {Math.round(here.rainProbNow)}% ·
          nubes {cloudMotion(here)}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-amber-700">{error}</p> : null}
      <MexicoTempMap forecasts={rows} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
      {selected ? (
        <p className="mt-2 text-sm">
          <strong>{selected.state}</strong> · {selected.tempC.toFixed(1)} °C · lluvia ahora{" "}
          {Math.round(selected.rainProbNow)}% · próximas 6 h {Math.round(selected.rainProb6h)}% · nubes{" "}
          {cloudMotion(selected)} · cielo cubierto {Math.round(selected.cloudCover)}%
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-500">Cargando temperaturas…</p>
      )}
    </section>
  );
}

