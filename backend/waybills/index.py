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

TEXT_COLS = (
    'number', 'series', 'org', 'customer', 'customerPerson', 'columnNo', 'brigade',
    'carModel', 'carPlate', 'trailerModel', 'trailerPlate', 'driverFio', 'tabNo',
    'license', 'driverClass', 'snils', 'transportKind', 'messageKind', 'departAt',
    'returnAt', 'fuelBrand', 'medBefore', 'medAfter', 'techBefore', 'techAfter',
    'dispatcher', 'notes', 'status', 'vehicleId',
)

SNAKE = {
    'customerPerson': 'customer_person', 'columnNo': 'column_no', 'carModel': 'car_model',
    'carPlate': 'car_plate', 'trailerModel': 'trailer_model', 'trailerPlate': 'trailer_plate',
    'driverFio': 'driver_fio', 'tabNo': 'tab_no', 'driverClass': 'driver_class',
    'transportKind': 'transport_kind', 'messageKind': 'message_kind', 'departAt': 'depart_at',
    'returnAt': 'return_at', 'fuelBrand': 'fuel_brand', 'medBefore': 'med_before',
    'medAfter': 'med_after', 'techBefore': 'tech_before', 'techAfter': 'tech_after',
    'vehicleId': 'vehicle_id',
}

NUM_COLS = {
    'odoOut': 'odo_out', 'odoIn': 'odo_in', 'zeroRun': 'zero_run',
    'fuelIssued': 'fuel_issued', 'fuelOut': 'fuel_out', 'fuelIn': 'fuel_in',
    'fuelReturned': 'fuel_returned', 'fuelNorm': 'fuel_norm', 'fuelFact': 'fuel_fact',
}

INT_COLS = ('odo_out', 'odo_in', 'zero_run')


def esc(v):
    return str(v if v is not None else '').replace("'", "''")


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


def col_of(key):
    return SNAKE.get(key, key)


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
        key = f'parts/{folder}/{uuid.uuid4().hex[:8]}_{safe_name(name)}'
        s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=mime)
        urls.append(f'https://cdn.poehali.dev/projects/{base}/bucket/{key}')
    return urls


def row_waybill(r):
    out = {
        'id': r['id'],
        'wbDate': str(r['wb_date'] or ''),
        'ym': r['ym'],
        'validFrom': str(r['valid_from'] or ''),
        'validTo': str(r['valid_to'] or ''),
        'tasks': r['tasks'] or [],
        'works': r['works'] or [],
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }
    for k in TEXT_COLS:
        out[k] = r[col_of(k)] or ''
    for k, c in NUM_COLS.items():
        out[k] = int(r[c] or 0) if c in INT_COLS else float(r[c] or 0)
    return out


