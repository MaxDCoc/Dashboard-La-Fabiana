import json
from collections import defaultdict, OrderedDict

with open('lafabiana_extracted.json', encoding='utf-8') as f:
    D = json.load(f)

def to_float(v):
    if v is None:
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0

def to_int(v):
    return int(to_float(v))

MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

# ---------- FINANCIERA: costos_administrativos ----------
costos = D['costos_administrativos']
# columns: id, mes, anio, concepto, categoria, monto
by_month_total = defaultdict(float)
by_month_concept = defaultdict(lambda: defaultdict(float))
by_category_total = defaultdict(float)
concepts_set = set()
for r in costos:
    mes = to_int(r.get('mes'))
    anio = to_int(r.get('anio'))
    concepto = (r.get('concepto') or '').strip()
    categoria = (r.get('categoria') or '').strip()
    monto = to_float(r.get('monto'))
    key = (anio, mes)
    by_month_total[key] += monto
    by_month_concept[key][concepto] += monto
    by_category_total[categoria] += monto
    concepts_set.add(concepto)

months_sorted = sorted(by_month_total.keys())
cost_evolution = [{'label': f"{MESES[m-1]} {a}", 'anio': a, 'mes': m, 'total': round(by_month_total[(a,m)], 2)} for (a,m) in months_sorted]

top_concepts = sorted(concepts_set, key=lambda c: -sum(by_month_concept[k][c] for k in months_sorted))[:8]
cost_by_month_concept = []
for (a, m) in months_sorted:
    row = {'label': f"{MESES[m-1]} {a}", 'anio': a, 'mes': m}
    for c in top_concepts:
        row[c] = round(by_month_concept[(a,m)][c], 2)
    cost_by_month_concept.append(row)

total_costos = sum(by_category_total.values())
cost_by_category = sorted(
    [{'categoria': k, 'monto': round(v,2), 'pct': round(100*v/total_costos, 2)} for k, v in by_category_total.items()],
    key=lambda x: -x['monto']
)

# ingresos_mensuales -> compute real "costo administrativo sobre ingresos"
ingresos = D['ingresos_mensuales']
total_ingresos = sum(to_float(r.get('monto')) for r in ingresos)
tasa_costo_admin_sobre_ingresos = round(100 * total_costos / total_ingresos, 2) if total_ingresos else 0

# ---------- CLIENTES: encuestas_satisfaccion ----------
enc = D['encuestas_satisfaccion']
# columns: id, familiar_id, residente_id, mes, anio, satisfaccion, retroalimentacion_positiva, comentario
sat_by_month = defaultdict(list)
sat_rating_counts = defaultdict(int)
positivas = 0
total_familias_activas = set()
for r in enc:
    mes = to_int(r.get('mes'))
    anio = to_int(r.get('anio'))
    sat = to_float(r.get('satisfaccion'))
    sat_by_month[(anio, mes)].append(sat)
    sat_rating_counts[to_int(sat)] += 1
    rp = r.get('retroalimentacion_positiva')
    if str(rp).strip() in ('1', '1.0', 'True', 'TRUE', 'true'):
        positivas += 1
    total_familias_activas.add(r.get('familiar_id'))

sat_months_sorted = sorted(sat_by_month.keys())
satisfaction_evolution = [
    {'label': f"{MESES[m-1]} {a}", 'anio': a, 'mes': m, 'promedio': round(sum(sat_by_month[(a,m)])/len(sat_by_month[(a,m)]), 2)}
    for (a, m) in sat_months_sorted
]
rating_distribution = [{'rating': k, 'cantidad': v} for k, v in sorted(sat_rating_counts.items())]
tasa_satisfaccion_familiar = round(100 * positivas / len(enc), 2) if enc else 0

# solicitudes_familias for "cantidad de solicitudes por año y motivo"
sol = D['solicitudes_familias']
# columns: id_solicitud, id_residente, id_familiar, fecha_apertura, fecha_resolucion, estado, motivo
sol_by_year_motivo = defaultdict(lambda: defaultdict(int))
sol_motivo_count = defaultdict(int)
sol_estado_count = defaultdict(int)
sol_motivo_horas = defaultdict(list)
sol_motivo_resolved_count = defaultdict(int)

def parse_date(s):
    if not s:
        return None
    s = str(s).strip()
    return s[:10] if len(s) >= 10 else s

def date_diff_hours(d1, d2):
    # d1, d2 are 'YYYY-MM-DD' or with time; use simple day math via datetime
    from datetime import datetime
    fmts = ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d']
    def parse(s):
        for fmt in fmts:
            try:
                return datetime.strptime(s.strip(), fmt)
            except ValueError:
                continue
        return None
    a = parse(d1)
    b = parse(d2)
    if a is None or b is None:
        return None
    return (b - a).total_seconds() / 3600.0

