"use client";

import { AlertBanner } from "@/components/AlertBanner";
import { CitySelector } from "@/components/CitySelector";
import { EmergencyPanel } from "@/components/EmergencyPanel";
import { MapView } from "@/components/MapView";
import { PermissionModal } from "@/components/PermissionModal";
import { StateForecast } from "@/components/StateForecast";
import { WeatherBoard } from "@/components/WeatherBoard";
import { useState } from "react";
import { useThreatMonitor } from "@/lib/useThreatMonitor";
import { clearSavedCoord } from "@/lib/geolocation";
import { classificationLabel, ktToKmh, stormCategory } from "@/lib/symbology";
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

      <section className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
        <h2 className="font-semibold">Ciclones activos</h2>
        <p className="mt-1 text-xs text-slate-500">
          Huracanes, tormentas y depresiones del NHC, con trayectoria de pronóstico. La copia se
          actualiza en cada publicación porque el feed oficial no permite lectura desde el navegador.
        </p>
        {m.storms.length === 0 ? (
          <p className="mt-2 text-slate-500">Ningún ciclón activo en el último aviso del NHC.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {m.storms.map((s) => {
              const cat = stormCategory(s);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900"
                >
                  <span>
                    <span className="font-medium">
                      {classificationLabel(s.classification)} {s.name}
                    </span>
                    <span className="block text-slate-500">
                      {cat.label}
                      {s.windKt != null ? ` · ${Math.round(ktToKmh(s.windKt))} km/h` : ""}
                      {s.track && s.track.length > 1 ? " · trayectoria en el mapa" : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => showOnMap({ kind: "storm", id: s.id })}
                    className="shrink-0 text-xs font-medium text-sky-700 underline dark:text-sky-400"
                  >
                    Ver en el mapa
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <WeatherBoard user={m.coord} onRefresh={() => void m.refresh()} />

      <section className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
        <h2 className="font-semibold">Frentes fríos · aviso SMN</h2>
        <p className="mt-1 text-xs text-slate-500">
          Aviso {m.frontBulletin.aviso || "—"} · emisión {m.frontBulletin.issuedAt || "sin hora"} · fuente
          oficial del Servicio Meteorológico Nacional.
        </p>
        <p className="mt-2 font-medium">{m.frontBulletin.summary}</p>
        {m.fronts.length === 0 ? (
          <p className="mt-2 text-slate-500">
            El SMN no marca un frente sobre el país en este aviso, así que el mapa no dibuja uno.
          </p>
        ) : (
          m.fronts.map((f) => (
            <p key={f.id} className="mt-2">
              <span className="font-medium">{f.name}</span>
              {f.points.length > 0
                ? ` sobre ${f.points.map((p) => p.name).join(", ")}.`
                : " publicado por el SMN, sin coordenadas de estados en el aviso."}{" "}
              {f.summary}
            </p>
          ))
        )}
        <a className="mt-2 inline-block text-xs underline" href={m.frontBulletin.url} target="_blank" rel="noreferrer">
          Ver aviso del SMN
        </a>
      </section>

      <StateForecast user={m.coord} />

      <div id="mapa" className="scroll-mt-4">
        <MapView
          user={m.coord}
          quakes={m.quakes}
          storms={m.storms}
          fronts={m.fronts}
          alerts={m.alerts}
          selection={selection}
          onSelect={setSelection}
        />
      </div>

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
          Los ciclones ya están en el mapa. La ubicación solo hace falta para calcular distancias.
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
