# -*- coding: utf-8 -*-
"""크로닛 플래그십 스와이프 캐러셀 테마 라이브러리. run_weekly가 주차별로 로테이션.
각 테마는 저장·공유 가치가 분명한 '바로 써먹는' 내용만. 양보다 질."""

HOOKS = {
 "id": "hooks7",
 "eyebrow": "쇼핑 릴스 훅 공식",
 "panel_label": "바로 쓰는 훅 템플릿",
 "cover": {"tag": "· 쇼핑 릴스 훅", "lines": ["스크롤 멈추게 하는", "쇼핑 릴스 훅"],
           "hl": "터지는 공식 7", "sub": "바로 복붙하는 템플릿까지 · 이 글 저장해두세요",
           "q": "person filming video smartphone tripod studio", "dark": 0.52},
 "cards": [
  {"no":"01","name":"반전 공개","why":"기대를 뒤집으면 \"어?\" 하고 끝까지 본다","tpl":"\"이게 [흔한 곳/저가]에 있다고?\"","ex":"이게 다이소에서 파는 거라고?","q":"surprised excited woman shopping bags"},
  {"no":"02","name":"손해 경고","why":"이득보다 손실 회피가 사람을 더 세게 당긴다","tpl":"\"[상황] 전에 이거 모르면 손해\"","ex":"겨울 오기 전에 이거 모르면 난방비 날림","q":"cozy warm winter home interior blanket"},
  {"no":"03","name":"고수 차용","why":"권위에 기대면 신뢰와 호기심이 동시에 걸린다","tpl":"\"[고수/전문가]만 아는 [카테고리] 템\"","ex":"여행 고수들이 다이소에서 쟁이는 것","q":"confident professional woman portrait"},
  {"no":"04","name":"숫자 구체화","why":"모호한 말보다 구체적인 숫자가 믿음을 준다","tpl":"\"[가격·기간]으로 [변화] 만든 [상품]\"","ex":"만원으로 방 분위기 바꾼 템 5개","q":"minimal modern cozy room interior"},
  {"no":"05","name":"가격 대비 충격","why":"비싼 것과 나란히 두면 가치가 더 커 보인다","tpl":"\"[고가 브랜드] 살 바엔 이거\"","ex":"다이슨 살 바엔 이 3만원짜리","q":"shopping cart budget money saving"},
  {"no":"06","name":"타깃 호명","why":"\"내 얘기네\" 싶은 순간 스크롤을 멈춘다","tpl":"\"[특정 대상] 이건 꼭 보세요\"","ex":"자취 1년차면 무조건 이거","q":"young woman small apartment home"},
  {"no":"07","name":"결과 먼저","why":"완성 장면을 먼저 보여주면 과정이 궁금해진다","tpl":"[결과 비주얼] → \"어떻게 했냐면\"","ex":"지저분한 방 → 깔끔, 3만원으로 이렇게 됨","q":"clean organized tidy minimal room"},
 ],
 "cta": {"lines": ["훅은 잡았는데", "대본이 막막하다면?"],
         "sub": ["크로닛이 매일 터지는 쇼핑 소재를 찾아주고,", "내 말투 그대로 대본까지 뽑아줍니다."],
         "end": "어떤 훅이 제일 끌려요? 댓글로 알려주세요",
         "q": "content creator editing video laptop phone desk", "dark": 0.6},
 "caption": (
  "쇼핑 릴스, 조회수가 안 나오면 십중팔구 '훅'에서 막힌 거예요.\n\n"
  "내용은 좋은데 0~3초 안에 스크롤을 못 잡으면, 뒤가 아무리 좋아도 안 봐요.\n\n"
  "그래서 실제로 터지는 쇼핑 릴스에서 반복되는 훅 공식 7개를 바로 복붙하는 템플릿으로 정리했어요.\n\n"
  "① 반전 공개 — \"이게 [흔한 곳]에 있다고?\"\n②  손해 경고 — \"[상황] 전에 이거 모르면 손해\"\n"
  "③ 고수 차용 — \"[고수]만 아는 템\"\n④ 숫자 구체화 — \"[가격]으로 [변화] 만든 상품\"\n"
  "⑤ 가격 대비 충격 — \"[고가 브랜드] 살 바엔 이거\"\n⑥ 타깃 호명 — \"[특정 대상] 꼭 보세요\"\n⑦ 결과 먼저 — 완성 장면부터 보여주기\n\n"
  "[ ] 안에 내 상품만 넣으면 바로 훅이 돼요. 저장해두고 다음 영상 찍을 때 꺼내 쓰세요 📌\n\n"
  "어떤 훅이 제일 끌렸어요? 댓글로 알려주세요 💬\n\n"
  "👉 터지는 쇼핑 소재랑 내 말투 대본까지 받기: chronit.kr"
 ),
}

