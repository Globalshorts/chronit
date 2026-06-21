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
  { group: '처음 한 번만 — 세팅', once: true, collapsible: true, defaultCollapsed: true },
  { img: '/guide/02-menu-v3.jpg', title: '① 콘셉트/스타일 탭 열기', desc: "영상 만드는 화면에서 왼쪽 위 **☰ 메뉴 → 콘셉트/스타일**을 열어요. 위에 **🔍 스타일 찾기**와 **⚙️ 자동화 세팅**이 있어요.", note: "잘 모르겠으면 이 세팅은 **건너뛰고** 기본값으로 바로 시작해도 돼요." },
  { img: '/guide/03-style.jpg', title: '② 스타일 찾기 — 따라 할 영상 등록', desc: "**🔍 스타일 찾기**에 따라 하고 싶은 영상(인스타·틱톡) 링크를 넣고 **분석 시작**을 누르면, 그 말투·구성이 내 스타일로 저장돼요." },
  { img: '/guide/04-setup-length.jpg', title: '③ 자동화 세팅 — 길이·목소리·자막', desc: "**⚙️ 자동화 세팅**에서 **영상 길이**(잘 모르면 15초), **목소리**(미리듣기 가능), **자막 모양**을 한 번 정해두면 다음부터 자동이에요.", note: "전부 **기본값 그대로 둬도** 예쁘게 나와요." },
  { group: '영상 만들 때마다 — 이것만 반복!', once: false },
  { img: '/guide/08-link.jpg', title: '① 새 프로젝트 + 쇼핑 링크 분석', desc: "**＋ 새 프로젝트**를 누르고, 홍보할 **쇼핑 영상 링크**를 붙여넣은 뒤 **분석 시작**을 눌러요. 잠깐 기다리면 관련 클립을 찾아줘요.", note: "**프로젝트**는 영상 한 편을 만드는 작업 공간이에요 (영상 하나 = 프로젝트 하나)." },
  { img: '/guide/09-clips.jpg', title: '② 클립 담고 → 자동 생성', desc: "찾아준 클립 중 마음에 드는 걸 **담기** → **자동 생성**을 누르고 내용 확인 후 **진행**! 보통 **1~5분**이면 완성돼요." },
  { img: '/guide/11-addlink.jpg', title: '③ 완성되면 → 🔗 내 링크에 추가', desc: "영상이 완성되면 **생성 내역**에서 **🔗 내 링크에 추가**를 눌러요.", note: "**내 링크 페이지** = 만든 영상을 쿠팡 링크와 함께 모아 공유하는 나만의 페이지예요." },
  { img: '/guide/12-mylink.jpg', title: '④ 카드 완성 → 내 주소 공유', desc: "카드에 **쿠팡 링크**를 넣고 **＋ 페이지에 표시**. 맨 위 **내 주소**를 복사해 인스타 프로필에 붙이면 끝!", note: "이미지는 자동으로 뽑혀요 — 별로면 **🔄 다른 컷 / 📷 업로드**로 변경." },
]

const GuideWalkthrough = ({ steps, onImageClick }) => {
  // group 마커 기준으로 묶기
  const groups = []
  let cur = null
  steps.forEach((s) => {
    if (s.group) { cur = { group: s.group, once: s.once, items: [] }; groups.push(cur) }
    else if (cur) cur.items.push(s)
    else { cur = { group: '', once: false, items: [s] }; groups.push(cur) }
  })
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#03C75A]/30 bg-[#03C75A]/5 px-5 py-4">
        <p className="mb-2.5 text-sm font-bold text-gray-500">핵심은 이게 다예요</p>
        <div className="flex flex-wrap items-center gap-2 text-sm font-black text-gray-900">
          <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5">쇼핑 링크 넣기</span>
          <span className="text-[#03C75A]">→</span>
          <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5">자동 생성</span>
          <span className="text-[#03C75A]">→</span>
          <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5">내 링크에 공유</span>
        </div>
      </div>
      {groups.map((g, gi) => <StepGroup key={gi} group={g} onImageClick={onImageClick} />)}
    </div>
  )
}

