import { $id, setDot } from "./dom.js";
import { wireBasicControls } from "./controls.js";
import { createLogTable } from "./logTable.js";

import { createSbClient, loadSupabaseCfg, saveSupabaseCfg } from "./supabase.js";
import { pickSensorKey } from "./sensors.js";

import { createCharts, pushPoint, redraw } from "./charts.js";
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

const charts = createCharts();
const log = createLogTable({ tbodyEl: ui.logBody, scrollEl: ui.logScroll, autoScrollEl: ui.autoScroll, maxRows: 250 });

const buffers = { A: [], B: [], C: [] };
let baselineRms = null;

// ---------------- helpers
function setDb(on) {
  ui.dbStatus.textContent = on ? "ON" : "OFF";
  setDot(ui.dotDb, on ? "ok" : "bad");
}
function setRt(status) {
  const ok = status === "SUBSCRIBED";
  ui.rtStatus.textContent = ok ? "ON" : status || "OFF";
  setDot(ui.dotRt, ok ? "ok" : (status ? "warn" : "bad"));
}

function clearAll() {
  for (const k of ["A","B","C"]) {
    buffers[k].length = 0;
    charts[k].data.labels = [];
    charts[k].data.datasets[0].data = [];
    charts[k].data.datasets[1].data = [];
    redraw(charts[k]);
  }
  log.clear();
  updateRmsUI();
}

function updateRmsUI() {
  const rms = rmsMag(buffers.C);
  ui.rmsNow.textContent = fmt(rms);

  ui.rmsBase.textContent = fmt(baselineRms);
  if (Number.isFinite(rms) && Number.isFinite(baselineRms) && baselineRms > 0) {
    ui.rmsRatio.textContent = (rms / baselineRms).toFixed(3);
  } else {
    ui.rmsRatio.textContent = "-";
  }
}

let decCounter = 0;

function ingestRow(row) {
  if (paused) return;

  // Decimación
  decCounter++;
  if (decimation > 1 && (decCounter % decimation !== 0)) return;

  const ts = row.ts ? new Date(row.ts) : new Date();
  const label = ts.toLocaleTimeString("es-MX", { hour12: false });

  const sensorType = row.sensor_type ?? row.sensor ?? "C";
  const key = pickSensorKey(sensorType);

  const x = Number(row.x_value ?? row.x ?? 0);
  const y = Number(row.y_value ?? row.y ?? 0);

  const point = { t: ts.getTime(), x, y, label, sensor: sensorType };

  buffers[key].push(point);
  while (buffers[key].length > maxPoints) buffers[key].shift();

  pushPoint(charts[key], label, x, y, maxPoints);
  redraw(charts[key]);

  log.push({ label, sensor: sensorType, x, y });
  updateRmsUI();
}

// ---------------- connect
async function connectSupabase() {
  const url = ui.sbUrl.value.trim();
  const anon = ui.sbAnon.value.trim();
  const table = ui.sbTable.value.trim() || "sensor_data";
  const limitLast = Number(ui.limitLast.value || 2000);
  const sessionId = ui.sessionId.value.trim();

  saveSupabaseCfg({ url, anon, table });

  sb = createSbClient(url, anon);

  // Test rápido: intenta un select mínimo
  try {
    const { error } = await sb.from(table).select("ts").limit(1);
    if (error) throw error;
    setDb(true);
  } catch (e) {
    setDb(false);
    alert("Error conectando/leyendo tabla: " + (e?.message || e));
    return;
  }

  // Carga histórico
  try {
    const data = await fetchHistory({ sb, table, limitLast, sessionId });
    for (const row of data) ingestRow(row);
  } catch (e) {
    console.warn("Histórico falló:", e);
  }

  // Realtime
  if (sub) await sub.stop();
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
      startSimulator({ onSample: (r) => ingestRow({ ts: r.ts, sensor_type: r.sensor_type, x_value: r.x_value, y_value: r.y_value }) });
    } else {
      stopSimulator();
    }
  },
  onWinChange: (v) => {
    maxPoints = v;
    ui.winLabel.textContent = String(maxPoints);
    for (const k of ["A","B","C"]) {
      while (buffers[k].length > maxPoints) buffers[k].shift();
      while (charts[k].data.labels.length > maxPoints) {
        charts[k].data.labels.shift();
        charts[k].data.datasets[0].data.shift();
        charts[k].data.datasets[1].data.shift();
      }
      redraw(charts[k]);
    }
    updateRmsUI();
  },
  onDecChange: (v) => {
    decimation = Math.max(1, v);
    ui.decLabel.textContent = String(decimation);
  },
  onBaselineSet: () => {
    baselineRms = rmsMag(buffers.C);
    updateRmsUI();
  },
  onBaselineClear: () => {
    baselineRms = null;
    updateRmsUI();
  },
});

// ---------------- load saved cfg
(function boot() {
  setDb(false); setRt("");
  const cfg = loadSupabaseCfg();
  if (cfg?.url) ui.sbUrl.value = cfg.url;
  if (cfg?.anon) ui.sbAnon.value = cfg.anon;
  if (cfg?.table) ui.sbTable.value = cfg.table;
})();
