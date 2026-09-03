import base64
import json
import os
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
    return str(v if v is not None else '').replace("'", "''")


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body)}


def to_folder(r):
    return {
        'id': r['id'],
        'objectId': r['object_id'],
        'section': r['section'],
        'subsection': r['subsection'],
        'title': r['title'],
        'note': r['note'],
        'month': r.get('month') or '',
        'createdBy': r['created_by'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
        'meta': r.get('meta') or {},
        'photos': r.get('photos') or [],
    }


def handler(event: dict, context) -> dict:
    """Папки документов объекта с фотографиями: акты испытаний, КС-формы, входной контроль."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}
    action = params.get('action') or body.get('action') or ''

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            object_id = params.get('object_id', '')
            section = params.get('section', '')
            conds = []
            if object_id:
                conds.append(f"f.object_id = '{esc(object_id)}'")
            if section:
                conds.append(f"f.section = '{esc(section)}'")
            where = f"WHERE {' AND '.join(conds)}" if conds else ''
            cur.execute(
                'SELECT f.*, COALESCE(json_agg(json_build_object(\'id\', p.id, \'url\', p.url, '
                "'caption', p.caption) ORDER BY p.created_at) "
                "FILTER (WHERE p.id IS NOT NULL), '[]') AS photos "
                f'FROM photo_folders f LEFT JOIN folder_photos p ON p.folder_id = f.id {where} '
                'GROUP BY f.id ORDER BY f.created_at DESC'
            )
            return resp(200, {'items': [to_folder(r) for r in cur.fetchall()]})

        if method == 'POST' and action == 'photo':
            folder_id = body.get('folderId', '')
            content = body.get('content', '')
            if not folder_id or not content:
                return resp(400, {'error': 'folder_and_content_required'})
            raw = base64.b64decode(content.split(',')[-1])
            pid = uuid.uuid4().hex[:12]
            key = f'folders/{folder_id}/{pid}.jpg'
            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.put_object(Bucket='files', Key=key, Body=raw, ContentType='image/jpeg')
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            cur.execute(
                f"INSERT INTO folder_photos (id, folder_id, url, caption) VALUES ('{esc(pid)}', "
                f"'{esc(folder_id)}', '{esc(url)}', '{esc(body.get('caption', ''))}')"
            )
            conn.commit()
            return resp(200, {'id': pid, 'url': url, 'caption': body.get('caption', '')})

        if method == 'POST':
            object_id = body.get('objectId', '')
            section = body.get('section', '')
            title = body.get('title', '').strip()
            if not object_id or not section or not title:
                return resp(400, {'error': 'object_section_title_required'})
            fid = uuid.uuid4().hex[:12]
            cur.execute(
                'INSERT INTO photo_folders (id, object_id, section, subsection, title, note, '
                f"month, created_by, meta) VALUES ('{esc(fid)}', '{esc(object_id)}', '{esc(section)}', "
                f"'{esc(body.get('subsection', ''))}', '{esc(title)}', '{esc(body.get('note', ''))}', "
                f"'{esc(body.get('month', ''))}', '{esc(body.get('createdBy', ''))}', "
                f"'{esc(json.dumps(body.get('meta') or {}, ensure_ascii=False))}'::jsonb) RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_folder(cur.fetchone())})

        if method == 'PUT':
            fid = body.get('id', '')
            patch = body.get('patch') or {}
            cols = {'title': 'title', 'note': 'note'}
            sets = [f"{cols[k]} = '{esc(v)}'" for k, v in patch.items() if k in cols]
            if not sets or not fid:
                return resp(400, {'error': 'nothing_to_update'})
            cur.execute(
                f"UPDATE photo_folders SET {', '.join(sets)} WHERE id = '{esc(fid)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': to_folder(row)} if row else {'error': 'not_found'})

        if method == 'DELETE':
            photo_id = params.get('photo_id', '')
            fid = params.get('id', '')
            if photo_id:
                cur.execute(f"DELETE FROM folder_photos WHERE id = '{esc(photo_id)}'")
            elif fid:
                cur.execute(f"DELETE FROM folder_photos WHERE folder_id = '{esc(fid)}'")
                cur.execute(f"DELETE FROM photo_folders WHERE id = '{esc(fid)}'")
            else:
                return resp(400, {'error': 'id_required'})
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()