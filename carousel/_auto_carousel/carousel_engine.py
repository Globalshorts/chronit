# -*- coding: utf-8 -*-
"""크로닛 캐러셀 변주 엔진 — 스킨/컬러/배경/하이라이트를 랜덤 조합해 매번 다른 디자인.
포맷 생성기(top10, casestudy, numbers, rising)가 공용으로 import."""
import os, io, json, urllib.request, urllib.parse, random
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import numpy as np

HERE=os.path.dirname(os.path.abspath(__file__)); AS=os.path.join(HERE,"assets"); ROOT=os.path.dirname(HERE)
try: PXKEY=open(os.path.join(ROOT,"pexels_key.txt"),encoding="utf-8").read().strip()
except Exception: PXKEY=os.environ.get("PEXELS_KEY","")
# Pretendard — 가독성 높은 모던 한글 폰트. BHS=디스플레이(Black), NB=제목/강조(Bold), GM=본문(Medium)
BHS=os.path.join(AS,"Pretendard-Black.otf"); NB=os.path.join(AS,"Pretendard-Bold.otf"); GM=os.path.join(AS,"Pretendard-Medium.otf")
LOGO=os.path.join(ROOT,"logo","chronit-mark-white.png")
W,H=1080,1350; MX=72
WHITE=(255,255,255); GREY=(188,194,206); DIM=(146,152,166); CARD=(22,24,30)
ACCENTS=[(238,58,46),(255,214,10),(0,120,255),(166,230,80),(255,122,40),(255,74,130),(0,208,160)]

def F(fp,s): return ImageFont.truetype(fp,s)
def wof(d,t,f): b=d.textbbox((0,0),t,font=f); return b[2]-b[0]
def hb(d,t,f): b=d.textbbox((0,0),t,font=f); return b[3]-b[1],b[1]
def dark_text(ac): return (12,12,14) if 0.299*ac[0]+0.587*ac[1]+0.114*ac[2]>150 else WHITE
def wrap(d,t,f,maxw):
    # 어절(공백) 단위로 줄바꿈. 한 어절이 폭을 넘으면 그 어절만 글자 단위로 쪼갠다.
    out=[]; line=""
    for word in str(t).split(" "):
        if wof(d,word,f)>maxw:
            if line: out.append(line); line=""
            cur=""
            for ch in word:
                if wof(d,cur+ch,f)<=maxw: cur+=ch
                else:
                    if cur: out.append(cur)
                    cur=ch
            line=cur; continue
        cand=(line+" "+word) if line else word
        if wof(d,cand,f)<=maxw: line=cand
        else: out.append(line); line=word
    if line: out.append(line)
    return out

# ---------- 배경 ----------
def _px(q,n=12):
    if not PXKEY: return []
    url="https://api.pexels.com/v1/search?"+urllib.parse.urlencode(dict(query=q,per_page=n,orientation="portrait",size="large"))
    try:
        req=urllib.request.Request(url,headers={"Authorization":PXKEY,"User-Agent":"c"})
        ph=json.load(urllib.request.urlopen(req,timeout=30)).get("photos",[])
    except Exception: return []
    out=[]
    for p in ph:
        s=p["src"].get("portrait") or p["src"].get("large")
        try: out.append(Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(s,headers={"User-Agent":"c"}),timeout=30).read())).convert("RGB"))
        except: pass
    return out
def photo_bg(q,dark=0.46):
    imgs=_px(q); base=random.choice(imgs) if imgs else Image.new("RGB",(W,H),(14,15,20))
    r=max(W/base.width,H/base.height); im=base.resize((int(base.width*r),int(base.height*r)))
    x=(im.width-W)//2; y=(im.height-H)//2; im=im.crop((x,y,x+W,y+H))
    im=ImageEnhance.Color(im).enhance(0.3); im=ImageEnhance.Contrast(im).enhance(1.05)
    a=np.array(im).astype(np.float32); ys=np.linspace(0,1,H).reshape(H,1)
    ov=np.full((H,W),dark,np.float32); ov+=np.clip((ys-0.3)/0.7,0,1)*0.5
    ov[:int(H*0.14)]=np.maximum(ov[:int(H*0.14)],dark+0.08); ov=np.clip(ov,0,1)
    return Image.fromarray(np.clip(a*(1-ov[:,:,None])+np.array([8,9,13])*ov[:,:,None],0,255).astype(np.uint8)).convert("RGBA")
def solid_bg(tone=(10,11,14)):
    return Image.new("RGB",(W,H),tone).convert("RGBA")
# 포맷별 본문 배경 사진 쿼리 (gen_formats가 render 시작 시 set_bg로 지정). PEXELS 없으면 solid로 자동 폴백.
_BGQ="online shopping products lifestyle dark"
def set_bg(q):
    global _BGQ; _BGQ=q or _BGQ

# ---------- 공통 요소 ----------
def eyebrow(d,txt,ac,y=116):
    d.rectangle([MX,y+2,MX+8,y+32],fill=ac); d.text((MX+22,y),txt,font=F(NB,30),fill=WHITE)
