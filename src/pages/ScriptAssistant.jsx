import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, Send, Copy, Check, Wand2, Flame, Plus, MessageSquareText, ChevronDown, Film, Download, Clipboard, Settings, Pencil, Trash2, ChevronLeft, ChevronRight, Sprout, BarChart3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import VoiceOnboard from '../components/VoiceOnboard'
import PersonaSettings from '../components/PersonaSettings'
import { useAnalysis } from '../context/analysis'
import EnergyOrb from '../components/EnergyOrb'
import ClipAnalysisReport from '../components/ClipAnalysisReport'
import { TrendThumb } from '../components/TrendCard'
import { maskHandles } from '../lib/format'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

function Droplet({ size = 84, label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <EnergyOrb size={size} style={{ filter: 'drop-shadow(0 10px 34px rgba(0,100,255,.45))' }} />
      {label && <div className="text-sm text-white/50">{label}</div>}
    </div>
  )
}

export default function ScriptAssistant({ session: sessionProp }) {
  const loc = useLocation()
  const nav = useNavigate()
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
  const [balance, setBalance] = useState(null)
  const [turns, setTurns] = useState(null)
  const [note, setNote] = useState('')
  const [copiedI, setCopiedI] = useState(-1)
  const [editIdx, setEditIdx] = useState(-1)
  const [editText, setEditText] = useState('')
  const [err, setErr] = useState('')
  const [stage, setStage] = useState('')
  const [nick, setNick] = useState('')
  const [today, setToday] = useState([])
  const [jobs, setJobs] = useState([])
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
      setVoiceProfile(has ? { has_voice: true, ig_username: data.ig_username || '', style_card: data.style_card || {} } : { has_voice: false })
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
  useEffect(() => { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); const t = setTimeout(checkAtBottom, 400); return () => clearTimeout(t) }, [messages, busy])

  // 닉네임 · 오늘 트렌드 · 베라 인사
  useEffect(() => {
    if (!session) return
    ;(async () => {
      let nn = ''
      try { const { data: pf } = await supabase.from('profiles').select('nickname').eq('id', session.user.id).maybeSingle(); nn = pf?.nickname || '' } catch { /* noop */ }
      setNick(nn)
      supabase.rpc('trend_list_rpc', { p_limit: 3 }).then(({ data }) => setToday((Array.isArray(data) ? data : []).map(x => String(x.caption || '').replace(/\s+/g, ' ').trim().slice(0, 70)).filter(Boolean))).catch(() => {})
      if (!greetedRef.current && messages.length === 0 && !soso && !jobId && (!jobs || jobs.length === 0)) {
        greetedRef.current = true
        setMessages([{ role: 'assistant', text: `안녕하세요${nn ? ` ${nn}님` : ''}! 저는 대본 비서 베라예요 🙂\n트렌드에서 마음에 드는 영상을 열어 '대본 작성하기'를 누르면 기승전결 대본을 써드려요. 오늘 뭐가 뜨는지 궁금하면 편하게 물어보세요.` }])
      }
    })()
  }, [session, jobs])

  // 재방문 진입: 트렌드/분석 진입 의도가 없으면 가장 최근 세션 자동 열기
  useEffect(() => {
    if (autoOpenRef.current || !session) return
    const st = loc.state
    if (st && (st.open_job || st.source_ref || st.caption)) { autoOpenRef.current = true; return }
    if (jobId || soso) { autoOpenRef.current = true; return }
    if (Array.isArray(jobs) && jobs.length > 0) {
      autoOpenRef.current = true; greetedRef.current = true
      openJob(jobs[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, jobs])

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
      setSoso(base)
      if (s.analyze) setPendingAnalyze(true)
      if (!base.caption && s.source_ref) {
        supabase.rpc('trend_detail_rpc', { p_shortcode: s.source_ref })
          .then(({ data }) => { const c = String(data?.caption || '').replace(/\s+/g, ' ').trim(); if (c) setSoso(v => ({ ...v, caption: c })) }).then(null, () => {})
      }
      nav('.', { replace: true, state: null })
    }
  }, [loc.state])

  // 트렌드에서 '분석'으로 진입하면 소재 붙은 뒤 자동 분석
  useEffect(() => {
    if (pendingAnalyze && soso && (soso.caption || soso.source_ref)) { setPendingAnalyze(false); analyzeSosoToChat() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnalyze, soso])
  useEffect(() => {
    if (pendingGen && soso && (soso.caption || soso.source_ref)) { setPendingGen(false); generateFromSoso() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGen, soso])

  const token = async () => (session?.access_token) || (await supabase.auth.getSession()).data.session?.access_token
  const refreshSession = async () => {
    try {
      const t = await token(); if (!t) return
      const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'session' }) })
      const d = await r.json(); if (d.ok) { setTurns(typeof d.turns_left === 'number' ? d.turns_left : null); if (typeof d.balance === 'number') setBalance(d.balance) }
    } catch { /* noop */ }
  }
  const applyMeter = (d) => {
    if (typeof d.turns_left === 'number') setTurns(d.turns_left)
    if (typeof d.balance === 'number') setBalance(d.balance)
    if (d.charged) { setNote('💧 이용권 2개 · 이 대본 10턴 세션'); setTimeout(() => setNote(''), 4000) }
  }
  const lastScript = () => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant' && messages[i].text) return messages[i].text; return '' }

  const loadJobs = async () => {
    const { data } = await supabase.from('jobs').select('id,product_name,created_at,status').order('created_at', { ascending: false }).limit(40)
    setJobs(data || [])
  }
  const openJob = async (id) => {
    setShowJobs(false); setErr('')
    const [{ data: msgs }, { data: cl }, { data: jrow }] = await Promise.all([
      supabase.from('job_messages').select('role,content').eq('job_id', id).order('created_at'),
      supabase.from('job_clips').select('id,storage_path,source_url,status').eq('job_id', id),
      supabase.from('jobs').select('voice_mode,product_name,selling_points,analysis,status').eq('id', id).maybeSingle(),
    ])
    const isMy = jrow?.voice_mode === 'my' && voiceProfile?.has_voice === true
    // 분석 자료(상품·셀링포인트) 복원 — 첫 대본 메시지에 붙인다
    let sell = String(jrow?.selling_points || '')
    if (jrow?.product_name && sell.startsWith(jrow.product_name + ' — ')) sell = sell.slice((jrow.product_name + ' — ').length)
    const analysis = (jrow?.product_name || sell) ? { product: jrow?.product_name || '', selling: sell ? sell.split(' / ').filter(Boolean) : [] } : null
    let attached = false
    const built = (msgs || []).map(m => {
      const isA = m.role === 'assistant'
      const looksScript = isA && !!m.content && m.content.includes('\n') && m.content.replace(/\s/g, '').length > 30
      const base = { role: m.role, text: m.content, isScript: looksScript, mine: looksScript && isMy }
      if (looksScript && analysis && !attached) { attached = true; base.analysis = analysis }
      return base
    })
    if (jrow?.analysis) built.unshift({ role: 'assistant', report: jrow.analysis })
    setMessages(built); setClips(cl || []); setJobId(id); setSoso(null)
    try { const { data: jt } = await supabase.rpc('get_job_turns_rpc', { p_job_id: id }); setTurns(typeof jt?.turns_left === 'number' ? jt.turns_left : null) } catch { setTurns(null) }
  }
  const newChat = () => { setMessages([]); setJobId(null); setSoso(null); setClips([]); setInput(''); setErr(''); setShowJobs(false); setTurns(null); resetGrow() }

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
      try { const { data: pf } = await supabase.from('profiles').select('niche,persona').eq('id', s.user.id).maybeSingle(); niche = pf?.niche || ''; persona = pf?.persona || '' } catch { /* noop */ }
      const cacheKey = String(soso.source_ref || soso.caption || '').slice(0, 280) + '|' + niche + '|v9'
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
      try { const { data: pf } = await supabase.from('profiles').select('niche,persona').eq('id', se.user.id).maybeSingle(); niche = pf?.niche || ''; persona = pf?.persona || '' } catch { /* noop */ }
      const cacheKey = String(soso.source_ref || soso.caption || '').slice(0, 280) + '|' + niche + '|v9'
      let a = null
      try { const { data: cached } = await supabase.rpc('get_analyze_cache_rpc', { p_key: cacheKey }); if (cached && cached.ok) a = cached } catch { /* noop */ }
      if (!a) {
        if (balance !== null && balance < 1) { setErr('소재 분석엔 이용권 1개가 필요해요'); return }
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
        } else if (aj && aj.code === 'INSUFFICIENT_CREDITS') { setErr('소재 분석엔 이용권 1개가 필요해요'); return }
        else { setMessages((m) => [...m, { role: 'assistant', report: a }]) }
      }
      if (a.product_name || sp0.length) setSoso((v) => ({ ...v, product: a.product_name || v.product, selling: sp0.length ? sp0 : v.selling }))
    } catch (e) { setErr(String(e)) } finally { setBusy(false); setStage('') }
  }

  // 소재 카드로 대본 만들기 (분석 → 대본, 이용권 1)
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
      if (!d.ok) { setErr(d.code === 'INSUFFICIENT_CREDITS' ? `이용권이 부족해요. 10턴 세션을 열려면 이용권 ${d.need || 2}개가 필요해요.` : (d.error || '대본 생성 실패')); return }
      const scriptMsg = { role: 'assistant', text: d.script, isScript: true, mine: voiceProfile?.has_voice === true, analysis: { product, selling: sp } }
      if (jobId) { applyMeter(d); setMessages((m) => [...m, scriptMsg]) }
      else { setJobId(d.job_id); applyMeter(d); setMessages([scriptMsg]) }
      loadJobs()
    } catch (e) { setErr(String(e)) } finally { setBusy(false); setStage('') }
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
    const t = await token(); if (!t) { setErr('로그인이 필요해요'); return }
    const prevScript = jobId ? lastScript() : ''
    const chatJob = (jobId && (turns > 0 || prevScript)) ? jobId : null
    const newMsgs = [...messages, { role: 'user', text }]
    setMessages(newMsgs)
    // 트렌드/카테고리 요청이면 실제 트렌드 카드를 채팅에 바로 렌더 (LLM 안 거침, 무료)
    const CATS = { 뷰티: ['뷰티', '화장품', '메이크업', '스킨케어', '코스메', '립', '파운데', '선크림', '쿠션'], 리빙: ['리빙', '살림', '주방', '수납', '정리', '청소', '인테리어', '가구'], 푸드: ['푸드', '음식', '간식', '요리', '레시피', '먹', '식품', '밀키트'], 육아: ['육아', '아기', '애기', '키즈', '장난감', '아이', '유아'], 패션: ['패션', '옷', '의류', '코디', '신발', '가방', '악세'], 잡화: ['잡화', '소품', '문구', '팬시'], 디지털: ['디지털', '가전', '전자', '기기', '테크', '폰', '이어폰'], 헬스: ['헬스', '운동', '다이어트', '건강', '피트니스', '홈트'] }
    let matchedCat = ''
    for (const [cat, kws] of Object.entries(CATS)) { if (kws.some((k) => text.includes(k))) { matchedCat = cat; break } }
    const wantsTrend = /트렌드|영상|소재|릴스|숏폼|추천|올릴|잘 ?나온|잘 ?된|잘 ?나가|터진|뜨는|요즘|보여줘|뭐\s?있|찾아/.test(text)
    if (matchedCat || wantsTrend) {
      setBusy(true); setStage('트렌드 찾는 중…')
      try {
        const { data } = await supabase.rpc('trend_list_rpc', { p_limit: 60 })
        let rows = Array.isArray(data) ? data : []
        if (matchedCat) rows = rows.filter((r) => r.category === matchedCat)
        rows = rows.filter((r) => r.shortcode).slice(0, 6)
        if (rows.length) setMessages((m) => [...m, { role: 'assistant', trends: rows, trendCat: matchedCat }])
        else setMessages((m) => [...m, { role: 'assistant', text: matchedCat ? `${matchedCat} 카테고리는 지금 뜨는 소재가 없어요. 트렌드 탭에서 다른 필터로 찾아볼 수 있어요.` : '지금 뜨는 소재를 못 찾았어요. 트렌드 탭에서 직접 골라보세요.' }])
      } catch { setErr('트렌드를 불러오지 못했어요') } finally { setBusy(false); setStage('') }
      return
    }
    setBusy(true); setStage('베라가 생각 중…')
    let trendsForChat = today
    try {
      const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'chat', job_id: chatJob, messages: newMsgs.map(m => ({ role: m.role, content: m.text })).filter(m => m.content), current_script: prevScript, nickname: nick, today_trends: trendsForChat }) })
      const d = await r.json()
      if (!d.ok) { setErr(d.code === 'INSUFFICIENT_CREDITS' ? `이용권이 부족해요. 대화를 이어가려면 이용권 ${d.need || 2}개가 필요해요.` : (d.error || '응답 실패')); return }
      applyMeter(d)
      if (d.reply) setMessages(m => [...m, { role: 'assistant', text: d.reply }])
      if (d.script && chatJob) {
        setMessages(m => [...m, { role: 'assistant', text: d.script, isScript: true }])
        supabase.rpc('set_job_script_rpc', { p_job_id: chatJob, p_script: d.script, p_status: 'done' }).then(null, () => {})
        if (prevScript) supabase.rpc('record_edit_rpc', { p_job_id: chatJob, p_before: prevScript, p_after: d.script }).then(null, () => {})
      }
      if (chatJob) {
        supabase.rpc('append_job_message_rpc', { p_job_id: chatJob, p_role: 'user', p_content: text }).then(null, () => {})
        if (d.reply) supabase.rpc('append_job_message_rpc', { p_job_id: chatJob, p_role: 'assistant', p_content: d.reply }).then(null, () => {})
      }
    } catch (e) { setErr(String(e)) } finally { setBusy(false); setStage('') }
  }

  // 내 말투 백그라운드 학습: 모달 닫고 토스트 → 완료되면 리뷰 재오픈(서버는 이미 저장됨)
  const startVoiceLearnBg = async (handle) => {
    setShowOnboard(false); setOnboardData(null); setVoiceLearn({ status: 'learning' })
    try {
      const t = await token(); if (!t) { setErr('로그인이 필요해요'); setVoiceLearn(null); return }
      const r = await fetch(FN('voice-onboard'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: handle }) })
      const d = await r.json()
      if (!d.ok) { setErr(d.code === 'INSUFFICIENT_CREDITS' ? '재학습에 이용권 1개가 필요해요' : (d.error || '말투 학습에 실패했어요')) }
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
      if (d.ok && d.script) { setMessages(m => [...m, { role: 'assistant', text: d.script, mine: true, isScript: true }]); applyMeter(d) }
      else setErr(d.code === 'INSUFFICIENT_CREDITS' ? `이 대본 세션을 이어가려면 이용권 ${d.need || 2}개가 필요해요.` : (d.error || '내 말투 변환 실패'))
    } catch (e) { setErr(String(e)) } finally { setBusy(false); setStage('') }
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
  const copy = async (text, i) => { try { await navigator.clipboard.writeText(text); setCopiedI(i); setTimeout(() => setCopiedI(-1), 1500) } catch {} }

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
          <button onClick={() => { newChat(); setShowConvList(false) }} className="mb-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] glass-active py-2.5 text-sm font-bold text-white transition hover:brightness-110"><Plus size={16} /> 새 대본</button>
          <div className="mb-1.5 px-1 text-[11px] font-bold text-white/35">내 대본 {jobs.length ? `(${jobs.length})` : ''}</div>
          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            {jobs.length === 0 ? <div className="px-2 py-4 text-xs text-white/30">아직 만든 대본이 없어요</div> :
              jobs.map(j => (
                <div key={j.id} className={`group mb-0.5 flex items-center rounded-lg transition hover:bg-white/5 ${j.id === jobId ? 'bg-white/10 glass-soft' : ''}`}>
                  <button onClick={() => { openJob(j.id); setShowConvList(false) }} className={`min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm ${j.id === jobId ? 'text-white' : 'text-white/70'}`}>
                    <div className="truncate">{j.status === 'analyzed' ? '📊 ' : ''}{j.product_name || '(제목 없음)'}</div>
                    <div className="text-[10px] text-white/30">{new Date(j.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>
                  </button>
                  <button onClick={(e) => deleteJob(j.id, e)} title="삭제" className="mr-1 shrink-0 rounded p-1.5 text-white/25 opacity-100 transition hover:bg-white/10 hover:text-amber-400 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={13} /></button>
                </div>
              ))}
          </div>
        </div>
      </aside>

      {/* 오른쪽: 채팅 영역 */}
      <div className="relative flex min-w-0 flex-1 flex-col px-4 pt-5 md:px-8 md:pt-6">
        {/* 접기/펼치기 토글 — 경계 중앙에 걸치게 */}
        <button onClick={() => setConvCollapsed(v => !v)} title={convCollapsed ? '대본 목록 펼치기' : '대본 목록 접기'} className="absolute left-0 top-1/2 z-20 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#1a1c22] text-white/60 shadow-lg transition hover:text-white md:grid">
          {convCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      {/* 헤더 */}
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => setShowConvList(true)} className="shrink-0 rounded-lg border border-white/15 p-1.5 text-white/70 hover:text-white md:hidden"><MessageSquareText size={16} /></button>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold text-white"><EnergyOrb size={24} /> 대본 비서</h1>
            <p className="mt-0.5 text-sm leading-snug text-white/50">대화로 다듬을수록 내 말투를 배워요</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => voiceProfile?.has_voice ? setShowSettings(true) : setShowOnboard(true)} className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${voiceProfile?.has_voice ? 'border-[#0064FF]/40 bg-[#0064FF]/10 text-[#5AA0FF]' : 'border-[#0064FF]/60 bg-[#0064FF]/15 text-[#5AA0FF] hover:brightness-110'}`}>{!voiceProfile?.has_voice && <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0064FF] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#0064FF]" /></span>}{voiceProfile?.has_voice ? <Settings size={13} /> : <Wand2 size={13} />} {voiceProfile?.has_voice ? `내 말투${voiceProfile.ig_username ? ` @${voiceProfile.ig_username}` : ''}` : '내 말투 만들기'}</button>
          {balance !== null && <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">이용권 {balance}</div>}
        </div>
      </div>

      {/* 소재 카드 (붙은 소재) */}
      {soso && (
        <div className="mx-auto mt-3 flex w-full max-w-[700px] items-center gap-3 rounded-2xl glass p-2.5">
          {soso.thumb ? <img src={soso.thumb} referrerPolicy="no-referrer" className="h-16 w-12 shrink-0 rounded-lg object-cover" /> : <div className="grid h-16 w-12 shrink-0 place-items-center rounded-lg bg-white/10"><Film size={18} className="text-white/40" /></div>}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-[#5AA0FF]">🔥 트렌드 소재{soso.product ? ' · 분석됨' : ''}</div>
            {soso.product
              ? <><div className="truncate text-[14px] font-bold text-white">{soso.product}</div><div className="line-clamp-1 text-[12px] text-white/55">{(soso.selling || []).join(' · ') || soso.caption}</div></>
              : <div className="line-clamp-2 text-[13px] leading-snug text-white/80">{soso.caption || '(캡션 불러오는 중…)'}</div>}
          </div>
          {!jobId && (
            <div className="flex shrink-0 flex-col gap-1.5">
              <button onClick={generateFromSoso} disabled={busy} className="rounded-xl bg-[#0064FF] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">이 소재로 대본 만들기{turns > 0 ? <span className="opacity-70"> · {turns}턴 남음</span> : <span className="opacity-70"> · 이용권 2 · 10턴</span>}</button>
              <button onClick={analyzeSosoToChat} disabled={busy} className="flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/75 transition hover:text-white disabled:opacity-40"><BarChart3 size={13} /> 소재 분석 · 이용권 1</button>
            </div>
          )}
        </div>
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
                <div className="mb-2 text-sm text-white/70">{m.trendCat ? `${m.trendCat} ` : ''}트렌드 소재예요 — 마음에 드는 걸 고르면 대본을 써드릴게요</div>
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
                {clips.length > 0 && <button onClick={() => clips.forEach((c) => c.storage_path && window.open(c.storage_path, '_blank'))} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/15"><Download size={13} /> 전체 다운로드</button>}
              </div>
              <div className="flex gap-2">
                <input value={rnUrl} onChange={(e) => setRnUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRednoteClip()} placeholder="레드노트 공유 링크 붙여넣기 (xhslink.com/… 도 OK)"
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[#0064FF]" />
                <button onClick={addRednoteClip} disabled={rnBusy || !rnUrl.trim()} className="flex shrink-0 items-center gap-1 rounded-xl bg-[#0064FF] px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">{rnBusy ? '가져오는 중…' : <><Plus size={14} /> 추가</>}</button>
              </div>
              <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-white/40"><Clipboard size={12} className="mt-0.5 shrink-0" /><span>레드노트 앱에서 <b className="text-white/60">공유 → 링크 복사</b> 후 붙여넣으면 영상이 저장돼요 · PC에서 바로 다운로드 (7일 보관)</span></p>
              {rnErr && <div className="mt-1.5 text-xs text-amber-400">⚠ {rnErr}</div>}
              {clips.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {clips.map((c) => (
                    <a key={c.id} href={c.storage_path || undefined} target="_blank" rel="noreferrer" download
                      className="group relative grid h-24 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5 transition hover:border-[#0064FF]">
                      {c.status === 'ready'
                        ? <><Film size={18} className="text-white/45" /><span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/65 py-0.5 text-[9px] font-bold text-white"><Download size={9} /> 저장</span></>
                        : <span className="text-[10px] text-white/40">{c.status || '처리중'}</span>}
                    </a>
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
          const scriptOut = !!last?.isScript
          const atStart = !jobId && messages.length <= 1
          const chip = 'flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:text-white'
          if (atStart) return (
            <div className="mx-auto mb-2 flex max-w-[700px] flex-wrap items-center gap-2">
              <Link to="/trend" className={chip + ' text-[#5AA0FF]'}><Flame size={13} /> 트렌드에서 영상 고르기</Link>
              <button onClick={startChannelAnalysis} className={chip + ' text-[#5AA0FF]'}><BarChart3 size={13} /> 채널 분석</button>
              {soso && <button onClick={analyzeSosoToChat} className={chip + ' text-[#5AA0FF]'}><BarChart3 size={13} /> 소재 분석</button>}
            </div>
          )
          if (scriptOut && !busy) return (
            <div className="mx-auto mb-2 flex max-w-[700px] flex-wrap items-center gap-2">
              <span className="mr-0.5 text-[11px] font-bold text-white/35">다음 →</span>
              {['더 짧게', '훅 더 세게', '댓글 유도 강하게', '다른 앵글로'].map(q => (
                <button key={q} onClick={() => send(q)} className={chip}>{q}</button>
              ))}
            </div>
          )
          if (last?.report && !busy) return (
            <div className="mx-auto mb-2 flex max-w-[700px] flex-wrap items-center gap-2">
              <span className="mr-0.5 text-[11px] font-bold text-white/35">다음 →</span>
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
          {turns !== null && <div className={`mb-0.5 shrink-0 self-center rounded-full px-2.5 py-1 text-[11px] font-bold ${turns <= 3 ? 'bg-amber-500/20 text-amber-300' : 'bg-[#0064FF]/15 text-[#5AA0FF]'}`} title="이 대본 세션의 남은 턴">{turns}턴</div>}
          <button onClick={send} disabled={busy || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0064FF] glass-active text-white transition disabled:opacity-40"><Send size={18} /></button>
        </div>
        <div className="mx-auto mt-1.5 max-w-[700px] text-center text-[11px] text-white/35">{turns !== null ? `이 대본 세션 ${turns}턴 남음 · 소진 시 이용권 2개로 10턴 충전` : '대본을 만들면 10턴 세션이 열려요 (이용권 2개) · 가벼운 잡담은 무료'}</div>
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
    </div>
  )
}
