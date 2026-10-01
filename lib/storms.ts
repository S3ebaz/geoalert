import { compassEs } from "./geo";
import type { StormEvent } from "./types";

/** Feed público NHC de ciclones activos. Puede estar vacío fuera de temporada. */
const NHC_CURRENT = "https://www.nhc.noaa.gov/CurrentStorms.json";

type NhcLink = { url?: string } | null;

type NhcStorm = {
  id?: string;
  binNumber?: string;
  name?: string;
  classification?: string;
  /** Viento máximo sostenido, nudos. */
  intensity?: number | string;
  /** Presión central mínima, mb. */
  pressure?: number | string;
  latitudeNumeric?: number;
  longitudeNumeric?: number;
  /** Grados desde el norte. */
  movementDir?: number | string;
  /** Millas por hora. */
  movementSpeed?: number | string;
  lastUpdate?: string;
  basin?: string;
  publicAdvisory?: NhcLink;
  forecastDiscussion?: NhcLink;
  forecastGraphics?: NhcLink;
};

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function movementText(dir?: number, mph?: number): string | undefined {
  if (dir == null || mph == null) return undefined;
  return `Hacia el ${compassEs(dir)} (${Math.round(dir)}°) a ${Math.round(mph)} mph (${Math.round(mph * 1.609)} km/h).`;
}

export async function fetchActiveStorms(): Promise<StormEvent[]> {
  try {
    const res = await fetch(NHC_CURRENT, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { activeStorms?: NhcStorm[] };

    return (json.activeStorms ?? [])
      .filter((s) => s.latitudeNumeric != null && s.longitudeNumeric != null)
      .map((s) => {
        const movementDir = num(s.movementDir);
        const movementSpeedMph = num(s.movementSpeed);
        return {
          id: s.id ?? s.binNumber ?? s.name ?? crypto.randomUUID(),
          name: s.name ?? "Sistema tropical",
          classification: s.classification ?? "Desconocido",
          lat: s.latitudeNumeric as number,
          lon: s.longitudeNumeric as number,
          windKt: num(s.intensity),
          pressureMb: num(s.pressure),
          movementDir,
          movementSpeedMph,
          movement: movementText(movementDir, movementSpeedMph),
          basin: s.basin,
          lastUpdate: s.lastUpdate,
          advisoryUrl: s.publicAdvisory?.url,
          discussionUrl: s.forecastDiscussion?.url,
          graphicsUrl: s.forecastGraphics?.url
        };
      });
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