def dots(im,i,n,ac=None):
    d=ImageDraw.Draw(im); r=5; gap=20; x0=W//2-(n-1)*gap//2; y=H-46
    for k in range(n): d.ellipse([x0+k*gap-r,y-r,x0+k*gap+r,y+r],fill=(ac or WHITE) if k==i-1 else (255,255,255,80))
def chevron(im,y=640):
    d=ImageDraw.Draw(im); x=W-70; d.line([(x-10,y-16),(x+8,y),(x-10,y+16)],fill=(255,255,255,230),width=6)
def logo_center(im,width,y):
    lg=Image.open(LOGO).convert("RGBA"); lg=lg.resize((width,int(lg.height*width/lg.width))); im.alpha_composite(lg,(W//2-width//2,y))

def highlight(d,x,y,text,font,ac,style="box"):
    """핵심 문구 강조 — style: box/underline/circle/plain. 반환: 오른쪽 끝 x"""
    tw=wof(d,text,font); h,off=hb(d,text,font)
    if style=="box":
        px,py=20,8; d.rounded_rectangle([x,y,x+tw+px*2,y+h+py*2],10,fill=ac); d.text((x+px,y+py-off),text,font=font,fill=dark_text(ac)); return x+tw+px*2
    if style=="underline":
        d.text((x,y),text,font=font,fill=WHITE); d.rectangle([x,y+h+10,x+tw,y+h+10+max(8,h//10)],fill=ac); return x+tw
    if style=="circle":
        d.text((x,y),text,font=font,fill=WHITE); pad=14
        d.ellipse([x-pad,y-pad+off,x+tw+pad,y+h+pad+off],outline=ac,width=7); return x+tw
    d.text((x,y),text,font=font,fill=ac); return x+tw

# ---------- 테마(한 캐러셀의 변주 선택) ----------
def new_theme(seed=None):
    if seed is not None: random.seed(seed)
    else: random.seed()
    return dict(
        ac=random.choice(ACCENTS),
        hl=random.choice(["box","underline","circle"]),
        cover=random.choice(["boxLeft","center","band","editorial"]),
        card=random.choice(["bar","numbox"]),
    )

# ---------- 커버 스킨 ----------
COVER_BGQ=["person filming product video dark dramatic","online shopping cart smartphone dark","retail store shelves cinematic dark moody","unboxing parcel hands dark","smartphone social media scrolling night","neon shopping street dark"]
def cover(path, th, eyebrow_txt, lines, hl_text, foot):
    ac=th["ac"]; skin=th["cover"]; q=random.choice(COVER_BGQ)
    if skin=="center":
        im=photo_bg(q,0.5); d=ImageDraw.Draw(im)
        t=eyebrow_txt; d.text(((W-wof(d,t,F(GM,32)))/2,250),t,font=F(GM,32),fill=ac)
        y=560
        for t in lines:
            f=F(BHS,96); d.text(((W-wof(d,t,f))/2,y),t,font=f,fill=WHITE); y+=116
        f=F(BHS,96); hw=wof(d,hl_text,f); highlight(d,(W-hw)//2,y+4,hl_text,f,ac,th["hl"])
        t=foot; d.text(((W-wof(d,t,F(GM,28)))/2,y+150),t,font=F(GM,28),fill=GREY)
    elif skin=="band":
        im=photo_bg(q,0.46); d=ImageDraw.Draw(im)
        d.rectangle([0,0,W,120],fill=ac); d.text((MX,36),eyebrow_txt,font=F(NB,38),fill=dark_text(ac))
        y=H-620
        for t in lines: d.text((MX,y),t,font=F(BHS,100),fill=WHITE); y+=116
        f=F(BHS,104); highlight(d,MX,y+4,hl_text,f,ac,th["hl"])
        d.text((MX,H-120),foot,font=F(GM,28),fill=GREY)
    elif skin=="editorial": # 솔리드 배경 매거진형 — 사진 없이 깔끔
        im=photo_bg(q,0.62); d=ImageDraw.Draw(im)
        d.rectangle([0,0,W,14],fill=ac)
        d.text((MX,96),"CHRONIT  INSIGHT  /  "+eyebrow_txt,font=F(NB,28),fill=(150,160,180))
        d.rectangle([MX,160,W-MX,163],fill=(42,47,58))
        y=300
        for t in lines: d.text((MX,y),t,font=F(BHS,100),fill=WHITE); y+=116
        highlight(d,MX,y+8,hl_text,F(BHS,100),ac,th["hl"]); y+=170
        d.rectangle([MX,y,W-MX,y+3],fill=(42,47,58))
        d.text((MX,H-120),foot,font=F(GM,28),fill=(150,160,180))
    else: # boxLeft
        im=photo_bg(q,0.42); d=ImageDraw.Draw(im); eyebrow(d,eyebrow_txt,ac)
        boxH=132; by=H-210-boxH-len(lines)*116
        for t in lines: d.text((MX,by),t,font=F(BHS,104),fill=WHITE); by+=116
        highlight(d,MX,by+6,hl_text,F(BHS,104),ac,th["hl"]); d.text((MX,H-120),foot,font=F(GM,28),fill=GREY)
        chevron(im)
    dots(im,1,th.get("n",7),ac); im.convert("RGB").save(path,quality=92)

# ---------- 리스트 카드 슬라이드 (2개/장) ----------
def list_slide(path, th, i, n, header, items):
    """items: list of dict(rank,title,meta,label,body) — 최대 2개"""
    ac=th["ac"]; im=photo_bg(_BGQ,0.58); d=ImageDraw.Draw(im); eyebrow(d,header,ac)
    cw=W-2*MX; ch=372; gap=44; y0=338
    for k,it in enumerate(items[:2]):
        x,y=MX,y0+k*(ch+gap)
        d.rounded_rectangle([x,y,x+cw,y+ch],20,fill=CARD)
        if th["card"]=="numbox":
            d.rounded_rectangle([x+34,y+28,x+34+86,y+28+70],14,fill=ac); d.text((x+46,y+30),it["rank"],font=F(BHS,52),fill=dark_text(ac)); px0=x+150
            d.text((px0,y+44),it.get("meta",""),font=F(GM,27),fill=DIM)
        else: # bar
            d.rectangle([x,y+20,x+7,y+ch-20],fill=ac); px0=x+40
            d.text((px0,y+26),it["rank"],font=F(BHS,60),fill=ac); d.text((px0+ (wof(d,it['rank'],F(BHS,60))+22),y+52),it.get("meta",""),font=F(GM,27),fill=DIM)
        tw=(x+cw)-px0-40  # 카드 안쪽 우측 여백 확보
        hy=y+118; tl=[]; hf=F(BHS,46); lh=58
        for sz in (46,42,38,34):  # 제목이 2줄에 들어오도록 폰트 자동 축소
            hf=F(BHS,sz); tl=wrap(d,it["title"],hf,tw); lh=sz+12
            if len(tl)<=2: break
        for ln in tl[:2]: d.text((px0,hy),ln,font=hf,fill=WHITE); hy+=lh
        hy+=6; d.line([(px0,hy),(x+cw-40,hy)],fill=(255,255,255,40),width=2); hy+=18
        if it.get("label"): d.text((px0,hy),it["label"],font=F(NB,25),fill=ac); hy+=40
        for ln in wrap(d,it.get("body",""),F(GM,29),tw)[:2]: d.text((px0,hy),ln,font=F(GM,29),fill=GREY); hy+=40
    dots(im,i,n,ac); im.convert("RGB").save(path,quality=92)

# ---------- 숫자/스탯 슬라이드 ----------
def stat_slide(path, th, i, n, header, big, big_unit, caption_lines):
    ac=th["ac"]; im=photo_bg(_BGQ,0.62); d=ImageDraw.Draw(im); eyebrow(d,header,ac)
    d.text((MX,470),big,font=F(BHS,260),fill=ac)
    if big_unit: d.text((MX+wof(d,big,F(BHS,260))+16,650),big_unit,font=F(BHS,80),fill=WHITE)
    y=820
    for t in caption_lines: d.text((MX,y),t,font=F(GM,40),fill=WHITE if y==820 else GREY); y+=58
    dots(im,i,n,ac); im.convert("RGB").save(path,quality=92)

# ---------- 큰 서술 슬라이드 (사례해부 포인트 등) ----------
def point_slide(path, th, i, n, header, kicker, lines, body_lines):
    ac=th["ac"]; q=random.choice(COVER_BGQ); im=photo_bg(q,0.5); d=ImageDraw.Draw(im); eyebrow(d,header,ac)
    d.text((MX,430),kicker,font=F(GM,34),fill=ac)
    y=500
    for t in lines: d.text((MX,y),t,font=F(BHS,72),fill=WHITE); y+=86
    y+=20
    for t in body_lines: d.text((MX,y),t,font=F(GM,34),fill=GREY); y+=50
    dots(im,i,n,ac); im.convert("RGB").save(path,quality=92)

# ---------- CTA ----------
def cta(path, th, i, n, lines, sub_lines, box_text, comment):
    ac=th["ac"]; im=photo_bg("laptop glowing screen dark desk night",0.5); d=ImageDraw.Draw(im)
    logo_center_x=MX
    lg=Image.open(LOGO).convert("RGBA"); lg=lg.resize((150,int(lg.height*150/lg.width))); im.alpha_composite(lg,(MX,250))
    y=560
    for t in lines: d.text((MX,y),t,font=F(BHS,80),fill=WHITE); y+=94
    y+=20
    for t in sub_lines: d.text((MX,y),t,font=F(GM,34),fill=GREY); y+=48
    highlight(d,MX,y+30,box_text,F(BHS,54),ac,"box")
    d.text((MX,H-116),comment,font=F(GM,29),fill=WHITE)
    dots(im,i,n,ac); im.convert("RGB").save(path,quality=92)
