#!/usr/bin/env python3
"""Descarga ciclones activos del NHC y su trayectoria a public/storms.json.

CurrentStorms.json no envía Access-Control-Allow-Origin, así que el navegador
no puede leerlo. Este snapshot se sirve desde el mismo origen (GitHub Pages).
"""
import json
import re
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "storms.json"
NHC = "https://www.nhc.noaa.gov/CurrentStorms.json"
UA = {"User-Agent": "GeoAlerta-educational/0.1"}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as res:
        return res.read()


def num(value):
    if value is None or value == "":
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n == n else None


def track_from_kmz(url: str):
    try:
        raw = get(url)
        with zipfile.ZipFile(BytesIO(raw)) as zf:
            name = next(n for n in zf.namelist() if n.lower().endswith(".kml"))
            kml = zf.read(name).decode("utf-8", "replace")
    except Exception as exc:
        print(f"trayectoria omitida {url}: {exc}", file=sys.stderr)
        return []
    points = []
    for block in re.findall(r"<Placemark>(.*?)</Placemark>", kml, re.S):
        label = re.search(r"<name>(.*?)</name>", block, re.S)
        text = re.sub(r"<[^>]+>", "", label.group(1)).strip() if label else ""
        coords = re.search(r"<coordinates>(.*?)</coordinates>", block, re.S)
        if not coords:
            continue
        for pair in coords.group(1).split():
            parts = pair.split(",")
            if len(parts) < 2:
                continue
            lon, lat = num(parts[0]), num(parts[1])
            if lat is None or lon is None:
                continue
            points.append({"lat": lat, "lon": lon, "label": text or None})
    # El LineString repite los puntos del pronóstico; nos quedamos con el orden.
    deduped = []
    for p in points:
        if deduped and deduped[-1]["lat"] == p["lat"] and deduped[-1]["lon"] == p["lon"]:
            if p["label"] and not deduped[-1]["label"]:
                deduped[-1]["label"] = p["label"]
            continue
        deduped.append(p)
    return deduped


def main() -> int:
    try:
        payload = json.loads(get(NHC))
    except Exception as exc:
        print(f"no se pudo leer el NHC: {exc}", file=sys.stderr)
        return 1 if not OUT.exists() else 0

    storms = []
    for s in payload.get("activeStorms") or []:
        lat, lon = num(s.get("latitudeNumeric")), num(s.get("longitudeNumeric"))
        if lat is None or lon is None:
            continue
        kmz = ((s.get("forecastTrack") or {}).get("kmzFile")) or ""
        track = track_from_kmz(kmz) if kmz else []
        storms.append(
            {
                "id": s.get("id") or s.get("binNumber") or s.get("name"),
                "name": s.get("name") or "Sistema tropical",
                "classification": s.get("classification") or "Desconocido",
                "lat": lat,
                "lon": lon,
                "windKt": num(s.get("intensity")),
                "pressureMb": num(s.get("pressure")),
                "movementDir": num(s.get("movementDir")),
                "movementSpeedMph": num(s.get("movementSpeed")),
                "basin": s.get("basin"),
                "lastUpdate": s.get("lastUpdate"),
                "advisoryUrl": (s.get("publicAdvisory") or {}).get("url"),
                "discussionUrl": (s.get("forecastDiscussion") or {}).get("url"),
                "graphicsUrl": (s.get("forecastGraphics") or {}).get("url"),
                "track": track,
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    text = (
        json.dumps(
            {
                "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "source": NHC,
                "storms": storms,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    OUT.write_text(text, encoding="utf-8")
    (ROOT / "lib" / "active-storms.json").write_text(text, encoding="utf-8")
    print(f"{len(storms)} ciclones -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
