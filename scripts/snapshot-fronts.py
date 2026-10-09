#!/usr/bin/env python3
"""Copia el aviso de sistemas frontales del SMN. El navegador no puede leer esa página."""
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "fronts.json"
URL = "https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public/WebAvisoFfrios"

STATES = {
    "Aguascalientes": (21.88, -102.29),
    "Baja California Sur": (24.14, -110.31),
    "Baja California": (32.62, -115.45),
    "Campeche": (19.85, -90.53),
    "Chiapas": (16.75, -93.12),
    "Chihuahua": (28.64, -106.09),
    "Ciudad de México": (19.43, -99.13),
    "Coahuila": (25.42, -101.0),
    "Colima": (19.24, -103.73),
    "Durango": (24.03, -104.65),
    "Guanajuato": (21.02, -101.26),
    "Guerrero": (17.55, -99.5),
    "Hidalgo": (20.1, -98.76),
    "Jalisco": (20.66, -103.35),
    "Estado de México": (19.29, -99.66),
    "Michoacán": (19.71, -101.19),
    "Morelos": (18.92, -99.22),
    "Nayarit": (21.5, -104.89),
    "Nuevo León": (25.67, -100.32),
    "Oaxaca": (17.07, -96.73),
    "Puebla": (19.04, -98.21),
    "Querétaro": (20.59, -100.39),
    "Quintana Roo": (18.5, -88.3),
    "San Luis Potosí": (22.16, -100.99),
    "Sinaloa": (24.81, -107.39),
    "Sonora": (29.07, -110.96),
    "Tabasco": (17.99, -92.95),
    "Tamaulipas": (23.74, -99.14),
    "Tlaxcala": (19.32, -98.24),
    "Veracruz": (19.17, -96.13),
    "Yucatán": (20.97, -89.59),
    "Zacatecas": (22.77, -102.58),
}

req = urllib.request.Request(URL, headers={"User-Agent": "GeoAlerta/0.1"})
html = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")
text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
text = re.sub(r"<[^>]+>", "\n", text)
lines = [re.sub(r"\s+", " ", line).replace("\xa0", " ").strip() for line in text.splitlines()]
lines = [line for line in lines if line and line not in {"&nbsp;"}]
blob = "\n".join(lines)

aviso = next((line.split(":", 1)[1].strip() for line in lines if line.lower().startswith("no. aviso")), "")
issued = next((line.split(":", 1)[1].strip() for line in lines if line.lower().startswith("emisión")), "")
synthesis = next((line for line in lines if "SIN SISTEMAS FRONTALES" in line.upper()), "")
if not synthesis:
    synthesis = next((line for line in lines if re.search(r"frente fr[ií]o\s+\d+", line, re.I)), "")
inactive = "SIN SISTEMAS FRONTALES" in blob.upper()
number = ""
match = re.search(r"frente fr[ií]o\s*(?:n[uú]mero\s*)?(\d+)", blob, re.I)
if match:
    number = match.group(1)

found = []
for name, (lat, lon) in STATES.items():
    if re.search(rf"\b{re.escape(name)}\b", blob, re.I):
        found.append({"name": name, "lat": lat, "lon": lon, "dropC": 0, "windFrom": 0, "windKmh": 0})

fronts = []
if not inactive and (number or found):
    fronts.append(
        {
            "id": f"smn-{number or aviso or 'frente'}",
            "name": f"Frente frío {number}".strip(),
            "points": found,
            "summary": synthesis or "Aviso oficial del SMN.",
        }
    )

payload = {
    "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "source": "SMN",
    "url": URL,
    "aviso": aviso,
    "issuedAt": issued,
    "active": bool(fronts),
    "summary": synthesis or "Sin texto de síntesis en el aviso del SMN.",
    "fronts": fronts,
}
text_out = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(text_out, encoding="utf-8")
(ROOT / "lib" / "active-fronts.json").write_text(text_out, encoding="utf-8")
print(f"aviso {aviso} active={bool(fronts)} -> {OUT}")
