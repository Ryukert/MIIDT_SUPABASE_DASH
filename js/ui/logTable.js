function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function num(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return (Math.abs(n) >= 100 ? n.toFixed(1) : Math.abs(n) >= 10 ? n.toFixed(2) : n.toFixed(4));
}

export function createLogTable({ tbodyEl, scrollEl, autoScrollEl, maxRows = 200 }) {
  const rows = [];

  function push(sample) {
    rows.push(sample);
    while (rows.length > maxRows) rows.shift();

    const tr = document.createElement("tr");
    tr.className = "border-b";
    tr.innerHTML = `
      <td class="p-2">${esc(sample.label || "-")}</td>
      <td class="p-2">${esc(sample.sensor || "-")}</td>
      <td class="p-2">${num(sample.x)}</td>
      <td class="p-2">${num(sample.y)}</td>
    `;
    tbodyEl.appendChild(tr);

    while (tbodyEl.children.length > maxRows) tbodyEl.removeChild(tbodyEl.firstChild);
    if (autoScrollEl?.checked) scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  function clear() { rows.length = 0; tbodyEl.innerHTML = ""; }
  function getRows() { return rows.slice(); }

  return { push, clear, getRows };
}
