// thumb-sweep: thumbnails 버킷의 고아 파일을 참조 기반으로 삭제.
// thumbnail-proxy v4 까지 캐시 키가 SHA-256(URL 전체)이라, IG URL 의 만료 서명이
// 갱신될 때마다 같은 사진이 새 파일로 쌓였다(루트 12,000개/927MB). v16 에서 키를
// post/{shortcode}.jpg 로 바꿔 증가는 멈췄고, 이 함수가 잔재를 치운다.
//
// 안전장치: (1) 백필 미완이면 아무것도 안 지움 (2) 어떤 테이블도 참조 안 하는 것만
// (3) GRACE_HOURS 내 생성분 제외 (4) 참조집합 비면 중단 (5) 1회 MAX_DELETE 상한.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUP = Deno.env.get("SUPABASE_URL") ?? "";
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = "chr_thumbsweep_4f7c1b90";
const BUCKET = "thumbnails";
const GRACE_HOURS = 48;
const MAX_DELETE = 2000;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret" };

const REF_TABLES: Array<[string, string]> = [
  ["trend_feed", "thumbnail_url"],
  ["watch_feed", "thumbnail_url"],
  ["saved_briefs", "thumbnail_url"],
  ["saved_trends", "thumbnail_url"],
  ["home_showcase", "thumb_url"],
  ["events", "thumbnail_url"],
];
const BACKFILL_TABLES: Array<[string, string]> = [
  ["trend_feed", "thumbnail_url"],
  ["watch_feed", "thumbnail_url"],
  ["saved_briefs", "thumbnail_url"],
  ["saved_trends", "thumbnail_url"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.headers.get("x-cron-secret") !== CRON_SECRET) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUP, SVC);
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  let pending = 0;
  const pendingBy: Record<string, number> = {};
  for (const [table, col] of BACKFILL_TABLES) {
    const { count, error } = await admin.from(table).select(col, { count: "exact", head: true })
      .not(col, "is", null)
      .not(col, "ilike", "%/storage/v1/object/public/%");
    if (error) return json({ error: "count failed on " + table + ": " + error.message }, 500);
    pendingBy[table] = count ?? 0;
    pending += count ?? 0;
  }
  if (pending > 0) return json({ ok: true, waiting: true, pending, pendingBy });

  const referenced = new Set<string>();
  for (const [table, col] of REF_TABLES) {
    const { data, error } = await admin.from(table).select(col).ilike(col, "%/" + BUCKET + "/%");
    if (error) continue;
    for (const r of data ?? []) {
      const u = String((r as Record<string, unknown>)[col] ?? "");
      const i = u.indexOf("/" + BUCKET + "/");
      if (i < 0) continue;
      const name = decodeURIComponent(u.slice(i + BUCKET.length + 2).split("?")[0]);
      if (name) referenced.add(name);
    }
  }
  if (referenced.size === 0) return json({ error: "referenced set empty - aborting" }, 500);

  const cutoff = Date.now() - GRACE_HOURS * 3600 * 1000;
  const toDelete: string[] = [];
  let scanned = 0, skippedFresh = 0, more = false;

  for (const prefix of ["", "post", "trend"]) {
    let offset = 0;
    for (;;) {
      const { data: objs, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
      if (error || !objs || objs.length === 0) break;
      for (const o of objs) {
        if (!o.id) continue;
        const name = prefix ? prefix + "/" + o.name : String(o.name);
        scanned++;
        if (referenced.has(name)) continue;
        const created = o.created_at ? Date.parse(o.created_at) : 0;
        if (created && created > cutoff) { skippedFresh++; continue; }
        if (toDelete.length >= MAX_DELETE) { more = true; break; }
        toDelete.push(name);
      }
      if (more || objs.length < 1000) break;
      offset += 1000;
    }
    if (more) break;
  }

  if (dry) return json({ ok: true, dry: true, scanned, would_delete: toDelete.length, skippedFresh, more, sample: toDelete.slice(0, 5) });

  let deleted = 0;
  const errors: string[] = [];
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const { error } = await admin.storage.from(BUCKET).remove(batch);
    if (error) errors.push(error.message); else deleted += batch.length;
  }

  return json({ ok: true, scanned, deleted, skippedFresh, more, referenced: referenced.size, errors: errors.slice(0, 3) });
});
