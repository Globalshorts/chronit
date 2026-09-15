// trend-thumb-cache v6: 썸네일을 스토리지(thumbnails/post/)에 영구 캐시 + 참조 기반 고아 삭제.
// 살아있는 IG URL은 바로, 만료면 TikHub fetch_post_by_url로 fresh display_url 재취득.
//
// v6 변경:
//  1) 대상이 trend_feed 뿐이었는데 watch_feed / saved_trends / saved_briefs 까지 확장.
//     저장 항목(북마크·저장한 기획)과 워치 피드는 IG CDN URL(oe= 만료 서명)을 그대로
//     들고 있어서 2~4일이면 썸네일이 깨졌다. 스토리지로 옮기면 만료가 사라진다.
//  2) 경로를 trend/{sc}.jpg → post/{sc}.jpg 로 통일. thumbnail-proxy v5 와 같은 키라
//     프록시가 이미 받아둔 파일을 그대로 재사용하고 중복이 생기지 않는다.
//  3) 고아 삭제를 "trend_feed 에 없으면 삭제" → "네 테이블 shortcode 합집합에 없으면 삭제"로.
//     URL 이 아니라 shortcode 로 비교하므로, 행이 아직 IG URL 을 들고 있어도 보호된다.
//     방금 프록시가 올린 파일과 경합하지 않도록 GRACE_HOURS 안에 만들어진 건 건너뛴다.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUP = Deno.env.get("SUPABASE_URL") ?? "";
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CRON_SECRET = "chr_thumbcache_9a4d2e6b";
const TK_BASE = "https://api.tikhub.io/api/v1/instagram/v1";
const BUCKET = "thumbnails";
const MAX_PER_RUN = 60;
const GRACE_HOURS = 48;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const pubUrl = (path: string) => `${SUP}/storage/v1/object/public/${BUCKET}/${path}`;

// 캐시 대상 테이블 — [테이블, 썸네일 컬럼, 정렬 컬럼]
const TARGETS: Array<[string, string, string | null]> = [
  ["trend_feed", "thumbnail_url", "taken_at"],
  ["watch_feed", "thumbnail_url", "taken_at"],
  ["saved_briefs", "thumbnail_url", "created_at"],
  ["saved_trends", "thumbnail_url", "taken_at"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

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

  const res: any = { cached: 0, refetched: 0, failed: 0, orphans_deleted: 0, per_table: {} };

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

  // ── 1) 캐시: 아직 스토리지로 안 옮긴 행을 테이블별로 처리 ──
  let budget = MAX_PER_RUN;
  for (const [table, col, orderCol] of TARGETS) {
    if (budget <= 0) break;
    let q = admin.from(table).select(`shortcode, ${col}`)
      .not(col, "ilike", "%/storage/v1/object/public/%")
      .not("shortcode", "is", null);
    if (orderCol) q = q.order(orderCol, { ascending: false });
    const { data: rows, error } = await q.limit(budget);
    if (error) { res.per_table[table] = { error: error.message }; continue; }

    let cached = 0, failed = 0;
    for (const row of rows ?? []) {
      const sc = String((row as any).shortcode ?? "");
      if (!sc) continue;
      budget--;
      try {
        const cur = String((row as any)[col] ?? "");
        let img = cur ? await fetchImg(cur) : null;
        let refetched = false;

        // 프록시가 이미 올려둔 게 있으면 재다운로드 없이 그대로 연결
        const path = `post/${sc}.jpg`;
        if (!img) {
          const head = await fetch(pubUrl(path), { method: "HEAD" }).catch(() => null);
          if (head?.ok) {
            await admin.from(table).update({ [col]: pubUrl(path) }).eq("shortcode", sc);
            cached++; res.cached++; continue;
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
        if (!img) { failed++; res.failed++; continue; }

        const { error: upe } = await admin.storage.from(BUCKET).upload(path, img.buf, { contentType: img.ct || "image/jpeg", upsert: true });
        if (upe) { failed++; res.failed++; continue; }
        await admin.from(table).update({ [col]: pubUrl(path) }).eq("shortcode", sc);
        cached++; res.cached++; if (refetched) res.refetched++;
      } catch { failed++; res.failed++; }
    }
    res.per_table[table] = { targeted: rows?.length ?? 0, cached, failed };
  }

  // ── 2) 고아 삭제: 네 테이블 shortcode 합집합에 없는 post/ 썸네일 제거 ──
  try {
    const live = new Set<string>();
    for (const [table] of TARGETS) {
      const { data } = await admin.from(table).select("shortcode").not("shortcode", "is", null);
      for (const r of data ?? []) live.add(String((r as any).shortcode));
    }
    // live 가 비면(쿼리 실패 등) 전량 삭제될 수 있으므로 방어
    if (live.size === 0) {
      res.orphan_skipped = "live set empty";
    } else {
      const cutoff = Date.now() - GRACE_HOURS * 3600 * 1000;
      const toDelete: string[] = [];
      let offset = 0;
      for (;;) {
        const { data: objs } = await admin.storage.from(BUCKET).list("post", { limit: 1000, offset });
        if (!objs || objs.length === 0) break;
        for (const o of objs) {
          const name = String(o.name || "");
          if (!name.endsWith(".jpg")) continue;
          const created = o.created_at ? Date.parse(o.created_at) : 0;
          if (created && created > cutoff) continue;        // 갓 올라온 건 건너뜀
          if (!live.has(name.slice(0, -4))) toDelete.push(`post/${name}`);
        }
        if (objs.length < 1000) break;
        offset += 1000;
      }
      for (let i = 0; i < toDelete.length; i += 100) {
        const { error: rmErr } = await admin.storage.from(BUCKET).remove(toDelete.slice(i, i + 100));
        if (!rmErr) res.orphans_deleted += Math.min(100, toDelete.length - i);
      }
    }
  } catch (e) { res.orphan_error = String(e); }

  return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
});
