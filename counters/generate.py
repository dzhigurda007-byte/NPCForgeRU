"""Наборы PNG-рамок для AD5 Counters: для каждого N — N+1 картинка (0…N делений).

Рамка — кольцо из N делений вокруг токена, деления начинаются сверху и идут по
часовой стрелке. Заполненные деления белые, пустые — полупрозрачные контуры:
Roll20 перекрашивает белое тонированием токена (tint), поэтому один набор
подходит для любого цвета. Центр прозрачный, токен остаётся виден.

Запуск: python3 generate.py [N ...]   (по умолчанию 2 3 4 5 6 8 10 12)
"""
import math, os, sys
from PIL import Image, ImageDraw

SIZE = 280          # итоговый размер PNG
SS = 4              # сглаживание: рисуем крупнее и уменьшаем
OUTER, INNER = 0.49, 0.40   # радиусы кольца (доля размера)
GAP_DEG = 5.0

def ring(n, filled):
    s = SIZE * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = s / 2
    ro, ri = OUTER * s, INNER * s
    step = 360.0 / n
    gap = GAP_DEG if n > 1 else 0
    for i in range(n):
        a0 = -90 + i * step + gap / 2
        a1 = -90 + (i + 1) * step - gap / 2
        pts = []
        k = max(8, int((a1 - a0) / 2))
        for j in range(k + 1):
            a = math.radians(a0 + (a1 - a0) * j / k)
            pts.append((c + ro * math.cos(a), c + ro * math.sin(a)))
        for j in range(k, -1, -1):
            a = math.radians(a0 + (a1 - a0) * j / k)
            pts.append((c + ri * math.cos(a), c + ri * math.sin(a)))
        if i < filled:
            d.polygon(pts, fill=(255, 255, 255, 255), outline=(40, 40, 40, 255), width=SS * 3)
        else:
            d.polygon(pts, fill=(255, 255, 255, 45), outline=(255, 255, 255, 170), width=SS * 3)
    return img.resize((SIZE, SIZE), Image.LANCZOS)

def main(ns):
    root = os.path.dirname(os.path.abspath(__file__))
    for n in ns:
        folder = os.path.join(root, 'ring-%02d' % n)
        os.makedirs(folder, exist_ok=True)
        for k in range(n + 1):
            ring(n, k).save(os.path.join(folder, 'ring-%02d-%02d.png' % (n, k)), optimize=True)
        print('ring-%02d: %d картинок' % (n, n + 1))

if __name__ == '__main__':
    main([int(x) for x in sys.argv[1:]] or [2, 3, 4, 5, 6, 8, 10, 12])
