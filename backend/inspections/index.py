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


def esc(v):
    return str(v if v is not None else '').replace("'", "''")


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body)}


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def to_insp(r):
    return {
        'id': r['id'],
        'objectId': r['object_id'],
        'number': r['number'],
        'workType': r['work_type'],
        'docRef': r['doc_ref'],
        'contractorRep': r['contractor_rep'],
        'inspector': r['inspector'],
        'status': r['status'],
        'note': r['note'],
        'actUrl': r['act_url'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def to_defect(r):
    photos = r['photos']
    return {
        'id': r['id'],
        'inspectionId': r['inspection_id'],
        'pos': r['pos'],
        'title': r['title'],
        'deadline': r['deadline'],
        'photos': photos if isinstance(photos, list) else json.loads(photos or '[]'),
    }


def next_number(cur, table, object_id):
    year = datetime.now().year
    cur.execute(f"SELECT COUNT(*) AS c FROM {table} WHERE object_id = '{esc(object_id)}'")
    return f"{cur.fetchone()['c'] + 1:03d}-{year}"


def handler(event: dict, context) -> dict:
    """Осмотры объекта: создание акта, замечания с фото, выгрузка снимков в хранилище."""
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
            insp_id = params.get('id', '')
            if insp_id:
                cur.execute(f"SELECT * FROM inspections WHERE id = '{esc(insp_id)}'")
                row = cur.fetchone()
                if not row:
                    return resp(404, {'error': 'not_found'})
                cur.execute(
                    f"SELECT * FROM inspection_defects WHERE inspection_id = '{esc(insp_id)}' ORDER BY pos"
                )
                return resp(200, {
                    'item': to_insp(row),
                    'defects': [to_defect(d) for d in cur.fetchall()],
                })
            where = f"WHERE object_id = '{esc(object_id)}'" if object_id else ''
            cur.execute(f'SELECT * FROM inspections {where} ORDER BY created_at DESC')
            return resp(200, {'items': [to_insp(r) for r in cur.fetchall()]})

        if method == 'POST' and action == 'photo':
            defect_id = body.get('defectId', '')
            content = body.get('content', '')
            if not defect_id or not content:
                return resp(400, {'error': 'defect_and_content_required'})
            raw = base64.b64decode(content.split(',')[-1])
            key = f"inspections/{body.get('inspectionId', 'x')}/{defect_id}/{uuid.uuid4().hex[:10]}.jpg"
            s3_client().put_object(Bucket='files', Key=key, Body=raw, ContentType='image/jpeg')
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            cur.execute(
                f"UPDATE inspection_defects SET photos = photos || '{esc(json.dumps([url]))}'::jsonb "
                f"WHERE id = '{esc(defect_id)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'defect_not_found'})
            return resp(200, {'url': url, 'defect': to_defect(row)})

        if method == 'POST' and action == 'defect':
            insp_id = body.get('inspectionId', '')
            if not insp_id:
                return resp(400, {'error': 'inspection_required'})
            cur.execute(
                f"SELECT COALESCE(MAX(pos), 0) + 1 AS p FROM inspection_defects WHERE inspection_id = '{esc(insp_id)}'"
            )
            pos = cur.fetchone()['p']
            did = uuid.uuid4().hex[:12]
            cur.execute(
                'INSERT INTO inspection_defects (id, inspection_id, pos, title, deadline) VALUES ('
                f"'{esc(did)}', '{esc(insp_id)}', {pos}, '{esc(body.get('title', ''))}', "
                f"'{esc(body.get('deadline', ''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'defect': to_defect(cur.fetchone())})

        if method == 'POST':
            object_id = body.get('objectId', '')
            if not object_id:
                return resp(400, {'error': 'object_required'})
            insp_id = uuid.uuid4().hex[:12]
            number = next_number(cur, 'inspections', object_id)
            cur.execute(
                'INSERT INTO inspections (id, object_id, number, work_type, doc_ref, '
                'contractor_rep, inspector, status, note) VALUES ('
                f"'{esc(insp_id)}', '{esc(object_id)}', '{esc(number)}', "
                f"'{esc(body.get('workType', ''))}', '{esc(body.get('docRef', ''))}', "
                f"'{esc(body.get('contractorRep', ''))}', '{esc(body.get('inspector', ''))}', "
                f"'draft', '{esc(body.get('note', ''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_insp(cur.fetchone())})

        if method == 'PUT' and action == 'defect':
            did = body.get('id', '')
            sets = []
            if 'title' in body:
                sets.append(f"title = '{esc(body['title'])}'")
            if 'deadline' in body:
                sets.append(f"deadline = '{esc(body['deadline'])}'")
            if 'photos' in body:
                sets.append(f"photos = '{esc(json.dumps(body['photos']))}'::jsonb")
            if not sets or not did:
                return resp(400, {'error': 'nothing_to_update'})
            cur.execute(
                f"UPDATE inspection_defects SET {', '.join(sets)} WHERE id = '{esc(did)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'defect': to_defect(row)} if row else {'error': 'not_found'})

        if method == 'PUT':
            insp_id = body.get('id', '')
            patch = body.get('patch') or {}
            cols = {
                'workType': 'work_type',
                'docRef': 'doc_ref',
                'contractorRep': 'contractor_rep',
                'inspector': 'inspector',
                'status': 'status',
                'note': 'note',
                'actUrl': 'act_url',
            }
            sets = [f"{cols[k]} = '{esc(v)}'" for k, v in patch.items() if k in cols]
            if not sets or not insp_id:
                return resp(400, {'error': 'nothing_to_update'})
            cur.execute(
                f"UPDATE inspections SET {', '.join(sets)} WHERE id = '{esc(insp_id)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': to_insp(row)} if row else {'error': 'not_found'})

        if method == 'DELETE':
            did = params.get('defect_id', '')
            insp_id = params.get('id', '')
            if did:
                cur.execute(f"DELETE FROM inspection_defects WHERE id = '{esc(did)}'")
            elif insp_id:
                cur.execute(f"DELETE FROM inspection_defects WHERE inspection_id = '{esc(insp_id)}'")
                cur.execute(f"DELETE FROM inspections WHERE id = '{esc(insp_id)}'")
            else:
                return resp(400, {'error': 'id_required'})
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
