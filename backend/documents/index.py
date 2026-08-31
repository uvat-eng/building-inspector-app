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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

SECTIONS = {'project', 'working', 'masterplan', 'contract'}


def esc(v):
    return str(v).replace("'", "''")


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body)}


def row_to_doc(r):
    return {
        'id': r['id'],
        'objectId': r['object_id'],
        'section': r['section'],
        'title': r['title'],
        'fileName': r['file_name'],
        'fileUrl': r['file_url'],
        'fileSize': int(r['file_size'] or 0),
        'mime': r['mime'],
        'note': r['note'],
        'uploadedBy': r['uploaded_by'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def safe_name(name: str) -> str:
    cleaned = re.sub(r'[^A-Za-z0-9._-]+', '_', name).strip('_')
    return cleaned or 'file'


def handler(event: dict, context) -> dict:
    """Проектная и рабочая документация объекта: список, загрузка файла и удаление."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            object_id = params.get('object_id', '')
            where = f"WHERE object_id = '{esc(object_id)}'" if object_id else ''
            cur.execute(f'SELECT * FROM documents {where} ORDER BY created_at DESC')
            return resp(200, {'items': [row_to_doc(r) for r in cur.fetchall()]})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            object_id = body.get('objectId', '')
            section = body.get('section', '')
            file_name = body.get('fileName', '')
            content = body.get('content', '')

            if not object_id or section not in SECTIONS:
                return resp(400, {'error': 'object_id_and_section_required'})
            if not file_name or not content:
                return resp(400, {'error': 'file_required'})

            raw = base64.b64decode(content.split(',')[-1])
            doc_id = uuid.uuid4().hex[:12]
            key = f'docs/{object_id}/{section}/{doc_id}_{safe_name(file_name)}'
            mime = body.get('mime') or 'application/octet-stream'

            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=mime)
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            cur.execute(
                'INSERT INTO documents (id, object_id, section, title, file_name, file_url, '
                'file_size, mime, note, uploaded_by) VALUES ('
                f"'{esc(doc_id)}', '{esc(object_id)}', '{esc(section)}', "
                f"'{esc(body.get('title') or file_name)}', '{esc(file_name)}', '{esc(url)}', "
                f"{len(raw)}, '{esc(mime)}', '{esc(body.get('note', ''))}', "
                f"'{esc(body.get('uploadedBy', ''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': row_to_doc(cur.fetchone())})

        if method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            doc_id = params.get('id', '')
            if not doc_id:
                return resp(400, {'error': 'id_required'})
            cur.execute(f"DELETE FROM documents WHERE id = '{esc(doc_id)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()