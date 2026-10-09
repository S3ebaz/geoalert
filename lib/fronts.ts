import { haversineKm } from "./geo";

export type FrontPoint = {
  name: string;
  lat: number;
  lon: number;
  dropC: number;
  windFrom: number;
  windKmh: number;
};

export type ColdFront = {
  id: string;
  name: string;
  points: FrontPoint[];
  summary: string;
};

const STATIONS = [
  { name: "Tijuana", lat: 32.51, lon: -117.04 },
  { name: "Mexicali", lat: 32.62, lon: -115.45 },
  { name: "Hermosillo", lat: 29.07, lon: -110.96 },
  { name: "Ciudad Juárez", lat: 31.69, lon: -106.42 },
  { name: "Chihuahua", lat: 28.64, lon: -106.09 },
  { name: "Monterrey", lat: 25.67, lon: -100.31 },
  { name: "Nuevo Laredo", lat: 27.48, lon: -99.51 },
  { name: "Tampico", lat: 22.23, lon: -97.86 },
  { name: "Mazatlán", lat: 23.25, lon: -106.41 },
  { name: "San Luis Potosí", lat: 22.16, lon: -100.99 },
  { name: "Guadalajara", lat: 20.66, lon: -103.35 },
  { name: "Querétaro", lat: 20.59, lon: -100.39 },
  { name: "Ciudad de México", lat: 19.43, lon: -99.13 },
  { name: "Veracruz", lat: 19.17, lon: -96.13 },
  { name: "Puebla", lat: 19.04, lon: -98.21 },
  { name: "Oaxaca", lat: 17.07, lon: -96.73 },
  { name: "Villahermosa", lat: 17.99, lon: -92.95 },
  { name: "Tuxtla Gutiérrez", lat: 16.75, lon: -93.1 },
  { name: "Mérida", lat: 20.97, lon: -89.59 },
  { name: "Cancún", lat: 21.16, lon: -86.85 }
];

type Hourly = {
  time?: string[];
  temperature_2m?: number[];
  pressure_msl?: number[];
  wind_direction_10m?: number[];
  wind_speed_10m?: number[];
};

function nearestIndex(times: string[], target: number): number {
  let best = 0;
  let gap = Infinity;
  for (let i = 0; i < times.length; i++) {
    const d = Math.abs(Date.parse(times[i]) - target);
    if (d < gap) {
      gap = d;
      best = i;
    }
  }
  return best;
}

function northerly(deg: number): boolean {
  return deg >= 315 || deg <= 70;
}

export async function fetchColdFronts(): Promise<ColdFront[]> {
  const lat = STATIONS.map((s) => s.lat).join(",");
  const lon = STATIONS.map((s) => s.lon).join(",");
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,pressure_msl,wind_direction_10m,wind_speed_10m` +
      `&past_days=1&forecast_days=1&timezone=auto&wind_speed_unit=kmh`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as Hourly | Hourly[];
  const items = Array.isArray(json) ? json : [json];
  const now = Date.now();
  const hits: FrontPoint[] = [];

  STATIONS.forEach((station, i) => {
    const h = items[i];
    const times = h?.time ?? [];
    if (times.length < 8) return;
    const iNow = nearestIndex(times, now);
    const iPrev = nearestIndex(times, now - 18 * 3600_000);
    const tempNow = h.temperature_2m?.[iNow];
    const tempPrev = h.temperature_2m?.[iPrev];
    const pNow = h.pressure_msl?.[iNow];
    const pPrev = h.pressure_msl?.[iPrev];
    const wind = h.wind_direction_10m?.[iNow] ?? 0;
    const speed = h.wind_speed_10m?.[iNow] ?? 0;
    if (tempNow == null || tempPrev == null) return;
    const drop = tempPrev - tempNow;
    const rise = pNow != null && pPrev != null ? pNow - pPrev : 0;
    const coldPush = drop >= 4 && (northerly(wind) || rise >= 2);
    const norte = drop >= 2.5 && northerly(wind) && speed >= 18 && rise >= 1;
    if (!coldPush && !norte) return;
    hits.push({ name: station.name, lat: station.lat, lon: station.lon, dropC: drop, windFrom: wind, windKmh: speed });
  });

  if (hits.length < 2) return [];
  const line = [...hits].sort((a, b) => b.lat - a.lat || a.lon - b.lon);
  const span = haversineKm(line[0], line[line.length - 1]);
  if (span < 180) return [];
  const places = line.map((p) => p.name).slice(0, 6).join(", ");
  return [
    {
      id: "frente-modelo",
      name: "Frente frío",
      points: line,
      summary: `Descenso de ${Math.round(Math.max(...line.map((p) => p.dropC)))} °C y viento del norte en ${places}. Detección del modelo, no el aviso oficial del SMN.`
    }
  ];
}
