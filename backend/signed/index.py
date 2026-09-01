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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

SECTIONS = {'tests', 'ks2', 'incoming', 'm19m29', 'pos_ppr'}


def esc(v):
    return str(v if v is not None else '').replace("'", "''")


def resp(code, body):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False),
    }


def s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def to_doc(r):
    return {
        'id': r['id'],
        'objectId': r['object_id'],
        'section': r['section'],
        'period': r['period'],
        'title': r['title'],
        'fileUrl': r['file_url'],
        'fileName': r['file_name'],
        'mime': r['mime'],
        'fileSize': int(r['file_size'] or 0),
        'note': r['note'],
        'uploadedBy': r['uploaded_by'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def handler(event: dict, context) -> dict:
    """Подписанные документы объекта по разделам и папкам месяцев: список, загрузка, удаление."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if method == 'GET':
            object_id = params.get('object_id') or ''
            if not object_id:
                return resp(400, {'error': 'object_id_required'})
            where = f"WHERE object_id = '{esc(object_id)}'"
            section = params.get('section') or ''
            if section:
                where += f" AND section = '{esc(section)}'"
            cur.execute(f'SELECT * FROM signed_docs {where} ORDER BY created_at DESC')
            return resp(200, {'items': [to_doc(r) for r in cur.fetchall()]})

        if method == 'POST':
            object_id = body.get('objectId', '')
            section = body.get('section', '')
            content = body.get('content', '')
            if not object_id or section not in SECTIONS:
                return resp(400, {'error': 'object_and_section_required'})
            if not content:
                return resp(400, {'error': 'content_required'})

            name = str(body.get('fileName') or 'document')
            mime = str(body.get('mime') or 'image/jpeg')
            ext = name.rsplit('.', 1)[-1].lower() if '.' in name else 'jpg'
            if len(ext) > 5:
                ext = 'jpg'
            raw = base64.b64decode(content.split(',')[-1])
            period = str(body.get('period') or datetime.now().strftime('%Y-%m'))
            key = f'signed/{object_id}/{section}/{period}/{uuid.uuid4().hex[:12]}.{ext}'
            s3().put_object(Bucket='files', Key=key, Body=raw, ContentType=mime)
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            doc_id = f'sd-{uuid.uuid4().hex[:12]}'
            cur.execute(
                'INSERT INTO signed_docs (id, object_id, section, period, title, file_url, '
                'file_name, mime, file_size, note, uploaded_by) VALUES ('
                f"'{esc(doc_id)}', '{esc(object_id)}', '{esc(section)}', '{esc(period)}', "
                f"'{esc(body.get('title', ''))}', '{esc(url)}', '{esc(name)}', '{esc(mime)}', "
                f"{len(raw)}, '{esc(body.get('note', ''))}', "
                f"'{esc(body.get('uploadedBy', ''))}') RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': to_doc(row)})

        if method == 'DELETE':
            doc_id = params.get('id') or ''
            if not doc_id:
                return resp(400, {'error': 'id_required'})
            cur.execute(f"DELETE FROM signed_docs WHERE id = '{esc(doc_id)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
