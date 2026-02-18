export function pickSensorKey(sensorType) {
  const s = String(sensorType || "").toUpperCase();

  // Mapea por letras o nombres comunes
  if (s.includes("A") || s.includes("S1") || s.includes("SENSOR1")) return "A";
  if (s.includes("B") || s.includes("S2") || s.includes("SENSOR2")) return "B";
  if (s.includes("C") || s.includes("S3") || s.includes("SENSOR3")) return "C";

  // Si viene tipo numérico:
  if (s === "1") return "A";
  if (s === "2") return "B";
  if (s === "3") return "C";

  // Default: C
  return "C";
}
