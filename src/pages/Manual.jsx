import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Monitor,
  PlayCircle,
  Keyboard,
  HelpCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'

const DOWNLOAD_URL =
  'https://github.com/Globalshorts/chronit/releases/latest/download/Chronit_Setup_1.0.0.exe'

const Manual = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] font-sans break-keep text-slate-100 selection:bg-blue-500/30">
      {/* Header */}
      <header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/10 bg-[#020617]/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img
              src="/favicon.png"
              alt="Chronit"
              className="h-12 w-12 shrink-0 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)] md:h-16 md:w-16"
            />
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-black tracking-tighter text-transparent md:text-3xl">
              Chronit
            </h1>
          </Link>
          <nav className="hidden gap-12 text-sm font-bold tracking-wide text-slate-400 md:flex">
            <Link to="/#features" className="uppercase transition-colors hover:text-blue-400">
              Features
            </Link>
            <Link to="/manual" className="uppercase text-blue-400 transition-colors">
              Manual
            </Link>
            <Link to="/#pricing" className="uppercase transition-colors hover:text-blue-400">
              Pricing
            </Link>
          </nav>
          <Link
            to="/"
            className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95 md:px-7 md:py-2.5 md:text-sm"
          >
            Pre-order
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]"></div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-sm">
            <Sparkles size={14} fill="currentColor" /> <span>크로닛 사용 매뉴얼</span>
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-6xl">Manual</h1>
          <p className="text-base leading-[1.8] text-slate-400 md:text-xl">
            설치부터 첫 영상 제작까지, 5분 안에 익히는 크로닛 사용법.
          </p>
        </div>
      </section>

      {/* Quick Nav */}
      <section className="px-5 pb-12 md:px-8 md:pb-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { id: 'install', icon: Download, label: '설치' },
            { id: 'usage', icon: PlayCircle, label: '사용법' },
            { id: 'shortcuts', icon: Keyboard, label: '단축키' },
            { id: 'faq', icon: HelpCircle, label: 'FAQ' },
          ].map(({ id, icon: Icon, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="group flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-bold text-slate-300 transition-all hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white md:text-base"
            >
              <Icon size={18} className="text-blue-400 transition-transform group-hover:scale-110" />
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* Install Section */}
      <Section id="install" icon={Download} title="1. 설치하기" subtitle="Installation">
        <Step number="1" title="Windows 설치 파일 다운로드">
          <p className="mb-4 text-base leading-relaxed text-slate-400 md:text-lg">
            아래 버튼을 눌러 최신 버전 설치 파일을 다운로드하세요.
          </p>
          <a
            href={DOWNLOAD_URL}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-[0_15px_40px_-10px_rgba(37,99,235,0.6)] transition-all hover:bg-blue-500 active:scale-95 md:text-base"
          >
            <Monitor size={18} /> Windows 다운로드 (약 513MB)
          </a>
          <p className="mt-3 text-xs text-slate-500 md:text-sm">
            Windows 10 / 11 지원 · 설치 파일은 GitHub Releases에서 호스팅됩니다.
          </p>
        </Step>

        <Step number="2" title="SmartScreen 경고 처리" warning>
          <p className="mb-3 text-base leading-relaxed text-slate-400 md:text-lg">
            첫 실행 시 Windows가 "PC를 보호했습니다" 경고를 표시할 수 있습니다.
            코드사이닝 인증서를 누적 다운로드 후 자동 해결되는 일반적인 경고입니다.
          </p>
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.06] p-4">
            <p className="flex items-start gap-2 text-sm font-bold text-yellow-300 md:text-base">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>
                <strong>추가 정보</strong> → <strong>실행</strong> 을 차례로 클릭하면 정상 설치됩니다.
              </span>
            </p>
          </div>
        </Step>

        <Step number="3" title="설치 마법사 진행">
          <p className="text-base leading-relaxed text-slate-400 md:text-lg">
            [Placeholder] 설치 경로 선택 · 바탕화면 단축키 생성 옵션 등 설치 마법사 설명.
          </p>
        </Step>
      </Section>

      {/* Usage Section */}
      <Section id="usage" icon={PlayCircle} title="2. 사용법" subtitle="Getting Started">
        <Step number="1" title="회원가입 / 로그인">
          <p className="text-base leading-relaxed text-slate-400 md:text-lg">
            [Placeholder] 홈페이지 결제 후 발급된 이메일로 로그인합니다. 가입 시 입금자명과 동일한 이메일을 사용해야 자동 활성화됩니다.
          </p>
        </Step>
        <Step number="2" title="첫 영상 만들기">
          <p className="text-base leading-relaxed text-slate-400 md:text-lg">
            [Placeholder] 키워드 입력 → 상품 선택 → AI 스크립트 생성 → 자동 자막 → 완성. 약 1분 소요.
          </p>
        </Step>
        <Step number="3" title="채널 연동 (쿠파스 + 인포크링크)">
          <p className="text-base leading-relaxed text-slate-400 md:text-lg">
            [Placeholder] 수익화 링크 연동 방법 안내.
          </p>
        </Step>
        <Step number="4" title="다중 채널 운영 (Pro/Master)">
          <p className="text-base leading-relaxed text-slate-400 md:text-lg">
            [Placeholder] Pro/Master 플랜의 대량 생성 워크플로우.
          </p>
        </Step>
      </Section>

      {/* Shortcuts Section */}
      <Section id="shortcuts" icon={Keyboard} title="3. 단축키" subtitle="Keyboard Shortcuts">
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {[
            ['Ctrl + N', '새 프로젝트'],
            ['Ctrl + S', '저장'],
            ['Ctrl + Enter', '영상 생성'],
            ['Ctrl + ,', '환경설정'],
            ['F5', '미리보기'],
            ['Ctrl + Z / Y', '실행 취소 / 다시'],
          ].map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <span className="text-sm font-medium text-slate-400 md:text-base">{label}</span>
              <kbd className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs font-bold text-blue-300 md:text-sm">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500 md:text-sm">
          [Placeholder] 실제 사용 중인 단축키로 교체 예정.
        </p>
      </Section>

      {/* FAQ Section */}
      <Section id="faq" icon={HelpCircle} title="4. 자주 묻는 질문" subtitle="FAQ">
        <Faq q="결제 후 언제 활성화되나요?">
          영업일 기준 1일 이내에 입금 확인 후 자동 활성화됩니다.
          크로닛 데스크탑 앱에서 가입한 이메일로 로그인하시면 즉시 사용 가능합니다.
        </Faq>
        <Faq q="다른 컴퓨터에서 사용할 수 있나요?">
          [Placeholder] 디바이스 정책 안내 (예: 2대 동시 사용 등).
        </Faq>
        <Faq q="환불이 가능한가요?">
          [Placeholder] 환불 정책 (7일 환불 기간 등).
        </Faq>
        <Faq q="구독을 해지하면 데이터가 어떻게 되나요?">
          [Placeholder] 데이터 보관 정책.
        </Faq>
        <Faq q="Mac에서도 사용할 수 있나요?">
          [Placeholder] Mac 지원 계획.
        </Faq>
        <Faq q="문의는 어디로 하나요?">
          [Placeholder] 추후 채널톡 안내 예정.
        </Faq>
      </Section>

      {/* Back to home */}
      <section className="px-5 py-16 text-center md:px-8 md:py-24">
        <Link
          to="/"
          className="group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400 md:text-base"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          홈으로 돌아가기
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#01030a] px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-slate-600 uppercase md:text-xs md:tracking-[0.4em]">
            &copy; 2026 Chronit Labs. Crafting Future Efficiency.
          </p>
        </div>
      </footer>
    </div>
  )
}

