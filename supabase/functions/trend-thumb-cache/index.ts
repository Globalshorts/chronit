// trend-thumb-cache v7: 썸네일을 스토리지(thumbnails/post/)에 영구 캐시.
// 살아있는 IG URL은 바로, 만료면 TikHub fetch_post_by_url로 fresh display_url 재취득.
//
// v7 변경:
//  1) MAX_PER_RUN 60 → 100, 크론 2시간 → 15분. watch_feed 유입이 하루 1,904행인데
//     처리량이 720행/일이라 격차가 벌어지고 있었다(미캐시 1,154 → 1,871). IG URL 은
//     2~4일이면 만료되므로 유입보다 빨라야 한다. 15분×100 = 9,600행/일.
//  2) 고아 삭제 블록 제거 — thumb-sweep 으로 일원화. 여기 있던 버전은 shortcode 목록을
//     페이지네이션 없이 읽어서(PostgREST 는 1,000행 상한) 참조 집합이 불완전했고,
//     48h 유예가 풀리면 멀쩡한 썸네일을 지울 수 있었다.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUP = Deno.env.get("SUPABASE_URL") ?? "";
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CRON_SECRET = "chr_thumbcache_9a4d2e6b";
const TK_BASE = "https://api.tikhub.io/api/v1/instagram/v1";
const BUCKET = "thumbnails";
const MAX_PER_RUN = 100;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const pubUrl = (path: string) => `${SUP}/storage/v1/object/public/${BUCKET}/${path}`;

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

        // 프록시가 이미 올려둔 게 있으면 재다운로드 없이 연결만 교체
        if (!img) {
          const head = await fetch(pubUrl(path), { method: "HEAD" }).catch(() => null);
          if (head?.ok) {
            await admin.from(table).update({ [col]: pubUrl(path) }).eq("shortcode", sc);
            cached++; bump("cached"); continue;
          }
        }

        // URL 이 만료됐으면 shortcode 로 fresh display_url 재취득
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

  return json({ ok: true, ...res });
});
