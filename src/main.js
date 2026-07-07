import './style.css';
import LF_DATA from './data.json';
import { echarts, buildGaugeOption, buildDonutOption, buildLineOption, buildBarsOption } from './charts.js';

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function PAL() {
  return {
    s: [cssVar('--s1'), cssVar('--s2'), cssVar('--s3'), cssVar('--s4'), cssVar('--s5'), cssVar('--s6'), cssVar('--s7'), cssVar('--s8')],
    good: cssVar('--good'),
    warning: cssVar('--warning'),
    serious: cssVar('--serious'),
    critical: cssVar('--critical'),
    grid: cssVar('--gridline'),
    textPrimary: cssVar('--text-primary'),
    textSecondary: cssVar('--text-secondary'),
    textMuted: cssVar('--text-muted'),
    surface: cssVar('--surface-card'),
  };
}
function fmtNum(n, d = 0) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtMoney(n) {
  if (Math.abs(n) >= 1000000) return '$ ' + fmtNum(n / 1000000, 1) + 'M';
  if (Math.abs(n) >= 1000) return '$ ' + fmtNum(n / 1000, 0) + 'K';
  return '$ ' + fmtNum(n, 0);
}
function bandStatus(value, bands) {
  for (const b of bands) {
    if (value >= Math.min(b.from, b.to) && value <= Math.max(b.from, b.to)) return b;
  }
  return bands[bands.length - 1];
}

// ---------------- chart instance registry (lazy init per tab) ----------------
const chartInstances = new Map();
const chartBuilders = new Map();

function registerChart(containerId, buildFn) {
  chartBuilders.set(containerId, buildFn);
}
function ensureChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let inst = chartInstances.get(containerId);
  if (!inst) {
    inst = echarts.init(el);
    chartInstances.set(containerId, inst);
    new ResizeObserver(() => inst.resize()).observe(el);
  }
  const builder = chartBuilders.get(containerId);
  if (builder) inst.setOption(builder(), true);
  inst.resize();
}
function activatePanel(tabKey) {
  const panel = document.getElementById('panel-' + tabKey);
  if (!panel) return;
  requestAnimationFrame(() => {
    panel.querySelectorAll('.lf-chart-slot[id]').forEach((slot) => ensureChart(slot.id));
  });
}
function refreshAllInitialized() {
  chartInstances.forEach((inst, id) => {
    const builder = chartBuilders.get(id);
    if (builder) inst.setOption(builder(), true);
  });
}

function renderBadge(containerId, band) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  const badge = document.createElement('span');
  badge.className = 'lf-kpi-badge ' + band.cls;
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = band.color;
  const label = document.createElement('span');
  label.textContent = band.label;
  badge.appendChild(dot);
  badge.appendChild(label);
  el.appendChild(badge);
}

