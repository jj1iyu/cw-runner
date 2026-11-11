"""アプリのアイコン（public/*.png）を作り直す

紺の地に「CW」の文字と、水色のモールス符号（C = -.-.  W = .--）を描きます。
使い方: python3 tools/make-icons.py   （Pillow と DejaVu Sans Mono Bold フォントが必要）
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

OUT = pathlib.Path(__file__).resolve().parent.parent / 'public'
BG = (15, 27, 45)      # 背景（--bg）
ACC = (79, 195, 247)   # 符号（--acc）
FG = (227, 236, 247)   # 文字（--fg）
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'


def make(size, maskable=False, rounded=True):
    sc = 4
    S = size * sc
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=BG)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BG)
    w = S * (0.62 if maskable else 0.8)  # maskable は周りを切り取られても収まるよう小さめに
    f = ImageFont.truetype(FONT, int(w * 0.42))
    bb = d.textbbox((0, 0), 'CW', font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((S - tw) / 2 - bb[0], S * 0.5 - th * 0.85 - bb[1]), 'CW', font=f, fill=FG)
    u = w / 23
    h = u * 1.25
    y = S * 0.5 + th * 0.38
    seq = '-.-. .--'
    total = sum((3 if c == '-' else 1) + (1 if i < len(seq) - 1 else 0) for i, c in enumerate(seq))
    x = (S - total * u) / 2
    for c in seq:
        if c == ' ':
            x += u
            continue
        L = 3 * u if c == '-' else u
        d.rounded_rectangle([x, y, x + L, y + h], radius=h / 2, fill=ACC)
        x += L + u
    return im.resize((size, size), Image.LANCZOS)


make(192).save(OUT / 'icon-192.png')
make(512).save(OUT / 'icon-512.png')
make(512, maskable=True).save(OUT / 'icon-maskable-512.png')
make(180, rounded=False).convert('RGB').save(OUT / 'apple-touch-icon.png')
make(48).save(OUT / 'favicon-48.png')
print('icons written to', OUT)
