import * as echarts from 'echarts/core';
import { GaugeChart, PieChart, LineChart, BarChart } from 'echarts/charts';
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphicComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  GaugeChart,
  PieChart,
  LineChart,
  BarChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphicComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

export { echarts };

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const AXIS_LABEL_FONT = { fontFamily: 'inherit', fontSize: 10.5 };

// ---------------- GAUGE ----------------
// Two overlaid gauge series: one draws the colored band + auto-colored needle,
// the other only draws a thin fixed tick at the target value.
export function buildGaugeOption({ value, min, max, target, bands, display, textPrimary }) {
  const bandStops = bands.map((b) => [(b.to - min) / (max - min), b.color]);
  const series = [
    {
      type: 'gauge',
      min,
      max,
      startAngle: 210,
      endAngle: -30,
      radius: '92%',
      center: ['50%', '58%'],
      axisLine: { lineStyle: { width: 18, color: bandStops } },
      pointer: {
        icon: 'path://M2,0 L-2,0 L0,-68 Z',
        length: '56%',
        width: 6,
        itemStyle: { color: 'auto' },
      },
      progress: { show: false },
      anchor: { show: true, size: 11, itemStyle: { color: 'auto', borderWidth: 0 } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { show: false },
      detail: {
        valueAnimation: true,
        formatter: () => display,
        color: 'auto',
        fontSize: 32,
        fontWeight: 700,
        offsetCenter: [0, '38%'],
      },
      data: [{ value }],
    },
  ];
  if (target !== undefined && target !== null) {
    series.push({
      type: 'gauge',
      min,
      max,
      startAngle: 210,
      endAngle: -30,
      radius: '92%',
      center: ['50%', '58%'],
      pointer: { icon: 'rect', width: 3, length: '9%', offsetCenter: [0, '-64%'], itemStyle: { color: textPrimary } },
      anchor: { show: false },
      axisLine: { show: false },
      splitLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      detail: { show: false },
      title: { show: false },
      data: [{ value: target }],
    });
  }
  return { series, animationDuration: 600 };
}

// ---------------- DONUT ----------------
export function buildDonutOption({ slices, centerValue, centerLabel, formatVal, textPrimary, textMuted, surfaceCard, fmtNum }) {
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.marker}${p.name}: <b>${formatVal ? formatVal(p.value) : fmtNum(p.value, 0)}</b> · ${p.percent}%`,
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      left: 'center',
      icon: 'circle',
      itemWidth: 9,
      itemHeight: 9,
      textStyle: { color: textMuted, fontSize: 11 },
      pageIconSize: 10,
      pageTextStyle: { color: textMuted },
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '70%'],
        center: ['50%', '38%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: surfaceCard, borderWidth: 2, borderRadius: 6 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 700, formatter: '{b}\n{d}%' } },
        data: slices.map((s) => ({ name: s.label, value: s.value, itemStyle: { color: s.color } })),
      },
    ],
    graphic: [
      { type: 'text', left: 'center', top: '33%', style: { text: centerValue, fontSize: 21, fontWeight: 700, fill: textPrimary } },
      { type: 'text', left: 'center', top: '42.5%', style: { text: centerLabel, fontSize: 10.5, fill: textMuted } },
    ],
  };
}

// ---------------- LINE ----------------
export function buildLineOption({ points, color, yMin, yMax, formatY, seriesName, target, textMuted, gridline }) {
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => (formatY ? formatY(v) : v),
    },
    grid: { left: 54, right: target != null ? 46 : 20, top: 20, bottom: 34, containLabel: true },
    xAxis: {
      type: 'category',
      data: points.map((p) => p.label),
      axisLine: { lineStyle: { color: gridline } },
      axisTick: { show: false },
      axisLabel: { color: textMuted, ...AXIS_LABEL_FONT },
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      splitLine: { lineStyle: { color: gridline } },
      axisLabel: { color: textMuted, ...AXIS_LABEL_FONT, formatter: (v) => (formatY ? formatY(v) : v) },
    },
    series: [
      {
        name: seriesName,
        type: 'line',
        data: points.map((p) => p.y),
        smooth: 0.2,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 2.5, color },
        itemStyle: { color, borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexToRgba(color, 0.28) },
              { offset: 1, color: hexToRgba(color, 0) },
            ],
          },
        },
        markLine:
          target !== undefined && target !== null
            ? {
                symbol: 'none',
                silent: true,
                lineStyle: { type: 'dashed', color: textMuted, width: 1.2 },
                label: { formatter: 'Meta', color: textMuted, fontSize: 10 },
                data: [{ yAxis: target }],
              }
            : undefined,
      },
    ],
  };
}

// ---------------- BARS (grouped / stacked / horizontal) ----------------
export function buildBarsOption({ categories, series, horizontal, stacked, formatY, textMuted, textSecondary, gridline }) {
  const avgLabelLen = categories.reduce((a, c) => a + String(c).length, 0) / categories.length;
  const rotateLabels = !horizontal && avgLabelLen > 12;

  const categoryAxis = {
    type: 'category',
    data: categories,
    axisLine: { lineStyle: { color: gridline } },
    axisTick: { show: false },
    inverse: horizontal,
    axisLabel: horizontal
      ? { color: textSecondary, fontSize: 10.5, overflow: 'truncate', width: 175 }
      : {
          color: textMuted,
          fontSize: 10,
          // 'auto' lets ECharts skip labels to avoid overlap on narrow
          // viewports; forcing interval:0 (show all) was crowding 24 month
          // labels together with an 8-item legend on mobile widths.
          interval: 'auto',
          rotate: rotateLabels ? 38 : 0,
          overflow: rotateLabels ? 'truncate' : undefined,
          width: rotateLabels ? 92 : undefined,
        },
  };
  const valueAxis = {
    type: 'value',
    axisLine: { show: false },
    splitNumber: horizontal ? 3 : 4,
    axisLabel: { color: textMuted, ...AXIS_LABEL_FONT, formatter: (v) => (formatY ? formatY(v) : v) },
    splitLine: { lineStyle: { color: gridline } },
  };

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => (formatY ? formatY(v) : v),
    },
    legend:
      series.length > 1
        ? {
            type: 'scroll',
            bottom: 0,
            icon: 'circle',
            itemWidth: 9,
            itemHeight: 9,
            textStyle: { color: textMuted, fontSize: 11 },
            pageIconSize: 10,
            pageTextStyle: { color: textMuted },
          }
        : undefined,
    grid: {
      left: horizontal ? 190 : 54,
      right: horizontal ? 46 : 16,
      top: 14,
      bottom: series.length > 1 ? 46 : rotateLabels ? 92 : 30,
      // containLabel would ADD its own auto label-space on top of the fixed
      // left/right we already reserve for the (long, truncated) horizontal
      // category labels, shrinking the plot area to ~0 — only use it for the
      // vertical case, where left/right are just small fixed paddings.
      containLabel: !horizontal,
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: series.map((s) => ({
      name: s.name,
      type: 'bar',
      stack: stacked ? 'total' : undefined,
      data: s.values,
      itemStyle: { color: s.color, borderRadius: horizontal ? [0, 4, 4, 0] : stacked ? 0 : [4, 4, 0, 0] },
      barMaxWidth: horizontal ? 22 : 28,
      label:
        series.length === 1 && horizontal
          ? { show: true, position: 'right', color: textSecondary, fontSize: 10.5, formatter: (p) => (formatY ? formatY(p.value) : p.value) }
          : undefined,
    })),
  };
}
