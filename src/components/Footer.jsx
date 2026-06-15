import { Link } from 'react-router-dom'
import { Users, MessageCircle } from 'lucide-react'

/**
 * 공개 페이지 공통 푸터 (전자상거래법 사업자정보 표기 포함)
 * - dark: 다크 테마 페이지(Legal 등)에서 true
 * - user: 관리자 링크 노출용 (선택)
 *
 * 사업자정보는 전자상거래법에 따라 모든 공개 페이지 하단에 노출합니다.
 */
const Footer = ({ dark = false, user = null }) => {
  // 테마별 색상 토큰
  const t = dark
    ? {
        wrap: 'border-white/5 bg-[#01030a]',
        brand: 'text-white',
        lead: 'text-slate-400',
        head: 'text-slate-100',
        link: 'text-slate-400 hover:text-blue-400',
        admin: 'text-blue-400/80 hover:text-blue-400',
        divider: 'border-white/5',
        biz: 'text-slate-500',
        copy: 'text-slate-500',
        social: 'bg-white/5 text-slate-400 hover:bg-blue-500 hover:text-white',
      }
    : {
        wrap: 'border-gray-200 bg-white',
        brand: 'text-gray-900',
        lead: 'text-gray-600',
        head: 'text-gray-900',
        link: 'text-gray-500 hover:text-[#03C75A]',
        admin: 'text-[#03C75A]/80 hover:text-[#03C75A]',
        divider: 'border-gray-200',
        biz: 'text-gray-400',
        copy: 'text-gray-400',
        social: 'bg-gray-100 text-gray-500 hover:bg-[#03C75A] hover:text-white',
      }

  return (
    <footer className={`border-t ${t.wrap} px-5 py-12 md:px-8 md:py-16`}>
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 md:flex-row md:gap-16">
        <div className="max-w-md">
          <div className="mb-5 flex items-center gap-3">
            <img
              src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png"
              alt="Chronit"
              className="h-9 w-9"
            />
            <span className={`text-2xl font-black tracking-tight ${t.brand}`}>Chronit</span>
          </div>
          <p className={`text-lg leading-[1.8] font-medium ${t.lead}`}>
            당신의 시간을 아껴주는<br />가장 쉬운 숏폼 도구.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-12 md:w-auto md:gap-16">
          <div className="flex flex-col gap-4">
            <span className={`text-base font-bold ${t.head}`}>커뮤니티</span>
            <Link to="/board"  className={`text-base font-medium transition-colors ${t.link}`}>공지·이벤트</Link>
            <a href="https://cafe.naver.com/chronit" target="_blank" rel="noreferrer" className={`text-base font-medium transition-colors ${t.link}`}>공식 카페</a>
            <Link to="/points" className={`text-base font-medium transition-colors ${t.link}`}>포인트</Link>
            <Link to="/shop"   className={`text-base font-medium transition-colors ${t.link}`}>기프티콘 교환소</Link>
            <Link to="/me"     className={`text-base font-medium transition-colors ${t.link}`}>마이페이지</Link>
          </div>
          <div className="flex flex-col gap-4">
            <span className={`text-base font-bold ${t.head}`}>서비스</span>
            <Link to="/#features" className={`text-base font-medium transition-colors ${t.link}`}>기능</Link>
            <Link to="/#pricing" className={`text-base font-medium transition-colors ${t.link}`}>요금제</Link>
            <Link to="/events" className={`text-base font-medium transition-colors ${t.link}`}>이벤트</Link>
          </div>
          <div className="flex flex-col gap-4">
            <span className={`text-base font-bold ${t.head}`}>회사</span>
            <Link to="/manual" className={`text-base font-medium transition-colors ${t.link}`}>사용 방법</Link>
            <a href="mailto:pv2066pv@gmail.com" className={`text-base font-medium transition-colors ${t.link}`}>문의하기</a>
            {user?.email === 'pv2066pv@gmail.com' && (
              <Link to="/admin" className={`text-base font-medium transition-colors ${t.admin}`}>👑 관리자</Link>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <span className={`text-base font-bold ${t.head}`}>법적고지</span>
            <Link to="/privacy" className={`text-base font-medium transition-colors ${t.link}`}>개인정보처리방침</Link>
            <Link to="/terms" className={`text-base font-medium transition-colors ${t.link}`}>이용약관</Link>
            {/* 환불정책: 약관 제4조(청약철회 및 환불)로 연결. 별도 /refund 페이지 신설 시 교체 */}
            <Link to="/terms" className={`text-base font-medium transition-colors ${t.link}`}>환불정책</Link>
          </div>
        </div>
      </div>

      {/* 사업자정보 (전자상거래법 표기) */}
      <div className={`mx-auto mt-12 max-w-7xl border-t ${t.divider} pt-8 md:pt-10`}>
        <div className={`space-y-1 text-xs leading-relaxed ${t.biz}`}>
          <p>상호: 크로닛(Chronit) &middot; 대표자: 최승호 &middot; 사업자등록번호: 277-20-02625</p>
          <p>주소: 대전광역시 서구 가장로 107, 205동 101호</p>
          <p>
            이메일: pv2066pv@gmail.com &middot; 연락처: 010-4915-3066 &middot;{' '}
            {/* TODO: 통신판매업 신고 완료 후 신고번호로 교체 */}
            통신판매업 신고번호: 신고 진행 중
          </p>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-6 md:flex-row">
          <p className={`text-center text-sm font-medium ${t.copy}`}>
            &copy; 2026 Chronit. All rights reserved.
          </p>
          <div className="flex gap-4">
            <div className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-all ${t.social}`}>
              <Users size={20} />
            </div>
            <div className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-all ${t.social}`}>
              <MessageCircle size={20} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
