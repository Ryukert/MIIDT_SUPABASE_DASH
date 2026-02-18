export function exportLogToCSV(rows, filename = "miidt_log.csv") {
  const header = ["hora","sensor","x","y"];
  const lines = [header.join(",")];

  for (const r of rows) {
    const row = [
      safe(r.label),
      safe(r.sensor),
      safeNum(r.x),
      safeNum(r.y),
    ];
    lines.push(row.join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function safe(v){
  const s = String(v ?? "");
  // comillas si trae coma
  return s.includes(",") ? `"${s.replaceAll('"','""')}"` : s;
}
function safeNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
}
