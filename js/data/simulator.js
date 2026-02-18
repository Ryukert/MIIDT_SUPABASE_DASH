let timer = null;
let t0 = Date.now();

export function startSimulator({ onSample, hz = 20 } = {}) {
  stopSimulator();
  const period = Math.max(10, Math.floor(1000 / hz));

  timer = setInterval(() => {
    const t = Date.now();
    const dt = (t - t0) / 1000;

    // 3 sensores falsos
    const samples = [
      mk("A", dt, 1.0),
      mk("B", dt, 0.7),
      mk("C", dt, 0.4),
    ];

    for (const s of samples) onSample?.(s);
  }, period);
}

export function stopSimulator() {
  if (timer) clearInterval(timer);
  timer = null;
}

function mk(sensor, dt, amp){
  const x = amp * Math.sin(dt * 2.0) + (Math.random() - 0.5) * 0.05;
  const y = amp * Math.cos(dt * 1.6) + (Math.random() - 0.5) * 0.05;
  return { ts: new Date().toISOString(), sensor_type: sensor, x_value: x, y_value: y };
}
