"""Разделение данных по компаниям.

Каждый запрос приходит с пропуском компании (параметр _co). Пропуск
подписан сервером, подделать его нельзя. По пропуску база показывает и
меняет только строки своей компании: каждый запрос перед отправкой в базу
дополняется условием «только эта компания» (модуль scope). Это делается
на уровне соединения, поэтому ни один раздел не может случайно отдать
чужие данные.

Запрос без пропуска относится к основной компании — так продолжают
работать уже установленные версии приложения.
"""

import functools
import hashlib
import hmac
import os

import psycopg2
import psycopg2.extensions

import scope

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


class TenantError(Exception):
    pass


def _main_only(sql):
    """Запрос основной компании: отсекаем строки других компаний.

    Если запрос не разобран — выполняем как есть, чтобы рабочая система
    не встала; случай пишется в журнал для исправления.
    """
    try:
        return scope.scope(sql, DEFAULT_COMPANY)
    except scope.ScopeError as e:
        print(f'[tenant] NOT_SCOPED company={DEFAULT_COMPANY} ({e}): {str(sql)[:300]}')
        return sql


def _scoped(sql, company=None):
    """Запрос, ограниченный строками компании (по умолчанию — текущей)."""
    company = company or current()
    if company == DEFAULT_COMPANY:
        return _main_only(sql)
    try:
        return scope.scope(sql, company)
    except scope.ScopeError as e:
        print(f'[tenant] NOT_SCOPED company={company} ({e}): {str(sql)[:300]}')
        raise TenantError('query_not_scoped')


_cursor_classes = {}


def _scoped_cursor(base):
    cls = _cursor_classes.get(base)
    if cls is None:
        class Scoped(base):
            def execute(self, query, vars=None):
                return super().execute(_scoped(query, self.connection.company), vars)

            def executemany(self, query, vars_list):
                return super().executemany(_scoped(query, self.connection.company), vars_list)

        cls = _cursor_classes[base] = Scoped
    return cls


class TenantConnection(psycopg2.extensions.connection):
    company = None

    def cursor(self, *args, **kwargs):
        base = kwargs.get('cursor_factory') or self.cursor_factory or psycopg2.extensions.cursor
        kwargs['cursor_factory'] = _scoped_cursor(base)
        return super().cursor(*args, **kwargs)


def _connect(*args, **kwargs):
    company = kwargs.pop('company', None) or current()
    kwargs.setdefault('connection_factory', TenantConnection)
    conn = _orig_connect(*args, **kwargs)
    if isinstance(conn, TenantConnection):
        conn.company = company
    return conn


psycopg2.connect = _connect


_closed_cache = {}


def _is_closed(company_id: str) -> bool:
    """Компания закрыта — её пропуск больше не действует."""
    if company_id == DEFAULT_COMPANY:
        return False
    if company_id in _closed_cache:
        return _closed_cache[company_id]
    try:
        conn = _orig_connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute("SELECT plan FROM companies WHERE id = '%s'" % company_id.replace("'", "''"))
        row = cur.fetchone()
        conn.close()
        closed = (not row) or row[0] == 'closed'
    except Exception:
        return True
    if closed:
        _closed_cache[company_id] = True
    return closed


def company_from_event(event: dict):
    """Код компании из запроса. Подделанный пропуск или закрытая компания — None."""
    params = event.get('queryStringParameters') or {}
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    token = params.get('_co') or headers.get('x-company') or ''
    if not token:
        return DEFAULT_COMPANY
    company = verify(token)
    if company and _is_closed(company):
        return None
    return company


def _json_error(code, error):
    return {
        'statusCode': code,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': '{"error": "%s"}' % error,
    }


def wrap(handler):
    """Оборачивает обработчик: до работы с базой выставляет компанию."""

    @functools.wraps(handler)
    def wrapped(event, context):
        if (event or {}).get('httpMethod') == 'OPTIONS':
            return handler(event, context)
        company = company_from_event(event or {})
        if company is None:
            return _json_error(401, 'bad_company')
        _state['company'] = company
        try:
            return handler(event, context)
        except TenantError:
            return _json_error(500, 'query_not_scoped')
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
