export function $id(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No existe el elemento #${id}`);
  return el;
}

export function setDot(dotEl, state) {
  dotEl.classList.remove("ok", "warn", "bad");
  dotEl.classList.add(state);
}
