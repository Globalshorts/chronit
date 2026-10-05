# -*- coding: utf-8 -*-
"""베라 분석 리포트 캐러셀 — analyze_clip_cache의 실제 분석(점수·셀링포인트·댓글감성)을
그래프와 함께 렌더. Pexels 사진 배경 + 프리미엄 다크. swipe_engine 헬퍼 재사용.
사용: python3 vera_report.py <outdir>  (DATA는 실제 분석 1건)"""
import os, math, re
from PIL import Image, ImageDraw
import carousel_engine as E
from carousel_engine import F, wof, wrap, photo_bg, BHS, NB, GM, LOGO, W, H
from swipe_engine import _sh, _eyebrow, _logo, _dots, _hl, _bg, MX, AC, WHITE, GREY, DIM

# 폰트에 없는 이모지·기호 제거(렌더용). 데이터는 보존, 화면 텍스트만 정리.
_EMOJI = re.compile("[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF"
                    "\U0000FE00-\U0000FE0F\U00002190-\U000021FF\U00002300-\U000023FF❤]+")
def clean(s): return _EMOJI.sub("", str(s)).replace("  ", " ").strip()
def _clean_deep(x):
    if isinstance(x, str): return clean(x)
    if isinstance(x, list): return [_clean_deep(v) for v in x]
    if isinstance(x, dict): return {k: _clean_deep(v) for k, v in x.items()}
    return x

# 중복 슬라이드 방지: 셀링포인트와 '적용법'이 같은 LLM 출력이라 겹치는 문제 → 의미 중복 제거
def _norm(s): return re.sub(r"[^0-9A-Za-z가-힣]", "", str(s)).lower()
def _toks(s): return set(re.findall(r"[가-힣]{2,}|[A-Za-z]{2,}", str(s)))
def _dup(a, b):
    na, nb = _norm(a), _norm(b)
    if na and nb and (na in nb or nb in na): return True
    ta, tb = _toks(a), _toks(b)
    if not ta or not tb: return False
    return len(ta & tb) / len(ta | tb) >= 0.5
def _novel(items, seen, k):
    """seen(이미 보여준 항목)과 의미가 겹치지 않는 항목만 최대 k개."""
    out = []
    for it in items:
        if not str(it).strip(): continue
        if any(_dup(it, s) for s in list(seen)+out): continue
        out.append(it)
        if len(out) >= k: break
    return out

GOOD = (86, 200, 120)   # 긍정
INFO = (70, 150, 255)   # 질문/구매문의
WARN = (240, 165, 70)   # 불만
TRACK = (46, 50, 60)

# ---------- 차트 프리미티브 ----------
def gauge(d, cx, cy, r, score, color=AC):
    bbox = [cx-r, cy-r, cx+r, cy+r]; start, extent = 135, 270
    d.arc(bbox, start, start+extent, fill=TRACK, width=28)
    d.arc(bbox, start, start+extent*max(0, min(100, score))/100.0, fill=color, width=28)
    t = str(int(score)); f = F(BHS, 104)
    d.text((cx-wof(d, t, f)/2, cy-78), t, font=f, fill=WHITE)
    f2 = F(GM, 28); d.text((cx-wof(d, "/ 100", f2)/2, cy+46), "/ 100", font=f2, fill=DIM)

