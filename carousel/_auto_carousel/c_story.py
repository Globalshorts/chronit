# -*- coding: utf-8 -*-
# 크로닛 C(신뢰=제품 투명성) 캐러셀 샘플 — 실제 앱 화면 + 다크 + 가운데 텍스트
import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np
HERE=os.path.dirname(os.path.abspath(__file__)); AS=os.path.join(HERE,"assets"); ROOT=os.path.dirname(HERE)
NB=os.path.join(AS,"NotoSansKR-Bold.ttf"); GM=os.path.join(AS,"GmarketSansMedium.otf")
LOGO=os.path.join(ROOT,"logo","chronit-mark-white.png")
W,H=1080,1350; MX=90; BG=(8,9,12)
WHITE=(255,255,255); GREY=(178,184,198); DIM=(140,146,160); BLUE=(110,168,255)
def F(fp,s): return ImageFont.truetype(fp,s)
def wof(d,t,f): b=d.textbbox((0,0),t,font=f); return b[2]-b[0]
def cl(d,y,t,fp,s,c): f=F(fp,s); d.text(((W-wof(d,t,f))/2,y),t,font=f,fill=c)
def block(d,y0,lines,fp,s,c,lh):
    y=y0
    for t in lines: cl(d,y,t,fp,s,c); y+=lh
    return y
def foot(d,i,n=4):
    f=F(GM,26); d.text((MX,H-84),"@chronit.kr",font=f,fill=DIM)
    t=f"{i:02d} / {n:02d}"; d.text((W-MX-wof(d,t,f),H-84),t,font=f,fill=DIM)
def logo(im,width,y):
    lg=Image.open(LOGO).convert("RGBA"); h=int(lg.height*width/lg.width); lg=lg.resize((width,h))
    im.alpha_composite(lg,(W//2-width//2,y))
def rounded(img,rad):
    m=Image.new("L",img.size,0); d=ImageDraw.Draw(m)
    d.rounded_rectangle([0,0,img.size[0],img.size[1]],rad,fill=255)
    out=Image.new("RGBA",img.size,(0,0,0,0)); out.paste(img,(0,0)); out.putalpha(m); return out

def shot_card(path,crop,max_w=900,max_h=620):
    im=Image.open(path).convert("RGB").crop(crop)
    r=min(max_w/im.width, max_h/im.height)
    w=int(im.width*r); h=int(im.height*r); im=im.resize((w,h))
    return rounded(im.convert("RGBA"),22)

def badge(d,x,y,txt,num=True):
    f=F(NB,40); tw=wof(d,txt,f)
    pad=18; d.rounded_rectangle([x,y,x+tw+pad*2,y+66],16,fill=(38,42,52))
    d.text((x+pad,y+10),txt,font=f,fill=WHITE)

def build(outdir):
    os.makedirs(outdir,exist_ok=True)
    def sv(im,i): im.convert("RGB").save(os.path.join(outdir,f"C{i}.png")); print("C%d"%i)
    # 1 cover
    im=Image.new("RGB",(W,H),BG).convert("RGBA")
    yy,xx=np.mgrid[0:H,0:W]; dd=np.sqrt(((xx-W/2)/W)**2+((yy-H*0.4)/H)**2)
    g=np.clip(1-dd/0.55,0,1)**2*22
    a=np.array(im.convert("RGB")).astype(np.float32); a+=g[:,:,None]*np.array([0.6,0.8,1.4])
    im=Image.fromarray(np.clip(a,0,255).astype(np.uint8)).convert("RGBA")
    d=ImageDraw.Draw(im); logo(im,140,300)
    cl(d,560,"진짜 되냐고요?",GM,40,GREY)
    block(d,650,["말로 하지 않고","화면으로 보여드립니다"],NB,90,WHITE,116)
    cl(d,900,"크로닛이 실제로 작동하는 방식",GM,38,GREY)
    foot(d,1); sv(im,1)
    # 2 trend
    im=Image.new("RGB",(W,H),BG).convert("RGBA"); d=ImageDraw.Draw(im)
    card=shot_card("shot_trend.jpg",(455,0,1285,690),max_h=600)
    im.alpha_composite(card,((W-card.width)//2,120))
    cy=120+card.height+48
    d.rounded_rectangle([MX,cy,MX+64,cy+64],16,fill=(38,42,52)); d.text((MX+22,cy+6),"1",font=F(NB,44),fill=WHITE)
    block(d,cy+92,["지금 터지는 소재를","실시간으로 모아요"],NB,70,WHITE,88)
    block(d,cy+92+188,["조회수·댓글로 거르고, 아직 덜 퍼진","'선점' 소재까지 표시해요"],GM,36,GREY,52)
    foot(d,2); sv(im,2)
    # 3 vera
    im=Image.new("RGB",(W,H),BG).convert("RGBA"); d=ImageDraw.Draw(im)
    card=shot_card("shot_vera.jpg",(398,12,1268,495),max_h=560)
    im.alpha_composite(card,((W-card.width)//2,150))
    cy=150+card.height+56
    d.rounded_rectangle([MX,cy,MX+64,cy+64],16,fill=(38,42,52)); d.text((MX+22,cy+6),"2",font=F(NB,44),fill=WHITE)
    block(d,cy+92,["고른 소재를","내 말투 대본으로"],NB,70,WHITE,88)
    block(d,cy+92+188,["소재만 고르면 베라가 초안을 써요.","고칠수록 내 말투를 배우고요"],GM,36,GREY,52)
    foot(d,3); sv(im,3)
    # 4 CTA
    im=Image.new("RGB",(W,H),(9,10,15)).convert("RGBA")
    yy,xx=np.mgrid[0:H,0:W]; dd=np.sqrt(((xx-W/2)/W)**2+((yy-H*0.42)/H)**2); g=np.clip(1-dd/0.5,0,1)**2*26
    a=np.array(im.convert("RGB")).astype(np.float32); a+=g[:,:,None]*np.array([0.7,0.9,1.4])
    im=Image.fromarray(np.clip(a,0,255).astype(np.uint8)).convert("RGBA"); d=ImageDraw.Draw(im)
    logo(im,190,430); block(d,660,["크로닛"],NB,120,WHITE,150); block(d,850,["chronit.kr","@chronit.kr"],GM,40,GREY,58)
    foot(d,4); sv(im,4)

if __name__=="__main__":
    out=os.path.join(ROOT,"_C샘플_2026-09-26"); build(out); print("DIR="+out)
