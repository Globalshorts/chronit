# 캐러셀 생성 (클라우드 이관본)

바탕화면 Chronit 폴더 없이도 이 repo만으로 캐러셀을 만들 수 있게 옮긴 것.

## 준비
1. Pexels 키를 Supabase Vault(`PEXELS_KEY`)에서 읽어 환경변수로:
   `export PEXELS_KEY=$(...)`  (Supabase MCP execute_sql: `select decrypted_secret from vault.decrypted_secrets where name='PEXELS_KEY'`)
2. 자산 내려받기: `bash carousel/bootstrap.sh`
   → 폰트 3종·로고를 Storage(`manual-images/assets/`)에서 `_auto_carousel/assets` 및 `logo/`에 배치, pexels_key.txt 생성.

## 생성
`cd carousel/_auto_carousel && python3 <스크립트>.py`
- `c_story2.py` — C(제품 투명성) 캐러셀
- `l_story.py` / `l_angles.py` — L(창업 스토리) 캐러셀·앵글
- `gen.py` — 범용 생성(pexels 배경)
- `vera_ad.py` — 베라 광고 이미지

결과물은 `carousel/` 하위에 날짜 폴더로 저장됨. 발송은 기존 서버측(pg_cron + send-marketing-carousel) 그대로.

## 주의
- 폰트/로고/pexels_key/생성물은 .gitignore로 repo에 안 올라감(용량·시크릿). 항상 bootstrap로 받아 씀.
- 스크립트는 원본 그대로(경로 관습: HERE=_auto_carousel, ROOT=carousel).
