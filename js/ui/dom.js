export function $id(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento no encontrado: #${id}`);
  return el;
}

export function setDot(dotEl, mode) {
  dotEl.classList.remove("ok", "warn", "bad");
  dotEl.classList.add(mode);
}

export function nowLabel() {
  return new Date().toLocaleTimeString("es-MX", { hour12: false });
}
