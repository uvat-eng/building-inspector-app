import base64
import json
import os
import re
import time
import uuid

import boto3
import psycopg2
import psycopg2.extras

from xls_parser import parse_workbook

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def esc(v) -> str:
    return "'" + str(v if v is not None else '').replace("'", "''") + "'"


def resp(code: int, body: dict) -> dict:
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False),
    }


def to_report(r) -> dict:
    return {
        'id': r['id'],
        'objectId': r['object_id'],
        'date': r['report_date'].isoformat() if r['report_date'] else '',
        'author': r['author'],
        'note': r['note'],
        'rows': r['rows_json'] or [],
        'fileUrl': r.get('file_url') or '',
        'fileName': r.get('file_name') or '',
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
        'updatedAt': r['updated_at'].isoformat() if r['updated_at'] else '',
    }


def handler(event: dict, context) -> dict:
    """Ежедневные отчёты инспектора по предписаниям: список по объекту, создание, правка, удаление."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT', 'DELETE') else {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            object_id = params.get('object_id') or ''
            where = f'WHERE object_id = {esc(object_id)}' if object_id else ''
            cur.execute(
                f'SELECT * FROM daily_reports {where} ORDER BY report_date DESC, created_at DESC'
            )
            return resp(200, {'items': [to_report(r) for r in cur.fetchall()]})

        if method == 'POST' and body.get('kind') == 'photo':
            content = body.get('content') or ''
            file_name = body.get('fileName') or 'photo.jpg'
            if not content:
                return resp(400, {'error': 'file_required'})
            raw = base64.b64decode(content.split(',')[-1])
            safe = re.sub(r'[^A-Za-z0-9._-]+', '_', file_name)[-60:]
            key = f"reports/{body.get('objectId') or 'common'}/{uuid.uuid4().hex[:12]}_{safe}"
            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.put_object(
                Bucket='files', Key=key, Body=raw, ContentType=body.get('mime') or 'image/jpeg'
            )
            base = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket"
            return resp(200, {'url': f'{base}/{key}'})

        if method == 'POST' and body.get('kind') == 'import':
            content = body.get('content') or ''
            file_name = body.get('fileName') or 'report.xlsx'
            object_id = body.get('objectId') or ''
            if not content or not object_id:
                return resp(400, {'error': 'file_and_object_required'})

            raw = base64.b64decode(content.split(',')[-1])
            parsed = parse_workbook(raw)
            if not parsed['rows']:
                return resp(400, {'error': 'no_rows_found'})

            safe = re.sub(r'[^A-Za-z0-9._-]+', '_', file_name)[-70:]
            key = f'reports/{object_id}/src/{uuid.uuid4().hex[:12]}_{safe}'
            s3 = boto3.client(
                's3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            )
            s3.put_object(
                Bucket='files',
                Key=key,
                Body=raw,
                ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            base = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket"

            rid = f'rep-{int(time.time() * 1000)}'
            date = body.get('date') or parsed['date'] or ''
            if not date:
                return resp(400, {'error': 'date_not_found'})
            rows_json = json.dumps(parsed['rows'], ensure_ascii=False)
            cur.execute(
                'INSERT INTO daily_reports '
                '(id, object_id, report_date, author, note, rows_json, file_url, file_name) '
                f"VALUES ({esc(rid)}, {esc(object_id)}, {esc(date)}::date, "
                f"{esc(parsed['author'])}, {esc(body.get('note') or '')}, "
                f"{esc(rows_json)}::jsonb, {esc(base + '/' + key)}, {esc(file_name)}) "
                'RETURNING *'
            )
            return resp(200, {'item': to_report(cur.fetchone())})

        if method == 'POST':
            rid = (body.get('id') or '').strip() or f"rep-{int(time.time() * 1000)}"
            rows = json.dumps(body.get('rows') or [], ensure_ascii=False)
            cur.execute(
                'INSERT INTO daily_reports '
                '(id, object_id, report_date, author, note, rows_json) VALUES ('
                f"{esc(rid)}, {esc(body.get('objectId'))}, {esc(body.get('date'))}::date, "
                f"{esc(body.get('author') or '')}, {esc(body.get('note') or '')}, "
                f'{esc(rows)}::jsonb) '
                'ON CONFLICT (id) DO UPDATE SET report_date = EXCLUDED.report_date, '
                'author = EXCLUDED.author, note = EXCLUDED.note, '
                'rows_json = EXCLUDED.rows_json, updated_at = NOW() '
                'RETURNING *'
            )
            return resp(200, {'item': to_report(cur.fetchone())})

        if method == 'PUT':
            rid = body.get('id') or ''
            sets = ['updated_at = NOW()']
            if 'date' in body:
                sets.append(f"report_date = {esc(body['date'])}::date")
            if 'author' in body:
                sets.append(f"author = {esc(body['author'])}")
            if 'note' in body:
                sets.append(f"note = {esc(body['note'])}")
            if 'rows' in body:
                rows = json.dumps(body['rows'] or [], ensure_ascii=False)
                sets.append(f'rows_json = {esc(rows)}::jsonb')
            cur.execute(
                f"UPDATE daily_reports SET {', '.join(sets)} WHERE id = {esc(rid)} RETURNING *"
            )
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': to_report(row)})

        if method == 'DELETE':
            rid = body.get('id') or params.get('id') or ''
            cur.execute(f'DELETE FROM daily_reports WHERE id = {esc(rid)}')
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()