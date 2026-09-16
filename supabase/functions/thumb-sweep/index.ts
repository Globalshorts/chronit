// thumb-sweep v2: thumbnails 버킷의 고아 파일을 참조 기반으로 삭제하는 상시 청소부.
//
// v1 의 결함 두 개를 고친다.
//  (1) "백필이 100% 끝나야 청소" 가드 — 일회성 대청소엔 맞았지만 상시 청소부엔 틀렸다.
//      워치·트렌드 스캔이 IG URL 행을 계속 만들어내서 pending 은 사실상 0 이 되지 않고,
//      그 결과 청소부가 영영 돌지 못했다. 가드를 없애는 대신, 아직 IG URL 을 들고 있는
//      행의 "미래 캐시 대상"(post/{sc}.jpg, trend/{sc}.jpg)도 shortcode 로 보호한다.
//      그러면 pending 과 무관하게 안전하다.
//  (2) PostgREST 는 한 번에 1,000행만 준다. 페이지네이션이 없어 참조 집합이 불완전했고,
//      48h 유예가 풀리면 멀쩡한 썸네일을 고아로 오인할 수 있었다. range() 로 전량 읽는다.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUP = Deno.env.get("SUPABASE_URL") ?? "";
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = "chr_thumbsweep_4f7c1b90";
const BUCKET = "thumbnails";
const GRACE_HOURS = 48;
const MAX_DELETE = 2000;
const PAGE = 1000;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret" };

// URL 로 참조하는 테이블
const REF_TABLES: Array<[string, string]> = [
  ["trend_feed", "thumbnail_url"],
  ["watch_feed", "thumbnail_url"],
  ["saved_briefs", "thumbnail_url"],
  ["saved_trends", "thumbnail_url"],
  ["home_showcase", "thumb_url"],
  ["events", "thumbnail_url"],
];
// shortcode 를 가진 테이블 — 아직 IG URL 이어도 미래 캐시 대상을 보호
const SC_TABLES = ["trend_feed", "watch_feed", "saved_briefs", "saved_trends"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.headers.get("x-cron-secret") !== CRON_SECRET) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUP, SVC);
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const referenced = new Set<string>();

  // 1) URL 기반 참조 (전량 페이지네이션)
  for (const [table, col] of REF_TABLES) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin.from(table).select(col)
        .ilike(col, "%/" + BUCKET + "/%").range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const r of data) {
        const u = String((r as Record<string, unknown>)[col] ?? "");
        const i = u.indexOf("/" + BUCKET + "/");
        if (i < 0) continue;
        const name = decodeURIComponent(u.slice(i + BUCKET.length + 2).split("?")[0]);
        if (name) referenced.add(name);
      }
      if (data.length < PAGE) break;
    }
  }

  // 2) shortcode 기반 보호 (아직 IG URL 인 행 포함)
  let scCount = 0;
  for (const table of SC_TABLES) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin.from(table).select("shortcode")
        .not("shortcode", "is", null).range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const r of data) {
        const sc = String((r as Record<string, unknown>).shortcode ?? "");
        if (!sc) continue;
        referenced.add("post/" + sc + ".jpg");
        referenced.add("trend/" + sc + ".jpg");
        scCount++;
      }
      if (data.length < PAGE) break;
    }
  }

  if (referenced.size === 0) return json({ error: "referenced set empty - aborting" }, 500);

  // 3) 순회하며 고아 수집
  const cutoff = Date.now() - GRACE_HOURS * 3600 * 1000;
  const toDelete: string[] = [];
  let scanned = 0, skippedFresh = 0, more = false;

  for (const prefix of ["", "post", "trend"]) {
    let offset = 0;
    for (;;) {
      const { data: objs, error } = await admin.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
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
      if (more || objs.length < PAGE) break;
      offset += PAGE;
    }
    if (more) break;
  }

  if (dry) return json({ ok: true, dry: true, scanned, refs: referenced.size, shortcodes: scCount, would_delete: toDelete.length, skippedFresh, more, sample: toDelete.slice(0, 5) });

  let deleted = 0;
  const errors: string[] = [];
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const { error } = await admin.storage.from(BUCKET).remove(batch);
    if (error) errors.push(error.message); else deleted += batch.length;
  }

  return json({ ok: true, scanned, deleted, skippedFresh, more, refs: referenced.size, shortcodes: scCount, errors: errors.slice(0, 3) });
});
