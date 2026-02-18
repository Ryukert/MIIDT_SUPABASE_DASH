export function exportLogToCSV(rows, filename = "log.csv") {
  const header = ["hora", "sensor", "x", "y"];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push([
      csv(r.label),
      csv(r.sensor),
      csv(r.x),
      csv(r.y)
    ].join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function csv(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}
