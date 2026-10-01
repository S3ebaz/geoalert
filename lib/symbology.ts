import type { StormEvent, ThreatLevel } from "./types";

/*
 * Simbología única para mapa, leyenda y panel de detalle.
 *
 * Regla de diseño: familias de color distintas por amenaza.
 *   - Sismos  → cálidos (amarillo → rojo oscuro), círculo.
 *   - Ciclones → fríos (azul → magenta), glifo de espiral.
 * Así se distinguen por color Y por forma (útil con daltonismo), y el
 * tamaño refuerza la gravedad en ambos casos.
 *
 * Los colores van como hex (no clases Tailwind) porque Tailwind solo
 * escanea app/ y components/, no lib/.
 */

/* ───────────── Sismos ───────────── */

export type QuakeClass = {
  key: string;
  label: string;
  /** Magnitud mínima de la clase. */
  min: number;
  color: string;
  range: string;
};

/** Clases de magnitud (nomenclatura USGS), de menor a mayor. */
export const QUAKE_CLASSES: QuakeClass[] = [
  { key: "micro", label: "Micro", min: -Infinity, color: "#fcd34d", range: "< 3" },
  { key: "menor", label: "Menor", min: 3, color: "#fb923c", range: "3 – 3.9" },
  { key: "ligero", label: "Ligero", min: 4, color: "#ef4444", range: "4 – 4.9" },
  { key: "moderado", label: "Moderado", min: 5, color: "#b91c1c", range: "5 – 5.9" },
  { key: "fuerte", label: "Fuerte", min: 6, color: "#7f1d1d", range: "6 – 6.9" },
  { key: "mayor", label: "Mayor", min: 7, color: "#3f0a0a", range: "7 o más" }
];

export function quakeClass(mag: number): QuakeClass {
  let found = QUAKE_CLASSES[0];
  for (const c of QUAKE_CLASSES) if (mag >= c.min) found = c;
  return found;
}

/** Diámetro del símbolo en px. Crece con el cuadrado de la magnitud. */
export function quakeDiameter(mag: number): number {
  const d = 6 + Math.max(0, mag) ** 2 * 0.9;
  return Math.round(Math.min(46, Math.max(10, d)));
}

export function depthLabel(km: number): string {
  if (km < 70) return "superficial";
  if (km <= 300) return "intermedio";
  return "profundo";
}

export type AgeBucket = "fresh" | "recent" | "old";

/** fresh < 1 h (pulsa) · recent 1–6 h · old > 6 h (atenuado). */
export function ageBucket(timeMs: number, now = Date.now()): AgeBucket {
  const h = (now - timeMs) / 3_600_000;
  if (h < 1) return "fresh";
  if (h < 6) return "recent";
  return "old";
}

export const PAGER_LABEL: Record<string, { label: string; color: string }> = {
  green: { label: "Verde · impacto bajo", color: "#15803d" },
  yellow: { label: "Amarillo · impacto localizado", color: "#ca8a04" },
  orange: { label: "Naranja · impacto significativo", color: "#ea580c" },
  red: { label: "Rojo · impacto extenso", color: "#b91c1c" }
};

/* ───────────── Ciclones ───────────── */

export type StormCategory = {
  key: "TD" | "TS" | "C1" | "C2" | "C3" | "C4" | "C5";
  /** Nombre completo. */
  label: string;
  /** Etiqueta corta para leyenda. */
  short: string;
  /** Viento sostenido mínimo en nudos (escala Saffir–Simpson / NHC). */
  minKt: number;
  /** Rango en km/h para la leyenda. */
  rangeKmh: string;
  color: string;
  size: number;
};

export const STORM_CATEGORIES: StormCategory[] = [
  { key: "TD", label: "Depresión tropical", short: "Depresión", minKt: 0, rangeKmh: "< 63", color: "#60a5fa", size: 28 },
  { key: "TS", label: "Tormenta tropical", short: "Tormenta", minKt: 34, rangeKmh: "63 – 117", color: "#2563eb", size: 32 },
  { key: "C1", label: "Huracán categoría 1", short: "Cat. 1", minKt: 64, rangeKmh: "119 – 153", color: "#7c3aed", size: 36 },
  { key: "C2", label: "Huracán categoría 2", short: "Cat. 2", minKt: 83, rangeKmh: "154 – 177", color: "#a21caf", size: 40 },
  { key: "C3", label: "Huracán categoría 3 (mayor)", short: "Cat. 3", minKt: 96, rangeKmh: "178 – 208", color: "#db2777", size: 44 },
  { key: "C4", label: "Huracán categoría 4 (mayor)", short: "Cat. 4", minKt: 113, rangeKmh: "209 – 251", color: "#be123c", size: 48 },
  { key: "C5", label: "Huracán categoría 5 (mayor)", short: "Cat. 5", minKt: 137, rangeKmh: "≥ 252", color: "#4a044e", size: 52 }
];

