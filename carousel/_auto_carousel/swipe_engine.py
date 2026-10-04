# -*- coding: utf-8 -*-
"""크로닛 스와이프파일형 캐러셀 제너릭 렌더러 (Pexels 사진 배경).
deck 스펙을 받아 커버 + 카드들 + CTA 렌더. hooks7 디자인을 데이터 기반으로 일반화.
deck = {
  "id": "hooks7",
  "panel_label": "바로 쓰는 훅 템플릿",
  "cover": {"tag":"· 쇼핑 릴스 훅", "lines":["스크롤 멈추게 하는","쇼핑 릴스 훅"], "hl":"터지는 공식 7",
            "sub":"바로 복붙하는 템플릿까지 · 이 글 저장해두세요", "q":"person filming ..."},
  "eyebrow": "쇼핑 릴스 훅 공식",
  "cards": [{"no":"01","name":"반전 공개","why":"...","tpl":"...","ex":"...","q":"..."}, ...],
  "cta": {"lines":["훅은 잡았는데","대본이 막막하다면?"],
          "sub":["크로닛이 매일 터지는 쇼핑 소재를 찾아주고,","내 말투 그대로 대본까지 뽑아줍니다."],
          "end":"어떤 훅이 제일 끌려요? 댓글로 알려주세요", "q":"..."},
  "caption": "..."
}
"""
import os
from PIL import Image, ImageDraw
import carousel_engine as E
from carousel_engine import F, wof, wrap, photo_bg, BHS, NB, GM, LOGO, W, H

MX = 72
WHITE = (247, 248, 252)
GREY = (205, 210, 222)
DIM = (150, 156, 170)
AC = (255, 110, 36)

def _sh(d, xy, txt, font, fill=WHITE, sh=(0, 0, 0), off=3):
    x, y = xy
    d.text((x+off, y+off), txt, font=font, fill=sh)
    d.text((x, y), txt, font=font, fill=fill)

def _eyebrow(d, txt, y=90):
    d.rectangle([MX, y+3, MX+8, y+34], fill=AC)
    _sh(d, (MX+22, y), txt, F(NB, 27), (225, 228, 236), off=2)

def _logo(im, cx, y, h=30):
    try:
        lg = Image.open(LOGO).convert("RGBA"); w = int(lg.width*(h/lg.height))
        lg = lg.resize((w, h)); im.paste(lg, (int(cx-w/2), y), lg)
    except Exception:
        pass

def _dots(im, i, n):
    d = ImageDraw.Draw(im); r = 5; gap = 20; x0 = W//2-(n-1)*gap//2; y = H-44
    for k in range(n):
        d.ellipse([x0+k*gap-r, y-r, x0+k*gap+r, y+r], fill=AC if k == i-1 else (255, 255, 255, 90))

def _hl(d, x, y, txt, f, pad=10):
    w = wof(d, txt, f); bb = d.textbbox((x, y), txt, font=f)
    d.rounded_rectangle([x-pad, bb[1]-8, x+w+pad, bb[3]+12], 12, fill=AC)
    d.text((x, y), txt, font=f, fill=(16, 12, 9)); return w

def _bg(q, dark):
    return photo_bg(q, dark).convert("RGB")

def _cover(path, cv, n):
    im = _bg(cv["q"], cv.get("dark", 0.52)); d = ImageDraw.Draw(im)
    _sh(d, (MX, 80), "CHRONIT", F(NB, 30), WHITE, off=2)
    _sh(d, (MX+150, 84), cv.get("tag", "· 쇼핑 릴스"), F(NB, 26), (200, 205, 218), off=2)
    y = 470
    for t in cv["lines"]:
        _sh(d, (MX, y), t, F(BHS, 104), WHITE, off=4); y += 120
    y += 14
    _hl(d, MX, y, cv["hl"], F(BHS, 92)); y += 158
    _sh(d, (MX, y), cv["sub"], F(GM, 30), GREY, off=2)
    _logo(im, W/2, H-92, 30); _dots(im, 1, n); im.save(path, quality=93)

