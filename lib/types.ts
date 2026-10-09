export type Coord = {
  lat: number;
  lon: number;
  accuracyM?: number;
  source: "gps" | "manual";
  label?: string;
};

export type ThreatLevel = "none" | "watch" | "warning" | "emergency";

export type EarthquakeEvent = {
  id: string;
  mag: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depthKm: number;
  url?: string;
  tsunami: boolean;
  /** Última revisión del evento en USGS (ms epoch). */
  updated?: number;
  magType?: string;
  /** "automatic" (sin revisar) o "reviewed". */
  status?: string;
  /** Número de reportes ciudadanos "Did You Feel It". */
  felt?: number;
  /** Intensidad máxima reportada por ciudadanos (CDI, 0–10). */
  cdi?: number;
  /** Intensidad instrumental máxima (MMI, 0–10). */
  mmi?: number;
  /** Nivel PAGER de USGS: green | yellow | orange | red. */
  pagerAlert?: string;
  /** Importancia relativa USGS (0–1000+). */
  sig?: number;
  net?: string;
  /** Estaciones usadas en la solución. */
  nst?: number;
  /** Hueco azimutal máximo (grados). */
  gap?: number;
  /** Distancia al sensor más cercano (grados). */
  dmin?: number;
  /** Residuo RMS (segundos). */
  rms?: number;
};

export type TrackPoint = {
  lat: number;
  lon: number;
  label?: string | null;
};

export type StormEvent = {
  id: string;
  name: string;
  classification: string;
  lat: number;
  lon: number;
  /** Viento máximo sostenido en nudos (campo `intensity` del NHC). */
  windKt?: number;
  /** Presión central mínima en milibares. */
  pressureMb?: number;
  /** Rumbo del movimiento, grados desde el norte (hacia dónde se desplaza). */
  movementDir?: number;
  movementSpeedMph?: number;
  /** Texto legible del movimiento (lo usa el motor de alertas). */
  movement?: string;
  basin?: string;
  /** ISO 8601, última actualización del NHC. */
  lastUpdate?: string;
  advisoryUrl?: string;
  discussionUrl?: string;
  graphicsUrl?: string;
  /** Pronóstico oficial de trayectoria (puntos NHC). No es el cono. */
  track?: TrackPoint[];
};

export type WeatherSnapshot = {
  windKmh: number;
  precipitationMm: number;
  weatherCode: number;
  /** Probabilidad de lluvia en este momento, 0–100. */
  rainProbNow: number;
  /** Máxima probabilidad en las próximas 6 horas, 0–100. */
  rainProb6h: number;
};

export type ColdFront = {
  id: string;
  name: string;
  points: Array<{ name: string; lat: number; lon: number; dropC: number; windFrom: number; windKmh: number }>;
  summary: string;
};

export type FrontBulletin = {
  source: "SMN";
  aviso: string;
  issuedAt: string;
  active: boolean;
  summary: string;
  url: string;
};

export type CrossAlert = {
  id: string;
  kind: "earthquake" | "storm" | "weather" | "front";
  level: ThreatLevel;
  title: string;
  detail: string;
  distanceKm: number;
  etaMinutes?: number;
  sourceEventId: string;
};

export type Shelter = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: "refugio" | "zona_alta" | "espacio_abierto";
  distanceKm: number;
};

/** Elemento del mapa seleccionado (abre el panel de detalle). */
export type MapSelection =
  | { kind: "quake"; id: string }
  | { kind: "storm"; id: string }
  | { kind: "user" }
  | null;
