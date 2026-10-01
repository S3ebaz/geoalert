"use client";

import { nearbySafePlaces, osmDirectionsUrl, OFFICIAL_LINKS } from "@/lib/shelters";
import type { Coord } from "@/lib/types";

export function EmergencyPanel({
  user,
  onClose
}: {
  user: Coord;
  onClose: () => void;
}) {
  const places = nearbySafePlaces(user);

  return (
    <section className="rounded-2xl border-4 border-red-800 bg-white p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-red-800">Modo emergencia</h2>
        <button type="button" onClick={onClose} className="text-sm underline">
          Cerrar
        </button>
      </div>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6">
        <li>Agáchate, cúbrete y sujétate si el suelo está temblando.</li>
        <li>Aléjate de ventanas, cornisas, cables y laderas inestables.</li>
        <li>Usa rutas a pie visibles. No entres a edificios dañados.</li>
        <li>Confirma refugios solo con Protección Civil / autoridad local.</li>
      </ol>
      <h3 className="mt-5 text-sm font-semibold">Puntos orientativos</h3>
      <ul className="mt-2 space-y-2">
        {places.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
          >
            <span>
              {p.name}
              <span className="block text-xs text-slate-500">
                {p.distanceKm.toFixed(2)} km · {p.type}
              </span>
            </span>
            <a
              className="text-sky-700 underline dark:text-sky-400"
              href={osmDirectionsUrl(user, p)}
              target="_blank"
              rel="noreferrer"
            >
              Ruta
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">
        Este panel no contiene un inventario oficial de refugios. Conecta el
        shapefile o API de tu jurisdicción antes de usarlo con público.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {OFFICIAL_LINKS.map((l) => (
          <a key={l.href} href={l.href} className="underline" target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
