// Cambia estos nombres si tus sensores usan otros sensor_type en la BD
export const SENSOR_LIST = [
  { key: "A", label: "Sensor A", match: ["A", "S1", "MPU1", "sensorA"] },
  { key: "B", label: "Sensor B", match: ["B", "S2", "MPU2", "sensorB"] },
  { key: "C", label: "Sensor C", match: ["C", "S3", "MPU3", "sensorC"] },
];

export function pickSensorKey(sensorType) {
  const s = String(sensorType || "").trim();
  for (const item of SENSOR_LIST) {
    if (item.match.includes(s)) return item.key;
  }
  // Si viene algo raro, manda a C por defecto
  return "C";
}
