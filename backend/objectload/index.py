import json
import os
import uuid

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

NUMS = ('staffPlan', 'staffFact', 'techPlan', 'techFact', 'cabins')
COLS = {
    'staffPlan': 'staff_plan',
    'staffFact': 'staff_fact',
    'techPlan': 'tech_plan',
    'techFact': 'tech_fact',
    'cabins': 'cabins',
}


def esc(v):
    return str(v if v is not None else '').replace("'", "''")


def num(v):
    try:
        return int(float(v or 0))
    except (TypeError, ValueError):
        return 0


def resp(code, body):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def to_item(r):
    out = {k: int(r[c] or 0) for k, c in COLS.items()}
    out['id'] = r['id']
    out['objectId'] = r['object_id']
    out['day'] = r['day'].isoformat() if r['day'] else ''
    out['note'] = r['note'] or ''
    out['authorFio'] = r['author_fio'] or ''
    return out


def handler(event: dict, context) -> dict:
    """История явки людей и техники на объектах по дням."""
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
            days = num(params.get('days')) or 14
            days = min(max(days, 1), 120)
            conds = [f"day >= CURRENT_DATE - {days}"]
            if params.get('object_id'):
                conds.append(f"object_id = '{esc(params['object_id'])}'")
            cur.execute(
                f"SELECT * FROM object_load WHERE {' AND '.join(conds)} "
                'ORDER BY day DESC LIMIT 3000'
            )
            return resp(200, {'items': [to_item(r) for r in cur.fetchall()]})

        if method == 'POST':
            rows = body.get('items') if isinstance(body.get('items'), list) else [body]
            saved = []
            for it in rows[:200]:
                if not it.get('objectId') or not it.get('day'):
                    continue
                rid = uuid.uuid4().hex[:12]
                vals = ', '.join(str(num(it.get(k))) for k in NUMS)
                upd = ', '.join(f'{COLS[k]} = EXCLUDED.{COLS[k]}' for k in NUMS)
                cur.execute(
                    'INSERT INTO object_load (id, object_id, day, '
                    f"{', '.join(COLS[k] for k in NUMS)}, note, author_fio) VALUES "
                    f"('{esc(rid)}', '{esc(it['objectId'])}', '{esc(it['day'])}', {vals}, "
                    f"'{esc(it.get('note', ''))}', '{esc(it.get('authorFio', ''))}') "
                    f'ON CONFLICT (object_id, day) DO UPDATE SET {upd}, '
                    'note = EXCLUDED.note, author_fio = EXCLUDED.author_fio, '
                    'updated_at = NOW() RETURNING *'
                )
                saved.append(to_item(cur.fetchone()))
            conn.commit()
            return resp(200, {'items': saved, 'count': len(saved)})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
