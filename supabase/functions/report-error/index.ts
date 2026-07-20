import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// 크로닛 오류 리포트 → Resend로 승호에게 이메일 전송 (send-welcome과 동일 인프라 재사용)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || ""
const FROM = Deno.env.get("REPORT_FROM") || "크로닛 오류리포트 <help@chronit.kr>"
const TO = (Deno.env.get("REPORT_TO") || "help@chronit.kr").split(",").map((s) => s.trim()).filter(Boolean)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])) }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "content-type": "application/json" } })
  if (!RESEND_API_KEY) return json({ ok: false, error: "RESEND_API_KEY not set" }, 500)

  let b = {}
  try { b = await req.json() } catch (_) {}
  const message = String(b.message || "").slice(0, 2000)
  if (!message) return json({ ok: false, skipped: "no message" })

  const ctx = b.context || {}
  const source = String(b.source || "runtime")
  const row = (k, v) => `<tr><td style="color:#6B7280;padding:5px 10px;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:5px 10px">${v}</td></tr>`
  const html = `<div style="font-family:'Apple SD Gothic Neo',sans-serif;font-size:14px;line-height:1.7;color:#111;max-width:640px">
    <h2 style="margin:0 0 2px">⚠️ 크로닛 오류 리포트</h2>
    <p style="color:#6B7280;margin:0 0 14px;font-size:13px">유형 <b>${esc(source)}</b> · ${esc(ctx.ts || "")}</p>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;border:1px solid #eee;border-radius:8px">
      ${row("메시지", `<b>${esc(message)}</b>`)}
      ${row("사용자", `${esc(b.userEmail || "비로그인")}${b.userId ? " (" + esc(b.userId) + ")" : ""}`)}
      ${row("작업 ID", esc(ctx.jobId || "-"))}
      ${row("페이지", esc(ctx.url || "-"))}
      ${row("메모", esc(b.userMemo || "-"))}
      ${row("브라우저", `<span style="color:#9CA3AF;font-size:12px">${esc(ctx.userAgent || "-")}</span>`)}
    </table>
    ${b.stack ? `<p style="color:#6B7280;margin:14px 0 4px;font-size:13px">스택</p><pre style="background:#F3F4F6;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;overflow:auto">${esc(String(b.stack).slice(0, 4000))}</pre>` : ""}
  </div>`

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: TO, subject: `[크로닛 오류] ${source} — ${message.slice(0, 60)}`, html, reply_to: b.userEmail || undefined }),
  })
  const data = await r.json().catch(() => ({}))
  return json({ ok: r.ok, status: r.status, data })
})
