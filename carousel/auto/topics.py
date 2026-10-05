# -*- coding: utf-8 -*-
"""크로닛 캐러셀 주제 뱅크 — 쇼핑 2차창작 크리에이터 대상 '도움글'.
핵심 통증 = '무슨 소재 쓰지?'(뭐 찍지 아님). 광고가 아니라 저장해두고 쓰는 인사이트.
각 주제: id(소스키·중복방지용) / title(내부) / caption(IG) / slides(선언형 스펙).
슬라이드 타입은 render_lib.py 참고. auto_gen.py 가 LRU로 돌려가며 뽑아 큐에 적재한다."""

FOLLOW = ("쇼핑 릴스 인사이트, 매주 올라와요.\n"
          "저장해두고 다음 영상 기획할 때 꺼내 보세요 📌\n\n"
          "👉 더 받아보려면 @chronit.kr 팔로우")

TOPICS = [
    # 1. 댓글 신호 읽기 ------------------------------------------------------
    {"id": "comments-signal", "title": "댓글로 살 사람 구분하기",
     "caption": ("조회수가 높아도 안 팔리는 영상, 댓글을 보면 이유가 보여요.\n\n"
                 "'살 사람'이 다는 댓글과 그냥 지나가는 댓글은 신호가 달라요. "
                 "구매로 이어지는 소재인지 댓글로 먼저 걸러내는 법을 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "woman filming product smartphone ring light",
         "lines": ["조회수는 높은데", "왜 안 팔릴까,"], "hl": "댓글을 보세요"},
        {"t": "statement", "q": "person scrolling smartphone comments",
         "eyebrow": "먼저 알아둘 것", "lines": ["조회수는 '관심',", "댓글은 '구매의도'."],
         "hl": "댓글의 '결'을 보세요", "body": ["같은 1만 뷰라도 댓글 종류가", "팔리는 소재인지 가른다."]},
        {"t": "crit", "q": "smartphone social media comments notification", "num": "01",
         "prefix": "댓글 신호 읽기", "tag": "구매 신호",
         "head_plain": "'어디서 사요'", "head_hl": "이게 최고 신호", "body": ["'정보 주세요' '링크요'가 많으면", "지금 바로 사고 싶다는 뜻."]},
        {"t": "crit", "q": "woman thinking question mark", "num": "02",
         "prefix": "댓글 신호 읽기", "tag": "약한 신호",
         "head_plain": "'예쁘다' '대박'은", "head_hl": "구매와 거리가 멀어요", "body": ["감탄 댓글만 많으면 눈요기.", "저장·공유가 같이 와야 진짜예요."]},
        {"t": "crit", "q": "people tagging friends phone", "num": "03",
         "prefix": "댓글 신호 읽기", "tag": "소환",
         "head_plain": "친구 태그가", "head_hl": "달리면 좋은 소재", "body": ["'@친구 이거 봐'는 수요가 넓다는", "증거 — 비슷한 소재를 더 파세요."]},
        {"t": "crit", "q": "customer service chat reply phone", "num": "04",
         "prefix": "댓글 신호 읽기", "tag": "답글",
         "head_plain": "질문엔", "head_hl": "빠르게 답글", "body": ["'어디서 사요'에 바로 답하면", "그 댓글이 다음 사람까지 설득해요."]},
        {"t": "close"},
     ]},

    # 2. 저장 터지는 공통점 --------------------------------------------------
    {"id": "save-explosion", "title": "저장 터지는 영상의 공통점",
     "caption": ("'좋아요'보다 '저장'이 많은 영상이 오래 가요.\n\n"
                 "저장은 '나중에 또 볼게'라는 신호라, 알고리즘도 더 밀어줘요. "
                 "저장이 터지는 쇼핑 영상들의 공통점을 모았어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "person saving bookmark phone cozy",
         "lines": ["좋아요 말고", "'저장'이 많은"], "hl": "영상의 공통점"},
        {"t": "statement", "q": "woman watching phone relaxed home",
         "eyebrow": "왜 저장이 중요할까", "lines": ["저장은 '나중에", "또 볼게'예요."],
         "hl": "알고리즘이 더 밀어줘요", "body": ["좋아요는 순간, 저장은 재방문.", "오래 가는 소재의 핵심이에요."]},
        {"t": "crit", "q": "checklist notebook tips", "num": "01",
         "prefix": "저장 부르는 요소", "tag": "정보 밀도",
         "head_plain": "한 영상에", "head_hl": "'쓸 정보'가 있다", "body": ["꿀팁·리스트·비교처럼", "다시 볼 이유가 있어야 저장해요."]},
        {"t": "crit", "q": "numbered list steps paper", "num": "02",
         "prefix": "저장 부르는 요소", "tag": "리스트",
         "head_plain": "'3가지' '5개'", "head_hl": "묶음이 강해요", "body": ["한 번에 다 못 외우니까", "저장해두고 꺼내 보게 됩니다."]},
        {"t": "crit", "q": "before after comparison split", "num": "03",
         "prefix": "저장 부르는 요소", "tag": "전/후",
         "head_plain": "전·후 비교는", "head_hl": "증거라 저장돼요", "body": ["말보다 결과를 보여주면", "'나도 해봐야지'로 남겨둬요."]},
        {"t": "crit", "q": "person pointing text screen", "num": "04",
         "prefix": "저장 부르는 요소", "tag": "저장 유도",
         "head_plain": "'저장해두세요'", "head_hl": "한 줄의 힘", "body": ["마지막에 저장을 콕 집어주면", "실제 저장률이 눈에 띄게 올라요."]},
        {"t": "close"},
     ]},

    # 3. 참고영상 → 내 상품 3단계 --------------------------------------------
    {"id": "ref-to-mine", "title": "참고 영상을 내 상품으로",
     "caption": ("터진 영상 똑같이 따라 하면 티 나고 안 터져요.\n\n"
                 "'구조'만 빌리고 내 상품으로 갈아끼우는 3단계예요. "
                 "참고 영상을 베끼지 않고 내 걸로 만드는 법.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "person watching video phone taking notes",
         "lines": ["따라 하면 티 나고", "안 터지는 이유,"], "hl": "구조만 빌리세요"},
        {"t": "statement", "q": "copy paste duplicate concept",
         "eyebrow": "흔한 실수", "lines": ["장면을 베끼면", "'짝퉁'이 돼요."],
         "hl": "뼈대만 가져오세요", "body": ["영상이 터진 건 '구조' 때문.", "그 구조에 내 상품을 얹으면 돼요."]},
        {"t": "crit", "q": "magnifying glass analysis video", "num": "01",
         "prefix": "내 걸로 바꾸는 3단계", "tag": "분해",
         "head_plain": "먼저 '왜 멈췄나'", "head_hl": "훅만 뜯어보기", "body": ["첫 3초에 뭘로 잡았는지,", "그 '이유'만 메모하세요."]},
        {"t": "crit", "q": "swapping objects hands", "num": "02",
         "prefix": "내 걸로 바꾸는 3단계", "tag": "치환",
         "head_plain": "그 훅에", "head_hl": "내 상품 끼우기", "body": ["'이거 모르고 썼죠?'의 '이거'를", "내가 파는 상품으로 바꿔요."]},
        {"t": "crit", "q": "person filming own product home", "num": "03",
         "prefix": "내 걸로 바꾸는 3단계", "tag": "내 말투",
         "head_plain": "대사는", "head_hl": "내 말투로 다시", "body": ["원본 대사 그대로면 어색해요.", "내가 평소 쓰는 말로 바꿔야 자연스러워요."]},
        {"t": "close"},
     ]},

    # 4. 조회수 터졌는데 안 팔림 (vs) ----------------------------------------
    {"id": "views-no-sale", "title": "조회수 터졌는데 안 팔리는 함정",
     "caption": ("조회수가 터져도 매출이 0인 영상, 분명 이유가 있어요.\n\n"
                 "'보는 사람'과 '사는 사람'은 다르거든요. 조회수 함정에 빠지는 지점과 "
                 "구매로 돌리는 법을 ❌✅로 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "viral video phone many views",
         "lines": ["조회수는 터졌는데", "매출은 0,"], "hl": "뭐가 문제일까"},
        {"t": "vs", "q": "wrong target audience crowd", "num": "01",
         "prefix": "조회수 함정 vs 매출", "title": "타깃",
         "bad": ["아무나 재밌어하는 '밈'형 소재"], "good": ["'살 사람'이 반응하는 상품형 소재"]},
        {"t": "vs", "q": "product link shopping phone", "num": "02",
         "prefix": "조회수 함정 vs 매출", "title": "구매 동선",
         "bad": ["살 방법을 영상에서 안 알려줌"], "good": ["'프로필 링크'로 바로 연결해줌"]},
        {"t": "vs", "q": "person confused decision", "num": "03",
         "prefix": "조회수 함정 vs 매출", "title": "살 이유",
         "bad": ["예쁘다로 끝 — 왜 사야 하는지 없음"], "good": ["'이 문제 해결'이라는 이유를 줌"]},
        {"t": "vs", "q": "clock urgency time", "num": "04",
         "prefix": "조회수 함정 vs 매출", "title": "행동",
         "bad": ["'다음에 사야지'로 미루게 둠"], "good": ["지금 움직일 이유(한정·혜택)를 줌"]},
        {"t": "close"},
     ]},

    # 5. 첫 3초 훅 -----------------------------------------------------------
    {"id": "hook-3sec", "title": "첫 3초 스크롤 멈추는 훅",
     "caption": ("조회수의 90%는 첫 3초에서 갈려요.\n\n"
                 "스크롤을 멈추게 하는 훅에는 패턴이 있어요. 쇼핑 릴스에 바로 쓰는 "
                 "훅 유형을 모았어요. 다음 영상 기획할 때 꺼내 쓰세요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "finger scrolling phone fast",
         "lines": ["조회수의 90%는", "첫 3초에서"], "hl": "갈립니다"},
        {"t": "statement", "q": "stopwatch three seconds",
         "eyebrow": "왜 3초인가", "lines": ["3초 안에 '왜 봐야", "하는지' 못 주면"],
         "hl": "바로 넘겨버려요", "body": ["제품 소개부터 시작하면 늦어요.", "궁금증·공감이 먼저 와야 해요."]},
        {"t": "crit", "q": "surprised shocked face reaction", "num": "01",
         "prefix": "바로 쓰는 훅", "tag": "반전",
         "head_plain": "'이거 모르고'", "head_hl": "쓰고 있었죠?", "body": ["당연하게 쓰던 걸 뒤집어주면", "'어? 내 얘긴데' 하고 멈춰요."]},
        {"t": "crit", "q": "mistake warning red", "num": "02",
         "prefix": "바로 쓰는 훅", "tag": "경고",
         "head_plain": "'이렇게 하면'", "head_hl": "돈 날려요", "body": ["손해 신호는 강력해요.", "실수를 먼저 짚어주면 끝까지 봐요."]},
        {"t": "crit", "q": "question mark curiosity", "num": "03",
         "prefix": "바로 쓰는 훅", "tag": "질문",
         "head_plain": "'왜 ○○는", "head_hl": "다 이걸 쓸까?'", "body": ["답이 궁금해서 멈추게 돼요.", "질문은 끝까지 보게 하는 미끼예요."]},
        {"t": "crit", "q": "before after transformation", "num": "04",
         "prefix": "바로 쓰는 훅", "tag": "결과 먼저",
         "head_plain": "결과부터", "head_hl": "보여주기", "body": ["'이렇게 됐어요'를 첫 장면에.", "과정은 궁금하면 알아서 봐요."]},
        {"t": "close"},
     ]},

    # 6. 소재 찾는 시간 줄이기 -----------------------------------------------
    {"id": "find-fast", "title": "소재 찾는 시간 줄이기",
     "caption": ("매번 '오늘 뭐 올리지' 하며 30분씩 날리고 있다면.\n\n"
                 "소재 찾기를 루틴으로 만들면 시간이 확 줄어요. 헤매지 않고 "
                 "'될 소재'만 빠르게 추리는 법을 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "overwhelmed person laptop clock",
         "lines": ["'오늘 뭐 올리지'", "로 30분씩"], "hl": "날리고 있다면"},
        {"t": "statement", "q": "messy desk scattered notes",
         "eyebrow": "왜 오래 걸릴까", "lines": ["기준 없이 피드를", "뒤지니까"], "hl": "'기준'부터 정하세요",
         "body": ["아무거나 보면 끝이 없어요.", "거를 기준이 있으면 5분이면 돼요."]},
        {"t": "crit", "q": "folder organized files", "num": "01",
         "prefix": "소재 찾기 루틴", "tag": "소스 고정",
         "head_plain": "볼 곳을", "head_hl": "3군데로 고정", "body": ["매번 새로 뒤지지 말고", "믿을 소스 3개만 정해두세요."]},
        {"t": "crit", "q": "trending chart growth", "num": "02",
         "prefix": "소재 찾기 루틴", "tag": "급상승",
         "head_plain": "'오래된 인기'보다", "head_hl": "'막 뜨는 것'", "body": ["이미 다 아는 소재는 늦었어요.", "최근 2~3일 급상승을 먼저 봐요."]},
        {"t": "crit", "q": "bookmark collection save", "num": "03",
         "prefix": "소재 찾기 루틴", "tag": "적립",
         "head_plain": "볼 때마다", "head_hl": "'소재 창고'에", "body": ["쓸 만한 건 즉시 저장해두면", "다음엔 창고에서 바로 꺼내요."]},
        {"t": "crit", "q": "calendar schedule planning", "num": "04",
         "prefix": "소재 찾기 루틴", "tag": "요일 고정",
         "head_plain": "찾는 날을", "head_hl": "따로 정하기", "body": ["매일 찾지 말고 주 1~2회 몰아서.", "그 날 한 주치를 쌓아두세요."]},
        {"t": "close"},
     ]},

    # 7. 캡션 (vs) -----------------------------------------------------------
    {"id": "caption-buy", "title": "어디서 사요 부르는 캡션",
     "caption": ("같은 영상도 캡션 한 줄에 반응이 갈려요.\n\n"
                 "해시태그만 잔뜩인 캡션은 아무 일도 안 해요. '어디서 사요'를 부르는 "
                 "캡션 쓰는 법을 ❌✅로 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "typing caption smartphone",
         "lines": ["영상은 같은데", "캡션 한 줄에"], "hl": "반응이 갈려요"},
        {"t": "vs", "q": "hashtag symbols many", "num": "01",
         "prefix": "안 되는 vs 되는 캡션", "title": "첫 줄",
         "bad": ["#데일리 #추천 해시태그만 나열"], "good": ["궁금증 한 줄로 시작 — '이거 아세요?'"]},
        {"t": "vs", "q": "long paragraph text", "num": "02",
         "prefix": "안 되는 vs 되는 캡션", "title": "길이",
         "bad": ["설명서처럼 긴 줄글"], "good": ["짧게 끊어 한눈에 읽히게"]},
        {"t": "vs", "q": "call to action button phone", "num": "03",
         "prefix": "안 되는 vs 되는 캡션", "title": "행동",
         "bad": ["살 방법을 안 적어둠"], "good": ["'프로필 링크에' 다음 행동을 콕"]},
        {"t": "vs", "q": "comment conversation chat", "num": "04",
         "prefix": "안 되는 vs 되는 캡션", "title": "댓글 유도",
         "bad": ["'좋아요 눌러주세요' (반응 약함)"], "good": ["답하기 쉬운 질문 하나로 댓글 유도"]},
        {"t": "close"},
     ]},

    # 8. 선점 타이밍 ---------------------------------------------------------
    {"id": "trend-timing", "title": "뜨는 소재 선점 타이밍",
     "caption": ("남들 다 만든 소재는 이미 늦은 거예요.\n\n"
                 "같은 소재도 '언제' 올리느냐가 반응을 가릅니다. 포화되기 전에 "
                 "선점하는 타이밍 잡는 법을 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "runner starting line race",
         "lines": ["남들 다 만든 소재는", "이미"], "hl": "늦은 거예요"},
        {"t": "statement", "q": "wave rising ocean",
         "eyebrow": "타이밍이 전부", "lines": ["소재엔 '파도'가", "있어요."], "hl": "올라오는 초입을 타세요",
         "body": ["정점에 올리면 묻혀요.", "막 오르기 시작할 때가 기회예요."]},
        {"t": "crit", "q": "chart trend rising arrow", "num": "01",
         "prefix": "선점 타이밍", "tag": "급상승",
         "head_plain": "2~3일 전", "head_hl": "급상승을 보기", "body": ["이미 1위인 건 다 만들어요.", "막 오르는 걸 잡아야 선점이에요."]},
        {"t": "crit", "q": "crowded market many people", "num": "02",
         "prefix": "선점 타이밍", "tag": "포화 체크",
         "head_plain": "같은 소재가", "head_hl": "쏟아지면 패스", "body": ["피드에 벌써 많이 보이면 늦었어요.", "그땐 각도를 비틀거나 넘어가세요."]},
        {"t": "crit", "q": "fast speed motion blur", "num": "03",
         "prefix": "선점 타이밍", "tag": "속도",
         "head_plain": "잡았으면", "head_hl": "24시간 안에", "body": ["기획 길게 끌면 파도가 지나가요.", "가볍게 빨리 올리는 게 이겨요."]},
        {"t": "crit", "q": "repeat cycle arrows", "num": "04",
         "prefix": "선점 타이밍", "tag": "재활용",
         "head_plain": "지난 파도는", "head_hl": "계절 돌면 다시", "body": ["한 번 뜬 소재는 주기로 돌아와요.", "기록해두고 다음 파도에 또 쓰세요."]},
        {"t": "close"},
     ]},

    # 9. 상품 하나로 영상 여러 개 -------------------------------------------
    {"id": "reuse-one", "title": "상품 하나로 영상 5개",
     "caption": ("상품은 하나인데 뭘 더 찍지? 싶을 때.\n\n"
                 "같은 상품도 '각도'를 바꾸면 영상 5개가 나와요. 소재 고갈 없이 "
                 "한 상품을 우려먹는 법을 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "single product multiple angles studio",
         "lines": ["상품은 하나인데", "뭘 더"], "hl": "찍지 싶을 때"},
        {"t": "statement", "q": "one object different views",
         "eyebrow": "발상의 전환", "lines": ["상품이 적은 게", "문제가 아니에요."], "hl": "'각도'가 부족한 거예요",
         "body": ["하나를 다섯 관점으로 쪼개면", "소재 고갈이 사라져요."]},
        {"t": "crit", "q": "problem solution lightbulb", "num": "01",
         "prefix": "한 상품 5가지 각도", "tag": "문제",
         "head_plain": "①", "head_hl": "어떤 불편을 푸나", "body": ["이 상품이 해결하는 문제 하나를", "통째로 한 영상으로."]},
        {"t": "crit", "q": "hands using product demo", "num": "02",
         "prefix": "한 상품 5가지 각도", "tag": "사용법",
         "head_plain": "②", "head_hl": "실제 쓰는 장면", "body": ["설명 말고 쓰는 모습만.", "'아 저렇게 쓰는구나'가 설득돼요."]},
        {"t": "crit", "q": "before after comparison result", "num": "03",
         "prefix": "한 상품 5가지 각도", "tag": "전후",
         "head_plain": "③", "head_hl": "쓰기 전 vs 후", "body": ["결과를 나란히 보여주면", "말보다 강한 증거가 돼요."]},
        {"t": "crit", "q": "mistake wrong way warning", "num": "04",
         "prefix": "한 상품 5가지 각도", "tag": "실수",
         "head_plain": "④", "head_hl": "흔한 오해 짚기", "body": ["'이렇게 쓰면 손해'를 짚으면", "전문성이 생기고 저장돼요."]},
        {"t": "crit", "q": "comparison versus two products", "num": "05",
         "prefix": "한 상품 5가지 각도", "tag": "비교",
         "head_plain": "⑤", "head_hl": "다른 것과 비교", "body": ["비슷한 것과 나란히 두면", "'왜 이걸 사야 하는지'가 보여요."]},
        {"t": "close"},
     ]},

    # 10. 포화 소재 거르기 (vs) ----------------------------------------------
    {"id": "oversaturated", "title": "이미 늦은 소재 거르기",
     "caption": ("열심히 만들었는데 묻히는 소재, 대부분 '이미 늦은' 거예요.\n\n"
                 "만들기 전에 늦은 소재인지 1분 만에 거르는 기준을 ❌✅로 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "tired creator editing late night",
         "lines": ["열심히 만들었는데", "묻히는 소재,"], "hl": "거르는 법"},
        {"t": "vs", "q": "feed many similar posts", "num": "01",
         "prefix": "늦은 소재 vs 될 소재", "title": "노출 빈도",
         "bad": ["내 피드에 이미 수십 개 보임"], "good": ["아직 몇 개뿐 — 올라오는 초입"]},
        {"t": "vs", "q": "old calendar past date", "num": "02",
         "prefix": "늦은 소재 vs 될 소재", "title": "시점",
         "bad": ["2주 넘게 돌아다닌 소재"], "good": ["최근 2~3일 급상승 중인 소재"]},
        {"t": "vs", "q": "same copy identical", "num": "03",
         "prefix": "늦은 소재 vs 될 소재", "title": "각도",
         "bad": ["남들과 똑같은 각도로 또"], "good": ["같은 소재라도 새 각도가 있음"]},
        {"t": "vs", "q": "matching puzzle fit", "num": "04",
         "prefix": "늦은 소재 vs 될 소재", "title": "내 상품",
         "bad": ["터졌지만 내 상품과 무관"], "good": ["내가 파는 것과 바로 연결됨"]},
        {"t": "close"},
     ]},

    # 11. 전/후 비교 ---------------------------------------------------------
    {"id": "before-after", "title": "전후 비교로 구매 끌어내기",
     "caption": ("백 마디 설명보다 '전/후' 한 장면이 더 팔려요.\n\n"
                 "전후 비교는 가장 강한 증거예요. 밋밋하지 않게 전후를 보여주는 "
                 "법을 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "before after split screen comparison",
         "lines": ["백 마디 설명보다", "'전/후' 한 장면이"], "hl": "더 팔려요"},
        {"t": "statement", "q": "evidence proof result",
         "eyebrow": "왜 강할까", "lines": ["전·후는 '증거'라", "믿게 돼요."], "hl": "보여주면 설득돼요",
         "body": ["'좋아요'는 주관, 전후는 사실.", "저장까지 부르는 포맷이에요."]},
        {"t": "crit", "q": "same angle camera tripod", "num": "01",
         "prefix": "전후 잘 보여주기", "tag": "같은 조건",
         "head_plain": "각도·조명을", "head_hl": "똑같이", "body": ["조건이 다르면 '조작' 같아요.", "같은 세팅이어야 믿어요."]},
        {"t": "crit", "q": "split screen side by side", "num": "02",
         "prefix": "전후 잘 보여주기", "tag": "동시 노출",
         "head_plain": "전/후를", "head_hl": "나란히 한 화면", "body": ["따로 보여주면 체감이 약해요.", "한 화면에 붙여야 차이가 커 보여요."]},
        {"t": "crit", "q": "stopwatch quick fast", "num": "03",
         "prefix": "전후 잘 보여주기", "tag": "속도",
         "head_plain": "결과를", "head_hl": "첫 3초에 먼저", "body": ["'이렇게 됐어요'를 맨 앞에.", "과정은 궁금하면 알아서 봐요."]},
        {"t": "crit", "q": "real hands authentic home", "num": "04",
         "prefix": "전후 잘 보여주기", "tag": "리얼",
         "head_plain": "너무 완벽하면", "head_hl": "오히려 의심", "body": ["생활감 있는 리얼한 전후가", "광고 티 안 나고 더 믿겨요."]},
        {"t": "close"},
     ]},

    # 12. 앵글만 바꿔 재탕 ---------------------------------------------------
    {"id": "angle-repost", "title": "같은 상품 앵글만 바꿔 재탕",
     "caption": ("잘 나온 영상, 한 번 쓰고 버리긴 아깝잖아요.\n\n"
                 "같은 상품을 '앵글'만 바꿔 여러 번 올리는 법이에요. 소재 하나를 "
                 "끝까지 우려먹는 재활용 전략.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "camera different angles product",
         "lines": ["잘 나온 영상,", "한 번 쓰고"], "hl": "버리긴 아깝죠"},
        {"t": "statement", "q": "recycle reuse concept",
         "eyebrow": "재활용의 힘", "lines": ["소재는 하나,", "영상은 여러 개."], "hl": "앵글만 바꾸면 돼요",
         "body": ["알고리즘은 '같은 상품'이라고", "불이익 주지 않아요. 각도만 다르면 돼요."]},
        {"t": "crit", "q": "emotion storytelling face", "num": "01",
         "prefix": "앵글 바꾸기", "tag": "공감 버전",
         "head_plain": "같은 상품,", "head_hl": "'내 얘기' 버전", "body": ["'나도 이거 때문에 고생했는데'로", "공감 스토리를 앞세워요."]},
        {"t": "crit", "q": "tutorial how to guide", "num": "02",
         "prefix": "앵글 바꾸기", "tag": "정보 버전",
         "head_plain": "같은 상품,", "head_hl": "'꿀팁' 버전", "body": ["'이렇게 쓰면 2배'처럼", "정보성으로 다시 찍어요."]},
        {"t": "crit", "q": "question answer faq", "num": "03",
         "prefix": "앵글 바꾸기", "tag": "Q&A 버전",
         "head_plain": "댓글 질문을", "head_hl": "답하는 영상으로", "body": ["받은 질문 하나가 다음 소재예요.", "'많이 물어보셔서' 하고 시작."]},
        {"t": "crit", "q": "trend music dance phone", "num": "04",
         "prefix": "앵글 바꾸기", "tag": "트렌드 버전",
         "head_plain": "뜨는 포맷에", "head_hl": "상품만 얹기", "body": ["유행 포맷에 내 상품을 끼우면", "같은 상품도 새 영상이 돼요."]},
        {"t": "close"},
     ]},

    # 13. 내 채널에 맞는 소재 ------------------------------------------------
    {"id": "niche-fit", "title": "내 채널에 맞는 소재 고르기",
     "caption": ("아무리 터진 소재도 내 채널과 안 맞으면 전환은 0이에요.\n\n"
                 "조회수만 보고 따라가면 '구경꾼'만 모여요. 내 상품과 '교집합'인 "
                 "소재를 고르는 법을 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "person choosing path decision",
         "lines": ["터진 소재인데", "내 채널엔"], "hl": "왜 안 먹힐까"},
        {"t": "statement", "q": "venn diagram overlap",
         "eyebrow": "핵심은 교집합", "lines": ["터진 소재 ≠", "내게 맞는 소재."], "hl": "'교집합'을 보세요",
         "body": ["내 상품과 안 겹치면", "구경꾼만 늘고 매출은 그대로예요."]},
        {"t": "crit", "q": "target audience people", "num": "01",
         "prefix": "내 소재 고르기", "tag": "같은 사람",
         "head_plain": "그 소재를 본 사람이", "head_hl": "내 고객인가", "body": ["시청자층이 내 구매층과 겹쳐야", "전환으로 이어져요."]},
        {"t": "crit", "q": "connecting bridge link", "num": "02",
         "prefix": "내 소재 고르기", "tag": "연결 고리",
         "head_plain": "내 상품으로", "head_hl": "자연스럽게 연결?", "body": ["억지로 끼우면 티 나요.", "한 문장으로 연결되면 좋은 소재."]},
        {"t": "crit", "q": "brand identity consistent", "num": "03",
         "prefix": "내 소재 고르기", "tag": "톤",
         "head_plain": "내 채널 톤과", "head_hl": "안 어긋나나", "body": ["평소 결과 너무 다르면", "기존 팔로워가 이탈해요."]},
        {"t": "crit", "q": "sustainable long term plant", "num": "04",
         "prefix": "내 소재 고르기", "tag": "지속성",
         "head_plain": "한 번 말고", "head_hl": "계속 팔 수 있나", "body": ["일회성 유행보다", "꾸준히 팔 상품군이 이득이에요."]},
        {"t": "close"},
     ]},

    # 14. 커버 한 장 (vs) ----------------------------------------------------
    {"id": "cover-frame", "title": "커버 한 장으로 저장 부르기",
     "caption": ("릴스도 '커버 한 장'에서 저장이 갈려요.\n\n"
                 "피드·프로필에서 커버만 보고 넘기거나 눌러요. 저장을 부르는 커버 "
                 "만드는 법을 ❌✅로 정리했어요.\n\n" + FOLLOW),
     "slides": [
        {"t": "cover", "q": "instagram grid profile phone",
         "lines": ["릴스도 '커버 한 장'", "에서"], "hl": "저장이 갈려요"},
        {"t": "vs", "q": "blurry dark photo", "num": "01",
         "prefix": "안 되는 vs 되는 커버", "title": "첫인상",
         "bad": ["흐리거나 어두운 캡처 그대로"], "good": ["밝고 선명한 한 컷을 커버로 지정"]},
        {"t": "vs", "q": "text overlay title image", "num": "02",
         "prefix": "안 되는 vs 되는 커버", "title": "제목",
         "bad": ["글자 없이 사진만"], "good": ["'3가지' 같은 한 줄 제목을 얹음"]},
        {"t": "vs", "q": "grid layout consistent design", "num": "03",
         "prefix": "안 되는 vs 되는 커버", "title": "통일감",
         "bad": ["커버마다 폰트·색 제각각"], "good": ["톤을 통일해 프로필이 정돈돼 보임"]},
        {"t": "vs", "q": "curiosity question hook", "num": "04",
         "prefix": "안 되는 vs 되는 커버", "title": "궁금증",
         "bad": ["결론을 커버에 다 써버림"], "good": ["'왜?'를 남겨 눌러보게 함"]},
        {"t": "close"},
     ]},
]


def by_id(tid):
    for t in TOPICS:
        if t["id"] == tid:
            return t
    return None


if __name__ == "__main__":
    print(f"{len(TOPICS)} topics")
    for t in TOPICS:
        n = len(t["slides"])
        assert t["slides"][0]["t"] == "cover", t["id"]
        assert t["slides"][-1]["t"] == "close", t["id"]
        print(f"  {t['id']:18s} {n} slides  — {t['title']}")
