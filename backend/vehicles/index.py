import json
import os
import uuid
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


def num(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body)}


def to_vehicle(r):
    return {
        'id': r['id'],
        'assetType': r['asset_type'] or 'vehicle',
        'invNo': r['inv_no'] or '',
        'objectId': r['object_id'] or '',
        'verifiedTo': r['verified_to'] or '',
        'holder': r['holder'] or '',
        'plate': r['plate'],
        'model': r['model'],
        'kind': r['kind'],
        'driver': r['driver'] or '',
        'locationId': r['location_id'] or '',
        'odometer': int(r['odometer'] or 0),
        'fuelNorm': float(r['fuel_norm'] or 0),
        'serviceAt': r['service_at'] or '',
        'osagoTo': r['osago_to'] or '',
        'status': r['status'],
        'note': r['note'] or '',
        'createdBy': r['created_by'] or '',
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def to_log(r):
    return {
        'id': r['id'],
        'vehicleId': r['vehicle_id'],
        'kind': r['kind'],
        'date': r['date'],
        'odometer': int(r['odometer'] or 0),
        'amount': float(r['amount'] or 0),
        'content': r['content'] or '',
        'author': r['author'] or '',
    }


def handler(event: dict, context) -> dict:
    """Автопарк механика: техника, водители, ТО, топливо и путевые листы."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}
    kind = params.get('kind') or body.get('kind') or ''

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            asset_type = params.get('asset_type', '')
            where = f"WHERE asset_type = '{esc(asset_type)}'" if asset_type else ''
            cur.execute(f'SELECT * FROM vehicles {where} ORDER BY created_at DESC')
            items = [to_vehicle(r) for r in cur.fetchall()]
            cur.execute('SELECT * FROM vehicle_logs ORDER BY date DESC, created_at DESC')
            logs = [to_log(r) for r in cur.fetchall()]
            return resp(200, {'items': items, 'logs': logs})

        if method == 'POST' and kind in ('service', 'fuel', 'waybill'):
            vid = body.get('vehicleId', '')
            date = body.get('date', '')
            if not vid or not date:
                return resp(400, {'error': 'vehicle_and_date_required'})
            lid = uuid.uuid4().hex[:12]
            cur.execute(
                'INSERT INTO vehicle_logs (id, vehicle_id, kind, date, odometer, amount, content, '
                f"author) VALUES ('{esc(lid)}', '{esc(vid)}', '{esc(kind)}', '{esc(date)}', "
                f"{int(num(body.get('odometer')))}, {num(body.get('amount'))}, "
                f"'{esc(body.get('content', ''))}', '{esc(body.get('author', ''))}') RETURNING *"
            )
            row = cur.fetchone()
            odo = int(num(body.get('odometer')))
            if odo:
                cur.execute(
                    f'UPDATE vehicles SET odometer = {odo} '
                    f"WHERE id = '{esc(vid)}' AND odometer < {odo}"
                )
            conn.commit()
            return resp(200, {'log': to_log(row)})

        if method == 'POST':
            plate = body.get('plate', '').strip()
            model = body.get('model', '').strip()
            asset_type = body.get('assetType') or 'vehicle'
            if asset_type == 'vehicle' and (not plate or not model):
                return resp(400, {'error': 'plate_and_model_required'})
            if asset_type != 'vehicle' and not model:
                return resp(400, {'error': 'model_required'})
            vid = uuid.uuid4().hex[:12]
            cur.execute(
                'INSERT INTO vehicles (id, asset_type, plate, model, kind, driver, location_id, '
                'odometer, fuel_norm, service_at, osago_to, status, note, created_by, inv_no, '
                'object_id, verified_to, holder) VALUES ('
                f"'{esc(vid)}', '{esc(asset_type)}', '{esc(plate)}', '{esc(model)}', "
                f"'{esc(body.get('vehicleKind') or 'car')}', '{esc(body.get('driver', ''))}', "
                f"'{esc(body.get('locationId', ''))}', {int(num(body.get('odometer')))}, "
                f"{num(body.get('fuelNorm'))}, '{esc(body.get('serviceAt', ''))}', "
                f"'{esc(body.get('osagoTo', ''))}', '{esc(body.get('status') or 'На линии')}', "
                f"'{esc(body.get('note', ''))}', '{esc(body.get('createdBy', ''))}', "
                f"'{esc(body.get('invNo', ''))}', '{esc(body.get('objectId', ''))}', "
                f"'{esc(body.get('verifiedTo', ''))}', '{esc(body.get('holder', ''))}') RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': to_vehicle(row)})

        if method == 'PUT':
            vid = body.get('id', '')
            patch = body.get('patch') or {}
            text_cols = {
                'plate': 'plate',
                'model': 'model',
                'vehicleKind': 'kind',
                'driver': 'driver',
                'locationId': 'location_id',
                'serviceAt': 'service_at',
                'osagoTo': 'osago_to',
                'status': 'status',
                'note': 'note',
                'invNo': 'inv_no',
                'objectId': 'object_id',
                'verifiedTo': 'verified_to',
                'holder': 'holder',
                'assetType': 'asset_type',
            }
            num_cols = {'odometer': 'odometer', 'fuelNorm': 'fuel_norm'}
            sets = [f"{text_cols[k]} = '{esc(v)}'" for k, v in patch.items() if k in text_cols]
            sets += [f'{num_cols[k]} = {num(v)}' for k, v in patch.items() if k in num_cols]
            if not vid or not sets:
                return resp(400, {'error': 'nothing_to_update'})
            cur.execute(
                f"UPDATE vehicles SET {', '.join(sets)} WHERE id = '{esc(vid)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': to_vehicle(row)} if row else {'error': 'not_found'})

        if method == 'DELETE':
            log_id = params.get('log_id', '')
            vid = params.get('id', '')
            if log_id:
                cur.execute(f"DELETE FROM vehicle_logs WHERE id = '{esc(log_id)}'")
            elif vid:
                cur.execute(f"DELETE FROM vehicle_logs WHERE vehicle_id = '{esc(vid)}'")
                cur.execute(f"DELETE FROM vehicles WHERE id = '{esc(vid)}'")
            else:
                return resp(400, {'error': 'id_required'})
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
