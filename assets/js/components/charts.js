import { formatPrice, formatNumber } from '../core/utils.js';

const PALETTE = ['#2563eb', '#4f46e5', '#0ea5e9', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#64748b'];

function base() {
  if (!window.Chart) return false;
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = '#64748b';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  return true;
}

export function lineChart(canvas, { labels, datasets, money = true }) {
  if (!base()) return null;
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d, i) => {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 280);
        grad.addColorStop(0, i === 0 ? 'rgba(37,99,235,.25)' : 'rgba(79,70,229,.12)');
        grad.addColorStop(1, 'rgba(37,99,235,0)');
        return { tension: 0.35, fill: true, backgroundColor: grad, borderColor: PALETTE[i], borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, ...d };
      }),
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: datasets.length > 1 }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${money ? formatPrice(c.parsed.y) : c.parsed.y}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        y: { grid: { color: '#eef2f7' }, border: { display: false }, ticks: { callback: (v) => (money ? '৳' : '') + formatNumber(v) } },
      },
    },
  });
}

export function barChart(canvas, { labels, data, label = 'Value', money = true, horizontal = false }) {
  if (!base()) return null;
  return new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: PALETTE[0], borderRadius: 6, maxBarThickness: 36 }] },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => (money ? formatPrice(c.parsed[horizontal ? 'x' : 'y']) : c.formattedValue) } } },
      scales: {
        x: { grid: { display: horizontal }, ticks: horizontal ? { callback: (v) => (money ? '৳' : '') + formatNumber(v) } : {} },
        y: { grid: { display: !horizontal, color: '#eef2f7' }, border: { display: false }, ticks: horizontal ? {} : { callback: (v) => (money ? '৳' : '') + formatNumber(v) } },
      },
    },
  });
}

export function doughnutChart(canvas, { labels, data, money = true }) {
  if (!base()) return null;
  return new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.label}: ${money ? formatPrice(c.parsed) : c.parsed}` } } },
    },
  });
}
