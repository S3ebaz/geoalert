# GeoAlerta Global

Prototipo educativo de PWA para monitoreo multi-amenaza (sismos + ciclones + clima local).

**No es un sistema oficial de alerta temprana.** Un navegador que consulta feeds públicos no puede competir con redes sísmicas (ShakeAlert, SASMEX, SASO). Úsalo para aprender arquitectura, no para decidir una evacuación.

## Simbología del mapa

Dos familias de color para distinguir de un vistazo (y por forma, útil con daltonismo): **sismos en cálidos** (círculo) y **ciclones en fríos** (espiral).

**Sismos** — el tamaño y el color crecen con la magnitud (clases USGS):

| Clase | Magnitud | Color |
| --- | --- | --- |
| Micro | menor a 3 | amarillo |
| Menor | 3 – 3.9 | naranja |
| Ligero | 4 – 4.9 | rojo |
| Moderado | 5 – 5.9 | rojo oscuro |
| Fuerte | 6 – 6.9 | granate |
| Mayor | 7 o más | casi negro |

**Ciclones** — glifo de espiral; tamaño y color según la categoría Saffir–Simpson calculada con el viento sostenido que informa el NHC: depresión tropical (TD), tormenta tropical (TS) y huracán categorías 1 a 5.

**Otros indicadores**

| Símbolo | Significado |
| --- | --- |
| Punto cian con borde blanco | Tu posición (GPS o ciudad elegida); círculo tenue si el GPS informa una precisión amplia |
| Anillo pulsante | Evento de la última hora |
| Símbolo atenuado | Sismo de hace más de 6 h |
| Insignia azul ≈ | Sismo en región oceánica (indicador `tsunami` de USGS; **no** confirma un tsunami) |
| Halo semitransparente | Área aproximada, no una zona oficial (sismos M4+ y ciclones) |
| Anillo celeste con borde blanco | Evento seleccionado |

La leyenda del mapa es colapsable y arranca cerrada en pantallas angostas.

## Detalle de cada evento

Al **pulsar** un sismo, un ciclón o tu posición se abre un panel con toda la información disponible (y el mapa centra el evento fuera del panel). Para cerrarlo: la ✕, la tecla Esc o un clic en el mapa vacío. También puedes abrirlo desde «Ver en el mapa» en la lista de alertas cruzadas.

- **Sismo (USGS):** magnitud y tipo, clase, lugar, hora local y UTC, antigüedad, profundidad, coordenadas, distancia y rumbo desde tu posición, tiempos teóricos de ondas P/S, reportes ciudadanos (CDI), intensidad instrumental (MMI), impacto estimado PAGER, importancia, estado (automático o revisado), nota de región oceánica y detalles técnicos (red, estaciones, hueco azimutal, RMS, ID), con enlace a la ficha de USGS.
- **Ciclón (NHC):** clasificación, categoría, viento máximo sostenido (km/h, mph y kt), presión mínima, posición, distancia y rumbo desde tu posición, movimiento, cuenca, última actualización, con enlaces al aviso público, la discusión y los gráficos del NHC.
- **Tu posición:** lugar, coordenadas, fuente (GPS o manual) y precisión.
- Si el motor de alertas generó una alerta para ese evento, se muestra arriba con su nivel.

Al pasar el cursor sobre un símbolo se muestra un resumen rápido.

## Qué implementa este código base

1. Modal de geolocalización con `navigator.geolocation` y fallback a ciudad/país (Open-Meteo Geocoding).
2. Mapa Leaflet + teselas de Google Maps.
3. Sismos: feeds GeoJSON de USGS (`all_hour` + `2.5_day`).
4. Ciclones: copia de `CurrentStorms.json` del NHC en `public/storms.json` (el feed no envía CORS, así que el navegador no puede leerlo directo), con trayectoria de pronóstico. Se refresca en cada deploy y cada hora.
5. Clima puntual: Open-Meteo.
6. Motor `evaluateCrossAlerts` (magnitud × distancia × edad; modelo P/S solo pedagógico).
7. Panel de emergencia de alto contraste y enlace a ruta peatonal OSM. **Sin catálogo oficial de refugios.**
8. Gateway WebSocket opcional (`npm run ws`).

## Despliegue en GitHub Pages

El sitio de proyecto se publica con `.github/workflows/pages.yml`. El build usa `output: "export"` y prefija los assets con el nombre del repo (`/geoalert`). En el repositorio, Settings → Pages → Source debe ser **GitHub Actions**.

El gateway WebSocket no corre en Pages. `npm run ws` es solo local.

## Arranque

```bash
cd geoalerta-global
npm install
npm run dev
```

Abre `http://localhost:3000`. El mapa pide ubicación al cargar.

Gateway opcional:

```bash
npm run ws
```

## Arquitectura

```
Navegador (PWA)
  ├─ PermissionModal / CitySelector
  ├─ useThreatMonitor (poll 60s)
  ├─ alerts-engine (local, determinista)
  ├─ MapView (Leaflet + Google tiles, dinámico, sin SSR)
  │    └─ EventDetailPanel (detalle al pulsar) · MapLegend · lib/symbology
  └─ Notification API (local)
         │
         ▼
APIs públicas: USGS · NHC · Open-Meteo · Nominatim
         │
         ▼
server/ws-gateway.mjs   (opcional, fan-out de conteos)
```

En producción:

- Sustituye el poll por un backend que cachee feeds (respeta rate limits de Nominatim).
- Conecta el inventario real de Protección Civil (GeoJSON / ArcGIS).
- Push real: Web Push + VAPID + Service Worker, no `new Notification()` suelto.
- Trayectoria de huracán: productos GIS del NHC (cono + wind radii), no solo el punto actual.
- EEW de segundos: solo vía convenio con la red sísmica nacional.

## Privacidad

La coordenada se guarda en `localStorage` del dispositivo. Este prototipo no envía GPS a un backend propio.

## Licencia

MIT. Ver `LICENSE`.
