export function createLogTable({ tbodyEl, scrollEl, autoScrollEl, maxRows = 250 }) {
  const rows = [];

  function push({ label, sensor, x, y }) {
    rows.push({ label, sensor, x, y });
    if (rows.length > maxRows) rows.shift();

    const tr = document.createElement("tr");
    tr.className = "border-b";
    tr.innerHTML = `
      <td class="p-2">${escapeHtml(label)}</td>
      <td class="p-2">${escapeHtml(String(sensor))}</td>
      <td class="p-2">${num(x)}</td>
      <td class="p-2">${num(y)}</td>
    `;
    tbodyEl.appendChild(tr);

    while (tbodyEl.children.length > maxRows) tbodyEl.removeChild(tbodyEl.firstChild);

    if (autoScrollEl?.checked) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  }

  function clear() {
    rows.length = 0;
    tbodyEl.innerHTML = "";
  }

  function getRows() {
    return rows.slice();
  }

  return { push, clear, getRows };
}

function num(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(6);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
