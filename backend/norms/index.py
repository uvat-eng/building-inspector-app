import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request
import uuid

import requests
import urllib3

from norms_db import RULES, FALLBACK

urllib3.disable_warnings()

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
    'Ты инженер строительного контроля в России. Для каждого замечания укажи нарушенный '
    'пункт действующих норм РФ (СП, ГОСТ, ПУЭ, приказы Минтруда) и краткое название документа. '
    'Ответ строго JSON-массивом вида '
    '[{"ref":"СП 70.13330.2012, п. 5.3.7","name":"Уплотнение бетонной смеси"}] '
    'без пояснений, по одному объекту на каждое замечание в том же порядке.\n\nЗамечания:\n'
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


def ask_openrouter(prompt, count, budget):
    key = os.environ.get('OPENROUTER_API_KEY', '')
    if not key:
        return None
    req = urllib.request.Request(
        'https://openrouter.ai/api/v1/chat/completions',
        data=json.dumps(
            {
                'model': 'meta-llama/llama-3.3-70b-instruct:free',
                'temperature': 0.1,
                'messages': [{'role': 'user', 'content': prompt}],
            },
            ensure_ascii=False,
        ).encode(),
        headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=budget) as r:
        data = json.loads(r.read())
    return parse_ai(data['choices'][0]['message']['content'], count)


def ask_ai(items, budget):
    prompt = PROMPT_HEAD + '\n'.join(f'{i + 1}. {t}' for i, t in enumerate(items))
    errors = []
    deadline = time.time() + budget
    for fn in (ask_gigachat, ask_openrouter):
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


def probe():
    """Диагностика: сколько времени занимает каждый шаг обращения к ИИ."""
    auth = os.environ.get('GIGACHAT_AUTH_KEY', '')
    if not auth:
        return {'error': 'нет ключа'}
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    log = {}
    try:
        t = time.time()
        token = giga_token(auth, ctx)
        log['token_sec'] = round(time.time() - t, 2)

        t = time.time()
        req = urllib.request.Request(
            'https://gigachat.devices.sberbank.ru/api/v1/models',
            headers={'Authorization': f'Bearer {token}'},
        )
        with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
            data = json.loads(r.read())
        log['models_sec'] = round(time.time() - t, 2)
        log['models'] = [m.get('id') for m in data.get('data', [])]

        log['chat'] = {}
        t = time.time()
        try:
            r = requests.post(
                'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
                json={
                    'model': 'GigaChat-2',
                    'max_tokens': 16,
                    'stream': True,
                    'messages': [{'role': 'user', 'content': 'Скажи: привет'}],
                },
                headers={
                    'Authorization': f'Bearer {token}',
                    'Connection': 'close',
                    'Accept': 'application/json',
                    'User-Agent': 'GigaChat-Client/1.0',
                },
                timeout=(5, 15),
                verify=False,
                stream=True,
            )
            log['chat']['connect_ok'] = True
            log['chat']['headers_sec'] = round(time.time() - t, 2)
            log['chat']['code'] = r.status_code
            chunks = []
            for line in r.iter_lines(decode_unicode=True):
                if line:
                    chunks.append(line[:120])
                if len(chunks) >= 3:
                    break
            log['chat']['first_sec'] = round(time.time() - t, 2)
            log['chat']['chunks'] = chunks
            r.close()
        except Exception as e:
            log['chat']['error'] = f'{type(e).__name__} за {round(time.time() - t, 1)}с: {e}'[:200]
    except urllib.error.HTTPError as e:
        log['error'] = f'HTTP {e.code}: {e.read()[:200].decode(errors="replace")}'
    except Exception as e:
        log['error'] = f'{type(e).__name__}: {e}'
    return log


def check_key():
    auth = os.environ.get('GIGACHAT_AUTH_KEY', '')
    if not auth:
        return {'ok': False, 'stage': 'key', 'message': 'Ключ GigaChat не добавлен'}
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        req = urllib.request.Request(
            'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
            data=b'scope=GIGACHAT_API_PERS',
            headers={
                'Authorization': f'Basic {auth}',
                'RqUID': str(uuid.uuid4()),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
        )
        with urllib.request.urlopen(req, timeout=10, context=ctx) as r:
            data = json.loads(r.read())
        return {
            'ok': bool(data.get('access_token')),
            'stage': 'token',
            'message': 'Ключ действителен, токен получен',
        }
    except urllib.error.HTTPError as e:
        return {
            'ok': False,
            'stage': 'token',
            'message': f'GigaChat отклонил ключ: HTTP {e.code}',
        }
    except Exception as e:
        return {'ok': False, 'stage': 'token', 'message': f'{type(e).__name__}: {e}'}


def handler(event: dict, context) -> dict:
    """Подбор нарушенного пункта норм и правил по тексту замечания инспектора."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}
    if event.get('httpMethod') != 'POST':
        return resp(405, {'error': 'method_not_allowed'})

    body = json.loads(event.get('body') or '{}')

    if body.get('action') == 'check':
        return resp(200, check_key())

    if body.get('action') == 'probe':
        return resp(200, probe())

    items = body.get('items') or ([body['text']] if body.get('text') else [])
    if not items:
        return resp(400, {'error': 'items_required'})

    results = [match_local(t) for t in items]
    debug = []

    if body.get('ai'):
        budget = float(body.get('budget') or 20)
        ai, debug = ask_ai(items, budget)
        if ai:
            results = [
                {**a, 'alts': b.get('alts', [])} if a['ref'] else b for a, b in zip(ai, results)
            ]

    out = {'items': results}
    if body.get('debug'):
        out['debug'] = debug
    return resp(200, out)