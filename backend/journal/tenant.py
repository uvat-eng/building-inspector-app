"""Разделение данных по компаниям.

Каждый запрос приходит с пропуском компании (параметр _co). Пропуск
подписан сервером, подделать его нельзя. По пропуску база показывает и
меняет только строки своей компании — это правило заложено в самой базе,
поэтому ни один раздел не может случайно отдать чужие данные.

Запрос без пропуска относится к основной компании — так продолжают
работать уже установленные версии приложения.
"""

import functools
import hashlib
import hmac
import os

import psycopg2

DEFAULT_COMPANY = 'gsi'

_state = {'company': DEFAULT_COMPANY}
_orig_connect = psycopg2.connect


def _key() -> bytes:
    return hashlib.sha256(('company:' + os.environ.get('DATABASE_URL', '')).encode()).digest()


def sign(company_id: str) -> str:
    """Выдаёт пропуск компании."""
    mac = hmac.new(_key(), company_id.encode(), hashlib.sha256).hexdigest()[:24]
    return f'{company_id}.{mac}'


def verify(token: str):
    """Проверяет пропуск. Возвращает код компании или None."""
    if not token or '.' not in token:
        return None
    company_id, _ = token.rsplit('.', 1)
    if not company_id or len(company_id) > 40:
        return None
    return company_id if hmac.compare_digest(sign(company_id), token) else None


def current() -> str:
    return _state['company']


def _connect(*args, **kwargs):
    company = current()
    if company != DEFAULT_COMPANY:
        kwargs['options'] = ('%s -c app.company=%s' % (kwargs.get('options', ''), company)).strip()
    return _orig_connect(*args, **kwargs)


psycopg2.connect = _connect


def company_from_event(event: dict):
    """Код компании из запроса. Подделанный пропуск — None."""
    params = event.get('queryStringParameters') or {}
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    token = params.get('_co') or headers.get('x-company') or ''
    if not token:
        return DEFAULT_COMPANY
    return verify(token)


def wrap(handler):
    """Оборачивает обработчик: до работы с базой выставляет компанию."""

    @functools.wraps(handler)
    def wrapped(event, context):
        if (event or {}).get('httpMethod') == 'OPTIONS':
            return handler(event, context)
        company = company_from_event(event or {})
        if company is None:
            return {
                'statusCode': 401,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                'isBase64Encoded': False,
                'body': '{"error": "bad_company"}',
            }
        _state['company'] = company
        try:
            return handler(event, context)
        finally:
            _state['company'] = DEFAULT_COMPANY

    return wrapped


DEMO_LIMITS = {'objects': 2, 'users': 3, 'inspections': 10, 'vehicles': 2, 'locations': 1}


def demo_blocked(cur, table: str) -> bool:
    """Демо-компания исчерпала лимит записей в разделе."""
    limit = DEMO_LIMITS.get(table)
    company = current()
    if limit is None or company == DEFAULT_COMPANY:
        return False
    cur.execute("SELECT plan FROM companies WHERE id = '%s'" % company.replace("'", "''"))
    row = cur.fetchone()
    plan = (row[0] if not isinstance(row, dict) else row.get('plan')) if row else 'demo'
    if plan != 'demo':
        return False
    cur.execute('SELECT COUNT(*) AS n FROM %s' % table)
    row = cur.fetchone()
    n = row[0] if not isinstance(row, dict) else row.get('n')
    return int(n) >= limit


def demo_limit_response(table: str):
    return {
        'statusCode': 402,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': '{"error": "demo_limit", "table": "%s", "limit": %d}' % (table, DEMO_LIMITS[table]),
    }


MAIN_ORG = 'ООО «ГЛОБАЛ-Стройинжиниринг»'


def org_name() -> str:
    """Название организации для документов текущей компании."""
    company = current()
    if company == DEFAULT_COMPANY:
        return MAIN_ORG
    try:
        conn = _orig_connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute("SELECT name FROM companies WHERE id = '%s'" % company.replace("'", "''"))
        row = cur.fetchone()
        cur.close()
        conn.close()
        return row[0] if row and row[0] else ''
    except Exception:
        return ''

# rev 3
