// sensors.js
// sensor_type (tu DB) -> A/B/C

const MAP = {
  "mpu9250_1": "A",
  "mpu9250_2": "B",
  "lsm6dsox":  "C",
};

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

export function pickSensorKey(sensorType) {
  const s = norm(sensorType);

  if (MAP[s]) return MAP[s];

  // fallbacks por si llega con variaciones
  if (s.includes("mpu9250") && (s.includes("_1") || s.includes("#1") || s.includes(" 1"))) return "A";
  if (s.includes("mpu9250") && (s.includes("_2") || s.includes("#2") || s.includes(" 2"))) return "B";
  if (s.includes("lsm6")) return "C";

  return "C";
}
