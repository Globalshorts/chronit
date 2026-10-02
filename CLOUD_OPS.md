# CLOUD_OPS — 크로닛 운영/배포 지도 (모든 세션 공용)

이 문서는 어느 세션(로컬/클라우드)에서든 **"봇"과 백엔드를 이해하고 직접 바꾸기** 위한 지도다.
핵심: "봇"은 데스크탑이 아니라 **Supabase 엣지 함수**다. 토큰이 저장돼 있어 어느 세션이든 배포할 수 있다.

## 1. 두 갈래
- **프론트엔드**: 이 GitHub repo → push 하면 Vercel 자동 배포. git push가 막히면 `repo-commit` 엣지 함수로 커밋.
- **백엔드("봇")**: Supabase 엣지 함수(프로젝트 ref `oxygqtbdpnxxcgzwdlzi`). 배포는 `deploy-fn` 엣지 함수로.

## 2. 마케팅/봇 파이프라인 (엣지 함수)
- `send-daily-carousel` — pg_cron 매일. `marketing_sets`(status=approved, 미발송)에서 티어 A→B→C 로테이션 1개를 텔레그램 전송. 버튼 3개: ✅인스타 발행(`pub:id`) / ⏭건너뛰기(`skip:id`) / 🔀다른 주제(`other:id`). TOP10(source에 top10)은 수동 안내 + [건너뛰기/다른 주제].
- `tg-webhook` — 버튼 콜백. `pub`→`ig-publish`, `skip`→무시, `other`→다른 source 대기 세트로 교체 전송. 스레드 승인/건너뛰기도.
- `ig-publish` — Instagram Graph API(v21) 캐러셀 발행. `marketing_sets.imgs`+`caption`.
- `carousel-feed`/`stt-hook`/`carousel-copy`/`carousel-enqueue` — 주간 생성 파이프라인.
- `threads-auto`/`threads-publish`/`threads-daily` — 스레드 자동 발행.
- `payment-alert`/`daily-report`/`utm-digest` — 결제·리포트 알림.
- `analyze-clip`(v12+, product_name 출력) / `script-assistant`(베라 대본, A/B 훅 다양화).
- `repo-commit` — GitHub 커밋(프론트). 키 `marketing_config.repo_commit_key`.
- `deploy-fn` — 엣지 함수 배포기. 키 `marketing_config.repo_commit_key`.

## 3. 데이터/시크릿
- `marketing_sets`: 캐러셀 큐 (id, pillar, tier, source, caption, imgs, status[approved|sent|skip], ig_posted, sent_at).
- `marketing_config`(k,v): cron_secret, repo_commit_key, tg_token, tg_chat, tg_webhook_secret, stream_order.
- `app_config`(key,value): GH_TOKEN, SUPABASE_ACCESS_TOKEN(sbp_, 관리 API), IG_PAGE_TOKEN, IG_USER_ID, FB_APP_SECRET, TIKHUB_API_KEY, THREADS_*.

## 4. 엣지 함수 배포 — 어느 세션에서든 (MCP 배포 버그 우회)
`deploy-fn`에 소스를 POST → 저장된 SUPABASE_ACCESS_TOKEN으로 관리 API 배포.
```bash
# KEY = marketing_config.repo_commit_key (= chr_repopush_8d3f1a7e9b2c)
SRC=$(python3 -c 'import json;print(json.dumps(open("index.ts").read()))')
curl -s -X POST "https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/deploy-fn" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$KEY\",\"slug\":\"<함수이름>\",\"source\":$SRC,\"verify_jwt\":true}"
# → {"ok":true,"version":N}
```
verify_jwt: 사용자 호출 함수(script-assistant/analyze-clip)=true, 웹훅/크론(tg-webhook/send-daily-carousel/deploy-fn/repo-commit)=false.

## 5. 프론트 커밋 — git push 막힐 때
`repo-commit`에 POST: {key:repo_commit_key, files:[{path,content}], message} → GitHub 커밋 → Vercel.

## 6. 캐러셀 큐 채우기 (주간 생성)
GitHub Actions `carousel-weekly.yml`(월 08:00 KST) 또는 수동:
```bash
cd carousel && bash bootstrap.sh && CRON_SECRET=<marketing_config.cron_secret> python3 run_weekly.py
```
→ carousel-feed+stt-hook+carousel-copy → gen_formats 렌더 → Storage 업로드 → carousel-enqueue. 4종: top10/casestudy/numbers/rising (tier A).

## 7. 캡션 정책 (중요)
해시태그 최소화, 롱폼 가치형: ①강한 훅(+키워드) ②공감 스토리/문제 ③바로 쓰는 프레임워크(저장 가치) ④저장📌 ⑤댓글💬 + chronit.kr CTA. 캡션만 읽어도 도움 되게 → 저장·공유가 도달을 끌어옴.
- `carousel-copy`(v11+)가 `caption` 필드를 이 형태로 생성. `run_weekly.py`는 과거 하드코딩 `CAPS[fmt]`(해시태그 포함)를 쓰므로, 롱폼 캡션을 쓰려면 enqueue 시 `copy["caption"]`을 우선 사용하도록 연결할 것.
