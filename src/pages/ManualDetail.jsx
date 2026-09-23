import { useEffect, useState, useMemo } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ManualHeader, ManualFooter, Markdown, Lightbox, parseFaq } from '../components/ManualLayout'
import PwaInstall from '../components/PwaInstall'

import webappMd from '../content/webapp.md?raw'
import creditsMd from '../content/credits.md?raw'
import faqMd from '../content/faq.md?raw'
import startMd from '../content/quickstart.md?raw'
import searchMd from '../content/search-guide.md?raw'
import trendMd from '../content/trend-guide.md?raw'

const SECTIONS = {
 start: {
 title: '크로닛 제작 흐름',
 callout: '소재를 찾고, 베라가 대본을 쓰고, 클립을 구해 릴스를 완성하는 실제 순서예요.',
 type: 'markdown',
 content: startMd,
 },
 search: {
 title: 'AI 비서 베라 사용법',
 callout: '베라로 할 수 있는 대본 작성과 채널 분석을 정리했어요.',
 type: 'markdown',
 content: searchMd,
 },
 trend: {
 title: '실시간 트렌드 보는 법',
 callout: '최근 반응이 터진 쇼핑 릴스를 모아 보는 곳이에요. 마음에 드는 소재로 바로 대본을 만들 수 있어요.',
 type: 'markdown',
 content: trendMd,
 },
 credits: {
 title: '요금제 · 이용권',
 callout: '대본 1개 = 10턴 세션(이용권 2개). 요금제와 환불 규정을 정리했습니다.',
 type: 'markdown',
 content: creditsMd,
 },
 app: {
 title: '앱으로 설치해 쓰기',
 callout: '홈 화면에 추가하면 일반 앱처럼 바로 실행됩니다. (앱스토어 설치 불필요)',
 type: 'markdown',
 content: webappMd,
 },
 faq: {
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
 <span className="shrink-0 text-[#0064FF] text-sm transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
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
 <Link to="/manual" className="text-[#0064FF] underline">사용 방법으로 돌아가기</Link>
 </div>
 </div>
 )
 }

 return (
 <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans text-gray-900 selection:bg-[#0064FF]/30">
 {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
 <ManualHeader currentPath={pathname} />

 {/* 히어로 */}
 <section className="relative px-5 pt-32 pb-10 md:px-8 md:pt-44 md:pb-12">
 <div className="relative z-10 mx-auto max-w-3xl">
 <Link to="/manual" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-[#0064FF]">
 <ArrowLeft size={16} /> 사용 방법 목록
 </Link>
 <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
 {data.title}
 </h1>
 </div>
 </section>

 {/* 본문 */}
 <section className="px-5 pb-24 md:px-8">
 <div className="mx-auto max-w-3xl">
 {data.callout && (
 <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#0064FF]/30 bg-[#0064FF]/10 px-4 py-3 text-sm font-semibold text-[#0064FF] md:text-base">
 {data.callout}
 </div>
 )}

 {section === 'app' && (
 <div className="mb-6 rounded-3xl border-2 border-[#0064FF]/40 bg-gradient-to-br from-[#0064FF]/10 to-[#0064FF]/5 p-6 text-center md:p-7">
 <h3 className="text-xl font-bold text-gray-900 md:text-2xl">지금 홈 화면에 추가하기</h3>
 <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">버튼을 누르면 설치 안내가 나타납니다. 앱스토어 없이 아이콘 하나로 끝.</p>
 <button onClick={() => window.dispatchEvent(new Event('chronit:open-install'))}
 className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0064FF] px-7 py-3.5 text-base font-bold text-white shadow-md shadow-black/5 transition-all hover:gap-3">
 앱 설치하기
 </button>
 </div>
 )}
 {data.type === 'markdown' && (
 <Markdown onImageClick={setLightbox}>{data.content}</Markdown>
 )}

 {data.type === 'faq' && (
 <div className="space-y-2">
 {faqItems.map((item, i) => (
 <FaqItem key={i} question={item.question} answer={item.answer} onImageClick={setLightbox} />
 ))}
 </div>
 )}

 {section === 'start' && (
 <Link to="/research" className="group mt-8 block overflow-hidden rounded-3xl border-2 border-[#0064FF]/40 bg-gradient-to-br from-[#0064FF]/12 to-[#0064FF]/5 p-6 transition-all hover:-translate-y-0.5 hover:border-[#0064FF] hover:shadow-xl md:p-7">
 <span className="inline-block rounded-full bg-[#0064FF] px-3 py-1 text-xs font-bold text-white">바로 시작</span>
 <h3 className="mt-3 text-xl font-bold leading-snug text-gray-900 md:text-2xl">지금 바로 소재 찾아보기 </h3>
 <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
 링크나 키워드만 넣으면 터진 릴스를 찾아냅니다. <b className="text-[#0064FF]">가입은 무료</b>, 매월 이용권 5개를 제공합니다.
 </p>
 <span className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0064FF] px-6 py-3.5 text-base font-bold text-white shadow-md shadow-black/5 transition-all group-hover:gap-3">
 리서치 열기 <ArrowRight size={18} />
 </span>
 </Link>
 )}
 </div>
 </section>
 <section className="px-5 pb-16 md:px-8">
 <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
 <Link to="/manual" className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-all hover:border-[#0064FF] hover:text-[#0064FF]">
 <ArrowLeft size={16} /> 목록으로
 </Link>
 </div>
 </section>


 <ManualFooter />
 </div>
 )
}

export default ManualDetail
