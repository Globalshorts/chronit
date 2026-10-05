#!/usr/bin/env bash
# 클라우드/새 환경에서 캐러셀 생성 준비 — Storage에서 폰트·로고를 받고 pexels 키를 세팅한다.
# 사용: (Vault에서 PEXELS_KEY 읽어) export PEXELS_KEY=... ; bash carousel/bootstrap.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
SB="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/manual-images/assets"
AS="$DIR/_auto_carousel/assets"; mkdir -p "$AS" "$DIR/logo"
# Pretendard(가독성 폰트) — jsDelivr에서. Black=디스플레이, ExtraBold/SemiBold=강조, Bold=제목, Medium=본문
PRE="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static"
for w in Black ExtraBold Bold SemiBold Medium; do
  curl -sfL -o "$AS/Pretendard-$w.otf" "$PRE/Pretendard-$w.otf"; echo "font Pretendard-$w -> $(wc -c < "$AS/Pretendard-$w.otf") bytes"
done
curl -s -o "$DIR/logo/chronit-mark-white.png" "$SB/chronit-mark-white.png"
curl -s -o "$AS/logo_white.png" "$SB/logo_white.png"
echo "logo -> $(wc -c < "$DIR/logo/chronit-mark-white.png") bytes"
if [ -n "$PEXELS_KEY" ]; then printf '%s' "$PEXELS_KEY" > "$DIR/pexels_key.txt"; echo "pexels: env로 설정됨";
elif [ -f "$DIR/pexels_key.txt" ]; then echo "pexels: 기존 파일 사용";
else echo "WARN: PEXELS_KEY 없음 — Vault에서 읽어 'export PEXELS_KEY=...' 후 재실행"; fi
echo "준비 완료. 예: cd $DIR/_auto_carousel && python3 c_story2.py"
