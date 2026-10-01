"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { bearingDeg, compassEs, estimateWaveTimes, formatKm, haversineKm } from "@/lib/geo";
import {
  LEVEL_STYLE,
  PAGER_LABEL,
  ageBucket,
  basinLabel,
  classificationLabel,
  depthLabel,
  formatAge,
  formatCoord,
  formatLocal,
  formatUtc,
  ktToKmh,
  ktToMph,
  quakeClass,
  stormCategory,
  stormGlyphSvg
} from "@/lib/symbology";
import type { Coord, CrossAlert, EarthquakeEvent, StormEvent } from "@/lib/types";

export type PanelTarget =
  | { kind: "quake"; quake: EarthquakeEvent }
  | { kind: "storm"; storm: StormEvent }
  | { kind: "user" };

/* ───────────── Piezas pequeñas ───────────── */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-x-3 py-1.5 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return <span className="block text-xs text-slate-500 dark:text-slate-400">{children}</span>;
}

function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      style={color ? { background: color, color: "#fff" } : undefined}
    >
      {children}
    </span>
  );
}

/** Solo enlaces http(s); descarta cualquier otro esquema que llegue de un feed. */
function safeUrl(url?: string): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      className="font-medium text-sky-700 underline dark:text-sky-400"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children} ↗
    </a>
  );
}

function mapsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

function fmtSeconds(s: number) {
  return s < 120 ? `${Math.round(s)} s` : `${(s / 60).toFixed(1)} min`;
}

