import { useEffect, useState, useMemo } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ManualHeader, ManualFooter, Markdown, Lightbox, parseFaq } from '../components/ManualLayout'

import usageMd      from '../content/usage.md?raw'
import webappMd     from '../content/webapp.md?raw'
import creditsMd    from '../content/credits.md?raw'
import revenueMd    from '../content/revenue.md?raw'
import tipsMd       from '../content/tips.md?raw'
import faqMd        from '../content/faq.md?raw'

/* ── tips.md 파서 ── */
function parseTips(md) {
  const lines = md.split('\n')
  const items = []
  let current = null
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/)
    if (match) {
      if (current) items.push(current)
      current = { title: match[1].trim(), body: '' }
    } else if (current) {
      current.body += line + '\n'
    }
  }
  if (current) items.push(current)
  return items.map(i => ({ ...i, body: i.body.trim() }))
}

/* ── 팁 카드 색상 ── */
const TIP_COLORS = [
  { border: 'border-[#03C75A]/30',   accent: 'bg-[#03C75A]',   light: 'bg-[#03C75A]/15 text-[#03C75A]' },
  { border: 'border-[#03C75A]/30', accent: 'bg-[#03C75A]', light: 'bg-[#03C75A]/15 text-[#03C75A]' },
  { border: 'border-[#03C75A]/30',   accent: 'bg-[#03C75A]',   light: 'bg-[#03C75A]/15 text-[#03C75A]' },
  { border: 'border-green-200',  accent: 'bg-green-500',  light: 'bg-green-100 text-green-600' },
  { border: 'border-yellow-200', accent: 'bg-yellow-500', light: 'bg-yellow-100 text-yellow-600' },
  { border: 'border-orange-200', accent: 'bg-orange-500', light: 'bg-orange-100 text-orange-600' },
  { border: 'border-pink-200',   accent: 'bg-pink-500',   light: 'bg-pink-100 text-pink-600' },
]