def hbar(d, x, y, w, frac, color, label, value):
    h = 40
    d.text((x, y), label, font=F(NB, 30), fill=WHITE)
    vt = value; d.text((x+w-wof(d, vt, F(NB, 30)), y), vt, font=F(NB, 30), fill=color)
    by = y+46
    d.rounded_rectangle([x, by, x+w, by+h], h//2, fill=(28, 31, 38))
    fw = max(h, int(w*max(0.0, min(1.0, frac))))
    d.rounded_rectangle([x, by, x+fw, by+h], h//2, fill=color)

# ---------- 슬라이드 ----------
def cover(path, D, n):
    im = _bg("person filming product review smartphone", 0.55); d = ImageDraw.Draw(im)
    _sh(d, (MX, 80), "CHRONIT", F(NB, 30), WHITE, off=2)
    _sh(d, (MX+150, 84), "· 베라 분석 리포트", F(NB, 26), (200, 205, 218), off=2)
    y = 416
    _sh(d, (MX, y), "이 영상, 왜 터졌을까?", F(BHS, 84), WHITE, off=4); y += 100
    _sh(d, (MX, y), "베라가 뜯어봤어요", F(BHS, 84), WHITE, off=4); y += 106
    if D.get("_feature"):
        _sh(d, (MX, y), D["_feature"], F(NB, 30), AC, (0, 0, 0), off=2); y += 60
    _hl(d, MX, y+6, D["product_name"], F(BHS, 58)); y += 150
    cs = D["comment_sentiment"]; pi = int(cs.get("purchase_intent", 0)); pos = int(cs.get("positive", 0))
    analyzed = int(D.get("comment_analyzed", 0) or 0)
    base = f"훅 {int(D['hook_score'])}점 · 페이오프 {int(D['payoff_score'])}점"
    if analyzed > 0 and pi > 0: base += f" · 구매의도 {pi}%"
    elif analyzed > 0 and pos > 0: base += f" · 긍정 {pos}%"
    _sh(d, (MX, y), base, F(GM, 30), GREY, off=2)
    _logo(im, W/2, H-92, 30); _dots(im, 1, n); im.save(path, quality=93)

def hook_slide(path, i, n, D):
    im = _bg("surprised person watching phone", 0.7); d = ImageDraw.Draw(im)
    _eyebrow(d, "베라 분석 · 훅", 90)
    _sh(d, (MX, 200), "훅 (첫 3초)", F(BHS, 60), WHITE, off=3)
    # 훅 타입 뱃지
    bt = D["hook_type"]; f = F(NB, 28); bw = wof(d, bt, f)
    d.rounded_rectangle([MX, 300, MX+bw+40, 352], 14, fill=AC); d.text((MX+20, 310), bt, font=f, fill=(16, 12, 9))
    hy = 390
    for ln in wrap(d, f"“{D['hook']}”", F(NB, 36), W-2*MX)[:3]:
        _sh(d, (MX, hy), ln, F(NB, 36), WHITE, off=2); hy += 50
    hy += 10
    _sh(d, (MX, hy), "왜 먹혔나", F(NB, 25), AC, (0, 0, 0), off=2); hy += 40
    for ln in wrap(d, D["hook_why"], F(GM, 30), W-2*MX)[:2]:
        _sh(d, (MX, hy), ln, F(GM, 30), GREY, off=2); hy += 42
    gauge(d, W-260, 1060, 150, D["hook_score"], AC)
    d.text((W-260-wof(d, "훅 점수", F(NB, 28))/2, 1230), "훅 점수", font=F(NB, 28), fill=WHITE)
    _sh(d, (MX, H-96), "@chronit · chronit.kr", F(GM, 26), DIM, off=2); _dots(im, i, n); im.save(path, quality=93)

def selling_slide(path, i, n, D):
    im = _bg("product display retail shelf", 0.66); d = ImageDraw.Draw(im)
    _eyebrow(d, "베라 분석 · 셀링포인트", 90)
    _sh(d, (MX, 200), "이 제품이 팔리는 이유", F(BHS, 60), WHITE, off=3)
    d.rectangle([MX+2, 290, MX+92, 296], fill=AC)
    sp = D["selling_points"]; y0 = 390; rowh = min(150, (H-200-y0)//max(1, len(sp)))
    for k, s in enumerate(sp):
        ry = y0+k*rowh
        d.text((MX, ry), f"{k+1:02d}", font=F(BHS, 44), fill=AC)
        for j, ln in enumerate(wrap(d, s, F(NB, 34), W-MX-120-MX)[:2]):
            _sh(d, (MX+120, ry+(4 if j == 0 else 0)+j*44), ln, F(NB, 34), WHITE, off=2)
        if k < len(sp)-1:
            d.line([(MX, ry+rowh-20), (W-MX, ry+rowh-20)], fill=(70, 74, 84), width=2)
    _sh(d, (MX, H-96), "@chronit · chronit.kr", F(GM, 26), DIM, off=2); _dots(im, i, n); im.save(path, quality=93)

def comments_slide(path, i, n, D):
    im = _bg("people typing phone social media", 0.72); d = ImageDraw.Draw(im)
    cs = D["comment_sentiment"]
    analyzed = int(D.get("comment_analyzed", 0) or 0)
    _eyebrow(d, f"베라 분석 · 댓글 {analyzed}개", 90)
    _sh(d, (MX, 200), "댓글이 말해주는 신호", F(BHS, 58), WHITE, off=3)
    sub = "실제 댓글을 베라가 분류 · 합 100%" if analyzed > 0 else "분석된 댓글이 적어 참고용이에요"
    _sh(d, (MX, 288), sub, F(GM, 28), DIM, off=2)
    # 4분할(합=100%)을 모두 바로 표시
    rows = [("구매 의도", int(cs.get("purchase_intent", 0)), AC),
            ("긍정 반응", int(cs.get("positive", 0)), GOOD),
            ("질문·문의", int(cs.get("question", 0)), INFO),
            ("불만", int(cs.get("complaint", 0)), WARN)]
    x = MX; w = W-2*MX; y = 390
    for label, v, col in rows:
        hbar(d, x, y, w, v/100.0, col, label, f"{v}%")
        y += 124
    dom = max(rows, key=lambda r: r[1]); total = sum(r[1] for r in rows)
    d.rounded_rectangle([MX, y+12, W-MX, y+150], 22, fill=(16, 17, 22))
    if analyzed > 0 and dom[1] > 0 and total > 0:
        # 동률이면 0이 아닌 신호만 추려 가장 강한 것(구매의도>질문>긍정>불만 우선순위는 rows 순서가 보장)
        msg = {"구매 의도": "구매로 바로 이어질 신호가 강해요", "긍정 반응": "감성 반응이 폭발적이에요",
               "질문·문의": "'어디서 사요' 문의가 쏟아져요 — 구매 직전 신호",
               "불만": "호불호가 갈리는 소재예요"}.get(dom[0], "")
        d.text((MX+34, y+36), f"가장 큰 신호 · {dom[0]} {dom[1]}%", font=F(NB, 30), fill=AC)
        for ln in wrap(d, msg, F(GM, 30), W-2*MX-68)[:1]:
            d.text((MX+34, y+86), ln, font=F(GM, 30), fill=GREY)
    else:
        d.text((MX+34, y+36), "댓글 신호 · 데이터 부족", font=F(NB, 30), fill=DIM)
        for ln in wrap(d, "분석된 댓글이 적어 아직 뚜렷한 신호는 없어요", F(GM, 30), W-2*MX-68)[:1]:
            d.text((MX+34, y+86), ln, font=F(GM, 30), fill=GREY)
    _sh(d, (MX, H-96), "@chronit · chronit.kr", F(GM, 26), DIM, off=2); _dots(im, i, n); im.save(path, quality=93)

def structure_slide(path, i, n, D):
    im = _bg("video editing timeline screen", 0.7); d = ImageDraw.Draw(im)
    _eyebrow(d, "베라 분석 · 구성 & 페이오프", 90)
    _sh(d, (MX, 200), "어떻게 끌고 갔나", F(BHS, 58), WHITE, off=3)
    hy = 330
    _sh(d, (MX, hy), "구성", F(NB, 25), AC, (0, 0, 0), off=2); hy += 40
    for ln in wrap(d, D["structure"], F(GM, 30), W-2*MX)[:2]:
        _sh(d, (MX, hy), ln, F(GM, 30), GREY, off=2); hy += 42
    hy += 16
    _sh(d, (MX, hy), "페이오프 (결말 한 방)", F(NB, 25), AC, (0, 0, 0), off=2); hy += 40
    for ln in wrap(d, D["payoff"], F(GM, 30), W-2*MX)[:2]:
        _sh(d, (MX, hy), ln, F(GM, 30), GREY, off=2); hy += 42
    gauge(d, W-260, 1060, 150, D["payoff_score"], GOOD)
    d.text((W-260-wof(d, "페이오프 점수", F(NB, 26))/2, 1230), "페이오프 점수", font=F(NB, 26), fill=WHITE)
    _sh(d, (MX, H-96), "@chronit · chronit.kr", F(GM, 26), DIM, off=2); _dots(im, i, n); im.save(path, quality=93)

def remix_slide(path, i, n, D):
    im = _bg("creative workspace planning notes", 0.68); d = ImageDraw.Draw(im)
    _eyebrow(d, "베라 분석 · 내 상품에 적용", 90)
    _sh(d, (MX, 200), "그대로 베껴 쓰는 법", F(BHS, 58), WHITE, off=3)
    d.rectangle([MX+2, 290, MX+92, 296], fill=AC)
    # 셀링포인트(3번 슬라이드)와 겹치는 항목 제거 → 중복 슬라이드 방지
    sp = D.get("selling_points", []) or []
    pool = (D.get("remix", {}).get("differentiation") or []) + (D.get("key_takeaways") or [])
    items = _novel(pool, sp, 4)
    if not items:  # 전부 겹쳤으면 테이크어웨이 원본이라도(최소 셀링포인트 복붙은 피함)
        items = _novel(D.get("key_takeaways") or pool, [], 4) or pool[:4]
    y0 = 400; rowh = min(150, (H-200-y0)//max(1, len(items)))
    for k, s in enumerate(items):
        ry = y0+k*rowh
        d.text((MX, ry), "→", font=F(NB, 40), fill=AC)
        for j, ln in enumerate(wrap(d, s, F(NB, 33), W-MX-80-MX)[:2]):
            _sh(d, (MX+80, ry+(2 if j == 0 else 0)+j*42), ln, F(NB, 33), WHITE, off=2)
    _sh(d, (MX, H-96), "@chronit · chronit.kr", F(GM, 26), DIM, off=2); _dots(im, i, n); im.save(path, quality=93)

def cta(path, i, n):
    im = _bg("content creator editing laptop desk", 0.62); d = ImageDraw.Draw(im)
    _sh(d, (MX, 88), "CHRONIT", F(NB, 30), WHITE, off=2)
    y = 340
    for t in ["영상 선택하면", "이 리포트가 자동으로"]:
        _sh(d, (MX, y), t, F(BHS, 80), WHITE, off=4); y += 96
    y += 20
    for t in ["베라가 훅·셀링포인트·댓글 반응까지 분석하고,", "내 말투 대본까지 뽑아줍니다."]:
        _sh(d, (MX, y), t, F(GM, 31), GREY, off=2); y += 44
    y += 30
    f = F(BHS, 42); label = "chronit.kr 에서 무료로 분석"
    d.rounded_rectangle([MX, y, MX+wof(d, label, f)+48, y+74], 14, fill=(30, 33, 40))
    d.text((MX+24, y+14), label, font=f, fill=WHITE)
    # 큰 댓글 유도 밴드 (핵심 CTA)
    by = H - 450; bf = F(BHS, 66)
    d.rounded_rectangle([MX, by, W-MX, by+210], 30, fill=AC)
    for k, t in enumerate(["댓글에 '크로닛'", "남겨주세요"]):
        d.text(((W-wof(d, t, bf))/2, by+36+k*82), t, font=bf, fill=(16, 12, 9))
    _sh(d, (MX, by+230), "분석받고 싶은 영상도 댓글로 알려주세요", F(GM, 28), GREY, off=2)
    _dots(im, i, n); im.save(path, quality=93)

def build_caption(D):
    D = _clean_deep(D); cs = D.get("comment_sentiment", {}) or {}
    sp = " / ".join((D.get("selling_points") or [])[:3])
    diff = (D.get("remix", {}) or {}).get("differentiation") or []
    pi = int(cs.get("purchase_intent", 0) or 0); pos = int(cs.get("positive", 0) or 0)
    analyzed = int(D.get("comment_analyzed", 0) or 0)
    sig = (f"구매 의도 {pi}%" if (analyzed > 0 and pi > 0)
           else (f"긍정 반응 {pos}%" if (analyzed > 0 and pos > 0) else ""))
    # 적용법은 셀링포인트와 안 겹치는 것으로
    diff_novel = _novel(diff + (D.get("key_takeaways") or []), (D.get("selling_points") or []), 1)
    lead = (D.get("_feature") + ", 베라가 뜯어봤어요.") if D.get("_feature") else "이번 주 터진 쇼핑 릴스, 베라가 뜯어봤어요."
    parts = [
        lead,
        f"'{D.get('product_name','')}' 영상인데 훅 {int(D.get('hook_score') or 0)}점 · 페이오프 {int(D.get('payoff_score') or 0)}점이 나왔어요.",
        f"훅: \"{D.get('hook','')}\" — {D.get('hook_why','')}",
        (f"먹힌 셀링포인트: {sp}" if sp else ""),
        (f"댓글 {analyzed}개를 분석했더니 {sig}. 사람들이 반응하는 지점이 분명했어요." if sig else ""),
        (f"내 상품에 적용하려면: {diff_novel[0]}" if diff_novel else ""),
        "저장해두고 다음 영상 기획할 때 참고하세요 📌",
        "분석해보고 싶은 영상 있어요? 댓글로 알려주세요 💬",
        "👉 영상 선택하면 이 리포트가 자동으로: chronit.kr",
    ]
    return "\n\n".join([p for p in parts if p])

def render_report(D, outdir):
    D = _clean_deep(D)
    for k in ("hook_score", "payoff_score"):
        D[k] = int(D.get(k) or 0)
    D.setdefault("comment_sentiment", {}); D.setdefault("comment_analyzed", 0)
    D.setdefault("remix", {}); D.setdefault("selling_points", []); D.setdefault("key_takeaways", [])
    os.makedirs(outdir, exist_ok=True); n = 7
    cover(f"{outdir}/01.jpg", D, n)
    hook_slide(f"{outdir}/02.jpg", 2, n, D)
    selling_slide(f"{outdir}/03.jpg", 3, n, D)
    comments_slide(f"{outdir}/04.jpg", 4, n, D)
    structure_slide(f"{outdir}/05.jpg", 5, n, D)
    remix_slide(f"{outdir}/06.jpg", 6, n, D)
    cta(f"{outdir}/07.jpg", 7, n)
    return n

# 실제 분석 1건 (analyze_clip_cache) — 한국 적합 연말 시즌 소재
DATA = {
 "hook": "이거 하나 켰을 뿐인데 집이 순식간에 크리스마스 마을로 변신해요🎄✨",
 "hook_why": "단순한 동작으로 큰 변화를 줄 수 있다는 기대감을 준다.",
 "hook_type": "변화",
 "hook_score": 95,
 "payoff": "복잡한 장식은 귀찮지만 크리스마스 분위기는 제대로 내고 싶다면 요거 하나면 충분하겠어요💕",
 "payoff_score": 90,
 "structure": "처음에는 제품의 효과를 강조하고, 중간에는 사용의 간편함을 설명하며, 마지막에는 감성적인 만족감을 제공한다.",
 "target": "크리스마스 장식을 간편하게 하고 싶은 사람들",
 "product_name": "크리스마스 무드 프로젝터 조명",
 "selling_points": ["천장까지 반짝이는 조명 효과", "트리 없이도 크리스마스 분위기 연출", "간편한 설치와 사용", "아이들이 좋아할 만한 시각적 효과"],
 "key_takeaways": ["간편하게 크리스마스 분위기를 연출할 수 있다.", "아이들과 함께 즐길 수 있는 시각적 효과 제공.", "복잡한 장식 없이도 충분한 효과를 낼 수 있다."],
 "comment_analyzed": 15,
 "comment_sentiment": {"positive": 100, "question": 0, "complaint": 0, "purchase_intent": 0},
 "remix": {"differentiation": ["트리 없이도 크리스마스 분위기 연출 가능", "간편한 설치와 사용으로 시간 절약", "다양한 조명 패턴으로 독특한 분위기 연출"]},
}

if __name__ == "__main__":
    import sys
    render_report(DATA, sys.argv[1] if len(sys.argv) > 1 else "../_out_vera")
    print("OK vera_report")