/** Qué significa este evento para tu posición (según el motor de alertas). */
function ForYou({ alerts }: { alerts: CrossAlert[] }) {
  if (alerts.length === 0) {
    return (
      <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Sin alerta para tu ubicación con los umbrales de este prototipo.
      </p>
    );
  }
  return (
    <>
      {alerts.map((a) => {
        if (a.level === "none") return null;
        const style = LEVEL_STYLE[a.level];
        return (
          <div
            key={a.id}
            className="mt-3 rounded-lg px-3 py-2 text-white"
            style={{ background: style.bg }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide">
              {style.label} para tu posición
            </p>
            <p className="mt-0.5 text-sm font-medium">{a.title}</p>
            <p className="mt-0.5 text-xs text-white/90">{a.detail}</p>
          </div>
        );
      })}
    </>
  );
}

/* ───────────── Sismo ───────────── */

function quakeHeader(q: EarthquakeEvent, now: number) {
  const cls = quakeClass(q.mag);
  const fresh = ageBucket(q.time, now) === "fresh";
  const darkText = cls.key === "micro" || cls.key === "menor";
  return {
    kind: "Sismo · USGS",
    title: q.place,
    symbol: (
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-sm font-bold shadow ring-1 ring-slate-900/50"
        style={{ background: cls.color, color: darkText ? "#1f2937" : "#ffffff" }}
      >
        {q.mag.toFixed(1)}
      </span>
    ),
    chips: (
      <>
        <Chip color={cls.color}>{cls.label}</Chip>
        {fresh ? <Chip>Última hora</Chip> : null}
        {q.tsunami ? <Chip>Región oceánica</Chip> : null}
      </>
    )
  };
}

function QuakeBody({
  q,
  user,
  alerts,
  now
}: {
  q: EarthquakeEvent;
  user: Coord;
  alerts: CrossAlert[];
  now: number;
}) {
  const cls = quakeClass(q.mag);
  const dist = haversineKm(user, q);
  const waves = estimateWaveTimes(Math.hypot(dist, Math.max(0, q.depthKm)));
  const pager = q.pagerAlert ? PAGER_LABEL[q.pagerAlert.toLowerCase()] : undefined;
  const usgs = safeUrl(q.url);

  return (
    <>
      <ForYou alerts={alerts.filter((a) => a.sourceEventId === q.id)} />

      <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
        <Row label="Magnitud">
          <span className="font-semibold">M{q.mag.toFixed(1)}</span>
          {q.magType ? ` (${q.magType})` : ""} · {cls.label}
          <Sub>Escala USGS: {cls.range}</Sub>
        </Row>
        <Row label="Cuándo">
          <span className="font-medium">{formatAge(q.time, now)}</span>
          <Sub>{formatLocal(q.time)}</Sub>
          <Sub>{formatUtc(q.time)}</Sub>
        </Row>
        <Row label="Profundidad">
          {q.depthKm.toFixed(1)} km · {depthLabel(q.depthKm)}
        </Row>
        <Row label="Epicentro">{formatCoord(q.lat, q.lon)}</Row>
        <Row label="Respecto a ti">
          {formatKm(dist)} al {compassEs(bearingDeg(user, q))}
          <Sub>Distancia en superficie desde tu posición de referencia</Sub>
        </Row>
        <Row label="Ondas P / S">
          P ≈ {fmtSeconds(waves.pSec)} · S ≈ {fmtSeconds(waves.sSec)}
          <Sub>
            Tras el origen, hasta tu posición (modelo educativo con profundidad; no es alerta
            oficial)
          </Sub>
        </Row>
        <Row label="Reportes">
          {q.felt != null
            ? `${q.felt} ${q.felt === 1 ? "reporte ciudadano" : "reportes ciudadanos"}`
            : "Sin reportes ciudadanos"}
          {q.cdi != null ? <Sub>Intensidad máxima percibida (CDI): {q.cdi.toFixed(1)}</Sub> : null}
        </Row>
        {q.mmi != null ? (
          <Row label="Intensidad">{q.mmi.toFixed(1)} (MMI instrumental)</Row>
        ) : null}
        {pager ? (
          <Row label="Impacto">
            <span className="font-semibold" style={{ color: pager.color }}>
              {pager.label}
            </span>
            <Sub>Estimación PAGER de USGS</Sub>
          </Row>
        ) : null}
        {q.sig != null ? <Row label="Importancia">{q.sig} · escala USGS 0–1000+</Row> : null}
        <Row label="Estado">
          {q.status === "reviewed"
            ? "Revisado por un analista"
            : q.status === "automatic"
              ? "Automático, sin revisar (puede cambiar)"
              : (q.status ?? "No informado")}
        </Row>
      </dl>

      {q.tsunami ? (
        <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900 dark:bg-sky-950 dark:text-sky-200">
          Evento en región oceánica (indicador de USGS). Ese indicador no confirma que haya o vaya a
          haber tsunami: consulta a la autoridad local o{" "}
          <a className="underline" href="https://www.tsunami.gov/" target="_blank" rel="noreferrer">
            tsunami.gov
          </a>
          .
        </p>
      ) : null}

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-sky-700 dark:text-sky-400">
          Detalles técnicos
        </summary>
        <dl className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          {q.updated != null ? (
            <Row label="Actualizado">{formatAge(q.updated, now)}</Row>
          ) : null}
          {q.net ? <Row label="Red">{q.net}</Row> : null}
          {q.nst != null ? <Row label="Estaciones">{q.nst}</Row> : null}
          {q.gap != null ? <Row label="Hueco azimutal">{q.gap}°</Row> : null}
          {q.dmin != null ? <Row label="Estación más cercana">{q.dmin}° (distancia angular)</Row> : null}
          {q.rms != null ? <Row label="Residuo RMS">{q.rms} s</Row> : null}
          <Row label="ID">{q.id}</Row>
        </dl>
      </details>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {usgs ? <ExtLink href={usgs}>Ficha en USGS</ExtLink> : null}
        <ExtLink href={mapsUrl(q.lat, q.lon)}>Ver en Google Maps</ExtLink>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
        Datos: USGS. Este prototipo no es un sistema oficial de alerta temprana.
      </p>
    </>
  );
}

/* ───────────── Ciclón ───────────── */

function stormHeader(s: StormEvent) {
  const cat = stormCategory(s);
  return {
    kind: "Ciclón · NHC",
    title: s.name,
    symbol: (
      <span
        className="block leading-none"
        dangerouslySetInnerHTML={{ __html: stormGlyphSvg(cat.color, 44) }}
      />
    ),
    chips: (
      <>
        <Chip color={cat.color}>{cat.label}</Chip>
      </>
    )
  };
}

function StormBody({
  s,
  user,
  alerts,
  now
}: {
  s: StormEvent;
  user: Coord;
  alerts: CrossAlert[];
  now: number;
}) {
  const cat = stormCategory(s);
  const dist = haversineKm(user, s);
  const basin = basinLabel(s.id, s.basin);
  const links = [
    { href: safeUrl(s.advisoryUrl), label: "Aviso público del NHC" },
    { href: safeUrl(s.discussionUrl), label: "Discusión del pronóstico" },
    { href: safeUrl(s.graphicsUrl), label: "Gráficos y cono de trayectoria" }
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));
  const lastUpdate = s.lastUpdate ? Date.parse(s.lastUpdate) : NaN;

  return (
    <>
      <ForYou alerts={alerts.filter((a) => a.sourceEventId === s.id)} />

      <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
        <Row label="Clasificación">
          {classificationLabel(s.classification)}
          {classificationLabel(s.classification) !== s.classification ? (
            <Sub>Código NHC: {s.classification}</Sub>
          ) : null}
        </Row>
        <Row label="Categoría">
          {s.windKt != null ? cat.label : `${cat.label} (estimada: el NHC no informó el viento)`}
          {s.windKt != null ? <Sub>Escala Saffir–Simpson según el viento sostenido</Sub> : null}
        </Row>
        <Row label="Viento máx.">
          {s.windKt != null ? (
            <>
              <span className="font-semibold">{Math.round(ktToKmh(s.windKt))} km/h</span> ·{" "}
              {Math.round(ktToMph(s.windKt))} mph · {Math.round(s.windKt)} kt
              <Sub>Sostenido, promedio de 1 minuto</Sub>
            </>
          ) : (
            "No informado"
          )}
        </Row>
        <Row label="Presión mín.">
          {s.pressureMb != null ? `${Math.round(s.pressureMb)} mb (hPa)` : "No informada"}
        </Row>
        <Row label="Posición">{formatCoord(s.lat, s.lon)}</Row>
        <Row label="Respecto a ti">
          {formatKm(dist)} al {compassEs(bearingDeg(user, s))}
          <Sub>Distancia al centro del sistema, no al borde de sus vientos</Sub>
        </Row>
        <Row label="Movimiento">
          {s.movementDir != null && s.movementSpeedMph != null
            ? `Hacia el ${compassEs(s.movementDir)} (${Math.round(s.movementDir)}°) a ${Math.round(
                s.movementSpeedMph * 1.609
              )} km/h (${Math.round(s.movementSpeedMph)} mph)`
            : "No informado"}
        </Row>
        {basin ? <Row label="Cuenca">{basin}</Row> : null}
        {Number.isFinite(lastUpdate) ? (
          <Row label="Actualizado">
            {formatAge(lastUpdate, now)}
            <Sub>{formatLocal(lastUpdate)}</Sub>
          </Row>
        ) : null}
        <Row label="ID">{s.id}</Row>
      </dl>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {links.length > 0 ? (
          links.map((l) => (
            <ExtLink key={l.href} href={l.href}>
              {l.label}
            </ExtLink>
          ))
        ) : (
          <ExtLink href="https://www.nhc.noaa.gov/">Centro Nacional de Huracanes</ExtLink>
        )}
        <ExtLink href={mapsUrl(s.lat, s.lon)}>Ver en Google Maps</ExtLink>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
        Datos: NHC (posición actual). El círculo tenue del mapa es un halo ilustrativo de ~180 km,
        no el cono de incertidumbre ni los radios de viento oficiales.
      </p>
    </>
  );
}

