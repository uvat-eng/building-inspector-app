import json
import os
import uuid
from datetime import datetime

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

TEXT = {
    'kind': 'kind',
    'number': 'number',
    'authorId': 'author_id',
    'authorFio': 'author_fio',
    'locationId': 'location_id',
    'objectId': 'object_id',
    'objectTitle': 'object_title',
    'title': 'title',
    'note': 'note',
    'needDate': 'need_date',
    'status': 'status',
    'decidedBy': 'decided_by',
    'decidedAt': 'decided_at',
    'decisionNote': 'decision_note',
}


def esc(v):
    return str(v if v is not None else '').replace("'", "''")


def numeric(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def resp(code, body):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def to_item(r):
    out = {k: r[c] if r[c] is not None else '' for k, c in TEXT.items()}
    items = r['items']
    meta = r['meta']
    out['id'] = r['id']
    out['total'] = float(r['total'] or 0)
    out['items'] = items if isinstance(items, list) else json.loads(items or '[]')
    out['meta'] = meta if isinstance(meta, dict) else json.loads(meta or '{}')
    out['createdAt'] = r['created_at'].isoformat() if r['created_at'] else ''
    return out


def handler(event: dict, context) -> dict:
    """Заявки на материалы, билеты и авансовые отчёты старшего инспектора."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except (ValueError, TypeError):
            body = {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if method == 'GET':
            conds = []
            if params.get('kind'):
                conds.append(f"kind = '{esc(params['kind'])}'")
            if params.get('author_id'):
                conds.append(f"author_id = '{esc(params['author_id'])}'")
            where = f"WHERE {' AND '.join(conds)}" if conds else ''
            cur.execute(f'SELECT * FROM requests {where} ORDER BY created_at DESC LIMIT 1000')
            return resp(200, {'items': [to_item(r) for r in cur.fetchall()]})

        if method == 'POST':
            if not body.get('title'):
                return resp(400, {'error': 'title_required'})
            kind = body.get('kind') or 'material'
            cur.execute(f"SELECT COUNT(*) AS c FROM requests WHERE kind = '{esc(kind)}'")
            prefix = {'material': 'М', 'ticket': 'Б', 'expense': 'А'}.get(kind, 'З')
            number = f"{prefix}-{cur.fetchone()['c'] + 1:04d}/{datetime.now().year}"
            rid = uuid.uuid4().hex[:12]
            data = {**body, 'kind': kind, 'number': body.get('number') or number}
            cols = ['id', 'total', 'items', 'meta'] + list(TEXT.values())
            vals = [
                f"'{esc(rid)}'",
                str(numeric(body.get('total'))),
                f"'{esc(json.dumps(body.get('items') or [], ensure_ascii=False))}'::jsonb",
                f"'{esc(json.dumps(body.get('meta') or {}, ensure_ascii=False))}'::jsonb",
            ] + [f"'{esc(data.get(k, ''))}'" for k in TEXT]
            cur.execute(
                f"INSERT INTO requests ({', '.join(cols)}) "
                f"VALUES ({', '.join(vals)}) RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_item(cur.fetchone())})

        if method == 'PUT':
            rid = body.get('id') or ''
            if not rid:
                return resp(400, {'error': 'id_required'})
            sets = [f"{c} = '{esc(body[k])}'" for k, c in TEXT.items() if k in body]
            if 'total' in body:
                sets.append(f"total = {numeric(body['total'])}")
            if 'items' in body:
                sets.append(
                    f"items = '{esc(json.dumps(body['items'], ensure_ascii=False))}'::jsonb"
                )
            if 'meta' in body:
                sets.append(f"meta = '{esc(json.dumps(body['meta'], ensure_ascii=False))}'::jsonb")
            if not sets:
                return resp(400, {'error': 'nothing_to_update'})
            cur.execute(
                f"UPDATE requests SET {', '.join(sets)} WHERE id = '{esc(rid)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': to_item(row)})

        if method == 'DELETE':
            rid = params.get('id') or ''
            if not rid:
                return resp(400, {'error': 'id_required'})
            cur.execute(f"DELETE FROM requests WHERE id = '{esc(rid)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