const Section = ({ id, icon: Icon, title, subtitle, children }) => (
  <section id={id} className="px-5 py-16 md:px-8 md:py-24">
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 flex items-center gap-4 md:mb-14">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-blue-500/10 text-blue-400 md:h-14 md:w-14">
          <Icon size={24} />
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-blue-500 uppercase md:text-xs">
            {subtitle}
          </p>
          <h2 className="text-2xl font-black tracking-tight md:text-4xl">{title}</h2>
        </div>
      </div>
      <div className="space-y-6 md:space-y-8">{children}</div>
    </div>
  </section>
)

const Step = ({ number, title, children, warning }) => (
  <div
    className={`rounded-3xl border p-6 md:p-8 ${warning ? 'border-yellow-500/20 bg-yellow-500/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}
  >
    <div className="mb-3 flex items-center gap-3">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black md:h-8 md:w-8 md:text-sm ${warning ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/15 text-blue-300'}`}
      >
        {number}
      </span>
      <h3 className="text-lg font-bold text-white md:text-xl">{title}</h3>
    </div>
    {children}
  </div>
)

const Faq = ({ q, children }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-white/[0.03] md:p-6"
      >
        <span className="text-sm font-bold text-white md:text-base">Q. {q}</span>
        <span
          className={`text-xl text-blue-400 transition-transform md:text-2xl ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="border-t border-white/5 px-5 pt-4 pb-5 text-sm leading-relaxed text-slate-400 md:px-6 md:pt-5 md:pb-6 md:text-base">
          {children}
        </div>
      )}
    </div>
  )
}

export default Manual
