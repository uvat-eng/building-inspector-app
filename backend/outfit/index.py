import json
import os
import base64
import uuid
import datetime
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


def put_photo(prefix, content):
    raw = base64.b64decode(content.split(',')[-1])
    key = f"{prefix}/{uuid.uuid4().hex[:10]}.jpg"
    s3_client().put_object(Bucket='files', Key=key, Body=raw, ContentType='image/jpeg')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def add_months(date_str, months):
    try:
        d = datetime.date.fromisoformat(date_str)
    except (TypeError, ValueError):
        return ''
    y = d.year + (d.month - 1 + months) // 12
    m = (d.month - 1 + months) % 12 + 1
    day = min(d.day, [31, 29 if y % 4 == 0 and (y % 100 != 0 or y % 400 == 0) else 28,
                      31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1])
    return datetime.date(y, m, day).isoformat()


def to_ppe(r):
    return {
        'id': r['id'],
        'holderId': r['holder_id'] or '',
        'holderFio': r['holder_fio'] or '',
        'objectId': r['object_id'] or '',
        'title': r['title'] or '',
        'season': r['season'] or 'summer',
        'size': r['size'] or '',
        'qty': int(r['qty'] or 1),
        'issuedAt': r['issued_at'] or '',
        'wearMonths': int(r['wear_months'] or 24),
        'expiresAt': r['expires_at'] or '',
        'status': r['status'] or 'active',
        'note': r['note'] or '',
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def to_writeoff(r):
    return {
        'id': r['id'],
        'holderId': r['holder_id'] or '',
        'holderFio': r['holder_fio'] or '',
        'objectId': r['object_id'] or '',
        'itemIds': r['item_ids'] or [],
        'items': r['items'] or [],
        'reason': r['reason'] or '',
        'photos': r['photos'] or [],
        'status': r['status'] or 'review',
        'engineerFio': r['engineer_fio'] or '',
        'engineerAt': r['engineer_at'] or '',
        'managerFio': r['manager_fio'] or '',
        'managerAt': r['manager_at'] or '',
        'declineReason': r['decline_reason'] or '',
        'actNo': r['act_no'] or '',
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def to_equip(r):
    return {
        'id': r['id'],
        'holderId': r['holder_id'] or '',
        'holderFio': r['holder_fio'] or '',
        'objectId': r['object_id'] or '',
        'title': r['title'] or '',
        'invNo': r['inv_no'] or '',
        'serialNo': r['serial_no'] or '',
        'condition': r['condition'] or '',
        'verifiedAt': r['verified_at'] or '',
        'verifiedTo': r['verified_to'] or '',
        'photos': r['photos'] or [],
        'status': r['status'] or 'active',
        'receivedAt': r['received_at'] or '',
        'note': r['note'] or '',
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def to_move(r):
    return {
        'id': r['id'],
        'equipmentId': r['equipment_id'] or '',
        'fromId': r['from_id'] or '',
        'fromFio': r['from_fio'] or '',
        'toId': r['to_id'] or '',
        'toFio': r['to_fio'] or '',
        'objectId': r['object_id'] or '',
        'condition': r['condition'] or '',
        'photos': r['photos'] or [],
        'movedAt': r['moved_at'] or '',
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def handler(event: dict, context) -> dict:
    """Учёт спецодежды и оборудования инспектора: выдача, списание по согласованию, передача на вахте."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}
    kind = params.get('kind') or body.get('kind') or 'ppe'
    holder = params.get('holder_id', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            if kind == 'ppe':
                where = f"WHERE holder_id = '{esc(holder)}'" if holder else ''
                cur.execute(f'SELECT * FROM ppe_items {where} ORDER BY created_at DESC')
                return resp(200, {'items': [to_ppe(r) for r in cur.fetchall()]})

            if kind == 'writeoffs':
                where = f"WHERE holder_id = '{esc(holder)}'" if holder else ''
                cur.execute(f'SELECT * FROM ppe_writeoffs {where} ORDER BY created_at DESC')
                return resp(200, {'items': [to_writeoff(r) for r in cur.fetchall()]})

            if kind == 'equipment':
                where = f"WHERE holder_id = '{esc(holder)}'" if holder else ''
                cur.execute(f'SELECT * FROM equipment_items {where} ORDER BY created_at DESC')
                return resp(200, {'items': [to_equip(r) for r in cur.fetchall()]})

            if kind == 'moves':
                eq = params.get('equipment_id', '')
                where = f"WHERE equipment_id = '{esc(eq)}'" if eq else ''
                cur.execute(f'SELECT * FROM equipment_moves {where} ORDER BY created_at DESC')
                return resp(200, {'items': [to_move(r) for r in cur.fetchall()]})

            return resp(400, {'error': 'unknown_kind'})

        if method == 'POST' and kind == 'ppe':
            title = body.get('title', '')
            if not title:
                return resp(400, {'error': 'title_required'})
            pid = uuid.uuid4().hex[:12]
            issued = body.get('issuedAt') or datetime.date.today().isoformat()
            season = body.get('season') or 'summer'
            months = int(body.get('wearMonths') or (24 if season == 'winter' else 12))
            cur.execute(
                'INSERT INTO ppe_items (id, holder_id, holder_fio, object_id, title, season, '
                'size, qty, issued_at, wear_months, expires_at, note) VALUES ('
                f"'{esc(pid)}', '{esc(body.get('holderId',''))}', '{esc(body.get('holderFio',''))}', "
                f"'{esc(body.get('objectId',''))}', '{esc(title)}', '{esc(season)}', "
                f"'{esc(body.get('size',''))}', {int(body.get('qty') or 1)}, '{esc(issued)}', "
                f"{months}, '{esc(add_months(issued, months))}', '{esc(body.get('note',''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_ppe(cur.fetchone())})

        if method == 'POST' and kind == 'writeoff':
            ids = body.get('itemIds') or []
            if not ids:
                return resp(400, {'error': 'items_required'})
            photos = [put_photo('ppe/writeoff', p) for p in (body.get('photos') or []) if p]
            wid = uuid.uuid4().hex[:12]
            quoted = ', '.join(f"'{esc(i)}'" for i in ids)
            cur.execute(f'SELECT * FROM ppe_items WHERE id IN ({quoted})')
            snapshot = [
                {'title': r['title'], 'size': r['size'], 'qty': int(r['qty'] or 1),
                 'issuedAt': r['issued_at'], 'season': r['season']}
                for r in cur.fetchall()
            ]
            cur.execute(
                'INSERT INTO ppe_writeoffs (id, holder_id, holder_fio, object_id, item_ids, '
                'items, reason, photos, status) VALUES ('
                f"'{esc(wid)}', '{esc(body.get('holderId',''))}', '{esc(body.get('holderFio',''))}', "
                f"'{esc(body.get('objectId',''))}', '{esc(json.dumps(ids))}'::jsonb, "
                f"'{esc(json.dumps(snapshot, ensure_ascii=False))}'::jsonb, "
                f"'{esc(body.get('reason',''))}', '{esc(json.dumps(photos))}'::jsonb, 'review') RETURNING *"
            )
            row = cur.fetchone()
            cur.execute(f"UPDATE ppe_items SET status = 'pending' WHERE id IN ({quoted})")
            conn.commit()
            return resp(200, {'item': to_writeoff(row)})

        if method == 'PUT' and kind == 'writeoff':
            wid = body.get('id', '')
            step = body.get('step', '')
            who = esc(body.get('who', ''))
            now = datetime.datetime.now().isoformat(timespec='seconds')
            if step == 'engineer':
                cur.execute(
                    f"UPDATE ppe_writeoffs SET status = 'approval', engineer_fio = '{who}', "
                    f"engineer_at = '{now}' WHERE id = '{esc(wid)}' RETURNING *"
                )
            elif step == 'manager':
                cur.execute(f"SELECT COUNT(*) AS c FROM ppe_writeoffs WHERE status = 'done'")
                act_no = f"{cur.fetchone()['c'] + 1:03d}-{datetime.date.today().year}"
                cur.execute(
                    f"UPDATE ppe_writeoffs SET status = 'done', manager_fio = '{who}', "
                    f"manager_at = '{now}', act_no = '{esc(act_no)}' WHERE id = '{esc(wid)}' RETURNING *"
                )
                row = cur.fetchone()
                if row:
                    ids = row['item_ids'] or []
                    if ids:
                        quoted = ', '.join(f"'{esc(i)}'" for i in ids)
                        cur.execute(f"UPDATE ppe_items SET status = 'writeoff' WHERE id IN ({quoted})")
                conn.commit()
                return resp(200, {'item': to_writeoff(row)} if row else {'error': 'not_found'})
            elif step == 'decline':
                cur.execute(
                    f"UPDATE ppe_writeoffs SET status = 'declined', "
                    f"decline_reason = '{esc(body.get('reason',''))}' "
                    f"WHERE id = '{esc(wid)}' RETURNING *"
                )
                row = cur.fetchone()
                if row and (row['item_ids'] or []):
                    quoted = ', '.join(f"'{esc(i)}'" for i in row['item_ids'])
                    cur.execute(f"UPDATE ppe_items SET status = 'active' WHERE id IN ({quoted})")
                conn.commit()
                return resp(200, {'item': to_writeoff(row)} if row else {'error': 'not_found'})
            else:
                return resp(400, {'error': 'unknown_step'})
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': to_writeoff(row)})

        if method == 'POST' and kind == 'equipment':
            title = body.get('title', '')
            if not title:
                return resp(400, {'error': 'title_required'})
            photos = [put_photo('equipment', p) for p in (body.get('photos') or []) if p]
            eid = uuid.uuid4().hex[:12]
            cur.execute(
                'INSERT INTO equipment_items (id, holder_id, holder_fio, object_id, title, '
                'inv_no, serial_no, condition, verified_at, verified_to, photos, received_at, note) VALUES ('
                f"'{esc(eid)}', '{esc(body.get('holderId',''))}', '{esc(body.get('holderFio',''))}', "
                f"'{esc(body.get('objectId',''))}', '{esc(title)}', '{esc(body.get('invNo',''))}', "
                f"'{esc(body.get('serialNo',''))}', '{esc(body.get('condition',''))}', "
                f"'{esc(body.get('verifiedAt',''))}', '{esc(body.get('verifiedTo',''))}', "
                f"'{esc(json.dumps(photos))}'::jsonb, "
                f"'{esc(body.get('receivedAt') or datetime.date.today().isoformat())}', "
                f"'{esc(body.get('note',''))}') RETURNING *"
            )
            conn.commit()
            return resp(200, {'item': to_equip(cur.fetchone())})

        if method == 'POST' and kind == 'transfer':
            ids = body.get('equipmentIds') or []
            to_id = body.get('toId', '')
            to_fio = body.get('toFio', '')
            if not ids or not to_fio:
                return resp(400, {'error': 'items_and_receiver_required'})
            photos = [put_photo('equipment/move', p) for p in (body.get('photos') or []) if p]
            moved = body.get('movedAt') or datetime.date.today().isoformat()
            out = []
            for eq in ids:
                mid = uuid.uuid4().hex[:12]
                cur.execute(
                    'INSERT INTO equipment_moves (id, equipment_id, from_id, from_fio, to_id, '
                    'to_fio, object_id, condition, photos, moved_at) VALUES ('
                    f"'{esc(mid)}', '{esc(eq)}', '{esc(body.get('fromId',''))}', "
                    f"'{esc(body.get('fromFio',''))}', '{esc(to_id)}', '{esc(to_fio)}', "
                    f"'{esc(body.get('objectId',''))}', '{esc(body.get('condition',''))}', "
                    f"'{esc(json.dumps(photos))}'::jsonb, '{esc(moved)}') RETURNING *"
                )
                out.append(to_move(cur.fetchone()))
                cur.execute(
                    f"UPDATE equipment_items SET holder_id = '{esc(to_id)}', "
                    f"holder_fio = '{esc(to_fio)}', received_at = '{esc(moved)}' "
                    f"WHERE id = '{esc(eq)}'"
                )
            conn.commit()
            return resp(200, {'items': out})

        if method == 'DELETE':
            item_id = params.get('id', '')
            table = 'ppe_items' if kind == 'ppe' else 'equipment_items'
            cur.execute(f"DELETE FROM {table} WHERE id = '{esc(item_id)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(400, {'error': 'unsupported'})
    finally:
        cur.close()
        conn.close()
