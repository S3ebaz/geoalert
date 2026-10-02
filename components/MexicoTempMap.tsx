"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { cloudMotion, type PlaceForecast } from "@/lib/state-forecast";
import "leaflet/dist/leaflet.css";

type Props = {
  forecasts: PlaceForecast[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function tempColor(t: number): string {
  if (!Number.isFinite(t)) return "#94a3b8";
  if (t < 12) return "#1d4ed8";
  if (t < 18) return "#0284c7";
  if (t < 24) return "#16a34a";
  if (t < 29) return "#ca8a04";
  if (t < 34) return "#ea580c";
  return "#b91c1c";
}

function collect(coords: unknown, out: Array<[number, number]>) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    out.push([coords[1] as number, coords[0] as number]);
    return;
  }
  for (const c of coords) collect(c, out);
}

function centerOf(geometry: Geometry): [number, number] | null {
  if (geometry.type === "GeometryCollection") return null;
  const pts: Array<[number, number]> = [];
  collect(geometry.coordinates, pts);
  if (pts.length === 0) return null;
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lon = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [lat, lon];
}

function labelIcon(text: string, selected: boolean) {
  return L.divIcon({
    className: "ga-symbol",
    iconSize: [54, 22],
    iconAnchor: [27, 11],
    html:
      `<div style="background:${selected ? "#0f172a" : "#ffffff"};color:${selected ? "#ffffff" : "#0f172a"};` +
      `border:1px solid #0f172a;border-radius:999px;font:700 12px/20px system-ui,sans-serif;` +
      `text-align:center;box-shadow:0 1px 3px rgb(0 0 0 / .35)">${text}</div>`
  });
}

const NAME_TO_ID: Record<string, string> = {
  Aguascalientes: "AGU",
  "Baja California": "BCN",
  "Baja California Sur": "BCS",
  Campeche: "CAM",
  Chiapas: "CHP",
  Chihuahua: "CHH",
  "Ciudad de México": "CMX",
  Coahuila: "COA",
  Colima: "COL",
  Durango: "DUR",
  Guanajuato: "GUA",
  Guerrero: "GRO",
  Hidalgo: "HID",
  Jalisco: "JAL",
  México: "MEX",
  Michoacán: "MIC",
  Morelos: "MOR",
  Nayarit: "NAY",
  "Nuevo León": "NLE",
  Oaxaca: "OAX",
  Puebla: "PUE",
  Querétaro: "QUE",
  "Quintana Roo": "ROO",
  "San Luis Potosí": "SLP",
  Sinaloa: "SIN",
  Sonora: "SON",
  Tabasco: "TAB",
  Tamaulipas: "TAM",
  Tlaxcala: "TLA",
  Veracruz: "VER",
  Yucatán: "YUC",
  Zacatecas: "ZAC"
};

export function MexicoTempMap({ forecasts, selectedId, onSelect }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const byId = useMemo(() => new Map(forecasts.map((f) => [f.id, f])), [forecasts]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    void fetch(`${base}/mexico-states.geojson`)
      .then((r) => r.json())
      .then((j) => setGeo(j as FeatureCollection))
      .catch(() => setGeo(null));
  }, []);

  const marks = useMemo(() => {
    if (!geo) return [];
    return geo.features.flatMap((f) => {
      const id = NAME_TO_ID[String(f.properties?.name ?? "")];
      const fc = id ? byId.get(id) : undefined;
      const c = centerOf(f.geometry);
      if (!id || !fc || !c || !Number.isFinite(fc.tempC)) return [];
      return [{ id, lat: c[0], lon: c[1], temp: fc.tempC, fc }];
    });
  }, [geo, byId]);

  return (
    <div className="mt-3 h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <MapContainer center={[23.6, -102.5]} zoom={5} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='Map data &copy; <a href="https://www.google.com/maps">Google</a>'
          url="https://mt{s}.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}"
          subdomains={["0", "1", "2", "3"]}
          maxZoom={12}
        />
        {geo ? (
          <GeoJSON
            data={geo}
            style={(feature) => {
              const id = NAME_TO_ID[String(feature?.properties?.name ?? "")];
              const t = id ? byId.get(id)?.tempC : undefined;
              const on = id === selectedId;
              return {
                color: on ? "#0f172a" : "#ffffff",
                weight: on ? 2.5 : 1,
                fillColor: tempColor(t ?? NaN),
                fillOpacity: 0.72
              };
            }}
            onEachFeature={(feature: Feature, layer) => {
              const id = NAME_TO_ID[String(feature.properties?.name ?? "")];
              if (!id) return;
              layer.on("click", () => onSelect(id));
            }}
          />
        ) : null}
        {marks.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lon]}
            icon={labelIcon(`${m.temp.toFixed(0)}°`, m.id === selectedId)}
            eventHandlers={{ click: () => onSelect(m.id) }}
          >
            <Popup>
              <strong>{m.fc.state}</strong>
              <br />
              {m.fc.tempC.toFixed(1)} °C · lluvia {Math.round(m.fc.rainProbNow)}%
              <br />
              Nubes {cloudMotion(m.fc)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
