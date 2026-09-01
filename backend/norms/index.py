import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request
import uuid

import psycopg2
import psycopg2.extras
import requests
import urllib3

from norms_db import RULES, FALLBACK

urllib3.disable_warnings()

PROMPT_VER = 2


def norm_phrase(text):
    words = re.findall(r'[а-яёa-z0-9]+', str(text).lower())
    stop = {'в', 'на', 'не', 'и', 'с', 'по', 'для', 'из', 'от', 'до', 'при', 'без', 'осях', 'оси'}
    keep = [w[:6] for w in words if w not in stop and len(w) > 2 and not w.isdigit()]
    return ' '.join(sorted(set(keep)))[:250]


def cache_get(texts):
    """Ранее накопленные ответы: правки инженеров важнее ответов ИИ."""
    found = {}
    phrases = {t: norm_phrase(t) for t in texts}
    keys = [p for p in phrases.values() if p]
    if not keys:
        return found
    try:
        with psycopg2.connect(os.environ['DATABASE_URL']) as conn:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            lst = ','.join("'" + k.replace("'", "''") + "'" for k in keys)
            cur.execute(
                f'SELECT phrase, ref, name, manual, author FROM norms_cache '
                f'WHERE phrase IN ({lst}) '
                f'AND (manual = true OR prompt_ver = {PROMPT_VER})'
            )
            by_phrase = {r['phrase']: r for r in cur.fetchall()}
            for t, p in phrases.items():
                if p in by_phrase:
                    r = by_phrase[p]
                    found[t] = {
                        'ref': r['ref'],
                        'name': r['name'],
                        'source': 'manual' if r['manual'] else 'ai',
                        'author': r['author'] or '',
                        'score': 10 if r['manual'] else 9,
                    }
            if found:
                cur.execute(f'UPDATE norms_cache SET hits = hits + 1 WHERE phrase IN ({lst})')
    except Exception:
        pass
    return found


def cache_put(pairs, manual=False, author=''):
    """Пополняем базу. Ручные правки инженеров не затираются ответами ИИ."""
    rows = [(norm_phrase(t), m) for t, m in pairs if m and m.get('ref')]
    rows = [(p, m) for p, m in rows if p]
    if not rows:
        return
    keep = (
        'ON CONFLICT (phrase) DO UPDATE SET ref = EXCLUDED.ref, name = EXCLUDED.name, '
        'manual = true, author = EXCLUDED.author, prompt_ver = EXCLUDED.prompt_ver, '
        'updated_at = now(), hits = norms_cache.hits + 1'
        if manual
        else 'ON CONFLICT (phrase) DO UPDATE SET '
        'ref = CASE WHEN norms_cache.manual THEN norms_cache.ref ELSE EXCLUDED.ref END, '
        'name = CASE WHEN norms_cache.manual THEN norms_cache.name ELSE EXCLUDED.name END, '
        'prompt_ver = CASE WHEN norms_cache.manual THEN norms_cache.prompt_ver '
        'ELSE EXCLUDED.prompt_ver END, '
        'hits = norms_cache.hits + 1'
    )
    try:
        with psycopg2.connect(os.environ['DATABASE_URL']) as conn:
            cur = conn.cursor()
            vals = ','.join(
                "('{}','{}','{}',{},{},'{}')".format(
                    p.replace("'", "''"),
                    str(m['ref']).replace("'", "''")[:300],
                    str(m.get('name', '')).replace("'", "''")[:300],
                    PROMPT_VER,
                    'true' if manual else 'false',
                    str(author).replace("'", "''")[:120],
                )
                for p, m in rows
            )
            cur.execute(
                'INSERT INTO norms_cache (phrase, ref, name, prompt_ver, manual, author) '
                f'VALUES {vals} {keep}'
            )
    except Exception:
        pass

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body, ensure_ascii=False)}


