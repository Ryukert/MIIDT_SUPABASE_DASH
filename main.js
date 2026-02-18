import { $id, setDot } from "./dom.js";
import { wireBasicControls } from "./controls.js";
import { createLogTable } from "./logTable.js";

import { createSbClient, loadSupabaseCfg, saveSupabaseCfg } from "./supabase.js";
import { pickSensorKey } from "./sensors.js";

import { createChartsByDevice, pushPoint, redraw } from "./charts.js";
import { rmsMag, fmt } from "./rms.js";

import { fetchHistory } from "./history.js";
import { exportLogToCSV } from "./export.js";
import { startSimulator, stopSimulator } from "./simulator.js";
import { subscribeRealtime } from "./supabaseLive.js";

// ---------------- UI refs
const ui = {
  sbUrl: $id("sbUrl"),
  sbAnon: $id("sbAnon"),
  sbTable: $id("sbTable"),
  limitLast: $id("limitLast"),
  sessionId: $id("sessionId"),
  btnConnect: $id("btnConnect"),
  btnDisconnect: $id("btnDisconnect"),

  dotDb: $id("dotDb"),
  dotRt: $id("dotRt"),
  dbStatus: $id("dbStatus"),
  rtStatus: $id("rtStatus"),

  pauseBtn: $id("pauseBtn"),
  clearBtn: $id("clearBtn"),
  exportBtn: $id("exportBtn"),
  simBtn: $id("simBtn"),

  winSel: $id("winSel"),
  decSel: $id("decSel"),
  winLabel: $id("winLabel"),
  decLabel: $id("decLabel"),

  autoScroll: $id("autoScroll"),
  logScroll: $id("logScroll"),
  logBody: $id("logBody"),

  btnSetBaseline: $id("btnSetBaseline"),
  btnClearBaseline: $id("btnClearBaseline"),
  rmsNow: $id("rmsNow"),
  rmsBase: $id("rmsBase"),
  rmsRatio: $id("rmsRatio"),
};

// ---------------- state
let sb = null;
let sub = null;

let paused = false;
let simOn = false;

let maxPoints = Number(ui.winSel.value || 400);
let decimation = Number(ui.decSel.value || 1);

ui.winLabel.textContent = String(maxPoints);
ui.decLabel.textContent = String(decimation);

const chartsByDevice = createChartsByDevice();

const log = createLogTable({
  tbodyEl: ui.logBody,
  scrollEl: ui.logScroll,
  autoScrollEl: ui.autoScroll,
  maxRows: 250
});

const buffersByDevice = {
  PC:  { A: [], B: [], C: [] },
  RPI: { A: [], B: [], C: [] },
};

let baselineRms = null;
let decCounter = 0;

// ---------------- helpers
function setDb(on) {
  ui.dbStatus.textContent = on ? "ON" : "OFF";
  setDot(ui.dotDb, on ? "ok" : "bad");
}
function setRt(status) {
  const ok = status === "SUBSCRIBED";
  ui.rtStatus.textContent = ok ? "ON" : (status || "OFF");
  setDot(ui.dotRt, ok ? "ok" : (status ? "warn" : "bad"));
}

function deviceKeyFromId(deviceId) {
  const s = String(deviceId || "").toLowerCase();
  if (s.includes("pc_") || s.startsWith("pc")) return "PC";
  if (s.includes("rpi_") || s.startsWith("rpi")) return "RPI";
  return null; // desconocido
}

function extractZFromRaw(raw) {
  const m = String(raw || "").match(/Z\s*=\s*([-+]?\d+(\.\d+)?)/i);
  return m ? Number(m[1]) : NaN;
}

function updateRmsUI() {
  // Mantengo RMS como antes (sobre C del RPI si existe, si no, C del PC)
  const rmsRpiC = rmsMag(buffersByDevice.RPI.C);
  const rmsPcC  = rmsMag(buffersByDevice.PC.C);

  const rms = Number.isFinite(rmsRpiC) ? rmsRpiC : rmsPcC;

  ui.rmsNow.textContent = fmt(rms);
  ui.rmsBase.textContent = fmt(baselineRms);

  if (Number.isFinite(rms) && Number.isFinite(baselineRms) && baselineRms > 0) {
    ui.rmsRatio.textContent = (rms / baselineRms).toFixed(3);
  } else {
    ui.rmsRatio.textContent = "-";
  }
}

function clearAll() {
  for (const devKey of ["PC", "RPI"]) {
    for (const k of ["A","B","C"]) {
      buffersByDevice[devKey][k].length = 0;

      const ch = chartsByDevice[devKey][k];
      ch.data.labels = [];
      ch.data.datasets[0].data = [];
      ch.data.datasets[1].data = [];
      ch.data.datasets[2].data = [];
      redraw(ch);
    }
  }
  log.clear();
  updateRmsUI();
}

