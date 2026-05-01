import React, { useState, useEffect } from 'react'
import {
  Zap,
  Clock,
  TrendingUp,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Users,
  Cpu,
  ShieldCheck,
  Film,
  TrendingDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedCounter from '../components/AnimatedCounter'

/**
 * Spline Viewer를 이용한 배경 파티클
 * opacity를 0.9로 높여 더 선명하게 보이도록 수정했습니다.
 */
const SplineScene = ({ scene }) => {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@splinetool/viewer@1.0.93/build/spline-viewer.js'
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="h-full w-full origin-center scale-125 transform opacity-90 transition-opacity duration-1000 md:scale-[1.6]">
      <spline-viewer url={scene} events-target="global"></spline-viewer>
    </div>
  )
}

const Home = () => {
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
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-xl shadow-blue-500/20 md:h-10 md:w-10">
              C
            </div>
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-xl font-black tracking-tighter text-transparent md:text-2xl">
              Chronit
            </h1>
          </div>
          <nav className="hidden gap-12 text-sm font-bold tracking-wide text-slate-400 md:flex">
            <a href="#features" className="uppercase transition-colors hover:text-blue-400">
              Features
            </a>
            <Link to="/manual" className="uppercase transition-colors hover:text-blue-400">
              Manual
            </Link>
            <a href="#pricing" className="uppercase transition-colors hover:text-blue-400">
              Pricing
            </a>
          </nav>
          <button className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95 md:px-7 md:py-2.5 md:text-sm">
            Pre-order
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden text-center">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <SplineScene scene="https://prod.spline.design/f6eUUnJ7Yn2V5uXM/scene.splinecode" />
        </div>

        {/* Overlays for depth and readability */}
        <div className="absolute inset-0 z-[1] bg-[#020617]/10"></div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#020617]/10 via-transparent to-[#020617]"></div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 py-24 md:px-8 md:py-32">
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] md:mb-10 md:px-4 md:text-sm">
            <Zap size={14} fill="currentColor" /> <span>실무자 직접 제작 v1.0</span>
          </div>

          <div className="mb-10 flex w-full flex-col items-center md:mb-12">
            <span className="mb-2 text-base font-medium text-slate-400 opacity-80 md:text-2xl">
              숏폼 회사 실무자가
            </span>
            <h2 className="animate-burn mb-4 text-4xl font-black tracking-tight text-white md:text-6xl">
              답답해서
            </h2>
            <span className="mb-4 text-center text-base font-medium text-slate-400 opacity-80 md:mb-6 md:text-2xl">
              직접 만든 릴스 자동화 솔루션,
            </span>
            <h2 className="bg-gradient-to-r from-blue-400 via-white to-indigo-400 bg-clip-text text-[64px] leading-[1] font-black tracking-tighter text-transparent drop-shadow-[0_10px_20px_rgba(59,130,246,0.3)] md:text-[110px]">
              크로닛
            </h2>
          </div>

          <p className="mb-10 max-w-3xl px-2 text-base leading-[1.8] font-medium text-slate-300 md:mb-14 md:text-xl">
            "수익 인증 대신, 제가 아껴드린{' '}
            <strong className="border-b-2 border-blue-500/50 text-white">시간</strong>을
            인증합니다."
            <br />
            하루 단 <span className="font-bold text-blue-400">966원</span>. 1시간의 노가다를 1분의
            자동화로 바꾸고
            <br className="hidden md:block" />
            당신은 오직 기획에만 집중하세요.
          </p>

          <div className="flex w-full flex-col gap-6 sm:w-auto sm:flex-row">
            <button className="group flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-extrabold text-white shadow-[0_20px_50px_-15px_rgba(37,99,235,0.6)] transition-all hover:bg-blue-500 active:scale-95 md:gap-3 md:px-14 md:py-5 md:text-xl">
              프리오더 70% 혜택받기{' '}
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="mt-16 flex animate-pulse flex-col items-center gap-4 text-xs font-bold tracking-[0.5em] text-slate-500 md:mt-20">
            <div className="h-12 w-[1px] bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
            <span>SCROLL TO EXPLORE</span>
          </div>
        </div>
      </section>


      {/* Stats Section */}
      <section className="relative overflow-hidden bg-[#020617] px-5 py-20 md:px-8 md:py-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)]"></div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-12 text-center md:mb-16">
            <h3 className="mb-4 text-xs font-black tracking-[0.3em] text-blue-500 uppercase md:text-sm">
              By The Numbers
            </h3>
            <h2 className="text-2xl leading-[1.4] font-bold md:text-4xl">
              실무자들이 직접 검증한 결과
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 md:gap-8">
            <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 text-center shadow-2xl transition-all duration-500 hover:border-blue-500/40 md:rounded-[2rem] md:p-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-transform group-hover:scale-110 md:mb-6 md:h-14 md:w-14">
                <Film size={24} />
              </div>
              <div className="bg-gradient-to-br from-white via-blue-200 to-blue-400 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-6xl">
                <AnimatedCounter to={1500} suffix="+" />
              </div>
              <div className="mt-3 text-sm font-bold text-slate-400 md:mt-4 md:text-base">
                제작된 릴스
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-blue-500/[0.08] to-transparent p-6 text-center shadow-[0_0_60px_-20px_rgba(37,99,235,0.5)] transition-all duration-500 hover:border-blue-500/40 md:rounded-[2rem] md:p-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-transform group-hover:scale-110 md:mb-6 md:h-14 md:w-14">
                <TrendingDown size={24} />
              </div>
              <div className="bg-gradient-to-br from-white via-blue-200 to-blue-400 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-6xl">
                <AnimatedCounter to={97} suffix="%" />
              </div>
              <div className="mt-3 text-sm font-bold text-slate-400 md:mt-4 md:text-base">
                시간 절감률
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 text-center shadow-2xl transition-all duration-500 hover:border-blue-500/40 md:rounded-[2rem] md:p-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-transform group-hover:scale-110 md:mb-6 md:h-14 md:w-14">
                <Clock size={24} />
              </div>
              <div className="bg-gradient-to-br from-white via-blue-200 to-blue-400 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-6xl">
                <AnimatedCounter to={320} suffix="시간" />
              </div>
              <div className="mt-3 text-sm font-bold text-slate-400 md:mt-4 md:text-base">
                총 절약 시간
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="relative bg-[#010411] px-5 py-24 md:px-8 md:py-48">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center md:mb-28">
            <h3 className="mb-6 text-xs font-black tracking-[0.3em] text-blue-500 uppercase md:mb-8 md:text-sm">
              The Real Problem
            </h3>
            <h2 className="text-3xl leading-[1.4] font-bold md:text-5xl md:leading-[1.5]">
              노력의 부족이 아니라,
              <br />
              도구의 선택이 잘못된 것입니다.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 md:gap-12">
            <div className="group rounded-[1.5rem] border border-white/5 bg-slate-900/30 p-6 shadow-2xl backdrop-blur-sm transition-all duration-500 hover:border-blue-500/40 sm:rounded-[2rem] sm:p-8 md:rounded-[3rem] md:p-14">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 transition-transform group-hover:scale-110 md:mb-10 md:h-16 md:w-16">
                <Clock size={28} />
              </div>
              <h4 className="mb-4 text-xl leading-[1.4] font-bold md:mb-6 md:text-2xl">
                매일 반복되는 1시간의 노가다
              </h4>
              <p className="text-base leading-[1.8] text-slate-400 md:text-lg">
                영상 소스 찾기, 대본 짜기, 자막 복붙... 조회수는 제자리인데 당신의 시간만 의미 없이
                소모되고 있지는 않나요?
              </p>
            </div>
            <div className="group rounded-[1.5rem] border border-white/5 bg-slate-900/30 p-6 shadow-2xl backdrop-blur-sm transition-all duration-500 hover:border-blue-500/40 sm:rounded-[2rem] sm:p-8 md:rounded-[3rem] md:p-14">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-500 transition-transform group-hover:scale-110 md:mb-10 md:h-16 md:w-16">
                <TrendingUp size={28} />
              </div>
              <h4 className="mb-4 text-xl leading-[1.4] font-bold md:mb-6 md:text-2xl">
                어설픈 AI의 '광고 필터'
              </h4>
              <p className="text-base leading-[1.8] text-slate-400 md:text-lg">
                시청자는 0.1초 만에 가짜를 알아봅니다. 자연스럽지 못한 AI 영상은 오히려 브랜드
                신뢰도를 깎아먹습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section
        id="features"
        className="relative overflow-hidden bg-[#020617] px-5 py-24 md:px-8 md:py-48"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:40px_40px]"></div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col items-center justify-between gap-8 text-center md:mb-32 md:flex-row md:items-end md:gap-12 md:text-left">
            <div className="mx-auto max-w-2xl md:mx-0">
              <h3 className="mb-4 text-xs font-black tracking-[0.2em] text-blue-500 uppercase md:mb-6 md:text-base">
                Core Strength
              </h3>
              <h2 className="text-3xl leading-[1.4] font-bold md:text-5xl">
                진짜를 아는 실무자는
                <br />
                기획에만 에너지를 씁니다.
              </h2>
            </div>
            <div className="border-l-4 border-blue-500 bg-blue-500/5 p-6 text-left md:max-w-sm md:p-8">
              <p className="text-base leading-[1.8] text-slate-400 md:text-lg">
                수만 개의 영상을 직접 제작하며 증명된 로직을 시스템에 그대로 옮겼습니다.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:gap-10 lg:grid-cols-3">
            <FeatureCard
              icon={<ShieldCheck className="text-blue-500" />}
              title="실제 리뷰 데이터 기반"
              description="AI 가상 이미지가 아닌 실제 상품의 사용감과 디테일이 담긴 소스로 시청자의 의심을 확신으로 바꿉니다."
            />
            <FeatureCard
              icon={<Cpu className="text-cyan-500" />}
              title="실전 자막 리듬 로직"
              description="단순 자막이 아닙니다. 이탈률을 최소화하는 30자 절단 공법과 스토리텔링 체인 기술이 탑재되었습니다."
            />
            <FeatureCard
              icon={<Zap className="text-indigo-500" />}
              title="GPT-4o 후킹 엔진"
              description="0.5초 만에 시선을 고정시키는 썸네일 카피와 대본을 생성하여 조회수 파이프라인을 구축합니다."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-5 py-24 md:px-8 md:py-48">
        <div className="shadow-3xl relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-900/60 via-[#03081c] to-indigo-900/40 md:rounded-[4rem]">
          <div className="relative z-10 p-5 text-center sm:p-8 md:p-32">
            <h2 className="mb-8 text-3xl leading-[1.3] font-black tracking-tight md:mb-12 md:text-[56px]">
              당신의 1시간은
              <br className="hidden md:block" /> 900원보다 훨씬 고귀합니다.
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-base leading-[1.8] font-medium text-slate-300 md:mb-20 md:text-2xl">
              하루 편의점 껌 한 통 값으로,
              <br />
              당신의 성장을 가로막던 제작 노가다에서 해방되세요.
            </p>

            <div
              id="pricing"
              className="mx-auto mb-16 grid max-w-4xl gap-6 text-left md:mb-24 md:grid-cols-2 md:gap-10"
            >
              <div className="rounded-[1.5rem] border border-white/5 bg-black/40 p-5 opacity-50 backdrop-blur-2xl transition-all sm:rounded-[2rem] sm:p-6 md:rounded-[3.5rem] md:p-12">
                <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase line-through md:mb-3 md:text-xs">
                  Standard Plan
                </p>
                <div className="mb-4 flex items-end gap-2 md:mb-10">
                  <span className="text-xl font-black text-slate-400 md:text-3xl">
                    월 59,000원
                  </span>
                </div>
                <ul className="space-y-3 text-xs font-bold text-slate-500 md:space-y-6 md:text-sm">
                  <li className="flex items-center gap-2 md:gap-4">
                    <CheckCircle2 size={16} className="shrink-0" /> 서비스 전체 기능 이용
                  </li>
                  <li className="flex items-center gap-2 md:gap-4">
                    <CheckCircle2 size={16} className="shrink-0" /> 기본 기술 상담 제공
                  </li>
                </ul>
              </div>

              <div className="group relative transform rounded-[1.5rem] border border-blue-400 bg-blue-600 p-5 shadow-[0_0_60px_-12px_rgba(37,99,235,0.6)] transition-all duration-500 hover:-translate-y-3 sm:rounded-[2rem] sm:p-6 md:rounded-[3.5rem] md:p-12">
                <div className="absolute -top-3 right-4 rounded-full bg-white px-3 py-1 text-[10px] font-black whitespace-nowrap text-blue-600 shadow-2xl sm:-top-4 sm:right-6 sm:px-4 sm:py-1.5 sm:text-xs md:-top-6 md:right-12 md:px-6 md:py-2 md:text-sm">
                  선착순 한정 혜택
                </div>
                <p className="mb-2 text-[10px] font-bold tracking-widest text-blue-100 uppercase md:mb-3 md:text-xs">
                  Pre-order Offer
                </p>
                <div className="mb-4 flex items-end gap-2 md:mb-10">
                  <span className="text-2xl font-black text-white md:text-5xl">월 29,000원</span>
                </div>
                <ul className="space-y-3 text-sm font-bold text-white md:space-y-6 md:text-lg">
                  <li className="flex items-start gap-2 md:gap-4">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-200" /> 조회수 폭발 기획 가이드
                  </li>
                  <li className="flex items-start gap-2 md:gap-4">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-200" /> 실무진 1:1 피드백 반영권
                  </li>
                  <li className="flex items-start gap-2 md:gap-4">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-200" /> 파트너 전용 커뮤니티 초대
                  </li>
                </ul>
              </div>
            </div>

            <button className="shadow-3xl w-full rounded-[2rem] bg-white px-8 py-5 text-base font-black text-blue-950 transition-all hover:bg-slate-100 active:scale-95 sm:w-auto md:rounded-[2.5rem] md:px-20 md:py-7 md:text-2xl">
              프리오더 혜택 신청하기
            </button>
            <p className="mt-8 flex items-center justify-center gap-3 text-sm font-bold text-slate-400 md:mt-12">
              <MessageCircle size={20} className="text-blue-500" /> 실무자 1:1 카카오톡 상담
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#01030a] px-5 py-16 md:px-8 md:py-32">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-12 md:flex-row md:gap-16">
          <div className="max-w-md">
            <div className="mb-6 flex items-center gap-3 md:mb-10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
                C
              </div>
              <h1 className="text-xl font-black tracking-tighter">Chronit</h1>
            </div>
            <p className="text-base leading-[1.8] font-medium text-slate-500 md:text-lg">
              우리는 당신의 '시간'이 가장 가치 있는 자산이라 믿습니다.
              <br />
              실무자의 고뇌가 담긴 도구로 숏폼 비즈니스의 격을 높이세요.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-6 sm:gap-12 md:w-auto md:gap-20">
            <div className="flex flex-col gap-4 md:gap-6">
              <span className="text-xs font-bold tracking-widest text-white uppercase md:text-sm">
                Product
              </span>
              <a
                href="#"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-base"
              >
                Features
              </a>
              <a
                href="#"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-base"
              >
                Pricing
              </a>
            </div>
            <div className="flex flex-col gap-4 md:gap-6">
              <span className="text-xs font-bold tracking-widest text-white uppercase md:text-sm">
                Company
              </span>
              <a
                href="#"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-base"
              >
                Story
              </a>
              <a
                href="#"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-base"
              >
                Contact
              </a>
            </div>
            <div className="flex flex-col gap-4 md:gap-6">
              <span className="text-xs font-bold tracking-widest text-white uppercase md:text-sm">
                Legal
              </span>
              <a
                href="#"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-base"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-base"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-white/5 pt-8 md:mt-32 md:flex-row md:gap-8 md:pt-10">
          <p className="text-center text-[10px] font-bold tracking-[0.3em] text-slate-600 uppercase md:text-xs md:tracking-[0.4em]">
            &copy; 2024 Chronit Labs. Crafting Future Efficiency.
          </p>
          <div className="flex gap-6 md:gap-8">
            <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-blue-600">
              <Users size={20} />
            </div>
            <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-blue-600">
              <MessageCircle size={20} />
            </div>
          </div>
        </div>
      </footer>

      {/* Global CSS for Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes burn {
          0% {
            color: #ffffff;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
          50% {
            color: #ef4444;
            text-shadow:
              0 0 20px rgba(239, 68, 68, 0.8),
              0 0 40px rgba(239, 68, 68, 0.4);
            transform: scale(1.05);
          }
          100% {
            color: #ffffff;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
        }
        .animate-fade-in {
          animation: fade-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-burn {
          animation: burn 3s ease-in-out infinite;
          display: inline-block;
        }
        html {
          scroll-behavior: smooth;
        }
        body {
          -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #020617;
        }
        ::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  )
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="group rounded-[1.5rem] border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-6 shadow-2xl transition-all duration-700 hover:border-blue-500/30 sm:rounded-[2rem] sm:p-8 md:rounded-[4rem] md:p-14">
    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#03081c] shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white md:mb-12 md:h-20 md:w-20 md:rounded-3xl">
      {React.cloneElement(icon, { size: 32, className: 'group-hover:text-white' })}
    </div>
    <h4 className="mb-4 text-xl leading-[1.4] font-bold transition-colors group-hover:text-blue-400 md:mb-8 md:text-2xl">
      {title}
    </h4>
    <p className="text-base leading-[1.8] font-medium text-slate-400 md:text-lg md:leading-[1.9]">
      {description}
    </p>
  </div>
)

export default Home