MISTAKES = {
 "id": "mistakes6",
 "eyebrow": "안 팔리는 쇼핑 릴스",
 "panel_label": "이렇게 고치세요",
 "cover": {"tag": "· 쇼핑 릴스 진단", "lines": ["조회수는 나오는데", "왜 안 팔릴까?"],
           "hl": "안 팔리는 릴스 6가지", "sub": "하나라도 해당되면 바로 고치세요 · 저장 필수",
           "q": "frustrated person looking at phone dark", "dark": 0.55},
 "cards": [
  {"no":"01","name":"긴 인트로","why_label":"뭐가 문제냐","why":"\"오늘은~\"으로 시작하면 3초 안에 다 넘긴다","tpl":"첫 장면을 결과·질문으로 시작","ex":"\"이거 하나로 끝남\"부터 보여주기","q":"bored person scrolling phone"},
  {"no":"02","name":"설명만 나열","why_label":"뭐가 문제냐","why":"기능 나열은 안 팔린다, 상황이 팔린다","tpl":"\"이럴 때 좋다\"는 사용 장면으로","ex":"아침마다 허둥대는 장면 → 이 템","q":"person using kitchen product morning"},
  {"no":"03","name":"자막 없음","why_label":"뭐가 문제냐","why":"80%는 소리 끄고 본다, 무음이면 이탈","tpl":"큰 자막 필수 · 훅은 화면에도 박기","ex":"첫 장면에 훅 자막 크게","q":"smartphone video captions screen"},
  {"no":"04","name":"CTA 없음","why_label":"뭐가 문제냐","why":"보고 끝나면 구매 전환이 0이다","tpl":"마지막에 \"프로필 링크\" 한 줄","ex":"\"구매는 프로필 링크에서\"","q":"online shopping checkout phone"},
  {"no":"05","name":"어두운 화질","why_label":"뭐가 문제냐","why":"어두우면 싸보여서 구매로 안 이어진다","tpl":"창가 자연광 + 밝게 촬영","ex":"낮에 창 앞에서 찍기","q":"bright natural light window home"},
  {"no":"06","name":"너무 길다","why_label":"뭐가 문제냐","why":"15초 넘어가면 끝까지 안 본다","tpl":"한 영상 = 한 메시지, 7~15초","ex":"포인트 하나만 깔끔하게","q":"stopwatch timer minimal"},
 ],
 "cta": {"lines": ["고칠 건 알았는데", "매번 찍기 막막하다면?"],
         "sub": ["크로닛이 터지는 소재부터 대본·구성까지", "내 말투로 바로 뽑아줍니다."],
         "end": "제일 뜨끔한 실수 번호는? 댓글로 알려주세요",
         "q": "content creator planning desk notes", "dark": 0.6},
 "caption": (
  "쇼핑 릴스 조회수는 나오는데 안 팔린다면, 보통 이 6가지 중 하나예요.\n\n"
  "조회수랑 구매는 다른 문제라, 뷰가 떠도 아래가 새면 매출로 안 이어져요.\n\n"
  "① 긴 인트로 — 결과부터 보여주기\n② 설명만 나열 — 사용 상황으로\n③ 자막 없음 — 무음에서도 읽히게\n"
  "④ CTA 없음 — 마지막에 링크 한 줄\n⑤ 어두운 화질 — 자연광으로 밝게\n⑥ 너무 길다 — 7~15초 한 메시지\n\n"
  "하나라도 걸리면 바로 고쳐보세요. 저장해두고 영상 올리기 전 체크리스트로 쓰세요 📌\n\n"
  "제일 뜨끔한 번호가 몇 번이에요? 댓글로 알려주세요 💬\n\n"
  "👉 터지는 소재랑 내 말투 대본까지 받기: chronit.kr"
 ),
}

