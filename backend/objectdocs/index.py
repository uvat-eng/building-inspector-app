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

TEXT = {
    'section': 'section',
    'objectId': 'object_id',
    'objectTitle': 'object_title',
    'contractor': 'contractor',
    'title': 'title',
    'docNumber': 'doc_number',
    'docDate': 'doc_date',
    'period': 'period',
    'note': 'note',
    'status': 'status',
    'fileName': 'file_name',
    'url': 'url',
    'mime': 'mime',
    'uploadedBy': 'uploaded_by',
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
    out = {k: r[c] if r[c] is not None else '' for k, c in TEXT.items()}
    summary = r['summary']
    out['id'] = r['id']
    out['sizeKb'] = r['size_kb'] or 0
    out['version'] = r['version'] or 1
    out['summary'] = summary if isinstance(summary, dict) else json.loads(summary or '{}')
    out['createdAt'] = r['created_at'].isoformat() if r['created_at'] else ''
    out['updatedAt'] = r['updated_at'].isoformat() if r['updated_at'] else ''
    return out


def handler(event: dict, context) -> dict:
    """Документы объектов: отчётные таблицы, акты дубля геодезии и контрольные карточки."""
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
            if params.get('section'):
                conds.append(f"section = '{esc(params['section'])}'")
            if params.get('object_id'):
                conds.append(f"object_id = '{esc(params['object_id'])}'")
            where = f"WHERE {' AND '.join(conds)}" if conds else ''
            cur.execute(
                f'SELECT * FROM object_docs {where} ORDER BY created_at DESC LIMIT 2000'
            )
            return resp(200, {'items': [to_item(r) for r in cur.fetchall()]})

        if method == 'POST':
            if not body.get('fileBase64'):
                return resp(400, {'error': 'file_required'})
            content = base64.b64decode(body['fileBase64'])
            name = body.get('fileName') or 'document'
            safe = ''.join(c for c in name if c.isalnum() or c in ' .-_()').strip() or 'document'
            section = body.get('section') or 'tables'
            obj = ''.join(
                c for c in (body.get('objectTitle') or 'common') if c.isalnum() or c in ' -_'
            ).strip()[:40] or 'common'
            key = (
                f"objectdocs/{section}/{obj}/"
                f"{datetime.now().strftime('%Y%m')}/{uuid.uuid4().hex[:8]}-{safe}"
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
                ContentType=body.get('mime') or 'application/octet-stream',
            )
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            version = 1
            if body.get('objectId') and body.get('title'):
                cur.execute(
                    "SELECT COUNT(*) AS c FROM object_docs WHERE section = "
                    f"'{esc(section)}' AND object_id = '{esc(body['objectId'])}' "
                    f"AND title = '{esc(body['title'])}'"
                )
                version = cur.fetchone()['c'] + 1

            rid = uuid.uuid4().hex[:12]
            data = {**body, 'fileName': name, 'url': url, 'section': section}
            cols = ['id', 'size_kb', 'version', 'summary'] + list(TEXT.values())
            vals = [
                f"'{esc(rid)}'",
                str(max(1, len(content) // 1024)),
                str(version),
                f"'{esc(json.dumps(body.get('summary') or {}, ensure_ascii=False))}'::jsonb",
            ] + [f"'{esc(data.get(k, ''))}'" for k in TEXT]
            cur.execute(
                f"INSERT INTO object_docs ({', '.join(cols)}) "
                f"VALUES ({', '.join(vals)}) RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_item(cur.fetchone())})

        if method == 'PUT':
            rid = body.get('id') or ''
            if not rid:
                return resp(400, {'error': 'id_required'})
            sets = [f"{c} = '{esc(body[k])}'" for k, c in TEXT.items() if k in body]
            if 'summary' in body:
                sets.append(
                    f"summary = '{esc(json.dumps(body['summary'], ensure_ascii=False))}'::jsonb"
                )
            if not sets:
                return resp(400, {'error': 'nothing_to_update'})
            sets.append('updated_at = NOW()')
            cur.execute(
                f"UPDATE object_docs SET {', '.join(sets)} WHERE id = '{esc(rid)}' RETURNING *"
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
            cur.execute(f"DELETE FROM object_docs WHERE id = '{esc(rid)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
