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


def row_contract(r):
    return {
        'id': r['id'],
        'number': r['number'],
        'title': r['title'],
        'customer': r['customer'],
        'locationId': r['location_id'],
        'fieldKey': r['field_key'],
        'objects': r['objects'] or [],
        'chief': r['chief'],
        'signedAt': str(r['signed_at'] or ''),
        'startAt': str(r['start_at'] or ''),
        'endAt': str(r['end_at'] or ''),
        'amount': float(r['amount'] or 0),
        'vat': r['vat'],
        'note': r['note'],
        'status': r['status'],
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def row_act(r):
    return {
        'id': r['id'],
        'contractId': r['contract_id'],
        'number': r['number'],
        'actDate': str(r['act_date'] or ''),
        'period': r['period'],
        'amount': float(r['amount'] or 0),
        'paid': bool(r['paid']),
        'paidAt': str(r['paid_at'] or ''),
        'note': r['note'],
        'fileUrl': r['file_url'],
        'fileName': r['file_name'],
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def upload(file_name, content, mime, cid):
    raw = base64.b64decode(str(content).split(',')[-1])
    key = f'contracts/{cid}/{uuid.uuid4().hex[:8]}_{safe_name(file_name)}'
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=mime or 'application/octet-stream')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    """Договоры с заказчиком на строительный контроль и акты выполненных работ."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}')
    kind = params.get('kind') or body.get('kind') or 'contract'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            cur.execute('SELECT * FROM contracts ORDER BY created_at DESC')
            contracts = [row_contract(r) for r in cur.fetchall()]
            cur.execute('SELECT * FROM contract_acts ORDER BY act_date DESC NULLS LAST')
            acts = [row_act(r) for r in cur.fetchall()]
            return resp(200, {'items': contracts, 'acts': acts})

        if method == 'POST' and kind == 'contract':
            cid = uuid.uuid4().hex[:12]
            cur.execute(
                'INSERT INTO contracts (id, number, title, customer, location_id, field_key, '
                'objects, chief, signed_at, start_at, end_at, amount, vat, note, status, author) '
                f"VALUES ('{esc(cid)}', '{esc(body.get('number', ''))}', "
                f"'{esc(body.get('title', ''))}', '{esc(body.get('customer', ''))}', "
                f"'{esc(body.get('locationId', ''))}', '{esc(body.get('fieldKey', ''))}', "
                f"'{esc(json.dumps(body.get('objects', []), ensure_ascii=False))}'::jsonb, "
                f"'{esc(body.get('chief', ''))}', {dt(body.get('signedAt'))}, "
                f"{dt(body.get('startAt'))}, {dt(body.get('endAt'))}, "
                f"{num(body.get('amount'))}, '{esc(body.get('vat') or 'Без НДС')}', "
                f"'{esc(body.get('note', ''))}', '{esc(body.get('status') or 'active')}', "
                f"'{esc(body.get('author', ''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': row_contract(cur.fetchone())})

        if method == 'POST' and kind == 'act':
            contract_id = body.get('contractId', '')
            if not contract_id:
                return resp(400, {'error': 'contract_required'})
            aid = uuid.uuid4().hex[:12]
            url = ''
            if body.get('content') and body.get('fileName'):
                url = upload(body['fileName'], body['content'], body.get('mime'), contract_id)
            cur.execute(
                'INSERT INTO contract_acts (id, contract_id, number, act_date, period, amount, '
                'paid, paid_at, note, file_url, file_name, author) VALUES ('
                f"'{esc(aid)}', '{esc(contract_id)}', '{esc(body.get('number', ''))}', "
                f"{dt(body.get('actDate'))}, '{esc(body.get('period', ''))}', "
                f"{num(body.get('amount'))}, {'true' if body.get('paid') else 'false'}, "
                f"{dt(body.get('paidAt'))}, '{esc(body.get('note', ''))}', "
                f"'{esc(url)}', '{esc(body.get('fileName', ''))}', "
                f"'{esc(body.get('author', ''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': row_act(cur.fetchone())})

        if method == 'PUT':
            item_id = body.get('id', '')
            patch = body.get('patch') or {}
            if not item_id or not patch:
                return resp(400, {'error': 'id_and_patch_required'})

            text_cols = {
                'number': 'number', 'title': 'title', 'customer': 'customer',
                'locationId': 'location_id', 'fieldKey': 'field_key', 'chief': 'chief',
                'vat': 'vat', 'note': 'note', 'status': 'status', 'period': 'period',
            }
            date_cols = {'signedAt': 'signed_at', 'startAt': 'start_at',
                         'endAt': 'end_at', 'actDate': 'act_date', 'paidAt': 'paid_at'}
            sets = []
            for k, col in text_cols.items():
                if k in patch:
                    sets.append(f"{col} = '{esc(patch[k])}'")
            for k, col in date_cols.items():
                if k in patch:
                    sets.append(f'{col} = {dt(patch[k])}')
            if 'amount' in patch:
                sets.append(f"amount = {num(patch['amount'])}")
            if 'paid' in patch:
                sets.append(f"paid = {'true' if patch['paid'] else 'false'}")
            if 'objects' in patch:
                val = json.dumps(patch['objects'], ensure_ascii=False)
                sets.append(f"objects = '{esc(val)}'::jsonb")
            if not sets:
                return resp(400, {'error': 'empty_patch'})

            table = 'contract_acts' if kind == 'act' else 'contracts'
            cur.execute(
                f"UPDATE {table} SET {', '.join(sets)} WHERE id = '{esc(item_id)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': row_act(row) if kind == 'act' else row_contract(row)})

        if method == 'DELETE':
            item_id = params.get('id') or body.get('id') or ''
            if not item_id:
                return resp(400, {'error': 'id_required'})
            if kind == 'act':
                cur.execute(f"DELETE FROM contract_acts WHERE id = '{esc(item_id)}'")
            else:
                cur.execute(f"DELETE FROM contract_acts WHERE contract_id = '{esc(item_id)}'")
                cur.execute(f"DELETE FROM contracts WHERE id = '{esc(item_id)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
