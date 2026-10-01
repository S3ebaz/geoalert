"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents
} from "react-leaflet";
import type {
  Coord,
  CrossAlert,
  EarthquakeEvent,
  MapSelection,
  StormEvent
} from "@/lib/types";
import {
  ageBucket,
  formatAge,
  quakeClass,
  quakeDiameter,
  stormCategory,
  stormGlyphSvg,
  type AgeBucket,
  type StormCategory
} from "@/lib/symbology";
import { EventDetailPanel } from "./EventDetailPanel";
import { MapLegend } from "./MapLegend";
import "leaflet/dist/leaflet.css";

type GoogleMapStyle = "roadmap" | "hybrid";

const MAX_QUAKES = 80;
/** Ancho aproximado del panel de detalle en pantallas anchas (px). */
const PANEL_PX = 364;

/* ───────────── Íconos ─────────────
 * Los íconos se cachean por clave: react-leaflet llama a setIcon() cuando la
 * referencia cambia, y recrear el DOM de un marcador en pleno clic lo rompe.
 */

const iconCache = new Map<string, L.DivIcon>();

function cachedIcon(key: string, make: () => L.DivIcon): L.DivIcon {
  let icon = iconCache.get(key);
  if (!icon) {
    icon = make();
    iconCache.set(key, icon);
  }
  return icon;
}

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[c];
  });
}

function userIcon(selected: boolean) {
  return cachedIcon(`u:${selected ? 1 : 0}`, () =>
    L.divIcon({
      className: "ga-symbol",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      tooltipAnchor: [0, -12],
      html:
        `<div class="ga-mk" role="img" aria-label="Tu posición" style="--c:#5ec8e8;--d:14px">` +
        `<span class="ga-ring"></span>` +
        (selected ? `<span class="ga-selring"></span>` : "") +
        `<span class="ga-user-dot"></span>` +
        `</div>`
    })
  );
}

function quakeIcon(q: EarthquakeEvent, bucket: AgeBucket, selected: boolean) {
  const cls = quakeClass(q.mag);
  const d = quakeDiameter(q.mag);
  const label = `Sismo magnitud ${q.mag.toFixed(1)}, ${cls.label.toLowerCase()}`;
  const key = `q:${cls.key}:${d}:${q.mag.toFixed(1)}:${bucket}:${selected ? 1 : 0}:${q.tsunami ? 1 : 0}`;
  return cachedIcon(key, () => {
    const box = Math.max(34, d + 18);
    return L.divIcon({
      className: "ga-symbol",
      iconSize: [box, box],
      iconAnchor: [box / 2, box / 2],
      tooltipAnchor: [0, -(d / 2) - 2],
      html:
        `<div class="ga-mk ga-${bucket}" role="img" aria-label="${esc(label)}" style="--c:${cls.color};--d:${d}px">` +
        (bucket === "fresh" ? `<span class="ga-ring"></span>` : "") +
        (selected ? `<span class="ga-selring"></span>` : "") +
        `<span class="ga-q" style="width:${d}px;height:${d}px;background:${cls.color}"></span>` +
        (q.tsunami ? `<span class="ga-badge">≈</span>` : "") +
        `</div>`
    });
  });
}

function stormIcon(s: StormEvent, cat: StormCategory, selected: boolean) {
  const key = `s:${cat.key}:${s.name}:${selected ? 1 : 0}`;
  return cachedIcon(key, () => {
    const disc = Math.round(cat.size * 0.9);
    const box = Math.max(40, cat.size + 14);
    const label = `Ciclón ${s.name}, ${cat.label}`;
    return L.divIcon({
      className: "ga-symbol",
      iconSize: [box, box],
      iconAnchor: [box / 2, box / 2],
      tooltipAnchor: [0, -(disc / 2) - 2],
      html:
        `<div class="ga-mk" role="img" aria-label="${esc(label)}" style="--c:${cat.color};--d:${disc}px">` +
        (selected ? `<span class="ga-selring"></span>` : "") +
        `<span class="ga-storm">${stormGlyphSvg(cat.color, cat.size)}</span>` +
        `</div>`
    });
  });
}

/* ───────────── Comportamiento del mapa ───────────── */

function stormPoints(storms: StormEvent[]): [number, number][] {
  const pts: [number, number][] = [];
  for (const s of storms) {
    pts.push([s.lat, s.lon]);
    for (const p of s.track ?? []) pts.push([p.lat, p.lon]);
  }
  return pts;
}

/** Encuadra todos los ciclones y su trayectoria. No salta a la ciudad del usuario. */
function FrameStorms({ storms, token }: { storms: StormEvent[]; token: number }) {
  const map = useMap();
  const key = storms.map((s) => `${s.id}:${s.lat}:${s.lon}`).join("|");
  useEffect(() => {
    const pts = stormPoints(storms);
    if (pts.length === 0) return;
    map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 5, animate: true });
    // key/token son la señal: no reencuadrar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, token, key]);
  return null;
}

