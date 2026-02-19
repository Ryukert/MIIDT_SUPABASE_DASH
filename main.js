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

// ---------------- UI
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

  // ===== KPI IDs =====
  pc_first_A_t: $id("pc_first_A_t"), pc_first_A_x: $id("pc_first_A_x"), pc_first_A_y: $id("pc_first_A_y"),
  pc_first_B_t: $id("pc_first_B_t"), pc_first_B_x: $id("pc_first_B_x"), pc_first_B_y: $id("pc_first_B_y"),
  pc_first_C_t: $id("pc_first_C_t"), pc_first_C_x: $id("pc_first_C_x"), pc_first_C_y: $id("pc_first_C_y"),

  pc_last_A_t: $id("pc_last_A_t"), pc_last_A_x: $id("pc_last_A_x"), pc_last_A_y: $id("pc_last_A_y"),
  pc_last_B_t: $id("pc_last_B_t"), pc_last_B_x: $id("pc_last_B_x"), pc_last_B_y: $id("pc_last_B_y"),
  pc_last_C_t: $id("pc_last_C_t"), pc_last_C_x: $id("pc_last_C_x"), pc_last_C_y: $id("pc_last_C_y"),

  rpi_first_A_t: $id("rpi_first_A_t"), rpi_first_A_x: $id("rpi_first_A_x"), rpi_first_A_y: $id("rpi_first_A_y"),
  rpi_first_B_t: $id("rpi_first_B_t"), rpi_first_B_x: $id("rpi_first_B_x"), rpi_first_B_y: $id("rpi_first_B_y"),
  rpi_first_C_t: $id("rpi_first_C_t"), rpi_first_C_x: $id("rpi_first_C_x"), rpi_first_C_y: $id("rpi_first_C_y"),

  rpi_last_A_t: $id("rpi_last_A_t"), rpi_last_A_x: $id("rpi_last_A_x"), rpi_last_A_y: $id("rpi_last_A_y"),
  rpi_last_B_t: $id("rpi_last_B_t"), rpi_last_B_x: $id("rpi_last_B_x"), rpi_last_B_y: $id("rpi_last_B_y"),
  rpi_last_C_t: $id("rpi_last_C_t"), rpi_last_C_x: $id("rpi_last_C_x"), rpi_last_C_y: $id("rpi_last_C_y"),
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

// KPI: “primera lectura” solo se setea 1 vez por device/sensor
const kpiFirstSet = { PC: { A:false, B:false, C:false }, RPI: { A:false, B:false, C:false } };

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

// Ajusta si tus device_id no contienen "pc" o "rpi"
function deviceKeyFromId(deviceId) {
  const s = String(deviceId || "").toLowerCase();
  if (s.includes("pc_") || s.startsWith("pc")) return "PC";
  if (s.includes("rpi_") || s.startsWith("rpi")) return "RPI";
  return null;
}

function fmt6(v){
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(6);
}

// KPI timestamp en UTC (como tu captura)
function fmtUtcHHMMSS(ts){
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d)) return "-";
  const h = String(d.getUTCHours()).padStart(2,"0");
  const m = String(d.getUTCMinutes()).padStart(2,"0");
  const s = String(d.getUTCSeconds()).padStart(2,"0");
  return `${h}:${m}:${s}`;
}

function updateKpi(devKey, key, ts, x, y) {
  const prefix = devKey === "PC" ? "pc" : "rpi";
  const T = fmtUtcHHMMSS(ts);
  const X = fmt6(x);
  const Y = fmt6(y);

  // FIRST (solo una vez)
  if (!kpiFirstSet[devKey][key]) {
    ui[`${prefix}_first_${key}_t`].textContent = T;
    ui[`${prefix}_first_${key}_x`].textContent = X;
    ui[`${prefix}_first_${key}_y`].textContent = Y;
    kpiFirstSet[devKey][key] = true;
  }

  // LAST (siempre)
  ui[`${prefix}_last_${key}_t`].textContent = T;
  ui[`${prefix}_last_${key}_x`].textContent = X;
  ui[`${prefix}_last_${key}_y`].textContent = Y;
}

function updateRmsUI() {
  // RMS: usa C del RPI si existe; si no C del PC (igual que antes)
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
  // reset KPI first flags
  kpiFirstSet.PC = { A:false, B:false, C:false };
  kpiFirstSet.RPI = { A:false, B:false, C:false };

  // reset KPI UI text
  for (const dev of ["pc","rpi"]) {
    for (const k of ["A","B","C"]) {
      ui[`${dev}_first_${k}_t`].textContent = "-";
      ui[`${dev}_first_${k}_x`].textContent = "-";
      ui[`${dev}_first_${k}_y`].textContent = "-";
      ui[`${dev}_last_${k}_t`].textContent = "-";
      ui[`${dev}_last_${k}_x`].textContent = "-";
      ui[`${dev}_last_${k}_y`].textContent = "-";
    }
  }

  // clear buffers + charts
  for (const devKey of ["PC", "RPI"]) {
    for (const k of ["A","B","C"]) {
      buffersByDevice[devKey][k].length = 0;

      const ch = chartsByDevice[devKey][k];
      ch.data.labels = [];
      ch.data.datasets[0].data = [];
      ch.data.datasets[1].data = [];
      redraw(ch);
    }
  }

  log.clear();
  updateRmsUI();
}

function ingestRow(row) {
  if (paused) return;

  decCounter++;
  if (decimation > 1 && (decCounter % decimation !== 0)) return;

  const devKey = deviceKeyFromId(row.device_id);
  if (!devKey) return;

  const ts = row.ts ? new Date(row.ts) : new Date();
  const labelLocal = ts.toLocaleTimeString("es-MX", { hour12: false }); // para el LOG (local)

  const sensorType = row.sensor_type ?? row.sensor ?? "lsm6dsox";
  const key = pickSensorKey(sensorType); // A/B/C

  const x = Number(row.x_value ?? row.x ?? 0);
  const y = Number(row.y_value ?? row.y ?? 0);

  // KPI update (UTC)
  updateKpi(devKey, key, ts, x, y);

  // buffers + chart
  const point = { t: ts.getTime(), x, y, label: labelLocal, sensor: sensorType, device: row.device_id };

  const buf = buffersByDevice[devKey][key];
  buf.push(point);
  while (buf.length > maxPoints) buf.shift();

  const chart = chartsByDevice[devKey][key];
  pushPoint(chart, labelLocal, x, y, maxPoints);
  redraw(chart);

  // log
  log.push({ label: labelLocal, sensor: `${devKey} • ${sensorType}`, x, y });

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

  try {
    const { error } = await sb.from(table).select("ts").limit(1);
    if (error) throw error;
    setDb(true);
  } catch (e) {
    setDb(false);
    alert("Error conectando/leyendo tabla: " + (e?.message || e));
    return;
  }

  // Antes de cargar histórico, limpia (para que “Primera lectura” sea del histórico cargado)
  clearAll();

  // Histórico (ya viene ordenado viejo->nuevo en history.js)
  try {
    const data = await fetchHistory({ sb, table, limitLast, sessionId });
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

// ---------------- wire
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
          y_value: r.y_value
        })
      });
    } else {
      stopSimulator();
    }
  },
  onWinChange: (v) => {
    maxPoints = v;
    ui.winLabel.textContent = String(maxPoints);
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