def match_local(text: str):
    low = ' ' + re.sub(r'[^a-zа-яё0-9]+', ' ', text.lower()) + ' '
    ranked = []
    for subj, marks, ref, name in RULES:
        subj_hits = sum(1 for k in subj if k in low)
        if not subj_hits:
            continue
        mark_hits = sum(1 for k in marks if k in low)
        score = subj_hits * 3 + mark_hits * 2
        if mark_hits:
            score += 4
        ranked.append((score, ref, name))

    if not ranked:
        return {'ref': FALLBACK[0], 'name': FALLBACK[1], 'source': 'base', 'score': 0, 'alts': []}

    ranked.sort(key=lambda x: -x[0])
    top = ranked[0]
    alts = [{'ref': r, 'name': n} for _, r, n in ranked[1:4]]
    return {'ref': top[1], 'name': top[2], 'source': 'base', 'score': top[0], 'alts': alts}


PROMPT_HEAD = (
    'Ты инженер строительного контроля в России с 20-летним стажем. Для каждого замечания '
    'определи нарушенное требование действующих норм РФ и укажи конкретный пункт.\n\n'
    'Правила:\n'
    '1. Используй только действующие документы: СП (актуализированные редакции СНиП), '
    'ГОСТ, ПУЭ-7, ФНП Ростехнадзора, приказы Минтруда по охране труда, '
    'Постановление Правительства № 1479 о противопожарном режиме, РД-11-02-2006 и РД-11-05-2007.\n'
    '2. Обязательно указывай номер пункта. Формат ссылки: '
    '"СП 70.13330.2012, п. 5.3.7" или "ГОСТ 5264-80, п. 3".\n'
    '3. Не выдумывай номера пунктов и следи, чтобы документ соответствовал теме: '
    'сварка и металлоконструкции — ГОСТ 5264-80 и СП 70.13330.2012 раздел 10; '
    'бетон и опалубка — СП 70.13330.2012 раздел 5; кирпичная кладка — раздел 9; '
    'земляные работы и основания — СП 45.13330.2017; кровля — СП 17.13330.2017; '
    'пожарная автоматика и дымоудаление — СП 7.13130.2013 и СП 484.1311500.2020; '
    'электромонтаж — ПУЭ-7 и СП 76.13330.2016; исполнительная документация — '
    'РД-11-02-2006 и РД-11-05-2007; охрана труда на высоте — Приказ Минтруда № 782н; '
    'полы и стяжки — СП 29.13330.2011; отделка — СП 71.13330.2017; '
    'огнезащита конструкций — СП 2.13130.2020 и ГОСТ Р 53292-2009; '
    'фасады и утепление — СП 293.1325800.2017; окна и витражи — ГОСТ 30971-2012; '
    'вентиляция и отопление — СП 60.13330.2020 и СП 73.13330.2016; '
    'водоснабжение и канализация — СП 30.13330.2020; '
    'лифты — ТР ТС 011/2011; геодезия — СП 126.13330.2012; '
    'бетонные работы зимой — СП 70.13330.2012 раздел 5.11.\n'
    '4. Каждому замечанию — свой пункт. Не повторяй один и тот же номер для разных тем, '
    'если темы не совпадают. Пункт 5.3.7 относится только к уплотнению бетонной смеси.\n'
    '5. Поле name — краткая суть требования, 3-6 слов, без слова "нарушение".\n'
    '6. Отвечай строго JSON-массивом, без markdown, без пояснений, '
    'по одному объекту на каждое замечание в исходном порядке.\n\n'
    'Формат: [{"ref":"<документ>, п. <номер>","name":"<суть требования>"}]\n\n'
    'Замечания:\n'
)


def parse_ai(text, count):
    m = re.search(r'\[.*\]', text, re.S)
    if not m:
        return None
    parsed = json.loads(m.group(0))
    if len(parsed) != count:
        return None
    return [
        {'ref': str(p.get('ref', '')), 'name': str(p.get('name', '')), 'source': 'ai', 'score': 9}
        for p in parsed
    ]


_TOKEN = {'value': '', 'exp': 0}