for r in sol:
    motivo = (r.get('motivo') or '').strip()
    estado = (r.get('estado') or '').strip()
    fa = r.get('fecha_apertura')
    fr = r.get('fecha_resolucion')
    year = None
    if fa:
        year = str(fa)[:4]
    if year:
        sol_by_year_motivo[year][motivo] += 1
    sol_motivo_count[motivo] += 1
    sol_estado_count[estado] += 1
    if fr:
        h = date_diff_hours(fa, fr)
        if h is not None and h >= 0:
            sol_motivo_horas[motivo].append(h)
            sol_motivo_resolved_count[motivo] += 1

years_sorted = sorted(sol_by_year_motivo.keys())
motivos_sorted = sorted(sol_motivo_count.keys(), key=lambda m: -sol_motivo_count[m])
solicitudes_por_anio_motivo = []
for y in years_sorted:
    row = {'anio': y}
    for m in motivos_sorted:
        row[m] = sol_by_year_motivo[y].get(m, 0)
    solicitudes_por_anio_motivo.append(row)

solicitudes_por_motivo = [{'motivo': m, 'cantidad': sol_motivo_count[m]} for m in motivos_sorted]
estado_total = sum(sol_estado_count.values())
estado_solicitudes = sorted(
    [{'estado': k, 'cantidad': v, 'pct': round(100*v/estado_total, 2)} for k, v in sol_estado_count.items()],
    key=lambda x: -x['cantidad']
)

horas_resolucion_por_motivo = [
    {'motivo': m, 'horas_totales': round(sum(sol_motivo_horas[m]), 1), 'horas_promedio': round(sum(sol_motivo_horas[m])/len(sol_motivo_horas[m]), 1) if sol_motivo_horas[m] else 0}
    for m in motivos_sorted
]

all_resolved_hours = [h for hs in sol_motivo_horas.values() for h in hs]
sla_promedio = round(sum(all_resolved_hours) / len(all_resolved_hours), 1) if all_resolved_hours else 0

# ---------- PROCESOS INTERNOS: registros_sistema ----------
reg = D['registros_sistema']
# columns: id, origen_sistema, tipo_registro, residente_id, fecha, duplicado
def quarter_of(mes):
    return (mes - 1) // 3 + 1

reg_by_quarter_sistema = defaultdict(lambda: defaultdict(int))
for r in reg:
    fecha = r.get('fecha')
    if not fecha:
        continue
    fecha = str(fecha)
    try:
        anio = int(fecha[:4])
        mes = int(fecha[5:7])
    except ValueError:
        continue
    q = quarter_of(mes)
    key = (anio, q)
    origen = (r.get('origen_sistema') or '').strip()
    reg_by_quarter_sistema[key][origen] += 1

quarters_sorted = sorted(reg_by_quarter_sistema.keys())
sistemas_set = sorted({s for v in reg_by_quarter_sistema.values() for s in v.keys()})
registros_por_trimestre = []
for (a, q) in quarters_sorted:
    row = {'label': f"T{q} {a}", 'anio': a, 'trimestre': q}
    for s in sistemas_set:
        row[s] = reg_by_quarter_sistema[(a,q)].get(s, 0)
    registros_por_trimestre.append(row)

# ---------- APRENDIZAJE: capacitaciones + participacion_capacitaciones + empleados ----------
cap = D['capacitaciones']
# columns: id, fecha, tema, horas, tipo
part_cap = D['participacion_capacitaciones']
# columns: id, capacitacion_id, empleado_id
emp = D['empleados']
# columns: id, nombre, apellido, rol, fecha_ingreso

emp_by_id = {str(e.get('id')): e for e in emp}
cap_by_id = {str(c.get('id')): c for c in cap}

horas_por_tema = defaultdict(float)
horas_por_mes = defaultdict(float)
cap_count_by_id = defaultdict(int)
for pc in part_cap:
    cid = str(pc.get('capacitacion_id'))
    c = cap_by_id.get(cid)
    if not c:
        continue
    tema = (c.get('tema') or '').strip()
    horas = to_float(c.get('horas'))
    fecha = c.get('fecha')
    horas_por_tema[tema] += horas
    if fecha:
        anio = str(fecha)[:4]
        mes = int(str(fecha)[5:7])
        horas_por_mes[(anio, mes)] += horas
    cap_count_by_id[cid] += 1

