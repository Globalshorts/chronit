# -*- coding: utf-8 -*-
"""GitHub Actions 주간 실행기: 데이터(carousel-feed)+STT(stt-hook)+카피(carousel-copy)
→ 렌더(gen_formats)→ Storage 업로드 → 큐 적재(carousel-enqueue). 민감 작업은 엣지가 처리."""
import os, sys, json, subprocess, urllib.request, datetime
SB="https://oxygqtbdpnxxcgzwdlzi.supabase.co"
SEC=os.environ["CRON_SECRET"]
ANON=os.environ.get("ANON_KEY","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY")
HERE=os.path.dirname(os.path.abspath(__file__)); AC=os.path.join(HERE,"_auto_carousel")

def post(path, body=None, headers=None, t=170):
    req=urllib.request.Request(SB+path, data=json.dumps(body or {}).encode(), method="POST")
    req.add_header("Content-Type","application/json")
    for k,v in (headers or {}).items(): req.add_header(k,v)
    return json.load(urllib.request.urlopen(req, timeout=t))

def manv(v):
    try: v=int(v)
    except: return ""
    return f"{round(v/10000)}만 뷰" if v>=10000 else f"{v} 뷰"

def first_sentence(t):
    t=(t or "").strip().split("\n")[0]
    for sep in ["?","!"]:
        i=t.find(sep)
        if 0<i<46: return t[:i+1].strip()
    i=t.find(".")
    if 0<i<46: return t[:i].strip()
    return t[:40].strip()

def upload(fmt, outdir, ds):
    base=f"{SB}/storage/v1/object/manual-images/marketing/A/{ds}-{fmt}"
    pub=f"{SB}/storage/v1/object/public/manual-images/marketing/A/{ds}-{fmt}"
    urls=[]
    for n in sorted(os.listdir(outdir)):
        if not n.endswith(".jpg"): continue
        data=open(os.path.join(outdir,n),"rb").read()
        req=urllib.request.Request(f"{base}/{n}", data=data, method="POST")
        req.add_header("Authorization","Bearer "+ANON); req.add_header("apikey",ANON); req.add_header("Content-Type","image/jpeg")
        urllib.request.urlopen(req, timeout=60); urls.append(f"{pub}/{n}")
    return urls

CAPS={
 "top10":"이번 주 한국 쇼핑 숏폼 훅 TOP10 정리했어요.\n\n실제 상위 영상을 분석해 뽑았어요. 저장해두고 다음 릴스 만들 때 꺼내 쓰세요 📌\n\n어떤 훅이 제일 끌렸는지 댓글로 알려주세요 💬\n\n👉 오늘 뜬 소재 무료로 받기: chronit.kr",
 "casestudy":"이번 주 터진 쇼핑 릴스, 왜 터졌을까요.\n\n조회수 상위 릴스를 훅·구성·댓글로 뜯어봤어요. 저장해두고 참고하세요 📌\n\n분석해볼 릴스 있으면 댓글로 알려주세요 💬\n\n👉 오늘 뜬 소재 무료로 받기: chronit.kr",
 "numbers":"숫자로 보는 이번 주 쇼핑 숏폼 리포트.\n\n이번 주 트렌드를 데이터로 요약했어요. 저장해두세요 📌\n\n어떤 데이터가 더 궁금해요? 댓글로 알려주세요 💬\n\n👉 오늘 뜬 소재 무료로 받기: chronit.kr",
 "rising":"이번 주 급상승한 쇼핑 소재 모음이에요.\n\n트렌드 상위에서 지금 뜨는 상품 유형을 뽑았어요. 저장해두세요 📌\n\n요즘 뭐가 궁금해요? 댓글로 알려주세요 💬\n\n👉 오늘 뜬 소재 무료로 받기: chronit.kr",
}
PILLAR={"top10":"I","casestudy":"P","numbers":"C","rising":"T"}

