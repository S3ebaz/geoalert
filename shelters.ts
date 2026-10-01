import { haversineKm } from "./geo";
import type { Coord, Shelter } from "./types";

/**
 * Catálogo DEMO. En producción debes conectar el inventario oficial
 * de Protección Civil / COE / FEMA / Cruz Roja de cada jurisdicción.
 * No inventes refugios reales: un punto falso puede poner gente en riesgo.
 */
const DEMO_SHELTERS: Omit<Shelter, "distanceKm">[] = [
  { id: "demo-1", name: "Espacio abierto — parque / cancha (demo)", lat: 0, lon: 0, type: "espacio_abierto" }
];

export function nearbySafePlaces(user: Coord): Shelter[] {
  // Estrategia segura sin inventario oficial:
  // 1) sugerir espacio abierto relativo (no un edificio concreto inventado)
  // 2) dejar el enlace a autoridades locales
  const open: Shelter = {
    id: "open-area",
    name: "Zona abierta alejada de cornisas y cables (criterio general)",
    lat: user.lat + 0.004,
    lon: user.lon,
    type: "espacio_abierto",
    distanceKm: haversineKm(user, { lat: user.lat + 0.004, lon: user.lon })
  };

  const extra = DEMO_SHELTERS.filter((s) => s.lat !== 0).map((s) => ({
    ...s,
    distanceKm: haversineKm(user, s)
  }));

  return [open, ...extra].sort((a, b) => a.distanceKm - b.distanceKm);
}

export function osmDirectionsUrl(from: Coord, to: { lat: number; lon: number }) {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${from.lat}%2C${from.lon}%3B${to.lat}%2C${to.lon}`;
}

export const OFFICIAL_LINKS = [
  { label: "USGS Earthquakes", href: "https://earthquake.usgs.gov/" },
  { label: "National Hurricane Center", href: "https://www.nhc.noaa.gov/" },
  { label: "OpenStreetMap", href: "https://www.openstreetmap.org/" }
];
