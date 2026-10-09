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
import { fetchActiveStorms, fetchLocalWeather, bundledStorms } from "./storms";
import { bundledFronts, fetchFrontReport } from "./fronts";
import type { ColdFront, Coord, CrossAlert, EarthquakeEvent, FrontBulletin, StormEvent, WeatherSnapshot } from "./types";

export function useThreatMonitor() {
  const [coord, setCoord] = useState<Coord | null>(null);
  const [needPermission, setNeedPermission] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [busyGeo, setBusyGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [quakes, setQuakes] = useState<EarthquakeEvent[]>([]);
  const [storms, setStorms] = useState<StormEvent[]>(bundledStorms);
  const [fronts, setFronts] = useState<ColdFront[]>(bundledFronts.fronts);
  const [frontBulletin, setFrontBulletin] = useState<FrontBulletin>(bundledFronts.bulletin);
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

  useEffect(() => {
    let stop = false;
    async function loadStorms() {
      const next = await fetchActiveStorms();
      if (!stop && next.length > 0) setStorms(next);
    }
    void loadStorms();
    const id = window.setInterval(() => void loadStorms(), 60_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let stop = false;
    async function loadFronts() {
      const next = await fetchFrontReport();
      if (!stop) {
        setFronts(next.fronts);
        setFrontBulletin(next.bulletin);
      }
    }
    void loadFronts();
    const id = window.setInterval(() => void loadFronts(), 30 * 60_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!coord) return;
    const [q, w] = await Promise.all([
      fetchEarthquakes(),
      fetchLocalWeather(coord.lat, coord.lon)
    ]);
    setQuakes(q);
    setWeather(w);
  }, [coord]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const alerts: CrossAlert[] = useMemo(() => {
    if (!coord) return [];
    return evaluateCrossAlerts({ user: coord, quakes, storms, weather, fronts });
  }, [coord, quakes, storms, weather, fronts]);

  const level = highestLevel(alerts);

  useEffect(() => {
    for (const a of alerts) {
      const rain = a.id === "wx-rain";
      if ((a.level === "emergency" || rain) && !seen.current.has(a.id)) {
        seen.current.add(a.id);
        pushLocalAlert(a.title, a.detail);
        if (a.level === "emergency") setEmergencyOpen(true);
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
    fronts,
    frontBulletin,
    alerts,
    level,
    emergencyOpen,
    setEmergencyOpen,
    refresh
  };
}