function ingestRow(row) {
  if (paused) return;

  // Decimación
  decCounter++;
  if (decimation > 1 && (decCounter % decimation !== 0)) return;

  const devKey = deviceKeyFromId(row.device_id);
  if (!devKey) return; // ignora devices raros

  const ts = row.ts ? new Date(row.ts) : new Date();
  const label = ts.toLocaleTimeString("es-MX", { hour12: false });

  const sensorType = row.sensor_type ?? row.sensor ?? "lsm6dsox";
  const key = pickSensorKey(sensorType); // A/B/C

  const x = Number(row.x_value ?? row.x ?? 0);
  const y = Number(row.y_value ?? row.y ?? 0);

  // Z (si no existe columna z_value, lo saco de raw_data)
  const z = Number.isFinite(Number(row.z_value))
    ? Number(row.z_value)
    : extractZFromRaw(row.raw_data);

  const point = { t: ts.getTime(), x, y, z, label, sensor: sensorType, device: row.device_id };

  const buf = buffersByDevice[devKey][key];
  buf.push(point);
  while (buf.length > maxPoints) buf.shift();

  const chart = chartsByDevice[devKey][key];
  pushPoint(chart, label, x, y, z, maxPoints);
  redraw(chart);

  // log
  log.push({ label, sensor: `${devKey} • ${sensorType}`, x, y });

  updateRmsUI();
}

// ---------------- connect
async function connectSupabase() {
  const url = ui.sbUrl.value.trim();
  const anon = ui.sbAnon.value.trim();
  const table = ui.sbTable.value.trim() || "sensor_data";
  const limitLast = Number(ui.limitLast.value || 2000);
  const sessionId = ui.sessionId.value.trim();

  if (!url || !anon) {
    alert("Pon tu Supabase URL y tu Anon Key.");
    return;
  }

  saveSupabaseCfg({ url, anon, table });

  sb = createSbClient(url, anon);

  // Test
  try {
    const { error } = await sb.from(table).select("ts").limit(1);
    if (error) throw error;
    setDb(true);
  } catch (e) {
    setDb(false);
    alert("Error conectando/leyendo tabla: " + (e?.message || e));
    return;
  }

  // Histórico
  try {
    let data = await fetchHistory({ sb, table, limitLast, sessionId });
    for (const row of data) ingestRow(row);
  } catch (e) {
    console.warn("Histórico falló:", e);
  }

  // Realtime
  try { if (sub) await sub.stop(); } catch {}
  sub = subscribeRealtime({
    sb,
    table,
    onStatus: setRt,
    onInsert: (row) => ingestRow(row),
  });
}

// ---------------- disconnect
async function disconnectSupabase() {
  try { if (sub) await sub.stop(); } catch {}
  sub = null;

  try { if (sb) await sb.removeAllChannels(); } catch {}
  sb = null;

  setDb(false);
  setRt("");
}

// ---------------- wire UI
ui.btnConnect.addEventListener("click", connectSupabase);
ui.btnDisconnect.addEventListener("click", disconnectSupabase);

wireBasicControls({
  ui,
  onPause: () => {
    paused = !paused;
    ui.pauseBtn.textContent = paused ? "Reanudar" : "Pausar";
  },
  onClear: () => clearAll(),
  onExport: () => exportLogToCSV(log.getRows(), "miidt_log.csv"),
  onSimToggle: () => {
    simOn = !simOn;
    ui.simBtn.textContent = simOn ? "Simulador ON" : "Simulador OFF";
    if (simOn) {
      startSimulator({
        onSample: (r) => ingestRow({
          ts: r.ts,
          device_id: "pc_simulator",
          sensor_type: r.sensor_type,
          x_value: r.x_value,
          y_value: r.y_value,
          raw_data: `Z=${(Math.random()*0.05).toFixed(6)} g`
        })
      });
    } else {
      stopSimulator();
    }
  },
  onWinChange: (v) => {
    maxPoints = v;
    ui.winLabel.textContent = String(maxPoints);

    // recortar buffers (charts se recortan solos con pushPoint)
    for (const devKey of ["PC", "RPI"]) {
      for (const k of ["A","B","C"]) {
        const buf = buffersByDevice[devKey][k];
        while (buf.length > maxPoints) buf.shift();
      }
    }
    updateRmsUI();
  },
  onDecChange: (v) => {
    decimation = Math.max(1, v);
    ui.decLabel.textContent = String(decimation);
  },
  onBaselineSet: () => {
    // baseline toma C del RPI si existe, si no C del PC
    const rpiC = rmsMag(buffersByDevice.RPI.C);
    const pcC  = rmsMag(buffersByDevice.PC.C);
    baselineRms = Number.isFinite(rpiC) ? rpiC : pcC;
    updateRmsUI();
  },
  onBaselineClear: () => {
    baselineRms = null;
    updateRmsUI();
  },
});

// ---------------- boot
(function boot() {
  setDb(false); setRt("");
  const cfg = loadSupabaseCfg();
  if (cfg?.url) ui.sbUrl.value = cfg.url;
  if (cfg?.anon) ui.sbAnon.value = cfg.anon;
  if (cfg?.table) ui.sbTable.value = cfg.table;
})();
