import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, Send, Copy, Check, Wand2, Flame, Plus, MessageSquareText, ChevronDown, Film, Download, Clipboard, Settings, Pencil, Trash2, ChevronLeft, ChevronRight, Sprout, BarChart3, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'
import VoiceOnboard from '../components/VoiceOnboard'
import PersonaSettings from '../components/PersonaSettings'
import { useAnalysis } from '../context/analysis'
import EnergyOrb from '../components/EnergyOrb'
import ClipAnalysisReport from '../components/ClipAnalysisReport'
import { TrendThumb } from '../components/TrendCard'
import VideoModal from '../components/ReelModal'
import { maskHandles } from '../lib/format'
import { logEvent } from '../lib/events'
import { phCapture } from '../lib/posthog'
import FindsPricing from '../components/FindsPricing'
import { PaywallSheet, RatingReasons, PmfSurvey } from '../components/VeraFeedback'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

// 변주(A/B)가 가끔 한 응답에 대본을 2개 담아올 때, 첫 대본(첫 CTA '남겨주세요' 줄까지)만 남긴다.
// 문장마다 줄바꿈 강제 — '내 말투' 학습 전사본이 한 줄짜리라 모델이 문단으로 붙여 쓰는 경우 보정.
// 이미 줄이 나뉜 짧은 줄은 건드리지 않고, 긴 줄만 문장 끝(? ! ~ . 또는 '~요/~죠' 뒤 공백)에서 자른다. CTA 키워드 따옴표 앞은 안 자름.
const lineize = (t) => {
  const out = []
  for (const raw of String(t ?? "").replace(/\r/g, "").split("\n")) {
    const x = raw.trim();
    if (!x) { out.push(""); continue; }
    if (x.length < 45) { out.push(x); continue; }
    const ch = [...x]; let cur = "";
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i]; cur += c;
      const next = ch[i + 1], after = ch[i + 2];
      if (next !== " " || after === undefined) continue;
      const endPunct = /[?!~.]/.test(c);
      const endYo = (c === "요" || c === "죠") && !/[필중]/.test(ch[i - 1] || "");
      if ((endPunct || endYo) && !/["“'‘]/.test(after) && cur.trim().length >= 6) { out.push(cur.trim()); cur = ""; i++; }
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
const oneScript = (t) => {
  const s = lineize(String(t ?? ''))
  if (!s.trim()) return s
  const lines = s.split('\n')
  const i = lines.findIndex((ln) => ln.includes('남겨주세요'))
  return i === -1 ? s.trim() : lines.slice(0, i + 1).join('\n').trim()
}

function Droplet({ size = 84, label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <EnergyOrb size={size} style={{ filter: 'drop-shadow(0 10px 34px rgba(0,100,255,.45))' }} />
      {label && <div className="text-sm text-white/50">{label}</div>}
    </div>
  )
}

// 내 말투 사전 — 베라가 실제로 학습한 말투 특징을 보여줘 '학습 체감'을 준다 (style_card 기반)
function VoiceDict({ vp }) {
  const sc = (vp && vp.style_card) || {}
  const phrases = Array.isArray(sc.signature_phrases) ? sc.signature_phrases.filter(Boolean).slice(0, 6) : []
  const chars = Array.isArray(sc.recurring_characters) ? sc.recurring_characters.filter(Boolean).slice(0, 5) : []
  const rows = [['톤', sc.tone], ['시작 패턴', sc.opening_pattern], ['마무리 패턴', sc.closing_pattern]].filter(([, v]) => v && String(v).trim())
  if (!rows.length && !phrases.length && !chars.length) return null
  return (
    <div className="w-full max-w-[640px] rounded-2xl glass p-4 text-left">
      <div className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-white">
        <Sprout size={14} className="text-emerald-400" /> 내 말투 사전
        <span className="ml-auto text-[11px] font-medium text-white/40">{vp.n_learned ? `영상 ${vp.n_learned}개 학습` : ''}{vp.edit_count ? ` · 수정 ${vp.edit_count}회 반영` : ''}</span>
      </div>
      <div className="space-y-1.5 text-[12px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2"><span className="w-[52px] shrink-0 text-white/40">{k}</span><span className="text-white/80">{v}</span></div>
        ))}
        {phrases.length > 0 && (
          <div className="flex gap-2"><span className="w-[52px] shrink-0 text-white/40">자주 쓰는 말</span><span className="flex flex-wrap gap-1">{phrases.map((p, i) => <span key={i} className="rounded-full bg-[#0064FF]/15 px-2 py-0.5 text-[11px] font-bold text-[#5AA0FF]">{p}</span>)}</span></div>
        )}
        {chars.length > 0 && (
          <div className="flex gap-2"><span className="w-[52px] shrink-0 text-white/40">등장인물</span><span className="flex flex-wrap gap-1">{chars.map((c, i) => <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/70">{c}</span>)}</span></div>
        )}
        {vp.avg_len ? <div className="flex gap-2"><span className="w-[52px] shrink-0 text-white/40">평균 길이</span><span className="text-white/80">약 {vp.avg_len}자 / 문장</span></div> : null}
      </div>
      <div className="mt-2.5 text-[11px] text-white/35">대본을 직접 고칠수록 베라가 더 정확히 배워요</div>
    </div>
  )
}

export default function ScriptAssistant({ session: sessionProp }) {
  const loc = useLocation()
  const nav = useNavigate()
  // 베라 이탈 퍼널 — 서버 로그(user_events) + PostHog 동시. 마지막 이벤트가 곧 이탈 지점.
  const track = (event, props) => { try { logEvent(event, props || {}); phCapture(event, props || {}) } catch { /* noop */ } }
  const sawScriptRef = useRef(false)   // 이번 세션에서 대본을 봤나 (이탈 분모)
  const actedRef = useRef(false)       // 복사/사용 등 실제로 써먹었나
  const refineRef = useRef(0)          // 재생성(다듬기) 횟수 — 많을수록 불만족 신호
  useEffect(() => {
    // 대본은 봤는데 아무것도 안 하고 떠나면(탭 닫기/화면 이탈) = 조용한 이탈
    const onLeave = () => { if (sawScriptRef.current && !actedRef.current) track('vera_abandoned', { refines: refineRef.current }) }
    window.addEventListener('beforeunload', onLeave)
    return () => { window.removeEventListener('beforeunload', onLeave); onLeave() }
  }, [])
  const [session, setSession] = useState(sessionProp || null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [soso, setSoso] = useState(null)        // {source_ref, caption, thumb} 트렌드 소재
  const [clips, setClips] = useState([])         // 이 작업의 소스 클립(레드노트 등)
  const [rnUrl, setRnUrl] = useState('')         // 레드노트 링크 입력
  const [rnBusy, setRnBusy] = useState(false)
  const [rnErr, setRnErr] = useState('')
  const [pendingAnalyze, setPendingAnalyze] = useState(false)  // 트렌드에서 분석 진입 시 자동 실행
  const [pendingGen, setPendingGen] = useState(false)  // 카드에서 대본 진입 시 자동 실행
  const [clipBox, setClipBox] = useState(null)   // 상단 원본 클립 박스 {source_ref, caption, thumb}
  const [playClip, setPlayClip] = useState(null) // 원본 영상 뷰어
  const [clipVideo, setClipVideo] = useState('') // 원본 영상 프리페치 URL
  const [balance, setBalance] = useState(null)
  const [turns, setTurns] = useState(null)
  const [freeChat, setFreeChat] = useState(null)   // 대본 세션 밖 잡담 {free_left, paid_left, free_total}
  const jobIdRef = useRef(null)
  const resendRef = useRef(null)
  const clipFiles = useRef({})                    // 모바일 공유용 클립 File 캐시 {clipId: File}
  const [clipSaving, setClipSaving] = useState(null)
  const [note, setNote] = useState('')
  const [copiedI, setCopiedI] = useState(-1)
  const [rated, setRated] = useState({})   // 대본별 평가(👍/👎)
  const [reasonDone, setReasonDone] = useState({})  // 평가 이유까지 남겼는지
  const [paywall, setPaywall] = useState(null)       // 이용권 소진 시트 {where}
  const [pricingOpen, setPricingOpen] = useState(false)
  const [pmfOpen, setPmfOpen] = useState(false)
  const openPaywall = (where) => setPaywall({ where })
  const [editIdx, setEditIdx] = useState(-1)
  const [editText, setEditText] = useState('')
  const [err, setErr] = useState('')
  const [stage, setStage] = useState('')
  const [nick, setNick] = useState('')
  const [today, setToday] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobsLoaded, setJobsLoaded] = useState(false)
  // 잡담(대본 세션 밖 대화) 기록: 세션 단위로 대화 전부 저장, 유저당 세션 최대 100개(서버가 오래된 것부터 정리)
  const [chatSessions, setChatSessions] = useState(null)   // [{id,title,updated_at,count}] (null=로딩 전)
  const [chatId, setChatId] = useState(null)               // 지금 보고 있는 잡담 세션
  const [nickLoaded, setNickLoaded] = useState(false)
  const [saveTick, setSaveTick] = useState(0)
  const chatIdRef = useRef(null)
  const freeReadyRef = useRef(false)  // 재방문 복원 판단 끝난 뒤에만 저장
  const lastSavedRef = useRef('')
  const savingRef = useRef(false)
  const [showJobs, setShowJobs] = useState(false)
  const [voiceProfile, setVoiceProfile] = useState(null)  // {has_voice, ig_username, style_card}
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardData, setOnboardData] = useState(null)   // 백그라운드 학습 결과(리뷰 재오픈용)
  const [voiceLearn, setVoiceLearn] = useState(null)     // { status:'learning' } 학습 토스트
  const [showSettings, setShowSettings] = useState(false)
  const [showConvList, setShowConvList] = useState(false)
  const [convCollapsed, setConvCollapsed] = useState(false)
  const [learnCount, setLearnCount] = useState(0)
  const [channelMode, setChannelMode] = useState(false)
  const { startChannel } = useAnalysis()
  const scrollRef = useRef(null)
  const greetedRef = useRef(false)
  const autoOpenRef = useRef(false)
  const textareaRef = useRef(null)
  const autoGrow = (el) => { if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px' }
  const resetGrow = () => { if (textareaRef.current) { textareaRef.current.style.height = 'auto' } }
  const [atBottom, setAtBottom] = useState(true)
  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  const checkAtBottom = () => setAtBottom((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 140))

  useEffect(() => {
    if (sessionProp) setSession(sessionProp)
    else supabase.auth.getSession().then(({ data }) => setSession(data.session || null))
  }, [sessionProp])
  useEffect(() => { if (session) { loadJobs(); refreshSession(); loadVoiceProfile() } }, [session])

  const loadVoiceProfile = async () => {
    try {
      const { data } = await supabase.rpc('get_voice_context_rpc')
      const has = !!(data && data.base_profile && Array.isArray(data.base_profile.transcripts) && data.base_profile.transcripts.length > 0)
      setVoiceProfile(has ? { has_voice: true, ig_username: data.ig_username || '', style_card: data.style_card || {}, avg_len: Number(data.avg_len || 0), edit_count: Number(data.edit_count || 0), n_learned: (data.base_profile && Array.isArray(data.base_profile.transcripts)) ? data.base_profile.transcripts.length : 0 } : { has_voice: false, ig_username: data?.ig_username || '' })
      setLearnCount(Number(data?.edit_count || 0))
    } catch { setVoiceProfile({ has_voice: false }) }
  }

  const deleteJob = async (id, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm('이 대본을 삭제할까요? 되돌릴 수 없어요.')) return
    try {
      await supabase.rpc('delete_job_rpc', { p_job_id: id })
      if (id === jobId) newChat()
      loadJobs()
    } catch { /* noop */ }
  }
  useEffect(() => {
    checkAtBottom()
    window.addEventListener('scroll', checkAtBottom, { passive: true })
    window.addEventListener('resize', checkAtBottom)
    return () => { window.removeEventListener('scroll', checkAtBottom); window.removeEventListener('resize', checkAtBottom) }
  }, [])
  // 모바일: 스크롤 끝에서 바운스(러버밴드)로 하단 입력창이 끌려 올라오는 현상 방지 — 베라 화면에서만 오버스크롤 끔
  useEffect(() => {
    const h = document.documentElement, b = document.body
    const ph = h.style.overscrollBehaviorY, pb = b.style.overscrollBehaviorY
    h.style.overscrollBehaviorY = 'none'; b.style.overscrollBehaviorY = 'none'
    return () => { h.style.overscrollBehaviorY = ph; b.style.overscrollBehaviorY = pb }
  }, [])
  useEffect(() => { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); const t = setTimeout(checkAtBottom, 400); return () => clearTimeout(t) }, [messages, busy])

  // 닉네임 · 오늘 트렌드 · 베라 인사
  useEffect(() => {
    if (!session) return
    ;(async () => {
      let nn = ''
      try { const { data: pf } = await supabase.from('profiles').select('nickname').eq('id', session.user.id).maybeSingle(); nn = pf?.nickname || '' } catch { /* noop */ }
      setNick(nn); setNickLoaded(true)
      supabase.rpc('trend_list_rpc', { p_limit: 3 }).then(({ data }) => setToday((Array.isArray(data) ? data : []).map(x => String(x.caption || '').replace(/\s+/g, ' ').trim().slice(0, 70)).filter(Boolean))).catch(() => {})
    })()
  }, [session])
  // 첫 방문(대본·대화 기록 없음)에만 베라 인사
  useEffect(() => {
    if (greetedRef.current || !session || !jobsLoaded || !nickLoaded || chatSessions === null) return
    if (messages.length === 0 && !soso && !jobId && jobs.length === 0 && chatSessions.length === 0) {
      greetedRef.current = true
      setMessages([{ role: 'assistant', text: `안녕하세요${nick ? ` ${nick}님` : ''}! 저는 대본 비서 베라예요 🙂\n트렌드에서 마음에 드는 영상을 열어 '대본 작성하기'를 누르면 기승전결 대본을 써드려요. 오늘 뭐가 뜨는지 궁금하면 편하게 물어보세요.` }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, jobsLoaded, nickLoaded, chatSessions, jobs])

  // 재방문 진입: 트렌드/분석 진입 의도가 없으면 가장 최근 세션 자동 열기
  useEffect(() => {
    if (autoOpenRef.current || !session || !jobsLoaded || chatSessions === null) return
    autoOpenRef.current = true; freeReadyRef.current = true
    const st = loc.state
    if ((st && (st.open_job || st.source_ref || st.caption)) || jobId || soso) return
    // 가장 최근에 쓴 쪽(잡담 세션 vs 대본)을 연다
    const c0 = chatSessions[0]
    const tAt = c0 ? Date.parse(c0.updated_at) : 0
    const jAt = jobs.length ? Date.parse(jobs[0].created_at) : 0
    if (c0 && tAt >= jAt) { greetedRef.current = true; openChat(c0.id); return }
    if (jobs.length > 0) { greetedRef.current = true; openJob(jobs[0].id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, jobs, jobsLoaded, chatSessions])

  // 트렌드 재생 모달의 "대본 작성하기" → 소재(클립) 자체를 비서로 가져오기
  useEffect(() => {
    const s = loc.state
    if (s && s.open_job) {          // 트렌드에서 백그라운드 생성해둔 대본 열기
      openJob(s.open_job)
      nav('.', { replace: true, state: null })
      return
    }
    if (s && (s.source_ref || s.caption)) {
      setMessages([]); setJobId(null); setClips([])
      const base = { source_ref: s.source_ref || null, caption: String(s.caption || '').replace(/\s+/g, ' ').trim(), thumb: s.thumbnail || '' }
      setSoso(base); setClipBox(base)
      if (s.analyze) setPendingAnalyze(true)
      if (s.gen) setPendingGen(true)   // 카드/모달에서 '대본' 1클릭 → 도착 즉시 자동 생성
      if (!base.caption && s.source_ref) {
        supabase.rpc('trend_detail_rpc', { p_shortcode: s.source_ref })
          .then(({ data }) => { const c = String(data?.caption || '').replace(/\s+/g, ' ').trim(); if (c) setSoso(v => ({ ...v, caption: c })) }).then(null, () => {})
      }
      nav('.', { replace: true, state: null })
    }
  }, [loc.state])

  // 클립 박스 캡션 보충 + 원본 영상 프리페치
  useEffect(() => {
    if (clipBox && clipBox.source_ref && (!clipBox.caption || !clipBox.thumb)) {
      supabase.rpc('trend_detail_rpc', { p_shortcode: clipBox.source_ref })
        .then(({ data }) => {
          const c = String(data?.caption || '').replace(/\s+/g, ' ').trim()
          const th = String(data?.thumbnail_url || '').trim()
          setClipBox(v => (v && v.source_ref === clipBox.source_ref) ? { ...v, caption: c || v.caption, thumb: v.thumb || th } : v)
        }).then(null, () => {})
    }
    setClipVideo('')
    const sc = clipBox?.source_ref
    if (!sc) return
    let alive = true
    supabase.functions.invoke('trend-reel', { body: { shortcode: sc } }).then(({ data }) => { if (alive && data?.video_url) setClipVideo(data.video_url) }).then(null, () => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipBox?.source_ref])

  // 소재 카드 썸네일 보충 — source_ref 만 있고 썸네일이 비었을 때(채팅 트렌드/재진입) 원본 썸네일을 채운다
  useEffect(() => {
    if (!soso || !soso.source_ref || soso.thumb) return
    let alive = true
    supabase.rpc('trend_detail_rpc', { p_shortcode: soso.source_ref })
      .then(({ data }) => { const th = String(data?.thumbnail_url || '').trim(); if (alive && th) setSoso(v => (v && v.source_ref === soso.source_ref && !v.thumb) ? { ...v, thumb: th } : v) }).then(null, () => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soso?.source_ref])

  // 트렌드에서 '분석'으로 진입하면 소재 붙은 뒤 자동 분석
  useEffect(() => {
    if (pendingAnalyze && soso && (soso.caption || soso.source_ref)) { setPendingAnalyze(false); analyzeSosoToChat() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnalyze, soso])
  useEffect(() => {
    if (pendingGen && soso && (soso.caption || soso.source_ref)) { setPendingGen(false); generateFromSoso() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGen, soso])

  // 화면에 오래 켜 둔 뒤(절전 등) 저장된 토큰이 만료돼 401 나던 문제 — 매번 최신 세션을 받고, 만료 임박이면 갱신한다.
  const token = async () => {
    try {
      let s = (await supabase.auth.getSession()).data.session
      if (s?.expires_at && s.expires_at * 1000 - Date.now() < 60000) { const r = await supabase.auth.refreshSession(); s = r.data.session || s }
      return s?.access_token || session?.access_token
    } catch { return session?.access_token }
  }
  const refreshSession = async () => {
    try {
      const t = await token(); if (!t) return
      const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'session', job_id: jobIdRef.current }) })
      const d = await r.json(); if (d.ok) { if (jobIdRef.current) setTurns(typeof d.turns_left === 'number' ? d.turns_left : null); if (typeof d.balance === 'number') setBalance(d.balance); if (d.free_chat) setFreeChat(d.free_chat) }
    } catch { /* noop */ }
  }
  useEffect(() => { jobIdRef.current = jobId }, [jobId])
  // 잡담 충전 직후 막혔던 메시지 자동 재전송(최신 messages 기준)
  useEffect(() => { if (resendRef.current && !busy) { const t = resendRef.current; resendRef.current = null; send(t) } }, [messages])
  const unlockChat = async (i, pending) => {
    if (busy) return
    setErr(''); setBusy(true); setStage('대화 충전 중…')
    try {
      const t = await token(); if (!t) { setErr('로그인이 필요해요'); return }
      const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unlock_chat' }) })
      const d = await r.json()
      if (!d.ok) { if (d.code === 'INSUFFICIENT_CREDITS') openPaywall('unlock_chat'); setErr(d.code === 'INSUFFICIENT_CREDITS' ? `이용권이 부족해요 (필요 ${d.need || 2}개)` : (d.error || '충전 실패')); return }
      if (typeof d.balance === 'number') setBalance(d.balance)
      if (d.free_chat) setFreeChat(d.free_chat)
      setNote(`💧 이용권 1개 · 대화 ${d.free_chat?.paid_left ?? 10}회 충전됐어요`); setTimeout(() => setNote(''), 4000)
      track('vera_chat_unlocked')
      // 안내 버블과 막혔던 내 메시지를 걷어내고 그대로 다시 보냄
      resendRef.current = pending || null
      setMessages((m) => { const out = m.filter((_, k) => k !== i); const last = out[out.length - 1]; if (pending && last && last.role === 'user' && last.text === pending) out.pop(); return out })
    } catch (e) { setErr(String(e)) } finally { setBusy(false); setStage('') }
  }
  // ── 소스 클립 저장 ──
  // PC: ?download= 로 첨부 다운로드 / 모바일: 영상 파일을 공유시트로 넘겨 '비디오 저장'(사진앱) 가능
  const isMobileUA = () => typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)))
  const clipName = (i) => `chronit_clip_${i + 1}.mp4`
  const dlHref = (u, i) => u + (u.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(clipName(i))
  const hardDownload = (href) => { const a = document.createElement('a'); a.href = href; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove() }
  const clipFile = async (c, i) => {
    if (clipFiles.current[c.id]) return clipFiles.current[c.id]
    const b = await (await fetch(c.storage_path)).blob()
    const f = new File([b], clipName(i), { type: b.type || 'video/mp4' }); clipFiles.current[c.id] = f; return f
  }
  // 모바일은 미리 받아둠 → 탭 즉시 공유시트(iOS는 다운로드가 길면 공유 권한이 만료됨)
  useEffect(() => {
    if (!isMobileUA()) return
    clips.forEach((c, i) => { if (c.status === 'ready' && c.storage_path && !clipFiles.current[c.id]) clipFile(c, i).catch(() => {}) })
  }, [clips])
  const shareFiles = async (files) => {
    if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files }); return true }
    return false
  }
  const saveClip = async (c, i) => {
    if (!c?.storage_path || clipSaving) return
    actedRef.current = true; try { track('vera_clip_saved', { mobile: isMobileUA() }) } catch { /* noop */ }
    if (!isMobileUA() || !navigator.share) { hardDownload(dlHref(c.storage_path, i)); return }
    setClipSaving(c.id)
    try {
      const f = await clipFile(c, i)
      if (!(await shareFiles([f]))) hardDownload(dlHref(c.storage_path, i))
    } catch (e) {
      if (e?.name === 'AbortError') return   // 사용자가 공유창 닫음
      if (e?.name === 'NotAllowedError' && clipFiles.current[c.id]) { setNote('저장 준비 완료 — 한 번 더 누르면 저장 창이 떠요'); setTimeout(() => setNote(''), 3500); return }
      hardDownload(dlHref(c.storage_path, i))
    } finally { setClipSaving(null) }
  }
  const saveAllClips = async () => {
    const ready = clips.map((c, i) => ({ c, i })).filter(({ c }) => c.status === 'ready' && c.storage_path)
    if (!ready.length || clipSaving) return
    if (!isMobileUA() || !navigator.share) { ready.forEach(({ c, i }, k) => setTimeout(() => hardDownload(dlHref(c.storage_path, i)), k * 700)); return }
    setClipSaving('all')
    try {
      const files = await Promise.all(ready.map(({ c, i }) => clipFile(c, i)))
      if (!(await shareFiles(files))) ready.forEach(({ c, i }, k) => setTimeout(() => hardDownload(dlHref(c.storage_path, i)), k * 700))
    } catch (e) {
      if (e?.name === 'AbortError') return
      if (e?.name === 'NotAllowedError') { setNote('저장 준비 완료 — 한 번 더 누르면 저장 창이 떠요'); setTimeout(() => setNote(''), 3500); return }
      ready.forEach(({ c, i }, k) => setTimeout(() => hardDownload(dlHref(c.storage_path, i)), k * 700))
    } finally { setClipSaving(null) }
  }
  const toStore = (m) => {
    if (!m || m.notice || m.unlockChat || m.voicePreview || m.report || m.captionAB || m.ab || m.isScript) return null
    if (m.trends) return { role: 'assistant', trends: (m.trends || []).slice(0, 6).map((it) => ({ shortcode: it.shortcode, caption: String(it.caption || '').slice(0, 120), thumbnail_url: it.thumbnail_url || '', category: it.category || '' })), trendCat: m.trendCat || '', note: m.note || '', fallback: !!m.fallback }
    if ((m.role === 'user' || m.role === 'assistant') && m.text) return { role: m.role, text: String(m.text).slice(0, 4000) }
    return null
  }
  const CHAT_SESSION_MAX = 10     // 잡담 세션 최대 개수(자동 삭제 없음 — 꽉 차면 안내)
  const CHAT_TURN_MAX = 100       // 한 세션 안 저장 대화 수(질문+답변 1회 = 1). 넘으면 위에서부터 밀려남
  const [sessionLimitMsg, setSessionLimitMsg] = useState('')
  const userCount = (arr) => arr.reduce((n, m) => n + (m && m.role === 'user' ? 1 : 0), 0)
  // 최근 max번의 대화만 남김(오래된 대화부터 제거, 질문 단위로 자름)
  const trimTurns = (arr, max = CHAT_TURN_MAX) => {
    let n = 0
    for (let i = arr.length - 1; i >= 0; i--) { if (arr[i] && arr[i].role === 'user') { n++; if (n === max) { const rest = arr.slice(0, i); return userCount(rest) > 0 ? arr.slice(i) : arr } } }
    return arr
  }
  const sessionFull = () => (chatSessions?.length || 0) >= CHAT_SESSION_MAX
  const limitText = `대화는 최대 ${CHAT_SESSION_MAX}개까지 저장돼요. 목록에서 안 쓰는 대화를 지우면 새 대화를 열 수 있어요.`
  const loadChatSessions = () => supabase.rpc('list_chat_sessions_rpc', { p_limit: 100 }).then(({ data }) => setChatSessions(Array.isArray(data) ? data : []), () => setChatSessions((v) => v || []))
  useEffect(() => { if (session) loadChatSessions() }, [session])
  // 잡담 화면(대본/소재 없음)에서 대화가 끝날 때마다 현재 세션에 전체 저장. 첫 저장 때 세션 생성
  useEffect(() => {
    if (!freeReadyRef.current || jobId || soso || busy || savingRef.current) return
    if (userCount(messages) > CHAT_TURN_MAX) { setMessages((m) => trimTurns(m)); return }   // 100회 초과분은 위에서부터 정리
    const all = messages.map(toStore).filter(Boolean)
    if (!all.some((m) => m.role === 'user')) return   // 인사말만 있을 땐 세션 안 만듦
    const key = JSON.stringify(all)
    if (key === lastSavedRef.current) return
    savingRef.current = true; lastSavedRef.current = key
    const title = String(all.find((m) => m.role === 'user')?.text || '').replace(/\s+/g, ' ').trim().slice(0, 40)
    supabase.rpc('save_chat_session_rpc', { p_id: chatIdRef.current, p_messages: all, p_title: title }).then(({ data }) => {
      savingRef.current = false
      if (data?.ok && data.id) { if (!chatIdRef.current) { chatIdRef.current = data.id; setChatId(data.id) }; loadChatSessions() }
      else if (data?.code === 'SESSION_LIMIT') { setSessionLimitMsg(limitText); setMessages((m) => [...m, { role: 'assistant', notice: true, text: '⚠️ ' + limitText + ' (이 대화는 저장되지 않았어요)' }]) }
      else lastSavedRef.current = ''
      setSaveTick((t) => t + 1)
    }, () => { savingRef.current = false; lastSavedRef.current = ''; setSaveTick((t) => t + 1) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, jobId, soso, busy, saveTick])
  const openChat = async (id) => {
    setShowJobs(false); setErr(''); setJobId(null); setSoso(null); setClipBox(null); setPlayClip(null); setClips([]); setTurns(null)
    try {
      const { data } = await supabase.rpc('get_chat_session_rpc', { p_id: id })
      const msgs = data?.ok && Array.isArray(data.messages) ? data.messages : []
      lastSavedRef.current = JSON.stringify(msgs); chatIdRef.current = id; setChatId(id); setMessages(msgs)
    } catch { setErr('대화를 불러오지 못했어요') }
  }
  const deleteChat = async (id, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm('이 대화를 삭제할까요? 되돌릴 수 없어요.')) return
    try { await supabase.rpc('delete_chat_session_rpc', { p_id: id }); setSessionLimitMsg(''); if (id === chatIdRef.current && !jobId) newChat(); loadChatSessions() } catch { /* noop */ }
  }
  const applyMeter = (d) => {
    if (typeof d.turns_left === 'number') setTurns(d.turns_left)
    if (d.free_chat) setFreeChat(d.free_chat)
    if (typeof d.balance === 'number') setBalance(d.balance)
    if (d.charged) { setNote('💧 이용권 2개 · 이 대본 10턴 세션'); setTimeout(() => setNote(''), 4000) }
  }
  const lastScript = () => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant' && messages[i].text) return messages[i].text; return '' }

  const loadJobs = async () => {
    const { data } = await supabase.from('jobs').select('id,product_name,created_at,status').order('created_at', { ascending: false }).limit(100)
    setJobs(data || []); setJobsLoaded(true)
  }
  const openJob = async (id) => {
    setShowJobs(false); setErr('')
    const [{ data: msgs }, { data: cl }, { data: jrow }] = await Promise.all([
      supabase.from('job_messages').select('role,content').eq('job_id', id).order('created_at'),
      supabase.from('job_clips').select('id,storage_path,source_url,status').eq('job_id', id),
      supabase.from('jobs').select('voice_mode,product_name,selling_points,analysis,status,source_ref,script,script_b,ab_pending').eq('id', id).maybeSingle(),
    ])
    const isMy = jrow?.voice_mode === 'my' && voiceProfile?.has_voice === true
    // 분석 자료(상품·셀링포인트) 복원 — 첫 대본 메시지에 붙인다
    let sell = String(jrow?.selling_points || '')
    if (jrow?.product_name && sell.startsWith(jrow.product_name + ' — ')) sell = sell.slice((jrow.product_name + ' — ').length)
    const analysis = (jrow?.product_name || sell) ? { product: jrow?.product_name || '', selling: sell ? sell.split(' / ').filter(Boolean) : [] } : null
    let attached = false
    const built = (msgs || []).map(m => {
      if (m.role === 'caption') { try { const c = JSON.parse(m.content || '{}'); return { role: 'assistant', captionAB: true, a: c.a || '', b: c.b || null } } catch { return null } }
      const isA = m.role === 'assistant'
      const looksScript = isA && !!m.content && ((m.content.includes('\n') && m.content.replace(/\s/g, '').length > 30) || m.content.includes('남겨주세요'))
      const base = { role: m.role, text: looksScript ? lineize(m.content) : m.content, isScript: looksScript, mine: looksScript && isMy }
      if (looksScript && analysis && !attached) { attached = true; base.analysis = analysis }
      return base
    }).filter(Boolean)
    if (jrow?.ab_pending && jrow?.script_b) {
      const cleaned = built.filter((m) => !m.isScript)
      cleaned.push({ role: 'assistant', ab: true, a: oneScript(jrow.script || ''), b: oneScript(jrow.script_b), genre: '', mine: isMy, analysis, jobId: id })
      built.length = 0; built.push(...cleaned)
    }
    if (jrow?.analysis) built.unshift({ role: 'assistant', report: jrow.analysis })
    chatIdRef.current = null; setChatId(null)
    setMessages(built); setClips(cl || []); setJobId(id); setSoso(null)
    if (jrow?.source_ref) setClipBox(v => (v && v.source_ref === jrow.source_ref) ? v : { source_ref: jrow.source_ref, caption: '', thumb: '' }); else setClipBox(null)
    try { const { data: jt } = await supabase.rpc('get_job_turns_rpc', { p_job_id: id }); setTurns(typeof jt?.turns_left === 'number' ? jt.turns_left : null) } catch { setTurns(null) }
  }
  const newChat = () => { chatIdRef.current = null; setChatId(null); lastSavedRef.current = ''; setMessages([]); setJobId(null); setSoso(null); setClipBox(null); setPlayClip(null); setClips([]); setInput(''); setErr(''); setShowJobs(false); setTurns(null); resetGrow() }

  // 채널 분석: URL 입력 유도 → 다음 전송에서 실제 분석 실행
  const startChannelAnalysis = () => {
    setChannelMode(true)
    setMessages(m => [...m, { role: 'assistant', text: '분석할 채널의 인스타그램 또는 틱톡 URL(또는 @아이디)을 보내주세요 🔗\n최근 콘텐츠 방향과 잘 되는 패턴을 분석해드릴게요.' }])
    setShowConvList(false)
    setTimeout(() => textareaRef.current?.focus(), 60)
  }

  // 소재 분석(상품·셀링포인트) — 캐시 우선, 무료
  const analyzeSoso = async (t) => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      let niche = '', persona = ''
      try { const { data: pf } = await supabase.from('profiles').select('niche').eq('id', s.user.id).maybeSingle(); niche = pf?.niche || '' } catch { /* noop */ }
      try { const { data: vc } = await supabase.rpc('get_voice_context_rpc'); persona = vc?.persona?.target || '' } catch { /* noop */ }
      const cacheKey = String(soso.source_ref || soso.caption || '').slice(0, 280) + '|' + niche + '|' + persona + '|v10'
      try { const { data: cached } = await supabase.rpc('get_analyze_cache_rpc', { p_key: cacheKey }); if (cached && cached.ok) return cached } catch { /* noop */ }
      const ar = await fetch(FN('analyze-clip'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: soso.caption, source: 'trend', thumbnail_url: soso.thumb, niche, persona, video_id: soso.source_ref }) })
      const ad = await ar.json()
      if (ad?.ok) { try { await supabase.rpc('set_analyze_cache_rpc', { p_key: cacheKey, p_result: ad }) } catch { /* noop */ } ; return ad }
    } catch { /* noop */ }
    return null
  }

  // 분석 결과를 베라 채팅 메시지로 포맷
  const formatAnalysis = (a) => {
    const L = ['📊 소재 분석']
    if (a.hook) L.push(`\n[훅] ${a.hook}${a.hook_score != null ? ` · ${a.hook_score}점` : ''}${a.hook_type ? ` · ${a.hook_type}` : ''}`)
    if (a.hook_why) L.push(`  ↳ ${a.hook_why}`)
    if (a.payoff) L.push(`[결말] ${a.payoff}${a.payoff_score != null ? ` · ${a.payoff_score}점` : ''}`)
    if (Array.isArray(a.selling_points) && a.selling_points.length) L.push(`[셀링포인트] ${a.selling_points.join(' · ')}`)
    if (a.structure) L.push(`[구성] ${a.structure}`)
    if (a.target) L.push(`[타깃] ${a.target}`)
    const cs = a.comment_sentiment
    if (cs && (cs.purchase_intent || cs.positive || cs.question)) L.push(`[댓글 반응] 구매의도 ${cs.purchase_intent}% · 질문 ${cs.question}% · 긍정 ${cs.positive}%`)
    const rx = a.remix || {}
    if (Array.isArray(rx.hook_ideas) && rx.hook_ideas.length) L.push(`\n[내 걸로 · 훅 아이디어]\n${rx.hook_ideas.map((x) => `· ${x}`).join('\n')}`)
    if (Array.isArray(rx.edit_script) && rx.edit_script.length) L.push(`[편집 순서]\n${rx.edit_script.map((x, i) => `${i + 1}. ${x}`).join('\n')}`)
    if (Array.isArray(rx.differentiation) && rx.differentiation.length) L.push(`[차별화]\n${rx.differentiation.map((x) => `· ${x}`).join('\n')}`)
    if (Array.isArray(a.hashtags) && a.hashtags.length) L.push(`[해시태그] ${a.hashtags.join(' ')}`)
    return L.join('\n')
  }

  // 소재 분석 → 베라 채팅으로 (캐시 히트=무료, 신규=이용권 1개)
  const analyzeSosoToChat = async () => {
    if (busy) return
    if (!soso) { setErr('먼저 트렌드에서 소재를 골라주세요'); return }
    const t = await token(); if (!t) { setErr('로그인이 필요해요'); return }
    setErr(''); setBusy(true); setStage('소재 분석 중…')
    try {
      const { data: { session: se } } = await supabase.auth.getSession()
      let niche = '', persona = ''
      try { const { data: pf } = await supabase.from('profiles').select('niche').eq('id', se.user.id).maybeSingle(); niche = pf?.niche || '' } catch { /* noop */ }
      try { const { data: vc } = await supabase.rpc('get_voice_context_rpc'); persona = vc?.persona?.target || '' } catch { /* noop */ }
      const cacheKey = String(soso.source_ref || soso.caption || '').slice(0, 280) + '|' + niche + '|' + persona + '|v10'
      let a = null
      try { const { data: cached } = await supabase.rpc('get_analyze_cache_rpc', { p_key: cacheKey }); if (cached && cached.ok) a = cached } catch { /* noop */ }
      if (!a) {
        if (balance !== null && balance < 1) { openPaywall('analyze'); setErr('소재 분석엔 이용권 1개가 필요해요'); return }
        const ar = await fetch(FN('analyze-clip'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: soso.caption, source: 'trend', thumbnail_url: soso.thumb, niche, persona, video_id: soso.source_ref }) })
        const ad = await ar.json()
        if (!ad?.ok) { setErr(ad?.error || '분석에 실패했어요. 잠시 후 다시 시도해 주세요'); return }
        try { await supabase.rpc('set_analyze_cache_rpc', { p_key: cacheKey, p_result: ad }) } catch { /* noop */ }
        a = ad
      }
      const sp0 = Array.isArray(a.selling_points) ? a.selling_points.filter(Boolean) : []
      const prod0 = a.product_name || (soso.caption || '').split(/[—\-.\n]/)[0].slice(0, 60)
      let sell0 = sp0.length ? sp0.join(' / ') : (soso.caption || '')
      if (a.product_name) sell0 = a.product_name + ' — ' + sell0
      // 분석 = 이용권 1개로 세션 생성 → 왼쪽 대본 리스트에 남는다
      if (jobId) {
        setMessages((m) => [...m, { role: 'assistant', report: a }])
      } else {
        const { data: aj } = await supabase.rpc('create_analysis_job_rpc', { p_source_ref: soso.source_ref || null, p_product_name: prod0, p_selling_points: sell0, p_analysis: a })
        if (aj && aj.ok) {
          setJobId(aj.job_id); setTurns(0)
          if (typeof aj.balance === 'number') setBalance(aj.balance)
          setNote('💧 소재 분석 · 이용권 1개'); setTimeout(() => setNote(''), 3000)
          setMessages((m) => [...m, { role: 'assistant', report: a }]); loadJobs()
        } else if (aj && aj.code === 'INSUFFICIENT_CREDITS') { openPaywall('analyze'); setErr('소재 분석엔 이용권 1개가 필요해요'); return }
        else { setMessages((m) => [...m, { role: 'assistant', report: a }]) }
      }
      if (a.product_name || sp0.length) setSoso((v) => ({ ...v, product: a.product_name || v.product, selling: sp0.length ? sp0 : v.selling }))
    } catch (e) { setErr(String(e)) } finally { setBusy(false); setStage('') }
  }

  // 소재 카드로 대본 만들기 (분석 → 대본, 이용권 1)
  const chooseVariant = async (i, variant) => {
    setMessages((m) => m.map((x, idx) => (idx !== i || !x.ab) ? x : { role: 'assistant', text: variant === 'B' ? x.b : x.a, isScript: true, mine: x.mine, analysis: x.analysis }))
    const msg = messages[i]; if (!msg) return
    const chosen = variant === 'B' ? msg.b : msg.a; const jid = jobId || msg.jobId
    try { track('vera_ab_chosen', { variant, genre: msg.genre }) } catch { /* noop */ }
    try { const t = await token(); if (!t || !jid) return; await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'choose', job_id: jid, script: chosen, variant, genre: msg.genre }) }) } catch { /* noop */ }
  }
  const clipAnalyze = () => { if (!clipBox) return; setPlayClip(null); setSoso({ source_ref: clipBox.source_ref, caption: clipBox.caption || '', thumb: clipBox.thumb || '' }); setPendingAnalyze(true) }
  const clipScript = () => { if (!clipBox) return; setPlayClip(null); setSoso({ source_ref: clipBox.source_ref, caption: clipBox.caption || '', thumb: clipBox.thumb || '' }); setPendingGen(true) }

  const generateFromSoso = async () => {
    if (busy || !soso) return
    setErr(''); setBusy(true); setStage('소재 분석 중… (상품·셀링포인트)')
    const t = await token(); if (!t) { setErr('로그인이 필요해요'); setBusy(false); setStage(''); return }
    try {
      const a = await analyzeSoso(t)
      let product = a?.product_name || ''
      const sp = Array.isArray(a?.selling_points) ? a.selling_points.filter(Boolean) : []
      let selling = sp.length ? sp.join(' / ') : (soso.caption || '')
      if (product) selling = product + ' — ' + selling
      if (a) setSoso(v => ({ ...v, product, selling: sp }))
      setStage('대본을 짓는 중…')
      const gbody = { action: 'generate', voice_mode: 'my', source_ref: soso.source_ref, product_name: product || (soso.caption || '').split(/[—\-.\n]/)[0].slice(0, 60), selling_points: selling }
      if (jobId) gbody.job_id = jobId
      const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(gbody) })
      const d = await r.json()
      if (!d.ok) { const blocked = d.code === 'INSUFFICIENT_CREDITS'; track(blocked ? 'vera_blocked_credits' : 'vera_gen_failed', { where: 'generate' }); if (blocked) openPaywall('generate'); setErr(blocked ? `이용권이 부족해요. 10턴 세션을 열려면 이용권 ${d.need || 2}개가 필요해요.` : (d.error || '대본 생성 실패')); return }
      const meta = { mine: voiceProfile?.has_voice === true, analysis: { product, selling: sp }, jobId: jobId || d.job_id, genre: d.genre || null }
      const outMsg = d.script_b ? { role: 'assistant', ab: true, a: oneScript(d.script), b: oneScript(d.script_b), ...meta } : { role: 'assistant', text: oneScript(d.script), isScript: true, ...meta }
      if (jobId) { applyMeter(d); setMessages((m) => [...m, outMsg]) }
      else { setJobId(d.job_id); applyMeter(d); setMessages([outMsg]) }
      sawScriptRef.current = true; track('vera_script_shown', { source: 'soso', mine: voiceProfile?.has_voice === true })
      loadJobs()
    } catch (e) { track('vera_gen_failed', { where: 'generate', error: String(e).slice(0, 120) }); setErr(String(e)) } finally { setBusy(false); setStage('') }
  }

  // 채팅 트렌드 카드에서 소재 선택 → 대본/분석 자동 실행 (새 소재이므로 새 세션)
  const pickTrend = (it, mode) => {
    if (busy) return
    const clip = { source_ref: it.shortcode, caption: String(it.caption || '').replace(/\s+/g, ' ').trim(), thumb: it.thumbnail_url || '' }
    setJobId(null); setSoso(clip)
    if (mode === 'analyze') setPendingAnalyze(true); else setPendingGen(true)
  }

  // 베라와 대화 (무료). 대본이 있으면 요청 시 다듬어 줌(무료). 새 대본 커밋은 소재 카드로.
  const send = async (preset) => {
    const text = (typeof preset === 'string' ? preset : input).trim(); if (!text || busy) return
    setErr(''); if (typeof preset !== 'string') { setInput(''); resetGrow() }
    // 채널 분석 모드 — URL/아이디를 받아 실제 분석 실행 (기존 채널분석 시스템 재활용)
    if (channelMode) {
      setChannelMode(false)
      setMessages(m => [...m, { role: 'user', text }, { role: 'assistant', text: '채널을 분석하고 있어요 📊 결과 창이 곧 떠요. (분석은 이용권 1개)' }])
      try { startChannel && startChannel(text) } catch { setErr('채널 분석을 시작하지 못했어요') }
      return
    }
    const t = await token(); if (!t) { setErr('로그인이 필요해요'); setMessages(m => [...m, { role: 'assistant', text: '로그인이 필요해요 🙏 새로고침 후 다시 시도해 주세요.' }]); return }
    const prevScript = jobId ? lastScript() : ''
    const chatJob = (jobId && (turns > 0 || prevScript)) ? jobId : null
    const freeView = !jobId && !soso
    if (freeView && !chatIdRef.current && sessionFull()) {
      setSessionLimitMsg(limitText)
      setMessages((m) => [...m, { role: 'assistant', notice: true, text: '⚠️ ' + limitText }])
      if (typeof preset !== 'string') setInput(text)
      return
    }
    const newMsgs = [...messages, { role: 'user', text }]
    const turnNo = freeView ? userCount(newMsgs) : 0
    setMessages(newMsgs); setBusy(true); setStage('베라가 생각 중…')
    try {
      const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat', job_id: chatJob, messages: newMsgs.map(m => ({ role: m.role, content: m.text })).filter(m => m.content), current_script: prevScript, nickname: nick, today_trends: today }) })
      const d = await r.json()
      if (!d.ok && d.code === 'FREE_CHAT_LIMIT') {
        if (d.free_chat) setFreeChat(d.free_chat)
        track('vera_chat_limit')
        setMessages(m => [...m, { role: 'assistant', unlockChat: true, pending: text, need: d.need || 1, cycle: d.cycle || 10 }])
        return
      }
      if (!d.ok) {
        const blocked = d.code === 'INSUFFICIENT_CREDITS'
        track(blocked ? 'vera_blocked_credits' : 'vera_gen_failed', { where: 'chat' }); if (blocked) openPaywall('chat')
        const bubble = blocked ? `이용권이 부족해요. 대화를 이어가려면 이용권 ${d.need || 2}개가 필요해요.` : '앗, 잠깐 문제가 있었어요 😢 한 번만 다시 보내주실래요?'
        setErr(blocked ? bubble : (d.error || '응답 실패'))
        setMessages(m => [...m, { role: 'assistant', text: bubble }])
        return
      }
      // 서버(LLM)가 트렌드 목록 요청으로 판단 → 실제 카드 렌더 (무료)
      if (Array.isArray(d.trends)) {
        if (d.trends.length) setMessages(m => [...m, { role: 'assistant', trends: d.trends, trendCat: d.trend_cat || '', note: d.note || '', fallback: !!d.fallback }])
        else setMessages(m => [...m, { role: 'assistant', text: '그 소재는 지금 뜨는 게 안 보여요. 다른 키워드로 물어보거나 트렌드 탭에서 직접 찾아볼 수 있어요.' }])
        return
      }
      applyMeter(d)
      let shown = false
      if (d.reply) { setMessages(m => [...m, { role: 'assistant', text: d.reply }]); shown = true }
      if (d.script && chatJob) {
        shown = true
        sawScriptRef.current = true; track('vera_script_shown', { source: 'chat' })
        setMessages(m => [...m, { role: 'assistant', text: d.script, isScript: true }])
        supabase.rpc('set_job_script_rpc', { p_job_id: chatJob, p_script: d.script, p_status: 'done' }).then(null, () => {})
        if (prevScript) supabase.rpc('record_edit_rpc', { p_job_id: chatJob, p_before: prevScript, p_after: d.script }).then(null, () => {})
      }
      const logJob = chatJob || jobId
      if (logJob) {
        supabase.rpc('append_job_message_rpc', { p_job_id: logJob, p_role: 'user', p_content: text }).then(null, () => {})
        if (d.reply) supabase.rpc('append_job_message_rpc', { p_job_id: logJob, p_role: 'assistant', p_content: d.reply }).then(null, () => {})
      }
      if (!shown) setMessages(m => [...m, { role: 'assistant', text: '네, 말씀하세요!' }])
      if (turnNo === CHAT_TURN_MAX) setMessages(m => [...m, { role: 'assistant', notice: true, text: `📌 이번이 이 대화의 ${CHAT_TURN_MAX}번째 대화예요. 다음 대화부터는 맨 위의 오래된 대화부터 지워지면서 최근 ${CHAT_TURN_MAX}개만 저장돼요.` }])
    } catch (e) { track('vera_gen_failed', { where: 'chat', error: String(e).slice(0, 120) }); setErr(String(e)); setMessages(m => [...m, { role: 'assistant', text: '연결이 잠깐 불안정했어요 😢 다시 한 번 보내주실래요?' }]) } finally { setBusy(false); setStage('') }
  }

  // 내 말투 백그라운드 학습: 모달 닫고 토스트 → 완료되면 리뷰 재오픈(서버는 이미 저장됨)
  const startVoiceLearnBg = async (handle) => {
    setShowOnboard(false); setOnboardData(null); setVoiceLearn({ status: 'learning' })
    try {
      const t = await token(); if (!t) { setErr('로그인이 필요해요'); setVoiceLearn(null); return }
      const r = await fetch(FN('voice-onboard'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: handle }) })
      const d = await r.json()
      if (!d.ok) { if (d.code === 'INSUFFICIENT_CREDITS') { openPaywall('relearn'); setErr('재학습에 이용권 1개가 필요해요') } else { setNote('게시물이 없어 기본 설정만 저장했어요. 최근 게시물이 생기면 다시 학습할 수 있어요'); setTimeout(() => setNote(''), 5000); loadVoiceProfile() } }
      else if (d.skipped) { setNote('✨ 새로 올린 릴스가 없어 기존 말투를 유지했어요'); setTimeout(() => setNote(''), 4000); loadVoiceProfile() }
      else { loadVoiceProfile(); refreshSession(); setOnboardData(d); setShowOnboard(true) }   // 리뷰 재오픈
    } catch (e) { setErr(String(e)) } finally { setVoiceLearn(null) }
  }

  // 내 말투로 입히기: 프로필 없으면 온보딩, 있으면 현재 대본을 내 말투로 다시 씀(무료 다듬기)
  const applyMyVoice = async (srcText) => {
    if (!voiceProfile?.has_voice) { setShowOnboard(true); return }
    const src = srcText || lastScript()
    if (!jobId || !src) { setErr('먼저 소재로 대본을 만들어 주세요'); return }
    setErr(''); setBusy(true); setStage('내 말투로 바꾸는 중…')
    try {
      const t = await token()
      const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refine', job_id: jobId, voice_mode: 'my', instruction: '내 말투 그대로 자연스럽게 다시 써줘', current_script: src }) })
      const d = await r.json()
      if (d.ok && d.script) { refineRef.current += 1; sawScriptRef.current = true; track('vera_refine', { kind: 'myvoice', n: refineRef.current }); setMessages(m => [...m, { role: 'assistant', text: d.script, mine: true, isScript: true }]); applyMeter(d) }
      else { const blocked = d.code === 'INSUFFICIENT_CREDITS'; track(blocked ? 'vera_blocked_credits' : 'vera_gen_failed', { where: 'refine' }); if (blocked) openPaywall('refine'); setErr(blocked ? `이 대본 세션을 이어가려면 이용권 ${d.need || 2}개가 필요해요.` : (d.error || '내 말투 변환 실패')) }
    } catch (e) { track('vera_gen_failed', { where: 'refine', error: String(e).slice(0, 120) }); setErr(String(e)) } finally { setBusy(false); setStage('') }
  }
  // 레드노트 링크 → 서버 캐싱 → 소스 클립으로 추가
  const addRednoteClip = async () => {
    const u = rnUrl.trim(); if (!u || rnBusy || !jobId) return
    setRnErr(''); setRnBusy(true)
    try {
      const t = await token(); if (!t) { setRnErr('로그인이 필요해요'); return }
      const r = await fetch(FN('rednote-clip'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: jobId, url: u }) })
      const d = await r.json()
      if (d.ok && d.clip) { setClips((cs) => [...cs, d.clip]); setRnUrl('') }
      else setRnErr(d.error || '클립을 가져오지 못했어요')
    } catch (e) { setRnErr(String(e)) } finally { setRnBusy(false) }
  }
  const copy = async (text, i) => { try { await navigator.clipboard.writeText(text); actedRef.current = true; track('vera_script_copied'); setCopiedI(i); setTimeout(() => setCopiedI(-1), 1500); maybeAskPmf(i) } catch {} }
  // "크로닛이 없어지면 얼마나 아쉬울까요?" — 대본을 2번 이상 복사한 사람에게 평생 1회
  const maybeAskPmf = (i) => {
    try {
      if (!messages[i]?.isScript) return
      if (localStorage.getItem('vera_pmf_done')) return
      const n = (parseInt(localStorage.getItem('vera_copy_n') || '0', 10) || 0) + 1
      localStorage.setItem('vera_copy_n', String(n))
      if (n < 2) return
      supabase.rpc('pmf_survey_needed_rpc').then(({ data }) => {
        if (data === true) setTimeout(() => setPmfOpen(true), 1200)
        else { try { localStorage.setItem('vera_pmf_done', '1') } catch { /* noop */ } }
      }, () => {})
    } catch { /* noop */ }
  }
  // 인스타 캡션 A/B (감성스토리 / 혜택불릿) — 대본 세션 내 무료
  const genCaption = async () => {
    if (busy || !jobId) { setErr('대본을 먼저 만들어 주세요'); return }
    setErr(''); setBusy(true); setStage('인스타 캡션 쓰는 중…')
    try {
      const t = await token(); if (!t) { setErr('로그인이 필요해요'); return }
      const handle = voiceProfile?.ig_username ? ('@' + voiceProfile.ig_username) : ''
      const body = JSON.stringify({ action: 'caption', job_id: jobId, handle })
      let r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body })
      if (r.status === 401) {
        const t2 = (await supabase.auth.refreshSession()).data.session?.access_token
        if (t2) r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t2}`, 'Content-Type': 'application/json' }, body })
      }
      const d = await r.json().catch(() => ({}))
      if (!d.ok) { setErr(r.status === 401 ? '로그인이 만료됐어요. 새로고침 후 다시 시도해 주세요' : (d.error || '캡션 생성에 실패했어요')); return }
      actedRef.current = true; try { track('vera_caption_shown') } catch { /* noop */ }
      setMessages((m) => [...m, { role: 'assistant', captionAB: true, a: d.caption_a, b: d.caption_b }])
      supabase.rpc('append_job_message_rpc', { p_job_id: jobId, p_role: 'caption', p_content: JSON.stringify({ a: d.caption_a || '', b: d.caption_b || '' }) }).then(null, () => {})
    } catch (e) { setErr(String(e)) } finally { setBusy(false); setStage('') }
  }
  // 대본 평가 — 👎면 "완벽하지 않아서 이탈"의 직접 신호. 평가하면 조용한 이탈로는 안 잡음.
  const rate = (i, rating) => { if (rated[i]) return; setRated((r) => ({ ...r, [i]: rating })); actedRef.current = true; track('vera_rated', { rating, job_id: jobId, mine: !!messages[i]?.mine }) }

  // 인라인 수정: 베라 대본을 직접 고치고, 저장하면 그 수정을 말투 학습에 반영
  const startEdit = (i, text) => { setEditIdx(i); setEditText(text) }
  const cancelEdit = () => { setEditIdx(-1); setEditText('') }
  const saveEdit = async (i) => {
    const before = messages[i]?.text || ''; const after = editText.trim()
    if (!after || after === before) { cancelEdit(); return }
    setMessages(m => m.map((x, idx) => idx === i ? { ...x, text: after, edited: true } : x))
    setEditIdx(-1); setEditText('')
    if (jobId) {
      supabase.rpc('set_job_script_rpc', { p_job_id: jobId, p_script: after, p_status: 'done' }).then(null, () => {})
      supabase.rpc('record_edit_rpc', { p_job_id: jobId, p_before: before, p_after: after }).then(null, () => {})
      const n = learnCount + 1; setLearnCount(n)
      setNote(`🌱 베라가 내 수정을 배웠어요 · 말투 학습 ${n}회째`); setTimeout(() => setNote(''), 4000)
    }
  }
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const started = jobId || messages.length > 0

  return (
    <div className="relative flex min-h-[calc(100vh-0px)]">
      <style>{`
        .sa-orb-wrap{position:relative;filter:drop-shadow(0 10px 34px rgba(0,100,255,.45))}
        .sa-orb{position:absolute;inset:0;background:radial-gradient(120% 120% at 30% 25%,#5AA0FF 0%,#0064FF 45%,#0042B8 100%);border-radius:44% 56% 61% 39%/45% 43% 57% 55%;animation:sa-blob 6s ease-in-out infinite;will-change:transform,border-radius}
        .sa-orb-hi{position:absolute;left:20%;top:16%;width:34%;height:28%;background:rgba(255,255,255,.55);border-radius:50%;filter:blur(4px);animation:sa-hi 6s ease-in-out infinite}
        @keyframes sa-blob{
          0%,100%{border-radius:44% 56% 61% 39%/45% 43% 57% 55%;transform:translateY(0) rotate(0deg) scale(1,1)}
          25%{border-radius:54% 46% 48% 52%/52% 48% 52% 48%;transform:translateY(-3px) rotate(90deg) scale(1.03,.98)}
          50%{border-radius:62% 38% 43% 57%/56% 49% 51% 44%;transform:translateY(2px) rotate(180deg) scale(.98,1.03)}
          75%{border-radius:46% 54% 57% 43%/47% 55% 45% 53%;transform:translateY(-2px) rotate(270deg) scale(1.02,.99)}
        }
        @keyframes sa-hi{0%,100%{opacity:.6;transform:translate(0,0)}50%{opacity:.9;transform:translate(3px,4px)}}
        .sa-fade{animation:sa-fade .35s ease}@keyframes sa-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      `}</style>

      {/* 왼쪽 대화 리스트 (데스크톱 고정 · 모바일 드로어) */}
      <aside className={`${showConvList ? 'fixed inset-0 z-40 flex bg-black/50' : 'hidden'} ${convCollapsed ? 'md:hidden' : 'md:static md:z-0 md:flex md:bg-transparent'}`} onClick={() => setShowConvList(false)}>
        <div className="flex h-full min-h-[calc(100vh-0px)] w-64 shrink-0 flex-col border-r border-white/10 bg-[#0d0e12] p-3" onClick={e => e.stopPropagation()}>
          <button onClick={() => { if (sessionFull()) { setSessionLimitMsg(limitText); return } setSessionLimitMsg(''); newChat(); setShowConvList(false) }} className="mb-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] glass-active py-2.5 text-sm font-bold text-white transition hover:brightness-110"><Plus size={16} /> 새 대화</button>
          {sessionLimitMsg && <div className="-mt-1.5 mb-3 rounded-lg bg-amber-500/15 px-2.5 py-2 text-[11px] leading-snug text-amber-300">{sessionLimitMsg}</div>}
          {(() => {
            const items = [
              ...(chatSessions || []).map((c) => ({ kind: 'chat', id: c.id, title: c.title || '베라와 대화', at: c.updated_at })),
              ...jobs.map((j) => ({ kind: 'job', id: j.id, title: (j.status === 'analyzed' ? '📊 ' : '') + (j.product_name || '(제목 없음)'), at: j.created_at })),
            ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
            return (<>
              <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-bold text-white/35"><span>대화 · 대본</span><span className={sessionFull() ? 'text-amber-300' : ''}>대화 {chatSessions?.length || 0}/{CHAT_SESSION_MAX}</span></div>
              <div className="-mx-1 flex-1 overflow-y-auto px-1">
                {items.length === 0 ? <div className="px-2 py-4 text-xs text-white/30">아직 대화나 대본이 없어요</div> :
                  items.map((it) => {
                    const on = it.kind === 'job' ? it.id === jobId : (!jobId && !soso && it.id === chatId)
                    return (
                      <div key={it.kind + it.id} className={`group mb-0.5 flex items-center rounded-lg transition hover:bg-white/5 ${on ? 'bg-white/10 glass-soft' : ''}`}>
                        <button onClick={() => { it.kind === 'job' ? openJob(it.id) : openChat(it.id); setShowConvList(false) }} className={`min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm ${on ? 'text-white' : 'text-white/70'}`}>
                          <div className="flex items-center gap-1.5 truncate">{it.kind === 'chat' && <MessageSquareText size={12} className="shrink-0 text-[#5AA0FF]" />}<span className="truncate">{it.title}</span></div>
                          <div className="text-[10px] text-white/30">{it.kind === 'chat' ? '대화 · ' : '대본 · '}{new Date(it.at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>
                        </button>
                        <button onClick={(e) => (it.kind === 'job' ? deleteJob(it.id, e) : deleteChat(it.id, e))} title="삭제" className="mr-1 shrink-0 rounded p-1.5 text-white/25 opacity-100 transition hover:bg-white/10 hover:text-amber-400 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={13} /></button>
                      </div>
                    )
                  })}
              </div>
            </>)
          })()}
        </div>
      </aside>

      {/* 오른쪽: 채팅 영역 */}
      <div className="relative flex min-w-0 flex-1 flex-col px-4 pt-5 md:px-8 md:pt-6">
        {/* 접기/펼치기 토글 — 경계 중앙에 걸치게 */}
        <button onClick={() => setConvCollapsed(v => !v)} title={convCollapsed ? '대본 목록 펼치기' : '대본 목록 접기'} className="absolute left-0 top-1/2 z-20 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#1a1c22] text-white/60 shadow-lg transition hover:text-white md:grid">
          {convCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      {/* 헤더 */}
      <div className="mb-1">
        <button onClick={() => setShowConvList(true)} className="mb-2 flex w-fit shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-bold text-white/70 hover:text-white md:hidden"><MessageSquareText size={14} /> 대화 목록{(jobs.length + (chatSessions?.length || 0)) ? ` ${jobs.length + (chatSessions?.length || 0)}` : ''}</button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 whitespace-nowrap text-xl font-bold text-white"><EnergyOrb size={24} /> 대본 비서</h1>
            <p className="mt-0.5 text-sm leading-snug text-white/50">대화로 다듬을수록 내 말투를 배워요</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => voiceProfile?.has_voice ? setShowSettings(true) : setShowOnboard(true)} className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${voiceProfile?.has_voice ? 'border-[#0064FF]/40 bg-[#0064FF]/10 text-[#5AA0FF]' : 'border-[#0064FF]/60 bg-[#0064FF]/15 text-[#5AA0FF] hover:brightness-110'}`}>{!voiceProfile?.has_voice && <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0064FF] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#0064FF]" /></span>}{voiceProfile?.has_voice ? <Settings size={13} /> : <Wand2 size={13} />} {voiceProfile?.has_voice ? `내 말투${voiceProfile.ig_username ? ` @${voiceProfile.ig_username}` : ''}` : '내 말투 만들기'}</button>
          {balance !== null && <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">이용권 {balance}</div>}
          </div>
        </div>
      </div>

      {/* 소재 카드 (붙은 소재) */}
      {soso && (
        <div className="mx-auto mt-3 flex w-full max-w-[700px] items-center gap-3 rounded-2xl glass p-2.5">
          {soso.source_ref
            ? <button type="button" onClick={() => setPlayClip({ video_id: soso.source_ref, thumbnail_url: soso.thumb || '', caption: soso.caption || '', video_url: clipVideo || '' })} className="group relative h-16 w-12 shrink-0 overflow-hidden rounded-lg" title="원본 보기">
                {soso.thumb ? <img src={soso.thumb} referrerPolicy="no-referrer" className="h-16 w-12 rounded-lg object-cover" /> : <TrendThumb url="" sc={soso.source_ref} />}
                <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition group-hover:opacity-100"><Play size={16} className="text-white" /></span>
              </button>
            : (soso.thumb ? <img src={soso.thumb} referrerPolicy="no-referrer" className="h-16 w-12 shrink-0 rounded-lg object-cover" /> : <div className="grid h-16 w-12 shrink-0 place-items-center rounded-lg bg-white/10"><Film size={18} className="text-white/40" /></div>)}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-[#5AA0FF]">🔥 트렌드 소재{soso.product ? ' · 분석됨' : ''}</div>
            {soso.product
              ? <><div className="truncate text-[14px] font-bold text-white">{soso.product}</div><div className="line-clamp-1 text-[12px] text-white/55">{(soso.selling || []).join(' · ') || soso.caption}</div></>
              : <div className="line-clamp-2 text-[13px] leading-snug text-white/80">{soso.caption || '(캡션 불러오는 중…)'}</div>}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1.5">
            {!jobId && (
              <>
                <button onClick={generateFromSoso} disabled={busy} className="rounded-xl bg-[#0064FF] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">이 소재로 대본 만들기{turns > 0 ? <span className="opacity-70"> · {turns}턴 남음</span> : <span className="opacity-70"> · 이용권 2 · 10턴</span>}</button>
                <button onClick={analyzeSosoToChat} disabled={busy} className="flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/75 transition hover:text-white disabled:opacity-40"><BarChart3 size={13} /> 소재 분석 · 이용권 1</button>
              </>
            )}
            {soso.source_ref && (
              <button type="button" onClick={() => setPlayClip({ video_id: soso.source_ref, thumbnail_url: soso.thumb || '', caption: soso.caption || '', video_url: clipVideo || '' })} className="flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/75 transition hover:text-white"><Film size={12} /> 원본 보기</button>
            )}
          </div>
        </div>
      )}

      {!soso && clipBox?.source_ref && (
        <button type="button" onClick={() => setPlayClip({ video_id: clipBox.source_ref, thumbnail_url: clipBox.thumb || '', caption: clipBox.caption || '', video_url: clipVideo || '' })}
          className="mx-auto mt-3 flex w-full max-w-[700px] items-center gap-3 rounded-2xl glass p-2.5 text-left transition hover:brightness-110">
          {clipBox.thumb
            ? <img src={clipBox.thumb} referrerPolicy="no-referrer" className="h-16 w-12 shrink-0 rounded-lg object-cover" />
            : <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg"><TrendThumb url="" sc={clipBox.source_ref} /></div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#5AA0FF]"><Film size={12} /> 원본 클립 · 눌러서 보기</div>
            <div className="line-clamp-2 text-[13px] leading-snug text-white/80">{clipBox.caption || '불러오는 중…'}</div>
          </div>
          <div className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/70">원본 보기</div>
        </button>
      )}

      {/* 대화 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {!started && !soso && !busy && (
          <div className="sa-fade flex flex-col items-center justify-center gap-6 py-10 text-center">
            <Droplet size={84} />
            <div>
              <div className="text-lg font-bold text-white">대본, 어떻게 시작할까요?</div>
              <div className="mt-1 text-sm text-white/50">소재를 고르고, 베라가 내 말투로 대본을 써드려요</div>
            </div>
            <div className="grid w-full max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-2">
              <Link to="/trend" className="group flex flex-col items-start gap-2 rounded-2xl glass p-5 text-left transition hover:-translate-y-0.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0064FF]/15 text-[#5AA0FF]"><Flame size={20} /></div>
                <div className="text-[15px] font-bold text-white">트렌드에서 소재 고르기</div>
                <div className="text-[13px] leading-snug text-white/50">반응 터진 쇼핑 릴스에서 골라 대본 작성으로</div>
                <div className="mt-1 flex items-center gap-1 text-[13px] font-bold text-[#5AA0FF]">트렌드 열기 <ChevronRight size={14} /></div>
              </Link>
              {voiceProfile?.has_voice ? (
                <button onClick={() => setShowSettings(true)} className="group flex flex-col items-start gap-2 rounded-2xl glass p-5 text-left transition hover:-translate-y-0.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><Check size={20} /></div>
                  <div className="text-[15px] font-bold text-white">내 말투 학습됨{voiceProfile.ig_username ? ` · @${voiceProfile.ig_username}` : ''}</div>
                  <div className="text-[13px] leading-snug text-white/50">첫 대본부터 내 말투로 나와요</div>
                  <div className="mt-1 flex items-center gap-1 text-[13px] font-bold text-[#5AA0FF]">다시 학습 · 설정 <ChevronRight size={14} /></div>
                </button>
              ) : (
                <button onClick={() => setShowOnboard(true)} className="group relative flex flex-col items-start gap-2 rounded-2xl glass p-5 text-left transition hover:-translate-y-0.5">
                  <span className="absolute right-3 top-3 rounded-md bg-[#0064FF] px-1.5 py-0.5 text-[10px] font-extrabold text-white">NEW</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0064FF]/15 text-[#5AA0FF]"><Wand2 size={20} /></div>
                  <div className="text-[15px] font-bold text-white">내 말투 가르치기</div>
                  <div className="text-[13px] leading-snug text-white/50">인스타 릴스로 30초 학습 → 첫 대본부터 내 말투로</div>
                  <div className="mt-1 flex items-center gap-1 text-[13px] font-bold text-[#5AA0FF]">지금 가르치기 <ChevronRight size={14} /></div>
                </button>
              )}
            </div>
            {voiceProfile?.has_voice && <VoiceDict vp={voiceProfile} />}
          </div>
        )}

        <div className="mx-auto flex max-w-[700px] flex-col gap-4">
          {messages.map((m, i) => {
            if (m.voicePreview) return (
              <div key={i} className="sa-fade w-full max-w-[92%] self-start">
                <div className="rounded-2xl border border-[#0064FF]/40 bg-[#0064FF]/10 p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#5AA0FF]"><Wand2 size={13} /> 내 말투 버전 (미리보기)</div>
                  {m.noProfile ? (
                    <div className="text-sm text-white/80">내 말투로 쓰려면 <b className="text-white">인스타그램 연결</b>이 필요해요. 릴스를 학습해서 내 말투 대본을 뽑아드려요.
                      <button onClick={() => alert('온보딩(인스타 연결)은 다음 단계에서 연결됩니다')} className="mt-3 block w-full rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white">인스타 연결하고 내 말투 배우기</button></div>
                  ) : (
                    <>
                      <div className="text-[15px] leading-relaxed text-white">{m.hook || '(훅 생성 안 됨)'}</div>
                      <div className="relative mt-2">
                        <div className="select-none text-sm leading-relaxed text-white/25 blur-[5px]">나머지 본문은 여기서 이어집니다. 내 말투 그대로, 기승전결 순서로, 바로 촬영할 수 있게 다듬어진 전체 대본이 표시됩니다.</div>
                        <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/40 text-center"><div><div className="text-xs font-bold text-white/80">🔒 전체 내 말투 대본 + 단어 직접 수정</div><button onClick={() => alert('결제 모달은 다음 단계에서 연결됩니다')} className="mt-2 rounded-xl bg-[#0064FF] px-4 py-2 text-xs font-bold text-white">구독하고 전체 보기</button></div></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
            if (m.trends) return (
              <div key={i} className="sa-fade w-full max-w-[700px] self-start">
<div className={`mb-2 text-sm ${m.fallback ? 'text-amber-300/90' : 'text-white/70'}`}>{m.note || `${m.trendCat ? m.trendCat + ' ' : ''}트렌드 소재예요 — 마음에 드는 걸 고르면 대본을 써드릴게요`}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {m.trends.map((it, k) => (
                    <div key={k} className="overflow-hidden rounded-xl glass">
                      <div className="relative aspect-[9/16] bg-white/[0.06]">
                        <TrendThumb url={it.thumbnail_url} sc={it.shortcode} />
                        {it.category && <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{it.category}</div>}
                      </div>
                      <div className="p-2">
                        <div className="line-clamp-2 text-[11px] leading-snug text-white/70">{maskHandles(String(it.caption || '')).replace(/\s+/g, ' ').trim().slice(0, 60) || '(캡션 없음)'}</div>
                        <div className="mt-1.5 flex gap-1">
                          <button onClick={() => pickTrend(it, 'script')} disabled={busy} className="flex-1 rounded-lg bg-[#0064FF] px-2 py-1.5 text-[11px] font-bold text-white transition hover:brightness-110 disabled:opacity-40">대본</button>
                          <button onClick={() => pickTrend(it, 'analyze')} disabled={busy} className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] font-bold text-white/75 transition hover:text-white disabled:opacity-40">분석</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/trend" className="mt-2 inline-block text-xs font-bold text-[#5AA0FF]">트렌드 탭에서 더 보기 →</Link>
              </div>
            )
            if (m.report) return <div key={i} className="sa-fade w-full max-w-[700px] self-start"><ClipAnalysisReport a={m.report} /></div>
            if (m.unlockChat) return (
              <div key={i} className="sa-fade w-full max-w-[92%] self-start">
                <div className="rounded-2xl rounded-bl-md glass-soft px-4 py-3 text-[15px] leading-relaxed text-white/95">
                  오늘 무료 대화 {freeChat?.free_total ?? 10}회를 다 썼어요 🙏<br />이용권 {m.need}개로 {m.cycle}회 더 이어서 대화할 수 있어요.
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => unlockChat(i, m.pending)} disabled={busy} className="rounded-xl bg-[#0064FF] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">💧 이용권 {m.need}개로 {m.cycle}회 더 대화하기</button>
                    <Link to="/trend" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/75 hover:text-white">소재 골라 대본 만들기</Link>
                  </div>
                  <div className="mt-2 text-[11px] text-white/40">무료 대화는 매일 자정에 다시 {freeChat?.free_total ?? 10}회 채워져요 · 보유 이용권 {balance ?? '-'}</div>
                </div>
              </div>
            )
            if (m.captionAB) return (
              <div key={i} className="sa-fade w-full max-w-[92%] self-start">
                <div className="mb-1.5 text-[12px] font-bold text-white/50">인스타 캡션 2가지 — 복사해서 바로 올려요 <span className="text-white/35">(댓글 키워드·계정 핸들·프로필 링크 번호는 확인 후 수정)</span></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[['감성 스토리', m.a], ['혜택 정리', m.b]].filter(([, t]) => !!t).map(([v, txt], ci) => (
                    <div key={v} className="rounded-2xl glass-soft p-3">
                      <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#0064FF]/15 px-2 py-0.5 text-[11px] font-bold text-[#5AA0FF]">{v}</div>
                      <div className="max-h-80 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-white/95">{txt}</div>
                      <button onClick={() => copy(txt, 90000 + i * 2 + ci)} className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-white/80">{copiedI === (90000 + i * 2 + ci) ? <Check size={13} /> : <Copy size={13} />} 복사</button>
                    </div>
                  ))}
                </div>
              </div>
            )
            if (m.ab) return (
              <div key={i} className="sa-fade w-full max-w-[92%] self-start">
                {m.analysis && (m.analysis.product || (m.analysis.selling && m.analysis.selling.length > 0)) && (
                  <div className="mb-2 rounded-xl glass px-3.5 py-2.5 text-[12px]">
                    <div className="mb-1 flex items-center gap-1 font-bold text-[#5AA0FF]"><BarChart3 size={12} /> 소재 분석</div>
                    {m.analysis.product && <div className="text-white/85">상품 · {m.analysis.product}</div>}
                    {m.analysis.selling && m.analysis.selling.length > 0 && <div className="mt-0.5 text-white/55">셀링포인트 · {m.analysis.selling.join(' / ')}</div>}
                  </div>
                )}
                <div className="mb-1.5 text-[12px] font-bold text-white/50">두 가지 스타일로 써봤어요 — 마음에 드는 쪽을 고르면 그걸로 이어가요</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[['A', m.a], ['B', m.b]].map(([v, txt]) => (
                    <div key={v} className="rounded-2xl glass-soft p-3">
                      <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#0064FF]/15 px-2 py-0.5 text-[11px] font-bold text-[#5AA0FF]">{v}안</div>
                      <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/95">{txt}</div>
                      <button onClick={() => chooseVariant(i, v)} className="mt-3 w-full rounded-xl bg-[#0064FF] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 active:scale-[0.99]">이 안으로 할게요</button>
                    </div>
                  ))}
                </div>
              </div>
            )
            if (m.role === 'user') return <div key={i} className="sa-fade max-w-[80%] self-end rounded-2xl rounded-br-md bg-[#0064FF] px-4 py-2.5 text-[15px] leading-relaxed text-white">{m.text}</div>
            return (
              <div key={i} className="sa-fade w-full max-w-[92%] self-start">
                {m.mine && <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#0064FF]/15 px-2 py-0.5 text-[11px] font-bold text-[#5AA0FF]"><Wand2 size={11} /> 내 말투</div>}
                {editIdx === i ? (
                  <div>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                      rows={Math.min(16, Math.max(4, editText.split('\n').length + 2))}
                      className="w-full resize-none rounded-2xl border border-[#0064FF]/50 bg-white/[0.06] px-4 py-3 text-[15px] leading-relaxed text-white outline-none focus:border-[#0064FF]" />
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button onClick={() => saveEdit(i)} className="flex items-center gap-1 rounded-lg bg-[#0064FF] px-3 py-1 text-xs font-bold text-white"><Check size={12} /> 저장</button>
                      <button onClick={cancelEdit} className="rounded-lg px-3 py-1 text-xs text-white/50 hover:text-white/80">취소</button>
                      <span className="text-[11px] text-white/35">저장하면 베라가 내 수정 습관을 배워요</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {m.analysis && (m.analysis.product || (m.analysis.selling && m.analysis.selling.length > 0)) && (
                      <div className="mb-2 rounded-xl glass px-3.5 py-2.5 text-[12px]">
                        <div className="mb-1 flex items-center gap-1 font-bold text-[#5AA0FF]"><BarChart3 size={12} /> 소재 분석</div>
                        {m.analysis.product && <div className="text-white/85">상품 · {m.analysis.product}</div>}
                        {m.analysis.selling && m.analysis.selling.length > 0 && <div className="mt-0.5 text-white/55">셀링포인트 · {m.analysis.selling.join(' / ')}</div>}
                      </div>
                    )}
                    <div className={`whitespace-pre-wrap rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed text-white/95 ${m.mine ? 'glass-blue' : 'glass-soft'}`}>{m.text}{m.edited && <span className="ml-1.5 align-middle text-[11px] text-white/30">· 수정됨</span>}</div>
                    {m.isScript && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#5AA0FF]/10 px-2.5 py-1 text-[11px] font-bold text-[#5AA0FF]"><Sprout size={12} /> 직접 고칠수록 베라가 내 말투를 배워요{learnCount ? ` · ${learnCount}회 학습` : ''}</div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {m.isScript && (
                        <button onClick={() => startEdit(i, m.text)} className="flex items-center gap-1.5 rounded-xl border border-[#0064FF]/50 bg-[#0064FF]/10 px-3.5 py-2 text-sm font-bold text-[#5AA0FF] transition hover:bg-[#0064FF]/20"><Pencil size={14} /> 직접 수정</button>
                      )}
                      {m.isScript && !m.mine && (
                        <button onClick={() => applyMyVoice(m.text)} className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10"><Wand2 size={14} /> {voiceProfile?.has_voice ? '내 말투로 입히기' : '내 말투 배우기'}</button>
                      )}
                      <button onClick={() => copy(m.text, i)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/45 hover:bg-white/10 hover:text-white/80">{copiedI === i ? <Check size={13} /> : <Copy size={13} />} 복사</button>
                    </div>
                    {m.isScript && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
                        <span>이번 대본 어땠나요?</span>
                        <button onClick={() => rate(i, 'up')} disabled={!!rated[i]} title="좋아요"
                          className={`rounded-lg px-2 py-1 transition ${rated[i] === 'up' ? 'bg-[#0064FF]/20' : 'hover:bg-white/10'} ${rated[i] && rated[i] !== 'up' ? 'opacity-30' : ''}`}>👍</button>
                        <button onClick={() => rate(i, 'down')} disabled={!!rated[i]} title="별로예요"
                          className={`rounded-lg px-2 py-1 transition ${rated[i] === 'down' ? 'bg-amber-500/20' : 'hover:bg-white/10'} ${rated[i] && rated[i] !== 'down' ? 'opacity-30' : ''}`}>👎</button>
                        {rated[i] && reasonDone[i] && <span className="text-white/30">고마워요!</span>}
                        {rated[i] && !reasonDone[i] && <span className="text-white/45">어떤 점이 그랬나요?</span>}
                      </div>
                    )}
                    {m.isScript && rated[i] && !reasonDone[i] && (
                      <RatingReasons rating={rated[i]} jobId={jobId} onDone={() => setReasonDone((r) => ({ ...r, [i]: true }))} />
                    )}
                  </>
                )}
              </div>
            )
          })}
          {busy && <div className="sa-fade self-start rounded-2xl rounded-bl-md glass-soft px-6 py-5"><Droplet size={44} label={stage || (jobId ? '다듬는 중…' : '대본을 짓는 중…')} /></div>}

          {/* 소스 클립 패널 (작업에 종속 — 레드노트 붙여넣기 도착지) */}
          {jobId && (
            <div className="mt-2 rounded-2xl glass p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-bold text-white"><Film size={15} className="text-[#5AA0FF]" /> 소스 클립 {clips.length ? `(${clips.length})` : ''}</div>
                {clips.length > 0 && <button onClick={saveAllClips} disabled={!!clipSaving} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-50"><Download size={13} /> {clipSaving === 'all' ? '준비 중…' : '전체 저장'}</button>}
              </div>
              <div className="flex gap-2">
                <input value={rnUrl} onChange={(e) => setRnUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRednoteClip()} placeholder="레드노트 공유 링크 붙여넣기 (xhslink.com/… 도 OK)"
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[#0064FF]" />
                <button onClick={addRednoteClip} disabled={rnBusy || !rnUrl.trim()} className="flex shrink-0 items-center gap-1 rounded-xl bg-[#0064FF] px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">{rnBusy ? '가져오는 중…' : <><Plus size={14} /> 추가</>}</button>
              </div>
              <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-white/40"><Clipboard size={12} className="mt-0.5 shrink-0" /><span>레드노트 앱에서 <b className="text-white/60">공유 → 링크 복사</b> 후 붙여넣으면 영상이 저장돼요 · 클립을 누르면 다운로드 (폰은 '비디오 저장'으로 사진앱에) · 7일 보관</span></p>
              {rnErr && <div className="mt-1.5 text-xs text-amber-400">⚠ {rnErr}</div>}
              {clips.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {clips.map((c, ci) => (
                    <button type="button" key={c.id} onClick={() => saveClip(c, ci)} disabled={c.status !== 'ready' || !c.storage_path}
                      className="group relative grid h-24 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5 transition hover:border-[#0064FF]">
                      {c.status === 'ready'
                        ? <>
                            {c.storage_path
                              ? <video src={`${c.storage_path}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1}
                                  className="absolute inset-0 h-full w-full object-cover" />
                              : <Film size={18} className="text-white/45" />}
                            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/65 py-0.5 text-[9px] font-bold text-white">{clipSaving === c.id ? '준비 중…' : <><Download size={9} /> 저장</>}</span>
                          </>
                        : <span className="text-[10px] text-white/40">{c.status || '처리중'}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {note && <div className="mx-auto mb-2 max-w-[700px] text-center text-xs font-bold text-[#5AA0FF]">{note}</div>}
      {err && <div className="mx-auto mb-2 max-w-[700px] text-sm text-amber-400">⚠ {err}</div>}

      {/* 컴포저 */}
      <div className="sticky bottom-0 border-t border-white/10 bg-[#0a0b0f]/85 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] pt-3 backdrop-blur md:pb-4 md:pr-16 relative">
        {!atBottom && (
          <button onClick={scrollToBottom} aria-label="맨 아래로" className="absolute -top-14 left-1/2 z-30 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#0a0b0f]/95 text-white/80 shadow-lg backdrop-blur transition hover:text-white"><ChevronDown size={18} /></button>
        )}
        {(() => {
          const last = messages[messages.length - 1]
          if (last?.trends) return null
          let modeMsg = null
          for (let k = messages.length - 1; k >= 0; k--) { const mm = messages[k]; if (mm?.trends) break; if (mm?.ab || mm?.isScript || mm?.report) { modeMsg = mm; break } }
          const scriptOut = !!(modeMsg?.ab || modeMsg?.isScript)
          const isAnalyze = !!modeMsg?.report
          const atStart = !jobId && messages.length <= 1
          const chip = 'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:text-white'
          if (atStart) return (
            <div className="no-scrollbar mx-auto mb-2 flex max-w-[700px] flex-nowrap items-center gap-2 overflow-x-auto px-1">
              <Link to="/trend" className={chip + ' text-[#5AA0FF]'}><Flame size={13} /> 트렌드에서 영상 고르기</Link>
              <button onClick={startChannelAnalysis} className={chip + ' text-[#5AA0FF]'}><BarChart3 size={13} /> 채널 분석</button>
              {soso && <button onClick={analyzeSosoToChat} className={chip + ' text-[#5AA0FF]'}><BarChart3 size={13} /> 소재 분석</button>}
            </div>
          )
          if (scriptOut && !busy) return (
            <div className="no-scrollbar mx-auto mb-2 flex max-w-[700px] flex-nowrap items-center gap-2 overflow-x-auto px-1">
              <span className="mr-0.5 shrink-0 whitespace-nowrap text-[11px] font-bold text-white/35">다음 →</span>
              {['훅 다듬기', '더 짧게'].map(q => (
                <button key={q} onClick={() => send(q)} className={chip}>{q}</button>
              ))}
              {(soso || clipBox?.source_ref) && <button onClick={soso ? analyzeSosoToChat : clipAnalyze} className={chip}><BarChart3 size={13} /> 소재 분석하기</button>}
              <button onClick={() => send('이 소재의 핵심 셀링포인트를 정리해서 보여줘')} className={chip}><BarChart3 size={13} /> 셀링포인트 보기</button>
              <button onClick={genCaption} className={chip + ' border-[#0064FF]/60 bg-[#0064FF]/15 text-[#5AA0FF]'}><MessageSquareText size={13} /> 인스타 캡션</button>
            </div>
          )
          if (isAnalyze && !busy) return (
            <div className="no-scrollbar mx-auto mb-2 flex max-w-[700px] flex-nowrap items-center gap-2 overflow-x-auto px-1">
              <span className="mr-0.5 shrink-0 whitespace-nowrap text-[11px] font-bold text-white/35">다음 →</span>
              {soso && <button onClick={generateFromSoso} className={chip + ' border-[#0064FF]/50 bg-[#0064FF]/10 text-[#5AA0FF]'}><Sparkles size={13} /> 이 소재로 대본 만들기</button>}
              <button onClick={() => send('이 분석에서 훅 아이디어 더 뽑아줘')} className={chip}>훅 더 뽑기</button>
              <Link to="/trend" className={chip}><Flame size={13} /> 다른 소재 보기</Link>
            </div>
          )
          return null
        })()}
        <div className="mx-auto flex max-w-[700px] items-end gap-2">
          <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); autoGrow(e.target) }} onKeyDown={onKey} rows={1}
            placeholder={jobId ? '더 짧게, 훅 더 세게 … 대화로 다듬어요' : (soso ? '소재 카드의 버튼을 누르거나, 직접 적어도 돼요' : "트렌드에서 '대본 작성하기'로 시작하거나 직접 적어주세요")}
            className="flex-1 resize-none overflow-y-auto rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] leading-relaxed text-white placeholder-white/35 outline-none focus:border-[#0064FF]" style={{ maxHeight: 160 }} />
          {(() => {
            if (turns !== null) return <div className={`mb-0.5 shrink-0 self-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${turns <= 3 ? 'bg-amber-500/20 text-amber-300' : 'bg-[#0064FF]/15 text-[#5AA0FF]'}`} title="이 대본 세션의 남은 턴">{turns}회</div>
            if (freeChat) { const left = (freeChat.free_left || 0) + (freeChat.paid_left || 0); return <div className={`mb-0.5 shrink-0 self-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${left <= 3 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/70'}`} title="오늘 남은 대화">{left}회</div> }
            return null
          })()}
          <button onClick={send} disabled={busy || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0064FF] glass-active text-white transition disabled:opacity-40"><Send size={18} /></button>
        </div>
        <div className="mx-auto mt-1.5 max-w-[700px] text-center text-[11px] text-white/35">{turns !== null ? `이 대본 세션 대화 ${turns}회 남음 · 소진 시 이용권 2개로 10회 충전` : (freeChat ? (freeChat.free_left > 0 ? `오늘 무료 대화 ${freeChat.free_left}회 남음${freeChat.paid_left ? ` · 충전 ${freeChat.paid_left}회` : ''} · 이후 이용권 1개로 10회` : `충전된 대화 ${freeChat.paid_left || 0}회 남음 · 소진 시 이용권 1개로 10회 충전`) : '가벼운 대화는 하루 10회 무료 · 대본을 만들면 10회 세션이 열려요 (이용권 2개)')}</div>
      </div>
      </div>

      {voiceLearn?.status === 'learning' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[2147482000] flex justify-center px-4 md:bottom-8">
          <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl glass px-4 py-3 shadow-2xl shadow-black/40">
            <EnergyOrb size={30} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-bold text-white"><span className="rounded-md bg-[#0064FF]/20 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#5AA0FF]">학습 중</span> 내 말투를 배우고 있어요</div>
              <div className="mt-0.5 text-[13px] leading-snug text-white/55">그동안 편하게 대화하거나 소재를 골라보세요<br className="hidden sm:block" /> 끝나면 확인 창을 띄워드릴게요</div>
            </div>
          </div>
        </div>
      )}
      {showSettings && <PersonaSettings onClose={() => setShowSettings(false)} onChanged={() => loadVoiceProfile()} onRelearn={() => { setShowSettings(false); setShowOnboard(true) }} />}
      {showOnboard && <VoiceOnboard defaultHandle={voiceProfile?.ig_username || ''} onClose={() => { setShowOnboard(false); setOnboardData(null) }} onReady={() => { loadVoiceProfile(); refreshSession() }} onBackground={startVoiceLearnBg} initialData={onboardData} initialStep={onboardData ? 'review' : 'input'} />}
      {playClip && <VideoModal clip={playClip} viewOnly onClose={() => setPlayClip(null)} onAnalyze={clipAnalyze} onScript={clipScript} scriptState={busy ? { status: 'generating' } : null} />}
      <PaywallSheet open={!!paywall} where={paywall?.where} onClose={() => setPaywall(null)} onPlans={() => { setPaywall(null); setPricingOpen(true) }} />
      {pricingOpen && <FindsPricing open onClose={() => { setPricingOpen(false); refreshSession() }} />}
      <PmfSurvey open={pmfOpen} onClose={() => { setPmfOpen(false); try { localStorage.setItem('vera_pmf_done', '1') } catch { /* noop */ } }} />
    </div>
  )
}
