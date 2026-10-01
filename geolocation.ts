import type { Coord } from "./types";

const STORAGE_KEY = "geoalerta.coord";

export function loadSavedCoord(): Coord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Coord) : null;
  } catch {
    return null;
  }
}

export function saveCoord(coord: Coord): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coord));
}

export function clearSavedCoord(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Solicita GPS una vez. Nunca persiste más que lat/lon/accuracy/label.
 * No envía la posición a un servidor propio en este prototipo.
 */
export function requestBrowserGeolocation(
  timeoutMs = 12000
): Promise<Coord> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("GEOLOCATION_UNSUPPORTED"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          source: "gps"
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("PERMISSION_DENIED"));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("TIMEOUT"));
        } else {
          reject(new Error("POSITION_UNAVAILABLE"));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60_000
      }
    );
  });
}

export async function reverseLabel(coord: Coord): Promise<string> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  // Open-Meteo search no es reverse puro; usamos Nominatim con User-Agent identificable.
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coord.lat}&lon=${coord.lon}&format=json&zoom=10`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return coord.label ?? "Ubicación actual";
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; country?: string };
      display_name?: string;
    };
    const city =
      data.address?.city || data.address?.town || data.address?.village;
    const country = data.address?.country;
    if (city && country) return `${city}, ${country}`;
    return data.display_name?.split(",").slice(0, 2).join(",") ?? "Ubicación actual";
  } catch {
    void url;
    return coord.label ?? "Ubicación actual";
  }
}

export async function searchPlaces(query: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=6&language=es&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      latitude: number;
      longitude: number;
      country?: string;
      admin1?: string;
    }>;
  };
  return (data.results ?? []).map((r) => ({
    id: String(r.id),
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude
  }));
}
