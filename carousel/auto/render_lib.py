# -*- coding: utf-8 -*-
"""크로닛 캐러셀 렌더 공용 모듈 — 비스킷 결(글 + 매칭 Pexels 실사진) 밝은 본문 + 미니멀 B&W 클로징.
슬라이드 타입: cover(풀블리드) / statement(사진+문장) / crit(사진+번호기준) / vs(사진+❌✅) / close.
topics.py 의 선언형 스펙을 받아 auto_gen.py 가 이 함수들을 호출한다."""
import os, io, json, hashlib, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
# 폰트/로고 위치: 저장소 공통 경로를 우선, 없으면 상대 경로 폴백(샌드박스/CI 모두 대응)
def _first(*paths):
    for p in paths:
        if p and os.path.exists(p):
            return p
    return paths[-1]

AS = _first("/root/chronit/carousel/_auto_carousel/assets",
            os.path.join(HERE, "..", "_auto_carousel", "assets"))
LOGO = _first("/root/chronit/carousel/logo/chronit-mark-white.png",
              os.path.join(HERE, "..", "logo", "chronit-mark-white.png"))
BLACK = os.path.join(AS, "Pretendard-Black.otf"); XB = os.path.join(AS, "Pretendard-ExtraBold.otf")
BOLD = os.path.join(AS, "Pretendard-Bold.otf"); MED = os.path.join(AS, "Pretendard-Medium.otf")
SB = os.path.join(AS, "Pretendard-SemiBold.otf")

def _pexels_key():
    k = os.environ.get("PEXELS_KEY")
    if k: return k.strip()
    for p in (os.path.join(HERE, "pexels_key.txt"), os.path.join(HERE, "..", "pexels_key.txt")):
        if os.path.exists(p): return open(p).read().strip()
    raise SystemExit("PEXELS_KEY 없음 (env 또는 pexels_key.txt)")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
CACHE = os.path.join(HERE, "_pxcache"); os.makedirs(CACHE, exist_ok=True)

W, H = 1080, 1350; MX = 90
CREAM = (244, 241, 235); INK = (28, 28, 32); GREY = (120, 120, 130); AC = (255, 110, 36); WHITE = (248, 249, 252)
BAD = (214, 92, 78); EYE = (150, 120, 96)
BG = (10, 11, 15); HGREY = (138, 142, 154)


def F(fp, s): return ImageFont.truetype(fp, s)
def wof(d, t, f): b = d.textbbox((0, 0), t, font=f); return b[2]-b[0]


def px_photo(query, pick=0):
    h = hashlib.md5((query+str(pick)).encode()).hexdigest()[:10]; fp = os.path.join(CACHE, h+".jpg")
    if os.path.exists(fp): return Image.open(fp).convert("RGB")
    url = "https://api.pexels.com/v1/search?"+urllib.parse.urlencode(
        dict(query=query, per_page=pick+6, orientation="portrait", size="large"))
    req = urllib.request.Request(url, headers={"Authorization": _pexels_key(), "User-Agent": UA})
    d = json.load(urllib.request.urlopen(req, timeout=30))
    ph = d.get("photos", [])
    if not ph: raise SystemExit("no photo: "+query)
    src = ph[min(pick, len(ph)-1)]["src"]["large2x"]
    raw = urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": UA}), timeout=45).read()
    img = Image.open(io.BytesIO(raw)).convert("RGB"); img.save(fp, quality=90); return img


def cover_crop(img, tw, th):
    iw, ih = img.size; s = max(tw/iw, th/ih); img = img.resize((int(iw*s)+1, int(ih*s)+1))
    iw, ih = img.size; x = (iw-tw)//2; y = (ih-th)//2; return img.crop((x, y, x+tw, y+th))


def vgrad(im, box, top_a, bot_a):
    x0, y0, x1, y1 = box; h = y1-y0; ov = Image.new("L", (1, h))
    for i in range(h): ov.putpixel((0, i), int(top_a+(bot_a-top_a)*(i/max(1, h-1))))
    im.paste(Image.new("RGB", (x1-x0, h), (0, 0, 0)), (x0, y0), ov.resize((x1-x0, h)))


