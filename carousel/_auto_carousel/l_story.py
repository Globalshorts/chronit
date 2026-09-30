# -*- coding: utf-8 -*-
import os, io, json, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import numpy as np

HERE=os.path.dirname(os.path.abspath(__file__)); AS=os.path.join(HERE,"assets"); ROOT=os.path.dirname(HERE)
PXKEY=open(os.path.join(ROOT,"pexels_key.txt"),encoding="utf-8").read().strip()
NB=os.path.join(AS,"NotoSansKR-Bold.ttf"); GM=os.path.join(AS,"GmarketSansMedium.otf")
LOGO=os.path.join(ROOT,"logo","chronit-mark-white.png")
W,H=1080,1350; MX=110
WHITE=(255,255,255); GREY=(178,184,198); DIM=(140,146,160)

def F(fp,s): return ImageFont.truetype(fp,s)
def wof(d,t,f): b=d.textbbox((0,0),t,font=f); return b[2]-b[0]
def cl(d,y,t,fp,s,c):
    f=F(fp,s); d.text(((W-wof(d,t,f))/2,y),t,font=f,fill=c)
def block(d,cy,lines,fp,s,c,lh):
    n=len(lines); total=(n-1)*lh; y=cy-total/2-s/2
    for t in lines:
        cl(d,y,t,fp,s,c); y+=lh
    return y-lh+s

def scrim(im,base=0.42,topdark=0.5,botdark=0.72,botstart=0.35):
    im=im.convert("RGB")
    im=ImageEnhance.Color(im).enhance(0.38); im=ImageEnhance.Brightness(im).enhance(0.9)
    im=im.resize((W,H))
    a=np.array(im).astype(np.float32); ys=np.linspace(0,1,H).reshape(H,1)
    ov=np.zeros((H,W),np.float32)+base
    ov+=np.clip((ys-botstart)/(1-botstart),0,1)*(botdark-base)
    ov[:int(H*0.30)]=np.maximum(ov[:int(H*0.30)],topdark)
    band=np.exp(-((ys-0.5)**2)/(2*0.16**2))*0.13; ov+=band; ov=np.clip(ov,0,1)
    tint=np.array([8,9,14],np.float32)
    out=a*(1-ov[:,:,None])+tint*ov[:,:,None]*0.5
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8),"RGB").convert("RGBA")

def vignette(im,strength=0.5):
    yy,xx=np.mgrid[0:H,0:W]
    dd=np.sqrt(((xx-W/2)/(W/2))**2+((yy-H/2)/(H/2))**2)
    v=np.clip((dd-0.55)/0.75,0,1)*strength
    a=np.array(im.convert("RGB")).astype(np.float32)*(1-v[:,:,None])
    return Image.fromarray(np.clip(a,0,255).astype(np.uint8),"RGB").convert("RGBA")

def foot(d,i,n=8):
    f=F(GM,26); d.text((MX,H-88),"@chronit.kr",font=f,fill=DIM)
    t=f"{i:02d} / {n:02d}"; d.text((W-MX-wof(d,t,f),H-88),t,font=f,fill=DIM)
