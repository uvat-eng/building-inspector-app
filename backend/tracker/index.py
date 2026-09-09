import json
import math
import os
import re
import uuid
from datetime import datetime, timedelta, timezone

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

# Точка простоя: стоял дольше этого числа минут в радиусе IDLE_RADIUS метров.
IDLE_MIN = 5
IDLE_RADIUS = 60
ONLINE_WINDOW_MIN = 5
MOVE_SPEED = 0.6  # м/с — ниже считаем простоем


def esc(v):
    return str(v if v is not None else '').replace("'", "''")


def fnum(v, default=0.0):
    try:
        return float(str(v).replace(',', '.'))
    except Exception:
        return default


def resp(code, body):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def haversine(a_lat, a_lng, b_lat, b_lng):
    r = 6371000.0
    p1 = math.radians(a_lat)
    p2 = math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def aggregate(cur, user_id, fio, role, day):
    cur.execute(
        'SELECT lat, lng, speed, recorded_at FROM track_points '
        f"WHERE user_id = '{esc(user_id)}' AND day = '{esc(day)}' ORDER BY recorded_at"
    )
    pts = cur.fetchall()
    if not pts:
        return

    distance = 0.0
    move_sec = 0
    idle_sec = 0
    idles = []

    cluster_lat = pts[0]['lat']
    cluster_lng = pts[0]['lng']
    cluster_start = pts[0]['recorded_at']
    cluster_last = pts[0]['recorded_at']

    for i in range(1, len(pts)):
        prev = pts[i - 1]
        cur_p = pts[i]
        d = haversine(prev['lat'], prev['lng'], cur_p['lat'], cur_p['lng'])
        gap = (cur_p['recorded_at'] - prev['recorded_at']).total_seconds()
        gap = max(0, min(gap, 900))
        moving = d > 15 or fnum(cur_p['speed']) > MOVE_SPEED
        if moving:
            distance += d
            move_sec += gap
        else:
            idle_sec += gap

        within = haversine(cluster_lat, cluster_lng, cur_p['lat'], cur_p['lng']) <= IDLE_RADIUS
        if within:
            cluster_last = cur_p['recorded_at']
        else:
            dur = (cluster_last - cluster_start).total_seconds()
            if dur >= IDLE_MIN * 60:
                idles.append({
                    'lat': round(cluster_lat, 6),
                    'lng': round(cluster_lng, 6),
                    'from': cluster_start.isoformat(),
                    'to': cluster_last.isoformat(),
                    'minutes': int(dur // 60),
                })
            cluster_lat = cur_p['lat']
            cluster_lng = cur_p['lng']
            cluster_start = cur_p['recorded_at']
            cluster_last = cur_p['recorded_at']

    dur = (cluster_last - cluster_start).total_seconds()
    if dur >= IDLE_MIN * 60:
        idles.append({
            'lat': round(cluster_lat, 6),
            'lng': round(cluster_lng, 6),
            'from': cluster_start.isoformat(),
            'to': cluster_last.isoformat(),
            'minutes': int(dur // 60),
        })

    did = uuid.uuid4().hex[:12]
    ym = str(day)[:7]
    cur.execute(
        'INSERT INTO track_days (id, user_id, fio, role, day, ym, distance_km, move_min, '
        'idle_min, points, first_at, last_at, idles, updated_at) VALUES ('
        f"'{esc(did)}', '{esc(user_id)}', '{esc(fio)}', '{esc(role)}', '{esc(day)}', "
        f"'{esc(ym)}', {round(distance / 1000, 2)}, {int(move_sec // 60)}, "
        f"{int(idle_sec // 60)}, {len(pts)}, '{pts[0]['recorded_at'].isoformat()}', "
        f"'{pts[-1]['recorded_at'].isoformat()}', "
        f"'{esc(json.dumps(idles, ensure_ascii=False))}'::jsonb, now()) "
        'ON CONFLICT (user_id, day) DO UPDATE SET fio = EXCLUDED.fio, role = EXCLUDED.role, '
        'distance_km = EXCLUDED.distance_km, move_min = EXCLUDED.move_min, '
        'idle_min = EXCLUDED.idle_min, points = EXCLUDED.points, first_at = EXCLUDED.first_at, '
        'last_at = EXCLUDED.last_at, idles = EXCLUDED.idles, updated_at = now()'
    )


def build_month(cur, ym):
    cur.execute(
        'SELECT user_id, fio, role, SUM(distance_km) km, SUM(move_min) mv, SUM(idle_min) idle, '
        'COUNT(*) days FROM track_days '
        f"WHERE ym = '{esc(ym)}' GROUP BY user_id, fio, role ORDER BY fio"
    )
    rows = [
        {
            'userId': r['user_id'],
            'fio': r['fio'],
            'role': r['role'],
            'km': float(r['km'] or 0),
            'moveMin': int(r['mv'] or 0),
            'idleMin': int(r['idle'] or 0),
            'days': int(r['days'] or 0),
        }
        for r in cur.fetchall()
    ]
    mid = uuid.uuid4().hex[:12]
    cur.execute(
        'INSERT INTO track_month (id, ym, rows, created_at) VALUES ('
        f"'{esc(mid)}', '{esc(ym)}', '{esc(json.dumps(rows, ensure_ascii=False))}'::jsonb, now()) "
        'ON CONFLICT (ym) DO UPDATE SET rows = EXCLUDED.rows, created_at = now()'
    )
    return rows


def handler(event: dict, context) -> dict:
    """Трекер: приём геоточек, дневная агрегация, онлайн-статус и месячный свод."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}')
    action = params.get('action') or body.get('action') or ''

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'POST' and action == 'consent':
            uid = body.get('userId', '')
            if not uid:
                return resp(400, {'error': 'user_required'})
            cur.execute(
                'INSERT INTO track_consent (user_id, fio, agreed_at) VALUES ('
                f"'{esc(uid)}', '{esc(body.get('fio', ''))}', now()) "
                'ON CONFLICT (user_id) DO UPDATE SET agreed_at = now()'
            )
            conn.commit()
            return resp(200, {'ok': True})

        if method == 'GET' and action == 'consent':
            uid = params.get('userId', '')
            cur.execute(f"SELECT user_id FROM track_consent WHERE user_id = '{esc(uid)}'")
            return resp(200, {'agreed': cur.fetchone() is not None})

        if method == 'POST' and action == 'ping':
            uid = body.get('userId', '')
            pts = body.get('points') or []
            if not uid or not pts:
                return resp(400, {'error': 'user_and_points_required'})
            fio = body.get('fio', '')
            role = body.get('role', '')
            days = set()
            for p in pts[:120]:
                lat = fnum(p.get('lat'), None)
                lng = fnum(p.get('lng'), None)
                if lat is None or lng is None:
                    continue
                ts = str(p.get('at') or '')
                when = f"'{esc(ts)}'" if ts else 'now()'
                day = ts[:10] if re.match(r'^\d{4}-\d{2}-\d{2}', ts) else \
                    datetime.now(timezone.utc).strftime('%Y-%m-%d')
                days.add(day)
                cur.execute(
                    'INSERT INTO track_points (user_id, fio, role, lat, lng, accuracy, speed, '
                    f"day, recorded_at) VALUES ('{esc(uid)}', '{esc(fio)}', '{esc(role)}', "
                    f"{lat}, {lng}, {fnum(p.get('accuracy'))}, {fnum(p.get('speed'))}, "
                    f"'{esc(day)}', {when})"
                )
            for day in days:
                aggregate(cur, uid, fio, role, day)
            conn.commit()
            return resp(200, {'ok': True, 'saved': len(pts)})

        if method == 'GET' and action == 'online':
            since = (datetime.now(timezone.utc)
                     - timedelta(minutes=ONLINE_WINDOW_MIN)).isoformat()
            cur.execute(
                'SELECT DISTINCT ON (user_id) user_id, fio, role, lat, lng, accuracy, speed, '
                'recorded_at FROM track_points '
                f"WHERE recorded_at >= '{esc(since)}' ORDER BY user_id, recorded_at DESC"
            )
            items = [
                {
                    'userId': r['user_id'],
                    'fio': r['fio'],
                    'role': r['role'],
                    'lat': r['lat'],
                    'lng': r['lng'],
                    'accuracy': float(r['accuracy'] or 0),
                    'speed': float(r['speed'] or 0),
                    'at': r['recorded_at'].isoformat(),
                }
                for r in cur.fetchall()
            ]
            return resp(200, {'items': items})

        if method == 'GET' and action == 'days':
            ym = params.get('ym') or datetime.now(timezone.utc).strftime('%Y-%m')
            cur.execute(
                'SELECT * FROM track_days '
                f"WHERE ym = '{esc(ym)}' ORDER BY day DESC, fio"
            )
            items = [
                {
                    'id': r['id'],
                    'userId': r['user_id'],
                    'fio': r['fio'],
                    'role': r['role'],
                    'day': str(r['day']),
                    'ym': r['ym'],
                    'distanceKm': float(r['distance_km'] or 0),
                    'moveMin': int(r['move_min'] or 0),
                    'idleMin': int(r['idle_min'] or 0),
                    'points': int(r['points'] or 0),
                    'firstAt': r['first_at'].isoformat() if r['first_at'] else '',
                    'lastAt': r['last_at'].isoformat() if r['last_at'] else '',
                    'idles': r['idles'] or [],
                }
                for r in cur.fetchall()
            ]
            return resp(200, {'items': items, 'ym': ym})

        if method == 'GET' and action == 'track':
            uid = params.get('userId', '')
            day = params.get('day') or datetime.now(timezone.utc).strftime('%Y-%m-%d')
            cur.execute(
                'SELECT lat, lng, speed, recorded_at FROM track_points '
                f"WHERE user_id = '{esc(uid)}' AND day = '{esc(day)}' ORDER BY recorded_at"
            )
            pts = [
                {'lat': r['lat'], 'lng': r['lng'], 'speed': float(r['speed'] or 0),
                 'at': r['recorded_at'].isoformat()}
                for r in cur.fetchall()
            ]
            return resp(200, {'points': pts})

        if action == 'month':
            ym = params.get('ym') or body.get('ym') or ''
            if method == 'POST':
                if not ym:
                    ym = datetime.now(timezone.utc).strftime('%Y-%m')
                rows = build_month(cur, ym)
                conn.commit()
                return resp(200, {'ym': ym, 'rows': rows})
            cur.execute(f"SELECT * FROM track_month WHERE ym = '{esc(ym)}'")
            row = cur.fetchone()
            if row:
                return resp(200, {'ym': ym, 'rows': row['rows'] or [],
                                  'createdAt': row['created_at'].isoformat()})
            return resp(200, {'ym': ym, 'rows': [], 'createdAt': ''})

        if method == 'POST' and action == 'autoclose':
            today = datetime.now(timezone.utc)
            tomorrow = today + timedelta(days=1)
            if tomorrow.month != today.month:
                ym = today.strftime('%Y-%m')
                cur.execute(f"SELECT id FROM track_month WHERE ym = '{esc(ym)}'")
                if not cur.fetchone():
                    build_month(cur, ym)
                    conn.commit()
                    return resp(200, {'built': True, 'ym': ym})
            return resp(200, {'built': False})

        return resp(400, {'error': 'unknown_action'})
    finally:
        cur.close()
        conn.close()
