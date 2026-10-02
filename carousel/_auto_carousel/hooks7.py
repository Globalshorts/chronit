# -*- coding: utf-8 -*-
"""크로닛 '쇼핑 릴스 터지는 훅 공식 7' 스와이프파일 캐러셀.
모든 슬라이드 Pexels 사진 배경 — 커버는 사진 살리고(연하게), 본문은 어둡게(진하게).
사용: PEXELS_KEY=... python3 hooks7.py <outdir> [N]"""
import os, sys
from PIL import Image, ImageDraw
import carousel_engine as E
from carousel_engine import F, wof, wrap, photo_bg, BHS, NB, GM, LOGO, W, H

MX = 72
WHITE = (247, 248, 252)
GREY = (205, 210, 222)
DIM = (150, 156, 170)
AC = (255, 110, 36)

def shadow_text(d, xy, txt, font, fill=WHITE, sh=(0, 0, 0), off=3):
    x, y = xy
    d.text((x+off, y+off), txt, font=font, fill=sh)
    d.text((x, y), txt, font=font, fill=fill)

def eyebrow(d, txt, y=92):
    d.rectangle([MX, y+3, MX+8, y+34], fill=AC)
    shadow_text(d, (MX+22, y), txt, F(NB, 27), (225, 228, 236), off=2)

def paste_logo(im, cx, y, h=30):
    try:
        lg = Image.open(LOGO).convert("RGBA"); w = int(lg.width*(h/lg.height))
        lg = lg.resize((w, h)); im.paste(lg, (int(cx-w/2), y), lg)
    except Exception:
        pass

def dots(im, i, n):
    d = ImageDraw.Draw(im); r = 5; gap = 20; x0 = W//2-(n-1)*gap//2; y = H-44
    for k in range(n):
        d.ellipse([x0+k*gap-r, y-r, x0+k*gap+r, y+r], fill=AC if k == i-1 else (255, 255, 255, 90))

def highlight(d, x, y, txt, f, pad=10):
    w = wof(d, txt, f); bb = d.textbbox((x, y), txt, font=f)
    d.rounded_rectangle([x-pad, bb[1]-8, x+w+pad, bb[3]+12], 12, fill=AC)
    d.text((x, y), txt, font=f, fill=(16, 12, 9))
    return w

def bg(q, dark):
    return photo_bg(q, dark).convert("RGB")

# ---------- 커버 (사진 살림) ----------
def cover(path, n):
    im = bg("person filming video smartphone tripod studio", 0.52); d = ImageDraw.Draw(im)
    shadow_text(d, (MX, 80), "CHRONIT", F(NB, 30), WHITE, off=2)
    shadow_text(d, (MX+150, 84), "· 쇼핑 릴스 훅", F(NB, 26), (200, 205, 218), off=2)
    y = 470
    for t in ["스크롤 멈추게 하는", "쇼핑 릴스 훅"]:
        shadow_text(d, (MX, y), t, F(BHS, 104), WHITE, off=4); y += 120
    y += 14
    highlight(d, MX, y, "터지는 공식 7", F(BHS, 92))
    y += 158
    shadow_text(d, (MX, y), "바로 복붙하는 템플릿까지 · 이 글 저장해두세요", F(GM, 30), GREY, off=2)
    paste_logo(im, W/2, H-92, 30); dots(im, 1, n); im.save(path, quality=93)

# ---------- 공식 슬라이드 (어둡게) ----------
def formula(path, i, n, fm):
    im = bg(fm["q"], 0.68); d = ImageDraw.Draw(im)
    eyebrow(d, f"쇼핑 릴스 훅 공식 · {fm['no']}/07", 90)
    # 번호 + 공식명
    ny = 220
    d.text((MX, ny), fm["no"], font=F(BHS, 120), fill=AC)
    nx = MX + wof(d, fm["no"], F(BHS, 120)) + 28
    shadow_text(d, (nx, ny+26), fm["name"], F(BHS, 72), WHITE, off=3)
    # 원리
    wy = 408
    shadow_text(d, (MX, wy), "왜 먹히나", F(NB, 26), AC, (0, 0, 0), off=2)
    wy += 44
    for ln in wrap(d, fm["why"], F(GM, 34), W-2*MX)[:2]:
        shadow_text(d, (MX, wy), ln, F(GM, 34), GREY, off=2); wy += 48
    # 템플릿 패널
    py = 620; ph = 232
    d.rounded_rectangle([MX, py, W-MX, py+ph], 22, fill=(16, 17, 22))
    d.rectangle([MX, py+24, MX+7, py+ph-24], fill=AC)
    d.text((MX+34, py+28), "바로 쓰는 훅 템플릿", font=F(NB, 27), fill=AC)
    ty = py+76
    for ln in wrap(d, fm["tpl"], F(BHS, 44), W-2*MX-68)[:2]:
        d.text((MX+34, ty), ln, font=F(BHS, 44), fill=WHITE); ty += 56
    d.text((MX+34, py+ph-52), "예) " + fm["ex"], font=F(GM, 29), fill=DIM)
    shadow_text(d, (MX, H-96), "@chronit · chronit.kr", F(GM, 26), DIM, off=2)
    dots(im, i, n); im.save(path, quality=93)

