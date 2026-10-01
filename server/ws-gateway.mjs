/**
 * Gateway opcional. El frontend ya funciona con polling de 60s.
 * Este proceso reconsulta USGS/NHC y reenvía un resumen a clientes WS.
 *
 *   npm run ws
 *
 * No se despliega en GitHub Pages (solo estáticos). En producción vive
 * en un proceso aparte, una sola instancia consultando los feeds.
 */
import { WebSocketServer } from "ws";

const PORT = Number(process.env.WS_PORT ?? 8787);
const ORIGIN = process.env.WS_ORIGIN ?? "";
const INTERVAL_MS = 30_000;
const FETCH_MS = 8_000;
const MAX_CLIENTS = 200;

const wss = new WebSocketServer({ port: PORT });

let inflight = null;
let cached = null;

async function snapshot() {
  if (inflight) return inflight;
  inflight = (async () => {
    const [eq, st] = await Promise.all([
      fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson", {
        signal: AbortSignal.timeout(FETCH_MS)
      }).then((r) => {
        if (!r.ok) throw new Error(`USGS ${r.status}`);
        return r.json();
      }),
      fetch("https://www.nhc.noaa.gov/CurrentStorms.json", {
        signal: AbortSignal.timeout(FETCH_MS)
      })
        .then((r) => (r.ok ? r.json() : { activeStorms: [] }))
        .catch(() => ({ activeStorms: [] }))
    ]);
    cached = {
      t: Date.now(),
      earthquakes: (eq.features ?? []).length,
      storms: (st.activeStorms ?? []).length
    };
    return cached;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

function send(socket, payload) {
  if (socket.readyState === 1) socket.send(payload);
}

async function broadcast() {
  if (wss.clients.size === 0) return;
  try {
    const payload = JSON.stringify(await snapshot());
    for (const client of wss.clients) send(client, payload);
  } catch (err) {
    console.error("snapshot falló", err instanceof Error ? err.message : err);
  }
}

const timer = setInterval(() => void broadcast(), INTERVAL_MS);

wss.on("connection", (socket, req) => {
  if (ORIGIN && req.headers.origin !== ORIGIN) {
    socket.close(1008, "origin");
    return;
  }
  if (wss.clients.size > MAX_CLIENTS) {
    socket.close(1013, "busy");
    return;
  }
  socket.isAlive = true;
  socket.on("pong", () => {
    socket.isAlive = true;
  });
  send(socket, JSON.stringify({ hello: "geoalerta-ws", note: "prototipo educativo" }));
  if (cached) send(socket, JSON.stringify(cached));
});

const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 25_000);

function shutdown() {
  clearInterval(timer);
  clearInterval(heartbeat);
  wss.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`GeoAlerta WS en ws://localhost:${PORT}`);
