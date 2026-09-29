"""
Правка бинарного манифеста (AXML) внутри готового APK.

Нужна, когда пересобрать приложение целиком нечем (нет Android SDK),
а в файл требуется добавить разрешение или поднять номер версии.

Формат AXML: заголовок, таблица строк, карта ресурсов, дерево тегов.
Строки для новых разрешений дописываются в конец таблицы — карта ресурсов
описывает только имена атрибутов в начале таблицы и потому не ломается.

Использование:
    python3 patch_manifest.py in.axml out.axml android.permission.RECORD_AUDIO
"""

import struct
import sys

CHUNK_POOL = 0x0001
START_TAG = 0x0102
END_TAG = 0x0103

# Смещения внутри чанка START_TAG
OFF_NAME = 20
OFF_ATTRS = 24
# Атрибуты идут после заголовка тега: chunk(8) + line(4) + comment(4) = 16
ATTR_BASE = 16
# Поля атрибута: ns(4) name(4) rawValue(4) typedValue(4) data(4)
A_NAME = 4
A_RAW = 8
A_DATA = 16


def read_pool(d, off=8):
    """Читает таблицу строк: список строк, признак utf8, размер чанка."""
    _, hs, sz = struct.unpack('<HHI', d[off:off + 8])
    cnt, _sty, flags, sstart, _ = struct.unpack('<IIIII', d[off + 8:off + 28])
    utf8 = bool(flags & (1 << 8))
    offs = struct.unpack('<%dI' % cnt, d[off + hs:off + hs + 4 * cnt])
    base = off + sstart
    items = []
    for o in offs:
        p = base + o
        if utf8:
            def rv(q):
                x = d[q]
                return (((x & 0x7f) << 8 | d[q + 1]), q + 2) if x & 0x80 else (x, q + 1)
            _, p = rv(p)
            n, p = rv(p)
            items.append(d[p:p + n].decode('utf-8'))
        else:
            n = struct.unpack('<H', d[p:p + 2])[0]
            p += 2
            if n & 0x8000:
                n = ((n & 0x7fff) << 16) | struct.unpack('<H', d[p:p + 2])[0]
                p += 2
            items.append(d[p:p + n * 2].decode('utf-16-le'))
    return items, utf8, sz


def build_pool(strings, utf8):
    """Собирает чанк таблицы строк заново."""
    blobs, offs, cur = [], [], 0
    for s in strings:
        offs.append(cur)
        if utf8:
            b = s.encode('utf-8')
            chunk = bytes([len(s), len(b)]) + b + b'\x00'
        else:
            b = s.encode('utf-16-le')
            chunk = struct.pack('<H', len(s)) + b + b'\x00\x00'
        blobs.append(chunk)
        cur += len(chunk)
    data = b''.join(blobs)
    data += b'\x00' * ((-len(data)) % 4)
    hs = 28
    sstart = hs + 4 * len(strings)
    size = sstart + len(data)
    flags = (1 << 8) if utf8 else 0
    head = struct.pack('<HHIIIIII', CHUNK_POOL, hs, size, len(strings), 0, flags, sstart, 0)
    return head + struct.pack('<%dI' % len(offs), *offs) + data


def walk(d, start):
    """Перебирает чанки: тип, смещение, размер."""
    pos = start
    while pos + 8 <= len(d):
        t, _hs, sz = struct.unpack('<HHI', d[pos:pos + 8])
        if sz == 0 or pos + sz > len(d):
            break
        yield t, pos, sz
        pos += sz


def tag_name(d, off):
    return struct.unpack('<I', d[off + OFF_NAME:off + OFF_NAME + 4])[0]


def attrs_of(d, off):
    """Отдаёт смещение каждого атрибута тега."""
    astart, asize, acount = struct.unpack('<HHH', d[off + OFF_ATTRS:off + OFF_ATTRS + 6])
    for k in range(acount):
        yield off + ATTR_BASE + astart + k * asize


def patch(src, dst, add_permissions=(), version_code=None, version_name=None):
    d = bytearray(open(src, 'rb').read())
    pool, utf8, pool_size = read_pool(d)
    body_start = 8 + pool_size

    name_idx = pool.index('name')
    perm_idx = pool.index('uses-permission')
    manifest_idx = pool.index('manifest')

    # Берём существующий uses-permission за образец вместе с его закрывающим тегом.
    chunks = list(walk(d, body_start))
    sample = None
    for i, (t, off, sz) in enumerate(chunks):
        if t == START_TAG and tag_name(d, off) == perm_idx:
            nt, noff, nsz = chunks[i + 1]
            if nt != END_TAG:
                raise SystemExit('за uses-permission нет закрывающего тега')
            sample = (off, sz, noff, nsz)
            break
    if sample is None:
        raise SystemExit('в манифесте нет тега uses-permission')

    strings = list(pool)
    for p in add_permissions:
        if p not in strings:
            strings.append(p)
    if version_name and version_name not in strings:
        strings.append(version_name)

    new_pool = build_pool(strings, utf8)
    body = bytearray(d[body_start:])

    s_off, s_sz, e_off, e_sz = sample
    tag_open = bytes(body[s_off - body_start:s_off - body_start + s_sz])
    tag_close = bytes(body[e_off - body_start:e_off - body_start + e_sz])

    # Клонируем образец, подменяя только значение атрибута name.
    blocks = b''
    for p in add_permissions:
        idx = strings.index(p)
        blk = bytearray(tag_open)
        for a in attrs_of(blk, 0):
            if struct.unpack('<I', blk[a + A_NAME:a + A_NAME + 4])[0] == name_idx:
                struct.pack_into('<I', blk, a + A_RAW, idx)
                struct.pack_into('<I', blk, a + A_DATA, idx)
        blocks += bytes(blk) + tag_close

    ins = s_off - body_start
    body[ins:ins] = blocks

    out = bytearray(d[:8]) + bytearray(new_pool) + body

    # Версия приложения хранится в атрибутах корневого тега manifest.
    if version_code is not None or version_name is not None:
        vc_idx = strings.index('versionCode')
        vn_idx = strings.index('versionName')
        for t, off, _sz in walk(out, 8 + len(new_pool)):
            if t != START_TAG or tag_name(out, off) != manifest_idx:
                continue
            for a in attrs_of(out, off):
                nm = struct.unpack('<I', out[a + A_NAME:a + A_NAME + 4])[0]
                if nm == vc_idx and version_code is not None:
                    struct.pack_into('<I', out, a + A_RAW, 0xffffffff)
                    struct.pack_into('<I', out, a + A_DATA, version_code)
                if nm == vn_idx and version_name is not None:
                    ni = strings.index(version_name)
                    struct.pack_into('<I', out, a + A_RAW, ni)
                    struct.pack_into('<I', out, a + A_DATA, ni)
            break

    struct.pack_into('<I', out, 4, len(out))
    open(dst, 'wb').write(bytes(out))


if __name__ == '__main__':
    patch(sys.argv[1], sys.argv[2], add_permissions=sys.argv[3:])
