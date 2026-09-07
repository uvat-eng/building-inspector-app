import json
import os
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

ALLOWED = {'manager_email', 'manager_name', 'customer_email'}


def esc(v):
    return str(v).replace("'", "''")


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body)}


def handler(event: dict, context) -> dict:
    """Общие настройки компании: почта и имя менеджера проекта для отправки табелей."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            cur.execute('SELECT key, value FROM settings')
            return resp(200, {'settings': {r['key']: r['value'] for r in cur.fetchall()}})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            saved = {}
            for key, value in body.items():
                if key not in ALLOWED:
                    continue
                cur.execute(
                    f"INSERT INTO settings (key, value) VALUES ('{esc(key)}', '{esc(value)}') "
                    'ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()'
                )
                saved[key] = value
            conn.commit()
            return resp(200, {'settings': saved})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
