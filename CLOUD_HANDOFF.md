# 클라우드 인수인계 (로컬 → 클라우드/Claude Code 이관용)

이 저장소만 있으면 로컬 바탕화면 폴더 없이도 작업을 이어갈 수 있게 정리한 지도.

## 배포 (전부 클라우드 — 로컬 불필요)
- 프론트: 이 repo → GitHub push → **Vercel 자동 배포**. 브랜치 **main + script-preview 둘 다 push**.
- Supabase project ref: `oxygqtbdpnxxcgzwdlzi`
- 엣지 함수 배포: Supabase CLI `functions deploy <slug> --project-ref oxygqtbdpnxxcgzwdlzi --use-api`
  (Docker 불필요. SUPABASE_ACCESS_TOKEN 필요 — 계정 Access Token을 그때 발급/사용 후 폐기.)
  또는 Supabase MCP `deploy_edge_function` (간헐 오류 시 CLI 사용).

## 시크릿 위치 (로컬 파일 대신 여기서)
- **Supabase Vault** (`select decrypted_secret from vault.decrypted_secrets where name=...`):
  - `GH_TOKEN` — GitHub PAT (repo push용)
  - `PEXELS_KEY` — 캐러셀 배경 이미지
  - `RESEND_API_KEY` — 안내/트라이얼 메일
- **app_config 테이블** (`select value from app_config where key=...`):
  - `TIKHUB_API_KEY`, `APIFY_TOKEN`, `SOLAPI_*`, `WAVESPEED_API_KEY`, `YOUTUBE_API_KEY`, `META_CAPI_TOKEN`, `VAPID_*`
- **엣지 함수 시크릿(런타임 전용, SQL로는 못 읽음):** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `WELCOME_HOOK_SECRET` 등.
  STT/코퍼스 배치처럼 샌드박스에서 OpenAI가 필요하면 그때 키를 붙여 사용.

## 캐러셀 자산 (로컬 _auto_carousel/assets 대신 Storage)
public 버킷 `manual-images/assets/` 에 업로드됨:
- `NotoSansKR-Bold.ttf`, `GmarketSansMedium.otf`, `BlackHanSans-Regular.ttf`, `logo_white.png`
- URL 예: `https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/manual-images/assets/NotoSansKR-Bold.ttf`
- (Storage가 폰트 MIME를 막아 image/png로 올렸지만 바이트는 원본 그대로 — 다운로드해서 .ttf/.otf로 저장해 쓰면 됨.)
- 캐러셀 생성 스크립트 원본: `_auto_carousel/` (바탕화면 Chronit 폴더). 필요 시 repo나 Storage로 함께 옮길 것.

## 주요 자동화 (이미 서버측 = 클라우드에서 계속 동작)
- 주간 캐러셀 발송: pg_cron + `send-marketing-carousel` 엣지 (C=화, L=목 09:00 KST)
- 트라이얼 계속-이용 리마인더: `dispatch_finds_trial_reminders` cron + `send-trial-continue`
- 안내 메일(1회성): `send_relaunch_announcement()` RPC + pg_cron (완료됨)
- 퍼널 집계: `funnel_stats(p_days)` RPC → 관리자 "사용자 행동" 탭
