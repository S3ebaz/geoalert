"use client";

import { AlertBanner } from "@/components/AlertBanner";
import { CitySelector } from "@/components/CitySelector";
import { EmergencyPanel } from "@/components/EmergencyPanel";
import { MapView } from "@/components/MapView";
import { PermissionModal } from "@/components/PermissionModal";
import { useState } from "react";
import { useThreatMonitor } from "@/lib/useThreatMonitor";
import { clearSavedCoord } from "@/lib/geolocation";
import type { CrossAlert, MapSelection } from "@/lib/types";

/** Evento del mapa al que apunta una alerta (el clima local no tiene símbolo). */
function selectionForAlert(a: CrossAlert): MapSelection {
  if (a.kind === "earthquake") return { kind: "quake", id: a.sourceEventId };
  if (a.kind === "storm") return { kind: "storm", id: a.sourceEventId };
  return null;
}

export default function HomePage() {
  const m = useThreatMonitor();
  const [selection, setSelection] = useState<MapSelection>(null);

  const showOnMap = (sel: MapSelection) => {
    setSelection(sel);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById("mapa")
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">GeoAlerta Global</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Prototipo educativo · USGS + NHC + Open-Meteo
          </p>
        </div>
        <button
          type="button"
          className="text-xs underline"
          onClick={() => {
            clearSavedCoord();
            window.location.reload();
          }}
        >
          Cambiar ubicación
        </button>
      </header>

      {m.coord ? (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Referencia: {m.coord.label ?? `${m.coord.lat.toFixed(3)}, ${m.coord.lon.toFixed(3)}`}{" "}
            · fuente {m.coord.source}
          </p>
          <AlertBanner
            level={m.level}
            alerts={m.alerts}
            onOpenEmergency={() => m.setEmergencyOpen(true)}
          />
          <div id="mapa" className="scroll-mt-4">
            <MapView
              user={m.coord}
              quakes={m.quakes}
              storms={m.storms}
              alerts={m.alerts}
              selection={selection}
              onSelect={setSelection}
            />
          </div>
          {m.emergencyOpen ? (
            <EmergencyPanel user={m.coord} onClose={() => m.setEmergencyOpen(false)} />
          ) : null}
          <section className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
            <h2 className="font-semibold">Alertas cruzadas</h2>
            {m.alerts.length === 0 ? (
              <p className="mt-2 text-slate-500">Ninguna dentro de umbral.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {m.alerts.map((a) => {
                  const sel = selectionForAlert(a);
                  return (
                    <li key={a.id}>
                      <span className="font-medium">{a.title}</span>
                      <span className="block text-slate-500">{a.detail}</span>
                      {sel ? (
                        <button
                          type="button"
                          onClick={() => showOnMap(sel)}
                          className="mt-1 text-xs font-medium text-sky-700 underline dark:text-sky-400"
                        >
                          Ver en el mapa
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm dark:border-slate-700">
          Esperando ubicación para calcular distancias.
        </div>
      )}

      <footer className="mt-auto text-xs leading-5 text-slate-500">
        GeoAlerta no es un sistema oficial de alerta temprana. Un navegador que
        consulta feeds públicos no puede adelantarse a las ondas S como
        ShakeAlert o SASMEX. En una emergencia real sigue a Protección Civil
        y a los servicios meteorológicos/sismológicos de tu país.
      </footer>

      {m.needPermission && !m.manualOpen ? (
        <PermissionModal
          busy={m.busyGeo}
          error={m.geoError}
          onAllow={() => void m.allowGps()}
          onManual={() => m.setManualOpen(true)}
        />
      ) : null}
      {m.manualOpen ? (
        <CitySelector onPick={m.pickManual} onBack={() => m.setManualOpen(false)} />
      ) : null}
    </main>
  );
}
