import './style.css';
import LF_DATA from './data.json';

const root = document.getElementById('lf-root');
const CSS = getComputedStyle(root);
function cssVar(name){ return CSS.getPropertyValue(name).trim(); }
const PAL = () => ({
  s: [cssVar('--s1'),cssVar('--s2'),cssVar('--s3'),cssVar('--s4'),cssVar('--s5'),cssVar('--s6'),cssVar('--s7'),cssVar('--s8')],
  good: cssVar('--good'), warning: cssVar('--warning'), serious: cssVar('--serious'), critical: cssVar('--critical'),
  grid: cssVar('--gridline'), baseline: cssVar('--baseline'), textPrimary: cssVar('--text-primary'),
  textSecondary: cssVar('--text-secondary'), textMuted: cssVar('--text-muted'), surface: cssVar('--surface-card'),
  seq100: cssVar('--seq-100'), seq400: cssVar('--seq-400')
});

const SVGNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent){
  const e = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function svgRoot(w, h){
  const s = el('svg', { viewBox: `0 0 ${w} ${h}`, width:'100%', role:'img' });
  return s;
}
function fmtNum(n, d){
  d = d === undefined ? 0 : d;
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtMoney(n){
  if (Math.abs(n) >= 1000000) return '$ ' + fmtNum(n/1000000, 1) + 'M';
  if (Math.abs(n) >= 1000) return '$ ' + fmtNum(n/1000, 0) + 'K';
  return '$ ' + fmtNum(n, 0);
}

// ---------- tooltip ----------
const ttEl = document.getElementById('lf-tooltip');
function ttShow(x, y, html){
  ttEl.innerHTML = '';
  html.forEach(part => ttEl.appendChild(part));
  ttEl.classList.add('show');
  const pad = 14;
  let left = x + pad, top = y + pad;
  const rect = ttEl.getBoundingClientRect();
  if (left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
  if (top + rect.height > window.innerHeight - 8) top = y - rect.height - pad;
  ttEl.style.transform = `translate(${left}px, ${top}px)`;
}
function ttHide(){ ttEl.classList.remove('show'); }
function ttTitle(text){ const d = document.createElement('div'); d.className='tt-title'; d.textContent = text; return d; }
function ttRow(color, label, value){
  const row = document.createElement('div'); row.className = 'tt-row';
  const key = document.createElement('span'); key.className='tt-key'; key.style.background = color;
  const lab = document.createElement('span'); lab.textContent = label;
  const val = document.createElement('span'); val.className='tt-val'; val.textContent = value;
  row.appendChild(key); row.appendChild(lab); row.appendChild(val);
  return row;
}

function legend(container, items){
  const wrap = document.createElement('div');
  wrap.className = 'lf-legend';
  items.forEach(it => {
    const li = document.createElement('div'); li.className = 'lf-legend-item';
    const sw = document.createElement('span');
    sw.className = it.line ? 'lf-legend-line' : 'lf-legend-swatch';
    sw.style.background = it.color;
    const txt = document.createElement('span'); txt.textContent = it.label;
    li.appendChild(sw); li.appendChild(txt);
    wrap.appendChild(li);
  });
  container.appendChild(wrap);
}

// ---------- GAUGE ----------
function renderGauge(containerId, opts){
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  const pal = PAL();
  const W = 320, H = 200, cx = W/2, cy = 168, r = 118, thick = 26;
  const svg = svgRoot(W, H);
  const min = opts.min, max = opts.max, value = opts.value;
  function angleFor(v){
    const f = Math.max(0, Math.min(1, (v - min) / (max - min)));
    return 180 - 180 * f;
  }
  function pt(angleDeg, radius){
    const rad = angleDeg * Math.PI / 180;
    return [cx + radius * Math.cos(rad), cy - radius * Math.sin(rad)];
  }
  function arcPath(a0, a1, radius){
    // polyline approximation: the 'A' command's large-arc/sweep flags are
    // ambiguous for spans at or near 180°, which can flip the arc to the
    // wrong side — stepping the angle avoids that entirely.
    const steps = Math.max(2, Math.ceil(Math.abs(a0 - a1) / 4));
    let d = '';
    for (let i = 0; i <= steps; i++){
      const a = a0 + (a1 - a0) * (i / steps);
      const [x, y] = pt(a, radius);
      d += (i === 0 ? 'M ' : 'L ') + x + ' ' + y + ' ';
    }
    return d.trim();
  }
  // base track (full range, muted) + a single value arc colored by current status —
  // a "meter": fill carries severity, unfilled track is a lighter neutral (marks-and-anatomy.md)
  el('path', { d: arcPath(180, 0, r), stroke: pal.grid, 'stroke-width': thick, fill:'none', 'stroke-linecap':'butt' }, svg);
  const va = angleFor(value);
  if (Math.abs(180 - va) > 0.5){
    el('path', { d: arcPath(180, va, r), stroke: opts.statusColor, 'stroke-width': thick, fill:'none', 'stroke-linecap':'butt' }, svg);
  }
  // threshold ticks (band boundaries, excluding the outer min/max edges)
  const boundaries = new Set();
  opts.bands.forEach(b => { boundaries.add(b.from); boundaries.add(b.to); });
  boundaries.forEach(bv => {
    if (bv <= min || bv >= max) return;
    const ba = angleFor(bv);
    const [bx0,by0] = pt(ba, r - thick/2);
    const [bx1,by1] = pt(ba, r + thick/2);
    el('line', { x1:bx0, y1:by0, x2:bx1, y2:by1, stroke: pal.surface, 'stroke-width':2 }, svg);
  });
  // target tick
  if (opts.target !== undefined && opts.target !== null){
    const ta = angleFor(opts.target);
    const [tx0,ty0] = pt(ta, r - thick/2 - 6);
    const [tx1,ty1] = pt(ta, r + thick/2 + 6);
    el('line', { x1:tx0, y1:ty0, x2:tx1, y2:ty1, stroke: pal.textPrimary, 'stroke-width':2.5 }, svg);
  }
  // needle
  const na = angleFor(value);
  const [nx,ny] = pt(na, r - thick/2 - 10);
  el('line', { x1:cx, y1:cy, x2:nx, y2:ny, stroke: pal.textPrimary, 'stroke-width':3, 'stroke-linecap':'round' }, svg);
  el('circle', { cx, cy, r:7, fill: pal.textPrimary }, svg);

  const valueText = el('text', { x:cx, y: cy - r/2 - 4, 'text-anchor':'middle', 'font-size':30, 'font-weight':700, fill: opts.statusColor }, svg);
  valueText.textContent = opts.display;
  const subText = el('text', { x:cx, y: cy - r/2 + 20, 'text-anchor':'middle', 'font-size':11.5, fill: pal.textSecondary }, svg);
  subText.textContent = opts.unitLabel || '';

  c.appendChild(svg);

  const badge = document.createElement('div');
  badge.style.textAlign = 'center';
  const b = document.createElement('span');
  b.className = 'lf-kpi-badge ' + opts.statusClass;
  const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = opts.statusColor;
  const lab = document.createElement('span'); lab.textContent = opts.statusLabel;
  b.appendChild(dot); b.appendChild(lab);
  badge.appendChild(b);
  c.appendChild(badge);
}

function bandStatus(value, bands){
  for (const b of bands){
    if (value >= Math.min(b.from,b.to) && value <= Math.max(b.from,b.to)) return b;
  }
  return bands[bands.length-1];
}

// ---------- LINE CHART ----------
function renderLine(containerId, opts){
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  const pal = PAL();
  const W = 760, H = 260, padL = 44, padR = 16, padT = 16, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const svg = svgRoot(W, H);
  const pts = opts.points;
  const yMin = opts.yMin !== undefined ? opts.yMin : Math.min(...pts.map(p=>p.y));
  const yMax = opts.yMax !== undefined ? opts.yMax : Math.max(...pts.map(p=>p.y));
  const yPad = (yMax - yMin) * 0.12 || 1;
  const y0 = yMin - yPad, y1 = yMax + yPad;
  function X(i){ return padL + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * plotW); }
  function Y(v){ return padT + plotH - ((v - y0) / (y1 - y0)) * plotH; }

  // gridlines
  const ticks = 4;
  for (let i=0;i<=ticks;i++){
    const v = y0 + (i/ticks)*(y1-y0);
    const gy = Y(v);
    el('line', { x1:padL, x2:W-padR, y1:gy, y2:gy, stroke: pal.grid, 'stroke-width':1 }, svg);
    const t = el('text', { x: padL - 8, y: gy+4, 'text-anchor':'end', 'font-size':10.5, fill: pal.textMuted }, svg);
    t.textContent = opts.formatY ? opts.formatY(v) : fmtNum(v,1);
  }
  // x labels (sparse)
  const step = Math.ceil(pts.length / 8);
  pts.forEach((p,i) => {
    if (i % step === 0 || i === pts.length-1){
      const t = el('text', { x:X(i), y:H-8, 'text-anchor':'middle', 'font-size':10, fill: pal.textMuted }, svg);
      t.textContent = p.label;
    }
  });

  const path = pts.map((p,i) => (i===0?'M':'L') + X(i) + ' ' + Y(p.y)).join(' ');
  el('path', { d: path, fill:'none', stroke: opts.color || pal.s[0], 'stroke-width':2, 'stroke-linejoin':'round', 'stroke-linecap':'round' }, svg);

  // target line
  if (opts.target !== undefined){
    const gy = Y(opts.target);
    el('line', { x1:padL, x2:W-padR, y1:gy, y2:gy, stroke: pal.textMuted, 'stroke-width':1.2, 'stroke-dasharray':'4 4' }, svg);
  }

  // crosshair group
  const crosshair = el('line', { x1:0,y1:padT,x2:0,y2:H-padB, stroke: pal.baseline, 'stroke-width':1, opacity:0 }, svg);
  const dot = el('circle', { r:5, fill: opts.color || pal.s[0], stroke: pal.surface, 'stroke-width':2, opacity:0 }, svg);
  const hitW = plotW / Math.max(1,(pts.length-1));

  pts.forEach((p,i) => {
    const hit = el('rect', { x: X(i) - hitW/2, y: padT, width: Math.max(hitW,10), height: plotH, fill:'transparent', class:'lf-hit' }, svg);
    hit.addEventListener('pointermove', (ev) => {
      crosshair.setAttribute('x1', X(i)); crosshair.setAttribute('x2', X(i)); crosshair.setAttribute('opacity', 1);
      dot.setAttribute('cx', X(i)); dot.setAttribute('cy', Y(p.y)); dot.setAttribute('opacity', 1);
      ttShow(ev.clientX, ev.clientY, [ ttTitle(p.label), ttRow(opts.color || pal.s[0], opts.seriesName || 'Valor', opts.formatY ? opts.formatY(p.y) : fmtNum(p.y,2)) ]);
    });
    hit.addEventListener('pointerleave', () => { crosshair.setAttribute('opacity',0); dot.setAttribute('opacity',0); ttHide(); });
  });

  c.appendChild(svg);
  if (opts.legendLabel) legend(c, [{ color: opts.color || pal.s[0], label: opts.legendLabel, line:true }]);
}

// ---------- DONUT ----------
function renderDonut(containerId, opts){
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  const pal = PAL();
  const W = 320, H = 240, cx = W/2, cy = 108, rOuter = 88, rInner = 54;
  const svg = svgRoot(W, H);
  const total = opts.slices.reduce((a,s)=>a+s.value,0);
  let angle = -90;
  const gapDeg = 2.2;
  opts.slices.forEach((s) => {
    const frac = s.value/total;
    const sweep = frac*360;
    const a0 = angle + gapDeg/2, a1 = angle + sweep - gapDeg/2;
    angle += sweep;
    if (a1 <= a0) return;
    const rad0 = a0*Math.PI/180, rad1 = a1*Math.PI/180;
    const large = (a1-a0) > 180 ? 1 : 0;
    const x0o = cx+rOuter*Math.cos(rad0), y0o = cy+rOuter*Math.sin(rad0);
    const x1o = cx+rOuter*Math.cos(rad1), y1o = cy+rOuter*Math.sin(rad1);
    const x1i = cx+rInner*Math.cos(rad1), y1i = cy+rInner*Math.sin(rad1);
    const x0i = cx+rInner*Math.cos(rad0), y0i = cy+rInner*Math.sin(rad0);
    const d = `M ${x0o} ${y0o} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${large} 0 ${x0i} ${y0i} Z`;
    const path = el('path', { d, fill: s.color, class:'lf-hit' }, svg);
    path.addEventListener('pointermove', (ev) => {
      ttShow(ev.clientX, ev.clientY, [ ttRow(s.color, s.label, (opts.formatVal ? opts.formatVal(s.value) : fmtNum(s.value,0)) + '  ·  ' + fmtNum(100*frac,1) + '%') ]);
    });
    path.addEventListener('pointerleave', ttHide);
  });
  const centerVal = el('text', { x:cx, y:cy-3, 'text-anchor':'middle', 'font-size':20, 'font-weight':700, fill: pal.textPrimary }, svg);
  centerVal.textContent = opts.centerValue !== undefined ? opts.centerValue : fmtNum(total,0);
  const centerLab = el('text', { x:cx, y:cy+16, 'text-anchor':'middle', 'font-size':10.5, fill: pal.textMuted }, svg);
  centerLab.textContent = opts.centerLabel || 'total';

  c.appendChild(svg);
  legend(c, opts.slices.map(s => ({ color: s.color, label: `${s.label} · ${fmtNum(100*s.value/total,1)}%` })));
}

// ---------- BAR CHART (grouped or stacked, vertical or horizontal) ----------
function renderBars(containerId, opts){
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  const pal = PAL();
  const cats = opts.categories;
  const series = opts.series;
  const horizontal = !!opts.horizontal;
  const stacked = !!opts.stacked;
  const W = opts.width || 760;
  const rowH = horizontal ? Math.max(26, Math.min(34, 340/cats.length)) : 0;
  const H = horizontal ? Math.max(160, cats.length * rowH + 30) : (opts.height || 300);
  const avgLabelLen = cats.reduce((a,c)=>a+String(c).length,0) / cats.length;
  const rotateLabels = !horizontal && avgLabelLen > 12;
  const padL = horizontal ? 150 : 44;
  const padR = 16, padT = 10, padB = horizontal ? 20 : (rotateLabels ? 110 : 46);
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const svg = svgRoot(W, H);

  function seriesMax(){
    if (stacked){
      return Math.max(...cats.map((_,ci) => series.reduce((a,s)=>a+(s.values[ci]||0),0)));
    }
    return Math.max(...series.flatMap(s=>s.values));
  }
  const maxV = seriesMax() * 1.12 || 1;

  if (!horizontal){
    const ticks = 4;
    for (let i=0;i<=ticks;i++){
      const v = (i/ticks)*maxV;
      const gy = padT + plotH - (v/maxV)*plotH;
      el('line', { x1:padL, x2:W-padR, y1:gy, y2:gy, stroke: pal.grid, 'stroke-width':1 }, svg);
      const t = el('text', { x:padL-8, y:gy+4, 'text-anchor':'end', 'font-size':10, fill: pal.textMuted }, svg);
      t.textContent = opts.formatY ? opts.formatY(v) : fmtNum(v,0);
    }
    const groupW = plotW / cats.length;
    const barGap = 3;
    const barW = stacked ? Math.min(30, groupW*0.55) : Math.min(16, (groupW-8)/series.length - barGap);
    cats.forEach((cat,ci) => {
      const groupX = padL + ci*groupW;
      let yCursor = padT + plotH;
      if (stacked){
        const bx = groupX + groupW/2 - barW/2;
        series.forEach((s) => {
          const v = s.values[ci]||0;
          if (v<=0) return;
          const h = (v/maxV)*plotH;
          const by = yCursor - h;
          const rect = el('rect', { x:bx, y:by, width:barW, height:Math.max(h-1.5,0), rx:3, fill:s.color, class:'lf-hit' }, svg);
          rect.addEventListener('pointermove', (ev) => ttShow(ev.clientX, ev.clientY, [ttTitle(cat), ttRow(s.color, s.name, opts.formatY?opts.formatY(v):fmtNum(v,0))]));
          rect.addEventListener('pointerleave', ttHide);
          yCursor -= h;
        });
      } else {
        const totalW = series.length*barW + (series.length-1)*barGap;
        let bx = groupX + groupW/2 - totalW/2;
        series.forEach((s) => {
          const v = s.values[ci]||0;
          const h = (v/maxV)*plotH;
          const by = padT + plotH - h;
          const rect = el('rect', { x:bx, y:by, width:barW, height:Math.max(h,0), rx:3, fill:s.color, class:'lf-hit' }, svg);
          rect.addEventListener('pointermove', (ev) => ttShow(ev.clientX, ev.clientY, [ttTitle(cat), ttRow(s.color, s.name, opts.formatY?opts.formatY(v):fmtNum(v,0))]));
          rect.addEventListener('pointerleave', ttHide);
          bx += barW + barGap;
        });
      }
      const label = String(cat).length > 34 ? String(cat).slice(0,32)+'…' : cat;
      const t = rotateLabels
        ? el('text', { x:groupX+groupW/2, y:H-padB+14, 'text-anchor':'end', 'font-size':9.5, fill: pal.textMuted, transform:`rotate(-38 ${groupX+groupW/2} ${H-padB+14})` }, svg)
        : el('text', { x:groupX+groupW/2, y:H-padB+16, 'text-anchor':'middle', 'font-size': cats.length>10?8.5:10, fill: pal.textMuted }, svg);
      t.textContent = label;
    });
  } else {
    const ticks = 3;
    for (let i=0;i<=ticks;i++){
      const v = (i/ticks)*maxV;
      const gx = padL + (v/maxV)*plotW;
      el('line', { x1:gx, x2:gx, y1:padT, y2:H-padB, stroke: pal.grid, 'stroke-width':1 }, svg);
    }
    cats.forEach((cat,ci) => {
      const rowY = padT + ci*rowH;
      const label = el('text', { x:padL-10, y:rowY+rowH/2+4, 'text-anchor':'end', 'font-size':10.5, fill: pal.textSecondary }, svg);
      label.textContent = cat.length > 26 ? cat.slice(0,24)+'…' : cat;
      const v = series[0].values[ci]||0;
      const w = (v/maxV)*plotW;
      const barH = Math.min(18, rowH*0.6);
      const rect = el('rect', { x:padL, y: rowY+rowH/2-barH/2, width:Math.max(w,1), height:barH, rx:3, fill: series[0].color, class:'lf-hit' }, svg);
      rect.addEventListener('pointermove', (ev) => ttShow(ev.clientX, ev.clientY, [ttRow(series[0].color, cat, opts.formatY?opts.formatY(v):fmtNum(v,0))]));
      rect.addEventListener('pointerleave', ttHide);
      const vt = el('text', { x:padL+w+6, y:rowY+rowH/2+4, 'font-size':10, fill: pal.textSecondary }, svg);
      vt.textContent = opts.formatY?opts.formatY(v):fmtNum(v,0);
    });
  }
  c.appendChild(svg);
  if (series.length > 1) legend(c, series.map(s=>({ color:s.color, label:s.name })));
}

// ================= build charts from LF_DATA =================
function buildAll(){
  const pal = PAL();
  const D = LF_DATA;

  // ---- FINANCIERA ----
  (function(){
    const v = D.financiera.tasa_costo_admin_sobre_ingresos;
    const bands = [ {from:0,to:15,color:pal.good}, {from:15,to:20,color:pal.warning}, {from:20,to:100,color:pal.critical} ];
    const st = bandStatus(v, [{from:0,to:15,color:pal.good,label:'Óptimo',cls:'good'},{from:15,to:20,color:pal.warning,label:'Aceptable',cls:'warning'},{from:20,to:100,color:pal.critical,label:'Deficiente',cls:'critical'}]);
    renderGauge('gauge-financiera', { value:v, min:0, max:100, target:15, bands, display: fmtNum(v,2)+'%', unitLabel:'sobre ingresos', statusColor: st.color, statusClass: st.cls, statusLabel: st.label });

    renderDonut('donut-costos', {
      slices: D.financiera.costo_por_categoria.map((r,i)=>({ label:r.categoria, value:r.monto, color: pal.s[i] })),
      centerValue: fmtMoney(D.financiera.costo_por_categoria.reduce((a,r)=>a+r.monto,0)),
      centerLabel: 'costo total',
      formatVal: fmtMoney
    });

    renderLine('line-costos', {
      points: D.financiera.costo_evolucion.map(r=>({ label:r.label, y:r.total })),
      color: pal.s[0], formatY: fmtMoney, seriesName:'Costo administrativo', legendLabel:'Costo administrativo mensual'
    });

    renderBars('bar-costos-concepto', {
      categories: D.financiera.costo_por_mes_concepto.map(r=>r.label),
      series: D.financiera.top_concepts.map((name,i)=>({ name, color: pal.s[i], values: D.financiera.costo_por_mes_concepto.map(r=>r[name]||0) })),
      stacked: true, formatY: fmtMoney, width: 900, height: 320
    });
  })();

  // ---- CLIENTES ----
  (function(){
    const v = D.clientes.tasa_satisfaccion_familiar;
    const bands = [ {from:0,to:70,color:pal.critical}, {from:70,to:85,color:pal.warning}, {from:85,to:100,color:pal.good} ];
    const st = bandStatus(v, [{from:85,to:100,color:pal.good,label:'Óptimo',cls:'good'},{from:70,to:85,color:pal.warning,label:'Aceptable',cls:'warning'},{from:0,to:70,color:pal.critical,label:'Deficiente',cls:'critical'}]);
    renderGauge('gauge-clientes', { value:v, min:0, max:100, target:85, bands, display: fmtNum(v,2)+'%', unitLabel:'familias satisfechas', statusColor: st.color, statusClass: st.cls, statusLabel: st.label });

    renderBars('bar-encuestas', {
      categories: D.clientes.rating_distribution.map(r=>String(r.rating)),
      series: [{ name:'Encuestas', color: pal.seq400, values: D.clientes.rating_distribution.map(r=>r.cantidad) }],
      stacked:false, height:220
    });

    renderLine('line-satisfaccion', {
      points: D.clientes.satisfaccion_evolucion.map(r=>({ label:r.label, y:r.promedio })),
      color: pal.s[4], yMin:1, yMax:5, formatY:v=>fmtNum(v,1), seriesName:'Satisfacción promedio', legendLabel:'Promedio mensual (escala 1–5)'
    });

    const years = D.clientes.solicitudes_por_anio_motivo;
    renderBars('bar-solicitudes-anio', {
      categories: D.clientes.motivos_sorted,
      series: years.map((y,i)=>({ name:String(y.anio), color: pal.s[i], values: D.clientes.motivos_sorted.map(m=>y[m]||0) })),
      stacked:false, width:900, height:300
    });
  })();

  // ---- PROCESOS ----
  (function(){
    const v = D.procesos.sla_promedio;
    const bands = [ {from:0,to:24,color:pal.good}, {from:24,to:48,color:pal.warning}, {from:48,to:60,color:pal.critical} ];
    const st = bandStatus(v, [{from:0,to:24,color:pal.good,label:'Óptimo',cls:'good'},{from:24,to:48,color:pal.warning,label:'Aceptable',cls:'warning'},{from:48,to:200,color:pal.critical,label:'Deficiente',cls:'critical'}]);
    renderGauge('gauge-procesos', { value:v, min:0, max:60, target:24, bands, display: fmtNum(v,1)+' hs', unitLabel:'tiempo promedio', statusColor: st.color, statusClass: st.cls, statusLabel: st.label });

    const estadoColor = { 'Resuelto': pal.good, 'En Proceso': pal.warning, 'Abierto': pal.serious };
    renderDonut('donut-estado', {
      slices: D.procesos.estado_solicitudes.map(r=>({ label:r.estado, value:r.cantidad, color: estadoColor[r.estado] || pal.s[0] })),
      centerLabel:'solicitudes'
    });

    renderBars('bar-horas-motivo', {
      categories: D.procesos.horas_resolucion_por_motivo.map(r=>r.motivo),
      series: [{ name:'Horas promedio', color: pal.s[3], values: D.procesos.horas_resolucion_por_motivo.map(r=>r.horas_promedio) }],
      horizontal:true, formatY:v=>fmtNum(v,1)+'h'
    });

    renderBars('bar-cantidad-motivo', {
      categories: D.procesos.solicitudes_por_motivo.map(r=>r.motivo),
      series: [{ name:'Solicitudes', color: pal.s[2], values: D.procesos.solicitudes_por_motivo.map(r=>r.cantidad) }],
      horizontal:true
    });

    renderBars('bar-registros-sistema', {
      categories: D.procesos.registros_por_trimestre.map(r=>r.label),
      series: D.procesos.sistemas_set.map((sys,i)=>({ name:sys, color: pal.s[i], values: D.procesos.registros_por_trimestre.map(r=>r[sys]||0) })),
      stacked:false, width:900, height:280
    });
  })();

  // ---- APRENDIZAJE ----
  (function(){
    const v = D.aprendizaje.promedio_anual_por_empleado;
    const bands = [ {from:0,to:3,color:pal.critical}, {from:3,to:6,color:pal.warning}, {from:6,to:10,color:pal.good} ];
    const st = bandStatus(v, [{from:6,to:10,color:pal.good,label:'Óptimo',cls:'good'},{from:3,to:6,color:pal.warning,label:'Aceptable',cls:'warning'},{from:0,to:3,color:pal.critical,label:'Deficiente',cls:'critical'}]);
    renderGauge('gauge-aprendizaje', { value:v, min:0, max:10, target:6, bands, display: fmtNum(v,2)+' hs', unitLabel:'por empleado / año', statusColor: st.color, statusClass: st.cls, statusLabel: st.label });

    renderDonut('donut-temas', {
      slices: D.aprendizaje.horas_capacitacion_por_tema.map((r,i)=>({ label:r.tema, value:r.horas, color: pal.s[i] })),
      centerLabel:'horas totales', formatVal: v=>fmtNum(v,0)+'h'
    });

    renderLine('line-capacitacion', {
      points: D.aprendizaje.horas_capacitacion_evolucion.map(r=>({ label:r.label, y:r.horas })),
      color: pal.s[1], formatY:v=>fmtNum(v,0)+'h', seriesName:'Horas de capacitación', legendLabel:'Horas dictadas por mes'
    });

    renderBars('bar-rol-tema', {
      categories: D.aprendizaje.roles_sorted,
      series: D.aprendizaje.temas_sorted.map((name,i)=>({ name, color: pal.s[i], values: D.aprendizaje.roles_sorted.map(rol => (D.aprendizaje.horas_por_rol.find(r=>r.rol===rol)||{})[name] || 0) })),
      stacked:true, width:900, height:320, formatY:v=>fmtNum(v,0)+'h'
    });
  })();
}

// ---------- tabs ----------
const tabs = root.querySelectorAll('.lf-tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t===tab)));
    root.querySelectorAll('.lf-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-'+tab.dataset.tab).classList.add('active');
  });
});

buildAll();

// re-render if the OS color scheme changes while the page is open — chart
// colors are baked into SVG attributes at render time, not live CSS vars.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', buildAll);
