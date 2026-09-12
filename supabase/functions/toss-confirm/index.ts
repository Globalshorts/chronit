import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const SALE: Record<string, number> = { starter: 29000, pro: 49000, master: 79000, finds30: 9900, finds100: 19900, finds300: 29900, pack10: 4900, pack30: 12900, pack100: 34900, render10: 10900, render30: 26900, render60: 49900 };
const DAYS: Record<string, number> = { starter: 30, pro: 30, master: 30, pkg6: 180, finds30: 30, finds100: 30, finds300: 30 };
const PACK: Record<string, number> = { pack10: 10, pack30: 30, pack100: 100 };
const RENDERPACK: Record<string, number> = { render10: 10, render30: 30, render60: 60 };
const FINDS = new Set(["finds30", "finds100", "finds300"]);

async function getSecret(admin: any, key: string): Promise<string> {
  const { data } = await admin.from("app_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? Deno.env.get(key) ?? "";
}

// 지급 분기: 렌더팩 → render_credits / 단건팩 → bonus / Finds구독 → 월이용권 / 레거시 → 기존 grant
async function grant(admin: any, plan: string, userId: string, amount: number, period = "monthly") {
  if (RENDERPACK[plan]) { const { error } = await admin.rpc("grant_render_pack_rpc", { p_user: userId, p_amount: RENDERPACK[plan] }); return error; }
  if (PACK[plan]) { const { error } = await admin.rpc("grant_finds_pack_rpc", { p_user: userId, p_amount: PACK[plan] }); return error; }
  if (FINDS.has(plan)) { const { error } = await admin.rpc("grant_finds_sub_rpc", { p_user: userId, p_plan: plan, p_days: period === "annual" ? 365 : (DAYS[plan] ?? 30), p_amount: amount, p_period: period }); return error; }
  const grantPlan = plan === "pkg6" ? "pro" : plan;
  const { error } = await admin.rpc("admin_grant_subscription_rpc", { p_target_user_id: userId, p_plan: grantPlan, p_days: DAYS[plan] ?? 30, p_amount: amount });
  return error;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const authH = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authH } } });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: "로그인 필요" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const b = await req.json();

    // ── 구독 취소(자동갱신 중단) ──
    if (b.mode === "cancel_sub") {
      const { data, error } = await admin.rpc("cancel_finds_sub_rpc", { p_user: user.id });
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true, ...(data ?? {}) });
    }

    // ── 정기결제(빌링) 카드등록 + 첫 청구 ──
    if (b.mode === "billing") {
      const billingSecret = await getSecret(admin, "TOSS_BILLING_SECRET_KEY");
      if (!billingSecret) return json({ error: "TOSS_BILLING_SECRET_KEY 미설정" }, 500);
      const billingBasic = "Basic " + btoa(billingSecret + ":");
      const customerKey = String(b.customerKey ?? "");

      const r = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
        method: "POST", headers: { Authorization: billingBasic, "Content-Type": "application/json" },
        body: JSON.stringify({ authKey: String(b.authKey ?? ""), customerKey }),
      });
      const d = await r.json();
      if (!r.ok) return json({ ok: false, error: d.message ?? "빌링키 발급 실패", code: d.code }, 400);
      const billingKey = d.billingKey;
      await admin.from("toss_billing").upsert({ user_id: user.id, customer_key: customerKey, billing_key: billingKey, card: d.card ?? {}, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

      const plan = String(b.plan ?? "").trim();
      const period = b.period === "annual" ? "annual" : "monthly";
      let amount = SALE[plan];
      if (!plan || !amount) {
        return json({ ok: true, mode: "billing", charged: false, message: "정기결제 카드가 등록되었어요." });
      }
      if (FINDS.has(plan) && period === "annual") amount = SALE[plan] * 9;
      // 첫 달 할인 없음 — 항상 정상가로 청구한다.
      // 첫 달 무료는 결제가 아니라 강사·프로모 코드 사용(plan_codes / coupon_codes)으로만 적용된다.
      const orderId = `billing_${plan}_${user.id.slice(0, 8)}_${Date.now()}`;
      const orderName = `크로닛 ${plan}${period === "annual" ? " (연간)" : ""}`;
      const cr = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
        method: "POST", headers: { Authorization: billingBasic, "Content-Type": "application/json" },
        body: JSON.stringify({ customerKey, amount, orderId, orderName, customerEmail: user.email ?? undefined }),
      });
      const cd = await cr.json();
      if (!cr.ok) return json({ ok: false, mode: "billing", registered: true, error: cd.message ?? "정기결제 청구 실패", code: cd.code }, 400);

      await admin.from("toss_orders").upsert({ order_id: orderId, user_id: user.id, plan, amount, payment_key: cd.paymentKey ?? billingKey, status: "confirmed", raw: cd }, { onConflict: "order_id" });
      const ge = await grant(admin, plan, user.id, amount, period);
      if (ge) return json({ ok: true, mode: "billing", charged: true, granted: false, warn: "결제는 됐으나 지급 오류: " + ge.message });
      return json({ ok: true, mode: "billing", charged: true, plan, period, message: period === "annual" ? "연간 구독이 완료되었어요 (이용권은 매월 충전돼요)." : "정기결제가 완료되어 이용권이 지급되었어요." });
    }

    // ── 일반결제 승인(단건: Finds팩/렌더팩/구독 1회) ──
    const secret = await getSecret(admin, "TOSS_SECRET_KEY");
    if (!secret) return json({ error: "TOSS_SECRET_KEY 미설정" }, 500);
    const basic = "Basic " + btoa(secret + ":");

    const orderId = String(b.orderId ?? "");
    const paymentKey = String(b.paymentKey ?? "");
    const amount = Number(b.amount ?? 0);
    const plan = (orderId.split("_")[1] ?? "").trim();
    if (!orderId || !paymentKey || !amount || !plan) return json({ error: "파라미터 누락" }, 400);

    const { data: existing } = await admin.from("toss_orders").select("status").eq("order_id", orderId).maybeSingle();
    if (existing?.status === "confirmed") return json({ ok: true, already: true, message: "이미 처리된 결제예요." });

    let expected = SALE[plan];
    if (plan === "pkg6") { const { data: sp } = await admin.from("site_settings").select("value").eq("key", "pkg6_sale_price").maybeSingle(); expected = Number(sp?.value) || 249000; }
    if (!expected || amount !== expected) return json({ error: `금액 불일치 (plan ${plan}, amount ${amount}, expected ${expected})` }, 400);

    const r = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST", headers: { Authorization: basic, "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const d = await r.json();
    if (!r.ok) return json({ ok: false, error: d.message ?? "승인 실패", code: d.code }, 400);

    await admin.from("toss_orders").upsert({ order_id: orderId, user_id: user.id, plan, amount, payment_key: paymentKey, status: "confirmed", raw: d }, { onConflict: "order_id" });
    const ge = await grant(admin, plan, user.id, amount);
    if (ge) return json({ ok: true, granted: false, warn: "결제는 승인됐으나 지급 오류: " + ge.message });
    return json({ ok: true, mode: "confirm", plan, message: "결제가 완료되어 이용권이 지급되었어요." });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
