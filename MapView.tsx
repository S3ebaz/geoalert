"use client";

import dynamic from "next/dynamic";
import type { Coord, CrossAlert, EarthquakeEvent, MapSelection, StormEvent } from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-2xl bg-slate-200 text-sm dark:bg-slate-800 md:h-[520px]">
      Cargando mapa…
    </div>
  )
});

export function MapView(props: {
  user: Coord;
  quakes: EarthquakeEvent[];
  storms: StormEvent[];
  alerts: CrossAlert[];
  selection: MapSelection;
  onSelect: (s: MapSelection) => void;
}) {
  return <MapCanvas {...props} />;
}
