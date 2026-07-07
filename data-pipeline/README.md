# Pipeline de datos

`src/data.json` es una foto fija generada a partir de `../lafabiana_datos.xlsx` (el Excel
del TP). No se recalcula en cada build porque el Excel no cambia — es el dataset entregado
para el trabajo práctico, no una fuente viva.

Si el Excel llegara a actualizarse y hace falta regenerar `src/data.json`:

```bash
cd data-pipeline
python extract_data.py lafabiana_extracted.json   # lee el .xlsx (zip+XML), sin dependencias externas
python aggregate_data.py                          # agrega por mes/motivo/tema/etc. -> lafabiana_aggregated.json
cp lafabiana_aggregated.json ../src/data.json
```

Ambos scripts solo usan la biblioteca estándar de Python (zipfile + xml.etree), no
requieren `pandas` ni `openpyxl`.

Los 4 KPI principales de `data.json` fueron verificados contra los gauges del
`DashbordLaFabiana.pbix` original: 23,75% costo/ingresos, 84,35% satisfacción familiar,
26,9 hs de SLA promedio y 1,39 hs de capacitación por empleado/año.

## Campo `resueltas` (Procesos Internos)

`horas_resolucion_por_motivo[].resueltas` cuenta, por motivo, solo las solicitudes con
`fecha_resolucion` no nula — coincide con el `CountNonNull(fecha_resolucion)` del `.pbix`
original. Se usa en el chart "Solicitudes resueltas por motivo", en reemplazo de
`solicitudes_por_motivo` (que cuenta TODAS las solicitudes, sin filtrar por estado, y ya no
se grafica en ningún lado, aunque queda en el JSON). De la misma forma,
`horas_resolucion_por_motivo[].horas_totales` (no `.horas_promedio`) es lo que se grafica en
"Horas totales de resolución por motivo", para coincidir con el `Sum(Horas_Resolucion)` del
`.pbix`. La suma de `resueltas` en los 10 motivos coincide exactamente con
`estado_solicitudes` → "Resuelto" (175).

## Deploy

El dashboard está en producción en https://dashboard-la-fabiana.vercel.app, con deploy
continuo: cada push a `main` en GitHub dispara un build y deploy automático en Vercel.