/**
 * Categoría del ciclón. Usa el viento (nudos) cuando el NHC lo informa;
 * si no, cae a la clasificación textual.
 */
export function stormCategory(s: Pick<StormEvent, "windKt" | "classification">): StormCategory {
  if (s.windKt != null) {
    let found = STORM_CATEGORIES[0];
    for (const c of STORM_CATEGORIES) if (s.windKt >= c.minKt) found = c;
    return found;
  }
  const code = s.classification.toUpperCase();
  if (code === "HU" || code.includes("HURRICANE") || code.includes("HURAC")) return STORM_CATEGORIES[2];
  if (code === "TS" || code === "STS" || code.includes("STORM") || code.includes("TORMENTA")) return STORM_CATEGORIES[1];
  return STORM_CATEGORIES[0];
}

const CLASSIFICATION_ES: Record<string, string> = {
  TD: "Depresión tropical",
  STD: "Depresión subtropical",
  TS: "Tormenta tropical",
  STS: "Tormenta subtropical",
  HU: "Huracán",
  PTC: "Ciclón tropical potencial"
};

/** Traduce el código NHC (TD, TS, HU…). Si no lo conoce, lo devuelve tal cual. */
export function classificationLabel(code: string): string {
  return CLASSIFICATION_ES[code.toUpperCase()] ?? code;
}

/** Cuenca a partir del campo `basin` o del prefijo del id NHC (al, ep, cp). */
export function basinLabel(id: string, basin?: string): string | undefined {
  const prefix = id.slice(0, 2).toLowerCase();
  const byPrefix: Record<string, string> = {
    al: "Atlántico",
    ep: "Pacífico nororiental",
    cp: "Pacífico central"
  };
  return byPrefix[prefix] ?? basin;
}

export const ktToKmh = (kt: number) => kt * 1.852;
export const ktToMph = (kt: number) => kt * 1.15078;

/** Un brazo de la espiral (arquimediana), girado `rotDeg` grados, como polilínea. */
function spiralArm(rotDeg: number): string {
  const steps = 22;
  const r0 = 3.2;
  const pitch = 4.6;
  const sweep = 1.75 * Math.PI;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (sweep * i) / steps;
    const r = r0 + (pitch * t) / Math.PI;
    const a = t + (rotDeg * Math.PI) / 180;
    // y invertida: en pantalla el giro resulta antihorario (hemisferio norte).
    pts.push(`${(r * Math.cos(a)).toFixed(1)} ${(-r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
}

const SPIRAL_ARMS = `${spiralArm(0)} ${spiralArm(180)}`;

/**
 * Glifo de ciclón: disco de color con dos brazos en espiral. SVG estático
 * generado solo con la paleta de este archivo (seguro para innerHTML).
 */
export function stormGlyphSvg(color: string, size: number): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">` +
    `<circle cx="20" cy="20" r="18" fill="${color}" stroke="#ffffff" stroke-width="2"/>` +
    `<g transform="translate(20 20)" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${SPIRAL_ARMS}"/>` +
    `</g>` +
    `<circle cx="20" cy="20" r="2.4" fill="#ffffff"/>` +
    `</svg>`
  );
}

/* ───────────── Nivel de amenaza para ti ───────────── */

export const LEVEL_STYLE: Record<Exclude<ThreatLevel, "none">, { label: string; bg: string }> = {
  watch: { label: "Vigilancia", bg: "#075985" },
  warning: { label: "Advertencia", bg: "#b45309" },
  emergency: { label: "Alerta roja", bg: "#991b1b" }
};

/* ───────────── Formato ───────────── */

export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const eo = lon >= 0 ? "E" : "O";
  return `${Math.abs(lat).toFixed(3)}° ${ns}, ${Math.abs(lon).toFixed(3)}° ${eo}`;
}

export function formatLocal(ms: number): string {
  return new Date(ms).toLocaleString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  });
}

export function formatUtc(ms: number): string {
  return `${new Date(ms).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

/** "hace 12 min", "hace 3 h 05 min", "hace 2 d". */
export function formatAge(ms: number, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - ms) / 60_000));
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h ${String(min % 60).padStart(2, "0")} min`;
  return `hace ${Math.floor(h / 24)} d`;
}