def giga_token(auth, ctx):
    if _TOKEN['value'] and time.time() < _TOKEN['exp']:
        return _TOKEN['value']
    r = requests.post(
        'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
        data={'scope': 'GIGACHAT_API_PERS'},
        headers={
            'Authorization': f'Basic {auth}',
            'RqUID': str(uuid.uuid4()),
            'Accept': 'application/json',
        },
        timeout=8,
        verify=False,
    )
    r.raise_for_status()
    token = r.json()['access_token']
    _TOKEN['value'] = token
    _TOKEN['exp'] = time.time() + 1500
    return token


def ask_gigachat(prompt, count, budget):
    auth = os.environ.get('GIGACHAT_AUTH_KEY', '')
    if not auth:
        return None
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    started = time.time()
    token = giga_token(auth, ctx)
    left = budget - (time.time() - started)
    if left < 1:
        raise TimeoutError('не хватило времени на запрос к ИИ')

    r = requests.post(
        'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
        json={
            'model': 'GigaChat-2',
            'temperature': 0.1,
            'max_tokens': 900,
            'messages': [{'role': 'user', 'content': prompt}],
        },
        headers={'Authorization': f'Bearer {token}', 'Accept': 'application/json'},
        timeout=left,
        verify=False,
    )
    r.raise_for_status()
    return parse_ai(r.json()['choices'][0]['message']['content'], count)


def ask_gemini(prompt, count, budget):
    key = os.environ.get('GEMINI_API_KEY', '')
    if not key:
        return None
    r = requests.post(
        'https://generativelanguage.googleapis.com/v1beta/models/'
        'gemini-2.0-flash:generateContent',
        params={'key': key},
        json={
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 1200},
        },
        timeout=budget,
    )
    r.raise_for_status()
    text = r.json()['candidates'][0]['content']['parts'][0]['text']
    return parse_ai(text, count)


def ask_mistral(prompt, count, budget):
    key = os.environ.get('MISTRAL_API_KEY', '')
    if not key:
        return None
    r = requests.post(
        'https://api.mistral.ai/v1/chat/completions',
        json={
            'model': 'mistral-small-latest',
            'temperature': 0.1,
            'max_tokens': 1200,
            'messages': [{'role': 'user', 'content': prompt}],
        },
        headers={'Authorization': f'Bearer {key}'},
        timeout=budget,
    )
    r.raise_for_status()
    return parse_ai(r.json()['choices'][0]['message']['content'], count)


def ask_deepseek(prompt, count, budget):
    key = os.environ.get('DEEPSEEK_API_KEY', '')
    if not key:
        return None
    r = requests.post(
        'https://api.deepseek.com/chat/completions',
        json={
            'model': 'deepseek-chat',
            'temperature': 0.1,
            'max_tokens': 1500,
            'messages': [{'role': 'user', 'content': prompt}],
        },
        headers={'Authorization': f'Bearer {key}'},
        timeout=budget,
    )
    r.raise_for_status()
    return parse_ai(r.json()['choices'][0]['message']['content'], count)


def ask_ai(items, budget):
    prompt = PROMPT_HEAD + '\n'.join(f'{i + 1}. {t}' for i, t in enumerate(items))
    errors = []
    deadline = time.time() + budget
    for fn in (ask_deepseek, ask_gemini, ask_mistral, ask_gigachat):
        left = deadline - time.time()
        if left < 1.5:
            errors.append('время ожидания ИИ исчерпано')
            break
        try:
            res = fn(prompt, len(items), left)
            if res:
                return res, errors
            errors.append(f'{fn.__name__}: нет ключа или пустой ответ')
        except Exception as e:
            errors.append(f'{fn.__name__}: {type(e).__name__} {e}')
    return None, errors


