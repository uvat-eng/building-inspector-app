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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

STATUSES = ('open', 'work', 'done', 'canceled')


def esc(v):
    return str(v).replace("'", "''")


def dt(v):
    s = str(v or '').strip()[:10]
    return f"'{esc(s)}'" if re.match(r'^\d{4}-\d{2}-\d{2}$', s) else 'NULL'


def resp(code, body):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def safe_name(name):
    cleaned = re.sub(r'[^A-Za-z0-9._-]+', '_', str(name)).strip('_')
    return cleaned or 'file'


def upload(file_name, content, mime, folder):
    raw = base64.b64decode(str(content).split(',')[-1])
    key = f'letters/{folder}/{uuid.uuid4().hex[:8]}_{safe_name(file_name)}'
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=mime or 'application/octet-stream')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def row_letter(r):
    return {
        'id': r['id'],
        'kind': r['kind'],
        'number': r['number'],
        'letterDate': str(r['letter_date'] or ''),
        'ym': r['ym'],
        'sender': r['sender'],
        'subject': r['subject'],
        'objectId': r['object_id'],
        'fieldKey': r['field_key'],
        'note': r['note'],
        'fileUrl': r['file_url'],
        'fileName': r['file_name'],
        'dueAt': str(r['due_at'] or ''),
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def row_reply(r):
    return {
        'id': r['id'],
        'letterId': r['letter_id'],
        'number': r['number'],
        'replyDate': str(r['reply_date'] or ''),
        'subject': r['subject'],
        'note': r['note'],
        'fileUrl': r['file_url'],
        'fileName': r['file_name'],
        'author': r['author'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def row_point(r):
    return {
        'id': r['id'],
        'letterId': r['letter_id'],
        'num': r['num'],
        'text': r['text'],
        'responsible': r['responsible'],
        'dueAt': str(r['due_at'] or ''),
        'status': r['status'],
        'statusNote': r['status_note'],
        'statusBy': r['status_by'],
        'statusAt': r['status_at'].isoformat() if r['status_at'] else '',
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def ym_of(value):
    s = str(value or '')[:7]
    return s if re.match(r'^\d{4}-\d{2}$', s) else ''


def handler(event: dict, context) -> dict:
    """Переписка с заказчиком: входящие письма, ответы, протоколы и статусы пунктов."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}')
    kind = params.get('kind') or body.get('kind') or 'letter'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            cur.execute('SELECT * FROM cust_letters ORDER BY letter_date DESC NULLS LAST')
            letters = [row_letter(r) for r in cur.fetchall()]
            cur.execute('SELECT * FROM cust_replies ORDER BY reply_date DESC NULLS LAST')
            replies = [row_reply(r) for r in cur.fetchall()]
            cur.execute('SELECT * FROM cust_points ORDER BY num')
            points = [row_point(r) for r in cur.fetchall()]
            return resp(200, {'letters': letters, 'replies': replies, 'points': points})

        if method == 'POST' and kind in ('letter', 'protocol'):
            lid = uuid.uuid4().hex[:12]
            url = ''
            if body.get('content') and body.get('fileName'):
                url = upload(body['fileName'], body['content'], body.get('mime'), lid)
            ym = ym_of(body.get('letterDate'))
            cur.execute(
                'INSERT INTO cust_letters (id, kind, number, letter_date, ym, sender, subject, '
                'object_id, field_key, note, file_url, file_name, due_at, author) VALUES ('
                f"'{esc(lid)}', '{esc(kind)}', '{esc(body.get('number', ''))}', "
                f"{dt(body.get('letterDate'))}, '{esc(ym)}', '{esc(body.get('sender', ''))}', "
                f"'{esc(body.get('subject', ''))}', '{esc(body.get('objectId', ''))}', "
                f"'{esc(body.get('fieldKey', ''))}', '{esc(body.get('note', ''))}', "
                f"'{esc(url)}', '{esc(body.get('fileName', ''))}', {dt(body.get('dueAt'))}, "
                f"'{esc(body.get('author', ''))}') RETURNING *"
            )
            item = row_letter(cur.fetchone())

            created = []
            for i, p in enumerate(body.get('points') or [], 1):
                pid = uuid.uuid4().hex[:12]
                cur.execute(
                    'INSERT INTO cust_points (id, letter_id, num, text, responsible, due_at, '
                    'status) VALUES ('
                    f"'{esc(pid)}', '{esc(lid)}', '{esc(p.get('num') or i)}', "
                    f"'{esc(p.get('text', ''))}', '{esc(p.get('responsible', ''))}', "
                    f"{dt(p.get('dueAt'))}, 'open') RETURNING *"
                )
                created.append(row_point(cur.fetchone()))
            conn.commit()
            return resp(200, {'item': item, 'points': created})

        if method == 'POST' and kind == 'reply':
            letter_id = body.get('letterId', '')
            if not letter_id:
                return resp(400, {'error': 'letter_required'})
            rid = uuid.uuid4().hex[:12]
            url = ''
            if body.get('content') and body.get('fileName'):
                url = upload(body['fileName'], body['content'], body.get('mime'), letter_id)
            cur.execute(
                'INSERT INTO cust_replies (id, letter_id, number, reply_date, subject, note, '
                'file_url, file_name, author) VALUES ('
                f"'{esc(rid)}', '{esc(letter_id)}', '{esc(body.get('number', ''))}', "
                f"{dt(body.get('replyDate'))}, '{esc(body.get('subject', ''))}', "
                f"'{esc(body.get('note', ''))}', '{esc(url)}', "
                f"'{esc(body.get('fileName', ''))}', '{esc(body.get('author', ''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': row_reply(cur.fetchone())})

        if method == 'POST' and kind == 'point':
            letter_id = body.get('letterId', '')
            if not letter_id:
                return resp(400, {'error': 'letter_required'})
            pid = uuid.uuid4().hex[:12]
            cur.execute(
                'INSERT INTO cust_points (id, letter_id, num, text, responsible, due_at, status) '
                f"VALUES ('{esc(pid)}', '{esc(letter_id)}', '{esc(body.get('num', ''))}', "
                f"'{esc(body.get('text', ''))}', '{esc(body.get('responsible', ''))}', "
                f"{dt(body.get('dueAt'))}, 'open') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': row_point(cur.fetchone())})

        if method == 'PUT':
            item_id = body.get('id', '')
            patch = body.get('patch') or {}
            if not item_id or not patch:
                return resp(400, {'error': 'id_and_patch_required'})

            if kind == 'point':
                sets = []
                for k, col in (('num', 'num'), ('text', 'text'),
                               ('responsible', 'responsible'), ('statusNote', 'status_note'),
                               ('statusBy', 'status_by')):
                    if k in patch:
                        sets.append(f"{col} = '{esc(patch[k])}'")
                if 'dueAt' in patch:
                    sets.append(f"due_at = {dt(patch['dueAt'])}")
                if 'status' in patch:
                    st = patch['status'] if patch['status'] in STATUSES else 'open'
                    sets.append(f"status = '{esc(st)}'")
                    sets.append('status_at = now()')
                if not sets:
                    return resp(400, {'error': 'empty_patch'})
                cur.execute(
                    f"UPDATE cust_points SET {', '.join(sets)} "
                    f"WHERE id = '{esc(item_id)}' RETURNING *"
                )
                row = cur.fetchone()
                conn.commit()
                return resp(200, {'item': row_point(row)}) if row else resp(404, {'error': 'not_found'})

            sets = []
            for k, col in (('number', 'number'), ('sender', 'sender'), ('subject', 'subject'),
                           ('note', 'note'), ('objectId', 'object_id'), ('fieldKey', 'field_key')):
                if k in patch:
                    sets.append(f"{col} = '{esc(patch[k])}'")
            if 'letterDate' in patch:
                sets.append(f"letter_date = {dt(patch['letterDate'])}")
                sets.append(f"ym = '{esc(ym_of(patch['letterDate']))}'")
            if 'dueAt' in patch:
                sets.append(f"due_at = {dt(patch['dueAt'])}")
            if not sets:
                return resp(400, {'error': 'empty_patch'})
            cur.execute(
                f"UPDATE cust_letters SET {', '.join(sets)} "
                f"WHERE id = '{esc(item_id)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': row_letter(row)}) if row else resp(404, {'error': 'not_found'})

        if method == 'DELETE':
            item_id = params.get('id') or body.get('id') or ''
            if not item_id:
                return resp(400, {'error': 'id_required'})
            if kind == 'reply':
                cur.execute(f"DELETE FROM cust_replies WHERE id = '{esc(item_id)}'")
            elif kind == 'point':
                cur.execute(f"DELETE FROM cust_points WHERE id = '{esc(item_id)}'")
            else:
                cur.execute(f"DELETE FROM cust_replies WHERE letter_id = '{esc(item_id)}'")
                cur.execute(f"DELETE FROM cust_points WHERE letter_id = '{esc(item_id)}'")
                cur.execute(f"DELETE FROM cust_letters WHERE id = '{esc(item_id)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
