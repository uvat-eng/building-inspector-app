"""Собственный архив замечаний со ссылками на НтД.

Источник — единая база 2093 записей по объектам ГСИ. Поиск идёт сначала
по архиву, и только если похожего замечания там нет — вопрос уходит к ИИ.
"""

import base64
import gzip
import json
import re

from archive_data import BLOB

_ARCH = {'rows': None, 'idx': None}

STOP = {
    'в', 'на', 'не', 'и', 'с', 'по', 'для', 'из', 'от', 'до', 'при', 'без', 'что',
    'как', 'или', 'а', 'но', 'к', 'о', 'об', 'у', 'за', 'над', 'под', 'то', 'так',
    'осях', 'оси', 'шт', 'мм', 'см', 'м', 'п', 'пос', 'поз', 'ул', 'г', 'да', 'нет',
    'было', 'был', 'были', 'есть', 'этом', 'этой', 'этого', 'также', 'том', 'нём',
}


def words(text):
    raw = re.findall(r'[а-яёa-z0-9]+', str(text).lower())
    return [w[:7] for w in raw if len(w) > 2 and w not in STOP and not w.isdigit()]


def load():
    if _ARCH['rows'] is not None:
        return _ARCH['rows'], _ARCH['idx']
    try:
        rows = json.loads(gzip.decompress(base64.b64decode(BLOB)).decode('utf-8'))
    except Exception:
        rows = []

    idx = {}
    prepared = []
    for i, r in enumerate(rows):
        uniq = set(words(r[0]))
        prepared.append({
            'text': r[0],
            'ref': r[1],
            'kind': r[2],
            'object': '',
            'date': r[3],
            'set': uniq,
            'len': len(uniq) or 1,
        })
        for w in uniq:
            idx.setdefault(w, []).append(i)

    _ARCH['rows'] = prepared
    _ARCH['idx'] = idx
    return prepared, idx


def search(text, limit=5):
    """Кандидаты из архива, отсортированные по близости к тексту замечания."""
    rows, idx = load()
    if not rows:
        return []

    qs = set(words(text))
    if not qs:
        return []

    hits = {}
    for w in qs:
        bucket = idx.get(w)
        if not bucket or len(bucket) > 600:
            continue
        weight = 1.0 + (2.0 if len(bucket) < 40 else 0.0)
        for i in bucket:
            hits[i] = hits.get(i, 0.0) + weight

    if not hits:
        return []

    ranked = []
    for i, raw in hits.items():
        r = rows[i]
        inter = len(qs & r['set'])
        union = len(qs | r['set']) or 1
        jac = inter / union
        cover = inter / (len(qs) or 1)
        score = jac * 0.55 + cover * 0.45 + min(raw, 30) / 300
        ranked.append((score, jac, cover, i))

    ranked.sort(key=lambda x: -x[0])
    out = []
    seen_refs = set()
    for score, jac, cover, i in ranked[: limit * 4]:
        r = rows[i]
        key = r['ref'].lower()
        if key in seen_refs:
            continue
        seen_refs.add(key)
        out.append({
            'text': r['text'],
            'ref': r['ref'],
            'kind': r['kind'],
            'object': r['object'],
            'date': r['date'],
            'score': round(score, 3),
            'jaccard': round(jac, 3),
            'cover': round(cover, 3),
        })
        if len(out) >= limit:
            break
    return out


def strong(cand):
    """Практически дословное совпадение — можно брать без обращения к ИИ."""
    return bool(cand) and cand[0]['jaccard'] >= 0.58 and cand[0]['cover'] >= 0.8


def worth_ai(cand):
    """Есть ли смысл спрашивать ИИ по этим кандидатам."""
    return bool(cand) and cand[0]['cover'] >= 0.34


def total():
    rows, _ = load()
    return len(rows)