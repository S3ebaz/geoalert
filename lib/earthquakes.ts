import type { EarthquakeEvent } from "./types";

const USGS_HOUR =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
const USGS_DAY_M25 =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

type UsgsFeature = {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    url?: string;
    tsunami?: number;
    type?: string;
    updated?: number | null;
    magType?: string | null;
    status?: string | null;
    felt?: number | null;
    cdi?: number | null;
    mmi?: number | null;
    alert?: string | null;
    sig?: number | null;
    net?: string | null;
    nst?: number | null;
    gap?: number | null;
    dmin?: number | null;
    rms?: number | null;
  };
  geometry: { coordinates: [number, number, number] };
};

export async function fetchEarthquakes(): Promise<EarthquakeEvent[]> {
  const [hourRes, dayRes] = await Promise.allSettled([
    fetch(USGS_HOUR, { cache: "no-store" }),
    fetch(USGS_DAY_M25, { cache: "no-store" })
  ]);

  const features: UsgsFeature[] = [];
  for (const r of [hourRes, dayRes]) {
    if (r.status !== "fulfilled" || !r.value.ok) continue;
    const json = (await r.value.json()) as { features?: UsgsFeature[] };
    features.push(...(json.features ?? []));
  }

  const byId = new Map<string, EarthquakeEvent>();
  for (const f of features) {
    if (f.properties.type && f.properties.type !== "earthquake") continue;
    if (f.properties.mag == null) continue;
    const [lon, lat, depth] = f.geometry.coordinates;
    byId.set(f.id, {
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place ?? "Epicentro desconocido",
      time: f.properties.time,
      lat,
      lon,
      depthKm: depth,
      url: f.properties.url,
      tsunami: Boolean(f.properties.tsunami),
      updated: f.properties.updated ?? undefined,
      magType: f.properties.magType ?? undefined,
      status: f.properties.status ?? undefined,
      felt: f.properties.felt ?? undefined,
      cdi: f.properties.cdi ?? undefined,
      mmi: f.properties.mmi ?? undefined,
      pagerAlert: f.properties.alert ?? undefined,
      sig: f.properties.sig ?? undefined,
      net: f.properties.net ?? undefined,
      nst: f.properties.nst ?? undefined,
      gap: f.properties.gap ?? undefined,
      dmin: f.properties.dmin ?? undefined,
      rms: f.properties.rms ?? undefined
    });
  }

  return [...byId.values()].sort((a, b) => b.time - a.time);
}