const StepGroup = ({ group, onImageClick }) => {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(!group.defaultCollapsed)
  const items = group.items
  const total = items.length
  const s = items[Math.min(idx, total - 1)]
  const badge = (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${group.once ? 'bg-[#03C75A]/15 text-[#03C75A]' : 'bg-amber-100 text-amber-700'}`}>
      {group.once ? '처음 한 번만' : '매번 반복'}
    </span>
  )
  return (
    <div>
      {group.group && (group.collapsible ? (
        <button onClick={() => setOpen((o) => !o)} className="mb-3 flex w-full flex-wrap items-center gap-2.5 text-left">
          {badge}
          <h2 className="text-lg font-black text-gray-900 md:text-xl">{group.group}</h2>
          <span className="ml-auto rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">{open ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          {badge}
          <h2 className="text-lg font-black text-gray-900 md:text-xl">{group.group}</h2>
        </div>
      ))}
      {open && (
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="p-5 md:p-6">
          <p className="mb-1.5 text-xs font-bold text-gray-400">{idx + 1} / {total}</p>
          <h3 className="mb-2 text-base font-black leading-snug text-gray-900 md:text-lg" dangerouslySetInnerHTML={{ __html: fmtInline(s.title) }} />
          <p className="text-sm leading-[1.85] text-slate-600 md:text-base" dangerouslySetInnerHTML={{ __html: fmtInline(s.desc) }} />
          {s.note && (
            <div className="mt-3 rounded-xl bg-[#03C75A]/8 px-4 py-3 text-sm leading-[1.8] text-gray-700" dangerouslySetInnerHTML={{ __html: '💡 ' + fmtInline(s.note) }} />
          )}
        </div>
        {s.img && (
          <button onClick={() => onImageClick({ src: s.img, alt: s.title })} className="block w-full border-t border-gray-100 bg-gray-50 p-3">
            <img src={s.img} alt={s.title} loading="lazy" className="mx-auto w-full max-w-[340px] rounded-xl border border-gray-200" />
          </button>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-600 disabled:opacity-30">← 이전</button>
          <div className="flex flex-wrap justify-center gap-1.5">
            {items.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`${i + 1}단계`}
                className={`h-2 w-2 rounded-full transition ${i === idx ? 'bg-[#03C75A]' : 'bg-gray-300 hover:bg-gray-400'}`} />
            ))}
          </div>
          {idx < total - 1 ? (
            <button onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              className="rounded-xl bg-[#03C75A] px-4 py-2 text-sm font-bold text-white">다음 →</button>
          ) : (
            <span className="rounded-xl bg-[#03C75A]/10 px-4 py-2 text-sm font-bold text-[#03C75A]">완료 ✓</span>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

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
    emoji: '📸',
    title: '사진 보고 따라하기 (전체 흐름)',
    callout: '처음 한 번만 하는 세팅과, 영상 만들 때마다 반복하는 단계예요. 다음 ▶ 으로 한 단계씩 따라오세요.',
    type: 'guide',
    content: GUIDE_STEPS,
  },
  credits: {
    emoji: '🪙',
    title: '이용권 안내',
    callout: '영상 1개 = 이용권 1개, 플랜·환불을 정리했어요.',
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
              <span className="inline-block rounded-full bg-[#03C75A] px-3 py-1 text-xs font-black text-white">사진 보고 따라하기</span>
              <h3 className="mt-3 text-xl font-black leading-snug text-gray-900 md:text-2xl">세팅부터 내 링크 공유까지 한 단계씩 📸</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
                처음 한 번만 하는 <b className="text-[#03C75A]">세팅</b>과, 영상 만들 때마다 반복하는 단계를 <b className="text-[#03C75A]">다음 ▶ 으로 한 단계씩</b> 따라할 수 있어요.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#03C75A] px-6 py-3.5 text-base font-black text-white shadow-md shadow-[#03C75A]/25 transition-all group-hover:gap-3">
                사진 가이드 보러가기 <ArrowRight size={18} />
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
