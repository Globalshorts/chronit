# -*- coding: utf-8 -*-
# L 캐러셀 앵글 2·3·4 — l_story의 헬퍼 재사용
import os, sys
from l_story import (W,H,MX,WHITE,GREY,DIM,NB,GM,LOGO,
                     F,wof,cl,block,scrim,vignette,foot,logo,pick)
from PIL import Image, ImageDraw
import numpy as np

def cta(d_outdir, i, outdir):
    im=Image.new("RGB",(W,H),(9,10,15)).convert("RGBA")
    yy,xx=np.mgrid[0:H,0:W]; dd=np.sqrt(((xx-W/2)/W)**2+((yy-H*0.42)/H)**2); g=np.clip(1-dd/0.5,0,1)**2*26
    a=np.array(im.convert("RGB")).astype(np.float32); a+=g[:,:,None]*np.array([0.7,0.9,1.4])
    im=Image.fromarray(np.clip(a,0,255).astype(np.uint8)).convert("RGBA"); d=ImageDraw.Draw(im)
    logo(im,190,430); block(d,660,["크로닛"],NB,120,WHITE,150); block(d,850,["chronit.kr","@chronit.kr"],GM,40,GREY,58)
    foot(d,i,7); im.convert("RGB").save(os.path.join(outdir,f"L{i}.png"))

def content(s, i, outdir):
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
    foot(d,i,7); im.convert("RGB").save(os.path.join(outdir,f"L{i}.png"))

ANGLES={
2:[  # 피벗 이야기
 dict(cover=True,q="moody dark desk video camera night",alt="dark cinema camera",kick="크로닛, 방향을 바꾼 이야기",head=["처음엔","영상을 만들어드렸어요"],sub=["근데, 그게 답이 아니었죠"]),
 dict(q="person thinking window dark rain",alt="pensive dark room",kick="만들면서 알게 됐어요",head=["진짜 어려운 건","촬영이 아니었어요"],sub=["뭐라고 말할지 —","늘 거기서 막혔죠"]),
 dict(q="notebook writing plan desk dark",alt="handwriting low light",kick="그래서 방향을 바꿨어요",head=["영상 제작에서","기획과 대본으로"],sub=["가장 오래 붙잡는 곳으로"]),
 dict(q="laptop screen glow dark night desk",alt="computer glow dark",kick="지금의 크로닛",head=["지금 팔리는 소재를 찾아","내 말투로 대본까지"],sub=["찍는 건, 당신이 제일 잘하니까"]),
 dict(q="minimal clean dark desk calm",alt="simple dark workspace",kick="그래서 덜어냈어요",head=["화려한 기능은","다 걷어냈습니다"],sub=["소재와 대본, 이 하나에 집중"]),
 dict(q="sunrise window calm morning warm",alt="soft morning light",kick="크로닛의 약속",head=["더 오래 붙잡던 시간을,","다시 당신에게"],sub=[]),
],
3:[  # 만든 사람의 몰입
 dict(cover=True,q="developer alone night desk dark",alt="person laptop night dark",kick="크로닛, 만든 사람 이야기",head=["혼자,","만들었습니다"],sub=["1인 개발자의 기록"]),
 dict(q="late night desk lamp working alone",alt="night lamp work",kick="만드는 동안",head=["4개월간","하루 4시간만 잤어요"],sub=["이 하나에만 몰두하려고"]),
 dict(q="dark warehouse boxes shipping moody",alt="cardboard boxes dim",kick="왜 그렇게까지",head=["파는 것도, 알리는 것도","바닥부터 겪었으니까"],sub=["뭐가 병목인지, 몸으로 알아요"]),
 dict(q="person thinking dark window mood",alt="pensive dark",kick="그 답",head=["멈추게 하는 건 촬영이 아니라","'무엇을 말하는가'"],sub=["거기에 전부를 걸었어요"]),
 dict(q="laptop screen glow dark night",alt="computer glow dark",kick="그게 크로닛",head=["지금 팔리는 소재를 찾아","내 말투로 대본까지"],sub=[]),
 dict(q="calm dark minimal desk focus",alt="minimal dark",kick="약속",head=["당신의 시간을 아끼는 일에,","계속 매달릴게요"],sub=[]),
],
4:[  # 크로닛의 믿음·미션
 dict(cover=True,q="quiet dark room window rain moody",alt="dark calm interior night",kick="크로닛이 믿는 것",head=["콘텐츠의 시작은","'무엇을 말하는가'"],sub=["도구가 아니라, 메시지"]),
 dict(q="person thinking camera dark room",alt="pensive dark window",kick="현실",head=["가장 오래 붙잡는 시간은","촬영이 아니에요"],sub=["뭘 찍을지, 뭐라 말할지 정하는 시간"]),
 dict(q="trending data screen glow dark",alt="laptop glow dark",kick="그래서 크로닛은",head=["지금 팔리는 소재를","실시간으로 찾아줘요"],sub=["감으로 고르지 않게"]),
 dict(q="writing notebook pen desk dark",alt="handwriting dark",kick="그리고",head=["그 소재를","내 말투 대본으로"],sub=["고칠수록 더 나답게"]),
 dict(q="minimal dark desk calm focus",alt="simple dark",kick="편집 툴이 아닙니다",head=["기획과 대본,","그 시간을 지웁니다"],sub=["찍고 올리는 건 당신 몫"]),
 dict(q="sunrise calm window morning warm",alt="morning light soft",kick="우리의 미션",head=["콘텐츠에 쓰는 시간을,","다시 당신에게"],sub=[]),
],
}

def build(angle):
    outdir=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),f"_L캐러셀_a{angle}")
    os.makedirs(outdir,exist_ok=True)
    slides=ANGLES[angle]
    for idx,s in enumerate(slides,1):
        content(s,idx,outdir); print(f"a{angle} L{idx}")
    cta(None,len(slides)+1,outdir); print(f"a{angle} L{len(slides)+1} cta")
    return outdir

if __name__=="__main__":
    for a in [2,3,4]:
        print("DIR="+build(a))
