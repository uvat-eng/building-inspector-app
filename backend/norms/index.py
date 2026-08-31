import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request
import uuid

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

RULES = [
    (['арматур', 'защитн', 'слой', 'бетон', 'фиксатор'],
     'СП 63.13330.2018, п. 10.3.2', 'Защитный слой бетона для арматуры'),
    (['бетон', 'уплотн', 'вибр', 'раковин', 'каверн', 'пустот'],
     'СП 70.13330.2012, п. 5.3.7', 'Уплотнение бетонной смеси'),
    (['бетон', 'уход', 'выдержив', 'полив', 'твердени'],
     'СП 70.13330.2012, п. 5.4.5', 'Уход за бетоном в процессе твердения'),
    (['опалуб', 'распалуб', 'геометр', 'отклонен'],
     'СП 70.13330.2012, п. 5.16.4', 'Точность установки опалубки'),
    (['сварн', 'шов', 'сварк', 'подрез', 'непровар', 'наплыв', 'пора'],
     'СП 70.13330.2012, п. 10.4', 'Качество сварных соединений'),
    (['сварщик', 'аттестац', 'удостоверен', 'нак'],
     'РД 03-495-02, п. 2.2', 'Аттестация сварщиков'),
    (['электрод', 'сертификат', 'паспорт', 'сварочн', 'материал'],
     'СП 70.13330.2012, п. 10.1.4', 'Входной контроль сварочных материалов'),
    (['антикорроз', 'окрас', 'грунт', 'покрыт', 'толщин', 'лкм'],
     'СП 28.13330.2017, п. 5.5', 'Антикоррозионная защита конструкций'),
    (['болт', 'затяж', 'момент', 'резьб', 'гайк'],
     'СП 70.13330.2012, п. 4.10', 'Постановка и натяжение болтов'),
    (['грунт', 'уплотнен', 'обратн', 'засып', 'коэффициент'],
     'СП 45.13330.2017, п. 6.3.6', 'Уплотнение грунтов обратной засыпки'),
    (['котлован', 'откос', 'креплен', 'обруш', 'траншея'],
     'СП 45.13330.2017, п. 6.1.10', 'Крепление стенок выемок'),
    (['свая', 'сваи', 'погружен', 'отказ', 'забивк'],
     'СП 45.13330.2017, п. 7.4', 'Погружение свай и контроль отказа'),
    (['гидроизоляц', 'кровл', 'примыкан', 'протечк', 'рулонн'],
     'СП 17.13330.2017, п. 5.6', 'Устройство кровель и примыканий'),
    (['трубопровод', 'испытан', 'давлен', 'опрессов', 'герметич'],
     'СП 74.13330.2011, п. 6.2', 'Испытание трубопроводов на прочность'),
    (['кабел', 'прокладк', 'радиус', 'изгиб', 'лоток'],
     'ПУЭ 7, п. 2.1.31', 'Прокладка кабелей и допустимые радиусы'),
    (['заземлен', 'занулен', 'ptn', 'контур', 'сопротивлен'],
     'ПУЭ 7, п. 1.7.103', 'Заземляющие устройства'),
    (['электроустановк', 'щит', 'автомат', 'маркировк', 'клемм'],
     'ПУЭ 7, п. 1.1.29', 'Монтаж и маркировка электроустановок'),
    (['каска', 'страхов', 'привяз', 'высот', 'ограждени', 'сиз'],
     'Приказ Минтруда № 883н, п. 16', 'Средства защиты при работе на высоте'),
    (['леса', 'подмост', 'настил', 'стремянк'],
     'СП 49.13330.2010, п. 6.2.7', 'Устройство лесов и подмостей'),
    (['журнал', 'исполнительн', 'документац', 'акт', 'скрыт'],
     'СП 48.13330.2019, п. 9.2', 'Ведение исполнительной документации'),
    (['геодезич', 'разбивк', 'отметк', 'нивелир', 'ось'],
     'СП 126.13330.2017, п. 4.7', 'Геодезическое обеспечение строительства'),
    (['сертификат', 'паспорт', 'качеств', 'материал', 'входн'],
     'СП 48.13330.2019, п. 7.1.3', 'Входной контроль материалов'),
    (['пожарн', 'огнезащ', 'горюч', 'огнетушит'],
     'СП 4.13130.2013, п. 4.3', 'Противопожарные требования'),
    (['утеплит', 'теплоизоляц', 'мостик', 'холод'],
     'СП 50.13330.2012, п. 5.1', 'Тепловая защита конструкций'),
    (['штукатур', 'отделк', 'облицов', 'плитк', 'ровност'],
     'СП 71.13330.2017, п. 7.2', 'Качество отделочных покрытий'),
    (['кабельн', 'сертификат', 'кабел', 'продукц', 'паспорт'],
     'СП 76.13330.2016, п. 4.2', 'Входной контроль электротехнической продукции'),
    (['знак', 'ограждени', 'сигнальн', 'лент', 'опасн', 'зона'],
     'СП 49.13330.2010, п. 6.2.2', 'Ограждение опасных зон на стройплощадке'),
    (['освещен', 'люкс', 'темно', 'прожектор'],
     'ГОСТ 12.1.046-2014, п. 4.2', 'Нормы освещения строительных площадок'),
    (['складир', 'хранен', 'штабел', 'навал', 'поддон'],
     'СП 49.13330.2010, п. 6.1.6', 'Складирование материалов и конструкций'),
    (['кран', 'строп', 'такелаж', 'груз', 'подъем'],
     'ФНП № 461, п. 23', 'Безопасность подъёмных сооружений'),
    (['баллон', 'газ', 'ацетилен', 'кислород', 'редуктор'],
     'ФНП № 536, п. 5.2', 'Обращение с газовыми баллонами'),
    (['лестниц', 'ограждени', 'перил', 'проем', 'люк'],
     'СП 49.13330.2010, п. 6.2.16', 'Ограждение проёмов и лестниц'),
    (['резьб', 'соединен', 'фланц', 'прокладк', 'арматур', 'запорн'],
     'СП 73.13330.2016, п. 4.4', 'Монтаж трубопроводов и арматуры'),
    (['уклон', 'водоотвод', 'дренаж', 'ливнев'],
     'СП 32.13330.2018, п. 6.2', 'Уклоны и водоотвод'),
    (['вентиляц', 'воздуховод', 'решетк', 'кратност'],
     'СП 73.13330.2016, п. 6.3', 'Монтаж систем вентиляции'),
    (['маркировк', 'бирк', 'обозначен', 'таблич'],
     'СП 76.13330.2016, п. 5.4', 'Маркировка оборудования и линий'),
    (['мусор', 'отход', 'уборк', 'захламл', 'чистот'],
     'СП 48.13330.2019, п. 6.3.4', 'Содержание строительной площадки'),
    (['проект', 'отступлен', 'несоответств', 'самовольн', 'изменен'],
     'ГрК РФ, ст. 52 ч. 6', 'Соответствие работ проектной документации'),
]

