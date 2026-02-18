let timer = null;
let t0 = 0;

export function startSimulator({ onSample, periodMs = 80 }) {
  stopSimulator();
  t0 = Date.now();

  timer = setInterval(() => {
    const t = (Date.now() - t0) / 1000;
    const sensor = ["A", "B", "C"][Math.floor(Math.random() * 3)];

    const x = Math.sin(t * 2.5) * 0.02 + (Math.random() - 0.5) * 0.01;
    const y = Math.cos(t * 2.2) * 0.02 + (Math.random() - 0.5) * 0.01;

    onSample?.({
      ts: new Date().toISOString(),
      sensor_type: sensor,
      x_value: x,
      y_value: y
    });
  }, periodMs);
}

export function stopSimulator() {
  if (timer) clearInterval(timer);
  timer = null;
}
