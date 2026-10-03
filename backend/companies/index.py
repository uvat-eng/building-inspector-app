import json
import os
import random
import re
import uuid

import psycopg2
import psycopg2.extras

import tenant
from tenant import sign

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Company',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

DEMO_LIMITS = {'objects': 2, 'users': 3, 'inspections': 10, 'vehicles': 2, 'locations': 1}

PRODUCT_ID = os.environ.get('IAP_PRODUCT_ID', 'inspector_sk_full')
BUNDLE_ID = os.environ.get('IOS_BUNDLE_ID', '')

CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def esc(v):
    return str(v).replace("'", "''")


def resp(code, body):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def norm(fio):
    return ' '.join(str(fio).split()).lower()


def connect(company_id):
    """Соединение, ограниченное данными компании."""
    return psycopg2.connect(os.environ['DATABASE_URL'], company=company_id)


def public(row):
    return {
        'id': row['id'],
        'name': row['name'],
        'plan': row['plan'],
        'paidUntil': row.get('paid_until'),
        'limits': DEMO_LIMITS if row['plan'] == 'demo' else None,
    }


def with_token(row):
    item = public(row)
    item['token'] = sign(row['id'])
    return item


def new_code(cur):
    for _ in range(20):
        code = ''.join(random.choice(CODE_ALPHABET) for _ in range(6))
        cur.execute(f"SELECT 1 FROM companies WHERE access_code = '{code}'")
        if not cur.fetchone():
            return code
    return uuid.uuid4().hex[:8].upper()


def usage(company_id):
    """Сколько записей уже заведено — для показа остатка демо-лимитов."""
    conn = connect(company_id)
    cur = conn.cursor()
    out = {}
    for table in DEMO_LIMITS:
        cur.execute(f'SELECT COUNT(*) FROM {table}')
        out[table] = int(cur.fetchone()[0])
    cur.close()
    conn.close()
    return out


def verify_apple(signed_tx):
    """Проверка покупки из App Store по подписанной транзакции StoreKit 2.

    Транзакция подписана Apple. Сверяем цепочку сертификатов с корневым
    сертификатом Apple, затем товар и приложение.
    """
    from jwt_apple import decode_transaction

    try:
        tx = decode_transaction(signed_tx)
    except Exception:
        return None, 'bad_receipt'
    if tx.get('productId') != PRODUCT_ID:
        return None, 'wrong_product'
    if BUNDLE_ID and tx.get('bundleId') != BUNDLE_ID:
        return None, 'wrong_app'
    if tx.get('revocationDate'):
        return None, 'revoked'
    return tx, None


def handler(event: dict, context) -> dict:
    """Компании: выбор, создание с демо-доступом, вход по коду и открытие полного доступа после покупки."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = params.get('action') or body.get('action') or ''

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if method == 'GET' and action == 'featured':
            cur.execute("SELECT * FROM companies WHERE id = 'gsi'")
            row = cur.fetchone()
            return resp(200, {'item': with_token(row) if row else None})

        if method == 'GET' and action == 'status':
            from tenant import verify
            company_id = verify(params.get('token') or '')
            if not company_id:
                return resp(401, {'error': 'bad_company'})
            cur.execute(f"SELECT * FROM companies WHERE id = '{esc(company_id)}'")
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'not_found'})
            item = public(row)
            item['usage'] = usage(company_id)
            is_owner = False
            uid = params.get('user_id') or ''
            if uid and row['plan'] == 'demo':
                c2 = connect(company_id)
                k = c2.cursor()
                k.execute(f"SELECT role FROM users WHERE id = '{esc(uid)}'")
                r = k.fetchone()
                is_owner = bool(r and r[0] in ('director', 'admin'))
                k.close()
                c2.close()
            if is_owner or row['plan'] != 'demo':
                item['accessCode'] = row['access_code']
            return resp(200, {'item': item})

        if method == 'POST' and action == 'join':
            code = re.sub(r'[^A-Z0-9]', '', str(body.get('code', '')).upper())
            if len(code) < 4:
                return resp(400, {'error': 'bad_code'})
            cur.execute(f"SELECT * FROM companies WHERE access_code = '{esc(code)}'")
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'not_found'})
            return resp(200, {'item': with_token(row)})

        if method == 'POST' and action == 'create':
            name = ' '.join(str(body.get('name', '')).split())[:120]
            fio = ' '.join(str(body.get('fio', '')).split())[:120]
            password = str(body.get('password', ''))
            if len(name) < 2:
                return resp(400, {'error': 'name_required'})
            if len(fio.split()) < 2:
                return resp(400, {'error': 'fio_required'})
            if len(password) < 4:
                return resp(400, {'error': 'password_short'})

            company_id = 'c' + uuid.uuid4().hex[:11]
            code = new_code(cur)
            cur.execute(
                'INSERT INTO companies (id, name, schema_name, plan, owner_fio, access_code) VALUES ('
                f"'{company_id}', '{esc(name)}', '', 'demo', '{esc(fio)}', '{code}') RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()

            tconn = connect(company_id)
            tcur = tconn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            uid = uuid.uuid4().hex[:12]
            tcur.execute(
                'INSERT INTO users (id, fio, fio_key, password, role, "group", org, phone, '
                'locations, specialties, certificates, educations, must_change_password) VALUES ('
                f"'{uid}', '{esc(fio)}', '{esc(norm(fio))}', '{esc(password)}', 'director', '', "
                f"'{esc(name)}', '', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, false) RETURNING *"
            )
            user = tcur.fetchone()
            lid = 'loc-' + uuid.uuid4().hex[:8]
            tcur.execute(
                'INSERT INTO locations (id, title, icon, note, sort, created_by) VALUES ('
                f"'{lid}', 'Основная площадка', 'MapPin', '', 1, '{esc(fio)}')"
            )
            tconn.commit()
            tcur.close()
            tconn.close()

            item = with_token(row)
            item['accessCode'] = code
            return resp(200, {
                'item': item,
                'user': {
                    'id': user['id'], 'fio': user['fio'], 'role': user['role'],
                    'group': '', 'org': name, 'phone': '', 'locations': [lid],
                    'objects': [], 'chief': '', 'specialties': [], 'certificates': [],
                    'educations': [], 'mustChangePassword': False, 'password': '',
                    'createdAt': user['created_at'].isoformat() if user['created_at'] else '',
                },
            })

        if method == 'POST' and action == 'purchase':
            from tenant import verify
            company_id = verify(body.get('token') or '')
            if not company_id:
                return resp(401, {'error': 'bad_company'})
            tx, err = verify_apple(str(body.get('signedTransaction') or ''))
            if err:
                return resp(402, {'error': err})
            ref = esc(str(tx.get('originalTransactionId') or tx.get('transactionId') or ''))
            cur.execute(f"SELECT id FROM companies WHERE purchase_ref = '{ref}' AND id <> '{esc(company_id)}'")
            if cur.fetchone():
                return resp(409, {'error': 'already_used'})
            cur.execute(
                f"UPDATE companies SET plan = 'full', purchase_ref = '{ref}' "
                f"WHERE id = '{esc(company_id)}' RETURNING *"
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'item': public(row)})

        return resp(400, {'error': 'unknown_action'})
    finally:
        cur.close()
        conn.close()
# deploy 1790997693
