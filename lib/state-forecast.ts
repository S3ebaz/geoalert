import { compassEs } from "./geo";
import { MX_STATES } from "./mx-states";

export type HourPoint = {
  time: string;
  tempC: number;
  rainProb: number;
  cloud: number;
};

export type PlaceForecast = {
  id: string;
  state: string;
  place: string;
  lat: number;
  lon: number;
  tempC: number;
  feelsC?: number;
  cloudCover: number;
  /** De dónde viene el viento (grados). Las nubes se mueven al rumbo opuesto. */
  windFromDeg: number;
  windKmh: number;
  rainProbNow: number;
  rainProb6h: number;
  hours: HourPoint[];
};

type OmCurrent = {
  temperature_2m?: number;
  apparent_temperature?: number;
  cloud_cover?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
  precipitation_probability?: number;
};

type OmHourly = {
  time?: string[];
  temperature_2m?: number[];
  precipitation_probability?: number[];
  cloud_cover?: number[];
};

type OmItem = {
  current?: OmCurrent;
  hourly?: OmHourly;
};

const FIELDS =
  "current=temperature_2m,apparent_temperature,cloud_cover,wind_speed_10m,wind_direction_10m,precipitation_probability" +
  "&hourly=temperature_2m,precipitation_probability,cloud_cover" +
  "&forecast_days=2&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh";

function asList(json: OmItem | OmItem[]): OmItem[] {
  return Array.isArray(json) ? json : [json];
}

function hoursOf(item: OmItem): HourPoint[] {
  const t = item.hourly?.time ?? [];
  const now = Date.now();
  const out: HourPoint[] = [];
  for (let i = 0; i < t.length && out.length < 12; i++) {
    const ms = Date.parse(t[i]);
    if (!Number.isFinite(ms) || ms < now - 30 * 60_000) continue;
    out.push({
      time: t[i],
      tempC: item.hourly?.temperature_2m?.[i] ?? NaN,
      rainProb: item.hourly?.precipitation_probability?.[i] ?? 0,
      cloud: item.hourly?.cloud_cover?.[i] ?? 0
    });
  }
  return out;
}

function toForecast(
  id: string,
  state: string,
  place: string,
  lat: number,
  lon: number,
  item: OmItem
): PlaceForecast {
  const hours = hoursOf(item);
  const rainNow = item.current?.precipitation_probability ?? hours[0]?.rainProb ?? 0;
  const rain6 = Math.max(rainNow, ...hours.slice(0, 6).map((h) => h.rainProb));
  return {
    id,
    state,
    place,
    lat,
    lon,
    tempC: item.current?.temperature_2m ?? hours[0]?.tempC ?? NaN,
    feelsC: item.current?.apparent_temperature,
    cloudCover: item.current?.cloud_cover ?? hours[0]?.cloud ?? 0,
    windFromDeg: item.current?.wind_direction_10m ?? 0,
    windKmh: item.current?.wind_speed_10m ?? 0,
    rainProbNow: rainNow,
    rainProb6h: Number.isFinite(rain6) ? rain6 : rainNow,
    hours
  };
}

export function cloudMotion(f: PlaceForecast): string {
  const to = (f.windFromDeg + 180) % 360;
  return `hacia el ${compassEs(to)} · ${Math.round(f.windKmh)} km/h`;
}

export async function fetchStateForecasts(): Promise<PlaceForecast[]> {
  const lat = MX_STATES.map((s) => s.lat).join(",");
  const lon = MX_STATES.map((s) => s.lon).join(",");
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${FIELDS}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const items = asList((await res.json()) as OmItem | OmItem[]);
  return MX_STATES.map((s, i) => toForecast(s.id, s.state, s.place, s.lat, s.lon, items[i] ?? {}));
}

export async function fetchPointForecast(lat: number, lon: number, label: string): Promise<PlaceForecast> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${FIELDS}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const item = asList((await res.json()) as OmItem | OmItem[])[0] ?? {};
  return toForecast("aqui", "Tu ubicación", label, lat, lon, item);
}
