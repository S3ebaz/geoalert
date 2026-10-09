import { estimateWaveTimes, haversineKm } from "./geo";
import type {
  Coord,
  CrossAlert,
  EarthquakeEvent,
  StormEvent,
  ThreatLevel,
  WeatherSnapshot,
  ColdFront
} from "./types";

/**
 * Motor de alertas cruzadas (prototipo educativo).
 *
 * Límites reales — léelos antes de usarlo en producción:
 * 1. USGS publica el sismo DESPUÉS del origen. Un feed HTTP no puede
 *    avisar con ondas P vs S como ShakeAlert / SASMEX.
 * 2. El cálculo P/S aquí solo estima la ventana física SI el aviso
 *    llegara al instante del origen. Sirve para pedagogía y para
 *    priorizar eventos cercanos, no para evacuar en segundos.
 * 3. Las trayectorias de huracán de este prototipo usan la posición
 *    actual del NHC, no el cono de incertidumbre completo.
 */
export function evaluateCrossAlerts(input: {
  user: Coord;
  quakes: EarthquakeEvent[];
  storms: StormEvent[];
  weather: WeatherSnapshot | null;
  fronts?: ColdFront[];
  now?: number;
}): CrossAlert[] {
  const now = input.now ?? Date.now();
  const alerts: CrossAlert[] = [];

  for (const q of input.quakes) {
    const ageMin = (now - q.time) / 60_000;
    if (ageMin > 180) continue;

    const distanceKm = haversineKm(input.user, q);
    const waves = estimateWaveTimes(distanceKm);
    const level = quakeLevel(q.mag, distanceKm, ageMin);
    if (level === "none") continue;

    const etaMinutes = Math.max(0, waves.sSec / 60 - ageMin);
    alerts.push({
      id: `eq-${q.id}`,
      kind: "earthquake",
      level,
      title: `Sismo M${q.mag.toFixed(1)} · ${distanceKm < 1 ? "muy cerca" : `${distanceKm.toFixed(0)} km`}`,
      detail:
        ageMin < 3
          ? `Evento reciente. Ventana teórica P–S ≈ ${Math.round(waves.warningWindowSec)} s (modelo educativo, no es alerta oficial). ${q.place}`
          : `${q.place}. Profundidad ${q.depthKm.toFixed(0)} km. Hace ${Math.round(ageMin)} min.`,
      distanceKm,
      etaMinutes: ageMin < 5 ? etaMinutes : undefined,
      sourceEventId: q.id
    });
  }

  for (const s of input.storms) {
    const distanceKm = haversineKm(input.user, s);
    const level = stormLevel(s, distanceKm);
    if (level === "none") continue;
    alerts.push({
      id: `st-${s.id}`,
      kind: "storm",
      level,
      title: `${s.name} · ${s.classification}`,
      detail: `${distanceKm.toFixed(0)} km del centro. ${s.movement ?? "Movimiento no informado."} Fuente: NHC.`,
      distanceKm,
      sourceEventId: s.id
    });
  }

  for (const front of input.fronts ?? []) {
    let nearest = front.points[0];
    let distanceKm = haversineKm(input.user, nearest);
    for (const p of front.points) {
      const d = haversineKm(input.user, p);
      if (d < distanceKm) {
        nearest = p;
        distanceKm = d;
      }
    }
    if (distanceKm > 350) continue;
    alerts.push({
      id: `front-${front.id}`,
      kind: "front",
      level: distanceKm <= 150 && nearest.dropC >= 5 ? "warning" : "watch",
      title: `${front.name} cerca de tu ubicación`,
      detail: `${distanceKm.toFixed(0)} km de ${nearest.name}. Bajó ${nearest.dropC.toFixed(1)} °C en 18 h, viento del norte a ${Math.round(nearest.windKmh)} km/h. ${front.summary}`,
      distanceKm,
      sourceEventId: front.id
    });
  }

  if (input.weather) {
    const w = input.weather;
    const raining = w.precipitationMm >= 0.2 || isRainCode(w.weatherCode);
    if (raining || w.rainProbNow >= 50 || w.rainProb6h >= 60) {
      const heavy = w.precipitationMm >= 8 || w.rainProbNow >= 80;
      alerts.push({
        id: "wx-rain",
        kind: "weather",
        level: heavy ? "warning" : "watch",
        title: raining ? "Lluvia en tu ubicación" : "Probabilidad de lluvia donde estás",
        detail: raining
          ? `Ahora ${w.precipitationMm.toFixed(1)} mm · probabilidad ${Math.round(w.rainProbNow)}% · próximas 6 h ${Math.round(w.rainProb6h)}% (Open-Meteo).`
          : `Ahora ${Math.round(w.rainProbNow)}% · máximo en 6 h ${Math.round(w.rainProb6h)}%. No hay lluvia medida en este momento.`,
        distanceKm: 0,
        sourceEventId: "open-meteo-rain"
      });
    }
    if (w.windKmh >= 75) {
      alerts.push({
        id: "wx-wind",
        kind: "weather",
        level: w.windKmh >= 100 ? "warning" : "watch",
        title: "Viento fuerte en tu ubicación",
        detail: `Viento ${Math.round(w.windKmh)} km/h (Open-Meteo).`,
        distanceKm: 0,
        sourceEventId: "open-meteo-wind"
      });
    }
  }

  const rank: Record<ThreatLevel, number> = {
    emergency: 4,
    warning: 3,
    watch: 2,
    none: 0
  };
  return alerts.sort((a, b) => rank[b.level] - rank[a.level] || a.distanceKm - b.distanceKm);
}

export function highestLevel(alerts: CrossAlert[]): ThreatLevel {
  if (alerts.some((a) => a.level === "emergency")) return "emergency";
  if (alerts.some((a) => a.level === "warning")) return "warning";
  if (alerts.some((a) => a.level === "watch")) return "watch";
  return "none";
}

function isRainCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  );
}

function quakeLevel(mag: number, km: number, ageMin: number): ThreatLevel {
  // Intensidad grosera por magnitud + distancia. No es PGA ni MMI.
  if (mag >= 6.5 && km <= 250 && ageMin <= 30) return "emergency";
  if (mag >= 5.5 && km <= 120 && ageMin <= 60) return "warning";
  if (mag >= 4.5 && km <= 80) return "watch";
  if (mag >= 3 && km <= 25 && ageMin <= 20) return "watch";
  return "none";
}

function stormLevel(storm: StormEvent, km: number): ThreatLevel {
  const cat = classifyStorm(storm.classification);
  if (cat >= 3 && km <= 400) return "emergency";
  if (cat >= 1 && km <= 300) return "warning";
  if (cat >= 0 && km <= 500) return "watch";
  if (km <= 800) return "watch";
  return "none";
}

function classifyStorm(label: string): number {
  const u = label.toUpperCase();
  if (u.includes("CAT 5") || u.includes("CATEGORY 5")) return 5;
  if (u.includes("CAT 4") || u.includes("CATEGORY 4")) return 4;
  if (u.includes("CAT 3") || u.includes("CATEGORY 3")) return 3;
  if (u.includes("CAT 2") || u.includes("CATEGORY 2")) return 2;
  if (u.includes("CAT 1") || u.includes("CATEGORY 1")) return 1;
  if (u.includes("HU") || u.includes("HURRICANE") || u.includes("HURACÁN")) return 2;
  if (u.includes("TS") || u.includes("STORM") || u.includes("TORMENTA")) return 0;
  return -1;
}
