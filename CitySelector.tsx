"use client";

import { useState } from "react";
import { searchPlaces } from "@/lib/geolocation";
import type { Coord } from "@/lib/types";

type Props = {
  onPick: (coord: Coord) => void;
  onBack: () => void;
};

export function CitySelector({ onPick, onBack }: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; label: string; lat: number; lon: number }>>(
    []
  );
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    try {
      setRows(await searchPlaces(q));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Seleccionar lugar</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Las alertas globales siguen visibles. La distancia se calcula desde
          esta ciudad.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ciudad o país"
            className="flex-1 rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
          />
          <button
            type="button"
            onClick={search}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
          >
            {busy ? "…" : "Buscar"}
          </button>
        </div>
        <ul className="mt-3 max-h-56 space-y-1 overflow-auto">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() =>
                  onPick({ lat: r.lat, lon: r.lon, source: "manual", label: r.label })
                }
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onBack} className="mt-4 text-sm underline">
          Volver
        </button>
      </div>
    </div>
  );
}
