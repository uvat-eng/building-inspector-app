import json
import os
from datetime import date, datetime, timedelta

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
    return str(v if v is not None else '').replace("'", "''")


def resp(code, body):
    return {
        'statusCode': code,
        'headers': CORS,
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def entry_hours(e):
    def mins(t):
        p = str(t or '0:0').split(':')
        return int(p[0] or 0) * 60 + int(p[1] or 0) if len(p) > 1 else 0

    d = mins(e.get('to')) - mins(e.get('from'))
    if d <= 0:
        d += 24 * 60
    return d / 60


def build_shifts(days):
    """Собираем вахты: подряд идущие рабочие дни, вахту закрывает первый день МО."""
    shifts = []
    cur = None
    for day, entries in days:
        is_mo = bool(entries) and entries[0].get('kind') == 'mo'
        if is_mo:
            if cur:
                if not cur['moStart']:
                    cur['moStart'] = day
                cur['moDays'] += 1
                cur['moEnd'] = day
            continue
        gap = (datetime.fromisoformat(day).date() - datetime.fromisoformat(cur['end']).date()).days - 1 if cur else 0
        if not cur or cur['moDays'] > 0 or gap > 14:
            cur = {
                'start': day,
                'end': day,
                'workDays': 0,
                'hours': 0.0,
                'moStart': '',
                'moEnd': '',
                'moDays': 0,
                'objects': [],
                'open': True,
            }
            shifts.append(cur)
        cur['workDays'] += 1
        cur['hours'] += sum(entry_hours(e) for e in entries)
        cur['end'] = day
        for e in entries:
            t = e.get('objectTitle')
            if t and t not in cur['objects']:
                cur['objects'].append(t)
    for s in shifts:
        s['open'] = s['moDays'] == 0
        s['hours'] = round(s['hours'], 2)
    return list(reversed(shifts))


def handler(event: dict, context) -> dict:
    """Сводка работы инспекторов по проектам и объектам для менеджера, координатора и старшего."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action') or 'inspectors'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if action == 'inspectors':
            group = params.get('group') or ''
            month = params.get('month') or date.today().strftime('%Y-%m')

            where = "WHERE role = 'inspector'"
            if group:
                where += f" AND \"group\" = '{esc(group)}'"
            cur.execute(f'SELECT id, fio, "group", org, phone FROM users {where} ORDER BY fio')
            users = cur.fetchall()
            if not users:
                return resp(200, {'items': [], 'month': month})

            ids = ','.join("'" + esc(u['id']) + "'" for u in users)
            fios = ','.join("'" + esc(u['fio']) + "'" for u in users)

            cur.execute(
                f'SELECT user_id, day, entries FROM timesheet WHERE user_id IN ({ids}) '
                'ORDER BY user_id, day'
            )
            sheets = {}
            for r in cur.fetchall():
                sheets.setdefault(r['user_id'], []).append(
                    (r['day'].isoformat(), r['entries'] or [])
                )

            cur.execute(
                'SELECT i.inspector, COUNT(DISTINCT i.id) AS inspections, '
                'COUNT(d.id) AS defects, MAX(i.created_at) AS last_at '
                'FROM inspections i LEFT JOIN inspection_defects d ON d.inspection_id = i.id '
                f'WHERE i.inspector IN ({fios}) GROUP BY i.inspector'
            )
            work = {r['inspector']: r for r in cur.fetchall()}

            cur.execute(
                f'SELECT inspector, COUNT(*) AS orders FROM orders '
                f'WHERE inspector IN ({fios}) GROUP BY inspector'
            )
            orders = {r['inspector']: int(r['orders']) for r in cur.fetchall()}

            cur.execute(
                f'SELECT created_by, COUNT(*) AS docs FROM photo_folders '
                f'WHERE created_by IN ({fios}) GROUP BY created_by'
            )
            docs = {r['created_by']: int(r['docs']) for r in cur.fetchall()}

            items = []
            for u in users:
                days = sheets.get(u['id'], [])
                shifts = build_shifts(days)
                cur_shift = shifts[0] if shifts else None
                month_days = [
                    (d, e)
                    for d, e in days
                    if d.startswith(month) and e and e[0].get('kind') != 'mo'
                ]
                month_mo = [
                    d for d, e in days if d.startswith(month) and e and e[0].get('kind') == 'mo'
                ]
                w = work.get(u['fio']) or {}
                last = w.get('last_at')
                items.append(
                    {
                        'id': u['id'],
                        'fio': u['fio'],
                        'group': u['group'] or '',
                        'org': u['org'] or '',
                        'phone': u['phone'] or '',
                        'monthDays': len(month_days),
                        'monthHours': round(
                            sum(sum(entry_hours(x) for x in e) for _, e in month_days), 2
                        ),
                        'monthMO': len(month_mo),
                        'shift': cur_shift,
                        'shifts': shifts[:6],
                        'inspections': int(w.get('inspections') or 0),
                        'defects': int(w.get('defects') or 0),
                        'orders': orders.get(u['fio'], 0),
                        'docFolders': docs.get(u['fio'], 0),
                        'lastActivity': last.isoformat() if last else '',
                        'onShift': bool(cur_shift and cur_shift['open']),
                    }
                )
            return resp(200, {'items': items, 'month': month})

        if action == 'objects':
            cur.execute(
                'SELECT i.object_id, COUNT(DISTINCT i.id) AS inspections, '
                'COUNT(d.id) AS defects, COUNT(DISTINCT i.inspector) AS inspectors, '
                'MAX(i.created_at) AS last_at '
                'FROM inspections i LEFT JOIN inspection_defects d ON d.inspection_id = i.id '
                'GROUP BY i.object_id'
            )
            by_obj = {r['object_id']: dict(r) for r in cur.fetchall()}

            cur.execute('SELECT object_id, COUNT(*) AS orders FROM orders GROUP BY object_id')
            for r in cur.fetchall():
                by_obj.setdefault(r['object_id'], {'object_id': r['object_id']})
                by_obj[r['object_id']]['orders'] = int(r['orders'])

            cur.execute(
                'SELECT object_id, COUNT(*) AS folders FROM photo_folders GROUP BY object_id'
            )
            for r in cur.fetchall():
                by_obj.setdefault(r['object_id'], {'object_id': r['object_id']})
                by_obj[r['object_id']]['folders'] = int(r['folders'])

            items = [
                {
                    'objectId': k,
                    'inspections': int(v.get('inspections') or 0),
                    'defects': int(v.get('defects') or 0),
                    'orders': int(v.get('orders') or 0),
                    'folders': int(v.get('folders') or 0),
                    'inspectors': int(v.get('inspectors') or 0),
                    'lastActivity': v['last_at'].isoformat() if v.get('last_at') else '',
                }
                for k, v in by_obj.items()
            ]
            items.sort(key=lambda x: x['lastActivity'], reverse=True)
            return resp(200, {'items': items})

        if action == 'archive' and method == 'POST':
            cur.execute("SELECT id, fio, \"group\", org FROM users WHERE role = 'inspector'")
            users = cur.fetchall()
            saved = 0
            for u in users:
                cur.execute(
                    f"SELECT day, entries FROM timesheet WHERE user_id = '{esc(u['id'])}' "
                    'ORDER BY day'
                )
                days = [(r['day'].isoformat(), r['entries'] or []) for r in cur.fetchall()]

                cur.execute(
                    'SELECT i.id, i.object_id, i.number, i.work_type, i.status, i.created_at, '
                    '(SELECT COUNT(*) FROM inspection_defects d WHERE d.inspection_id = i.id) '
                    f"AS defects FROM inspections i WHERE i.inspector = '{esc(u['fio'])}' "
                    'ORDER BY i.created_at DESC'
                )
                inspections = [dict(r) for r in cur.fetchall()]

                cur.execute(
                    'SELECT id, object_id, number, issued_to, deadline, status, created_at '
                    f"FROM orders WHERE inspector = '{esc(u['fio'])}' ORDER BY created_at DESC"
                )
                orders_list = [dict(r) for r in cur.fetchall()]

                cur.execute(
                    'SELECT id, object_id, section, subsection, title, month, created_at '
                    f"FROM photo_folders WHERE created_by = '{esc(u['fio'])}' "
                    'ORDER BY created_at DESC'
                )
                folders = [dict(r) for r in cur.fetchall()]

                payload = {
                    'fio': u['fio'],
                    'group': u['group'] or '',
                    'org': u['org'] or '',
                    'timesheet': days,
                    'shifts': build_shifts(days),
                    'inspections': inspections,
                    'orders': orders_list,
                    'folders': folders,
                    'totals': {
                        'inspections': len(inspections),
                        'defects': sum(int(i.get('defects') or 0) for i in inspections),
                        'orders': len(orders_list),
                        'folders': len(folders),
                        'days': len(days),
                    },
                }
                blob = json.dumps(payload, ensure_ascii=False, default=str).replace("'", "''")
                cur.execute(
                    'INSERT INTO cabinet_archive (user_id, fio, "group", payload) VALUES ('
                    f"'{esc(u['id'])}', '{esc(u['fio'])}', '{esc(u['group'])}', '{blob}'::jsonb) "
                    'ON CONFLICT (user_id, snapshot_date) DO UPDATE SET '
                    'payload = EXCLUDED.payload, created_at = now()'
                )
                saved += 1
            conn.commit()
            return resp(200, {'saved': saved, 'date': date.today().isoformat()})

        if action == 'archive':
            user_id = params.get('user_id') or ''
            if user_id:
                cur.execute(
                    'SELECT snapshot_date, payload FROM cabinet_archive '
                    f"WHERE user_id = '{esc(user_id)}' ORDER BY snapshot_date DESC LIMIT 60"
                )
                return resp(
                    200,
                    {
                        'items': [
                            {'date': r['snapshot_date'].isoformat(), 'payload': r['payload']}
                            for r in cur.fetchall()
                        ]
                    },
                )
            cur.execute(
                'SELECT user_id, fio, "group", MAX(snapshot_date) AS last_date, '
                'COUNT(*) AS snapshots FROM cabinet_archive '
                'GROUP BY user_id, fio, "group" ORDER BY fio'
            )
            return resp(
                200,
                {
                    'items': [
                        {
                            'userId': r['user_id'],
                            'fio': r['fio'],
                            'group': r['group'],
                            'lastDate': r['last_date'].isoformat() if r['last_date'] else '',
                            'snapshots': int(r['snapshots']),
                        }
                        for r in cur.fetchall()
                    ]
                },
            )

        return resp(400, {'error': 'unknown_action'})
    finally:
        cur.close()
        conn.close()