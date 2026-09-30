# -*- coding: utf-8 -*-
# 크로닛 캐러셀 자동 생성기 — 매일 실행: Pexels 새 이미지 + 로테이션 훅 → 카드 7장 + 캡션
import os, sys, json, datetime, urllib.request, urllib.parse, io, hashlib
from PIL import Image, ImageDraw, ImageFont
import numpy as np

HERE=os.path.dirname(os.path.abspath(__file__))
AS=os.path.join(HERE,"assets")
ROOT=os.path.dirname(HERE)  # Chronit
def keyread():
    for p in [os.path.join(ROOT,"pexels_key.txt")]:
        if os.path.exists(p):
            return open(p,encoding="utf-8").read().strip()
    return ""
PXKEY=keyread()
BHS=os.path.join(AS,"BlackHanSans-Regular.ttf"); NB=os.path.join(AS,"NotoSansKR-Bold.ttf"); GM=os.path.join(AS,"GmarketSansMedium.otf")
LOGO=os.path.join(AS,"logo_white.png")
W,H=1080,1350
WHITE=(255,255,255); AMBER=(232,180,110); SOFT=(228,222,212); MUTE=(200,192,180); MX=110

# ── 로테이션: 커버 훅 + 캡션 훅 ──
HOOKS=[
 dict(k="쇼핑 숏폼 자동화 · 크로닛", l1="밤샘 편집 없이", l2=("계정을 ","2배로",""), sub="유튜브 · 틱톡 · 인스타 링크만 넣으면",
      cap="매일 밤 소싱·대본·자막·편집… 그 밤샘, 이제 그만하고 싶다면 👇"),
 dict(k="쇼핑 숏폼 자동화 · 크로닛", l1="편집에 쓰던 몇 시간", l2=("이제 ","2분",""), sub="영상 링크 하나면 숏폼이 완성돼요",
      cap="편집에 몇 시간씩 쓰던 거, 이제 2분이면 끝나요 👇"),
 dict(k="쇼핑 숏폼 자동화 · 크로닛", l1="계정은 느는데", l2=("몸은 ","하나",""), sub="제작을 자동화하면 확장이 쉬워져요",
      cap="계정은 늘리고 싶은데 몸이 못 버틴다면 👇"),
 dict(k="쇼핑 숏폼 자동화 · 크로닛", l1="대충 만든 티", l2=("전혀 ","안 나요",""), sub="대본·자막·컷까지 자연스럽게",
      cap="AI로 만들었는데 대충 만든 티가 안 나요 👇"),
 dict(k="쇼핑 숏폼 자동화 · 크로닛", l1="잘 팔리는 영상만", l2=("링크 ","넣으면 끝",""), sub="유튜브·틱톡·인스타에서 찾아 붙여넣기",
      cap="잘 나가는 쇼핑 영상, 링크만 넣으면 내 숏폼으로 👇"),
 dict(k="쇼핑 숏폼 자동화 · 크로닛", l1="하나 만들 시간에", l2=("숏폼 ","여러 개",""), sub="찍지도, 편집하지도 않고",
      cap="하나 만들 시간에 여러 개, 밤새지 않고 👇"),
]
QUERIES=["cozy aesthetic desk night lamp","warm aesthetic desk lamp study","moody aesthetic workspace night","aesthetic coffee desk lamp warm"]
HASHTAGS="#쿠팡파트너스 #부업 #부수입 #공구 #인스타공구 #릴스 #숏폼 #숏폼제작 #직장인부업 #제휴마케팅 #AI툴 #콘텐츠자동화"

def F(fp,s): return ImageFont.truetype(fp,s)
def wof(d,t,f): b=d.textbbox((0,0),t,font=f); return b[2]-b[0]
def cl(d,y,t,fp,s,c): f=F(fp,s); d.text(((W-wof(d,t,f))/2,y),t,font=f,fill=c)
def cr(d,y,runs,fp,s):
    f=F(fp,s); tot=sum(wof(d,t,f) for t,_ in runs); x=(W-tot)/2
    for t,c in runs: d.text((x,y),t,font=f,fill=c); x+=wof(d,t,f)
