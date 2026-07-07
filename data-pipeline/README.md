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
