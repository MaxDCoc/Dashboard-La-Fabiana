import zipfile
import xml.etree.ElementTree as ET
import re
import json
import sys
from collections import defaultdict

SRC = r"c:\Users\asus\Desktop\5to\Sistemas de Gestion\lafabiana_datos.xlsx"

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

def col_to_idx(cell_ref):
    letters = re.match(r'([A-Z]+)', cell_ref).group(1)
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - ord('A') + 1)
    return idx - 1

with zipfile.ZipFile(SRC) as z:
    wb_xml = z.read('xl/workbook.xml')
    rels_xml = z.read('xl/_rels/workbook.xml.rels')

    wb_root = ET.fromstring(wb_xml)
    rels_root = ET.fromstring(rels_xml)

    rid_to_target = {}
    for rel in rels_root:
        rid_to_target[rel.attrib['Id']] = rel.attrib['Target']

    sheets = []
    for sheet in wb_root.find('m:sheets', NS):
        name = sheet.attrib['name']
        rid = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        target = rid_to_target[rid]
        sheets.append((name, target))

    def read_sheet(sheet_name):
        target = None
        for name, t in sheets:
            if name == sheet_name:
                target = t
                break
        if target is None:
            raise KeyError(sheet_name)
        target = target.lstrip('/')
        path = target if target.startswith('xl/') else 'xl/' + target
        data = z.read(path)
        root = ET.fromstring(data)
        rows_out = []
        sheet_data = root.find('m:sheetData', NS)
        for row in sheet_data.findall('m:row', NS):
            row_cells = {}
            for c in row.findall('m:c', NS):
                ref = c.attrib['r']
                idx = col_to_idx(ref)
                t = c.attrib.get('t', 'n')
                v_el = c.find('m:v', NS)
                is_el = c.find('m:is', NS)
                if is_el is not None:
                    # inline string
                    texts = is_el.findall('.//m:t', NS)
                    val = ''.join(t.text or '' for t in texts)
                elif v_el is not None:
                    val = v_el.text
                else:
                    val = None
                row_cells[idx] = (t, val)
            if row_cells:
                maxidx = max(row_cells.keys())
                row_list = [row_cells.get(i, (None, None))[1] for i in range(maxidx + 1)]
                rows_out.append(row_list)
        return rows_out

    def sheet_to_dicts(sheet_name):
        rows = read_sheet(sheet_name)
        header = [h.strip() if h else '' for h in rows[0]]
        out = []
        for r in rows[1:]:
            d = {}
            for i, h in enumerate(header):
                d[h] = r[i] if i < len(r) else None
            out.append(d)
        return out

    result = {}
    for sname in ['costos_administrativos', 'encuestas_satisfaccion', 'solicitudes_familias',
                  'registros_sistema', 'capacitaciones', 'empleados', 'participacion_capacitaciones',
                  'ingresos_mensuales']:
        result[sname] = sheet_to_dicts(sname)

    print(json.dumps({'sheet_names': [s[0] for s in sheets]}, ensure_ascii=False))
    with open(sys.argv[1], 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False)
    print("counts:", {k: len(v) for k, v in result.items()})