def row_part(r):
    return {
        'id': r['id'],
        'vehicleId': r['vehicle_id'],
        'driverFio': r['driver_fio'],
        'reqNo': r['req_no'],
        'reqDate': str(r['req_date'] or ''),
        'ym': r['ym'],
        'urgency': r['urgency'],
        'items': r['items'] or [],
        'reason': r['reason'],
        'photos': r['photos'] or [],
        'status': r['status'],
        'answer': r['answer'],
        'answerBy': r['answer_by'],
        'answerAt': r['answer_at'].isoformat() if r['answer_at'] else '',
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def handler(event: dict, context) -> dict:
    """Путевые листы спецавтомобиля и заявки водителей на запчасти."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}')
    kind = params.get('kind') or body.get('kind') or 'waybill'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            cur.execute('SELECT * FROM waybills ORDER BY wb_date DESC NULLS LAST')
            sheets = [row_waybill(r) for r in cur.fetchall()]
            cur.execute('SELECT * FROM part_requests ORDER BY req_date DESC NULLS LAST')
            parts = [row_part(r) for r in cur.fetchall()]
            return resp(200, {'waybills': sheets, 'parts': parts})

        if method == 'POST' and kind == 'waybill':
            new_id = uuid.uuid4().hex[:12]
            cols = ['id', 'wb_date', 'ym', 'valid_from', 'valid_to', 'tasks', 'works', 'author']
            vals = [
                f"'{esc(new_id)}'", dt(body.get('wbDate')),
                f"'{esc(ym_of(body.get('wbDate')))}'",
                dt(body.get('validFrom')), dt(body.get('validTo')),
                f"'{esc(json.dumps(body.get('tasks') or [], ensure_ascii=False))}'::jsonb",
                f"'{esc(json.dumps(body.get('works') or [], ensure_ascii=False))}'::jsonb",
                f"'{esc(body.get('author', ''))}'",
            ]
            for k in TEXT_COLS:
                cols.append(col_of(k))
                vals.append(f"'{esc(body.get(k, ''))}'")
            for k, c in NUM_COLS.items():
                cols.append(c)
                v = num(body.get(k))
                vals.append(str(int(v)) if c in INT_COLS else str(v))
            cur.execute(
                f"INSERT INTO waybills ({', '.join(cols)}) "
                f"VALUES ({', '.join(vals)}) RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': row_waybill(row)})

        if method == 'POST' and kind == 'part':
            new_id = uuid.uuid4().hex[:12]
            photos = upload_photos(body.get('photos') or [], new_id)
            cur.execute(
                'INSERT INTO part_requests (id, vehicle_id, driver_fio, req_no, req_date, ym, '
                'urgency, items, reason, photos, status, author) VALUES ('
                f"'{esc(new_id)}', '{esc(body.get('vehicleId', ''))}', "
                f"'{esc(body.get('driverFio', ''))}', '{esc(body.get('reqNo', ''))}', "
                f"{dt(body.get('reqDate'))}, '{esc(ym_of(body.get('reqDate')))}', "
                f"'{esc(body.get('urgency') or 'normal')}', "
                f"'{esc(json.dumps(body.get('items') or [], ensure_ascii=False))}'::jsonb, "
                f"'{esc(body.get('reason', ''))}', "
                f"'{esc(json.dumps(photos, ensure_ascii=False))}'::jsonb, "
                f"'{esc(body.get('status') or 'new')}', '{esc(body.get('author', ''))}') "
                'RETURNING *'
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': row_part(row)})

        if method == 'PUT':
            item_id = body.get('id', '')
            patch = body.get('patch') or {}
            if not item_id or not patch:
                return resp(400, {'error': 'id_and_patch_required'})

            sets = []
            if kind == 'waybill':
                for k in TEXT_COLS:
                    if k in patch:
                        sets.append(f"{col_of(k)} = '{esc(patch[k])}'")
                for k, c in NUM_COLS.items():
                    if k in patch:
                        v = num(patch[k])
                        sets.append(f'{c} = {int(v) if c in INT_COLS else v}')
                for k, c in (('wbDate', 'wb_date'), ('validFrom', 'valid_from'),
                             ('validTo', 'valid_to')):
                    if k in patch:
                        sets.append(f'{c} = {dt(patch[k])}')
                        if c == 'wb_date':
                            sets.append(f"ym = '{esc(ym_of(patch[k]))}'")
                for k in ('tasks', 'works'):
                    if k in patch:
                        val = json.dumps(patch[k], ensure_ascii=False)
                        sets.append(f"{k} = '{esc(val)}'::jsonb")
                table = 'waybills'
            else:
                for k, c in (('status', 'status'), ('answer', 'answer'),
                             ('answerBy', 'answer_by'), ('urgency', 'urgency'),
                             ('reason', 'reason')):
                    if k in patch:
                        sets.append(f"{c} = '{esc(patch[k])}'")
                if 'status' in patch or 'answer' in patch:
                    sets.append('answer_at = now()')
                if 'items' in patch:
                    val = json.dumps(patch['items'], ensure_ascii=False)
                    sets.append(f"items = '{esc(val)}'::jsonb")
                table = 'part_requests'

            if not sets:
                return resp(400, {'error': 'empty_patch'})
            cur.execute(
                f"UPDATE {table} SET {', '.join(sets)} WHERE id = '{esc(item_id)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': row_waybill(row) if kind == 'waybill' else row_part(row)})

        if method == 'DELETE':
            item_id = params.get('id') or body.get('id') or ''
            if not item_id:
                return resp(400, {'error': 'id_required'})
            table = 'waybills' if kind == 'waybill' else 'part_requests'
            cur.execute(f"DELETE FROM {table} WHERE id = '{esc(item_id)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
