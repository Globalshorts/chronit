# CLOUD_OPS — 크로닛 운영/배포 지도 (모든 세션 공용)

이 문서 하나로 어느 세션(로컬/클라우드)이든 **"봇"과 백엔드를 이해하고 로컬 세션과 동일하게 통제**할 수 있다.
핵심 원리: **민감 시크릿을 세션이 직접 읽지 않는다. 서버(엣지 함수)가 시크릿을 들고, 세션은 공유 키 하나(`repo_commit_key = chr_repopush_8d3f1a7e9b2c`)로 모든 걸 호출한다.**

## 0. 클라우드 세션 = 로컬 세션 복제본 체크리스트
- 엣지 함수 배포 → `deploy-fn` (아래 §4). ✅ 로컬과 동일
- 프론트 커밋/배포 → `repo-commit` (§5) → Vercel. ✅
- 캐러셀 큐 생성 → 샌드박스에서 `run_weekly.py` 실행, 키는 `repo_commit_key` 사용 (§6). ✅
- DB 읽기/쓰기 → Supabase MCP(execute_sql). ✅
- 시크릿 원문이 필요 없음 — 전부 `repo_commit_key` 하나로 함수 호출. ✅
- 사람만 가능(로컬도 불가): 외부 로그인(Meta/토스), 토큰 발급, GitHub Actions 실행권 토큰, DNS/결제/Replicate 프라이빗 repo. ⛔

## 1. 두 갈래
- 프론트엔드: GitHub repo(Globalshorts/chronit) → push → Vercel 자동배포. push 막히면 `repo-commit`.
- 백엔드("봇"): Supabase 엣지 함수(ref `oxygqtbdpnxxcgzwdlzi`). 배포는 `deploy-fn`.

## 2. 마케팅/봇 엣지 함수
- `send-daily-carousel`: pg_cron 매일. marketing_sets(approved·미발송)에서 A→B→C 로테이션 1개 텔레그램 전송. 버튼 3개: ✅발행(pub:id)/⏭건너뛰기(skip:id)/🔀다른 주제(other:id). TOP10(source에 top10)은 수동 안내+[건너뛰기/다른 주제].
- `tg-webhook`: 버튼 콜백. pub→ig-publish, skip→무시, other→다른 source 대기세트 교체 전송, 스레드 승인/건너뛰기.
- `ig-publish`: Instagram Graph API(v21) 캐러셀 발행(imgs+caption).
- `carousel-feed`/`stt-hook`/`carousel-copy`/`carousel-enqueue`: 주간 생성.
- `threads-auto`/`threads-publish`/`threads-daily`, `analyze-clip`(v12 product_name), `script-assistant`(A/B 훅 다양화), `payment-alert`/`daily-report`/`utm-digest`.
- `repo-commit`(프론트 커밋), `deploy-fn`(엣지 함수 배포). 둘 다 키 `repo_commit_key`.

## 3. 데이터/시크릿
- `marketing_sets`: 큐(id,pillar,tier,source,caption,imgs,status[approved|sent|skip],ig_posted,sent_at).
- `marketing_config`(k,v): cron_secret, repo_commit_key, tg_token, tg_chat, tg_webhook_secret.
- `app_config`(key,value): GH_TOKEN, SUPABASE_ACCESS_TOKEN(sbp_), IG_PAGE_TOKEN, IG_USER_ID, FB_APP_SECRET, TIKHUB_API_KEY, THREADS_*.

## 4. 엣지 함수 배포 — 어느 세션에서든
```bash
KEY=chr_repopush_8d3f1a7e9b2c
SRC=$(python3 -c 'import json;print(json.dumps(open("index.ts").read()))')
curl -s -X POST "https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/deploy-fn" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$KEY\",\"slug\":\"<함수이름>\",\"source\":$SRC,\"verify_jwt\":true}"
# → {"ok":true,"version":N}
```
verify_jwt: 사용자호출(script-assistant/analyze-clip)=true, 웹훅·크론(tg-webhook/send-daily-carousel/deploy-fn/repo-commit/carousel-*)=false.
기존 소스 확인: Supabase MCP `get_edge_function`.

## 5. 프론트 커밋 — git push 막힐 때
`repo-commit`에 POST: {key:chr_repopush_8d3f1a7e9b2c, files:[{path,content}], message} → GitHub 커밋 → Vercel.

## 6. 캐러셀 큐 채우기
GitHub Actions `carousel-weekly.yml`(월 08:00 KST) 또는 샌드박스 수동:
```bash
cd carousel && bash bootstrap.sh && CRON_SECRET=chr_repopush_8d3f1a7e9b2c python3 run_weekly.py
```
※ carousel-feed/copy/enqueue 는 이제 cron_secret 뿐 아니라 **repo_commit_key도 허용**하므로, 민감한 cron_secret 없이 공유 키로 돌릴 수 있다. (run_weekly.py 의 CRON_SECRET 자리에 repo_commit_key 넣으면 됨)
→ carousel-feed(데이터)+stt-hook(실제 상위 릴스 훅)+carousel-copy(카피/캡션) → gen_formats 렌더 → Storage 업로드 → carousel-enqueue. 4종: top10/casestudy/numbers/rising.

## 7. 캡션 정책
해시태그 최소화·롱폼 가치형: 강한훅(+키워드)→공감 스토리/문제→바로 쓰는 프레임워크→저장📌→댓글💬 + chronit.kr. 캡션만 읽어도 도움 되게.
- `carousel-copy`(v12+)가 `caption` 필드를 이 형태로 생성(해시태그 없음, 타이포 교정됨).
- ⚠️ 아직 `run_weekly.py`는 enqueue 시 하드코딩 `CAPS[fmt]`(해시태그 포함)를 보냄 → 롱폼 캡션을 쓰려면 `carousel-copy` 응답의 `copy["caption"]`을 enqueue의 caption으로 넘기도록 run_weekly.py 를 고칠 것(아직 미적용).
