"""Проверка подписанной транзакции App Store (StoreKit 2, JWS).

Транзакцию подписывает Apple. В заголовке лежит цепочка сертификатов:
сертификат подписи → промежуточный Apple → корневой Apple Root CA - G3.
Проверяем, что корень — именно Apple (по отпечатку), что каждое звено
подписано следующим, и что сама транзакция подписана первым звеном.
"""

import base64
import hashlib
import json

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature

APPLE_ROOT_G3_SHA256 = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179'


def _b64url(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + '=' * (-len(data) % 4))


def _check_link(child, parent):
    parent.public_key().verify(
        child.signature,
        child.tbs_certificate_bytes,
        ec.ECDSA(child.signature_hash_algorithm),
    )


def decode_transaction(jws: str) -> dict:
    parts = jws.split('.')
    if len(parts) != 3:
        raise ValueError('bad_jws')
    header = json.loads(_b64url(parts[0]))
    if header.get('alg') != 'ES256':
        raise ValueError('bad_alg')
    chain = [x509.load_der_x509_certificate(base64.b64decode(c)) for c in header.get('x5c', [])]
    if len(chain) != 3:
        raise ValueError('bad_chain')

    root_der = base64.b64decode(header['x5c'][2])
    if hashlib.sha256(root_der).hexdigest() != APPLE_ROOT_G3_SHA256:
        raise ValueError('not_apple')
    _check_link(chain[0], chain[1])
    _check_link(chain[1], chain[2])

    sig = _b64url(parts[2])
    if len(sig) != 64:
        raise ValueError('bad_sig')
    der = encode_dss_signature(int.from_bytes(sig[:32], 'big'), int.from_bytes(sig[32:], 'big'))
    chain[0].public_key().verify(der, f'{parts[0]}.{parts[1]}'.encode(), ec.ECDSA(hashes.SHA256()))

    return json.loads(_b64url(parts[1]))
