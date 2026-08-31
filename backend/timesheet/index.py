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


def esc(v):
    return str(v).replace("'", "''")


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body)}


def handler(event: dict, context) -> dict:
    """Табель учёта рабочего времени инспектора: чтение месяца и сохранение дня."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            user_id = params.get('user_id', '')
            if not user_id:
                return resp(400, {'error': 'user_id_required'})
            cur.execute(
                f"SELECT day, entries FROM timesheet WHERE user_id = '{esc(user_id)}' ORDER BY day"
            )
            sheet = {r['day'].isoformat(): r['entries'] for r in cur.fetchall()}
            return resp(200, {'sheet': sheet})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            user_id = body.get('user_id', '')
            day = body.get('day', '')
            entries = body.get('entries') or []
            if not user_id or not day:
                return resp(400, {'error': 'user_id_and_day_required'})

            if not entries:
                cur.execute(
                    f"DELETE FROM timesheet WHERE user_id = '{esc(user_id)}' AND day = '{esc(day)}'"
                )
                conn.commit()
                return resp(200, {'ok': True, 'deleted': True})

            payload = esc(json.dumps(entries, ensure_ascii=False))
            cur.execute(
                'INSERT INTO timesheet (user_id, day, entries) VALUES ('
                f"'{esc(user_id)}', '{esc(day)}', '{payload}'::jsonb) "
                'ON CONFLICT (user_id, day) DO UPDATE SET entries = EXCLUDED.entries, '
                'updated_at = NOW()'
            )
            conn.commit()
            return resp(200, {'ok': True})

        return resp(405, {'error': 'method_not_allowed'})
    finally:
        cur.close()
        conn.close()
