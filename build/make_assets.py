"""Generate the icon assets required by electron-builder and Microsoft Store.

Pure standard library so it runs on a clean machine. Re-run with:
    python build/make_assets.py
"""
import math
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
APPX = os.path.join(HERE, 'appx')
os.makedirs(APPX, exist_ok=True)

BG_TOP = (255, 246, 229)
BG_BOTTOM = (255, 232, 190)
COIN = (243, 178, 58)
COIN_LIGHT = (255, 214, 122)
EDGE = (176, 112, 14)
INK = (104, 60, 4)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def soft(v, feather=1.1):
    return max(0.0, min(1.0, v / feather + 0.5))


def disc(x, y, cx, cy, r, feather=1.1):
    return soft(r - math.hypot(x - cx, y - cy), feather)


def ring(x, y, cx, cy, r, thick):
    return soft(thick / 2 - abs(math.hypot(x - cx, y - cy) - r), 1.0)


def segment(x, y, x1, y1, x2, y2, thick):
    dx, dy = x2 - x1, y2 - y1
    den = dx * dx + dy * dy
    t = 0 if den == 0 else max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / den))
    return soft(thick / 2 - math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)), 1.0)


def rect(x, y, x0, y0, x1, y1, feather=1.0):
    dx = min(x - x0, x1 - x)
    dy = min(y - y0, y1 - y)
    return soft(min(dx, dy), feather)


def paint(pixels, i, color, alpha):
    if alpha > 0:
        pixels[i] = mix(pixels[i], color, min(1.0, alpha))


def draw_coin(pixels, w, h, cx, cy, r):
    scale = r / 48.0
    layers = [
        ('disc', (cx, cy, r * 1.2), COIN_LIGHT, 0.32),
        ('disc', (cx, cy, r), COIN, 1.0),
        ('ring', (cx, cy, r - 1.4 * scale, 3.0 * scale), EDGE, 0.95),
        ('ring', (cx, cy, r * 0.74, 1.7 * scale), EDGE, 0.55),
    ]
    for y in range(h):
        for x in range(w):
            i = y * w + x
            for kind, params, color, alpha in layers:
                if kind == 'disc':
                    a = disc(x, y, *params)
                else:
                    a = ring(x, y, *params)
                paint(pixels, i, color, a * alpha)

    thick = max(1.6, r * 0.17)
    lines = [
        (cx - r * 0.44, cy - r * 0.46, cx, cy + r * 0.02),
        (cx + r * 0.44, cy - r * 0.46, cx, cy + r * 0.02),
        (cx, cy + r * 0.02, cx, cy + r * 0.54),
        (cx - r * 0.40, cy + r * 0.13, cx + r * 0.40, cy + r * 0.13),
        (cx - r * 0.40, cy + r * 0.31, cx + r * 0.40, cy + r * 0.31),
    ]
    for y in range(h):
        for x in range(w):
            a = 0.0
            for x1, y1, x2, y2 in lines:
                a = max(a, segment(x, y, x1, y1, x2, y2, thick))
            paint(pixels, y * w + x, INK, a)

    for y in range(h):
        for x in range(w):
            a = disc(x, y, cx - r * 0.34, cy - r * 0.42, r * 0.17)
            paint(pixels, y * w + x, (255, 245, 214), a * 0.5)


def render(w, h, wide=False):
    pixels = [()] * (w * h)
    for y in range(h):
        base = mix(BG_TOP, BG_BOTTOM, y / max(1, h - 1) * 0.85)
        for x in range(w):
            pixels[y * w + x] = base

    if wide:
        cx, cy = w * 0.27, h * 0.5
        r = min(w, h) * 0.31
    else:
        cx, cy = w * 0.5, h * 0.5
        r = min(w, h) * 0.33

    for px, py, pr in [(0.12, 0.18, 0.10), (0.88, 0.82, 0.08), (0.86, 0.16, 0.05)]:
        for y in range(h):
            for x in range(w):
                a = disc(x, y, w * px, h * py, min(w, h) * pr)
                paint(pixels, y * w + x, COIN_LIGHT, a * 0.45)

    draw_coin(pixels, w, h, cx, cy, r)

    if wide:
        x0, x1 = cx + r * 1.45, w * 0.88
        for k, width in enumerate((0.92, 0.72, 0.52)):
            y0 = cy - r * 0.44 + k * r * 0.38
            y1 = y0 + r * 0.17
            end = x0 + (x1 - x0) * width
            color = EDGE if k == 0 else mix(EDGE, BG_BOTTOM, 0.45)
            for y in range(h):
                for x in range(w):
                    a = rect(x, y, x0, y0, end, y1)
                    paint(pixels, y * w + x, color, a * (0.85 if k == 0 else 0.6))

    return pixels


def png_bytes(w, h, pixels):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            r, g, b = pixels[y * w + x]
            raw += bytes((r, g, b, 255))

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))


def write_png(path, w, h, pixels):
    with open(path, 'wb') as f:
        f.write(png_bytes(w, h, pixels))


def write_ico(path, data, size):
    header = struct.pack('<HHH', 0, 1, 1)
    dim = 0 if size >= 256 else size
    entry = struct.pack('<BBBBHHII', dim, dim, 0, 0, 1, 32, len(data), 22)
    with open(path, 'wb') as f:
        f.write(header + entry + data)


def main():
    icon = render(256, 256)
    data = png_bytes(256, 256, icon)
    write_png(os.path.join(HERE, 'icon.png'), 256, 256, icon)
    write_ico(os.path.join(HERE, 'icon.ico'), data, 256)

    assets = [
        ('StoreLogo.png', 50, 50, False),
        ('Square150x150Logo.png', 150, 150, False),
        ('Square44x44Logo.png', 44, 44, False),
        ('Wide310x150Logo.png', 310, 150, True),
    ]
    for name, w, h, wide in assets:
        write_png(os.path.join(APPX, name), w, h, render(w, h, wide))
        print('written', name)

    print('written icon.png / icon.ico')


if __name__ == '__main__':
    main()
