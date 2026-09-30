# -*- coding: utf-8 -*-
import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np
AS="assets"; ROOT=".."
NB=os.path.join(AS,"NotoSansKR-Bold.ttf"); GM=os.path.join(AS,"GmarketSansMedium.otf")
LOGO=os.path.join(ROOT,"logo","chronit-mark-white.png")
W,H=1080,1350
im=Image.new("RGB",(W,H),(10,11,15)).convert("RGBA")
# 블루 글로우
yy,xx=np.mgrid[0:H,0:W]; dd=np.sqrt(((xx-W/2)/W)**2+((yy-H*0.28)/H)**2)
g=np.clip(1-dd/0.5,0,1)**2*30
a=np.array(im.convert("RGB")).astype(np.float32); a+=g[:,:,None]*np.array([0.5,0.75,1.5])
im=Image.fromarray(np.clip(a,0,255).astype(np.uint8)).convert("RGBA")
d=ImageDraw.Draw(im)
def F(fp,s): return ImageFont.truetype(fp,s)
def wof(t,f): b=d.textbbox((0,0),t,font=f); return b[2]-b[0]
def cl(y,t,fp,s,c): f=F(fp,s); d.text(((W-wof(t,f))/2,y),t,font=f,fill=c)
# 로고
lg=Image.open(LOGO).convert("RGBA"); lw=120; lg=lg.resize((lw,int(lg.height*lw/lg.width)))
im.alpha_composite(lg,(W//2-lw//2,120))
# badge
bt="베라 · 크로닛의 대본 비서"; f=F(GM,32); tw=wof(bt,f)
d.rounded_rectangle([W//2-tw//2-26,232,W//2+tw//2+26,290],29,fill=(0,100,255,40),outline=(120,160,255),width=2)
d.text((W//2-tw//2,244),bt,font=f,fill=(180,205,255))
# headline
cl(360,"소재만 고르면,",NB,86,(255,255,255))
cl(464,"내 말투로 대본까지",NB,86,(255,255,255))
cl(600,"지금 팔리는 소재를 찾아, 당신 말투 그대로.",GM,36,(180,186,200))
# 대본 screenshot frame
shot=Image.open("s_script.jpg").convert("RGB").crop((646,0,1412,352))
sw=880; sh=int(shot.height*sw/shot.width); shot=shot.resize((sw,sh))
# rounded
m=Image.new("L",(sw,sh),0); ImageDraw.Draw(m).rounded_rectangle([0,0,sw,sh],22,fill=255)
card=Image.new("RGBA",(sw,sh),(0,0,0,0)); card.paste(shot,(0,0)); card.putalpha(m)
im.alpha_composite(card,(W//2-sw//2,720))
# CTA hint
cl(720+sh+70,"무료로 시작  ·  chronit.kr",GM,40,(255,255,255))
im.convert("RGB").save(os.path.join(ROOT,"_vera광고.jpg"),quality=92); print("saved _vera광고.jpg")