/* ── 팁 카드 컴포넌트 ── */
const TipsCards = ({ md }) => {
  const tips = useMemo(() => parseTips(md), [md])
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {tips.map((tip, i) => {
        const c = TIP_COLORS[i % TIP_COLORS.length]
        return (
          <div key={i} className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm ${c.border}`}>
            {/* 상단 컬러 라인 */}
            <div className={`h-1 w-full ${c.accent}`} />
            <div className="p-5 md:p-6">
              {/* 번호 배지 */}
              <span className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-black ${c.light}`}>
                {tip.title.match(/^[①②③④⑤⑥⑦⑧⑨⑩]/)?.[0] ?? `#${i+1}`}
              </span>
              <h3 className="mb-3 text-base font-black leading-snug text-gray-900 md:text-lg">
                {tip.title.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')}
              </h3>
              <p className="text-sm leading-[1.9] text-slate-600 [overflow-wrap:anywhere] md:text-base whitespace-pre-line">
                {tip.body}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── 시작하기 STEP 카드 ── */
const fmtInline = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\*\*(.+?)\*\*/g, '<strong class="font-black text-[#03C75A]">$1</strong>')

const StartSteps = ({ md }) => {
  const steps = useMemo(() => parseTips(md), [md])
  return (
    <div className="space-y-4 md:space-y-5">
      {steps.map((step, i) => {
        const num = String(i + 1).padStart(2, '0')
        const title = step.title.replace(/^STEP\s*\d+\s*[·.]\s*/i, '')
        const bullets = step.body.split('\n').map(l => l.trim()).filter(l => l.startsWith('-')).map(l => l.replace(/^-\s*/, ''))
        return (
          <div key={i} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex items-start gap-4 md:gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#03C75A] text-lg font-black text-white shadow-md shadow-[#03C75A]/30 md:h-14 md:w-14 md:text-xl">{num}</div>
              <div className="min-w-0 flex-1 pt-1">
                <h3 className="mb-4 text-lg font-black leading-snug text-gray-900 md:text-xl">{title}</h3>
                <ul className="space-y-3">
                  {bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-3 text-base leading-relaxed text-gray-700 md:text-lg">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#03C75A]/15 text-[11px] font-black text-[#03C75A]">✓</span>
                      <span className="[overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: fmtInline(b) }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )
      })}
      <div className="rounded-3xl border border-[#03C75A]/30 bg-[#03C75A]/5 p-5 text-center md:p-6">
        <p className="text-base font-black text-gray-900 md:text-lg">🎉 정말 이게 전부예요!</p>
        <p className="mt-1.5 text-sm text-gray-500 md:text-base">영상 길이·목소리·자막은 처음에 한 번만 정해두면 다음부터 자동이에요. 잘 모르겠으면 그대로 둬도 괜찮아요.</p>
      </div>
    </div>
  )
}

/* ── 사진 가이드 (스타일·자동화 세팅) ── */
const GUIDE_STEPS = [
  { group: '처음 한 번만 — 스타일 & 자동화 세팅', once: true },
  { img: '/guide/01-open.jpg', title: '① 영상 만드는 화면 열기', desc: "홈에서 **무료로 영상 만들기**를 누르면 이 화면이 나와요. 왼쪽 위 **☰ 메뉴**를 눌러보세요." },
  { img: '/guide/02-menu-v2.jpg', title: '② 메뉴에서 [콘셉트/스타일] 열기', desc: "메뉴의 **콘셉트/스타일** 탭을 열면 위에 **🔍 스타일 찾기**와 **⚙️ 자동화 세팅** 두 개가 나뉘어 있어요. 이 탭만 처음에 한 번 해두면 끝이에요.", note: "**스타일 찾기 → 자동화 세팅** 순서로 하면 돼요." },
  { img: '/guide/03-style.jpg', title: '③ 스타일 찾기 — 따라 할 영상 등록', desc: "**🔍 스타일 찾기**에서 따라 하고 싶은 영상(인스타·틱톡 등) 링크를 넣고 **분석 시작**을 누르면, 그 영상의 말투·구성이 내 스타일로 저장돼요." },
  { img: '/guide/04-setup-length.jpg', title: '④ 자동화 세팅 — 영상 길이 & 대본 스타일', desc: "옆 **⚙️ 자동화 세팅** 서브탭으로 넘어가요. 위에서 **영상 길이**를 골라요(잘 모르면 **15초 기본**). 그리고 아래 **대본 스타일**에서 ③에서 저장한 **내 스타일**을 골라 적용하면, 그 말투·구성으로 대본이 만들어져요.", note: "아직 저장한 스타일이 없거나 잘 모르겠으면 **자동(AI 추천)** 그대로 둬도 괜찮아요." },
  { img: '/guide/05-setup-voice.jpg', title: '⑤ 자동화 세팅 — 목소리', desc: "영상에 들어갈 **목소리**를 골라요. **미리듣기**로 들어볼 수 있어요." },
  { img: '/guide/06-setup-subtitle.jpg', title: '⑥ 자동화 세팅 — 자막·썸네일', desc: "자막 모양(글씨·색·크기)을 정해요. **기본값 그대로 둬도** 예쁘게 나와요." },
  { group: '영상 만들 때마다 — 이것만 반복!', once: false },
  { img: '/guide/07-project.jpg', title: '⑦ 새 프로젝트 만들기', desc: "영상 하나 만들 때마다 **+ 새 프로젝트**를 눌러요.", note: "**프로젝트란?** 영상 한 편을 만드는 '작업 공간'이에요. 영상 하나 = 프로젝트 하나라고 생각하면 쉬워요." },
  { img: '/guide/08-link.jpg', title: '⑧ 쇼핑 영상 링크 넣기', desc: "홍보할 **쇼핑 영상 링크**를 붙여넣고 **분석 시작**을 눌러요. 잠깐 기다리면 관련 클립을 찾아줘요." },
  { img: '/guide/09-clips.jpg', title: '⑨ 마음에 드는 클립 담기', desc: "찾아준 클립 중 마음에 드는 걸 **담기** → 다 골랐으면 **자동 생성**을 눌러요." },
  { img: '/guide/10-generate.jpg', title: '⑩ 자동 생성 → 완성!', desc: "내용을 확인하고 **진행**을 누르면 끝! 보통 **1~5분**이면 영상이 완성돼요." },
]

const GuideWalkthrough = ({ steps, onImageClick }) => (
  <div className="space-y-5">
    {steps.map((s, i) => s.group ? (
      <div key={i} className={`flex flex-wrap items-center gap-2.5 ${i === 0 ? '' : 'pt-6'}`}>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${s.once ? 'bg-[#03C75A]/15 text-[#03C75A]' : 'bg-amber-100 text-amber-700'}`}>
          {s.once ? '처음 한 번만' : '매번 반복'}
        </span>
        <h2 className="text-lg font-black text-gray-900 md:text-xl">{s.group}</h2>
      </div>
    ) : (
      <div key={i} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="p-5 md:p-6">
          <h3 className="mb-2 text-base font-black leading-snug text-gray-900 md:text-lg" dangerouslySetInnerHTML={{ __html: fmtInline(s.title) }} />
          <p className="text-sm leading-[1.85] text-slate-600 md:text-base" dangerouslySetInnerHTML={{ __html: fmtInline(s.desc) }} />
          {s.note && (
            <div className="mt-3 rounded-xl bg-[#03C75A]/8 px-4 py-3 text-sm leading-[1.8] text-gray-700" dangerouslySetInnerHTML={{ __html: '💡 ' + fmtInline(s.note) }} />
          )}
        </div>
        <button onClick={() => onImageClick({ src: s.img, alt: s.title })} className="block w-full border-t border-gray-100 bg-gray-50 p-3">
          <img src={s.img} alt={s.title} loading="lazy" className="mx-auto w-full max-w-[340px] rounded-xl border border-gray-200" />
        </button>
      </div>
    ))}
  </div>
)

const SECTIONS = {
  start: {
    emoji: '👋',
    title: '이렇게 쓰면 돼요',
    callout: '어렵지 않아요! 영상 링크 붙여넣고 버튼 한 번이면 끝이에요. 아래 3단계만 따라오세요.',
    type: 'steps',
    content: usageMd,
  },
  revenue: {
    emoji: '💰',
    title: '쿠팡 파트너스 & 수익 구조',
    callout: '쿠팡 파트너스가 뭔지, 어떻게 쓰는지, 돈이 통장에 어떻게 들어오는지 한 번에 정리했어요.',
    type: 'markdown',
    content: revenueMd,
  },
  app: {
    emoji: '📱',
    title: '앱으로 사용하는 방법',
    callout: '휴대폰 홈 화면에 추가하면 일반 앱처럼 바로 쓸 수 있어요. (설치·앱스토어 불필요)',
    type: 'markdown',
    content: webappMd,
  },
  features: {
    emoji: '⚙️',
    title: '처음 한 번만! 스타일·자동화 세팅',
    callout: '딱 한 번만 설정해두면 다음부터는 링크만 붙여넣으면 돼요. 사진 보고 그대로 따라오세요!',
    type: 'guide',
    content: GUIDE_STEPS,
  },
  credits: {
    emoji: '🪙',
    title: '크레딧 안내',
    callout: '영상 1개당 크레딧, 플랜, 이월·환불을 정리했어요.',
    type: 'markdown',
    content: creditsMd,
  },
  tips: {
    emoji: '💡',
    title: '꿀팁',
    callout: null,
    type: 'tips',
    content: tipsMd,
  },
  faq: {
    emoji: '❓',
    title: '자주 묻는 질문',
    callout: null,
    type: 'faq',
    content: faqMd,
  },
}

/* ── FAQ 아이템 ── */
const FaqItem = ({ question, answer, onImageClick }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <span className="text-base font-bold text-gray-900 md:text-lg">Q. {question}</span>
        <span className="shrink-0 text-[#03C75A] text-sm transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      </button>
      <div className="grid transition-all duration-200 ease-in-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 px-5 pb-4 pt-3">
            <Markdown onImageClick={onImageClick}>{answer}</Markdown>
          </div>
        </div>
      </div>
    </div>
  )
}

const ManualDetail = () => {
  const { section } = useParams()
  const { pathname } = useLocation()
  const [lightbox, setLightbox] = useState(null)
  const data = SECTIONS[section]

  const faqItems = useMemo(() => (data?.type === 'faq' ? parseFaq(data.content) : []), [data])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <div className="text-center">
          <p className="mb-4 text-xl">페이지를 찾을 수 없습니다.</p>
          <Link to="/manual" className="text-[#03C75A] underline">사용 방법으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans text-gray-900 selection:bg-[#03C75A]/30">
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      <ManualHeader currentPath={pathname} />

      {/* 히어로 */}
      <section className="relative px-5 pt-32 pb-10 md:px-8 md:pt-44 md:pb-12">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <Link to="/manual" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-[#03C75A]">
            <ArrowLeft size={16} /> 사용 방법 목록
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
            <span className="mr-3">{data.emoji}</span>{data.title}
          </h1>
        </div>
      </section>

      {/* 본문 */}
      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto max-w-3xl">
          {data.callout && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#03C75A]/30 bg-[#03C75A]/10 px-4 py-3 text-sm font-semibold text-[#03C75A] md:text-base">
              <span>📌</span> {data.callout}
            </div>
          )}

          {data.type === 'markdown' && (
            <Markdown onImageClick={setLightbox}>{data.content}</Markdown>
          )}

          {data.type === 'steps' && (
            <StartSteps md={data.content} />
          )}

          {data.type === 'guide' && (
            <GuideWalkthrough steps={data.content} onImageClick={setLightbox} />
          )}

          {data.type === 'tips' && (
            <TipsCards md={data.content} />
          )}

          {data.type === 'faq' && (
            <div className="space-y-2">
              {faqItems.map((item, i) => (
                <FaqItem key={i} question={item.question} answer={item.answer} onImageClick={setLightbox} />
              ))}
            </div>
          )}

          {section === 'start' && (
            <Link to="/manual/features" className="group mt-8 block overflow-hidden rounded-3xl border-2 border-[#03C75A]/40 bg-gradient-to-br from-[#03C75A]/12 to-[#03C75A]/5 p-6 transition-all hover:-translate-y-0.5 hover:border-[#03C75A] hover:shadow-xl md:p-7">
              <span className="inline-block rounded-full bg-[#03C75A] px-3 py-1 text-xs font-black text-white">딱 한 번만 하면 끝!</span>
              <h3 className="mt-3 text-xl font-black leading-snug text-gray-900 md:text-2xl">내 스타일·목소리·자막 세팅하기 📸</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
                이것만 처음에 한 번 해두면 <b className="text-[#03C75A]">영상 퀄리티가 확 달라지고</b>, 다음부터는 링크만 붙여넣으면 끝이에요. 사진 보고 그대로 따라하면 됩니다.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#03C75A] px-6 py-3.5 text-base font-black text-white shadow-md shadow-[#03C75A]/25 transition-all group-hover:gap-3">
                지금 세팅하러 가기 <ArrowRight size={18} />
              </span>
            </Link>
          )}
          {section === 'revenue' && (
            <div className="mt-10 rounded-3xl border-2 border-[#03C75A]/40 bg-gradient-to-br from-[#03C75A]/12 to-[#03C75A]/5 p-7 text-center md:p-8">
              <h3 className="text-xl font-black text-gray-900 md:text-2xl">이제 직접 만들어 볼까요?</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
                쇼핑 영상 링크만 있으면 돼요. <b className="text-[#03C75A]">가입은 무료</b>, 구글 로그인이면 바로 시작할 수 있어요.
              </p>
              <Link to="/generate" className="group mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#03C75A] px-8 py-4 text-lg font-black text-white shadow-md shadow-[#03C75A]/25 transition-all hover:bg-[#02b350]">
                무료로 시작하기 <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          )}
        </div>
      </section>
      <section className="px-5 pb-16 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link to="/manual" className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-all hover:border-[#03C75A] hover:text-[#03C75A]">
            <ArrowLeft size={16} /> 목록으로
          </Link>
        </div>
      </section>

      <ManualFooter />
    </div>
  )
}

export default ManualDetail