def main():
    ds=datetime.datetime.utcnow().strftime("%Y%m%d%H%M")
    fd=post("/functions/v1/carousel-feed", {}, {"x-cron-secret":SEC})
    shopping=fd.get("shopping",[]); cats=fd.get("categories",[])
    hooks=[]
    for s in shopping[:10]:
        try: r=post("/functions/v1/stt-hook", {"shortcode":s["shortcode"]})
        except Exception: r={}
        tr=(r or {}).get("transcript","")
        if tr and len(tr)>=6: hooks.append({"hook":first_sentence(tr),"views":manv(s.get("views"))})
    print("hooks:",len(hooks))
    if len(hooks)<3:
        print("too few hooks, abort"); return
    copy=post("/functions/v1/carousel-copy", {"hooks":hooks,"categories":cats}, {"x-cron-secret":SEC})
    def w(name,obj): open(os.path.join(AC,name),"w",encoding="utf-8").write(json.dumps(obj,ensure_ascii=False)); return name
    jobs=[]
    if copy.get("top10"): jobs.append(("top10", w("hooks.json", copy["top10"])))
    if copy.get("numbers"): jobs.append(("numbers", w("numbers.json", copy["numbers"])))
    if copy.get("rising"): jobs.append(("rising", w("rising.json", copy["rising"])))
    # casestudy는 베라 분석 리포트로 대체(아래). 분석 실패 시에만 폴백으로 렌더.
    for fmt,jp in jobs:
        out=os.path.join(HERE,f"_out_{fmt}")
        subprocess.run(["python3","gen_formats.py",fmt,jp,out],cwd=AC,check=True)
        urls=upload(fmt,out,ds)
        cap=((copy.get("captions") or {}).get(fmt) or "").strip() or (copy.get("caption") or "").strip() or CAPS[fmt]
        res=post("/functions/v1/carousel-enqueue", {"format":fmt,"pillar":PILLAR[fmt],"imgs":urls,"caption":cap}, {"x-cron-secret":SEC})
        print("enqueued",fmt,len(urls),res.get("ok"))
    # --- 베라 분석 리포트 (casestudy 대체): 1위 한국 영상 실분석(analyze-clip, ANON=이용권 무차감) ---
    vera_ok=False
    try:
        sys.path.insert(0, AC); import vera_report
        # 조회수가 아니라 '댓글 최다'(=그 주 가장 화제·반응 많은) 영상을 분석
        cand=[s for s in shopping if s.get("shortcode")]
        top=max(cand, key=lambda s:(s.get("comments") or 0)) if cand else None
        if top:
            az=post("/functions/v1/analyze-clip", {"shortcode":top["shortcode"],"title":top.get("caption",""),"source":"trend"}, {"Authorization":"Bearer "+ANON})
            if az.get("ok") and (az.get("hook") or "").strip() and az.get("selling_points") and az.get("hook_score"):
                az["_feature"]=f"이번 주 댓글 가장 많았던 영상 · {int(top.get('comments') or 0)}개"
                vout=os.path.join(HERE,"_out_vera"); vera_report.render_report(az, vout)
                vurls=upload("vera", vout, ds)
                r=post("/functions/v1/carousel-enqueue", {"format":"vera","pillar":"P","imgs":vurls,"caption":vera_report.build_caption(az)}, {"x-cron-secret":SEC})
                print("enqueued vera", top["shortcode"], len(vurls), r.get("ok")); vera_ok=True
    except Exception as e:
        print("vera skip:", e)
    if not vera_ok and copy.get("casestudy"):
        try:
            jp=w("casestudy.json", copy["casestudy"]); out=os.path.join(HERE,"_out_casestudy")
            subprocess.run(["python3","gen_formats.py","casestudy",jp,out],cwd=AC,check=True)
            urls=upload("casestudy",out,ds)
            cap=((copy.get("captions") or {}).get("casestudy") or "").strip() or CAPS["casestudy"]
            post("/functions/v1/carousel-enqueue", {"format":"casestudy","pillar":"P","imgs":urls,"caption":cap}, {"x-cron-secret":SEC})
            print("enqueued casestudy (fallback)")
        except Exception as e:
            print("casestudy fallback skip:", e)
    # --- 플래그십 스와이프 캐러셀 (주차 로테이션). 실패해도 위 핵심 종에 영향 없음 ---
    try:
        sys.path.insert(0, AC)
        import swipe_engine, swipe_themes
        wk=datetime.date.today().isocalendar()[1]
        deck=swipe_themes.THEMES[wk % len(swipe_themes.THEMES)]
        sout=os.path.join(HERE,"_out_swipe")
        swipe_engine.render_deck(deck, sout)
        surls=upload("swipe", sout, ds)
        r=post("/functions/v1/carousel-enqueue", {"format":"swipe","pillar":"I","imgs":surls,"caption":deck["caption"]}, {"x-cron-secret":SEC})
        print("enqueued swipe", deck["id"], len(surls), r.get("ok"))
    except Exception as e:
        print("swipe skip:", e)
main()
