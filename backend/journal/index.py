import base64
import json
import os
import uuid
from datetime import datetime

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

FIELDS = {
    'authorId': 'author_id',
    'authorFio': 'author_fio',
    'objectTitle': 'object_title',
    'projectTitle': 'project_title',
    'contractor': 'contractor',
    'content': 'content',
    'recordedBy': 'recorded_by',
    'ackBy': 'ack_by',
    'measures': 'measures',
    'fixStatus': 'fix_status',
    'fixDate': 'fix_date',
    'responsibility': 'responsibility',
    'orderNote': 'order_note',
    'category': 'category',
    'sourceKind': 'source_kind',
    'sourceId': 'source_id',
    'sourceNumber': 'source_number',
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
    out = {k: r[c] or '' for k, c in FIELDS.items()}
    out['id'] = r['id']
    out['date'] = r['entry_date'].isoformat() if r['entry_date'] else ''
    out['createdAt'] = r['created_at'].isoformat() if r['created_at'] else ''
    out['updatedAt'] = r['updated_at'].isoformat() if r['updated_at'] else ''
    out['updatedBy'] = r['updated_by'] or ''
    return out


def handler(event: dict, context) -> dict:
    """Индивидуальный журнал замечаний инспектора строительного контроля."""
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
            if params.get('object'):
                conds.append(f"object_title = '{esc(params['object'])}'")
            where = f"WHERE {' AND '.join(conds)}" if conds else ''
            cur.execute(
                f'SELECT * FROM inspector_journal {where} '
                'ORDER BY entry_date DESC, created_at DESC LIMIT 3000'
            )
            return resp(200, {'items': [to_item(r) for r in cur.fetchall()]})

        if method == 'POST' and body.get('action') == 'publish':
            content = base64.b64decode(body.get('fileBase64', ''))
            name = body.get('fileName') or 'journal'
            key = (
                f"journals/{datetime.now().strftime('%Y%m')}/"
                f"{uuid.uuid4().hex[:8]}-{name}.xls"
            )
            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.put_object(
                Bucket='files',
                Key=key,
                Body=content,
                ContentType='application/vnd.ms-excel',
            )
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            return resp(200, {'url': url})

        if method == 'POST' and body.get('action') == 'import':
            rows = body.get('items') or []
            if not rows:
                return resp(400, {'error': 'items_required'})
            created = []
            for item in rows[:300]:
                if not item.get('content'):
                    continue
                rid = uuid.uuid4().hex[:12]
                date_sql = f"'{esc(item['date'])}'" if item.get('date') else 'CURRENT_DATE'
                cols = ['id', 'entry_date', 'updated_by'] + list(FIELDS.values())
                vals = [f"'{esc(rid)}'", date_sql, f"'{esc(item.get('authorFio', ''))}'"] + [
                    f"'{esc(item.get(k, ''))}'" for k in FIELDS
                ]
                cur.execute(
                    f"INSERT INTO inspector_journal ({', '.join(cols)}) "
                    f"VALUES ({', '.join(vals)}) RETURNING *"
                )
                created.append(to_item(cur.fetchone()))
            conn.commit()
            return resp(200, {'items': created, 'count': len(created)})

        if method == 'POST':
            if not body.get('objectTitle'):
                return resp(400, {'error': 'object_required'})
            if not body.get('content'):
                return resp(400, {'error': 'content_required'})
            rid = uuid.uuid4().hex[:12]
            date = body.get('date')
            date_sql = f"'{esc(date)}'" if date else 'CURRENT_DATE'
            cols = ['id', 'entry_date', 'updated_by'] + list(FIELDS.values())
            vals = [f"'{esc(rid)}'", date_sql, f"'{esc(body.get('authorFio', ''))}'"] + [
                f"'{esc(body.get(k, ''))}'" for k in FIELDS
            ]
            cur.execute(
                f"INSERT INTO inspector_journal ({', '.join(cols)}) "
                f"VALUES ({', '.join(vals)}) RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_item(cur.fetchone())})

        if method == 'PUT':
            rid = body.get('id') or ''
            if not rid:
                return resp(400, {'error': 'id_required'})
            sets = [f"{c} = '{esc(body[k])}'" for k, c in FIELDS.items() if k in body]
            if body.get('date'):
                sets.append(f"entry_date = '{esc(body['date'])}'")
            sets.append(f"updated_by = '{esc(body.get('updatedBy', ''))}'")
            sets.append('updated_at = NOW()')
            cur.execute(
                f"UPDATE inspector_journal SET {', '.join(sets)} "
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
            cur.execute(f"DELETE FROM inspector_journal WHERE id = '{esc(rid)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()