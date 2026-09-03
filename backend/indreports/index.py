import json
import os
import uuid

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

KINDS = {
    'obustroystvo',
    'ispolnitelnaya',
    'otpb',
    'geodeziya',
    'kapremont',
    'inzhpodgotovka',
}


def esc(v):
    return str(v if v is not None else '').replace("'", "''")


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
        'objectId': r['object_id'],
        'kind': r['kind'],
        'number': r['number'],
        'date': r['report_date'].isoformat() if r['report_date'] else '',
        'authorId': r['author_id'],
        'authorFio': r['author_fio'],
        'status': r['status'],
        'data': r['data'] or {},
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
        'updatedAt': r['updated_at'].isoformat() if r['updated_at'] else '',
        'updatedBy': r['updated_by'],
    }


def handler(event: dict, context) -> dict:
    """Ежедневные индивидуальные отчёты инспекторов: список, создание, правка, удаление."""
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
            if params.get('author_id'):
                conds.append(f"author_id = '{esc(params['author_id'])}'")
            if params.get('object_id'):
                conds.append(f"object_id = '{esc(params['object_id'])}'")
            if params.get('kind'):
                conds.append(f"kind = '{esc(params['kind'])}'")
            if params.get('date'):
                conds.append(f"report_date = '{esc(params['date'])}'")
            where = f"WHERE {' AND '.join(conds)}" if conds else ''
            cur.execute(
                f'SELECT * FROM daily_inspector_reports {where} '
                'ORDER BY report_date DESC, created_at DESC LIMIT 500'
            )
            return resp(200, {'items': [to_item(r) for r in cur.fetchall()]})

        if method == 'POST':
            kind = body.get('kind', '')
            object_id = body.get('objectId', '')
            if kind not in KINDS:
                return resp(400, {'error': 'kind_required'})
            if not object_id:
                return resp(400, {'error': 'object_required'})
            rid = uuid.uuid4().hex[:12]
            date = body.get('date') or 'CURRENT_DATE'
            date_sql = 'CURRENT_DATE' if date == 'CURRENT_DATE' else f"'{esc(date)}'"
            cur.execute(
                'INSERT INTO daily_inspector_reports (id, object_id, kind, number, report_date, '
                'author_id, author_fio, status, data, updated_by) VALUES ('
                f"'{esc(rid)}', '{esc(object_id)}', '{esc(kind)}', "
                f"'{esc(body.get('number', ''))}', {date_sql}, "
                f"'{esc(body.get('authorId', ''))}', '{esc(body.get('authorFio', ''))}', "
                f"'{esc(body.get('status', 'done'))}', "
                f"'{esc(json.dumps(body.get('data') or {}, ensure_ascii=False))}'::jsonb, "
                f"'{esc(body.get('authorFio', ''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_item(cur.fetchone())})

        if method == 'PUT':
            rid = body.get('id') or params.get('id') or ''
            if not rid:
                return resp(400, {'error': 'id_required'})
            sets = []
            if 'number' in body:
                sets.append(f"number = '{esc(body['number'])}'")
            if 'status' in body:
                sets.append(f"status = '{esc(body['status'])}'")
            if 'objectId' in body:
                sets.append(f"object_id = '{esc(body['objectId'])}'")
            if 'kind' in body and body['kind'] in KINDS:
                sets.append(f"kind = '{esc(body['kind'])}'")
            if body.get('date'):
                sets.append(f"report_date = '{esc(body['date'])}'")
            if 'data' in body:
                sets.append(
                    f"data = '{esc(json.dumps(body['data'], ensure_ascii=False))}'::jsonb"
                )
            sets.append(f"updated_by = '{esc(body.get('updatedBy', ''))}'")
            sets.append('updated_at = NOW()')
            cur.execute(
                f"UPDATE daily_inspector_reports SET {', '.join(sets)} "
                f"WHERE id = '{esc(rid)}' RETURNING *"
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
            cur.execute(f"DELETE FROM daily_inspector_reports WHERE id = '{esc(rid)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
