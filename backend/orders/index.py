import base64
import json
import os
import uuid
from datetime import datetime
from urllib.parse import quote
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
    return str(v if v is not None else '').replace("'", "''")


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body)}


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def save_doc(order_id: str, content: str, number: str = '') -> str:
    """Кладёт готовый Word-файл предписания на сервер и отдаёт ссылку на него.

    Нужно для телефона: файл, собранный в памяти браузера, там не скачивается.
    Пометка attachment заставляет телефон предложить сохранить документ, а не
    показывать его содержимое страницей.
    """
    key = f'orders/{order_id}/order-{uuid.uuid4().hex[:8]}.doc'
    safe = (number or order_id).replace('/', '-').replace('\\', '-').replace('"', '')
    name = f'Предписание {safe}.doc'
    quoted = quote(name)
    s3_client().put_object(
        Bucket='files',
        Key=key,
        Body=content.encode('utf-8'),
        ContentType='application/msword',
        ContentDisposition=f"attachment; filename*=UTF-8''{quoted}",
    )
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def to_order(r):
    b = r['body']
    return {
        'id': r['id'],
        'objectId': r['object_id'],
        'inspectionId': r['inspection_id'],
        'number': r['number'],
        'issuedTo': r['issued_to'],
        'inspector': r['inspector'],
        'deadline': r['deadline'],
        'status': r['status'],
        'body': b if isinstance(b, dict) else json.loads(b or '{}'),
        'fileUrl': r['file_url'],
        'stopWorks': bool(r.get('stop_works')),
        'fixDate': r.get('fix_date') or '',
        'category': r.get('category') or '',
        'extendNote': r.get('extend_note') or '',
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def to_contractor(r):
    return {
        'id': r['id'],
        'objectId': r['object_id'],
        'kind': r['kind'],
        'name': r['name'],
        'inn': r['inn'],
        'address': r['address'],
        'director': r['director'],
        'phone': r['phone'],
        'email': r['email'],
        'works': r['works'],
    }


def handler(event: dict, context) -> dict:
    """Предписания инспектора со сквозной нумерацией и карточка подрядной организации объекта."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}
    kind = params.get('kind') or body.get('kind') or 'order'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if kind == 'contractor':
            object_id = params.get('object_id') or body.get('objectId') or ''
            if method == 'GET':
                where = f"WHERE object_id = '{esc(object_id)}'" if object_id else ''
                cur.execute(
                    f"SELECT * FROM object_contractors {where} "
                    "ORDER BY CASE WHEN kind = 'general' THEN 0 ELSE 1 END, created_at"
                )
                rows = [to_contractor(r) for r in cur.fetchall()]
                general = next((r for r in rows if r['kind'] == 'general'), None)
                return resp(200, {'items': rows, 'item': general})

            if method == 'POST':
                if not object_id:
                    return resp(400, {'error': 'object_required'})
                cid = body.get('id') or uuid.uuid4().hex[:12]
                ckind = 'general' if body.get('kind') == 'general' else 'sub'
                if ckind == 'general':
                    cur.execute(
                        f"SELECT id FROM object_contractors WHERE object_id = '{esc(object_id)}' "
                        "AND kind = 'general'"
                    )
                    exist = cur.fetchone()
                    if exist and not body.get('id'):
                        cid = exist['id']
                cur.execute(
                    'INSERT INTO object_contractors (id, object_id, kind, name, inn, address, '
                    f"director, phone, email, works) VALUES ('{esc(cid)}', '{esc(object_id)}', "
                    f"'{esc(ckind)}', '{esc(body.get('name'))}', '{esc(body.get('inn'))}', "
                    f"'{esc(body.get('address'))}', '{esc(body.get('director'))}', "
                    f"'{esc(body.get('phone'))}', '{esc(body.get('email'))}', '{esc(body.get('works'))}') "
                    'ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, name = EXCLUDED.name, '
                    'inn = EXCLUDED.inn, address = EXCLUDED.address, director = EXCLUDED.director, '
                    'phone = EXCLUDED.phone, email = EXCLUDED.email, works = EXCLUDED.works RETURNING *'
                )
                conn.commit()
                return resp(200, {'item': to_contractor(cur.fetchone())})

            if method == 'DELETE':
                cid = params.get('id', '')
                if not cid:
                    return resp(400, {'error': 'id_required'})
                cur.execute(f"DELETE FROM object_contractors WHERE id = '{esc(cid)}'")
                conn.commit()
                return resp(200, {'ok': True})

            return resp(405, {'error': 'method_not_allowed'})

        if method == 'GET' and params.get('action') == 'file':
            oid = params.get('id', '')
            cur.execute(f"SELECT number, file_url FROM orders WHERE id = '{esc(oid)}'")
            row = cur.fetchone()
            if not row or not row['file_url']:
                return resp(404, {'error': 'file_not_found'})
            key = row['file_url'].split('/bucket/', 1)[-1]
            obj = s3_client().get_object(Bucket='files', Key=key)
            num = str(row['number'] or oid).replace('/', '-')
            disp = "attachment; filename*=UTF-8''" + quote(f'Предписание {num}.doc')
            # Файл отдаём сами: на CDN пометка attachment не доходит, и телефон
            # показывает документ страницей вместо сохранения.
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/msword',
                    'Content-Disposition': disp,
                },
                'isBase64Encoded': True,
                'body': base64.b64encode(obj['Body'].read()).decode(),
            }

        if method == 'POST' and (params.get('action') or body.get('action')) == 'doc':
            oid = body.get('id', '')
            content = body.get('content', '')
            if not oid or not content:
                return resp(400, {'error': 'id_and_content_required'})
            cur.execute(f"SELECT number FROM orders WHERE id = '{esc(oid)}'")
            found = cur.fetchone()
            if not found:
                return resp(404, {'error': 'order_not_found'})
            url = save_doc(oid, content, found['number'])
            cur.execute(
                f"UPDATE orders SET file_url = '{esc(url)}' WHERE id = '{esc(oid)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'order_not_found'})
            return resp(200, {'url': url, 'item': to_order(row)})

        if method == 'GET':
            object_id = params.get('object_id', '')
            where = f"WHERE object_id = '{esc(object_id)}'" if object_id else ''
            cur.execute(f'SELECT * FROM orders {where} ORDER BY created_at DESC')
            return resp(200, {'items': [to_order(r) for r in cur.fetchall()]})

        if method == 'POST':
            object_id = body.get('objectId', '')
            if not object_id:
                return resp(400, {'error': 'object_required'})
            cur.execute('SELECT COUNT(*) AS c FROM orders')
            number = f"{cur.fetchone()['c'] + 1:04d}/{datetime.now().year}"
            oid = uuid.uuid4().hex[:12]
            cur.execute(
                'INSERT INTO orders (id, object_id, inspection_id, number, issued_to, inspector, '
                f"deadline, status, body) VALUES ('{esc(oid)}', '{esc(object_id)}', "
                f"'{esc(body.get('inspectionId'))}', '{esc(number)}', '{esc(body.get('issuedTo'))}', "
                f"'{esc(body.get('inspector'))}', '{esc(body.get('deadline'))}', 'open', "
                f"'{esc(json.dumps(body.get('body') or {}, ensure_ascii=False))}'::jsonb) RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_order(cur.fetchone())})

        if method == 'PUT':
            oid = body.get('id', '')
            patch = body.get('patch') or {}
            cols = {
                'issuedTo': 'issued_to',
                'inspector': 'inspector',
                'deadline': 'deadline',
                'status': 'status',
                'fileUrl': 'file_url',
                'fixDate': 'fix_date',
                'category': 'category',
                'extendNote': 'extend_note',
            }
            sets = [f"{cols[k]} = '{esc(v)}'" for k, v in patch.items() if k in cols]
            if 'stopWorks' in patch:
                sets.append(f"stop_works = {'TRUE' if patch['stopWorks'] else 'FALSE'}")
            if 'body' in patch:
                sets.append(f"body = '{esc(json.dumps(patch['body'], ensure_ascii=False))}'::jsonb")
            if not sets or not oid:
                return resp(400, {'error': 'nothing_to_update'})
            cur.execute(f"UPDATE orders SET {', '.join(sets)} WHERE id = '{esc(oid)}' RETURNING *")
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': to_order(row)} if row else {'error': 'not_found'})

        if method == 'DELETE':
            oid = params.get('id', '')
            if not oid:
                return resp(400, {'error': 'id_required'})
            cur.execute(f"DELETE FROM orders WHERE id = '{esc(oid)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()