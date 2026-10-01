/** Distancia Haversine en km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Modelo educativo de tiempos de onda (no es ShakeAlert).
 * Vp ≈ 6 km/s, Vs ≈ 3.5 km/s en corteza continental media.
 */
export function estimateWaveTimes(distanceKm: number) {
  const pSec = distanceKm / 6.0;
  const sSec = distanceKm / 3.5;
  const warningWindowSec = Math.max(0, sSec - pSec);
  return { pSec, sSec, warningWindowSec };
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 20 ? 1 : 0)} km`;
}

/** Rumbo inicial en grados (0–360, desde el norte) de `from` hacia `to`. */
export function bearingDeg(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): number {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lon - from.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const COMPASS_ES = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"
];

/** Punto cardinal en español (N, NE, SO…) para un rumbo en grados. */
export function compassEs(deg: number): string {
  return COMPASS_ES[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}
