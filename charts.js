function makeChart(canvasId, title) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) throw new Error(`No existe canvas #${canvasId}`);

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: `${title} - X`, data: [], tension: 0.15, pointRadius: 0 },
        { label: `${title} - Y`, data: [], tension: 0.15, pointRadius: 0 },
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
      plugins: { legend: { display: true } }
    }
  });
}

export function createChartsByDevice() {
  return {
    PC: {
      A: makeChart("chartPC_A", "PC • MPU9250_1"),
      B: makeChart("chartPC_B", "PC • MPU9250_2"),
      C: makeChart("chartPC_C", "PC • LSM6DSOX"),
    },
    RPI: {
      A: makeChart("chartRPI_A", "RPI • MPU9250_1"),
      B: makeChart("chartRPI_B", "RPI • MPU9250_2"),
      C: makeChart("chartRPI_C", "RPI • LSM6DSOX"),
    }
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