// ---------------- register the 18 charts (build functions re-read PAL() live) ----------------
function registerAllCharts() {
  const D = LF_DATA;

  // ---- FINANCIERA ----
  (function () {
    const v = D.financiera.tasa_costo_admin_sobre_ingresos;
    const bandsDef = () => {
      const pal = PAL();
      return [
        { from: 0, to: 15, color: pal.good, label: 'Óptimo', cls: 'good' },
        { from: 15, to: 20, color: pal.warning, label: 'Aceptable', cls: 'warning' },
        { from: 20, to: 100, color: pal.critical, label: 'Deficiente', cls: 'critical' },
      ];
    };
    renderBadge('badge-financiera', bandStatus(v, bandsDef()));

    registerChart('gauge-financiera', () => {
      const pal = PAL();
      return buildGaugeOption({ value: v, min: 0, max: 100, target: 15, bands: bandsDef(), display: fmtNum(v, 2) + '%', textPrimary: pal.textPrimary });
    });
    registerChart('donut-costos', () => {
      const pal = PAL();
      return buildDonutOption({
        slices: D.financiera.costo_por_categoria.map((r, i) => ({ label: r.categoria, value: r.monto, color: pal.s[i] })),
        centerValue: fmtMoney(D.financiera.costo_por_categoria.reduce((a, r) => a + r.monto, 0)),
        centerLabel: 'costo total',
        formatVal: fmtMoney,
        textPrimary: pal.textPrimary,
        textMuted: pal.textMuted,
        surfaceCard: pal.surface,
        fmtNum,
      });
    });
    registerChart('line-costos', () => {
      const pal = PAL();
      return buildLineOption({
        points: D.financiera.costo_evolucion.map((r) => ({ label: r.label, y: r.total })),
        color: pal.s[0],
        formatY: fmtMoney,
        seriesName: 'Costo administrativo',
        textMuted: pal.textMuted,
        gridline: pal.grid,
      });
    });
    registerChart('bar-costos-concepto', () => {
      const pal = PAL();
      return buildBarsOption({
        categories: D.financiera.costo_por_mes_concepto.map((r) => r.label),
        series: D.financiera.top_concepts.map((name, i) => ({
          name,
          color: pal.s[i],
          values: D.financiera.costo_por_mes_concepto.map((r) => r[name] || 0),
        })),
        stacked: true,
        formatY: fmtMoney,
        textMuted: pal.textMuted,
        textSecondary: pal.textSecondary,
        gridline: pal.grid,
      });
    });
  })();

  // ---- CLIENTES ----
  (function () {
    const v = D.clientes.tasa_satisfaccion_familiar;
    const bandsDef = () => {
      const pal = PAL();
      return [
        { from: 0, to: 70, color: pal.critical, label: 'Deficiente', cls: 'critical' },
        { from: 70, to: 85, color: pal.warning, label: 'Aceptable', cls: 'warning' },
        { from: 85, to: 100, color: pal.good, label: 'Óptimo', cls: 'good' },
      ];
    };
    renderBadge('badge-clientes', bandStatus(v, bandsDef()));

    registerChart('gauge-clientes', () => {
      const pal = PAL();
      return buildGaugeOption({ value: v, min: 0, max: 100, target: 85, bands: bandsDef(), display: fmtNum(v, 2) + '%', textPrimary: pal.textPrimary });
    });
    registerChart('bar-encuestas', () => {
      const pal = PAL();
      return buildBarsOption({
        categories: D.clientes.rating_distribution.map((r) => String(r.rating)),
        series: [{ name: 'Encuestas', color: pal.s[2], values: D.clientes.rating_distribution.map((r) => r.cantidad) }],
        stacked: false,
        textMuted: pal.textMuted,
        textSecondary: pal.textSecondary,
        gridline: pal.grid,
      });
    });
    registerChart('line-satisfaccion', () => {
      const pal = PAL();
      return buildLineOption({
        points: D.clientes.satisfaccion_evolucion.map((r) => ({ label: r.label, y: r.promedio })),
        color: pal.s[4],
        yMin: 1,
        yMax: 5,
        formatY: (v) => fmtNum(v, 1),
        seriesName: 'Satisfacción promedio',
        textMuted: pal.textMuted,
        gridline: pal.grid,
      });
    });
    registerChart('bar-solicitudes-anio', () => {
      const pal = PAL();
      const years = D.clientes.solicitudes_por_anio_motivo;
      return buildBarsOption({
        categories: D.clientes.motivos_sorted,
        series: years.map((y, i) => ({ name: String(y.anio), color: pal.s[i], values: D.clientes.motivos_sorted.map((m) => y[m] || 0) })),
        stacked: false,
        textMuted: pal.textMuted,
        textSecondary: pal.textSecondary,
        gridline: pal.grid,
      });
    });
  })();

  // ---- PROCESOS ----
  (function () {
    const v = D.procesos.sla_promedio;
    const bandsDef = () => {
      const pal = PAL();
      return [
        { from: 0, to: 24, color: pal.good, label: 'Óptimo', cls: 'good' },
        { from: 24, to: 48, color: pal.warning, label: 'Aceptable', cls: 'warning' },
        { from: 48, to: 60, color: pal.critical, label: 'Deficiente', cls: 'critical' },
      ];
    };
    renderBadge('badge-procesos', bandStatus(v, bandsDef()));

    registerChart('gauge-procesos', () => {
      const pal = PAL();
      return buildGaugeOption({ value: v, min: 0, max: 60, target: 24, bands: bandsDef(), display: fmtNum(v, 1) + ' hs', textPrimary: pal.textPrimary });
    });
    registerChart('donut-estado', () => {
      const pal = PAL();
      const estadoColor = { Resuelto: pal.good, 'En Proceso': pal.warning, Abierto: pal.serious };
      return buildDonutOption({
        slices: D.procesos.estado_solicitudes.map((r) => ({ label: r.estado, value: r.cantidad, color: estadoColor[r.estado] || pal.s[0] })),
        centerValue: fmtNum(D.procesos.estado_solicitudes.reduce((a, r) => a + r.cantidad, 0), 0),
        centerLabel: 'solicitudes',
        textPrimary: pal.textPrimary,
        textMuted: pal.textMuted,
        surfaceCard: pal.surface,
        fmtNum,
      });
    });
    // FIX: total hours (Sum), not average — matches the .pbix's Sum(Horas_Resolucion)
    registerChart('bar-horas-motivo', () => {
      const pal = PAL();
      return buildBarsOption({
        categories: D.procesos.horas_resolucion_por_motivo.map((r) => r.motivo),
        series: [{ name: 'Horas totales', color: pal.s[3], values: D.procesos.horas_resolucion_por_motivo.map((r) => r.horas_totales) }],
        horizontal: true,
        formatY: (v) => fmtNum(v, 0) + 'h',
        textMuted: pal.textMuted,
        textSecondary: pal.textSecondary,
        gridline: pal.grid,
      });
    });
    // FIX: resolved-only count, not all requests — matches the .pbix's CountNonNull(fecha_resolucion)
    registerChart('bar-cantidad-motivo', () => {
      const pal = PAL();
      return buildBarsOption({
        categories: D.procesos.horas_resolucion_por_motivo.map((r) => r.motivo),
        series: [{ name: 'Resueltas', color: pal.s[2], values: D.procesos.horas_resolucion_por_motivo.map((r) => r.resueltas) }],
        horizontal: true,
        textMuted: pal.textMuted,
        textSecondary: pal.textSecondary,
        gridline: pal.grid,
      });
    });
    registerChart('bar-registros-sistema', () => {
      const pal = PAL();
      return buildBarsOption({
        categories: D.procesos.registros_por_trimestre.map((r) => r.label),
        series: D.procesos.sistemas_set.map((sys, i) => ({
          name: sys,
          color: pal.s[i],
          values: D.procesos.registros_por_trimestre.map((r) => r[sys] || 0),
        })),
        stacked: false,
        textMuted: pal.textMuted,
        textSecondary: pal.textSecondary,
        gridline: pal.grid,
      });
    });
  })();

  // ---- APRENDIZAJE ----
  (function () {
    const v = D.aprendizaje.promedio_anual_por_empleado;
    const bandsDef = () => {
      const pal = PAL();
      return [
        { from: 0, to: 3, color: pal.critical, label: 'Deficiente', cls: 'critical' },
        { from: 3, to: 6, color: pal.warning, label: 'Aceptable', cls: 'warning' },
        { from: 6, to: 10, color: pal.good, label: 'Óptimo', cls: 'good' },
      ];
    };
    renderBadge('badge-aprendizaje', bandStatus(v, bandsDef()));

    registerChart('gauge-aprendizaje', () => {
      const pal = PAL();
      return buildGaugeOption({ value: v, min: 0, max: 10, target: 6, bands: bandsDef(), display: fmtNum(v, 2) + ' hs', textPrimary: pal.textPrimary });
    });
    registerChart('donut-temas', () => {
      const pal = PAL();
      return buildDonutOption({
        slices: D.aprendizaje.horas_capacitacion_por_tema.map((r, i) => ({ label: r.tema, value: r.horas, color: pal.s[i] })),
        centerValue: fmtNum(D.aprendizaje.horas_capacitacion_por_tema.reduce((a, r) => a + r.horas, 0), 0) + 'h',
        centerLabel: 'horas totales',
        formatVal: (v) => fmtNum(v, 0) + 'h',
        textPrimary: pal.textPrimary,
        textMuted: pal.textMuted,
        surfaceCard: pal.surface,
        fmtNum,
      });
    });
    registerChart('line-capacitacion', () => {
      const pal = PAL();
      const targetMensual = (6 * D.aprendizaje.total_empleados) / 12;
      return buildLineOption({
        points: D.aprendizaje.horas_capacitacion_evolucion.map((r) => ({ label: r.label, y: r.horas })),
        color: pal.s[1],
        formatY: (v) => fmtNum(v, 0) + 'h',
        seriesName: 'Horas de capacitación',
        target: targetMensual,
        textMuted: pal.textMuted,
        gridline: pal.grid,
      });
    });
    registerChart('bar-rol-tema', () => {
      const pal = PAL();
      return buildBarsOption({
        categories: D.aprendizaje.roles_sorted,
        series: D.aprendizaje.temas_sorted.map((name, i) => ({
          name,
          color: pal.s[i],
          values: D.aprendizaje.roles_sorted.map((rol) => (D.aprendizaje.horas_por_rol.find((r) => r.rol === rol) || {})[name] || 0),
        })),
        stacked: true,
        formatY: (v) => fmtNum(v, 0) + 'h',
        textMuted: pal.textMuted,
        textSecondary: pal.textSecondary,
        gridline: pal.grid,
      });
    });
  })();
}

// ---------------- tabs ----------------
const tabs = document.querySelectorAll('.lf-nav-item');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    document.querySelectorAll('.lf-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    activatePanel(tab.dataset.tab);
  });
});

// ---------------- theme ----------------
const THEME_KEY = 'lf-theme';
function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (e) {
    return null;
  }
}
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    /* ignore */
  }
  refreshAllInitialized();
}
function currentEffectiveTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
const stored = getStoredTheme();
if (stored) document.documentElement.setAttribute('data-theme', stored);

document.getElementById('lf-theme-toggle').addEventListener('click', () => {
  setTheme(currentEffectiveTheme() === 'dark' ? 'light' : 'dark');
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!getStoredTheme()) refreshAllInitialized();
});

// ---------------- init ----------------
registerAllCharts();
activatePanel('financiera');