def hl(d, x, y, text, fs, fg=(16, 12, 9), bg=AC, pad=(22, 11)):
    f = F(XB, fs); w = wof(d, text, f)
    d.rounded_rectangle([x, y, x+w+pad[0]*2, y+fs+pad[1]*2], 13, fill=bg)
    d.text((x+pad[0], y+pad[1]-2), text, font=f, fill=fg); return y+fs+pad[1]*2


def eyebrow(d, t, y, col=EYE):
    f = F(SB, 25); x = MX
    for ch in t: d.text((x, y), ch, font=f, fill=col); x += wof(d, ch, f)+1


def photo_card(im, query, pick, y0, ht):
    ph = cover_crop(px_photo(query, pick), W-2*MX, ht)
    mask = Image.new("L", ph.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, ph.size[0], ph.size[1]], 28, fill=255)
    im.paste(ph, (MX, y0), mask)


def dots(d, i, n, light=False):
    r = 5; gap = 22; tot = n*gap-(gap-2*r); x0 = W-MX-tot; y = H-84
    on = (255, 255, 255) if light else AC; off = (90, 90, 96) if light else (210, 204, 194)
    for k in range(n): d.ellipse([x0+k*gap, y, x0+k*gap+2*r, y+2*r], fill=on if k == i-1 else off)


def foot(d, i, n, light=False):
    d.text((MX, H-96), "@chronit.kr", font=F(BOLD, 26), fill=(235, 235, 240) if light else (150, 146, 140))
    dots(d, i, n, light)


def xb(d, cx, cy, r, col):
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=col); o = r*0.42
    d.line([cx-o, cy-o, cx+o, cy+o], fill=(255, 255, 255), width=5)
    d.line([cx-o, cy+o, cx+o, cy-o], fill=(255, 255, 255), width=5)


def ckb(d, cx, cy, r, col):
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=col)
    d.line([cx-r*0.45, cy, cx-r*0.05, cy+r*0.42], fill=(255, 255, 255), width=5)
    d.line([cx-r*0.05, cy+r*0.42, cx+r*0.5, cy-r*0.4], fill=(255, 255, 255), width=5)


# ---- 슬라이드 타입 ----
def s_cover(p, n, query, eyebrow_t, lines, hl_t):
    im = cover_crop(px_photo(query), W, H).convert("RGB")
    vgrad(im, (0, H-780, W, H), 0, 210); vgrad(im, (0, 0, W, 260), 150, 0)
    d = ImageDraw.Draw(im); eyebrow(d, eyebrow_t, 86, (238, 238, 243))
    y = H-520
    for ln in lines: d.text((MX, y), ln, font=F(BLACK, 66), fill=WHITE); y += 92
    y += 10; hl(d, MX, y, hl_t, 58)
    foot(d, 1, n, light=True); im.save(p, quality=94)


def s_statement(p, i, n, query, eyebrow_t, lines, hl_t, body):
    im = Image.new("RGB", (W, H), CREAM); photo_card(im, query, 0, 150, 520)
    d = ImageDraw.Draw(im); eyebrow(d, eyebrow_t, 720, (150, 120, 96))
    y = 772
    for ln in lines: d.text((MX, y), ln, font=F(XB, 54), fill=INK); y += 72
    y = hl(d, MX, y, hl_t, 48); y += 30
    for ln in body: d.text((MX, y), ln, font=F(MED, 32), fill=GREY); y += 46
    foot(d, i, n); im.save(p, quality=94)