STRUCTURE = {
 "id": "structure5",
 "eyebrow": "쇼핑 릴스 구성 템플릿",
 "panel_label": "이 순서대로 찍으세요",
 "cover": {"tag": "· 쇼핑 릴스 구성", "lines": ["뭘 먼저 찍을지", "막막하다면"],
           "hl": "바로 따라하는 구성 5", "sub": "순서만 지켜도 완성도가 올라가요 · 저장 필수",
           "q": "person recording product video phone", "dark": 0.52},
 "cards": [
  {"no":"01","name":"문제-해결형","why_label":"언제 쓰나","why":"불편을 보여주고 상품으로 풀면 설득된다","tpl":"[불편 장면] → [상품] → [해결]","ex":"엉킨 선 → 정리템 → 깔끔해진 책상","q":"messy desk cables organizing"},
  {"no":"02","name":"비포-애프터","why_label":"언제 쓰나","why":"변화가 눈에 보이면 제일 잘 팔린다","tpl":"[before] ↔ [after] 반복해서 대비","ex":"지저분한 방 → 정돈된 방","q":"room before after cleaning tidy"},
  {"no":"03","name":"TOP N형","why_label":"언제 쓰나","why":"리스트는 저장을 부른다","tpl":"\"이번 주 산 것 TOP5\" 빠른 컷","ex":"다이소 털이 5개 빠르게","q":"flat lay products collection"},
  {"no":"04","name":"비교형","why_label":"언제 쓰나","why":"선택을 대신 해주면 신뢰가 쌓인다","tpl":"A vs B 나란히 두고 결론","ex":"1만원 vs 5만원, 뭐가 나을까","q":"two products comparison side by side"},
  {"no":"05","name":"하울·언박싱","why_label":"언제 쓰나","why":"개봉 리액션은 대리만족을 준다","tpl":"[개봉] → [리액션] → [추천]","ex":"쿠팡 겨울 준비 하울","q":"unboxing package opening hands"},
 ],
 "cta": {"lines": ["구성은 잡았는데", "멘트가 안 떠오르면?"],
         "sub": ["크로닛이 소재에 맞는 구성과 대본을", "내 말투 그대로 뽑아줍니다."],
         "end": "어떤 구성 제일 자주 써요? 댓글로 알려주세요",
         "q": "creator editing video timeline laptop", "dark": 0.6},
 "caption": (
  "쇼핑 릴스 찍을 때 '뭘 먼저 찍지?'에서 막히면, 이 5가지 구성 중 하나로 시작해보세요.\n\n"
  "소재가 좋아도 순서가 엉키면 전달이 안 돼서, 구성 템플릿 하나만 있어도 완성도가 확 올라가요.\n\n"
  "① 문제-해결형 — 불편 → 상품 → 해결\n② 비포-애프터 — 변화 대비\n③ TOP N형 — 리스트로 저장 유도\n"
  "④ 비교형 — A vs B 결론\n⑤ 하울·언박싱 — 개봉 리액션\n\n"
  "상품에 맞는 구성 하나 골라서 그대로 찍어보세요. 저장해두고 다음 촬영 전에 꺼내 쓰세요 📌\n\n"
  "어떤 구성 제일 자주 쓰세요? 댓글로 알려주세요 💬\n\n"
  "👉 소재별 구성이랑 내 말투 대본까지 받기: chronit.kr"
 ),
}

THEMES = [HOOKS, MISTAKES, STRUCTURE]
