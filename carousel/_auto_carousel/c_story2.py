# -*- coding: utf-8 -*-
# 크로닛 C(신뢰=투명성+전문성) 캐러셀 — 실제 앱 화면(잘림 수정본) + 다크 + 가운데 텍스트
import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np
HERE=os.path.dirname(os.path.abspath(__file__)); AS=os.path.join(HERE,"assets"); ROOT=os.path.dirname(HERE)
NB=os.path.join(AS,"NotoSansKR-Bold.ttf"); GM=os.path.join(AS,"GmarketSansMedium.otf")
LOGO=os.path.join(ROOT,"logo","chronit-mark-white.png")
W,H=1080,1350; MX=90; BG=(8,9,12)
WHITE=(255,255,255); GREY=(178,184,198); DIM=(140,146,160)
def F(fp,s): return ImageFont.truetype(fp,s)
def wof(d,t,f): b=d.textbbox((0,0),t,font=f); return b[2]-b[0]
def cl(d,y,t,fp,s,c): f=F(fp,s); d.text(((W-wof(d,t,f))/2,y),t,font=f,fill=c)
def block(d,y0,lines,fp,s,c,lh):
    y=y0
    for t in lines: cl(d,y,t,fp,s,c); y+=lh
    return y
def foot(d,i,n):
    f=F(GM,26); d.text((MX,H-84),"@chronit.kr",font=f,fill=DIM)
    t=f"{i:02d} / {n:02d}"; d.text((W-MX-wof(d,t,f),H-84),t,font=f,fill=DIM)
def logo(im,width,y):
    lg=Image.open(LOGO).convert("RGBA"); h=int(lg.height*width/lg.width); lg=lg.resize((width,h))
    im.alpha_composite(lg,(W//2-width//2,y))
def rounded(img,rad):
    m=Image.new("L",img.size,0); ImageDraw.Draw(m).rounded_rectangle([0,0,*img.size],rad,fill=255)
    out=Image.new("RGBA",img.size,(0,0,0,0)); out.paste(img,(0,0)); out.putalpha(m); return out
def shot(path,crop,max_w=900,max_h=560):
    im=Image.open(path).convert("RGB").crop(crop)
    r=min(max_w/im.width,max_h/im.height); im=im.resize((int(im.width*r),int(im.height*r)))
    return rounded(im.convert("RGBA"),20)
def glow(im,cx=0.5,cy=0.42,amt=24):
    yy,xx=np.mgrid[0:H,0:W]; dd=np.sqrt(((xx-W*cx)/W)**2+((yy-H*cy)/H)**2)
    g=np.clip(1-dd/0.55,0,1)**2*amt
    a=np.array(im.convert("RGB")).astype(np.float32); a+=g[:,:,None]*np.array([0.6,0.8,1.4])
    return Image.fromarray(np.clip(a,0,255).astype(np.uint8)).convert("RGBA")

# (crop) 각 스크린샷에서 패널만 타이트하게
CROPS=dict(
  trend=(285,158,1248,760),   # 3개 프리뷰 카드
  diag=(656,126,1464,548),    # 소재 분석 점수+훅+셀링포인트
  senti=(656,150,1464,378),   # 구성/타깃 + 감정 도넛
  script=(646,0,1412,352),    # 대본 + 내 말투 배우기
)

def content(i,n,shot_path,crop,badge,head,sub,max_h,top):
    im=Image.new("RGB",(W,H),BG).convert("RGBA"); d=ImageDraw.Draw(im)
    card=shot(shot_path,crop,max_h=max_h); im.alpha_composite(card,((W-card.width)//2,top))
    cy=top+card.height+52
    d.rounded_rectangle([MX,cy,MX+62,cy+62],15,fill=(38,42,52)); d.text((MX+21,cy+7),str(badge),font=F(NB,42),fill=WHITE)
    endy=block(d,cy+88,head,NB,68,WHITE,86)
    if sub: block(d,endy+34,sub,GM,36,GREY,52)
    foot(d,i,n); return im

def build(outdir):
    os.makedirs(outdir,exist_ok=True); n=6
    def sv(im,i): im.convert("RGB").save(os.path.join(outdir,f"C{i}.png")); print("C%d"%i)
    # 1 cover
    im=glow(Image.new("RGB",(W,H),BG).convert("RGBA")); d=ImageDraw.Draw(im); logo(im,150,296)
    cl(d,556,"진짜 되냐고요?",GM,40,GREY)
    block(d,648,["말로 하지 않고","화면으로 보여드립니다"],NB,88,WHITE,112)
    cl(d,898,"크로닛이 실제로 작동하는 방식",GM,38,GREY); foot(d,1,n); sv(im,1)
    # 2 트렌드 수집
    sv(content(2,n,"s_trend.jpg",CROPS["trend"],1,
        ["지금 터지는 소재를","실시간으로 모아요"],
        ["조회수·댓글로 거르고, 아직 덜 퍼진","'선점' 소재까지 한눈에"],560,150),2)
    # 3 소재 진단
    sv(content(3,n,"s_diag.jpg",CROPS["diag"],2,
        ["터진 이유를","숫자로 진단해요"],
        ["훅·구성·타깃을 점수로 분석해","뭘 따라 하면 될지 콕 집어줘요"],470,175),3)
    # 4 감정 분석
    sv(content(4,n,"s_senti.jpg",CROPS["senti"],3,
        ["댓글 반응까지","뜯어봐요"],
        ["구매의도·긍정·질문·불만 비율로","사람들이 왜 반응했는지 보여줘요"],300,210),4)
    # 5 대본
    sv(content(5,n,"s_script.jpg",CROPS["script"],4,
        ["그대로","내 말투 대본으로"],
        ["소재만 고르면 베라가 초안을 써요.","고칠수록 내 말투를 배우고요"],430,190),5)
    # 6 CTA
    im=glow(Image.new("RGB",(W,H),(9,10,15)).convert("RGBA"),cy=0.42,amt=26); d=ImageDraw.Draw(im)
    logo(im,190,430); block(d,660,["크로닛"],NB,120,WHITE,150); block(d,850,["chronit.kr","@chronit.kr"],GM,40,GREY,58)
    foot(d,6,n); sv(im,6)

if __name__=="__main__":
    out=os.path.join(ROOT,"_C샘플_2026-09-26"); build(out); print("DIR="+out)
