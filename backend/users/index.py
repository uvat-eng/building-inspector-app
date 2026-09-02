import json
import os
import uuid
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def esc(v):
    return str(v).replace("'", "''")


def norm(fio: str) -> str:
    return ' '.join(str(fio).split()).lower()


def row_to_user(r):
    return {
        'id': r['id'],
        'fio': r['fio'],
        'password': r['password'],
        'role': r['role'],
        'group': r['group'],
        'org': r['org'],
        'phone': r['phone'],
        'locations': r['locations'] or [],
        'mustChangePassword': bool(r.get('must_change_password')),
        'specialties': r['specialties'] or [],
        'certificates': r['certificates'] or [],
        'educations': r['educations'] or [],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else '',
    }


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body)}


def handler(event: dict, context) -> dict:
    """Учётные записи сотрудников: регистрация, вход, список, обновление и удаление."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            cur.execute('SELECT * FROM users ORDER BY created_at')
            return resp(200, {'items': [row_to_user(r) for r in cur.fetchall()]})

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            action = body.get('action', 'register')

            if action == 'login':
                key = norm(body.get('fio', ''))
                cur.execute(f"SELECT * FROM users WHERE fio_key = '{esc(key)}'")
                row = cur.fetchone()
                if not row:
                    return resp(404, {'error': 'not_found'})
                if row['password'] != body.get('password'):
                    return resp(403, {'error': 'wrong_password'})
                return resp(200, {'item': row_to_user(row)})

            if action == 'change_password':
                uid_ = esc(body.get('id', ''))
                old = body.get('oldPassword', '')
                new = str(body.get('newPassword', ''))
                cur.execute(f"SELECT * FROM users WHERE id = '{uid_}'")
                row = cur.fetchone()
                if not row:
                    return resp(404, {'error': 'not_found'})
                if row['password'] != old:
                    return resp(403, {'error': 'wrong_password'})
                if len(new) < 4:
                    return resp(400, {'error': 'too_short'})
                if new == old:
                    return resp(400, {'error': 'same_password'})
                cur.execute(
                    f"UPDATE users SET password = '{esc(new)}', must_change_password = false "
                    f"WHERE id = '{uid_}' RETURNING *"
                )
                row = cur.fetchone()
                conn.commit()
                return resp(200, {'item': row_to_user(row)})

            cur.execute("SELECT COUNT(*) AS n FROM users")
            total = int(cur.fetchone()['n'])

            by_id = esc(body.get('byUserId', ''))
            allowed = False
            if total == 0:
                allowed = True
            elif by_id:
                cur.execute(f"SELECT role FROM users WHERE id = '{by_id}'")
                r = cur.fetchone()
                allowed = bool(r and r['role'] in ('admin', 'pm', 'coordinator', 'director'))
            if not allowed:
                return resp(403, {'error': 'not_allowed'})

            fio = ' '.join(str(body.get('fio', '')).split())
            key = norm(fio)
            cur.execute(f"SELECT id FROM users WHERE fio_key = '{esc(key)}'")
            if cur.fetchone():
                return resp(409, {'error': 'exists'})

            role = body.get('role', 'inspector')
            if total == 0:
                role = 'pm'

            uid = uuid.uuid4().hex[:12]
            cur.execute(
                "INSERT INTO users (id, fio, fio_key, password, role, \"group\", org, phone, "
                "locations, specialties, certificates, educations, must_change_password) VALUES ("
                f"'{esc(uid)}', '{esc(fio)}', '{esc(key)}', '{esc(body.get('password', ''))}', "
                f"'{esc(role)}', '{esc(body.get('group', ''))}', "
                f"'{esc(body.get('org', ''))}', '{esc(body.get('phone', ''))}', "
                f"'{esc(json.dumps(body.get('locations', []), ensure_ascii=False))}'::jsonb, "
                f"'{esc(json.dumps(body.get('specialties', []), ensure_ascii=False))}'::jsonb, "
                f"'{esc(json.dumps(body.get('certificates', []), ensure_ascii=False))}'::jsonb, "
                f"'{esc(json.dumps(body.get('educations', []), ensure_ascii=False))}'::jsonb, "
                f"{'true' if total > 0 else 'false'}) "
                'RETURNING *'
            )
            conn.commit()
            return resp(200, {'item': row_to_user(cur.fetchone()), 'firstUser': total == 0})

        if method == 'PUT':
            uid = body.get('id', '')
            patch = body.get('patch', {})
            sets = []
            if 'fio' in patch:
                fio = ' '.join(str(patch['fio']).split())
                sets.append(f"fio = '{esc(fio)}'")
                sets.append(f"fio_key = '{esc(norm(fio))}'")
            for k, col in (('password', 'password'), ('role', 'role'), ('group', '"group"'),
                           ('org', 'org'), ('phone', 'phone')):
                if k in patch:
                    sets.append(f"{col} = '{esc(patch[k])}'")
            if 'mustChangePassword' in patch:
                sets.append(
                    f"must_change_password = {'true' if patch['mustChangePassword'] else 'false'}"
                )
            for k in ('locations', 'specialties', 'certificates', 'educations'):
                if k in patch:
                    val = json.dumps(patch[k], ensure_ascii=False)
                    sets.append(f"{k} = '{esc(val)}'::jsonb")
            if not sets:
                return resp(400, {'error': 'empty_patch'})
            cur.execute(f"UPDATE users SET {', '.join(sets)} WHERE id = '{esc(uid)}' RETURNING *")
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': row_to_user(row)})

        if method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            uid = params.get('id') or body.get('id', '')
            cur.execute(f"DELETE FROM users WHERE id = '{esc(uid)}'")
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()