FALLBACK = ('СП 48.13330.2019, п. 5.5', 'Строительный контроль при строительстве')


def resp(code, body):
    return {'statusCode': code, 'headers': CORS, 'isBase64Encoded': False, 'body': json.dumps(body, ensure_ascii=False)}


def match_local(text: str):
    low = text.lower()
    best, score = None, 0
    for keys, ref, name in RULES:
        hits = sum(1 for k in keys if k in low)
        if hits > score:
            best, score = (ref, name), hits
    if not best or score < 1:
        return {'ref': FALLBACK[0], 'name': FALLBACK[1], 'source': 'base', 'score': 0}
    return {'ref': best[0], 'name': best[1], 'source': 'base', 'score': score}


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
    token_req = urllib.request.Request(
        'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
        data=b'scope=GIGACHAT_API_PERS',
        headers={
            'Authorization': f'Basic {auth}',
            'RqUID': str(uuid.uuid4()),
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
    )
    with urllib.request.urlopen(token_req, timeout=6, context=ctx) as r:
        token = json.loads(r.read())['access_token']
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

    chat_req = urllib.request.Request(
        'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
        data=json.dumps(
            {
                'model': 'GigaChat',
                'temperature': 0.1,
                'messages': [{'role': 'user', 'content': prompt}],
            },
            ensure_ascii=False,
        ).encode(),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(chat_req, timeout=left, context=ctx) as r:
        data = json.loads(r.read())
    return parse_ai(data['choices'][0]['message']['content'], count)


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

    items = body.get('items') or ([body['text']] if body.get('text') else [])
    if not items:
        return resp(400, {'error': 'items_required'})

    results = [match_local(t) for t in items]
    debug = []

    if body.get('ai') is not False:
        budget = float(body.get('budget') or 3.5)
        ai, debug = ask_ai(items, budget)
        if ai:
            results = [a if a['ref'] else b for a, b in zip(ai, results)]

    out = {'items': results}
    if body.get('debug'):
        out['debug'] = debug
    return resp(200, out)