def _card(path, i, n, total, eyebrow, panel_label, c):
    im = _bg(c["q"], c.get("dark", 0.68)); d = ImageDraw.Draw(im)
    _eyebrow(d, f"{eyebrow} · {c['no']}/{total:02d}", 90)
    ny = 220
    d.text((MX, ny), c["no"], font=F(BHS, 120), fill=AC)
    nx = MX + wof(d, c["no"], F(BHS, 120)) + 28
    _sh(d, (nx, ny+26), c["name"], F(BHS, 72), WHITE, off=3)
    wy = 408
    _sh(d, (MX, wy), c.get("why_label", "왜 먹히나"), F(NB, 26), AC, (0, 0, 0), off=2); wy += 44
    for ln in wrap(d, c["why"], F(GM, 34), W-2*MX)[:2]:
        _sh(d, (MX, wy), ln, F(GM, 34), GREY, off=2); wy += 48
    py = 620; ph = 232
    d.rounded_rectangle([MX, py, W-MX, py+ph], 22, fill=(16, 17, 22))
    d.rectangle([MX, py+24, MX+7, py+ph-24], fill=AC)
    d.text((MX+34, py+28), panel_label, font=F(NB, 27), fill=AC)
    ty = py+80
    for ln in wrap(d, c["tpl"], F(NB, 42), W-2*MX-68)[:2]:  # NB=글리프 완전(·→ 포함)
        d.text((MX+34, ty), ln, font=F(NB, 42), fill=WHITE); ty += 54
    d.text((MX+34, py+ph-52), "예) " + c["ex"], font=F(GM, 29), fill=DIM)
    _sh(d, (MX, H-96), "@chronit · chronit.kr", F(GM, 26), DIM, off=2)
    _dots(im, i, n); im.save(path, quality=93)

def _cta(path, i, n, ct):
    im = _bg(ct["q"], ct.get("dark", 0.6)); d = ImageDraw.Draw(im)
    _sh(d, (MX, 90), "CHRONIT", F(NB, 30), WHITE, off=2)
    y = 440
    for t in ct["lines"]:
        _sh(d, (MX, y), t, F(BHS, 88), WHITE, off=4); y += 104
    y += 28
    for t in ct["sub"]:
        _sh(d, (MX, y), t, F(GM, 32), GREY, off=2); y += 46
    y += 40
    f = F(BHS, 46); label = ct.get("btn", "chronit.kr 에서 무료로 시작")
    d.rounded_rectangle([MX, y, MX+wof(d, label, f)+56, y+86], 16, fill=AC)
    d.text((MX+28, y+18), label, font=f, fill=(16, 12, 9))
    # 모든 포맷 공통 강제: '댓글에 크로닛 남겨주세요' 를 크게 ('크로닛'은 브랜드 블루)
    ey = y + 150; fB = F(NB, 46)
    p1, p2, p3 = "댓글에 ", "'크로닛'", " 남겨주세요"
    x = MX
    _sh(d, (x, ey), p1, fB, WHITE, off=3); x += wof(d, p1, fB)
    _sh(d, (x, ey), p2, fB, AC, off=3); x += wof(d, p2, fB)
    _sh(d, (x, ey), p3, fB, WHITE, off=3)
    _sh(d, (MX, ey+64), ct["end"], F(GM, 28), GREY, off=2)
    _logo(im, W/2, H-92, 30); _dots(im, i, n); im.save(path, quality=93)

def render_deck(deck, outdir):
    os.makedirs(outdir, exist_ok=True)
    cards = deck["cards"]; n = 2 + len(cards)
    _cover(f"{outdir}/01.jpg", deck["cover"], n)
    for k, c in enumerate(cards):
        _card(f"{outdir}/{k+2:02d}.jpg", k+2, n, len(cards), deck["eyebrow"], deck["panel_label"], c)
    _cta(f"{outdir}/{n:02d}.jpg", n, n, deck["cta"])
    return n
