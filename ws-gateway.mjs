/**
 * Gateway opcional. El frontend ya funciona con polling de 60s.
 * Este proceso reconsulta USGS/NHC y reenvía un resumen a clientes WS.
 *
 *   npm run ws
 */
import { WebSocketServer } from "ws";

const PORT = Number(process.env.WS_PORT ?? 8787);
const wss = new WebSocketServer({ port: PORT });

async function snapshot() {
  const [eq, st] = await Promise.all([
    fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson").then((r) =>
      r.json()
    ),
    fetch("https://www.nhc.noaa.gov/CurrentStorms.json")
      .then((r) => r.json())
      .catch(() => ({ activeStorms: [] }))
  ]);
  return {
    t: Date.now(),
    earthquakes: (eq.features ?? []).length,
    storms: (st.activeStorms ?? []).length
  };
}

async function broadcast() {
  const payload = JSON.stringify(await snapshot());
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

setInterval(broadcast, 30_000);
wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ hello: "geoalerta-ws", note: "prototipo educativo" }));
});

console.log(`GeoAlerta WS en ws://localhost:${PORT}`);
