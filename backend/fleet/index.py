import base64
import json
import os
import re
import uuid

import boto3
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

KINDS = ('shift', 'repair', 'expense', 'act')
TABLE = {
    'shift': 'fleet_shifts',
    'repair': 'fleet_repairs',
    'expense': 'fleet_expenses',
    'act': 'fleet_acts',
}


def esc(v):
    return str(v).replace("'", "''")


def num(v):
    try:
        return round(float(str(v).replace(',', '.').replace(' ', '') or 0), 2)
    except Exception:
        return 0.0


def dt(v):
    s = str(v or '').strip()[:10]
    return f"'{esc(s)}'" if re.match(r'^\d{4}-\d{2}-\d{2}$', s) else 'NULL'


def ym_of(v):
    s = str(v or '')[:7]
    return s if re.match(r'^\d{4}-\d{2}$', s) else ''


def resp(code, body):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def safe_name(name):
    cleaned = re.sub(r'[^A-Za-z0-9._-]+', '_', str(name)).strip('_')
    return cleaned or 'file'


def upload_photos(photos, folder):
    if not photos:
        return []
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    base = os.environ['AWS_ACCESS_KEY_ID']
    urls = []
    for p in photos[:12]:
        content = p.get('content') if isinstance(p, dict) else p
        if not content:
            continue
        if str(content).startswith('http'):
            urls.append(str(content))
            continue
        name = p.get('name', 'photo.jpg') if isinstance(p, dict) else 'photo.jpg'
        mime = p.get('mime', 'image/jpeg') if isinstance(p, dict) else 'image/jpeg'
        raw = base64.b64decode(str(content).split(',')[-1])
        key = f'fleet/{folder}/{uuid.uuid4().hex[:8]}_{safe_name(name)}'
        s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=mime)
        urls.append(f'https://cdn.poehali.dev/projects/{base}/bucket/{key}')
    return urls


