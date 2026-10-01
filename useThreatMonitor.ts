"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateCrossAlerts, highestLevel } from "./alerts-engine";
import { fetchEarthquakes } from "./earthquakes";
import {
  loadSavedCoord,
  requestBrowserGeolocation,
  reverseLabel,
  saveCoord
} from "./geolocation";
import { ensureNotificationPermission, pushLocalAlert } from "./notifications";
import { fetchActiveStorms, fetchLocalWeather } from "./storms";
import type { Coord, CrossAlert, EarthquakeEvent, StormEvent, WeatherSnapshot } from "./types";

export function useThreatMonitor() {
  const [coord, setCoord] = useState<Coord | null>(null);
  const [needPermission, setNeedPermission] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [busyGeo, setBusyGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [quakes, setQuakes] = useState<EarthquakeEvent[]>([]);
  const [storms, setStorms] = useState<StormEvent[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const saved = loadSavedCoord();
    if (saved) {
      setCoord(saved);
      setNeedPermission(false);
    }
  }, []);

  const allowGps = useCallback(async () => {
    setBusyGeo(true);
    setGeoError(null);
    try {
      const raw = await requestBrowserGeolocation();
      const label = await reverseLabel(raw);
      const next = { ...raw, label };
      saveCoord(next);
      setCoord(next);
      setNeedPermission(false);
      await ensureNotificationPermission();
    } catch (e) {
      const code = e instanceof Error ? e.message : "UNKNOWN";
      if (code === "PERMISSION_DENIED") {
        setGeoError("El navegador bloqueó la ubicación. Puedes elegir una ciudad.");
        setManualOpen(true);
      } else {
        setGeoError("No se pudo obtener GPS. Prueba el selector manual.");
      }
    } finally {
      setBusyGeo(false);
    }
  }, []);

  const pickManual = useCallback((c: Coord) => {
    saveCoord(c);
    setCoord(c);
    setNeedPermission(false);
    setManualOpen(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!coord) return;
    const [q, s, w] = await Promise.all([
      fetchEarthquakes(),
      fetchActiveStorms(),
      fetchLocalWeather(coord.lat, coord.lon)
    ]);
    setQuakes(q);
    setStorms(s);
    setWeather(w);
  }, [coord]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const alerts: CrossAlert[] = useMemo(() => {
    if (!coord) return [];
    return evaluateCrossAlerts({ user: coord, quakes, storms, weather });
  }, [coord, quakes, storms, weather]);

  const level = highestLevel(alerts);

  useEffect(() => {
    for (const a of alerts) {
      if (a.level === "emergency" && !seen.current.has(a.id)) {
        seen.current.add(a.id);
        pushLocalAlert(a.title, a.detail);
        setEmergencyOpen(true);
      }
    }
  }, [alerts]);

  return {
    coord,
    needPermission,
    manualOpen,
    setManualOpen,
    busyGeo,
    geoError,
    allowGps,
    pickManual,
    quakes,
    storms,
    alerts,
    level,
    emergencyOpen,
    setEmergencyOpen,
    refresh
  };
}