function FlyToUser({ user, token }: { user: Coord | null; token: number }) {
  const map = useMap();
  useEffect(() => {
    if (!user || token === 0) return;
    map.setView([user.lat, user.lon], 6, { animate: true });
  }, [map, user, token]);
  return null;
}

/** Un clic en el mapa vacío cierra el detalle. Los marcadores no propagan el clic. */
function ClearOnMapClick({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: onClear });
  return null;
}

/**
 * Al seleccionar, centra el evento en la parte del mapa que NO tapa el panel:
 * arriba en móvil (el panel va abajo) y a la izquierda en pantallas anchas.
 */
function FocusSelected({
  selKey,
  lat,
  lon
}: {
  selKey: string | null;
  lat: number | null;
  lon: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selKey || lat == null || lon == null) return;
    const zoom = map.getZoom();
    const size = map.getSize();
    const shift = size.x < 640 ? L.point(0, size.y * 0.3) : L.point(PANEL_PX / 2, 0);
    const center = map.unproject(map.project([lat, lon], zoom).add(shift), zoom);
    map.panTo(center, { animate: true, duration: 0.5 });
  }, [map, selKey, lat, lon]);
  return null;
}

/* ───────────── Mapa ───────────── */

export function MapCanvas({
  user,
  quakes,
  storms,
  alerts,
  selection,
  onSelect
}: {
  user: Coord | null;
  quakes: EarthquakeEvent[];
  storms: StormEvent[];
  alerts: CrossAlert[];
  selection: MapSelection;
  onSelect: (s: MapSelection) => void;
}) {
  const [mapStyle, setMapStyle] = useState<GoogleMapStyle>("roadmap");
  const [stormFrame, setStormFrame] = useState(1);
  const [userFrame, setUserFrame] = useState(0);
  const lyrs = mapStyle === "hybrid" ? "y" : "m";
  const now = Date.now();

  const selQuakeId = selection?.kind === "quake" ? selection.id : null;
  const selStormId = selection?.kind === "storm" ? selection.id : null;
  const userSelected = selection?.kind === "user";

  const selectedQuake = selQuakeId ? (quakes.find((q) => q.id === selQuakeId) ?? null) : null;
  const selectedStorm = selStormId ? (storms.find((s) => s.id === selStormId) ?? null) : null;

  // Los 80 más recientes, más el seleccionado aunque quede fuera de ese corte
  // (p. ej. si se llegó desde la lista de alertas).
  const visibleQuakes = useMemo(() => {
    const top = quakes.slice(0, MAX_QUAKES);
    if (selQuakeId && !top.some((q) => q.id === selQuakeId)) {
      const extra = quakes.find((q) => q.id === selQuakeId);
      if (extra) top.push(extra);
    }
    return top;
  }, [quakes, selQuakeId]);

  const focus = selectedQuake ?? selectedStorm ?? (userSelected && user ? user : null);
  const hasPanel = Boolean(focus);
  const selKey = selection ? `${selection.kind}:${"id" in selection ? selection.id : ""}` : null;

  const showAccuracy =
    user?.source === "gps" && user.accuracyM != null && user.accuracyM > 30 && user.accuracyM < 100_000;
  const center: [number, number] = storms[0] ? [storms[0].lat, storms[0].lon] : [18, -130];

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl md:h-[520px]">
      <MapContainer
        center={center}
        zoom={4}
        className="h-full w-full"
        scrollWheelZoom
        maxZoom={20}
      >
        <TileLayer
          key={lyrs}
          attribution='Map data &copy; <a href="https://www.google.com/maps">Google</a>'
          url={`https://mt{s}.google.com/vt/lyrs=${lyrs}&hl=es&x={x}&y={y}&z={z}`}
          subdomains={["0", "1", "2", "3"]}
          maxZoom={20}
        />
        <FrameStorms storms={storms} token={stormFrame} />
        <FlyToUser user={user} token={userFrame} />
        <ClearOnMapClick onClear={() => onSelect(null)} />
        <FocusSelected
          selKey={hasPanel ? selKey : null}
          lat={focus ? focus.lat : null}
          lon={focus ? focus.lon : null}
        />

        {showAccuracy && user ? (
          <Circle
            center={[user.lat, user.lon]}
            radius={user.accuracyM as number}
            interactive={false}
            pathOptions={{ color: "#5ec8e8", fillOpacity: 0.12, weight: 1 }}
          />
        ) : null}

        {/* Halos (área aproximada). Solo sismos M4+ o el seleccionado, para no saturar. */}
        {visibleQuakes
          .filter((q) => q.mag >= 4 || q.id === selQuakeId)
          .map((q) => (
            <Circle
              key={`halo-${q.id}`}
              center={[q.lat, q.lon]}
              radius={Math.max(8_000, q.mag * 12_000)}
              interactive={false}
              pathOptions={{
                color: quakeClass(q.mag).color,
                fillOpacity: q.id === selQuakeId ? 0.22 : 0.12,
                weight: q.id === selQuakeId ? 2 : 1
              }}
            />
          ))}
        {storms.map((s) => {
          const cat = stormCategory(s);
          const line = (s.track ?? []).map((p) => [p.lat, p.lon] as [number, number]);
          return (
            <Fragment key={`storm-layer-${s.id}`}>
              <Circle
                center={[s.lat, s.lon]}
                radius={180_000}
                interactive={false}
                pathOptions={{
                  color: cat.color,
                  fillOpacity: s.id === selStormId ? 0.16 : 0.08,
                  weight: s.id === selStormId ? 2 : 1
                }}
              />
              {line.length > 1 ? (
                <>
                  <Polyline
                    positions={line}
                    interactive={false}
                    pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9 }}
                  />
                  <Polyline
                    positions={line}
                    interactive={false}
                    pathOptions={{ color: cat.color, weight: 4, opacity: 1 }}
                  />
                </>
              ) : null}
            </Fragment>
          );
        })}

        {visibleQuakes.map((q) => {
          const isSel = q.id === selQuakeId;
          const cls = quakeClass(q.mag);
          return (
            <Marker
              key={q.id}
              position={[q.lat, q.lon]}
              icon={quakeIcon(q, ageBucket(q.time, now), isSel)}
              zIndexOffset={isSel ? 50_000 : Math.round(q.mag * 1000)}
              eventHandlers={{ click: () => onSelect({ kind: "quake", id: q.id }) }}
            >
              {isSel ? null : (
                <Tooltip direction="top" className="ga-tip">
                  <strong>
                    M{q.mag.toFixed(1)} · {cls.label}
                  </strong>{" "}
                  · {formatAge(q.time, now)}
                  <br />
                  {q.place}
                </Tooltip>
              )}
            </Marker>
          );
        })}

        {storms.map((s) => {
          const isSel = s.id === selStormId;
          const cat = stormCategory(s);
          return (
            <Marker
              key={s.id}
              position={[s.lat, s.lon]}
              icon={stormIcon(s, cat, isSel)}
              zIndexOffset={isSel ? 60_000 : 20_000}
              eventHandlers={{ click: () => onSelect({ kind: "storm", id: s.id }) }}
            >
              <Tooltip permanent direction="top" className="ga-tip" offset={[0, -4]}>
                <strong>{s.name}</strong> · {cat.short}
              </Tooltip>
            </Marker>
          );
        })}

        {user ? (
          <Marker
            position={[user.lat, user.lon]}
            icon={userIcon(userSelected)}
            zIndexOffset={100_000}
            eventHandlers={{ click: () => onSelect({ kind: "user" }) }}
          >
            {userSelected ? null : (
              <Tooltip direction="top" className="ga-tip">
                Tu posición · {user.label ?? "referencia"}
              </Tooltip>
            )}
          </Marker>
        ) : null}
      </MapContainer>

      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white/95 text-xs font-medium shadow dark:border-slate-700 dark:bg-slate-900/95">
          <button
            type="button"
            aria-pressed={mapStyle === "roadmap"}
            onClick={() => setMapStyle("roadmap")}
            className={`px-3 py-2 ${mapStyle === "roadmap" ? "bg-sky-700 text-white" : ""}`}
          >
            Mapa
          </button>
          <button
            type="button"
            aria-pressed={mapStyle === "hybrid"}
            onClick={() => setMapStyle("hybrid")}
            className={`px-3 py-2 ${mapStyle === "hybrid" ? "bg-sky-700 text-white" : ""}`}
          >
            Satélite
          </button>
        </div>
        {storms.length > 0 ? (
          <button
            type="button"
            onClick={() => setStormFrame((n) => n + 1)}
            className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white shadow"
          >
            Ver huracanes ({storms.length})
          </button>
        ) : null}
        {user ? (
          <button
            type="button"
            onClick={() => setUserFrame((n) => n + 1)}
            className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium shadow dark:border-slate-700 dark:bg-slate-900/95"
          >
            Mi ubicación
          </button>
        ) : null}
      </div>

      {/* En móvil el panel ocupa la parte baja: se oculta la leyenda mientras está abierto. */}
      <div className={`absolute bottom-3 left-3 z-[1000] ${hasPanel ? "hidden md:block" : ""}`}>
        <MapLegend />
      </div>

      {hasPanel ? (
        <EventDetailPanel
          key={selKey}
          target={
            selectedQuake
              ? { kind: "quake", quake: selectedQuake }
              : selectedStorm
                ? { kind: "storm", storm: selectedStorm }
                : { kind: "user" }
          }
          user={user}
          alerts={alerts}
          now={now}
          onClose={() => onSelect(null)}
        />
      ) : null}
    </div>
  );
}
