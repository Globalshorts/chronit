/**
 * search-clips v71 — 프론트가 원본 URL 대신 shortcode 를 보낼 수 있게 (source_url 은 계속 지원).
 * v70 — 학습 부스트(검증된 검색어 얇기) 추가. 원칙 기반 쿼리 + IDF 랭킹 유지.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_TOKEN") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const LIMIT_PER = 80;
const PER_Q = 10;
const N_QUERIES = 5;
const HANGUL = /[가-힣]/;

/**
 * 프론트는 원본 URL 을 들고 있지 않다(카드 payload 에서 뺐다) — shortcode 만 보낸다.
 * 여기서 인스타 주소를 복원한다. 예전 클라이언트가 보내는 source_url 도 그대로 받는다.
 */
function resolveSourceUrl(body: any): string {
  const direct = String(body?.source_url ?? "").trim();
  if (direct) return direct;
  const sc = String(body?.shortcode ?? "").trim();
  if (/^[A-Za-z0-9_-]{5,30}$/.test(sc)) return `https://www.instagram.com/reel/${sc}/`;
  return "";
}

let _cachedVersion: string | null = null;
let _cachedAt = 0;
const VERSION_TTL = 5 * 60 * 1000;
let _cachedTikhub: string | null = null;

async function getTikhub(admin: any): Promise<string> {
  if (_cachedTikhub !== null) return _cachedTikhub;
  try {
    const { data } = await admin.from("app_config").select("value").eq("key", "TIKHUB_API_KEY").maybeSingle();
    _cachedTikhub = data?.value ?? "";
  } catch { _cachedTikhub = ""; }
  return _cachedTikhub;
}

