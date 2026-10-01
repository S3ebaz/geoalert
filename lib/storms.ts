import { compassEs } from "./geo";
import type { StormEvent } from "./types";

/**
 * El JSON del NHC no envía CORS, así que el navegador no puede leerlo.
 * El build publica una copia en el mismo origen (`public/storms.json`).
 */
const SNAPSHOT = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/storms.json`;

type Snapshot = { storms?: StormEvent[]; fetchedAt?: string };

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function movementText(dir?: number, mph?: number): string | undefined {
  if (dir == null || mph == null) return undefined;
  return `Hacia el ${compassEs(dir)} (${Math.round(dir)}°) a ${Math.round(mph)} mph (${Math.round(mph * 1.609)} km/h).`;
}

function normalize(raw: StormEvent): StormEvent | null {
  if (!Number.isFinite(raw.lat) || !Number.isFinite(raw.lon)) return null;
  const movementDir = num(raw.movementDir);
  const movementSpeedMph = num(raw.movementSpeedMph);
  return {
    ...raw,
    windKt: num(raw.windKt),
    pressureMb: num(raw.pressureMb),
    movementDir,
    movementSpeedMph,
    movement: raw.movement ?? movementText(movementDir, movementSpeedMph),
    track: (raw.track ?? []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
  };
}

export async function fetchActiveStorms(): Promise<StormEvent[]> {
  try {
    const res = await fetch(SNAPSHOT, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as Snapshot;
    return (json.storms ?? []).map(normalize).filter((s): s is StormEvent => s != null);
  } catch {
    return [];
  }
}

export async function fetchLocalWeather(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=wind_speed_10m,precipitation,weather_code&wind_speed_unit=kmh`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    current?: {
      wind_speed_10m?: number;
      precipitation?: number;
      weather_code?: number;
    };
  };
  return {
    windKmh: json.current?.wind_speed_10m ?? 0,
    precipitationMm: json.current?.precipitation ?? 0,
    weatherCode: json.current?.weather_code ?? 0
  };
}
