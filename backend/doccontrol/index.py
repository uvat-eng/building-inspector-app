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

CHECK_TEXT = {
    'contractor': 'contractor',
    'objectTitle': 'object_title',
    'section': 'section',
    'folder': 'folder',
    'repNtn': 'rep_ntn',
    'date1': 'date1',
    'date2': 'date2',
    'authorId': 'author_id',
    'authorFio': 'author_fio',
}
CHECK_NUM = {
    'planned': 'planned',
    'archived': 'archived',
    'certs': 'certs',
    'sent1': 'sent1',
    'back1': 'back1',
    'issued1': 'issued1',
    'sent2': 'sent2',
    'back2': 'back2',
    'open2': 'open2',
    'issued2': 'issued2',
}

DEFECT_TEXT = {
    'checkId': 'check_id',
    'contractor': 'contractor',
    'objectTitle': 'object_title',
    'position': 'position',
    'content': 'content',
    'recordedBy': 'recorded_by',
    'ackBy': 'ack_by',
    'fixStatus': 'fix_status',
    'fixDate': 'fix_date',
    'authorId': 'author_id',
    'authorFio': 'author_fio',
}

FILE_TEXT = {
    'contractor': 'contractor',
    'kind': 'kind',
    'title': 'title',
    'fileName': 'file_name',
    'url': 'url',
    'note': 'note',
    'uploadedBy': 'uploaded_by',
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


def row_out(r, text_map, num_map=None):
    out = {k: r[c] if r[c] is not None else '' for k, c in text_map.items()}
    for k, c in (num_map or {}).items():
        out[k] = r[c] or 0
    out['id'] = r['id']
    out['createdAt'] = r['created_at'].isoformat() if r.get('created_at') else ''
    if 'entry_date' in r:
        out['date'] = r['entry_date'].isoformat() if r['entry_date'] else ''
    if 'size_kb' in r:
        out['sizeKb'] = r['size_kb'] or 0
    return out


def insert(cur, table, text_map, num_map, body, extra=None):
    rid = uuid.uuid4().hex[:12]
    cols = ['id'] + list(text_map.values()) + list((num_map or {}).values())
    vals = [f"'{esc(rid)}'"] + [f"'{esc(body.get(k, ''))}'" for k in text_map]
    vals += [str(num(body.get(k))) for k in (num_map or {})]
    for col, raw in (extra or {}).items():
        cols.append(col)
        vals.append(raw)
    cur.execute(
        f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(vals)}) RETURNING *"
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    """Отчёт по документации: проверки ИТД и ПСД, замечания и загруженные файлы подрядчиков."""
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

    kind = params.get('kind') or body.get('kind') or 'all'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if method == 'GET':
            cur.execute('SELECT * FROM doc_checks ORDER BY created_at DESC LIMIT 2000')
            checks = [row_out(r, CHECK_TEXT, CHECK_NUM) for r in cur.fetchall()]
            cur.execute(
                'SELECT * FROM doc_defects ORDER BY entry_date DESC, created_at DESC LIMIT 3000'
            )
            defects = [row_out(r, DEFECT_TEXT) for r in cur.fetchall()]
            cur.execute('SELECT * FROM doc_files ORDER BY created_at DESC LIMIT 1000')
            files = [row_out(r, FILE_TEXT) for r in cur.fetchall()]
            return resp(200, {'checks': checks, 'defects': defects, 'files': files})

        if method == 'POST' and kind == 'upload':
            content = base64.b64decode(body.get('fileBase64', ''))
            name = body.get('fileName') or 'file.xlsx'
            safe = ''.join(c for c in name if c.isalnum() or c in ' .-_()').strip() or 'file.xlsx'
            key = f"docs/{datetime.now().strftime('%Y%m')}/{uuid.uuid4().hex[:8]}-{safe}"
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
                ContentType=body.get('mime')
                or 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            row = insert(
                cur,
                'doc_files',
                FILE_TEXT,
                None,
                {**body, 'fileName': name, 'url': url},
                {'size_kb': str(max(1, len(content) // 1024))},
            )
            conn.commit()
            return resp(200, {'item': row_out(row, FILE_TEXT)})

        if method == 'POST' and kind == 'check':
            if not body.get('contractor'):
                return resp(400, {'error': 'contractor_required'})
            row = insert(cur, 'doc_checks', CHECK_TEXT, CHECK_NUM, body)
            conn.commit()
            return resp(200, {'item': row_out(row, CHECK_TEXT, CHECK_NUM)})

        if method == 'POST' and kind == 'defect':
            if not body.get('content'):
                return resp(400, {'error': 'content_required'})
            date = body.get('date')
            extra = {'entry_date': f"'{esc(date)}'" if date else 'CURRENT_DATE'}
            row = insert(cur, 'doc_defects', DEFECT_TEXT, None, body, extra)
            conn.commit()
            return resp(200, {'item': row_out(row, DEFECT_TEXT)})

        if method == 'PUT':
            rid = body.get('id') or ''
            if not rid:
                return resp(400, {'error': 'id_required'})
            if kind == 'check':
                sets = [f"{c} = '{esc(body[k])}'" for k, c in CHECK_TEXT.items() if k in body]
                sets += [f'{c} = {num(body[k])}' for k, c in CHECK_NUM.items() if k in body]
                table, tmap, nmap = 'doc_checks', CHECK_TEXT, CHECK_NUM
            elif kind == 'defect':
                sets = [f"{c} = '{esc(body[k])}'" for k, c in DEFECT_TEXT.items() if k in body]
                if body.get('date'):
                    sets.append(f"entry_date = '{esc(body['date'])}'")
                table, tmap, nmap = 'doc_defects', DEFECT_TEXT, None
            else:
                sets = [f"{c} = '{esc(body[k])}'" for k, c in FILE_TEXT.items() if k in body]
                table, tmap, nmap = 'doc_files', FILE_TEXT, None
            if not sets:
                return resp(400, {'error': 'nothing_to_update'})
            cur.execute(
                f"UPDATE {table} SET {', '.join(sets)} WHERE id = '{esc(rid)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': row_out(row, tmap, nmap)})

        if method == 'DELETE':
            rid = params.get('id') or ''
            table = {
                'check': 'doc_checks',
                'defect': 'doc_defects',
                'file': 'doc_files',
            }.get(kind)
            if not rid or not table:
                return resp(400, {'error': 'id_required'})
            cur.execute(f"DELETE FROM {table} WHERE id = '{esc(rid)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