total_horas_tema = sum(horas_por_tema.values())
temas_full_sorted = sorted(horas_por_tema.keys(), key=lambda t: -horas_por_tema[t])
# fold anything beyond the top 7 into "Otros" so the donut/stack never exceeds
# the 8-slot categorical palette (per the dataviz skill's fixed-hue rule)
TOP_N_TEMAS = 7
temas_top = temas_full_sorted[:TOP_N_TEMAS]
temas_rest = temas_full_sorted[TOP_N_TEMAS:]
horas_capacitacion_por_tema = [
    {'tema': t, 'horas': round(horas_por_tema[t], 1), 'pct': round(100*horas_por_tema[t]/total_horas_tema, 2)}
    for t in temas_top
]
if temas_rest:
    otros_horas = sum(horas_por_tema[t] for t in temas_rest)
    horas_capacitacion_por_tema.append({
        'tema': 'Otros temas', 'horas': round(otros_horas, 1), 'pct': round(100*otros_horas/total_horas_tema, 2)
    })

meses_cap_sorted = sorted(horas_por_mes.keys())
horas_capacitacion_evolucion = [
    {'label': f"{MESES[m-1]} {a}", 'anio': a, 'mes': m, 'horas': round(horas_por_mes[(a,m)], 1)}
    for (a, m) in meses_cap_sorted
]

horas_por_rol_tema = defaultdict(lambda: defaultdict(float))
empleados_con_capacitacion = set()
for pc in part_cap:
    cid = str(pc.get('capacitacion_id'))
    eid = str(pc.get('empleado_id'))
    c = cap_by_id.get(cid)
    e = emp_by_id.get(eid)
    if not c or not e:
        continue
    tema = (c.get('tema') or '').strip()
    rol = (e.get('rol') or '').strip()
    horas = to_float(c.get('horas'))
    horas_por_rol_tema[rol][tema] += horas
    empleados_con_capacitacion.add(eid)

roles_sorted = sorted(horas_por_rol_tema.keys(), key=lambda r: -sum(horas_por_rol_tema[r].values()))
temas_sorted = temas_top + (['Otros temas'] if temas_rest else [])
horas_por_rol = []
for rol in roles_sorted:
    row = {'rol': rol}
    for tema in temas_top:
        row[tema] = round(horas_por_rol_tema[rol].get(tema, 0), 1)
    if temas_rest:
        row['Otros temas'] = round(sum(horas_por_rol_tema[rol].get(t, 0) for t in temas_rest), 1)
    horas_por_rol.append(row)

total_empleados = len(emp)
# CMI formula: Total horas de capacitacion impartidas / Total de empleados
total_horas_impartidas = sum(to_float(c.get('horas')) for c in cap)
promedio_anual_por_empleado = round(total_horas_impartidas / total_empleados, 2) if total_empleados else 0

output = {
    'financiera': {
        'costo_evolucion': cost_evolution,
        'costo_por_mes_concepto': cost_by_month_concept,
        'top_concepts': top_concepts,
        'costo_por_categoria': cost_by_category,
        'tasa_costo_admin_sobre_ingresos': tasa_costo_admin_sobre_ingresos,
    },
    'clientes': {
        'satisfaccion_evolucion': satisfaction_evolution,
        'rating_distribution': rating_distribution,
        'tasa_satisfaccion_familiar': tasa_satisfaccion_familiar,
        'solicitudes_por_anio_motivo': solicitudes_por_anio_motivo,
        'motivos_sorted': motivos_sorted,
    },
    'procesos': {
        'horas_resolucion_por_motivo': horas_resolucion_por_motivo,
        'registros_por_trimestre': registros_por_trimestre,
        'sistemas_set': sistemas_set,
        'estado_solicitudes': estado_solicitudes,
        'solicitudes_por_motivo': solicitudes_por_motivo,
        'sla_promedio': sla_promedio,
    },
    'aprendizaje': {
        'horas_capacitacion_por_tema': horas_capacitacion_por_tema,
        'horas_capacitacion_evolucion': horas_capacitacion_evolucion,
        'horas_por_rol': horas_por_rol,
        'roles_sorted': roles_sorted,
        'temas_sorted': temas_sorted,
        'promedio_anual_por_empleado': promedio_anual_por_empleado,
        'total_empleados': total_empleados,
    }
}

with open('lafabiana_aggregated.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("tasa_satisfaccion_familiar:", tasa_satisfaccion_familiar)
print("sla_promedio:", sla_promedio)
print("promedio_anual_por_empleado:", promedio_anual_por_empleado, "total_empleados:", total_empleados)
print("cost_by_category:", cost_by_category)
print("estado_solicitudes:", estado_solicitudes)
print("n cost_evolution points:", len(cost_evolution))
print("n satisfaction points:", len(satisfaction_evolution))
print("n registros_por_trimestre points:", len(registros_por_trimestre), sistemas_set)
print("n horas_cap_evolucion points:", len(horas_capacitacion_evolucion))
print("horas_capacitacion_por_tema:", horas_capacitacion_por_tema)
