import React, { useState, useEffect } from 'react';
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
  MousePointer2
} from 'lucide-react';

/**
 * Spline Viewer를 이용한 배경 파티클
 * opacity를 0.9로 높여 더 선명하게 보이도록 수정했습니다.
 */
const SplineScene = ({ scene }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.0.93/build/spline-viewer.js';
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="w-full h-full transform scale-125 md:scale-[1.6] origin-center opacity-90 transition-opacity duration-1000">
      <spline-viewer 
        url={scene} 
        events-target="global"
      ></spline-viewer>
    </div>
  );
};

const App = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-blue-500/30 break-keep overflow-x-hidden">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#020617]/90 backdrop-blur-xl py-4 border-b border-white/10' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-xl shadow-blue-500/20">C</div>
            <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Chronit</h1>
          </div>
          <nav className="hidden md:flex gap-12 text-sm font-bold text-slate-400 tracking-wide">
            <a href="#features" className="hover:text-blue-400 transition-colors uppercase">Features</a>
            <a href="#story" className="hover:text-blue-400 transition-colors uppercase">Our Story</a>
            <a href="#pricing" className="hover:text-blue-400 transition-colors uppercase">Pricing</a>
          </nav>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-blue-600/25 active:scale-95">
            Pre-order Now
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden text-center">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <SplineScene scene="https://prod.spline.design/f6eUUnJ7Yn2V5uXM/scene.splinecode" />
        </div>
        
        {/* Overlays for depth and readability */}
        <div className="absolute inset-0 bg-[#020617]/10 z-[1]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/10 via-transparent to-[#020617] z-[1]"></div>

        <div className="relative z-10 max-w-6xl mx-auto px-8 w-full py-32 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-10 animate-fade-in shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Zap size={16} fill="currentColor" /> <span>실무자 직접 제작 v1.0</span>
          </div>
          
          <div className="flex flex-col items-center mb-12">
            <span className="text-lg md:text-2xl font-medium text-slate-400 mb-2 opacity-80">숏폼 회사 실무자가</span>
            <h2 className="text-4xl md:text-6xl font-black mb-4 animate-burn text-white tracking-tight">
              답답해서
            </h2>
            <span className="text-lg md:text-2xl font-medium text-slate-400 mb-6 opacity-80">직접 만든 릴스 자동화 솔루션,</span>
            <h2 className="text-7xl md:text-[110px] font-black leading-[1] tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-white to-indigo-400 drop-shadow-[0_10px_20px_rgba(59,130,246,0.3)]">
              크로닛
            </h2>
          </div>

          <p className="text-lg md:text-xl text-slate-300 mb-14 leading-[1.8] max-w-3xl font-medium">
            "수익 인증 대신, 제가 아껴드린 <strong className="text-white border-b-2 border-blue-500/50">시간</strong>을 인증합니다."<br />
            하루 단 <span className="text-blue-400 font-bold">966원</span>. 1시간의 노가다를 1분의 자동화로 바꾸고<br className="hidden md:block" />
            당신은 오직 기획에만 집중하세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-14 py-5 rounded-2xl font-extrabold text-xl flex items-center justify-center gap-3 transition-all shadow-[0_20px_50px_-15px_rgba(37,99,235,0.6)] group active:scale-95">
              프리오더 70% 혜택받기 <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="mt-20 flex flex-col items-center gap-4 text-slate-500 text-xs font-bold tracking-[0.5em] animate-pulse">
            <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
            <span>SCROLL TO EXPLORE</span>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-48 px-8 relative bg-[#010411]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-28">
            <h3 className="text-blue-500 text-sm font-black tracking-[0.3em] uppercase mb-8">The Real Problem</h3>
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.5]">노력의 부족이 아니라,<br />도구의 선택이 잘못된 것입니다.</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="group bg-slate-900/30 backdrop-blur-sm border border-white/5 p-14 rounded-[3rem] hover:border-blue-500/40 transition-all duration-500 shadow-2xl">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                <Clock size={32} />
              </div>
              <h4 className="text-2xl font-bold mb-6 leading-[1.4]">매일 반복되는 1시간의 노가다</h4>
              <p className="text-slate-400 text-lg leading-[1.8]">
                영상 소스 찾기, 대본 짜기, 자막 복붙...<br />
                조회수는 제자리인데 당신의 시간만<br />
                의미 없이 소모되고 있지는 않나요?
              </p>
            </div>
            <div className="group bg-slate-900/30 backdrop-blur-sm border border-white/5 p-14 rounded-[3rem] hover:border-blue-500/40 transition-all duration-500 shadow-2xl">
              <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                <TrendingUp size={32} />
              </div>
              <h4 className="text-2xl font-bold mb-6 leading-[1.4]">어설픈 AI의 '광고 필터'</h4>
              <p className="text-slate-400 text-lg leading-[1.8]">
                시청자는 0.1초 만에 가짜를 알아봅니다.<br />
                자연스럽지 못한 AI 영상은<br />
                오히려 브랜드 신뢰도를 깎아먹습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-48 px-8 relative overflow-hidden bg-[#020617]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-32 gap-12 text-center md:text-left">
            <div className="max-w-2xl mx-auto md:mx-0">
              <h3 className="text-blue-500 font-black tracking-[0.2em] uppercase mb-6">Core Strength</h3>
              <h2 className="text-4xl md:text-5xl font-bold leading-[1.4]">
                진짜를 아는 실무자는<br />기획에만 에너지를 씁니다.
              </h2>
            </div>
            <div className="bg-blue-500/5 border-l-4 border-blue-500 p-8 md:max-w-sm text-left">
              <p className="text-slate-400 text-lg leading-[1.8]">
                수만 개의 영상을 직접 제작하며 증명된 로직을 시스템에 그대로 옮겼습니다.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
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
      <section className="py-48 px-8">
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-blue-900/60 via-[#03081c] to-indigo-900/40 border border-white/10 rounded-[4rem] overflow-hidden relative shadow-3xl">
          <div className="relative z-10 p-16 md:p-32 text-center">
            <h2 className="text-4xl md:text-[56px] font-black mb-12 leading-[1.3] tracking-tight">
              당신의 1시간은<br className="md:block hidden" /> 900원보다 훨씬 고귀합니다.
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 mb-20 max-w-3xl mx-auto leading-[1.8] font-medium">
              하루 편의점 껌 한 통 값으로,<br />
              당신의 성장을 가로막던 제작 노가다에서 해방되세요.
            </p>
            
            <div id="pricing" className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto text-left mb-24">
              <div className="bg-black/40 backdrop-blur-2xl p-12 rounded-[3.5rem] border border-white/5 opacity-50 transition-all">
                <p className="text-slate-500 line-through mb-3 font-bold uppercase tracking-widest text-xs">Standard Plan</p>
                <div className="flex items-end gap-2 mb-10">
                  <span className="text-3xl font-black text-slate-400">월 59,000원</span>
                </div>
                <ul className="space-y-6 text-slate-500 text-sm font-bold">
                  <li className="flex items-center gap-4"><CheckCircle2 size={18} /> 서비스 전체 기능 이용</li>
                  <li className="flex items-center gap-4"><CheckCircle2 size={18} /> 기본 기술 상담 제공</li>
                </ul>
              </div>

              <div className="bg-blue-600 p-12 rounded-[3.5rem] border border-blue-400 shadow-[0_0_60px_-12px_rgba(37,99,235,0.6)] relative transform hover:-translate-y-3 transition-all duration-500 group">
                <div className="absolute -top-6 right-12 bg-white text-blue-600 px-6 py-2 rounded-full text-sm font-black shadow-2xl">
                  선착순 한정 혜택
                </div>
                <p className="text-blue-100 mb-3 font-bold uppercase tracking-widest text-xs">Pre-order Offer</p>
                <div className="flex items-end gap-2 mb-10">
                  <span className="text-5xl font-black text-white">월 29,000원</span>
                </div>
                <ul className="space-y-6 text-white font-bold text-lg">
                  <li className="flex items-center gap-4"><CheckCircle2 size={22} className="text-blue-200" /> 조회수 폭발 기획 가이드</li>
                  <li className="flex items-center gap-4"><CheckCircle2 size={22} className="text-blue-200" /> 실무진 1:1 피드백 반영권</li>
                  <li className="flex items-center gap-4"><CheckCircle2 size={22} className="text-blue-200" /> 파트너 전용 커뮤니티 초대</li>
                </ul>
              </div>
            </div>

            <button className="bg-white text-blue-950 px-20 py-7 rounded-[2.5rem] font-black text-2xl hover:bg-slate-100 transition-all shadow-3xl active:scale-95">
              프리오더 혜택 신청하기
            </button>
            <p className="mt-12 text-slate-400 text-sm font-bold flex items-center justify-center gap-3">
              <MessageCircle size={20} className="text-blue-500" /> 실무자 1:1 카카오톡 상담
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-white/5 bg-[#01030a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-16">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">C</div>
              <h1 className="text-xl font-black tracking-tighter">Chronit</h1>
            </div>
            <p className="text-slate-500 text-lg leading-[1.8] font-medium">
              우리는 당신의 '시간'이 가장 가치 있는 자산이라 믿습니다.<br />
              실무자의 고뇌가 담긴 도구로 숏폼 비즈니스의 격을 높이세요.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-20">
            <div className="flex flex-col gap-6">
              <span className="text-white font-bold text-sm uppercase tracking-widest">Product</span>
              <a href="#" className="text-slate-500 hover:text-blue-400 transition-colors font-medium">Features</a>
              <a href="#" className="text-slate-500 hover:text-blue-400 transition-colors font-medium">Pricing</a>
            </div>
            <div className="flex flex-col gap-6">
              <span className="text-white font-bold text-sm uppercase tracking-widest">Company</span>
              <a href="#" className="text-slate-500 hover:text-blue-400 transition-colors font-medium">Story</a>
              <a href="#" className="text-slate-500 hover:text-blue-400 transition-colors font-medium">Contact</a>
            </div>
            <div className="flex flex-col gap-6">
              <span className="text-white font-bold text-sm uppercase tracking-widest">Legal</span>
              <a href="#" className="text-slate-500 hover:text-blue-400 transition-colors font-medium">Privacy</a>
              <a href="#" className="text-slate-500 hover:text-blue-400 transition-colors font-medium">Terms</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-[0.4em]">
            &copy; 2024 Chronit Labs. Crafting Future Efficiency.
          </p>
          <div className="flex gap-8">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-all cursor-pointer">
              <Users size={20} />
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-all cursor-pointer">
              <MessageCircle size={20} />
            </div>
          </div>
        </div>
      </footer>

      {/* Global CSS for Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes burn {
          0% { 
            color: #ffffff; 
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5); 
          }
          50% { 
            color: #ef4444; 
            text-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4); 
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
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="p-14 rounded-[4rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 hover:border-blue-500/30 transition-all duration-700 group shadow-2xl">
    <div className="w-20 h-20 bg-[#03081c] rounded-3xl flex items-center justify-center mb-12 border border-white/10 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-xl">
      {React.cloneElement(icon, { size: 36, className: "group-hover:text-white" })}
    </div>
    <h4 className="text-2xl font-bold mb-8 leading-[1.4] group-hover:text-blue-400 transition-colors">{title}</h4>
    <p className="text-slate-400 text-lg leading-[1.9] font-medium">
      {description}
    </p>
  </div>
);

export default App;