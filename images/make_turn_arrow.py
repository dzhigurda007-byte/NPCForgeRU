"""Жёлтая стрелка «чей ход» для AD5 FX: остриём вниз, с тёмной обводкой и тенью.
Запуск: python3 make_turn_arrow.py  →  turn-arrow.png рядом со скриптом."""
import os
from PIL import Image, ImageDraw, ImageFilter
W, H, SS = 160, 200, 4
w, h = W*SS, H*SS
def arrow(scale=1.0, dx=0, dy=0):
    cx = w/2 + dx
    pts = [(cx-0.20*w, 0.06*h), (cx+0.20*w, 0.06*h), (cx+0.20*w, 0.46*h), (cx+0.42*w, 0.46*h),
           (cx, 0.94*h), (cx-0.42*w, 0.46*h), (cx-0.20*w, 0.46*h)]
    return [(x, y+dy) for x, y in pts]
img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
ImageDraw.Draw(shadow).polygon(arrow(dx=6*SS, dy=6*SS), fill=(0, 0, 0, 110))
img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(5*SS)))
d = ImageDraw.Draw(img)
d.polygon(arrow(), fill=(255, 212, 0, 255), outline=(60, 40, 0, 255), width=7*SS)
# блик на левой грани
cx = w/2
d.polygon([(cx-0.15*w, 0.10*h), (cx-0.06*w, 0.10*h), (cx-0.06*w, 0.50*h), (cx-0.15*w, 0.50*h)], fill=(255, 245, 170, 200))
img = img.resize((W, H), Image.LANCZOS)
img.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'turn-arrow.png'), optimize=True)
print('turn-arrow.png', img.size)
