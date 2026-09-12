import React from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'
import { GRANT_PLANS, FINDS_PLANS, planLabel, normalizePlan } from '../lib/planLabels'

const SB = "https://oxygqtbdpnxxcgzwdlzi.supabase.co";
const FN = (n: string) => `${SB}/functions/v1/${n}`;

export default function AdminManage({ session }: { session: any }) {
  return <AdminView session={session} supabase={supabase} />;
}

function AdminView({ session, supabase }: { session: any; supabase: any }) {
  const [tab, setTab] = React.useState<"subs"|"coupons"|"reviews"|"payouts"|"api">("subs");
  const TABS = [
    { v:"subs",    label:"👑 구독 관리" },
    { v:"payouts", label:"🤝 파트너 현황" },
    { v:"api",     label:"🔌 API 잔량" },
  ] as const;
  return (
    <div>
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v as any)}
            className={`px-4 py-2.5 text-sm font-bold transition border-b-2 -mb-px ${tab===t.v?"text-[#0064FF] border-[#0064FF]":"text-gray-400 border-transparent hover:text-gray-900"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==="subs"    && <AdminSubsTab session={session} supabase={supabase} />}
      {tab==="payouts" && <AdminPartnersTab session={session} supabase={supabase} />}
      {tab==="api"     && <AdminApiTab session={session} />}
    </div>
  );
}

// ── 관리자: 외부 API 잔량 ──
function AdminApiTab({ session }: { session:any }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [checkedAt, setCheckedAt] = React.useState("");
  const load = React.useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const r = await fetch(FN("admin-api-balances"), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      if (!d.ok) { setErr(d.error || "조회 실패"); return; }
      setRows(d.providers || []);
      setCheckedAt(d.checked_at || "");
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }, [session]);
  React.useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">외부 API 제공자 잔량{checkedAt && ` · ${new Date(checkedAt).toLocaleString("ko-KR")}`}</p>
        <button onClick={load} disabled={loading}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50">
          {loading ? "조회 중…" : "↻ 새로고침"}
        </button>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((p) => (
          <div key={p.key} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">{p.label}</span>
              <span className={`text-xs font-bold ${p.ok ? "text-[#0064FF]" : "text-gray-300"}`}>●</span>
            </div>
            {p.ok ? (
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {p.unit === "$" ? "$" : ""}{Number(p.value).toLocaleString()}{p.unit === "자" ? " 자" : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-400">잔액 조회 불가</p>
            )}
            {p.detail && <p className="mt-1 text-xs text-gray-500">{p.detail}</p>}
            {p.note && <p className="mt-1 text-xs text-gray-400">{p.note}</p>}
            {p.dashboard && <a href={p.dashboard} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-[#0064FF] hover:underline">대시보드 ↗</a>}
          </div>
        ))}
        {!rows.length && !loading && !err && <p className="text-sm text-gray-400">데이터 없음</p>}
      </div>
    </div>
  );
}


// ── 관리자: 파트너 인원·요금제 현황 ──
// 레거시 정산(수수료율/상위 파트너 오버라이드/쿠폰 할인율) 패널을 대체한다. 정산·수수료는 표시하지 않는다.
function AdminPartnersTab({ session, supabase }: { session:any; supabase:any }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async ()=>{
    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase.rpc("admin_partner_overview");
      if (error) { setErr(error.message); setRows([]); }
      else if (data?.ok === false) { setErr(data.error || "권한 없음"); setRows([]); }
      else setRows(Array.isArray(data?.partners) ? data.partners : []);
    } catch (e:any) { setErr(String(e?.message||e)); setRows([]); }
    setLoading(false);
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const tot = rows.reduce((a:any,r:any)=>({
    total:a.total+(Number(r.total)||0), paid:a.paid+(Number(r.paid)||0), free:a.free+(Number(r.free)||0),
  }), {total:0,paid:0,free:0});

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">🤝 파트너 인원·요금제 현황</p>
        <div className="text-xs text-gray-500">
          파트너 {rows.length}명 · 총인원 {tot.total} · 유료 {tot.paid} · 무료 {tot.free}
          <button onClick={load} className="ml-3 rounded-lg border border-gray-200 px-2 py-1 hover:bg-gray-100">새로고침</button>
        </div>
      </div>
      <p className="mb-3 text-[11px] text-gray-400">각 파트너 코드로 들어온 회원 수와 현재 요금제입니다. 정산·수수료는 다루지 않습니다.</p>
      {err && <p className="mb-3 text-xs font-bold text-red-500">불러오기 실패: {err}</p>}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
              <th className="px-3 py-2.5 font-semibold">파트너</th>
              <th className="px-3 py-2.5 text-right font-semibold">총인원</th>
              <th className="px-3 py-2.5 text-right font-semibold">유료</th>
              <th className="px-3 py-2.5 text-right font-semibold">무료</th>
              <th className="px-3 py-2.5 text-right font-semibold">스탠다드</th>
              <th className="px-3 py-2.5 text-right font-semibold">프로</th>
              <th className="px-3 py-2.5 text-right font-semibold">비즈니스</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">불러오는 중...</td></tr>
            : rows.length===0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">파트너가 없어요.</td></tr>
            : rows.map((r:any)=>(
              <tr key={r.pid} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2.5">
                  <p className="font-bold text-gray-900">{r.nickname || "-"}</p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                </td>
                <td className="px-3 py-2.5 text-right font-bold text-gray-800">{r.total}</td>
                <td className="px-3 py-2.5 text-right font-bold text-[#0064FF]">{r.paid}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{r.free}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{r.standard}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{r.pro}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{r.business}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 관리자: 회원 팝업 안 '파트너로 지정 + 코드 발급' ──
// owner_email 은 선택한 회원 이메일로 자동 세팅되므로 입력창을 두지 않는다.
// 코드 사용 시 지급은 redeem_free_trial_rpc 가 처리한다
// (allowed_plans[0] = 요금제 → 이용권 개수 / value = 일수 → 유효기간).
function PartnerIssueBox({ selUser, supabase, onDone }: { selUser:any; supabase:any; onDone:()=>void }) {
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [plan, setPlan] = React.useState("finds100");
  const [days, setDays] = React.useState("30");
  const [maxUses, setMaxUses] = React.useState("");
  const [expires, setExpires] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg]   = React.useState<{ok:boolean;text:string}|null>(null);

  // 회원이 바뀌면 폼 초기화 + 이메일 앞부분으로 코드 추천
  React.useEffect(()=>{
    setOpen(false); setMsg(null); setBusy(false);
    setPlan("finds100"); setDays("30"); setMaxUses(""); setExpires("");
    setCode(selUser?.email ? String(selUser.email).split("@")[0].replace(/[^a-zA-Z0-9]/g,"").toUpperCase().slice(0,8) : "");
  }, [selUser?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const issue = async () => {
    const c = code.trim().toUpperCase();
    const email = selUser?.email;
    const d = Math.floor(Number(days) || 0);
    if (!email) { setMsg({ok:false,text:"회원 이메일이 없어요"}); return; }
    if (!c) { setMsg({ok:false,text:"코드를 입력하세요"}); return; }
    if (d <= 0) { setMsg({ok:false,text:"일수를 1 이상으로 입력하세요"}); return; }
    const mu = maxUses.trim() ? Math.floor(Number(maxUses)) : null;
    if (mu !== null && (!Number.isFinite(mu) || mu <= 0)) { setMsg({ok:false,text:"인원 상한을 올바르게 입력하세요"}); return; }

    setBusy(true); setMsg(null);
    const { error } = await supabase.from("coupon_codes").insert({
      code: c, type: "free_days", owner_email: email, value: d,
      allowed_plans: [plan], max_uses: mu,
      expires_at: expires ? new Date(expires + "T23:59:59").toISOString() : null,
      plan_discounts: null,
    });
    if (error) {
      setBusy(false);
      setMsg({ok:false,text:"발급 실패: "+error.message+(error.code==="23505"?" (이미 있는 코드)":"")});
      return;
    }
    const { data, error: rErr } = await supabase.rpc("set_user_role_rpc", { p_target_user_id: selUser.user_id, p_new_role: "partner" });
    const roleNote = (rErr || data?.ok === false) ? ` · ⚠ 파트너 권한 지정 실패(${rErr?.message || data?.error || ""})` : " · 파트너 권한 지정 완료";
    setBusy(false);
    setMsg({ok:true,text:`코드 ${c} 발급 완료 — ${planLabel(plan)} ${d}일${mu?` · 최대 ${mu}명`:" · 인원 무제한"}${expires?"":" · 무기한"}${roleNote}`});
    onDone();
  };

  const inputCls = "rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0064FF]";
  return (
    <div className="rounded-2xl bg-white border border-[#0064FF]/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">파트너 코드</p>
        {!open && (
          <button onClick={()=>setOpen(true)}
            className="rounded-lg bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-3 py-2 text-xs font-bold text-white transition hover:brightness-95">
            🤝 파트너로 지정 + 코드 발급
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2">
          <p className="mb-2 text-xs font-bold text-gray-700">파트너: <span className="text-[#0064FF]">{selUser?.email}</span></p>
          <div className="flex flex-wrap items-center gap-2">
            <input value={code} onChange={e=>{setCode(e.target.value.toUpperCase()); setMsg(null);}} placeholder="코드"
              className={inputCls+" w-36 font-bold tracking-widest"} />
            <select value={plan} onChange={e=>setPlan(e.target.value)} className={inputCls+" w-32"}>
              {GRANT_PLANS.filter(([v])=>v!=="free").map(([v,label])=><option key={v} value={v}>{label}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <input type="number" min={1} value={days} onChange={e=>setDays(e.target.value)} className={inputCls+" w-20"} />
              <span className="text-xs text-gray-500">일</span>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" min={1} value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder="인원" className={inputCls+" w-24"} />
              <span className="text-xs text-gray-500">명</span>
            </div>
            <input type="date" value={expires} onChange={e=>setExpires(e.target.value)} className={inputCls+" w-40"} />
            <button onClick={issue} disabled={busy}
              className="rounded-lg bg-[linear-gradient(140deg,#22C55E_0%,#16A34A_55%,#15803D_100%)] px-4 py-2 text-xs font-bold text-white transition hover:brightness-95 disabled:opacity-40">
              {busy ? "발급 중…" : "＋ 발급"}
            </button>
            <button onClick={()=>{setOpen(false); setMsg(null);}} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100">닫기</button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">만료일 비우면 코드 무기한 · 인원 상한으로 유출 대비 <span className="text-gray-300">(요금제 = 지급 이용권 개수, 일수 = 유효기간)</span></p>
          {msg && <p className={`mt-2 text-xs font-bold ${msg.ok ? "text-[#0064FF]" : "text-red-500"}`}>{msg.text}</p>}
        </div>
      )}
    </div>
  );
}

// ── 관리자: 구독 관리 ──
function ProvBadge({ p }: { p?: string }) {
  const v = (p || "").toLowerCase();
  if (v === "kakao")  return <span title="카카오" className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-[#FEE500] align-middle text-[9px] font-bold text-[#3C1E1E]">K</span>;
  if (v === "google") return <span title="구글" className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-white ring-1 ring-gray-300 align-middle text-[9px] font-bold text-[#4285F4]">G</span>;
  return null;
}
function AdminSubsTab({ session, supabase }: { session:any; supabase:any }) {
  const [users, setUsers]   = React.useState<any[]>([]);
  const [planMax, setPlanMax] = React.useState<Record<string,number>>({});
  const [q, setQ]           = React.useState("");
  const [stFilter, setStFilter] = React.useState("all");
  const [plFilter, setPlFilter] = React.useState("all");
  const [mkFilter, setMkFilter] = React.useState("all");
  const [sel, setSel]       = React.useState<string>("");
  const [planSel, setPlanSel] = React.useState("finds100");
  const [days, setDays]     = React.useState("30");
  const [amt, setAmt]       = React.useState("100");
  const [creditKind, setCreditKind] = React.useState<"finds"|"render">("finds");
  const [actOpen, setActOpen] = React.useState(false);
  const [payAmt, setPayAmt] = React.useState("");   // 결제금액(파트너 정산 적립용)
  const [roleSel, setRoleSel] = React.useState("user");
  const [refData, setRefData] = React.useState<any>(null);
  const [refModalOpen, setRefModalOpen] = React.useState(false);
  React.useEffect(()=>{ if(!sel){ setRefData(null); return; } supabase.rpc("admin_get_referrals_rpc",{p_user_id:sel}).then(({data}:any)=>setRefData(data ?? {ok:false,error:"응답 없음"})).catch((e:any)=>setRefData({ok:false,error:String(e?.message||e)})); }, [sel]);
  const [msg, setMsg]       = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [srcStats, setSrcStats] = React.useState<{source:string;count:number}[]>([]);
  const [srcTotal, setSrcTotal] = React.useState(0);

  const load = React.useCallback(async ()=>{
    setLoading(true);
    try {
      const { data } = await supabase.rpc("get_all_users_admin_rpc");
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
    try {
      const { data: ss } = await supabase.rpc("admin_signup_source_stats_rpc");
      if (ss?.ok) { setSrcStats(Array.isArray(ss.stats)?ss.stats:[]); setSrcTotal(ss.total||0); }
    } catch {}
    try {
      const { data: pl } = await supabase.from("plans").select("id,max_credits").order("sort_order");
      const m:Record<string,number> = {}; (pl??[]).forEach((p:any)=>m[p.id]=p.max_credits); setPlanMax(m);
    } catch {}
    setLoading(false);
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const now = Date.now();
  const isActive = (u:any) => (u.expires_at && new Date(u.expires_at).getTime() > now) || (u.event_expires_at && new Date(u.event_expires_at).getTime() > now && (u.event_credits||0) > 0);
  const filtered = users.filter(u=>{
    if (q.trim()) { const _q = q.trim().toLowerCase(); const _hay = [(u.email||""),(u.nickname||""),(u.name||"")].join(" ").toLowerCase(); if (!_hay.includes(_q)) return false; }
    if (stFilter==="active" && !isActive(u)) return false;
    if (stFilter==="expired" && isActive(u)) return false;
    if (plFilter!=="all" && u.plan!==plFilter) return false;
    if (mkFilter==="yes" && !u.marketing_consent) return false;
    if (mkFilter==="no" && u.marketing_consent) return false;
    return true;
  });
  const provStats = users.reduce((a: any, u: any) => { const v = (u.provider || "").toLowerCase(); const k = v === "google" ? "google" : v === "kakao" ? "kakao" : "etc"; a[k] = (a[k] || 0) + 1; return a; }, { google: 0, kakao: 0, etc: 0 });
  // 현재 플랜(free/finds30/finds100/finds300) 기준 집계 · 레거시 플랜은 '기타'로 흡수
  const planCount = users.reduce((a:any,u:any)=>{ const k = normalizePlan(u.plan); a[k] = (a[k]||0)+1; return a; }, { free:0, finds30:0, finds100:0, finds300:0, legacy:0 });
  const mkCnt = users.filter((u:any)=>u.marketing_consent).length;
  const copyMktEmails = async () => {
    const list = filtered.filter((u:any)=>u.marketing_consent).map((u:any)=>u.email).filter(Boolean);
    if (list.length===0) { setMsg("마케팅 동의자가 없습니다 (현재 필터 기준)"); return; }
    try { await navigator.clipboard.writeText(list.join("\n")); setMsg(`마케팅 동의 이메일 ${list.length}건 복사됨`); }
    catch { setMsg(list.join(", ")); }
  };
  const selUser = users.find(u=>u.user_id===sel);

  const run = async (fn:()=>Promise<any>, okMsg:string) => {
    if (!sel) { setMsg("회원을 먼저 선택하세요"); return; }
    setMsg("처리 중...");
    try { const r = await fn(); if (r?.error && !r?.ok) setMsg("실패: "+(r.error.message||r.error)); else if (r?.data?.ok===false) setMsg("실패: "+r.data.error); else { setMsg(okMsg); await load(); } }
    catch(e){ setMsg("실패: "+String(e)); }
  };
  // Finds 플랜(finds30/100/300)은 admin_grant_subscription_rpc 가 못 다루므로
  // toss-confirm 의 grant() 와 동일하게 grant_finds_sub_rpc 로 분기한다.
  // admin_grant_plan_rpc(관리자 검사 포함 래퍼)가 DB에 있으면 그걸 먼저 쓰고,
  // 없으면(마이그레이션 전) 클라이언트에서 분기한다.
  const grantRpc = async () => {
    const days_ = Number(days) || 30;
    const amount = payAmt.trim() ? (Number(payAmt) || 0) : null;
    const w = await supabase.rpc("admin_grant_plan_rpc", { p_target_user_id: sel, p_plan: planSel, p_days: days_, p_amount: amount });
    const missing = w?.error && /PGRST202|does not exist|Could not find the function/i.test(String(w.error.message || w.error.code || ""));
    if (!missing) return w;
    if (FINDS_PLANS.includes(planSel)) {
      return supabase.rpc("grant_finds_sub_rpc", { p_user: sel, p_plan: planSel, p_days: days_, p_amount: amount, p_period: "monthly" });
    }
    return supabase.rpc("admin_grant_subscription_rpc", { p_target_user_id: sel, p_plan: planSel, p_days: days_, p_amount: amount });
  };
  const grant = async () => {
    if (!sel) { setMsg("회원을 먼저 선택하세요"); return; }
    setMsg("처리 중...");
    try {
      const r = await grantRpc();
      if (r?.error) { setMsg("실패: "+r.error.message); return; }
      if (r?.data?.ok === false) { setMsg("실패: "+r.data.error); return; }
      const acc = r?.data?.accrual;
      let m = r?.data?.note ? (`${planLabel(planSel)} 부여 완료 · ` + r.data.note) : `${planLabel(planSel)} 구독 부여/연장 완료`;
      if (acc?.action === "accrued") m += ` · 파트너 적립 +₩${Number(acc.amount||0).toLocaleString()} (${acc.partner})`;
      else if (payAmt.trim() && acc?.action === "no_partner") m += " · (파트너 매핑 없음 — 적립 안 됨)";
      else if (payAmt.trim() && (acc?.action === "zero_rate" || acc?.action === "zero_fixed")) m += " · (파트너 요율 0 — 적립 안 됨)";
      setMsg(m); await load();
    } catch(e){ setMsg("실패: "+String(e)); }
  };
  const grantTrial = async () => {
    if (!sel) { setMsg("회원을 먼저 선택하세요"); return; }
    const d = Number(days) || 0;
    if (d <= 0) { setMsg("기간(일)을 입력하세요"); return; }
    setMsg("처리 중...");
    try {
      const r = await supabase.rpc("admin_grant_trial_rpc", { p_target_user_id: sel, p_days: d });
      if (r?.error) { setMsg("실패: " + r.error.message); return; }
      if (r?.data?.ok === false) { setMsg("실패: " + r.data.error); return; }
      setMsg(`체험 ${d}일 부여 완료 · 이벤트 이용권 ${d}개 (플랜은 그대로)`); await load();
    } catch (e) { setMsg("실패: " + String(e)); }
  };
  const cancel  = () => run(()=>supabase.rpc("admin_cancel_subscription_rpc",{p_target_user_id:sel}), "구독 취소 완료");
  const resetDev= () => run(()=>supabase.rpc("admin_reset_user_devices_rpc",{p_target_user_id:sel}), "디바이스 해제 완료");
  const credit  = (action:string) => {
    if (action !== "reset") {
      const n = Math.floor(Number(amt));
      if (!Number.isFinite(n) || n <= 0) { setMsg("변동량을 올바르게 입력하세요"); return; }
      if (n > 1000000) { setMsg("변동량이 너무 큽니다 (최대 1,000,000)"); return; }
    }
    const rpc = creditKind==="render" ? "admin_adjust_render_credits_rpc" : "admin_adjust_credits_rpc";
    const label = creditKind==="render" ? "렌더" : "Finds";
    run(()=>supabase.rpc(rpc,{p_target_user_id:sel,p_action:action,p_amount:Math.min(Math.max(Math.floor(Number(amt)||0),0),1000000)}), label+" 이용권 처리 완료");
  };
  const applyRole = () => run(()=>supabase.rpc("set_user_role_rpc",{p_target_user_id:sel,p_new_role:roleSel}), "권한 변경 완료");

  const resetSignupSource = async () => {
    const ans = window.prompt('⚠️ 가입 경로 데이터를 모두 초기화합니다.\n수집된 응답이 전부 삭제되며 되돌릴 수 없습니다.\n\n정말 진행하려면 아래에 "초기화" 라고 입력하세요.');
    if (ans === null) return;            // 취소
    if (ans.trim() !== "초기화") { setMsg("초기화 취소됨 (입력이 일치하지 않음)"); return; }
    setMsg("초기화 중...");
    const { data, error } = await supabase.rpc("admin_reset_signup_source_rpc");
    if (error || !data?.ok) { setMsg("초기화 실패: "+(error?.message || data?.error || "")); return; }
    setMsg(`가입 경로 초기화 완료 (${data.cleared ?? 0}건 삭제)`);
    await load();
  };

  // 선택 회원 변경 시: 역할 동기화
  React.useEffect(()=>{
    setRoleSel(selUser?.role || "user");
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (d:string)=> d ? new Date(d).toLocaleDateString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit"}) : "-";
  const Btn = ({onClick,color,children}:{onClick:()=>void;color:string;children:any}) => (
    <button onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-bold text-gray-900 transition ${color}`}>{children}</button>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">👑 구독 관리</p>
        <div className="text-xs text-gray-500">전체 {users.length} · 무료 {planCount.free} · 스탠다드 {planCount.finds30} · <span className="text-[#0064FF]">프로 {planCount.finds100}</span> · <span className="text-purple-500">비즈니스 {planCount.finds300}</span>{planCount.legacy > 0 && <span className="text-gray-400"> · 기타 {planCount.legacy}</span>}
          <button onClick={load} className="ml-3 rounded-lg border border-gray-200 px-2 py-1 hover:bg-gray-100">새로고침</button>
        </div>
      </div>

      {/* 가입 경로 집계 */}
      {srcStats.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">📥 가입 경로 (총 {srcTotal}명)</p>
            <button onClick={resetSignupSource} className="rounded-lg border border-red-300 text-red-500 hover:bg-red-50 px-2.5 py-1 text-xs font-bold">초기화</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {srcStats.map(s=>(
              <span key={s.source} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${s.source==="미응답"?"bg-gray-100 text-gray-500":"bg-[#0064FF]/10 text-[#0064FF]"}`}>
                {s.source} <b>{s.count}</b>
                <span className="text-gray-400 font-normal"> ({srcTotal?Math.round(s.count/srcTotal*100):0}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="이메일 검색"
          className="flex-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#0064FF]" />
        <select value={stFilter} onChange={e=>setStFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">상태 전체</option><option value="active">유효</option><option value="expired">만료</option></select>
        <select value={plFilter} onChange={e=>setPlFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">플랜 전체</option>{GRANT_PLANS.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
        <select value={mkFilter} onChange={e=>setMkFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">마케팅 전체</option><option value="yes">동의함</option><option value="no">미동의</option></select>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span><ProvBadge p="google" /><b className="text-gray-700">구글 {provStats.google}</b></span>
        <span><ProvBadge p="kakao" /><b className="text-gray-700">카카오 {provStats.kakao}</b></span>
        {provStats.etc > 0 && <span>기타 {provStats.etc}</span>}
        <span className="text-gray-300">·</span>
        <span>📣 <b className="text-gray-700">마케팅동의 {mkCnt}</b></span>
        <button onClick={copyMktEmails} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">동의 이메일 복사</button>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 mb-5 max-h-[340px] overflow-auto">
        <table className="w-full min-w-[920px] text-xs">
          <thead className="border-b border-gray-200 text-gray-400 sticky top-0 bg-white">
            <tr><th className="px-3 py-2.5 text-left">이메일</th><th className="px-3 py-2.5 text-left">닉네임</th><th className="px-3 py-2.5 text-left">권한</th><th className="px-3 py-2.5 text-left">플랜</th><th className="px-3 py-2.5 text-left">만료일</th><th className="px-3 py-2.5 text-left">가입일</th><th className="px-3 py-2.5 text-left">📣마케팅</th><th className="px-3 py-2.5 text-right">Finds(잔량/한도)</th><th className="px-3 py-2.5 text-right">렌더</th><th className="px-3 py-2.5 text-center">관리</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="py-8 text-center text-gray-500">불러오는 중...</td></tr>
            : filtered.length===0 ? <tr><td colSpan={10} className="py-8 text-center text-gray-500">결과 없음</td></tr>
            : filtered.map(u=>{
              const max = (planMax[u.plan] ?? 0) + (u.bonus_credits||0); const left = max - (u.credits_used||0); const evA = (u.event_expires_at && new Date(u.event_expires_at).getTime() > now && (u.event_credits||0) > 0) ? (u.event_credits||0) : 0; const act = isActive(u);
              return (
                <tr key={u.user_id} onClick={()=>{setSel(u.user_id); setRoleSel(u.role||"user"); if(u.plan && GRANT_PLANS.some(([v])=>v===u.plan))setPlanSel(u.plan); setActOpen(true);}}
                  className={`border-b border-gray-200/50 cursor-pointer ${sel===u.user_id?"bg-[#0064FF]/10":"hover:bg-gray-100/40"}`}>
                  <td className="px-3 py-2.5 text-gray-700 truncate max-w-[200px]"><ProvBadge p={u.provider} />{u.email}</td><td className="px-3 py-2.5 text-gray-700 truncate max-w-[120px]">{u.nickname||"-"}</td>
                  <td className="px-3 py-2.5">{u.role==="super_admin"?<span className="text-yellow-400 font-bold">👑 관리자</span>:u.role==="partner"?<span className="text-[#0064FF]">파트너</span>:<span className="text-gray-400">일반</span>}</td>
                  <td className="px-3 py-2.5 text-gray-700">{planLabel(u.plan)}</td>
                  <td className="px-3 py-2.5 text-gray-400">{fmt(u.expires_at)}</td><td className="px-3 py-2.5 text-gray-400">{u.created_at?fmt(u.created_at):"-"}</td>
                  <td className="px-3 py-2.5">{u.marketing_consent?<span className="text-[#0064FF] font-bold">동의</span>:<span className="text-gray-300">-</span>}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{left.toLocaleString()} / {max.toLocaleString()}{evA>0 && <span className="ml-1 font-bold text-[#0064FF]">+{evA}체험</span>}</td>
                  <td className="px-3 py-2.5 text-right">{(u.render_credits||0) > 0 ? <span className="font-bold text-amber-600">{(u.render_credits||0).toLocaleString()}</span> : <span className="text-gray-300">-</span>}</td><td className="px-3 py-2.5 text-center"><button onClick={e=>{e.stopPropagation(); setSel(u.user_id); setRoleSel(u.role||"user"); if(u.plan && GRANT_PLANS.some(([v])=>v===u.plan))setPlanSel(u.plan); setActOpen(true);}} title="회원 관리" className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#0064FF]/10 text-[#0064FF] font-bold hover:bg-[#0064FF] hover:text-white transition">+</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 액션 영역 */}
      <div className="space-y-3">
        {actOpen && sel && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={()=>setActOpen(false)}>
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setActOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <p className="mb-4 text-sm font-bold text-gray-800">회원 관리{selUser && <span className="text-[#0064FF]"> — {selUser.email}</span>}</p>
            {selUser && (
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2"><p className="text-[11px] text-gray-400">직군</p><p className="text-sm font-bold text-gray-800 truncate">{selUser.persona || "-"}</p></div>
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2"><p className="text-[11px] text-gray-400">니치</p><p className="text-sm font-bold text-gray-800 truncate">{selUser.niche || "-"}</p></div>
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2"><p className="text-[11px] text-gray-400">가입경로</p><p className="text-sm font-bold text-gray-800 truncate">{selUser.signup_source || selUser.acq_source || "-"}</p></div>
              </div>
            )}
            <div className="space-y-3">
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">구독 부여 / 수정 {selUser && <span className="text-[#0064FF]">— {selUser.email}</span>}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={planSel} onChange={e=>setPlanSel(e.target.value)} className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
              {GRANT_PLANS.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
            <input value={days} onChange={e=>setDays(e.target.value)} className="w-28 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="기간(일)" />
            <input value={payAmt} onChange={e=>setPayAmt(e.target.value)} className="w-36 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="결제금액(정산용·선택)" />
            <Btn onClick={grant} color="bg-[linear-gradient(140deg,#22C55E_0%,#16A34A_55%,#15803D_100%)] hover:brightness-95">✓ 구독 부여/연장</Btn>
            <Btn onClick={grantTrial} color="bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] hover:brightness-95">🎁 체험 이용권 부여(이벤트)</Btn>
            <Btn onClick={cancel} color="bg-[linear-gradient(140deg,#F05252_0%,#E02424_55%,#C81E1E_100%)] hover:brightness-95">✕ 구독 취소</Btn>
            <Btn onClick={resetDev} color="bg-gray-200 hover:bg-gray-300">🖥 디바이스 모두 해제</Btn>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">이용권 관리</p>
          <div className="mb-2 inline-flex rounded-lg bg-gray-100 border border-gray-200 p-0.5 text-xs font-bold">
            <button onClick={()=>setCreditKind("finds")} className={`px-3 py-1.5 rounded-md transition ${creditKind==="finds"?"bg-[#0064FF] text-white":"text-gray-500 hover:text-gray-700"}`}>Finds 이용권</button>
            <button onClick={()=>setCreditKind("render")} className={`px-3 py-1.5 rounded-md transition ${creditKind==="render"?"bg-amber-500 text-white":"text-gray-500 hover:text-gray-700"}`}>렌더 이용권</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={0} max={1000000} value={amt} onChange={e=>setAmt(e.target.value)} className="w-36 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="변동량" />
            <Btn onClick={()=>credit("add")} color="bg-[linear-gradient(140deg,#22C55E_0%,#16A34A_55%,#15803D_100%)] hover:brightness-95">＋ 지급 (잔량 증가)</Btn>
            <Btn onClick={()=>credit("sub")} color="bg-[linear-gradient(140deg,#FB923C_0%,#EA580C_55%,#C2410C_100%)] hover:brightness-95">－ 차감 (잔량 감소)</Btn>
            <Btn onClick={()=>credit("reset")} color="bg-gray-200 hover:bg-gray-300">{creditKind==="render"?"🔄 렌더 잔량 0으로":"🔄 사용량 0으로 초기화"}</Btn>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">{creditKind==="render"?"렌더(편집) 이용권을 직접 증감합니다. 9/14 종료 예정 기능입니다.":"Finds 이용권(보너스 잔량)을 증감합니다."}</p>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">권한 변경 (파트너/관리자 지정)</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={roleSel} onChange={e=>setRoleSel(e.target.value)} className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
              <option value="user">일반 (user)</option><option value="partner">파트너 (partner)</option><option value="super_admin">관리자 (super_admin)</option></select>
            <Btn onClick={applyRole} color="bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] hover:brightness-95">✓ 권한 적용</Btn>
          </div>
        </div>
        <PartnerIssueBox selUser={selUser} supabase={supabase} onDone={load} />
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">이 회원이 초대한 유저</p>
          {!refData ? <p className="text-sm text-gray-400">불러오는 중...</p> : refData.ok === false ? <p className="text-sm text-red-400">불러오기 실패: {refData.error || "권한 없음/오류"}</p> : (<>
            <p className="text-xs text-gray-400 mb-2">{refData?.code ? `추천코드 ${refData.code}` : ""}</p>
            <div className="mb-3 flex gap-4 text-sm">
              <span className="font-bold text-gray-800">초대 {refData.count}명</span>
              <span className="text-gray-500">활성 {refData.activated}</span>
              <span className="text-gray-500">결제전환 {refData.converted}</span>
            </div>
            {refData.list?.length ? (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="text-gray-400 border-b border-gray-100"><tr>
                    <th className="px-2 py-1.5 text-left">이메일</th><th className="px-2 py-1.5 text-left">닉네임</th><th className="px-2 py-1.5 text-left">가입경로</th><th className="px-2 py-1.5 text-center">폰인증</th><th className="px-2 py-1.5 text-center">활성</th><th className="px-2 py-1.5 text-right">가입일</th>
                  </tr></thead>
                  <tbody>
                    {refData.list.map((r:any,i:number)=>(
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-2 py-1.5 text-gray-700 truncate max-w-[160px]">{r.email}</td>
                        <td className="px-2 py-1.5 text-gray-600 truncate max-w-[90px]">{r.nickname||"-"}</td>
                        <td className="px-2 py-1.5 text-gray-500">{r.source||"-"}</td>
                        <td className="px-2 py-1.5 text-center">{r.phone_verified?<span className="text-[#0064FF]">✓</span>:<span className="text-red-400">✗</span>}</td>
                        <td className="px-2 py-1.5 text-center">{r.activated?<span className="text-[#0064FF]">●</span>:<span className="text-gray-300">○</span>}</td>
                        <td className="px-2 py-1.5 text-right text-gray-400">{new Date(r.created_at).toLocaleDateString("ko-KR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-xs text-gray-400">초대한 사람이 없어요</p>}
          </>)}
        </div>
            </div>
          </div>
          </div>
        )}

        {/* 추천 현황 팝업 (1인 다계정 적발용) */}
        {refModalOpen && sel && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={()=>setRefModalOpen(false)}>
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setRefModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"><X size={18} /></button>
            <p className="text-sm font-bold text-gray-900 mb-1">추천 현황{selUser ? ` — ${selUser.email}` : ""}</p>
            <p className="text-xs text-gray-400 mb-3">{refData?.code ? `추천코드 ${refData.code}` : ""}</p>
            {!refData ? <p className="text-sm text-gray-400">불러오는 중...</p> : refData.ok === false ? <p className="text-sm text-red-400">불러오기 실패: {refData.error || "권한 없음/오류"}</p> : (<>
            <div className="mb-3 flex gap-4 text-sm">
              <span className="font-bold text-gray-800">초대 {refData.count}명</span>
              <span className="text-gray-500">활성 {refData.activated}</span>
              <span className="text-gray-500">결제전환 {refData.converted}</span>
            </div>
            {refData.list?.length ? (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="text-gray-400 border-b border-gray-100"><tr>
                    <th className="px-2 py-1.5 text-left">이메일</th><th className="px-2 py-1.5 text-left">닉네임</th><th className="px-2 py-1.5 text-left">가입경로</th><th className="px-2 py-1.5 text-center">폰인증</th><th className="px-2 py-1.5 text-center">활성</th><th className="px-2 py-1.5 text-right">가입일</th>
                  </tr></thead>
                  <tbody>
                    {refData.list.map((r:any,i:number)=>(
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-2 py-1.5 text-gray-700 truncate max-w-[160px]">{r.email}</td>
                        <td className="px-2 py-1.5 text-gray-600 truncate max-w-[90px]">{r.nickname||"-"}</td>
                        <td className="px-2 py-1.5 text-gray-500">{r.source||"-"}</td>
                        <td className="px-2 py-1.5 text-center">{r.phone_verified?<span className="text-[#0064FF]">✓</span>:<span className="text-red-400">✗</span>}</td>
                        <td className="px-2 py-1.5 text-center">{r.activated?<span className="text-[#0064FF]">●</span>:<span className="text-gray-300">○</span>}</td>
                        <td className="px-2 py-1.5 text-right text-gray-400">{new Date(r.created_at).toLocaleDateString("ko-KR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-xs text-gray-400">초대한 사람이 없어요</p>}
            <p className="mt-2 text-[11px] text-gray-400">⚠️ 같은 가입경로 + 폰인증✗ + 짧은 간격 가입이 몰려있으면 다계정 의심</p>
            </>)}
          </div>
          </div>
        )}
        {msg && <p className="text-xs text-[#0064FF]">{msg}</p>}
      </div>
    </div>
  );
}

// ── 관리자: 쿠폰 코드 ──
function AdminCouponsTab({ session, supabase }: { session:any; supabase:any }) {
  const [codes, setCodes]   = React.useState<any[]>([]);
  const [counts, setCounts] = React.useState<Record<string,number>>({});
  const [code, setCode]     = React.useState("");
  const [owner, setOwner]   = React.useState("");
  const COUPON_PLANS = [["starter","스타터"],["pro","프로"],["master","마스터"],["pro_trial","프로 체험"]];
  const [planDisc, setPlanDisc] = React.useState<Record<string,{type:string;value:string}>>({
    starter:{type:"none",value:""}, pro:{type:"none",value:""}, master:{type:"none",value:""}, pro_trial:{type:"none",value:""},
  });
  const setPD = (k:string, patch:any) => setPlanDisc(p=>({ ...p, [k]:{ ...p[k], ...patch } }));
  const [exp, setExp]       = React.useState("");
  const [unlimited, setUnlimited] = React.useState(true);
  const [sel, setSel]       = React.useState<Set<string>>(new Set());
  const [msg, setMsg]       = React.useState("");
  const [mode, setMode]     = React.useState<"discount"|"credits"|"free_days">("discount");
  const [trialDays, setTrialDays] = React.useState("7");
  const [trialPlan, setTrialPlan] = React.useState("pro");
  const [credits, setCredits] = React.useState("");
  const [maxUses, setMaxUses] = React.useState("");

  const load = React.useCallback(async ()=>{
    try {
      const { data } = await supabase.from("coupon_codes").select("code,type,value,owner_email,expires_at,created_at,plan_discounts,allowed_plans,max_uses").order("created_at",{ascending:false});
      setCodes(data ?? []);
    } catch { setCodes([]); }
    try {
      const { data: red } = await supabase.from("code_redemptions").select("code");
      const c:Record<string,number> = {}; (red??[]).forEach((r:any)=>{ if(r.code) c[r.code]=(c[r.code]||0)+1; }); setCounts(c);
    } catch {}
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const create = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { setMsg("코드를 입력하세요"); return; }
    let row:any;
    if (mode === "credits") {
      const cr = Number(credits) || 0;
      if (cr <= 0) { setMsg("지급할 영상 수를 입력하세요"); return; }
      const mu = maxUses.trim() === "" ? null : (Number(maxUses) || 0);
      if (mu !== null && mu <= 0) { setMsg("선착순 인원은 1 이상이거나 비워두세요(무제한)"); return; }
      row = {
        code:c, type:"credits", value:cr,
        owner_email: owner.trim() || null,
        expires_at: unlimited ? null : (exp || null),
        max_uses: mu,
        plan_discounts: null, allowed_plans: null,
      };
    } else if (mode === "free_days") {
      const days = Number(trialDays) || 0;
      if (days <= 0) { setMsg("체험 일수를 입력하세요 (1 이상)"); return; }
      const mu = maxUses.trim() === "" ? null : (Number(maxUses) || 0);
      if (mu !== null && mu <= 0) { setMsg("선착순 인원은 1 이상이거나 비워두세요(무제한)"); return; }
      row = {
        code:c, type:"free_days", value:days,
        owner_email: owner.trim() || null,
        expires_at: unlimited ? null : (exp || null),
        max_uses: mu,
        plan_discounts: null, allowed_plans: [trialPlan],
      };
    } else {
      // 플랜별 할인 구성
      const pd:Record<string,any> = {}; const allowed:string[] = [];
      for (const [k] of COUPON_PLANS) {
        const d = planDisc[k];
        if (d.type === "none") continue;
        pd[k] = d.type === "free" ? { type:"free" } : { type:d.type, value:Number(d.value)||0 };
        allowed.push(k);
      }
      row = {
        code:c, type:"none", value:0,
        owner_email: owner.trim() || null,
        expires_at: unlimited ? null : (exp || null),
        plan_discounts: Object.keys(pd).length ? pd : null,
        allowed_plans: allowed.length ? allowed : null,
      };
    }
    setMsg("생성 중...");
    const { error } = await supabase.from("coupon_codes").insert(row);
    if (error) setMsg("생성 실패: "+error.message);
    else {
      setMsg("코드 생성 완료"); setCode(""); setOwner(""); setCredits(""); setMaxUses("");
      setPlanDisc({ starter:{type:"none",value:""}, pro:{type:"none",value:""}, master:{type:"none",value:""} });
      await load();
    }
  };
  const toggleSel = (c:string) => setSel(s=>{ const n=new Set(s); n.has(c)?n.delete(c):n.add(c); return n; });
  const delSel = async () => {
    if (sel.size===0) return;
    if (!confirm(`${sel.size}개 코드를 삭제할까요?\n(해당 코드의 사용 기록도 함께 삭제됩니다)`)) return;
    const { data, error } = await supabase.rpc("admin_delete_coupons_rpc", { p_codes: Array.from(sel) });
    if (error || !data?.ok) setMsg("삭제 실패: "+(error?.message || data?.error || "알 수 없는 오류"));
    else { setSel(new Set()); setMsg(`${data.deleted ?? sel.size}개 삭제 완료`); await load(); }
  };
  const summarize = (c:any) => {
    if (c.type === "credits") {
      return `💎 영상 ${Number(c.value).toLocaleString()}개` + (c.max_uses ? ` · 선착순 ${c.max_uses}명` : " · 인원무제한");
    }
    const pd = c.plan_discounts;
    if (pd && typeof pd === "object") {
      const parts = COUPON_PLANS.filter(([k])=>pd[k]).map(([k,label])=>{
        const d = pd[k];
        const v = d.type==="percent" ? `${d.value}%` : d.type==="fixed" ? `${Number(d.value).toLocaleString()}원` : d.type==="free" ? "무료" : "";
        return `${label} ${v}`;
      });
      return parts.length ? parts.join(" · ") : "파트너 전용(할인 없음)";
    }
    if (c.type && c.type!=="none") return c.type==="free_days" ? `${c.value}일 무료체험` : c.type==="percent" ? `${c.value}%` : `${Number(c.value).toLocaleString()}원`;
    return "파트너 전용(할인 없음)";
  };
  const fmt = (d:string)=> d ? new Date(d).toLocaleDateString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit"}) : "무기한";

  return (
    <div>
      <div className="rounded-2xl bg-white border border-gray-200 p-5 mb-5">
        <p className="text-sm font-bold text-gray-900 mb-3">새 쿠폰 코드 생성</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-500">코드</label>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="예: TEACHER_KIM"
              className="w-full mt-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#0064FF]" /></div>
          <div><label className="text-xs text-gray-500">파트너 이메일 (선택 — 파트너 매핑)</label>
            <input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="partner@example.com"
              className="w-full mt-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#0064FF]" /></div>
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-500">코드 종류</label>
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={()=>setMode("discount")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode==="discount"?"bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>💳 플랜 할인</button>
            <button type="button" onClick={()=>setMode("credits")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode==="credits"?"bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>💎 이용권 지급</button>
            <button type="button" onClick={()=>setMode("free_days")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode==="free_days"?"bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>🎁 무료체험</button>
          </div>
        </div>

        {mode === "credits" && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><label className="text-xs text-gray-500">지급 영상 수</label>
              <input type="number" value={credits} onChange={e=>setCredits(e.target.value)} placeholder="예: 500"
                className="block w-32 mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0064FF]" /></div>
            <div><label className="text-xs text-gray-500">선착순 인원 (비우면 무제한)</label>
              <input type="number" value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder="예: 10"
                className="block w-40 mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0064FF]" /></div>
          </div>
        )}

        {mode === "free_days" && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><label className="text-xs text-gray-500">체험 일수</label>
              <input type="number" value={trialDays} onChange={e=>setTrialDays(e.target.value)} placeholder="예: 7"
                className="block w-28 mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0064FF]" /></div>
            <div><label className="text-xs text-gray-500">대상 플랜</label>
              <select value={trialPlan} onChange={e=>setTrialPlan(e.target.value)}
                className="block mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0064FF]">
                <option value="starter">스타터</option>
                <option value="pro">프로</option>
                <option value="master">마스터</option>
                <option value="pro_trial">프로 체험(캡 700)</option>
              </select></div>
            <div><label className="text-xs text-gray-500">선착순 인원 (비우면 무제한)</label>
              <input type="number" value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder="예: 100"
                className="block w-40 mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0064FF]" /></div>
            <p className="w-full text-xs text-gray-400">가입한 회원이 쿠폰칸에 이 코드를 넣으면 해당 플랜을 N일간 무료로 이용해요. 파트너 이메일을 넣으면 그 회원이 파트너에 자동 연결됩니다(수익셰어). 1인 1회.</p>
          </div>
        )}

        {mode === "discount" && (<div className="mb-4">
          <label className="text-xs text-gray-500">플랜별 할인 설정</label>
          <div className="mt-1.5 space-y-2">
            {COUPON_PLANS.map(([k,label])=>(
              <div key={k} className="flex items-center gap-2">
                <span className="w-14 text-sm font-bold text-gray-700">{label}</span>
                <select value={planDisc[k].type} onChange={e=>setPD(k,{type:e.target.value})}
                  className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                  <option value="none">미적용</option>
                  <option value="percent">할인 %</option>
                  <option value="fixed">정액 할인(원)</option>
                  <option value="free">무료(100%)</option>
                </select>
                {(planDisc[k].type==="percent" || planDisc[k].type==="fixed") && (
                  <input value={planDisc[k].value} onChange={e=>setPD(k,{value:e.target.value})}
                    placeholder={planDisc[k].type==="percent"?"예: 20":"예: 10000"}
                    className="w-28 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0064FF]" />
                )}
                {planDisc[k].type==="free" && <span className="text-xs text-[#0064FF] font-bold">결제 0원</span>}
                {planDisc[k].type==="none" && <span className="text-xs text-gray-400">이 플랜엔 할인 없음</span>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">모두 "미적용"이면 할인 없는 파트너 전용 코드가 됩니다.</p>
        </div>)}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div><label className="text-xs text-gray-500">만료일</label>
            <input type="date" value={exp} disabled={unlimited} onChange={e=>setExp(e.target.value)} className="block mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none disabled:opacity-40" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2"><input type="checkbox" checked={unlimited} onChange={e=>setUnlimited(e.target.checked)} className="accent-[#0064FF]" /> 무기한</label>
        </div>
        <button onClick={create} className="w-full rounded-xl bg-[linear-gradient(140deg,#22C55E_0%,#16A34A_55%,#15803D_100%)] hover:brightness-95 py-2.5 text-sm font-bold text-white transition">✓ 코드 생성</button>
        {msg && <p className="text-xs text-[#0064FF] mt-2">{msg}</p>}
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-gray-900">발급된 코드 목록</p>
        <div className="flex gap-2">
          <button onClick={delSel} disabled={sel.size===0} className="rounded-lg bg-red-600/80 hover:bg-red-500 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white">🗑 선택 삭제</button>
          <button onClick={load} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">새로고침</button>
        </div>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 text-gray-400">
            <tr><th className="px-3 py-2.5 w-8"></th><th className="px-3 py-2.5 text-left">코드</th><th className="px-3 py-2.5 text-left">플랜별 할인</th><th className="px-3 py-2.5 text-left">파트너</th><th className="px-3 py-2.5 text-right">사용수</th><th className="px-3 py-2.5 text-left">만료일</th></tr>
          </thead>
          <tbody>
            {codes.length===0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">발급된 코드 없음</td></tr>
            : codes.map(c=>(
              <tr key={c.code} className="border-b border-gray-200/50 hover:bg-gray-100/40">
                <td className="px-3 py-2.5"><input type="checkbox" checked={sel.has(c.code)} onChange={()=>toggleSel(c.code)} className="accent-[#0064FF]" /></td>
                <td className="px-3 py-2.5 font-mono font-bold text-[#0064FF]">{c.code}</td>
                <td className="px-3 py-2.5 text-gray-700">{summarize(c)}</td>
                <td className="px-3 py-2.5 text-gray-400 truncate max-w-[200px]">{c.owner_email || "—"}</td>
                <td className="px-3 py-2.5 text-right text-gray-700">{counts[c.code] || 0}</td>
                <td className="px-3 py-2.5 text-gray-400">{fmt(c.expires_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 관리자: 후기 승인 ──
function AdminReviewsTab({ session, supabase }: { session:any; supabase:any }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [sel, setSel]   = React.useState<string>("");
  const [msg, setMsg]   = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async ()=>{
    setLoading(true);
    try { const { data } = await supabase.rpc("get_review_submissions_rpc"); setRows(Array.isArray(data)?data:[]); }
    catch { setRows([]); }
    setLoading(false);
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const act = async (fn:()=>Promise<any>, okMsg:string) => {
    if (!sel) { setMsg("제출 건을 선택하세요"); return; }
    setMsg("처리 중...");
    try { const r = await fn(); if (r?.data?.ok===false) setMsg("실패: "+r.data.error); else { setMsg(okMsg); setSel(""); await load(); } }
    catch(e){ setMsg("실패: "+String(e)); }
  };
  const approve = () => act(()=>supabase.rpc("approve_review_rpc",{p_submission_id:sel,p_admin_id:session.user.id,p_credits:5}), "승인 완료 (+영상 5개)");
  const reject  = () => act(()=>supabase.rpc("reject_review_rpc",{p_submission_id:sel,p_admin_id:session.user.id}), "거절 완료");
  const fmt = (d:string)=> d ? new Date(d).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "-";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">📝 후기 승인 관리 <span className="text-xs text-gray-500">(대기 {rows.length}건)</span></p>
        <button onClick={load} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">새로고침</button>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 text-gray-400">
            <tr><th className="px-3 py-2.5 text-left">이메일</th><th className="px-3 py-2.5 text-left">URL</th><th className="px-3 py-2.5 text-left">상태</th><th className="px-3 py-2.5 text-left">제출일</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="py-8 text-center text-gray-500">불러오는 중...</td></tr>
            : rows.length===0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-500">대기 중인 후기 없음</td></tr>
            : rows.map(r=>(
              <tr key={r.id} onClick={()=>setSel(r.id)}
                className={`border-b border-gray-200/50 cursor-pointer ${sel===r.id?"bg-[#0064FF]/10":"hover:bg-gray-100/40"}`}>
                <td className="px-3 py-2.5 text-gray-700 truncate max-w-[160px]">{r.email}</td>
                <td className="px-3 py-2.5 text-[#0064FF] truncate max-w-[280px]"><a href={r.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="hover:underline">{r.url}</a></td>
                <td className="px-3 py-2.5 text-yellow-400">{r.status}</td>
                <td className="px-3 py-2.5 text-gray-400">{fmt(r.submitted_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={approve} className="rounded-xl bg-[linear-gradient(140deg,#22C55E_0%,#16A34A_55%,#15803D_100%)] hover:brightness-95 px-5 py-2.5 text-sm font-bold text-white transition">✓ 승인 (+영상 5개)</button>
        <button onClick={reject} className="rounded-xl bg-[linear-gradient(140deg,#F05252_0%,#E02424_55%,#C81E1E_100%)] hover:brightness-95 px-5 py-2.5 text-sm font-bold text-white transition">✕ 거절</button>
        {msg && <span className="text-xs text-[#0064FF] ml-2">{msg}</span>}
      </div>
    </div>
  );
}

// ── PartnerView ───────────────────────────────────────────────