let _expPct: number | null = null; let _expPctAt = 0;
async function getExpPct(admin: any): Promise<number> {
  if (_expPct !== null && Date.now() - _expPctAt < 60000) return _expPct;
  try {
    const { data } = await admin.from("app_config").select("value").eq("key", "EXP_QUERY_PCT").maybeSingle();
    _expPct = Number(data?.value ?? "0") || 0;
  } catch { _expPct = 0; }
  _expPctAt = Date.now();
  return _expPct;
}
function pickAnalysisImage(a: any): string {
  const cands: any[] = [];
  for (const k of ["reference_frames","frames","key_frames","frame_urls","images"]) { const v = a[k]; if (Array.isArray(v)) cands.push(...v); else if (v) cands.push(v); }
  for (const k of ["product_image","poster_url","image","thumbnail","frame"]) { if (a[k]) cands.push(a[k]); }
  for (let e of cands) { if (e && typeof e === "object") e = e.url || e.image || e.src || ""; if (typeof e !== "string" || !e) continue; if (e.startsWith("http")) return e; if (e.startsWith("data:image")) return e; if (e.length > 200 && /^[A-Za-z0-9+/=]{200,}/.test(e.slice(0,400))) return "data:image/jpeg;base64," + e; }
  return "";
}
async function expExpandQueries(product: string, image: string, metaText: string): Promise<{ identity: string; queries: string[] }> {
  if (!OPENAI_API_KEY) return { identity: "", queries: [] };
  const sys = [
    "너는 실제 쇼핑객처럼 사고하는 상품 검색 전문가다.",
    "상품 메타와 생김새(이미지)를 함께 보고 상품의 정체를 파악한 뒤, 해외 쇼폼(틱톡)을 찾을 영어 검색어를 만든다.",
    "절차를 반드시 지켜라. (1) 이 상품을 다른 상품과 구별짓는 '가장 대표적인 특징'을 2~3개 먼저 정한다. 특징이란 형태(form factor), 설치·장착·작동 방식, 핵심 기능/용도를 말한다. (2) 그 대표 특징들을 조합해 검색어를 만든다. 가장 눈에 띄는 특징이 검색어의 중심이 되어야 한다.",
    "핵심 원칙: 사전식 직역을 하지 마라. 한국어 단어를 그대로 옮기지 말고, 그 특징을 가진 상품을 실제 틱톡/틱톡샵 셀러와 쇼핑객이 검색창에 어떻게 치는지를 떠올려 그 구어체 표현으로 써라. 논문·카탈로그체 용어는 검색이 되지 않는다.",
    "설치·장착·작동 방식이 그 상품의 대표 특징이라면 반드시 그 방식을 검색어에 반영하라. 크기·색 같은 형용사만으로는 검색이 좁혀지지 않는다.",
    "브랜드 로고/이름이 이미지에 명확히 보이면 검색어 앞에 브랜드+상품 1~2개를 넣고, 명확하지 않으면 브랜드 추측은 하지 마라.",
    "한국어 금지, 영어만. 각 검색어는 2~4단어로 짧게. 넓은 검색어부터 좁은 검색어 순으로.",
  ].join("\n");
  const usr = [
    "상품명(메타): " + (product || "(없음)"),
    metaText ? ("캡션/용도: " + metaText) : "",
    "먼저 이 상품의 대표 특징 2~3개를 스스로 정한 뒤, identity(한 줄 영어: 대표 특징을 담은 상품 정체)와 영어 검색어 5~7개를 만들어라.",
    "JSON만: {\"identity\":\"..\",\"queries\":[\"..\"]}",
  ].filter(Boolean).join("\n");
  const content: any[] = [{ type: "text", text: usr }];
  if (image) content.push({ type: "image_url", image_url: { url: image, detail: "high" } });
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o", temperature: 0.4, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content }] }),
    });
    const d = await r.json();
    const obj = JSON.parse(d.choices?.[0]?.message?.content ?? "{}");
    const qs = Array.isArray(obj.queries) ? obj.queries.filter((x: any) => typeof x === "string" && x.trim() && !HANGUL.test(x)) : [];
    return { identity: String(obj.identity ?? ""), queries: qs.slice(0, 6) };
  } catch { return { identity: "", queries: [] }; }
}
function withTimeout(p: Promise<any>, ms: number): Promise<any> {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("exp_timeout")), ms))]);
}
function rankBySameProduct(clips: any[], identity: string, productName: string, queries: string[]): any[] {
  if (!Array.isArray(clips) || clips.length < 2) return clips;
  const stop = new Set(["the","a","an","for","with","and","to","of","in","on","your","you","that","this","best","new","small","mini","big","large","home","house","cute","tiktok","viral","tiktokmademebuyit"]);
  const src = [identity || "", productName || "", ...(queries || [])].join(" ").toLowerCase();
  const terms = Array.from(new Set(src.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !stop.has(w))));
  if (!terms.length) return clips;
  const titles = clips.map((c) => String(c?.title || "").toLowerCase());
  const N = titles.length;
  const weight: Record<string, number> = {};
  for (const w of terms) { let df = 0; for (const t of titles) if (t.includes(w)) df++; weight[w] = Math.log((N + 1) / (1 + df)); }
  const score = (t: string) => { let s = 0; for (const w of terms) if (t.includes(w)) s += weight[w]; return s; };
  return clips.map((c, i) => ({ c, i, s: score(titles[i]) })).sort((a, b) => (b.s - a.s) || (a.i - b.i)).map((x) => x.c);
}
async function logSearchForLearning(admin: any, userId: string, sourceUrl: string, result: any): Promise<void> {
  try {
    if (!result || !result.exp_identity || !Array.isArray(result.clips)) return;
    const qmap: Record<string, string[]> = {};
    const qtitles: Record<string, string[]> = {};
    for (const c of result.clips) {
      const q = c && c._q; if (!q) continue;
      (qmap[q] = qmap[q] || []).push(String(c.video_id));
      if (c.title) (qtitles[q] = qtitles[q] || []).push(String(c.title));
    }
    if (!Object.keys(qmap).length) return;
    await admin.from("exp_search_log").insert({ user_id: userId, source_url: sourceUrl || "", identity: result.exp_identity, qmap, qtitles });
  } catch (_) {}
}

async function getLatestVersion(): Promise<string> {
  if (_cachedVersion && Date.now() - _cachedAt < VERSION_TTL) return _cachedVersion;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await fetch(
        "https://api.replicate.com/v1/models/globalshorts/chronit/versions",
        { headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }, signal: AbortSignal.timeout(8000) }
      );
      const data = await resp.json();
      const ver = data?.results?.[0]?.id;
      if (ver) { _cachedVersion = ver; _cachedAt = Date.now(); return ver; }
    } catch (e) {
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error("버전 조회 실패");
}

