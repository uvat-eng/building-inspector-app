import json
import os
import uuid

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def esc(v):
    return str(v if v is not None else '').replace("'", "''")


def num(v):
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
    return {
        'id': r['id'],
        'assetId': r['asset_id'],
        'assetKind': r['asset_kind'],
        'day': r['day'].isoformat() if r['day'] else '',
        'status': r['status'],
        'hours': float(r['hours'] or 0),
        'objectId': r['object_id'] or '',
        'note': r['note'] or '',
        'authorFio': r['author_fio'] or '',
    }


def handler(event: dict, context) -> dict:
    """Табель работы техники и вагонов по дням месяца."""
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
                conds.append(f"asset_kind = '{esc(params['kind'])}'")
            if params.get('month'):
                conds.append(f"to_char(day, 'YYYY-MM') = '{esc(params['month'])}'")
            where = f"WHERE {' AND '.join(conds)}" if conds else ''
            cur.execute(f'SELECT * FROM asset_timesheet {where} ORDER BY day LIMIT 5000')
            return resp(200, {'items': [to_item(r) for r in cur.fetchall()]})

        if method == 'POST':
            rows = body.get('items') if isinstance(body.get('items'), list) else [body]
            saved = []
            for it in rows[:400]:
                if not it.get('assetId') or not it.get('day'):
                    continue
                rid = uuid.uuid4().hex[:12]
                cur.execute(
                    'INSERT INTO asset_timesheet '
                    '(id, asset_id, asset_kind, day, status, hours, object_id, note, author_fio) '
                    f"VALUES ('{esc(rid)}', '{esc(it['assetId'])}', "
                    f"'{esc(it.get('assetKind', 'vehicle'))}', '{esc(it['day'])}', "
                    f"'{esc(it.get('status', 'work'))}', {num(it.get('hours'))}, "
                    f"'{esc(it.get('objectId', ''))}', '{esc(it.get('note', ''))}', "
                    f"'{esc(it.get('authorFio', ''))}') "
                    'ON CONFLICT (asset_id, day) DO UPDATE SET '
                    'status = EXCLUDED.status, hours = EXCLUDED.hours, '
                    'object_id = EXCLUDED.object_id, note = EXCLUDED.note, '
                    'author_fio = EXCLUDED.author_fio, updated_at = NOW() '
                    'RETURNING *'
                )
                saved.append(to_item(cur.fetchone()))
            conn.commit()
            return resp(200, {'items': saved, 'count': len(saved)})

        if method == 'DELETE':
            asset = params.get('asset_id') or ''
            day = params.get('day') or ''
            if not asset or not day:
                return resp(400, {'error': 'asset_and_day_required'})
            cur.execute(
                f"DELETE FROM asset_timesheet WHERE asset_id = '{esc(asset)}' "
                f"AND day = '{esc(day)}'"
            )
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
