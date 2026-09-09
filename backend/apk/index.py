import base64
import json
import os
import urllib.request

SITE = os.environ.get('APK_SOURCE_URL', 'https://xn--e1afhkhdkdm.su/app/stroykontrol.apk')
VER_URL = os.environ.get('APK_VERSION_URL', 'https://xn--e1afhkhdkdm.su/app/version.json')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def _fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': 'apk-proxy'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def handler(event: dict, context) -> dict:
    """Отдаёт установочный файл Android с правильным типом, чтобы телефон
    распознал его как приложение, а не как архив."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    params = event.get('queryStringParameters') or {}

    if params.get('info') == '1':
        data = json.loads(_fetch(VER_URL).decode('utf-8'))
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache'},
            'isBase64Encoded': False,
            'body': json.dumps(data, ensure_ascii=False),
        }

    blob = _fetch(SITE)
    return {
        'statusCode': 200,
        'headers': {
            **CORS,
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Disposition': 'attachment; filename="stroykontrol.apk"',
            'Cache-Control': 'no-cache',
        },
        'isBase64Encoded': True,
        'body': base64.b64encode(blob).decode('ascii'),
    }