async function parseJsonOutput(raw: any): Promise<any> {
  try {
    if (typeof raw === "string" && raw.startsWith("http")) return await (await fetch(raw)).json();
    if (typeof raw === "string") return JSON.parse(raw);
    return raw ?? {};
  } catch { return {}; }
}

function pickProductMeta(analysis: any): { product_name: string; keyword: string; keywords: string[] } {
  const pn = String(analysis.product_name ?? "").trim();
  const krNoun = String(analysis.caption_korean_noun ?? "").trim();
  const krKws = (analysis.caption_keywords ?? []).map((x: any) => String(x).trim()).filter((k: string) => k && HANGUL.test(k));
  const kws: string[] = [];
  const push = (k: string) => { if (k && !kws.includes(k)) kws.push(k); };
  if (krNoun && HANGUL.test(krNoun)) push(krNoun);
  krKws.forEach(push);
  if (pn && HANGUL.test(pn)) push(pn);
  const keywords = kws.slice(0, 4);
  return { product_name: pn, keyword: keywords[0] || pn || "", keywords };
}

async function refineEnglish(pn: string, uc: string, qs: string[]): Promise<string[]> {
  if (!OPENAI_API_KEY) return [];
  const sys = "You generate short English TikTok search queries to find b-roll of a product. First identify the 2-3 most defining features of the product (form factor, install/mount/operation method, core function). Then write how real TikTok shoppers/sellers actually search for such a product — NOT a dictionary translation of the Korean words. If the install/mount/operation method is a defining feature, it must appear in the queries. English only, 2-4 words each.";
  const usr = [
    "Product info (may be Korean):",
    `- product name: ${pn || "(unknown)"}`,
    `- use case: ${uc || "(unknown)"}`,
    `- reference terms: ${(qs || []).join(", ")}`,
    "",
    "Give 3 short ENGLISH TikTok search queries. No Korean. JSON only: {\"queries\": [\"...\"]}",
  ].join("\n");
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.3, messages: [{ role: "system", content: sys }, { role: "user", content: usr }], response_format: { type: "json_object" } }),
    });
    const d = await r.json();
    const obj = JSON.parse(d.choices?.[0]?.message?.content ?? "{}");
    const ks = Array.isArray(obj.queries) ? obj.queries.filter((x: any) => typeof x === "string" && x.trim() && !HANGUL.test(x)) : [];
    return ks.slice(0, 3);
  } catch { return []; }
}

async function refineKorean(pn: string, uc: string, qs: string[]): Promise<string[]> {
  if (!OPENAI_API_KEY) return [];
  const sys = "너는 한국 쇼핑 영상 정보를 보고 쿠팡에서 그 상품을 찾기 위한 한국어 검색 키워드를 뽑는 전문가다.";
  const usr = [
    "영상 분석 결과:",
    `- 추정 상품명: ${pn || "(없음)"}`,
    `- 용도: ${uc || "(없음)"}`,
    `- 참고 검색어: ${(qs || []).join(", ")}`,
    "",
    "이 상품을 쿠팡에서 검색할 한국어 키워드 2~4개를 만들어라. JSON만: {\"keywords\": [\"...\"]}",
  ].join("\n");
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.2, messages: [{ role: "system", content: sys }, { role: "user", content: usr }], response_format: { type: "json_object" } }),
    });
    const d = await r.json();
    const obj = JSON.parse(d.choices?.[0]?.message?.content ?? "{}");
    const ks = Array.isArray(obj.keywords) ? obj.keywords.filter((x: any) => typeof x === "string" && x.trim()) : [];
    return ks.slice(0, 4);
  } catch { return []; }
}