def row_shift(r):
    return {
        'id': r['id'],
        'vehicleId': r['vehicle_id'],
        'driverId': r['driver_id'],
        'driverFio': r['driver_fio'],
        'startAt': str(r['start_at'] or ''),
        'endAt': str(r['end_at'] or ''),
        'note': r['note'],
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def row_repair(r):
    return {
        'id': r['id'],
        'vehicleId': r['vehicle_id'],
        'kind': r['kind'],
        'title': r['title'],
        'repairDate': str(r['repair_date'] or ''),
        'ym': r['ym'],
        'odometer': int(r['odometer'] or 0),
        'amount': float(r['amount'] or 0),
        'parts': r['parts'],
        'status': r['status'],
        'photos': r['photos'] or [],
        'note': r['note'],
        'author': r['author'],
        'authorRole': r['author_role'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def row_expense(r):
    return {
        'id': r['id'],
        'vehicleId': r['vehicle_id'],
        'driverFio': r['driver_fio'],
        'expDate': str(r['exp_date'] or ''),
        'ym': r['ym'],
        'source': r['source'],
        'title': r['title'],
        'amount': float(r['amount'] or 0),
        'qty': float(r['qty'] or 0),
        'unit': r['unit'],
        'photos': r['photos'] or [],
        'note': r['note'],
        'status': r['status'],
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def row_act(r):
    return {
        'id': r['id'],
        'vehicleId': r['vehicle_id'],
        'kind': r['kind'],
        'actNo': r['act_no'],
        'actDate': str(r['act_date'] or ''),
        'driverFio': r['driver_fio'],
        'acceptFio': r['accept_fio'],
        'odometer': int(r['odometer'] or 0),
        'condition': r['condition'],
        'items': r['items'] or [],
        'photos': r['photos'] or [],
        'note': r['note'],
        'status': r['status'],
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


ROW = {'shift': row_shift, 'repair': row_repair, 'expense': row_expense, 'act': row_act}


def handler(event: dict, context) -> dict:
    """Автопарк: вахты водителей, ремонты и ТО, авансовые отчёты и акты передачи."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}')
    kind = params.get('kind') or body.get('kind') or ''

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            cur.execute('SELECT * FROM fleet_shifts ORDER BY start_at DESC NULLS LAST')
            shifts = [row_shift(r) for r in cur.fetchall()]
            cur.execute('SELECT * FROM fleet_repairs ORDER BY repair_date DESC NULLS LAST')
            repairs = [row_repair(r) for r in cur.fetchall()]
            cur.execute('SELECT * FROM fleet_expenses ORDER BY exp_date DESC NULLS LAST')
            expenses = [row_expense(r) for r in cur.fetchall()]
            cur.execute('SELECT * FROM fleet_acts ORDER BY act_date DESC NULLS LAST')
            acts = [row_act(r) for r in cur.fetchall()]
            return resp(200, {
                'shifts': shifts, 'repairs': repairs,
                'expenses': expenses, 'acts': acts,
            })

        if kind not in KINDS:
            return resp(400, {'error': 'unknown_kind'})

        if method == 'POST':
            new_id = uuid.uuid4().hex[:12]
            vehicle = body.get('vehicleId', '')

            if kind == 'shift':
                cur.execute(
                    'INSERT INTO fleet_shifts (id, vehicle_id, driver_id, driver_fio, start_at, '
                    'end_at, note, author) VALUES ('
                    f"'{esc(new_id)}', '{esc(vehicle)}', '{esc(body.get('driverId', ''))}', "
                    f"'{esc(body.get('driverFio', ''))}', {dt(body.get('startAt'))}, "
                    f"{dt(body.get('endAt'))}, '{esc(body.get('note', ''))}', "
                    f"'{esc(body.get('author', ''))}') RETURNING *"
                )
            elif kind == 'repair':
                photos = upload_photos(body.get('photos') or [], new_id)
                cur.execute(
                    'INSERT INTO fleet_repairs (id, vehicle_id, kind, title, repair_date, ym, '
                    'odometer, amount, parts, status, photos, note, author, author_role) VALUES ('
                    f"'{esc(new_id)}', '{esc(vehicle)}', '{esc(body.get('repairKind') or 'repair')}', "
                    f"'{esc(body.get('title', ''))}', {dt(body.get('repairDate'))}, "
                    f"'{esc(ym_of(body.get('repairDate')))}', {int(num(body.get('odometer')))}, "
                    f"{num(body.get('amount'))}, '{esc(body.get('parts', ''))}', "
                    f"'{esc(body.get('status') or 'done')}', "
                    f"'{esc(json.dumps(photos, ensure_ascii=False))}'::jsonb, "
                    f"'{esc(body.get('note', ''))}', '{esc(body.get('author', ''))}', "
                    f"'{esc(body.get('authorRole', ''))}') RETURNING *"
                )
            elif kind == 'expense':
                photos = upload_photos(body.get('photos') or [], new_id)
                cur.execute(
                    'INSERT INTO fleet_expenses (id, vehicle_id, driver_fio, exp_date, ym, '
                    'source, title, amount, qty, unit, photos, note, status, author) VALUES ('
                    f"'{esc(new_id)}', '{esc(vehicle)}', '{esc(body.get('driverFio', ''))}', "
                    f"{dt(body.get('expDate'))}, '{esc(ym_of(body.get('expDate')))}', "
                    f"'{esc(body.get('source') or 'podotchet')}', '{esc(body.get('title', ''))}', "
                    f"{num(body.get('amount'))}, {num(body.get('qty') or 1)}, "
                    f"'{esc(body.get('unit') or 'шт')}', "
                    f"'{esc(json.dumps(photos, ensure_ascii=False))}'::jsonb, "
                    f"'{esc(body.get('note', ''))}', '{esc(body.get('status') or 'new')}', "
                    f"'{esc(body.get('author', ''))}') RETURNING *"
                )
            else:
                photos = upload_photos(body.get('photos') or [], new_id)
                cur.execute(
                    'INSERT INTO fleet_acts (id, vehicle_id, kind, act_no, act_date, driver_fio, '
                    'accept_fio, odometer, condition, items, photos, note, status, author) VALUES ('
                    f"'{esc(new_id)}', '{esc(vehicle)}', '{esc(body.get('actKind') or 'handover')}', "
                    f"'{esc(body.get('actNo', ''))}', {dt(body.get('actDate'))}, "
                    f"'{esc(body.get('driverFio', ''))}', '{esc(body.get('acceptFio', ''))}', "
                    f"{int(num(body.get('odometer')))}, '{esc(body.get('condition', ''))}', "
                    f"'{esc(json.dumps(body.get('items') or [], ensure_ascii=False))}'::jsonb, "
                    f"'{esc(json.dumps(photos, ensure_ascii=False))}'::jsonb, "
                    f"'{esc(body.get('note', ''))}', '{esc(body.get('status') or 'new')}', "
                    f"'{esc(body.get('author', ''))}') RETURNING *"
                )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': ROW[kind](row)})

        if method == 'PUT':
            item_id = body.get('id', '')
            patch = body.get('patch') or {}
            if not item_id or not patch:
                return resp(400, {'error': 'id_and_patch_required'})

            cols = {
                'shift': {'driverFio': 'driver_fio', 'driverId': 'driver_id', 'note': 'note'},
                'repair': {'title': 'title', 'parts': 'parts', 'status': 'status',
                           'note': 'note', 'repairKind': 'kind'},
                'expense': {'title': 'title', 'unit': 'unit', 'source': 'source',
                            'status': 'status', 'note': 'note'},
                'act': {'actNo': 'act_no', 'acceptFio': 'accept_fio', 'condition': 'condition',
                        'status': 'status', 'note': 'note'},
            }[kind]
            dates = {
                'shift': {'startAt': 'start_at', 'endAt': 'end_at'},
                'repair': {'repairDate': 'repair_date'},
                'expense': {'expDate': 'exp_date'},
                'act': {'actDate': 'act_date'},
            }[kind]

            sets = []
            for k, col in cols.items():
                if k in patch:
                    sets.append(f"{col} = '{esc(patch[k])}'")
            for k, col in dates.items():
                if k in patch:
                    sets.append(f'{col} = {dt(patch[k])}')
                    if kind in ('repair', 'expense'):
                        sets.append(f"ym = '{esc(ym_of(patch[k]))}'")
            if 'amount' in patch:
                sets.append(f"amount = {num(patch['amount'])}")
            if 'qty' in patch:
                sets.append(f"qty = {num(patch['qty'])}")
            if 'odometer' in patch:
                sets.append(f"odometer = {int(num(patch['odometer']))}")
            if 'items' in patch:
                val = json.dumps(patch['items'], ensure_ascii=False)
                sets.append(f"items = '{esc(val)}'::jsonb")
            if not sets:
                return resp(400, {'error': 'empty_patch'})

            cur.execute(
                f"UPDATE {TABLE[kind]} SET {', '.join(sets)} "
                f"WHERE id = '{esc(item_id)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': ROW[kind](row)})

        if method == 'DELETE':
            item_id = params.get('id') or body.get('id') or ''
            if not item_id:
                return resp(400, {'error': 'id_required'})
            cur.execute(f"DELETE FROM {TABLE[kind]} WHERE id = '{esc(item_id)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
