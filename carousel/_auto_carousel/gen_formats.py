# -*- coding: utf-8 -*-
"""포맷별 캐러셀 생성 — 데이터 JSON + 변주 엔진. 사용: python gen_formats.py <format> <data.json> <outdir>"""
import os, sys, json, random
import carousel_engine as E

def _foot(): return "실제 트렌드 데이터 기반 · chronit.kr"

def render_top10(data, out):
    pairs=[data[i:i+2] for i in range(0,min(10,len(data)),2)]
    cnt=min(10,len(data)); n=2+len(pairs)
    th=E.new_theme(); th["n"]=n; os.makedirs(out,exist_ok=True)
    E.cover(f"{out}/01.jpg", th, "크로닛 인사이트", ["이번 주 터진","쇼핑 숏폼 훅"], f"TOP {cnt}", _foot())
    for idx,pr in enumerate(pairs):
        items=[dict(rank=x["rank"],title=x["hook"],meta=x["views"],label="왜 좋았나",body=x["why"]) for x in pr]
        E.list_slide(f"{out}/{idx+2:02d}.jpg", th, idx+2, n, f"이번 주 쇼핑 숏폼 훅 TOP {cnt}", items)
    E.cta(f"{out}/{n:02d}.jpg", th, n, n, ["이 훅들,","어떻게 찾았냐고요?"], ["크로닛이 매주 터지는 쇼핑 릴스를 모아","훅까지 분석해줍니다."], "chronit.kr 에서 무료로", "당신 상품은 어떤 훅? 댓글로 ㄱㄱ")

def render_rising(data, out):
    pairs=[data[i:i+2] for i in range(0,min(6,len(data)),2)]
    n=2+len(pairs)
    th=E.new_theme(); th["n"]=n; os.makedirs(out,exist_ok=True)
    E.cover(f"{out}/01.jpg", th, "크로닛 트렌드", ["이번 주","급상승한"], "쇼핑 소재", _foot())
    for idx,pr in enumerate(pairs):
        items=[dict(rank=x["rank"],title=x["name"],meta=x.get("stat",""),label="왜 떴나",body=x.get("note","")) for x in pr]
        E.list_slide(f"{out}/{idx+2:02d}.jpg", th, idx+2, n, "이번 주 급상승 소재", items)
    E.cta(f"{out}/{n:02d}.jpg", th, n, n, ["다음에 뭐가","뜰지 궁금하죠?"], ["크로닛이 뜨는 소재를","매일 실시간으로 모아줍니다."], "chronit.kr 에서 확인", "요즘 뭐가 궁금해요? 댓글 ㄱㄱ")

def render_numbers(data, out):
    th=E.new_theme(); th["n"]=2+len(data["cards"]); os.makedirs(out,exist_ok=True)
    n=th["n"]
    E.cover(f"{out}/01.jpg", th, "크로닛 데이터", ["숫자로 보는","이번 주 쇼핑"], "숏츠 리포트", _foot())
    for idx,c in enumerate(data["cards"]):
        E.stat_slide(f"{out}/{idx+2:02d}.jpg", th, idx+2, n, "이번 주 쇼핑 숏츠 데이터", c["value"], c.get("unit",""), [c["label"]]+c.get("note",[]))
    E.cta(f"{out}/{n:02d}.jpg", th, n, n, ["이 숫자들,","매주 바뀝니다"], ["크로닛이 트렌드를","실시간 추적합니다."], "chronit.kr", "어떤 데이터가 더 궁금해요? 댓글 ㄱㄱ")

def render_casestudy(data, out):
    pts=data["points"]; th=E.new_theme(); th["n"]=2+len(pts); os.makedirs(out,exist_ok=True); n=th["n"]
    E.cover(f"{out}/01.jpg", th, "크로닛 사례해부", ["조회수 "+data["views"],"터진 쇼핑 릴스"], "완전 해부", _foot())
    for idx,p in enumerate(pts):
        E.point_slide(f"{out}/{idx+2:02d}.jpg", th, idx+2, n, "이번 주 1위 릴스 해부", p["kicker"], p["headline"], p.get("body",[]))
    E.cta(f"{out}/{n:02d}.jpg", th, n, n, ["이런 분석,","직접 하긴 어렵죠?"], ["크로닛이 터진 릴스를","훅·구성·댓글로 뜯어줍니다."], "chronit.kr 에서 무료로", "분석해볼 릴스 있어요? 댓글 ㄱㄱ")

FMT={"top10":render_top10,"rising":render_rising,"numbers":render_numbers,"casestudy":render_casestudy}

# 자주 나오는 STT/생성 오타 자동 교정 (렌더 전 전체 텍스트에 적용)
FIX={"숲폼":"숏폼","숖폼":"숏폼","숏품":"숏폼","숕폼":"숏폼","숙츠":"숏츠","쑈츠":"숏츠","숖츠":"숏츠","뜷어":"뜯어","릴즈":"릴스","크로냇":"크로닛","크로니트":"크로닛","다이쏘":"다이소"}
def _fix_str(s):
    for a,b in FIX.items(): s=s.replace(a,b)
    return s
def deep_fix(x):
    if isinstance(x,str): return _fix_str(x)
    if isinstance(x,list): return [deep_fix(v) for v in x]
    if isinstance(x,dict): return {k:deep_fix(v) for k,v in x.items()}
    return x

if __name__=="__main__":
    fmt,dj,out=sys.argv[1],sys.argv[2],sys.argv[3]
    data=deep_fix(json.load(open(dj,encoding="utf-8")))
    FMT[fmt](data,out); print(f"OK {fmt} -> {out}")
