"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Coord } from "@/lib/types";

const RainRadar = dynamic(() => import("./RainRadar").then((m) => m.RainRadar), {
  ssr: false,
  loading: () => <div className="h-52 animate-pulse rounded-2xl bg-slate-800" />
});

type Hour = { time: string; temp: number; rain: number; code: number };
type Board = {
  temp: number;
  feels: number;
  min: number;
  max: number;
  code: number;
  rainMm: number;
  humidity: number;
  wind: number;
  pressure: number;
  uv: number;
  aqi: number | null;
  tomorrow: string;
  hours: Hour[];
};

const FALLBACK: Coord = {
  lat: 20.703,
  lon: -100.456,
  source: "manual",
  label: "Juriquilla, Querétaro"
};

function condition(code: number): string {
  if (code === 0) return "Despejado";
  if (code <= 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code <= 48) return "Niebla";
  if (code <= 57) return "Llovizna";
  if (code <= 67) return "Lluvias leves";
  if (code <= 77) return "Nieve";
  if (code <= 82) return "Chubascos";
  if (code <= 99) return "Tormenta";
  return "Cielo cubierto";
}

function icon(code: number): string {
  if (code === 0) return "☀";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁";
  if (code >= 95) return "⛈";
  if (code >= 51) return "🌧";
  return "☁";
}

function aqiLabel(n: number): { text: string; tone: string } {
  if (n <= 50) return { text: `Aceptable (${n})`, tone: "text-emerald-400" };
  if (n <= 100) return { text: `Moderado (${n})`, tone: "text-yellow-300" };
  return { text: `Alto (${n})`, tone: "text-orange-400" };
}

function uvLabel(n: number): { text: string; tone: string } {
  if (n < 3) return { text: "Bajo", tone: "text-emerald-400" };
  if (n < 6) return { text: "Moderado", tone: "text-yellow-300" };
  return { text: "Alto", tone: "text-orange-400" };
}

async function loadBoard(lat: number, lon: number): Promise<Board> {
  const forecast = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,precipitation,weather_code,wind_speed_10m,uv_index` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=2&timezone=auto` +
      `&temperature_unit=celsius&wind_speed_unit=kmh`,
    { cache: "no-store" }
  );
  const f = (await forecast.json()) as {
    current?: Record<string, number>;
    hourly?: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; weather_code: number[] };
    daily?: { weather_code: number[]; temperature_2m_min: number[]; temperature_2m_max: number[] };
  };
  const air = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`,
    { cache: "no-store" }
  ).then((r) => r.json() as Promise<{ current?: { us_aqi?: number } }>);
  const now = Date.now();
  const hours: Hour[] = [];
  const times = f.hourly?.time ?? [];
  for (let i = 0; i < times.length && hours.length < 12; i++) {
    if (Date.parse(times[i]) < now - 30 * 60_000) continue;
    hours.push({
      time: times[i],
      temp: f.hourly?.temperature_2m[i] ?? 0,
      rain: f.hourly?.precipitation_probability[i] ?? 0,
      code: f.hourly?.weather_code[i] ?? 0
    });
  }
  return {
    temp: f.current?.temperature_2m ?? 0,
    feels: f.current?.apparent_temperature ?? 0,
    min: f.daily?.temperature_2m_min?.[0] ?? 0,
    max: f.daily?.temperature_2m_max?.[0] ?? 0,
    code: f.current?.weather_code ?? 0,
    rainMm: f.current?.precipitation ?? 0,
    humidity: f.current?.relative_humidity_2m ?? 0,
    wind: f.current?.wind_speed_10m ?? 0,
    pressure: f.current?.pressure_msl ?? 0,
    uv: f.current?.uv_index ?? 0,
    aqi: air.current?.us_aqi ?? null,
    tomorrow: condition(f.daily?.weather_code?.[1] ?? 3),
    hours
  };
}

function hourLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric" });
}

export function WeatherBoard({ user, onRefresh }: { user: Coord | null; onRefresh: () => void }) {
  const place = user ?? FALLBACK;
  const [data, setData] = useState<Board | null>(null);

  useEffect(() => {
    let stop = false;
    void loadBoard(place.lat, place.lon).then((d) => {
      if (!stop) setData(d);
    });
    return () => {
      stop = true;
    };
  }, [place.lat, place.lon]);

  const aqi = data?.aqi != null ? aqiLabel(Math.round(data.aqi)) : null;
  const uv = data ? uvLabel(data.uv) : null;

  return (
    <section className="rounded-3xl bg-slate-950 p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-semibold">{place.label ?? "Tu ubicación"}</h2>
        <button type="button" onClick={onRefresh} className="rounded-full px-2 text-xl" aria-label="Actualizar">
          ↻
        </button>
      </div>
      {data ? (
        <>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-6xl font-light leading-none">{Math.round(data.temp)}°</p>
            <div className="pb-1 text-sm">
              <p>{condition(data.code)}</p>
              <p className="text-slate-300">
                {Math.round(data.min)}° ~ {Math.round(data.max)}° Sensación térmica {Math.round(data.feels)}°
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-3xl bg-slate-800/80 p-3">
            <p className="px-1 text-base font-semibold">Condiciones actuales</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Tile title="ICA" value={aqi?.text ?? "—"} tone={aqi?.tone} mark="🍃" />
              <Tile title="Índice UV" value={uv?.text ?? "—"} tone={uv?.tone} mark="UV" />
              <Tile title="Precipitaciones" value={`${data.rainMm.toFixed(1)} mm`} mark="💧" />
              <Tile title="Humedad" value={`${Math.round(data.humidity)} %`} mark="%" />
              <Tile title="Viento" value={`${Math.round(data.wind)} km/h`} mark="🌀" />
              <Tile title="Presión" value={`${data.pressure.toFixed(1)} mb`} mark="◎" />
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-900 px-4 py-3">
            <p className="font-medium">Clima de mañana</p>
            <p className="text-slate-300">{data.tomorrow}</p>
          </div>
          <div className="mt-3 rounded-3xl bg-slate-800/80 p-3">
            <p className="font-semibold">Pronóstico por hora</p>
            <p className="text-xs text-slate-400">Actualizado ahora</p>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {data.hours.map((h) => (
                <div key={h.time} className="min-w-14 text-center text-sm">
                  <p className="text-xs text-slate-300">{hourLabel(h.time)}</p>
                  <p className="text-lg">{icon(h.code)}</p>
                  <p className="font-semibold">{Math.round(h.temp)}°</p>
                  <p className="text-xs text-slate-300">{Math.round(h.rain)} %</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Cargando clima local…</p>
      )}
      <div className="mt-3 overflow-hidden rounded-2xl">
        <RainRadar lat={place.lat} lon={place.lon} />
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500">Radar de lluvia · Open-Meteo + RainViewer</p>
    </section>
  );
}

function Tile({ title, value, mark, tone }: { title: string; value: string; mark: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 px-3 py-3">
      <p className="text-sm text-slate-200">
        <span className="mr-1">{mark}</span>
        {title}
      </p>
      <p className={`mt-1 text-sm font-medium ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