def probe_providers():
    """Проверка, какие ИИ-сервисы отвечают и с какими ключами."""
    out = {}
    for name, fn in (
        ('deepseek', ask_deepseek),
        ('gemini', ask_gemini),
        ('mistral', ask_mistral),
        ('gigachat', ask_gigachat),
    ):
        env = {
            'deepseek': 'DEEPSEEK_API_KEY',
            'gemini': 'GEMINI_API_KEY',
            'mistral': 'MISTRAL_API_KEY',
            'gigachat': 'GIGACHAT_AUTH_KEY',
        }[name]
        if not os.environ.get(env):
            out[name] = 'ключ не задан'
            continue
        t = time.time()
        try:
            res = fn(PROMPT_HEAD + '1. Мусор на строительной площадке', 1, 12)
            out[name] = {'sec': round(time.time() - t, 2), 'result': res}
        except Exception as e:
            out[name] = f'{type(e).__name__} за {round(time.time() - t, 1)}с: {str(e)[:120]}'
    return out


def check_key():
    have = [
        n
        for n, e in (
            ('DeepSeek', 'DEEPSEEK_API_KEY'),
            ('Google Gemini', 'GEMINI_API_KEY'),
            ('Mistral', 'MISTRAL_API_KEY'),
            ('GigaChat', 'GIGACHAT_AUTH_KEY'),
        )
        if os.environ.get(e)
    ]
    if not have:
        return {'ok': False, 'message': 'Ни один ИИ-ключ не добавлен, работает база норм'}
    return {'ok': True, 'message': 'Подключено: ' + ', '.join(have), 'providers': have}


def handler(event: dict, context) -> dict:
    """Подбор нарушенного пункта норм и правил по тексту замечания инспектора."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}
    if event.get('httpMethod') != 'POST':
        return resp(405, {'error': 'method_not_allowed'})

    body = json.loads(event.get('body') or '{}')

    if body.get('action') == 'check':
        return resp(200, check_key())

    if body.get('action') == 'providers':
        return resp(200, probe_providers())

    if body.get('action') == 'learn':
        text = str(body.get('text') or '').strip()
        ref = str(body.get('ref') or '').strip()
        if not text or not ref:
            return resp(400, {'error': 'text_and_ref_required'})
        cache_put(
            [(text, {'ref': ref, 'name': str(body.get('name') or '')})],
            manual=True,
            author=str(body.get('author') or ''),
        )
        return resp(200, {'ok': True, 'phrase': norm_phrase(text)})

    if body.get('action') == 'stats':
        try:
            with psycopg2.connect(os.environ['DATABASE_URL']) as conn:
                cur = conn.cursor()
                cur.execute(
                    'SELECT COUNT(*), COALESCE(SUM(hits), 0), '
                    'COUNT(*) FILTER (WHERE manual) FROM norms_cache'
                )
                total, hits, manual = cur.fetchone()
            return resp(
                200,
                {
                    'learned': int(total),
                    'reuses': int(hits),
                    'manual': int(manual),
                    'builtin': len(RULES),
                },
            )
        except Exception as e:
            return resp(200, {'error': f'{type(e).__name__}'})

    items = body.get('items') or ([body['text']] if body.get('text') else [])
    if not items:
        return resp(400, {'error': 'items_required'})

    budget = float(body.get('budget') or 20)
    debug = []
    local = [match_local(t) for t in items]
    results = [None] * len(items)

    cached = cache_get(items)
    for i, t in enumerate(items):
        if t in cached:
            results[i] = {**cached[t], 'alts': local[i].get('alts', [])}

    todo = [i for i, r in enumerate(results) if r is None]
    if todo:
        ai, debug = ask_ai([items[i] for i in todo], budget)
        if ai:
            fresh = []
            for k, i in enumerate(todo):
                m = ai[k] if k < len(ai) else None
                if m and m.get('ref'):
                    results[i] = {**m, 'alts': local[i].get('alts', [])}
                    fresh.append((items[i], m))
            cache_put(fresh)

    for i, r in enumerate(results):
        if r is None:
            results[i] = local[i]

    out = {'items': results}
    if body.get('debug'):
        out['debug'] = debug
    return resp(200, out)