def scrim(im,base=0.32,topdark=0.35,botdark=0.86,botstart=0.42):
    im=im.convert("RGB").resize((W,H)); ys=np.linspace(0,1,H).reshape(H,1)
    ov=np.zeros((H,W),np.float32)+base
    ov+=np.clip((ys-botstart)/(1-botstart),0,1)*(botdark-base)
    ov[:int(H*0.22)]=np.maximum(ov[:int(H*0.22)],topdark); ov=np.clip(ov,0,1)
    return Image.fromarray((np.array(im).astype(np.float32)*(1-ov[:,:,None])).astype(np.uint8),"RGB").convert("RGBA")
def logo(im,size,y):
    lg=Image.open(LOGO).convert("RGBA").resize((size,size)); im.alpha_composite(lg,(W//2-size//2,y))
def kicker(d,t,y=150,c=AMBER): d.text(((W-wof(d,t,F(GM,30)))/2,y),t,font=F(GM,30),fill=c)
def rule(d,y,c=AMBER,wpx=70): d.line([W/2-wpx,y,W/2+wpx,y],fill=c,width=5)
def foot(d,i,n=7):
    f=F(GM,27); t=f"{i:02d} / {n:02d}"; d.text((W-MX-wof(d,t,f),H-92),t,font=f,fill=MUTE)
    d.text((MX,H-92),("swipe →" if i<n else "chronit.kr"),font=f,fill=MUTE)

def px_fetch(query,n=9,offset=0):
    if not PXKEY: raise SystemExit("NO_PEXELS_KEY")
    url="https://api.pexels.com/v1/search?"+urllib.parse.urlencode(dict(query=query,per_page=n+offset+2,orientation="portrait",size="large"))
    UA={"User-Agent":"chronit-carousel/1.0"}
    req=urllib.request.Request(url,headers=dict(UA,**{"Authorization":PXKEY}))
    data=json.load(urllib.request.urlopen(req,timeout=30))
    photos=data.get("photos",[])[offset:offset+n]
    imgs=[]
    for p in photos:
        src=p["src"].get("portrait") or p["src"].get("large") or p["src"]["original"]
        b=urllib.request.urlopen(urllib.request.Request(src,headers=UA),timeout=30).read()
        imgs.append(Image.open(io.BytesIO(b)).convert("RGB"))
    return imgs

def build(hook,imgs,outdir):
    os.makedirs(outdir,exist_ok=True)
    def sv(im,i): im.convert("RGB").save(os.path.join(outdir,f"카드{i}.png"))
    # 1 cover
    im=scrim(imgs[0],base=0.28,botstart=0.45); d=ImageDraw.Draw(im); logo(im,90,210)
    kicker(d,hook["k"],300,c=SOFT); cl(d,700,hook["l1"],BHS,104,WHITE)
    a,b,c=hook["l2"]; cr(d,832,[(a,WHITE),(b,AMBER),(c,WHITE)],BHS,104)
    cl(d,1010,hook["sub"],NB,36,SOFT); foot(d,1); sv(im,1)
    # 2 empathy
    im=scrim(imgs[1],base=0.34,botstart=0.38); d=ImageDraw.Draw(im); kicker(d,"매일 밤, 익숙한 풍경")
    cl(d,640,"소싱하고, 대본 쓰고,",NB,52,WHITE); cl(d,714,"자막에 목소리까지",NB,52,WHITE); rule(d,840)
    cr(d,910,[("그 ",WHITE),("밤샘",AMBER),(", 언제까지?",WHITE)],BHS,80); foot(d,2); sv(im,2)
    # 3 shift
    im=scrim(imgs[2],base=0.32,botstart=0.4); d=ImageDraw.Draw(im); kicker(d,"이제, 방식이 바뀝니다")
    cl(d,660,"그 과정을,",BHS,88,WHITE); cr(d,778,[("이제 ",WHITE),("AI",AMBER),("가 대신",WHITE)],BHS,88)
    cl(d,960,"잘 만들 줄 아는 당신이, 더는 지치지 않게",NB,36,SOFT); foot(d,3); sv(im,3)
    # 4 how
    im=scrim(imgs[3],base=0.5,topdark=0.5,botstart=0.2,botdark=0.8); d=ImageDraw.Draw(im); kicker(d,"작동 방식")
    cr(d,250,[("영상 링크 ",WHITE),("하나",AMBER),("면",WHITE)],BHS,74)
    for i,t in enumerate(["상품 분석","대본 · 자막","AI 목소리","컷 편집","썸네일까지"]):
        y=470+i*128; d.ellipse([MX,y+16,MX+15,y+31],fill=AMBER); d.text((MX+50,y),t,font=F(NB,48),fill=WHITE)
        if i<4: d.line([MX+7,y+72,W-MX,y+72],fill=(255,255,255),width=1)
    foot(d,4); sv(im,4)
    # 5 quality
    im=scrim(imgs[4],base=0.36,botstart=0.36); d=ImageDraw.Draw(im); kicker(d,"퀄리티")
    cl(d,640,"대충 만든 티,",BHS,86,WHITE); cr(d,758,[("안 ",WHITE),("나요",AMBER)],BHS,86); rule(d,910)
    cl(d,975,"대본·자막·컷 흐름까지 자연스럽게",NB,38,SOFT); cl(d,1030,"고수 눈에도 통과하는 완성도",NB,38,SOFT); foot(d,5); sv(im,5)
    # 6 scale
    im=scrim(imgs[5],base=0.34,botstart=0.4); d=ImageDraw.Draw(im); kicker(d,"그래서, 확장")
    cl(d,660,"하나 만들 시간에",BHS,78,WHITE); cr(d,775,[("여러 개",AMBER)],BHS,92)
    cl(d,965,"계정을 늘려도 몸이 갈리지 않아요",NB,38,SOFT); foot(d,6); sv(im,6)
    # 7 close
    im=scrim(imgs[6],base=0.4,botstart=0.34); d=ImageDraw.Draw(im); logo(im,96,470)
    cl(d,640,"밤샘은 줄이고,",BHS,80,WHITE); cr(d,758,[("계정은 ",WHITE),("늘리고",AMBER)],BHS,80); rule(d,910)
    cl(d,975,"크로닛 (Chronit)",NB,44,WHITE); cl(d,1045,"chronit.kr  ·  @chronit_",GM,34,SOFT); foot(d,7); sv(im,7)

def caption(hook):
    return (hook["cap"]+"\n"
            "댓글에 \"링크\" 남겨주세요. 크로닛 바로 DM으로 보내드릴게요.\n\n"
            "유튜브·틱톡·인스타 영상 링크만 넣으면 상품 소개 숏폼이 자동 완성돼요.\n"
            "대본·자막·AI 목소리·컷 편집·썸네일까지 — 고수 눈에도 통과하는 완성도로.\n\n"
            "편집을 못 해서가 아니라, 매일 밤이 문제였잖아요.\n밤샘은 줄이고, 계정은 늘리세요.\n\n"
            "👉 댓글 \"링크\" 남기면 DM 발송해드려요.\n\n"+HASHTAGS)

def main():
    today=datetime.date.today()
    idx=today.toordinal()
    hook=HOOKS[idx%len(HOOKS)]; query=QUERIES[idx%len(QUERIES)]; offset=(idx*7)%20
    imgs=px_fetch(query,9,offset)
    if len(imgs)<7: imgs=(imgs+imgs+imgs)[:7]
    outdir=os.path.join(ROOT,f"광고_캐러셀_{today.isoformat()}")
    build(hook,imgs,outdir)
    open(os.path.join(outdir,"캡션.txt"),"w",encoding="utf-8").write(caption(hook))
    print("OK_DIR="+outdir)
    print("HOOK="+hook["l1"]+" "+hook["l2"][1])

if __name__=="__main__": main()
