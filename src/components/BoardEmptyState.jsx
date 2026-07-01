import { Link } from 'react-router-dom'
import { PenLine } from 'lucide-react'

// 게시판은 운영자 공지 전용 — 빈 화면은 일반 회원에겐 안내만, 운영자에겐 작성 버튼.
export default function BoardEmptyState({ isAdmin = false }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-slate-400">아직 등록된 공지가 없어요</p>
      {isAdmin && (
        <Link
          to="/board/write"
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#0052D6] active:scale-95"
        >
          <PenLine size={16} /> 공지 작성
        </Link>
      )}
    </div>
  )
}
