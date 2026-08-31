import json
import os
import time
import uuid

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

FIELDS = [
    ('title', 'title', 'text'),
    ('field', 'field', 'text'),
    ('kind', 'kind', 'text'),
    ('capacity', 'capacity', 'text'),
    ('startYear', 'start_year', 'text'),
    ('endYear', 'end_year', 'text'),
    ('inspectors', 'inspectors', 'int'),
    ('vehicles', 'vehicles', 'int'),
    ('cabins', 'cabins', 'int'),
    ('customer', 'customer', 'text'),
    ('customerLogo', 'customer_logo', 'text'),
    ('contractNo', 'contract_no', 'text'),
    ('contractSum', 'contract_sum', 'int'),
    ('regionId', 'region_id', 'text'),
    ('regionName', 'region_name', 'text'),
    ('district', 'district', 'text'),
    ('lon', 'lon', 'float'),
    ('lat', 'lat', 'float'),
    ('stage', 'stage', 'text'),
    ('progress', 'progress', 'int'),
    ('start', 'start_date', 'text'),
    ('deadline', 'deadline', 'text'),
    ('status', 'status', 'text'),
    ('staffPlan', 'staff_plan', 'int'),
    ('staffFact', 'staff_fact', 'int'),
    ('techPlan', 'tech_plan', 'int'),
    ('techFact', 'tech_fact', 'int'),
    ('orders', 'orders', 'int'),
    ('ordersOpen', 'orders_open', 'int'),
]

BY_JSON = {j: (c, t) for j, c, t in FIELDS}


def esc(v: str) -> str:
    return "'" + str(v).replace("'", "''") + "'"


def lit(value, kind: str) -> str:
    if kind == 'int':
        try:
            return str(int(float(value)))
        except (TypeError, ValueError):
            return '0'
    if kind == 'float':
        try:
            return repr(float(value))
        except (TypeError, ValueError):
            return '0.0'
    return esc('' if value is None else value)


def row_to_obj(row) -> dict:
    out = {'id': row['id']}
    for j, c, _t in FIELDS:
        out[j] = row[c]
    if not out.get('customerLogo'):
        out.pop('customerLogo', None)
    return out


def connect():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Общий справочник объектов строительства: список, создание, правка и удаление на сервере."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = connect()
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if method == 'GET':
        cur.execute('SELECT * FROM objects ORDER BY field, title')
        items = [row_to_obj(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'items': items}, ensure_ascii=False)}

    body = json.loads(event.get('body') or '{}')

    if method == 'POST':
        oid = body.get('id') or f"obj-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
        cols = ['id']
        vals = [esc(oid)]
        for j, c, t in FIELDS:
            cols.append(c)
            vals.append(lit(body.get(j), t))
        cur.execute(
            f"INSERT INTO objects ({', '.join(cols)}) VALUES ({', '.join(vals)}) RETURNING *"
        )
        item = row_to_obj(cur.fetchone())
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': item}, ensure_ascii=False)}

    if method == 'PUT':
        oid = body.get('id') or ''
        patch = body.get('patch') or {}
        sets = []
        for key, value in patch.items():
            if key in BY_JSON:
                col, kind = BY_JSON[key]
                sets.append(f"{col} = {lit(value, kind)}")
        if not sets:
            cur.close()
            conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'nothing to update'})}
        sets.append('updated_at = now()')
        cur.execute(f"UPDATE objects SET {', '.join(sets)} WHERE id = {esc(oid)} RETURNING *")
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'not found'})}
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'item': row_to_obj(row)}, ensure_ascii=False)}

    if method == 'DELETE':
        params = event.get('queryStringParameters') or {}
        oid = body.get('id') or params.get('id') or ''
        cur.execute(f"DELETE FROM objects WHERE id = {esc(oid)}")
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close()
    conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'method not allowed'})}
