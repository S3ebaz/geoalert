"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function Frame({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 6);
  }, [map, lat, lon]);
  return null;
}

export function RainRadar({ lat, lon }: { lat: number; lon: number }) {
  const [tiles, setTiles] = useState<string | null>(null);

  useEffect(() => {
    void fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((j: { host: string; radar: { past: Array<{ path: string }> } }) => {
        const last = j.radar.past[j.radar.past.length - 1];
        if (last) setTiles(`${j.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`);
      })
      .catch(() => setTiles(null));
  }, []);

  return (
    <div className="h-52 w-full">
      <MapContainer center={[lat, lon]} zoom={6} className="h-full w-full" zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png" subdomains={["a", "b", "c", "d"]} />
        {tiles ? <TileLayer url={tiles} opacity={0.7} /> : null}
        <Frame lat={lat} lon={lon} />
        <Marker
          position={[lat, lon]}
          icon={L.divIcon({
            className: "ga-symbol",
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            html: `<div style="width:14px;height:14px;border-radius:99px;background:#38bdf8;border:2px solid white"></div>`
          })}
        />
      </MapContainer>
    </div>
  );
}
