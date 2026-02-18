function makeChart(canvasId, title) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) throw new Error(`No existe canvas #${canvasId}`);

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: `${title} - X`, data: [], tension: 0.15, pointRadius: 0 },
        { label: `${title} - Y`, data: [], tension: 0.15, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { maxTicksLimit: 10 } },
        y: { ticks: { maxTicksLimit: 6 } }
      },
      plugins: {
        legend: { display: true }
      }
    }
  });
}

export function createCharts() {
  return {
    A: makeChart("chartA", "A"),
    B: makeChart("chartB", "B"),
    C: makeChart("chartC", "C"),
  };
}

export function pushPoint(chart, label, x, y, maxPoints) {
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(x);
  chart.data.datasets[1].data.push(y);

  while (chart.data.labels.length > maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
    chart.data.datasets[1].data.shift();
  }
}

export function redraw(chart) {
  chart.update("none");
}
