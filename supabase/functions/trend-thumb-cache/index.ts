// trend-thumb-cache v8: 썸네일 + 캐러셀 슬라이드를 스토리지(thumbnails/post/)에 영구 캐시.
// 살아있는 IG URL은 바로, 만료면 TikHub fetch_post_by_url로 fresh display_url 재취득.
//
// v7 변경:
//  1) MAX_PER_RUN 60 → 100, 크론 2시간 → 15분. watch_feed 유입이 하루 1,904행인데
//     처리량이 720행/일이라 격차가 벌어지고 있었다(미캐시 1,154 → 1,871). IG URL 은
//     2~4일이면 만료되므로 유입보다 빨라야 한다. 15분×100 = 9,600행/일.
//  2) 고아 삭제 블록 제거 — thumb-sweep 으로 일원화. 여기 있던 버전은 shortcode 목록을
//     페이지네이션 없이 읽어서(PostgREST 는 1,000행 상한) 참조 집합이 불완전했고,
//     48h 유예가 풀리면 멀쩡한 썸네일을 지울 수 있었다.
//
// v8 변경: 캐러셀 슬라이드(images[]) 영구 캐시 추가.
//  images[] 원본은 인스타 CDN 서명 URL이라 2~4일이면 만료돼, 재진입/깊은 장이 안 떴다.
//  살아있는 동안 각 장을 post/{sc}_{i}.jpg 로 받아(= thumbnail-proxy 와 같은 경로) images[]를
//  스토리지 URL로 교체한다. 그러면 프론트가 프록시 없이 영구 URL을 바로 쓴다.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUP = Deno.env.get("SUPABASE_URL") ?? "";
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CRON_SECRET = "chr_thumbcache_9a4d2e6b";
const TK_BASE = "https://api.tikhub.io/api/v1/instagram/v1";
const BUCKET = "thumbnails";
const MAX_PER_RUN = 100;
const CAROUSEL_ROWS = 30;      // 런당 살펴볼 캐러셀 행 수(최신순)
const SLIDE_BUDGET = 25;       // 런당 슬라이드 다운로드 상한(타임아웃 방지)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const pubUrl = (path: string) => `${SUP}/storage/v1/object/public/${BUCKET}/${path}`;
const isStored = (u: string) => u.includes("/storage/v1/object/public/");
const isRawIg = (u: string) => /cdninstagram|fbcdn/i.test(u);

