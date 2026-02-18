function makeChart(canvasId, label) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: `${label} X`, data: [], borderWidth: 2, pointRadius: 0, tension: 0.15 },
        { label: `${label} Y`, data: [], borderWidth: 2, pointRadius: 0, tension: 0.15 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 6 } },
        y: { ticks: { maxTicksLimit: 6 } },
      },
    },
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
