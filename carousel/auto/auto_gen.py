# -*- coding: utf-8 -*-
"""크로닛 캐러셀 자동 생성기 (GitHub Actions 데일리 크론).
흐름: auto-enqueue?action=status 로 큐/최근소스 확인 → 중복 안 된 주제를 LRU로 선택
→ render_lib 로 렌더 → Storage 업로드(캐시버스트) → auto-enqueue 로 큐 적재(status=approved).
이후 send-daily-carousel 이 텔레그램으로 보내고, 사용자가 ✅ 승인하면 ig-publish.
민감 토큰 없이 CRON_SECRET + (anon) Storage 키만으로 동작."""
import os, sys, json, time, datetime, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import render_lib as R
import topics as T

SB = "https://oxygqtbdpnxxcgzwdlzi.supabase.co"
SEC = os.environ.get("CRON_SECRET", "").strip()
# Storage insert 용 — anon 키(버킷 public, 과거 run_weekly 와 동일 경로). 필요시 env 로 교체.
ANON = os.environ.get("ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY")
BUFFER = int(os.environ.get("CAROUSEL_BUFFER", "3"))   # 승인대기 큐 목표치
MAX_ADD = int(os.environ.get("CAROUSEL_MAX_ADD", "2")) # 1회 실행 최대 적재 수(크레딧 아님, Pexels 호출 절약)


def http(method, path, body=None, headers=None, t=120):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(SB+path, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        r = urllib.request.urlopen(req, timeout=t)
        return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, (e.read().decode() if e else "")


def status():
    st, j = http("GET", f"/functions/v1/auto-enqueue?action=status&k={SEC}")
    if st != 200:
        raise SystemExit(f"status failed {st}: {j}")
    return j


def pick_topics(recent_sources, k):
    """recent_sources: 최근순 리스트(auto:<id>-<date>). LRU 선택:
    한 번도 안 쓴 주제 먼저, 그다음 가장 오래 전에 쓴 주제."""
    def rank(topic):
        sid = f"auto:{topic['id']}-"
        for i, s in enumerate(recent_sources):      # i 작을수록 최근
            if s.startswith(sid):
                return i
        return -1                                     # 미사용 → 최우선
    never = [t for t in T.TOPICS if rank(t) == -1]
    used = sorted([t for t in T.TOPICS if rank(t) >= 0], key=lambda t: -rank(t))
    return (never + used)[:k]


def upload(outdir, sub, ts):
    base = f"{SB}/storage/v1/object/manual-images/marketing/auto/{sub}"
    pub = f"{SB}/storage/v1/object/public/manual-images/marketing/auto/{sub}"
    urls = []
    for name in sorted(os.listdir(outdir)):
        if not name.endswith(".jpg"):
            continue
        data = open(os.path.join(outdir, name), "rb").read()
        req = urllib.request.Request(f"{base}/{name}", data=data, method="POST")
        req.add_header("Authorization", "Bearer "+ANON); req.add_header("apikey", ANON)
        req.add_header("Content-Type", "image/jpeg"); req.add_header("x-upsert", "true")
        try:
            urllib.request.urlopen(req, timeout=90)
        except urllib.error.HTTPError as e:
            raise SystemExit(f"storage upload failed {e.code}: {e.read().decode()}")
        urls.append(f"{pub}/{name}?v={ts}")
    return urls


def enqueue(topic, imgs):
    body = {"key": SEC, "source": f"auto:{topic['id']}-{datetime.datetime.utcnow():%Y%m%d}",
            "pillar": "I", "tier": "A", "caption": topic["caption"], "imgs": imgs}
    st, j = http("POST", "/functions/v1/auto-enqueue", body)
    if st != 200:
        raise SystemExit(f"enqueue failed {st}: {j}")
    return j


def main():
    if not SEC:
        raise SystemExit("CRON_SECRET 없음")
    s = status()
    need = max(0, BUFFER - s.get("approved_unsent", 0))
    k = min(need, MAX_ADD)
    print(f"[status] approved_unsent={s.get('approved_unsent')} buffer={BUFFER} → add {k}")
    if k <= 0:
        print("큐 충분 — 추가 없음."); return
    chosen = pick_topics(s.get("recent_sources", []), k)
    ts = int(time.time())
    for topic in chosen:
        sub = f"{topic['id']}-{datetime.datetime.utcnow():%Y%m%d}"
        outdir = os.path.join(HERE, "_work", sub)
        print(f"[render] {topic['id']} ({len(topic['slides'])} slides)")
        R.render_topic(topic, outdir)
        imgs = upload(outdir, sub, ts)
        r = enqueue(topic, imgs)
        print(f"[enqueue] {topic['id']} → id={r.get('id')} imgs={len(imgs)}")
    print("done.")


if __name__ == "__main__":
    main()
