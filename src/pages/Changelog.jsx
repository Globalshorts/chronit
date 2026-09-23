import CommunityHeader from '../components/CommunityHeader'
import Footer from '../components/Footer'
import notes from '../data/releaseNotes.json'
import { Sparkles } from 'lucide-react'

export default function Changelog() {
  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      <CommunityHeader />
      <section className="px-5 pt-28 pb-20 md:px-8 md:pt-36">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#0064FF]/25 bg-[#0064FF]/10 px-4 py-1.5 text-sm font-bold text-[#5AA0FF]"><Sparkles size={14} /> 업데이트 소식</div>
            <h1 className="text-3xl font-bold md:text-4xl">크로닛은 계속 자라고 있어요</h1>
            <p className="mt-3 text-white/45">중요한 업데이트를 여기에 기록해요.</p>
          </div>
          <div className="space-y-5">
            {notes.map((n) => (
              <div key={n.version} className="rounded-2xl glass p-6">
                <div className="text-xs font-medium text-white/40">{n.date}</div>
                <h2 className="mt-1 text-xl font-bold text-white">{n.title}</h2>
                <ul className="mt-3 space-y-2">
                  {n.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed text-white/80"><Sparkles size={15} className="mt-0.5 shrink-0 text-[#5AA0FF]" />{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