async function finalizeAnalysis(analysis: any, admin?: any, skipSearch = false): Promise<any> {
  const rawQueries: string[] = analysis.tiktok_queries?.length ? analysis.tiktok_queries : (analysis.queries ?? []);
  const referenceFrames: string[] = analysis.reference_frames ?? [];
  const meta = pickProductMeta(analysis);

  let queries: string[] = rawQueries.filter((q: string) => !HANGUL.test(q));
  if (queries.length === 0) {
    const koNoun = (meta.keyword && HANGUL.test(meta.keyword)) ? meta.keyword
                 : (analysis.caption_korean_noun && HANGUL.test(String(analysis.caption_korean_noun))) ? String(analysis.caption_korean_noun) : "";
    if (koNoun) {
      try { const en = await refineEnglish(koNoun, analysis.use_case ?? "", meta.keywords); if (en.length) queries = en; } catch (_) {}
    }
  }

  const needKr = (!meta.keyword || !HANGUL.test(meta.keyword));
  if (needKr && (rawQueries.length || meta.product_name || (analysis.use_case ?? ""))) {
    try {
      const kr = await refineKorean(meta.product_name, analysis.use_case ?? "", rawQueries);
      if (kr.length) { meta.keyword = kr[0]; meta.keywords = kr; if (!meta.product_name) meta.product_name = kr[0]; }
    } catch (_) {}
  }

  let identity = "";
  if (admin) {
    try {
      const pct = await getExpPct(admin);
      if (pct > 0 && Math.random() * 100 < pct) {
        const img = pickAnalysisImage(analysis);
        const metaText = [analysis.caption_korean_noun, (analysis.caption_keywords ?? []).join(" "), analysis.use_case].filter(Boolean).join(" ").slice(0, 300);
        const ex = await withTimeout(expExpandQueries(meta.product_name, img, metaText), 9000);
        const expQ = (ex && Array.isArray(ex.queries)) ? ex.queries.filter((q: string) => q && !HANGUL.test(q)) : [];
        if (expQ.length >= 2) {
          const orig = queries;
          const seen = new Set<string>();
          const merged: string[] = [];
          const add = (q: string) => { const k = String(q).trim().toLowerCase(); if (q && !seen.has(k)) { seen.add(k); merged.push(q); } };
          expQ.slice(0, 3).forEach(add);
          orig.slice(0, 2).forEach(add);
          expQ.forEach(add); orig.forEach(add);
          queries = merged.slice(0, N_QUERIES);
          identity = String(ex.identity ?? "");
        }
      }
    } catch (_) {}
  }

  // 학습 부스트: 과거에 유저가 실제로 담은(adds) 검증된 검색어를 얇는다(신선 검색어는 유지).
  if (admin && queries.length) {
    try {
      const { data: boost } = await admin.rpc("exp_boost_queries_rpc", { p_sig: identity || "", p_product: meta.product_name || "", p_limit: 2 });
      const proven = Array.isArray(boost) ? boost.filter((q: any) => typeof q === "string" && q.trim() && !HANGUL.test(q)) : [];
      if (proven.length) {
        const provenSet = new Set(proven.map((q: string) => q.toLowerCase()));
        const fresh = queries.filter((q) => !provenSet.has(q.toLowerCase()));
        queries = [...fresh.slice(0, Math.max(1, N_QUERIES - proven.length)), ...proven].slice(0, N_QUERIES);
      }
    } catch (_) {}
  }

  let clips: any[] = [];
  if (!skipSearch && queries.length) {
    const TIKHUB = admin ? await getTikhub(admin) : "";
    clips = await searchAll(queries, LIMIT_PER, TIKHUB);
  }
  clips = rankBySameProduct(clips, identity, meta.product_name, queries);
  if (identity) clips = clips.map((c: any) => ({ ...c, _sig: identity }));
  return { clips, reference_frames: referenceFrames, tiktok_queries: queries, exp_identity: identity, source_video_url: analysis.source_video_url ?? "", ...meta };
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const J = (obj: any, s = 200) => new Response(JSON.stringify(obj), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let supabaseRef: any = null;
  let charged = false;
  const refund = async () => {
    if (!charged || !supabaseRef) return;
    charged = false;
    try { await supabaseRef.rpc("refund_credits_rpc", { p_amount: 0, p_action: "analysis_refund" }); } catch (_) {}
  };

  try {
    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    supabaseRef = supabase;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return J({ error: "로그인 필요" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const TIKHUB = await getTikhub(admin);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "search_tiktok") {
      const queries = Array.isArray(body?.queries) ? body.queries.filter((q: any) => typeof q === "string" && q.trim()) : [];
      if (!queries.length) return J({ ok: true, clips: [] });
      let clips = await searchAll(queries, LIMIT_PER, TIKHUB);
      clips = rankBySameProduct(clips, String(body?.identity ?? ""), String(body?.product_name ?? ""), queries);
      return J({ ok: true, clips });
    }

    if (action === "submit") {
      const source_url = resolveSourceUrl(body);
      if (!source_url) return J({ error: "source_url 또는 shortcode 필수" }, 400);
      const { data: charge } = await supabase.rpc("charge_analysis_rpc", { p_cost: 0 });
      if (!charge?.ok) return J({ error: charge?.error ?? "구독이 필요합니다", code: "INSUFFICIENT_CREDITS", balance: charge?.balance ?? null }, 402);
      const VERSION = await getLatestVersion();
      const predResp = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: { "Authorization": `Token ${REPLICATE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ version: VERSION, input: { mode: "analyze_only", source_url, openai_api_key: OPENAI_API_KEY, tikhub_api_key: TIKHUB } }),
      });
      const pred = await predResp.json();
      if (pred.error || !pred.id) return J({ error: pred.error ?? "분석 시작 실패" }, 502);
      return J({ ok: true, prediction_id: pred.id, balance: charge.balance });
    }

    if (action === "poll") {
      const pid = body?.prediction_id;
      if (!pid) return J({ error: "prediction_id 필수" }, 400);
      const poll = await (await fetch(`https://api.replicate.com/v1/predictions/${pid}`,
        { headers: { "Authorization": `Token ${REPLICATE_API_KEY}` } })).json();
      const st = poll?.status;
      if (st === "succeeded") {
        const analysis = await parseJsonOutput(poll.output);
        const result = await finalizeAnalysis(analysis, admin, !!body?.no_search);
        await logSearchForLearning(admin, user.id, poll?.input?.source_url ?? "", result);
        return J({ ok: true, status: "done", ...result });
      }
      if (st === "failed" || st === "canceled") {
        return J({ ok: false, status: "failed", error: poll?.error ?? "분석에 실패했어요. 다시 시도해 주세요." });
      }
      return J({ ok: true, status: "processing" });
    }

    const source_url = resolveSourceUrl(body);
    if (!source_url) return J({ error: "source_url 또는 shortcode 필수" }, 400);
    const { data: charge } = await supabase.rpc("charge_analysis_rpc", { p_cost: 0 });
    if (!charge?.ok) return J({ error: charge?.error ?? "구독이 필요합니다", code: "INSUFFICIENT_CREDITS", balance: charge?.balance ?? null }, 402);
    const VERSION = await getLatestVersion();
    const predResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { "Authorization": `Token ${REPLICATE_API_KEY}`, "Content-Type": "application/json", "Prefer": "wait=60" },
      body: JSON.stringify({ version: VERSION, input: { mode: "analyze_only", source_url, openai_api_key: OPENAI_API_KEY, tikhub_api_key: TIKHUB } }),
    });
    const pred = await predResp.json();
    if (pred.error || !pred.id) throw new Error(pred.error ?? "prediction 실패");
    let analysis: any = {};
    if (pred.status === "succeeded") {
      analysis = await parseJsonOutput(pred.output);
    } else if (pred.status === "failed" || pred.status === "canceled") {
      throw new Error(pred.error ?? `prediction ${pred.status}`);
    } else {
      const start = Date.now();
      while (Date.now() - start < 120_000) {
        await new Promise(r => setTimeout(r, 1000));
        const poll = await (await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`,
          { headers: { "Authorization": `Token ${REPLICATE_API_KEY}` } })).json();
        if (poll.status === "succeeded") { analysis = await parseJsonOutput(poll.output); break; }
        if (poll.status === "failed" || poll.status === "canceled") throw new Error(poll.error ?? `prediction ${poll.status}`);
      }
    }
    const result = await finalizeAnalysis(analysis, admin);
    await logSearchForLearning(admin, user.id, source_url, result);
    return J({ ok: true, balance: charge.balance, ...result });

  } catch (err) {
    await refund();
    console.error("[search-clips] error:", String(err));
    return J({ error: String(err) }, 500);
  }
});

async function searchAll(queries: string[], limitPer: number, tikhubKey: string): Promise<any[]> {
  const qs = queries.slice(0, N_QUERIES);
  const settled = await Promise.allSettled(qs.map((q) => searchTikTokSingle(q, PER_Q, tikhubKey)));
  const map = new Map<string, { item: any; hits: number; minQi: number; firstRank: number; q: string }>();
  settled.forEach((s, qi) => {
    if (s.status !== "fulfilled") return;
    s.value.forEach((item: any, idx: number) => {
      if (!item.video_id) return;
      const e = map.get(item.video_id);
      if (e) {
        e.hits += 1;
        if (qi < e.minQi) { e.minQi = qi; e.firstRank = qi * 1000 + idx; e.q = qs[qi]; }
      } else {
        map.set(item.video_id, { item, hits: 1, minQi: qi, firstRank: qi * 1000 + idx, q: qs[qi] });
      }
    });
  });
  const arr = [...map.values()];
  arr.sort((a, b) => (a.minQi - b.minQi) || (b.hits - a.hits) || (a.firstRank - b.firstRank));
  return arr.slice(0, limitPer).map((e) => ({ ...e.item, _q: e.q }));
}

async function searchTikTokSingle(query: string, limit: number, tikhubKey: string): Promise<any[]> {
  if (!tikhubKey) return [];
  const url = `https://api.tikhub.io/api/v1/tiktok/app/v3/fetch_video_search_result?keyword=${encodeURIComponent(query)}&offset=0&count=${limit}&sort_type=0&publish_time=0`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${tikhubKey}` }, signal: AbortSignal.timeout(15000) });
      if (!resp.ok) {
        if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      const data = await resp.json();
      const list = data?.data?.search_item_list || [];
      const results: any[] = [];
      for (const it of list) {
        const norm = normalizeTiktokItem(it?.aweme_info);
        if (norm) results.push(norm);
      }
      return results.filter((r: any) => !HANGUL.test(r.title || "") && !HANGUL.test(r.author || ""));
    } catch { if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); }
  }
  return [];
}

function normalizeTiktokItem(ai: any): any | null {
  if (!ai || typeof ai !== "object") return null;
  const vid = String(ai.aweme_id || "");
  if (!vid) return null;
  const v = ai.video || {};
  const author = ai.author || {};
  const uid = String(author.unique_id || author.uid || "");
  const nickname = String(author.nickname || uid || "");
  const urlOf = (x: any) => (x && Array.isArray(x.url_list) && x.url_list[0]) ? x.url_list[0] : "";
  const cover = urlOf(v.cover) || urlOf(v.origin_cover) || urlOf(v.dynamic_cover);
  let dl = ""; let dlH = 0;
  if (Array.isArray(v.bit_rate) && v.bit_rate.length) {
    let bestH = -1; let bestU = "";
    for (const br of v.bit_rate) {
      const pa = br?.play_addr; const uu = urlOf(pa); const h = Number(pa?.height || 0);
      if (uu && h >= bestH) { bestH = h; bestU = uu; }
    }
    if (bestU) { dl = bestU; dlH = bestH; }
  }
  if (!dl) dl = urlOf(v.play_addr) || urlOf(v.download_addr) || "";
  let dur = Number(v.duration || ai.duration || 0);
  try { dur = Math.floor(dur); if (dur > 3600) dur = Math.floor(dur / 1000); } catch { dur = 0; }
  if (!uid) return null;
  const st = ai.statistics || {};
  const view_count = Number(st.play_count ?? 0) || 0;
  const like_count = Number(st.digg_count ?? 0) || 0;
  const comment_count = Number(st.comment_count ?? 0) || 0;
  const pageUrl = `https://www.tiktok.com/@${uid}/video/${vid}`;
  return { video_id: vid, page_url: pageUrl, thumbnail_url: String(cover || ""), title: String(ai.desc || "").slice(0, 200), duration: dur, author: nickname.slice(0, 50), download_url: String(dl || ""), src_height: dlH, source: "tiktok", view_count, like_count, comment_count };
}