/* ───────────── Tu posición ───────────── */

function UserBody({ user }: { user: Coord }) {
  return (
    <>
      <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
        <Row label="Lugar">{user.label ?? "Sin nombre"}</Row>
        <Row label="Coordenadas">{formatCoord(user.lat, user.lon)}</Row>
        <Row label="Fuente">
          {user.source === "gps" ? "GPS del dispositivo" : "Ciudad elegida manualmente"}
        </Row>
        {user.accuracyM != null ? <Row label="Precisión">± {Math.round(user.accuracyM)} m</Row> : null}
      </dl>
      <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
        Esta posición es la referencia para calcular distancias y alertas. Puedes cambiarla con
        «Cambiar ubicación».
      </p>
    </>
  );
}

/* ───────────── Panel ───────────── */

export function EventDetailPanel({
  target,
  user,
  alerts,
  now,
  onClose
}: {
  target: PanelTarget;
  user: Coord;
  alerts: CrossAlert[];
  now: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const head =
    target.kind === "quake"
      ? quakeHeader(target.quake, now)
      : target.kind === "storm"
        ? stormHeader(target.storm)
        : {
            kind: "Tu posición",
            title: user.label ?? "Referencia",
            symbol: (
              <span className="flex h-11 w-11 items-center justify-center">
                <span className="ga-user-dot" />
              </span>
            ),
            chips: null
          };

  return (
    <section
      role="dialog"
      aria-label={`Detalle: ${head.title}`}
      className="absolute inset-x-2 bottom-2 z-[1100] flex max-h-[62%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 md:inset-x-auto md:bottom-3 md:right-3 md:top-14 md:max-h-none md:w-[22rem]"
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
        <div className="shrink-0">{head.symbol}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {head.kind}
          </p>
          <h3 className="text-base font-semibold leading-snug">{head.title}</h3>
          {head.chips ? <div className="mt-1.5 flex flex-wrap gap-1.5">{head.chips}</div> : null}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ✕
        </button>
      </header>
      <div className="overflow-y-auto overscroll-contain px-3 pb-3">
        {target.kind === "quake" ? (
          <QuakeBody q={target.quake} user={user} alerts={alerts} now={now} />
        ) : target.kind === "storm" ? (
          <StormBody s={target.storm} user={user} alerts={alerts} now={now} />
        ) : (
          <UserBody user={user} />
        )}
      </div>
    </section>
  );
}