def logo(im,width,y):
    lg=Image.open(LOGO).convert("RGBA")
    h=int(lg.height*width/lg.width); lg=lg.resize((width,h))
    im.alpha_composite(lg,(W//2-width//2,y))

def px(query,n=8):
    url="https://api.pexels.com/v1/search?"+urllib.parse.urlencode(dict(query=query,per_page=n,orientation="portrait",size="large"))
    req=urllib.request.Request(url,headers={"Authorization":PXKEY,"User-Agent":"chronit/1.0"})
    data=json.load(urllib.request.urlopen(req,timeout=30)); ph=data.get("photos",[]); out=[]
    for p in ph:
        src=p["src"].get("portrait") or p["src"].get("large")
        try:
            b=urllib.request.urlopen(urllib.request.Request(src,headers={"User-Agent":"chronit/1.0"}),timeout=30).read()
            out.append(Image.open(io.BytesIO(b)).convert("RGB"))
        except Exception: pass
    return out
def pick(query,alt=None,idx=0):
    imgs=px(query)
    if len(imgs)<=idx and alt: imgs=px(alt)
    return imgs[idx] if len(imgs)>idx else (imgs[0] if imgs else Image.new("RGB",(W,H),(12,13,18)))

SLIDES=[
 dict(q="vintage film camera dark moody", alt="camera lens dark", kick="크로닛, 이야기 둘",
      head=["처음엔,","영상 제작이었습니다"], sub=["방향을 바꾼 이유"], cover=True),
 dict(q="video editing timeline screen dark", alt="editing computer dark room", kick="처음의 계획",
      head=["촬영과 편집,","대신 해주면 된다고"], sub=["영상 제작이 가장 큰 벽이라 믿었죠"]),
 dict(q="blank notebook empty page dark", alt="empty paper desk dim light", kick="그런데 현장에서",
      head=["막힌 곳은","편집 앞이었습니다"], sub=["'오늘 무엇을 올리지?'","대부분 거기서 멈췄어요"]),
 dict(q="person scrolling phone dark night", alt="smartphone glow dark hands", kick="잘 만든 영상도",
      head=["소재가 틀리면","닿지 않습니다"], sub=["결과를 가르는 건","무엇을 말하느냐였어요"]),
 dict(q="empty road night headlights moody", alt="long road dark horizon", kick="그래서, 방향을 바꿨습니다",
      head=["영상 제작에서","트렌드·대본으로"], sub=["문제가 시작되는 곳으로"]),
 dict(q="laptop screen glow dark night desk", alt="computer screen glow dark", kick="지금의 크로닛",
      head=["소재를 찾고,","대본까지 한 번에"], sub=["지금 팔리는 트렌드에서","내 말투 그대로의 대본으로"]),
 dict(q="sunrise window morning calm warm light", alt="soft morning light window", kick="크로닛의 방향",
      head=["만드는 도구보다,","시작하게 하는 도구"], sub=["촬영은 당신이, 기획은 크로닛이"]),
 dict(cta=True, head=["크로닛"], sub=["chronit.kr","@chronit.kr"]),
]

def build(outdir):
    os.makedirs(outdir,exist_ok=True)
    for i,s in enumerate(SLIDES,1):
        if s.get("cta"):
            im=Image.new("RGB",(W,H),(9,10,15)).convert("RGBA")
            yy,xx=np.mgrid[0:H,0:W]; dd=np.sqrt(((xx-W/2)/W)**2+((yy-H*0.42)/H)**2)
            g=np.clip(1-dd/0.5,0,1)**2*26
            a=np.array(im.convert("RGB")).astype(np.float32); a+=g[:,:,None]*np.array([0.7,0.9,1.4])
            im=Image.fromarray(np.clip(a,0,255).astype(np.uint8)).convert("RGBA")
            d=ImageDraw.Draw(im); logo(im,190,430)
            block(d,720,s["head"],NB,120,WHITE,150); block(d,930,s["sub"],GM,40,GREY,58)
            foot(d,i); im.convert("RGB").save(os.path.join(outdir,f"L{i}.png")); print("L%d cta"%i); continue
        base=pick(s["q"],s.get("alt"),0)
        im=scrim(base, base=0.34 if s.get("cover") else 0.40, botdark=0.74,
                 topdark=0.42 if s.get("cover") else 0.52, botstart=0.32)
        im=vignette(im,0.55 if s.get("cover") else 0.42)
        d=ImageDraw.Draw(im)
        if s.get("cover"): logo(im,150,236)
        cl(d,372 if s.get("cover") else 360, s["kick"], GM, 32, GREY)
        hs=100 if s.get("cover") else 88
        endy=block(d,690,s["head"],NB,hs,WHITE,int(hs*1.28))
        if s["sub"]: block(d,endy+96,s["sub"],GM,40,GREY,58)
        foot(d,i); im.convert("RGB").save(os.path.join(outdir,f"L{i}.png")); print("L%d ok"%i)

if __name__=="__main__":
    out=os.path.join(ROOT,"_L캐러셀_2026-10-01"); build(out); print("DIR="+out)