// [테이블, 썸네일 컬럼, 정렬 컬럼] — 최신 것부터 캐시해야 만료 전에 잡는다
const TARGETS: Array<[string, string, string | null]> = [
  ["saved_briefs", "thumbnail_url", "created_at"],
  ["saved_trends", "thumbnail_url", "taken_at"],
  ["trend_feed", "thumbnail_url", "taken_at"],
  ["watch_feed", "thumbnail_url", "taken_at"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const admin = createClient(SUP, SVC);
  let authed = req.headers.get("x-cron-secret") === CRON_SECRET;
  if (!authed) {
    const authH = req.headers.get("Authorization") ?? "";
    if (authH) {
      const u = createClient(SUP, ANON, { global: { headers: { Authorization: authH } } });
      const { data: { user } } = await u.auth.getUser();
      if (user) {
        const { data: sub } = await admin.from("subscriptions").select("role").eq("user_id", user.id).maybeSingle();
        if (sub?.role === "admin" || sub?.role === "super_admin") authed = true;
      }
    }
  }
  if (!authed) return json({ error: "unauthorized" }, 401);

  const { data: cfg } = await admin.from("app_config").select("value").eq("key", "TIKHUB_API_KEY").maybeSingle();
  const TK = cfg?.value ?? "";

  const res: Record<string, unknown> = { cached: 0, refetched: 0, failed: 0, per_table: {} };
  const bump = (k: string) => { res[k] = (res[k] as number) + 1; };

  async function fetchImg(url: string): Promise<{ buf: Uint8Array; ct: string } | null> {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Referer": "https://www.instagram.com/" }, signal: AbortSignal.timeout(12000) });
      if (!r.ok) return null;
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) return null;
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.byteLength < 500) return null;
      return { buf, ct };
    } catch { return null; }
  }

  let budget = MAX_PER_RUN;
  for (const [table, col, orderCol] of TARGETS) {
    if (budget <= 0) break;
    let q = admin.from(table).select(`shortcode, ${col}`)
      .not(col, "ilike", "%/storage/v1/object/public/%")
      .not("shortcode", "is", null);
    if (orderCol) q = q.order(orderCol, { ascending: false });
    const { data: rows, error } = await q.limit(budget);
    if (error) { (res.per_table as Record<string, unknown>)[table] = { error: error.message }; continue; }

    let cached = 0, failed = 0;
    for (const row of rows ?? []) {
      const sc = String((row as Record<string, unknown>).shortcode ?? "");
      if (!sc) continue;
      budget--;
      try {
        const cur = String((row as Record<string, unknown>)[col] ?? "");
        let img = cur ? await fetchImg(cur) : null;
        let refetched = false;
        const path = `post/${sc}.jpg`;

        if (!img) {
          const head = await fetch(pubUrl(path), { method: "HEAD" }).catch(() => null);
          if (head?.ok) {
            await admin.from(table).update({ [col]: pubUrl(path) }).eq("shortcode", sc);
            cached++; bump("cached"); continue;
          }
        }

        if (!img && TK) {
          await sleep(700);
          const purl = `https://www.instagram.com/reel/${sc}/`;
          const rr = await fetch(`${TK_BASE}/fetch_post_by_url?post_url=${encodeURIComponent(purl)}`, { headers: { Authorization: `Bearer ${TK}`, "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
          const t = await rr.text();
          const m = t.match(/\"display_url\"\s*:\s*\"([^\"]+)\"/);
          const disp = m ? m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/") : "";
          if (disp) { img = await fetchImg(disp); refetched = true; }
        }
        if (!img) { failed++; bump("failed"); continue; }

        const { error: upe } = await admin.storage.from(BUCKET).upload(path, img.buf, { contentType: img.ct || "image/jpeg", upsert: true });
        if (upe) { failed++; bump("failed"); continue; }
        await admin.from(table).update({ [col]: pubUrl(path) }).eq("shortcode", sc);
        cached++; bump("cached"); if (refetched) bump("refetched");
      } catch { failed++; bump("failed"); }
    }
    (res.per_table as Record<string, unknown>)[table] = { targeted: rows?.length ?? 0, cached, failed };
  }

  // ── 캐러셀 슬라이드 영구 캐시 ──
  // images[] 에 아직 원본 IG URL이 남은 행만 골라, 살아있는 장을 스토리지로 받아 URL을 교체한다.
  // 이미 스토리지면 재사용(HEAD), 만료돼 못 받으면 원본 유지(다음 런 재시도, 피드가 8일이면 자연 소멸).
  let slideBudget = SLIDE_BUDGET;
  try {
    // 아직 원본 IG URL이 남은 캐러셀만 최신순으로 받는다(이미 캐시된 건 제외돼 백로그가 밀리지 않는다).
    const { data: crows, error: cerr } = await admin.rpc("carousel_uncached_rpc", { p_limit: CAROUSEL_ROWS });
    if (cerr) {
      (res.per_table as Record<string, unknown>)["trend_feed_carousel"] = { error: cerr.message };
    } else {
      let cRows = 0, cSlides = 0, cFail = 0;
      for (const row of crows ?? []) {
        if (slideBudget <= 0) break;
        const sc = String((row as Record<string, unknown>).shortcode ?? "");
        const imgs0 = (row as Record<string, unknown>).images;
        const imgs: string[] = Array.isArray(imgs0) ? (imgs0 as string[]) : [];
        if (!sc || !imgs.length) continue;
        // 원본 IG URL이 하나도 없으면(전부 스토리지/빈값) 건너뛴다
        if (!imgs.some((u) => isRawIg(String(u ?? "")))) continue;
        const out: string[] = [];
        let changed = false;
        for (let i = 0; i < imgs.length; i++) {
          const u = String(imgs[i] ?? "");
          if (!u || isStored(u)) { out.push(u); continue; }
          if (slideBudget <= 0) { out.push(u); continue; }
          const path = `post/${sc}_${i}.jpg`;
          const head = await fetch(pubUrl(path), { method: "HEAD" }).catch(() => null);
          if (head?.ok) { out.push(pubUrl(path)); changed = true; continue; }
          slideBudget--;
          const img = await fetchImg(u);
          if (!img) { out.push(u); cFail++; continue; }
          const { error: upe } = await admin.storage.from(BUCKET).upload(path, img.buf, { contentType: img.ct || "image/jpeg", upsert: true });
          if (upe) { out.push(u); cFail++; continue; }
          out.push(pubUrl(path)); changed = true; cSlides++;
        }
        if (changed) { await admin.from("trend_feed").update({ images: out }).eq("shortcode", sc); cRows++; }
      }
      (res.per_table as Record<string, unknown>)["trend_feed_carousel"] = { rows: cRows, slides: cSlides, failed: cFail };
    }
  } catch (e) { (res.per_table as Record<string, unknown>)["trend_feed_carousel"] = { error: String(e) }; }

  return json({ ok: true, ...res });
});