def s_crit(p, i, n, query, pick, num, prefix, tag, head_plain, head_hl, body):
    im = Image.new("RGB", (W, H), CREAM); photo_card(im, query, pick, 150, 560)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([MX+20, 170, MX+20+96, 170+56], 14, fill=AC)
    d.text((MX+36, 176), num, font=F(BLACK, 40), fill=(255, 255, 255))
    eyebrow(d, prefix+" · "+tag, 760)
    y = 812; d.text((MX, y), head_plain, font=F(XB, 52), fill=INK); y += 70
    y = hl(d, MX, y, head_hl, 48); y += 30
    for ln in body: d.text((MX, y), ln, font=F(MED, 32), fill=GREY); y += 46
    foot(d, i, n); im.save(p, quality=94)


def s_vs(p, i, n, query, pick, num, prefix, title, bad, good):
    im = Image.new("RGB", (W, H), CREAM); photo_card(im, query, pick, 150, 470)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([MX+20, 170, MX+20+96, 170+56], 14, fill=AC)
    d.text((MX+36, 176), num, font=F(BLACK, 40), fill=(255, 255, 255))
    eyebrow(d, prefix+" · "+title, 672)
    y = 736
    xb(d, MX+26, y+28, 26, BAD); d.text((MX+72, y+4), "이렇게 하면", font=F(XB, 30), fill=BAD)
    yy = y+54
    for ln in bad: d.text((MX+72, yy), ln, font=F(MED, 31), fill=INK); yy += 44
    y = 922
    ckb(d, MX+26, y+28, 26, AC); d.text((MX+72, y+4), "이렇게 하세요", font=F(XB, 30), fill=AC)
    yy = y+54
    for ln in good: d.text((MX+72, yy), ln, font=F(MED, 31), fill=INK); yy += 44
    foot(d, i, n); im.save(p, quality=94)


def s_close(p, *_a, **_k):
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    cy = 600
    try:
        lg = Image.open(LOGO).convert("RGBA"); hh = 88; ww = int(lg.width*(hh/lg.height)); lg = lg.resize((ww, hh))
        im.paste(lg, (int(W/2-ww/2), int(cy-hh/2)), lg)
    except Exception: pass
    d = ImageDraw.Draw(im)
    t1 = "쇼핑 릴스 인사이트"; f1 = F(XB, 46); d.text(((W-wof(d, t1, f1))//2, 702), t1, font=f1, fill=WHITE)
    t2 = "@chronit.kr"; f2 = F(MED, 32); d.text(((W-wof(d, t2, f2))//2, 776), t2, font=f2, fill=HGREY)
    im.save(p, quality=95)


# ---- 선언형 스펙 → 파일 렌더 ----
def render_slide(spec, path, idx, n):
    """spec: dict with key 't' in {cover,statement,crit,vs,close}. idx=1기반."""
    t = spec["t"]
    if t == "cover":
        s_cover(path, n, spec["q"], spec.get("eyebrow", "쇼핑 릴스 인사이트"), spec["lines"], spec["hl"])
    elif t == "statement":
        s_statement(path, idx, n, spec["q"], spec.get("eyebrow", "진짜 문제는 이거"),
                    spec["lines"], spec["hl"], spec.get("body", []))
    elif t == "crit":
        s_crit(path, idx, n, spec["q"], spec.get("pick", 0), spec["num"], spec["prefix"],
               spec["tag"], spec["head_plain"], spec["head_hl"], spec.get("body", []))
    elif t == "vs":
        s_vs(path, idx, n, spec["q"], spec.get("pick", 0), spec["num"], spec["prefix"],
             spec["title"], spec["bad"], spec["good"])
    elif t == "close":
        s_close(path)
    else:
        raise SystemExit("unknown slide type: "+t)


def render_topic(topic, outdir):
    """topic dict → outdir 에 01.jpg..NN.jpg 렌더. 생성 파일 경로 리스트 반환."""
    os.makedirs(outdir, exist_ok=True)
    slides = topic["slides"]; n = len(slides); out = []
    for i, spec in enumerate(slides, 1):
        p = os.path.join(outdir, f"{i:02d}.jpg")
        render_slide(spec, p, i, n)
        out.append(p)
    return out
