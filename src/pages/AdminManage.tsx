import React from 'react'
import { supabase } from '../lib/supabase'

const SB = "https://oxygqtbdpnxxcgzwdlzi.supabase.co";
const FN = (n: string) => `${SB}/functions/v1/${n}`;

export default function AdminManage({ session }: { session: any }) {
  return <AdminView session={session} supabase={supabase} />;
}

function AdminView({ session, supabase }: { session: any; supabase: any }) {
  const [tab, setTab] = React.useState<"subs"|"coupons"|"reviews"|"payouts"|"api">("subs");
  const TABS = [
    { v:"subs",    label:"👑 구독 관리" },
    { v:"coupons", label:"🎟 쿠폰 코드" },
    { v:"payouts", label:"📊 파트너 정산" },
    { v:"reviews", label:"📝 후기 승인" },
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
      {tab==="coupons" && <AdminCouponsTab session={session} supabase={supabase} />}
      {tab==="payouts" && <AdminPayoutsTab session={session} supabase={supabase} />}
      {tab==="reviews" && <AdminReviewsTab session={session} supabase={supabase} />}
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


// ── 관리자: 파트너 정산 ──
function AdminPayoutsTab({ session, supabase }: { session:any; supabase:any }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState("");
  const won = (n:number)=>`₩${Number(n||0).toLocaleString("ko-KR")}`;

  const load = React.useCallback(async ()=>{
    setLoading(true);
    try {
      const { data } = await supabase.rpc("admin_partner_stats_rpc");
      setRows(data?.ok && Array.isArray(data.partners) ? data.partners : []);
    } catch { setRows([]); }
    setLoading(false);
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const payAll = async () => {
    if (!window.confirm("확정된(7일 지난) 모든 수수료를 '지급완료'로 처리할까요?")) return;
    setMsg("지급 처리 중...");
    const { data, error } = await supabase.rpc("payout_partner_commissions_rpc", {});
    if (error || data?.ok===false) { setMsg("실패: "+(error?.message||data?.error||"")); return; }
    setMsg(`지급 처리 완료 — ${data.paid_count}건 / ${won(data.paid_total)}`); await load();
  };
  const payOne = async (pid:string, email:string) => {
    if (!window.confirm(`${email} 의 확정 수수료를 지급완료 처리할까요?`)) return;
    setMsg("지급 처리 중...");
    const { data, error } = await supabase.rpc("payout_partner_commissions_rpc", { p_target_partner: pid });
    if (error || data?.ok===false) { setMsg("실패: "+(error?.message||data?.error||"")); return; }
    setMsg(`${email} 지급 완료 — ${data.paid_count}건 / ${won(data.paid_total)}`); await load();
  };

  const tot = rows.reduce((a:any,r:any)=>({
    pending:a.pending+(Number(r.pending)||0), confirmed:a.confirmed+(Number(r.confirmed)||0), paid:a.paid+(Number(r.paid)||0),
  }), {pending:0,confirmed:0,paid:0});

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
          <p className="text-[11px] text-amber-700 font-bold">적립예정(7일 대기)</p>
          <p className="text-lg font-bold text-amber-700">{won(tot.pending)}</p>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2">
          <p className="text-[11px] text-green-700 font-bold">확정(지급 대상)</p>
          <p className="text-lg font-bold text-green-700">{won(tot.confirmed)}</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2">
          <p className="text-[11px] text-gray-500 font-bold">누적 지급완료</p>
          <p className="text-lg font-bold text-gray-700">{won(tot.paid)}</p>
        </div>
        <button onClick={payAll} className="ml-auto rounded-lg bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] hover:brightness-95 px-4 py-2.5 text-sm font-bold text-white">확정분 전체 지급 처리</button>
        <button onClick={load} className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900">새로고침</button>
      </div>
      {msg && <p className="text-xs text-[#0064FF] mb-3">{msg}</p>}
      <p className="text-[11px] text-gray-400 mb-2">※ 확정 = 결제 7일 경과(환불기간 종료)로 자동 확정된 금액(매일 새벽 자동). "오버라이드" 배지 = 이 사람이 상위 파트너(친구)로서 받은 금액.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-200">
              <th className="px-3 py-2 font-semibold">파트너</th>
              <th className="px-3 py-2 font-semibold">닉네임</th>
              <th className="px-3 py-2 font-semibold">이름</th>
              <th className="px-3 py-2 font-semibold text-right">멤버</th>
              <th className="px-3 py-2 font-semibold text-right">결제액</th>
              <th className="px-3 py-2 font-semibold text-right">적립예정</th>
              <th className="px-3 py-2 font-semibold text-right">확정</th>
              <th className="px-3 py-2 font-semibold text-right">지급완료</th>
              <th className="px-3 py-2 font-semibold">상위 친구</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-400">파트너가 없어요.</td></tr>}
            {rows.map((r:any)=>(
              <tr key={r.pid} className="border-b border-gray-100">
                <td className="px-3 py-2.5 font-medium text-gray-900">{r.email}
                  {Number(r.override_earned)>0 && <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">오버라이드 {won(r.override_earned)}</span>}
                </td>
                <td className="px-3 py-2.5 text-gray-700">{r.nickname||"-"}</td>
                <td className="px-3 py-2.5 text-gray-700">{r.name||"-"}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{r.members}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{won(r.gross)}</td>
                <td className="px-3 py-2.5 text-right text-amber-600 font-semibold">{won(r.pending)}</td>
                <td className="px-3 py-2.5 text-right text-green-600 font-bold">{won(r.confirmed)}</td>
                <td className="px-3 py-2.5 text-right text-gray-400">{won(r.paid)}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{r.upline_email||"-"}</td>
                <td className="px-3 py-2.5 text-right">
                  {Number(r.confirmed)>0 && <button onClick={()=>payOne(r.pid, r.email)} className="rounded-lg bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] hover:brightness-95 px-3 py-1.5 text-xs font-bold text-white">지급</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const [plans, setPlans]   = React.useState<any[]>([]);
  const [q, setQ]           = React.useState("");
  const [stFilter, setStFilter] = React.useState("all");
  const [plFilter, setPlFilter] = React.useState("all");
  const [mkFilter, setMkFilter] = React.useState("all");
  const [sel, setSel]       = React.useState<string>("");
  const [planSel, setPlanSel] = React.useState("pro");
  const [days, setDays]     = React.useState("30");
  const [amt, setAmt]       = React.useState("1000");
  const [payAmt, setPayAmt] = React.useState("");   // 결제금액(파트너 정산 적립용)
  const [roleSel, setRoleSel] = React.useState("user");
  const [refData, setRefData] = React.useState<any>(null);
  const [refModalOpen, setRefModalOpen] = React.useState(false);
  React.useEffect(()=>{ if(!sel){ setRefData(null); return; } supabase.rpc("admin_get_referrals_rpc",{p_user_id:sel}).then(({data}:any)=>setRefData(data ?? {ok:false,error:"응답 없음"})).catch((e:any)=>setRefData({ok:false,error:String(e?.message||e)})); }, [sel]);
  const freshPR = () => ({ starter:{type:"none",value:""}, pro:{type:"none",value:""}, master:{type:"none",value:""} });
  const [partnerRates, setPartnerRates] = React.useState<Record<string,{type:string;value:string}>>(freshPR);
  const [prMsg, setPrMsg] = React.useState("");
  const setPR = (k:string, patch:any) => setPartnerRates(p=>({ ...p, [k]:{ ...p[k], ...patch } }));
  // 파트너 쿠폰 발급
  const [pcCode, setPcCode] = React.useState("");
  const [pcDisc, setPcDisc] = React.useState<Record<string,{type:string;value:string}>>(freshPR);
  const [pcTrialPlan, setPcTrialPlan] = React.useState("pro");
  const [pcTrialDays, setPcTrialDays] = React.useState("7");
  const [pcUpEmail, setPcUpEmail] = React.useState("");
  const [pcUpOv, setPcUpOv] = React.useState<Record<string,string>>({starter:"15",pro:"30",master:"50"});
  const [upMsg, setUpMsg] = React.useState("");
  const setPCD = (k:string, patch:any) => setPcDisc(p=>({ ...p, [k]:{ ...p[k], ...patch } }));
  const [pcMsg, setPcMsg] = React.useState("");
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
      const { data: pl } = await supabase.from("plans").select("id,name,max_credits").order("sort_order");
      setPlans(pl ?? []);
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
  const grant = async () => {
    if (!sel) { setMsg("회원을 먼저 선택하세요"); return; }
    setMsg("처리 중...");
    try {
      const r = await supabase.rpc("admin_grant_subscription_rpc",{ p_target_user_id:sel, p_plan:planSel, p_days:Number(days)||30, p_amount: payAmt.trim() ? (Number(payAmt)||0) : null });
      if (r?.error) { setMsg("실패: "+r.error.message); return; }
      if (r?.data?.ok === false) { setMsg("실패: "+r.data.error); return; }
      const acc = r?.data?.accrual;
      let m = r?.data?.note ? ("구독 부여 완료 · " + r.data.note) : "구독 부여/연장 완료";
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
      setMsg(`프로 체험 ${d}일 부여 완료 · 이벤트 이용권 ${d}개 (플랜은 그대로)`); await load();
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
    run(()=>supabase.rpc("admin_adjust_credits_rpc",{p_target_user_id:sel,p_action:action,p_amount:Math.min(Math.max(Math.floor(Number(amt)||0),0),1000000)}), "이용권 처리 완료");
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

  // 선택 회원 변경 시: 역할 동기화 + (파트너면) 플랜별 정산 로드
  React.useEffect(()=>{
    setRoleSel(selUser?.role || "user");
    setPartnerRates(freshPR()); setPrMsg("");
    // 파트너 쿠폰 기본값: 이메일 앞부분 기반 코드 추천
    setPcDisc(freshPR()); setPcMsg("");
    setPcUpEmail(""); setPcUpOv({starter:"15",pro:"30",master:"50"}); setUpMsg("");
    setPcCode(selUser?.email ? String(selUser.email).split("@")[0].replace(/[^a-zA-Z0-9]/g,"").toUpperCase().slice(0,8) : "");
    if (sel && selUser?.role === "partner") {
      supabase.rpc("admin_get_partner_upline_rpc",{ p_teacher_id: sel }).then((res:any)=>{
        const d = res?.data;
        if (d?.ok && d.upline_email) {
          setPcUpEmail(d.upline_email);
          const o = d.override||{};
          setPcUpOv({ starter:String(o.starter??15), pro:String(o.pro??30), master:String(o.master??50) });
        }
      }, ()=>{});
      supabase.rpc("admin_get_partner_rates_rpc",{ p_partner_id: sel }).then((res:any)=>{
        const r = res?.data?.rates;
        if (r && typeof r === "object") {
          const next:any = freshPR();
          for (const k of ["starter","pro","master"]) {
            const d = r[k];
            if (d) next[k] = { type: d.type, value: d.type==="percent" ? String(Math.round(Number(d.rate)*1000)/10) : String(Number(d.fixed)||0) };
          }
          setPartnerRates(next);
        }
      }, ()=>{});
    }
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const createPartnerCoupon = async () => {
    if (!sel || !selUser?.email) { setPcMsg("회원을 먼저 선택하세요"); return; }
    const c = pcCode.trim().toUpperCase();
    if (!c) { setPcMsg("코드를 입력하세요"); return; }
    const pd:Record<string,any> = {}; const allowed:string[] = [];
    for (const k of ["starter","pro","master"]) {
      const d = pcDisc[k];
      if (d.type === "none") continue;
      pd[k] = d.type === "free" ? { type:"free" } : { type:d.type, value:Number(d.value)||0 };
      allowed.push(k);
    }
    setPcMsg("발급 중...");
    const { error } = await supabase.from("coupon_codes").insert({
      code: c, type:"none", value:0, owner_email: selUser.email, expires_at: null,
      plan_discounts: Object.keys(pd).length ? pd : null,
      allowed_plans: allowed.length ? allowed : null,
    });
    if (error) setPcMsg("발급 실패: "+error.message+(error.code==="23505"?" (이미 있는 코드)":""));
    else setPcMsg(`쿠폰 ${c} 발급 완료 — 파트너 ${selUser.email}에 연결됨`);
  };

  const createTrialCoupon = async () => {
    if (!sel || !selUser?.email) { setPcMsg("회원을 먼저 선택하세요"); return; }
    const c = pcCode.trim().toUpperCase();
    if (!c) { setPcMsg("코드를 입력하세요"); return; }
    const days = Math.floor(Number(pcTrialDays)||0);
    if (days <= 0) { setPcMsg("체험 일수를 입력하세요"); return; }
    setPcMsg("발급 중...");
    const { error } = await supabase.from("coupon_codes").insert({
      code: c, type:"free_days", value: days, owner_email: selUser.email, expires_at: null,
      plan_discounts: null, allowed_plans: [pcTrialPlan],
    });
    if (error) setPcMsg("발급 실패: "+error.message+(error.code==="23505"?" (이미 있는 코드 — 체험은 다른 코드로)":""));
    else setPcMsg(`체험 쿠폰 ${c} 발급 완료 — ${pcTrialPlan.toUpperCase()} ${days}일 무료체험 (파트너 ${selUser.email})`);
  };

  const savePartnerUpline = async () => {
    if (!sel) { setUpMsg("회원을 먼저 선택하세요"); return; }
    setUpMsg("저장 중...");
    const override = { starter: Number(pcUpOv.starter)||0, pro: Number(pcUpOv.pro)||0, master: Number(pcUpOv.master)||0 };
    const { data, error } = await supabase.rpc("admin_set_partner_upline_rpc", { p_teacher_id: sel, p_upline_email: pcUpEmail.trim(), p_override: override });
    if (error || data?.ok===false) { setUpMsg("저장 실패: "+(error?.message||data?.error||"")); return; }
    setUpMsg(data.action==="unset" ? "상위 파트너 해제됨" : `상위 파트너 연결됨: ${data.upline_email}`);
  };

  const savePartnerRates = async () => {
    if (!sel) { setPrMsg("회원을 먼저 선택하세요"); return; }
    const payload:Record<string,any> = {};
    for (const k of ["starter","pro","master"]) {
      const d = partnerRates[k];
      if (d.type === "percent") payload[k] = { type:"percent", rate: (Number(d.value)||0)/100 };
      else if (d.type === "fixed") payload[k] = { type:"fixed", fixed: Number(d.value)||0 };
    }
    setPrMsg("저장 중...");
    const { data, error } = await supabase.rpc("admin_set_partner_rates_rpc", { p_partner_id: sel, p_rates: payload });
    if (error || !data?.ok) setPrMsg("저장 실패: "+(error?.message || data?.error || ""));
    else setPrMsg("플랜별 정산 저장 완료 ✓ (파트너스 탭에 반영)");
  };

  const fmt = (d:string)=> d ? new Date(d).toLocaleDateString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit"}) : "-";
  const Btn = ({onClick,color,children}:{onClick:()=>void;color:string;children:any}) => (
    <button onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-bold text-gray-900 transition ${color}`}>{children}</button>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">👑 구독 관리</p>
        <div className="text-xs text-gray-500">전체 {users.length} · 무료 {users.filter(u=>!u.plan||u.plan==="free").length} · 스타터 {users.filter(u=>u.plan==="starter").length} · <span className="text-[#0064FF]">프로 {users.filter(u=>u.plan==="pro").length}</span> · <span className="text-purple-500">마스터 {users.filter(u=>u.plan==="master").length}</span>
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

      <div className="flex gap-2 mb-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="이메일 검색"
          className="flex-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#0064FF]" />
        <select value={stFilter} onChange={e=>setStFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">상태 전체</option><option value="active">유효</option><option value="expired">만료</option></select>
        <select value={plFilter} onChange={e=>setPlFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">플랜 전체</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select value={mkFilter} onChange={e=>setMkFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">마케팅 전체</option><option value="yes">동의함</option><option value="no">미동의</option></select>
      </div>
      <div className="mb-2 flex items-center gap-3 text-xs text-gray-500">
        <span><ProvBadge p="google" /><b className="text-gray-700">구글 {provStats.google}</b></span>
        <span><ProvBadge p="kakao" /><b className="text-gray-700">카카오 {provStats.kakao}</b></span>
        {provStats.etc > 0 && <span>기타 {provStats.etc}</span>}
        <span className="text-gray-300">·</span>
        <span>📣 <b className="text-gray-700">마케팅동의 {mkCnt}</b></span>
        <button onClick={copyMktEmails} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">동의 이메일 복사</button>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden mb-5 max-h-[340px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 text-gray-400 sticky top-0 bg-white">
            <tr><th className="px-3 py-2.5 text-left">이메일</th><th className="px-3 py-2.5 text-left">닉네임</th><th className="px-3 py-2.5 text-left">인스타</th><th className="px-3 py-2.5 text-left">권한</th><th className="px-3 py-2.5 text-left">플랜</th><th className="px-3 py-2.5 text-left">만료일</th><th className="px-3 py-2.5 text-left">📣마케팅</th><th className="px-3 py-2.5 text-right">이용권(잔량/한도)</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="py-8 text-center text-gray-500">불러오는 중...</td></tr>
            : filtered.length===0 ? <tr><td colSpan={8} className="py-8 text-center text-gray-500">결과 없음</td></tr>
            : filtered.map(u=>{
              const max = (planMax[u.plan] ?? 0) + (u.bonus_credits||0); const left = max - (u.credits_used||0); const evA = (u.event_expires_at && new Date(u.event_expires_at).getTime() > now && (u.event_credits||0) > 0) ? (u.event_credits||0) : 0; const act = isActive(u);
              return (
                <tr key={u.user_id} onClick={()=>{setSel(u.user_id); setRoleSel(u.role||"user"); if(u.plan)setPlanSel(u.plan); setRefModalOpen(true);}}
                  className={`border-b border-gray-200/50 cursor-pointer ${sel===u.user_id?"bg-[#0064FF]/10":"hover:bg-gray-100/40"}`}>
                  <td className="px-3 py-2.5 text-gray-700 truncate max-w-[200px]"><ProvBadge p={u.provider} />{u.email}</td><td className="px-3 py-2.5 text-gray-700 truncate max-w-[120px]">{u.nickname||"-"}</td><td className="px-3 py-2.5">{(u.ig_accounts && u.ig_accounts.length) ? (<div className="flex items-center gap-1">{u.ig_accounts.map((ig:any,i:number)=>(<a key={i} href={`https://instagram.com/${ig.u}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} title={"@"+ig.u} className="inline-flex h-5 w-5 items-center justify-center rounded-md text-white" style={{background:"linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)"}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/></svg></a>))}</div>) : <span className="text-gray-300">-</span>}</td>
                  <td className="px-3 py-2.5">{u.role==="super_admin"?<span className="text-yellow-400 font-bold">👑 관리자</span>:u.role==="partner"?<span className="text-[#0064FF]">파트너</span>:<span className="text-gray-400">일반</span>}</td>
                  <td className="px-3 py-2.5 text-gray-700 capitalize">{u.plan||"-"}</td>
                  <td className="px-3 py-2.5 text-gray-400">{fmt(u.expires_at)}</td>
                  <td className="px-3 py-2.5">{u.marketing_consent?<span className="text-[#0064FF] font-bold">동의</span>:<span className="text-gray-300">-</span>}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{left.toLocaleString()} / {max.toLocaleString()}{evA>0 && <span className="ml-1 font-bold text-[#0064FF]">+{evA}체험</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 액션 영역 */}
      <div className="space-y-3">
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">구독 부여 / 수정 {selUser && <span className="text-[#0064FF]">— {selUser.email}</span>}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={planSel} onChange={e=>setPlanSel(e.target.value)} className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
              {plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input value={days} onChange={e=>setDays(e.target.value)} className="w-28 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="기간(일)" />
            <input value={payAmt} onChange={e=>setPayAmt(e.target.value)} className="w-36 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="결제금액(정산용·선택)" />
            <Btn onClick={grant} color="bg-[linear-gradient(140deg,#22C55E_0%,#16A34A_55%,#15803D_100%)] hover:brightness-95">✓ 구독 부여/연장</Btn>
            <Btn onClick={grantTrial} color="bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] hover:brightness-95">🎁 프로 체험 부여(이벤트)</Btn>
            <Btn onClick={cancel} color="bg-[linear-gradient(140deg,#F05252_0%,#E02424_55%,#C81E1E_100%)] hover:brightness-95">✕ 구독 취소</Btn>
            <Btn onClick={resetDev} color="bg-gray-200 hover:bg-gray-300">🖥 디바이스 모두 해제</Btn>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">이용권 관리</p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={0} max={1000000} value={amt} onChange={e=>setAmt(e.target.value)} className="w-36 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="변동량" />
            <Btn onClick={()=>credit("add")} color="bg-[linear-gradient(140deg,#22C55E_0%,#16A34A_55%,#15803D_100%)] hover:brightness-95">＋ 지급 (잔량 증가)</Btn>
            <Btn onClick={()=>credit("sub")} color="bg-[linear-gradient(140deg,#FB923C_0%,#EA580C_55%,#C2410C_100%)] hover:brightness-95">－ 차감 (잔량 감소)</Btn>
            <Btn onClick={()=>credit("reset")} color="bg-gray-200 hover:bg-gray-300">🔄 사용량 0으로 초기화</Btn>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">권한 변경 (파트너/관리자 지정)</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={roleSel} onChange={e=>setRoleSel(e.target.value)} className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
              <option value="user">일반 (user)</option><option value="partner">파트너 (partner)</option><option value="super_admin">관리자 (super_admin)</option></select>
            <Btn onClick={applyRole} color="bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] hover:brightness-95">✓ 권한 적용</Btn>
          </div>
        </div>

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
        {/* 파트너 플랜별 정산 — 권한이 파트너일 때만 */}
        {(selUser?.role === "partner" || roleSel === "partner") && (
          <div className="rounded-2xl bg-white border border-[#0064FF]/40 p-4">
            <p className="text-xs font-bold text-gray-700 mb-1">📊 파트너 플랜별 정산 수수료</p>
            <p className="text-[11px] text-gray-400 mb-3">설정한 수수료는 파트너스 탭의 "플랜별 수수료"와 결제 적립에 연동됩니다. {selUser?.role !== "partner" && "(먼저 '권한 적용'으로 파트너 지정 후 저장하세요)"}</p>
            <div className="space-y-2">
              {[["starter","스타터"],["pro","프로"],["master","마스터"]].map(([k,label])=>(
                <div key={k} className="flex items-center gap-2">
                  <span className="w-14 text-sm font-bold text-gray-700">{label}</span>
                  <select value={partnerRates[k].type} onChange={e=>setPR(k,{type:e.target.value})}
                    className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                    <option value="none">미적용</option>
                    <option value="percent">정률 %</option>
                    <option value="fixed">정액(원/건)</option>
                  </select>
                  {(partnerRates[k].type==="percent" || partnerRates[k].type==="fixed") && (
                    <input value={partnerRates[k].value} onChange={e=>setPR(k,{value:e.target.value})}
                      placeholder={partnerRates[k].type==="percent"?"예: 10":"예: 5000"}
                      className="w-28 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0064FF]" />
                  )}
                  {partnerRates[k].type==="percent" && <span className="text-xs text-gray-400">% (결제액 대비)</span>}
                  {partnerRates[k].type==="fixed" && <span className="text-xs text-gray-400">원 (건당)</span>}
                </div>
              ))}
            </div>
            <button onClick={savePartnerRates} className="mt-3 rounded-lg bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] hover:brightness-95 px-4 py-2 text-xs font-bold text-white">정산 수수료 저장</button>
            {prMsg && <p className="text-xs text-[#0064FF] mt-2">{prMsg}</p>}

            {/* 상위 파트너(친구) 오버라이드 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-1">👥 상위 파트너(친구) 오버라이드</p>
              <p className="text-[11px] text-gray-400 mb-2">이 파트너(강사)가 데려온 결제마다, 지정한 <b>상위 파트너(친구)</b>에게도 아래 금액이 추가 적립돼요. 비우고 저장하면 해제. (친구는 자기 계정 파트너스 탭에서 확인)</p>
              <input value={pcUpEmail} onChange={e=>setPcUpEmail(e.target.value)} placeholder="상위 파트너 이메일 (예: friend@gmail.com)"
                className="w-full mb-2 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500" />
              <div className="flex flex-wrap items-center gap-2">
                {[["starter","스타터"],["pro","프로"],["master","마스터"]].map(([k,label])=>(
                  <div key={k} className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">{label}</span>
                    <input value={pcUpOv[k]} onChange={e=>setPcUpOv(p=>({...p,[k]:e.target.value.replace(/[^0-9]/g,'')}))}
                      className="w-20 rounded-lg bg-gray-100 border border-gray-200 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500" />
                    <span className="text-xs text-gray-400">원</span>
                  </div>
                ))}
              </div>
              <button onClick={savePartnerUpline} className="mt-3 rounded-lg bg-[linear-gradient(140deg,#6366F1_0%,#4F46E5_55%,#4338CA_100%)] hover:brightness-95 px-4 py-2 text-xs font-bold text-white">상위 파트너 저장</button>
              {upMsg && <p className="text-xs text-indigo-500 mt-2">{upMsg}</p>}
            </div>

            {/* 파트너 전용 쿠폰 발급 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-1">🎟 이 파트너의 쿠폰 발급</p>
              <p className="text-[11px] text-gray-400 mb-3">발급된 코드는 이 파트너(owner_email)에 연결됩니다. 멤버가 이 코드를 입력 후 결제하면 위 정산 수수료로 자동 적립돼요.</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-14 text-xs text-gray-500">코드</span>
                <input value={pcCode} onChange={e=>setPcCode(e.target.value.toUpperCase())} placeholder="예: KIM2024"
                  className="flex-1 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm font-mono font-bold text-gray-900 outline-none focus:border-[#0064FF]" />
              </div>
              <div className="space-y-2">
                {[["starter","스타터"],["pro","프로"],["master","마스터"]].map(([k,label])=>(
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-14 text-sm font-bold text-gray-700">{label}</span>
                    <select value={pcDisc[k].type} onChange={e=>setPCD(k,{type:e.target.value})}
                      className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                      <option value="none">미적용</option>
                      <option value="percent">할인 %</option>
                      <option value="fixed">정액(원)</option>
                      <option value="free">무료(100%)</option>
                    </select>
                    {(pcDisc[k].type==="percent" || pcDisc[k].type==="fixed") && (
                      <input value={pcDisc[k].value} onChange={e=>setPCD(k,{value:e.target.value})}
                        placeholder={pcDisc[k].type==="percent"?"예: 20":"예: 10000"}
                        className="w-28 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0064FF]" />
                    )}
                    {pcDisc[k].type==="free" && <span className="text-xs text-[#0064FF] font-bold">결제 0원</span>}
                  </div>
                ))}
              </div>
              <button onClick={createPartnerCoupon} className="mt-3 rounded-lg bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] hover:brightness-95 px-4 py-2 text-xs font-bold text-white">코드 발급</button>

              <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2">🎁 무료 체험 쿠폰 (기간 한정)</p>
                <p className="text-[11px] text-gray-400 mb-2">할인 대신 선택 플랜을 N일간 무료로 부여해요. 멤버가 코드 입력 즉시 체험 시작 → N일 후 자동 만료. (체험은 위 할인 코드와 <b>다른 코드</b>를 쓰세요)</p>
                <div className="flex items-center gap-2">
                  <select value={pcTrialPlan} onChange={e=>setPcTrialPlan(e.target.value)}
                    className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                    <option value="starter">스타터</option><option value="pro">프로</option><option value="master">마스터</option>
                  </select>
                  <input value={pcTrialDays} onChange={e=>setPcTrialDays(e.target.value.replace(/[^0-9]/g,''))}
                    className="w-16 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0064FF]" />
                  <span className="text-sm text-gray-500">일</span>
                  <button onClick={createTrialCoupon} className="ml-auto rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-white">체험 쿠폰 발급</button>
                </div>
              </div>

              {pcMsg && <p className="text-xs text-[#0064FF] mt-2">{pcMsg}</p>}
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