# ---------- CTA ----------
def cta(path, i, n):
    im = bg("content creator editing video laptop phone desk", 0.6); d = ImageDraw.Draw(im)
    shadow_text(d, (MX, 90), "CHRONIT", F(NB, 30), WHITE, off=2)
    y = 440
    for t in ["훅은 잡았는데", "대본이 막막하다면?"]:
        shadow_text(d, (MX, y), t, F(BHS, 88), WHITE, off=4); y += 104
    y += 28
    for t in ["크로닛이 매일 터지는 쇼핑 소재를 찾아주고,", "네 말투 그대로 대본까지 뽑아줍니다."]:
        shadow_text(d, (MX, y), t, F(GM, 32), GREY, off=2); y += 46
    y += 40
    f = F(BHS, 46); label = "chronit.kr 에서 무료로 시작"
    d.rounded_rectangle([MX, y, MX+wof(d, label, f)+56, y+86], 16, fill=AC)
    d.text((MX+28, y+18), label, font=f, fill=(16, 12, 9))
    shadow_text(d, (MX, y+150), "어떤 훅이 제일 끌려요? 댓글로 알려주세요", F(GM, 30), GREY, off=2)
    paste_logo(im, W/2, H-92, 30); dots(im, i, n); im.save(path, quality=93)

FORMULAS = [
 {"no":"01","name":"반전 공개","why":"기대를 뒤집으면 \"어?\" 하고 끝까지 본다","tpl":"\"이게 [흔한 곳/저가]에 있다고?\"","ex":"이게 다이소에서 파는 거라고?","q":"surprised excited woman shopping bags"},
 {"no":"02","name":"손해 경고","why":"이득보다 손실 회피가 사람을 더 세게 당긴다","tpl":"\"[상황] 전에 이거 모르면 손해\"","ex":"겨울 오기 전에 이거 모르면 난방비 날림","q":"cozy warm winter home interior blanket"},
 {"no":"03","name":"고수 차용","why":"권위에 기대면 신뢰와 호기심이 동시에 걸린다","tpl":"\"[고수/전문가]만 아는 [카테고리] 템\"","ex":"여행 고수들이 다이소에서 쟁이는 것","q":"confident professional woman portrait"},
 {"no":"04","name":"숫자 구체화","why":"모호한 말보다 구체적인 숫자가 믿음을 준다","tpl":"\"[가격·기간]으로 [변화] 만든 [상품]\"","ex":"만원으로 방 분위기 바꾼 템 5개","q":"minimal modern cozy room interior"},
 {"no":"05","name":"가격 대비 충격","why":"비싼 것과 나란히 두면 가치가 더 커 보인다","tpl":"\"[고가 브랜드] 살 바엔 이거\"","ex":"다이슨 살 바엔 이 3만원짜리","q":"shopping cart budget money saving"},
 {"no":"06","name":"타깃 호명","why":"\"내 얘기네\" 싶은 순간 스크롤을 멈춘다","tpl":"\"[특정 대상] 이건 꼭 보세요\"","ex":"자취 1년차면 무조건 이거","q":"young woman small apartment home"},
 {"no":"07","name":"결과 먼저","why":"완성 장면을 먼저 보여주면 과정이 궁금해진다","tpl":"[결과 비주얼] → \"어떻게 했냐면\"","ex":"지저분한 방 → 깔끔, 3만원으로 이렇게 됨","q":"clean organized tidy minimal room"},
]

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "../_out_hooks7"
    full = len(sys.argv) > 2 and sys.argv[2] == "full"
    os.makedirs(out, exist_ok=True)
    if full:
        n = 2 + len(FORMULAS)
        cover(f"{out}/01.jpg", n)
        for k, fm in enumerate(FORMULAS):
            formula(f"{out}/{k+2:02d}.jpg", k+2, n, fm)
        cta(f"{out}/{n:02d}.jpg", n, n)
    else:
        n = 4  # 프로토타입: 커버 + 공식 01 + 공식 02 + CTA
        cover(f"{out}/01.jpg", n)
        formula(f"{out}/02.jpg", 2, n, FORMULAS[0])
        formula(f"{out}/03.jpg", 3, n, FORMULAS[1])
        cta(f"{out}/04.jpg", n, n)
    print("OK hooks7 ->", out)
