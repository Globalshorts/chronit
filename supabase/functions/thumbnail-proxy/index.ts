/**
 * thumbnail-proxy v5
 * CDN 이미지를 Referer로 fetch → Supabase Storage에 캐시.
 *
 * v5: 캐시 키를 "URL 해시" → "shortcode"로 변경.
 *   v4까지는 key = SHA-256(이미지 URL 전체)였는데, 인스타 CDN URL에는 oe/oh/_nc_ohc 등
 *   서명·만료 파라미터가 붙고 갱신될 때마다 값이 바뀐다. 그래서 같은 사진이라도 URL이
 *   재발급되면 해시가 달라져 새 파일이 계속 쌓였다(축출도 없어 루트에 12,000개/927MB).
 *   shortcode는 게시물당 불변이므로 post/{sc}.jpg 한 경로에 덮어쓰면 중복이 생기지 않고,
 *   trend-thumb-cache 처럼 "피드에 없는 것 = 고아" 식의 참조 기반 정리도 가능해진다.
 *
 *   sc 가 없는 호출(리서치 검색 결과 등 shortcode 없는 클립)은 종전대로 URL 해시를 쓴다.
 *   이쪽은 휘발성이라 별도 TTL 정리 대상.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const BUCKET = "thumbnails";

// shortcode 위생 검사 — 경로 조작(../)과 예상 밖 문자를 막는다.
const SC_RE = /^[A-Za-z0-9_-]{5,64}$/;

async function urlHashKey(url: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("") + ".jpg";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url") ?? "";
  const sc = (searchParams.get("sc") ?? "").trim();
  if (!imageUrl || !imageUrl.startsWith("http"))
    return new Response("url required", { status: 400, headers: cors });

  const key = SC_RE.test(sc) ? `post/${sc}.jpg` : await urlHashKey(imageUrl);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // 1) Storage 캐시 확인
  const { data: existing } = admin.storage.from(BUCKET).getPublicUrl(key);
  if (existing?.publicUrl) {
    try {
      const headResp = await fetch(existing.publicUrl, { method: "HEAD" });
      if (headResp.ok) {
        return new Response(null, { status: 302, headers: { ...cors, "Location": existing.publicUrl, "Cache-Control": "public, max-age=86400" } });
      }
    } catch { /* 없으면 새로 fetch */ }
  }

  // 2) CDN에서 fetch (Referer 포함)
  const lu = imageUrl.toLowerCase();
  const referer = lu.includes("tiktok") ? "https://www.tiktok.com/"
    : lu.includes("instagram") || lu.includes("fbcdn") ? "https://www.instagram.com/"
    : lu.includes("ytimg") ? "https://www.youtube.com/"
    : "https://www.tiktok.com/";

  try {
    const resp = await fetch(imageUrl, {
      headers: {
        "Referer": referer,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0",
      },
    });
    if (!resp.ok) {
      return new Response(`upstream ${resp.status}`, { status: resp.status, headers: cors });
    }
    const body = await resp.arrayBuffer();
    const contentType = resp.headers.get("content-type") ?? "image/jpeg";

    admin.storage.from(BUCKET).upload(key, body, {
      contentType, cacheControl: "86400", upsert: true,
    }).catch(() => {});

    return new Response(body, {
      headers: { ...cors, "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
    });
  } catch (err) {
    return new Response(String(err), { status: 500, headers: cors });
  }
});
