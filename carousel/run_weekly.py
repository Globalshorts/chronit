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

HOOK_CAP=("이번 주 쇼핑 릴스에서 실제로 쓰인 훅 패턴을 모았어요.\n\n"
 "조회수가 안 나오면 대부분 0~3초 훅에서 스크롤을 못 잡은 거예요.\n\n"
 "유형별로 왜 먹히는지와 내 상품에 바로 쓰는 템플릿까지 정리했어요. 저장해두고 다음 영상 기획할 때 꺼내 쓰세요 📌\n\n"
 "어떤 훅이 제일 끌렸나요? 댓글로 알려주세요 💬\n\n"
 "👉 터지는 쇼핑 소재랑 내 말투 대본까지: chronit.kr")
_HQ=["person filming product video smartphone","surprised excited woman shopping","cozy warm home interior","shopping cart products saving","retail store shelf display","young woman small apartment","minimal tidy room interior"]
def build_hook_deck(realhooks, caption):
    cards=[]
    for i,h in enumerate(realhooks[:7]):
        cards.append({"no":f"{i+1:02d}","name":str(h.get("pattern") or "훅"),"why":str(h.get("why") or ""),
                      "tpl":str(h.get("swap") or ""),"ex":str(h.get("hook") or ""),"q":_HQ[i%len(_HQ)]})
    return {"id":"weekhooks","eyebrow":"이번 주 쇼핑 릴스 훅","panel_label":"내 상품에 바꿔 쓰기",
      "cover":{"tag":"· 이번 주 훅","lines":["이번 주 실제로 쓰인","쇼핑 릴스 훅"],"hl":f"패턴 {len(cards)}",
               "sub":"왜 먹혔는지 + 바로 쓰는 템플릿까지 · 저장해두세요","q":"person filming product video smartphone studio","dark":0.52},
      "cards":cards,
      "cta":{"lines":["이번 주 훅은 봤고","내 영상은요?"],
             "sub":["크로닛이 매일 터지는 쇼핑 소재를 찾아주고,","내 말투 그대로 대본까지 뽑아줍니다."],
             "end":"어떤 훅이 제일 끌렸나요? 댓글로 알려주세요","q":"content creator editing video laptop phone desk","dark":0.6},
      "caption":caption}

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
    sys.path.insert(0, AC); import swipe_engine
    # ① 이번 주 실제 훅 패턴 덱 — 유형·왜 먹히나·내 상품 템플릿 (집계/순위 없이 실사용 가치)
    try:
        rh=copy.get("realhooks") or []
        if len(rh)>=4:
            deck=build_hook_deck(rh, (copy.get("caption") or "").strip() or HOOK_CAP)
            hout=os.path.join(HERE,"_out_weekhooks"); swipe_engine.render_deck(deck, hout)
            hurls=upload("weekhooks", hout, ds)
            r=post("/functions/v1/carousel-enqueue", {"format":"weekhooks","pillar":"I","imgs":hurls,"caption":deck["caption"]}, {"x-cron-secret":SEC})
            print("enqueued weekhooks", len(rh), r.get("ok"))
        else:
            print("weekhooks skip: too few realhooks", len(rh))
    except Exception as e:
        print("weekhooks skip:", e)
    # ② 베라 분석 리포트: 한국 트렌드 '댓글 최다' 쇼핑 영상 실분석 (가십·중복 제외)
    try:
        import vera_report
        feats=fd.get("features") or []
        _norm=lambda s:"".join(str(s).split()).lower()
        recent=set(_norm(p) for p in (fd.get("recent_products") or []))
        if not feats:
            feats=[{"shortcode":s["shortcode"],"caption":s.get("caption",""),"comments":s.get("comments"),"thumbnail_url":""}
                   for s in sorted([s for s in shopping if s.get("shortcode")],key=lambda s:-(s.get("comments") or 0))[:3]]
        for f in feats[:5]:
            az=post("/functions/v1/analyze-clip", {"shortcode":f["shortcode"],"title":f.get("caption",""),"thumbnail_url":f.get("thumbnail_url") or "","source":"trend"}, {"Authorization":"Bearer "+ANON})
            pn=(az.get("product_name") or "").strip()
            if az.get("ok") and pn and len(az.get("selling_points") or [])>=2 and (az.get("hook_score") or 0)>=60:
                if _norm(pn) in recent:
                    print("vera skip dup product", f.get("shortcode"), pn); continue
                az["_feature"]=f"이번 주 댓글 가장 많았던 영상 · {int(f.get('comments') or 0)}개"
                vout=os.path.join(HERE,"_out_vera"); vera_report.render_report(az, vout)
                vurls=upload("vera", vout, ds)
                r=post("/functions/v1/carousel-enqueue", {"format":"vera","pillar":"P","imgs":vurls,"caption":vera_report.build_caption(az),"featured_shortcode":f["shortcode"],"featured_product":pn}, {"x-cron-secret":SEC})
                print("enqueued vera", f["shortcode"], f.get("comments"), len(vurls), r.get("ok")); break
            else:
                print("vera skip candidate", f.get("shortcode"), pn[:20], az.get("hook_score"))
    except Exception as e:
        print("vera skip:", e)
    # ③ 플래그십 스와이프 캐러셀 (주차 로테이션). 실패해도 위에 영향 없음
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
