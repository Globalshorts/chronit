import { useEffect, useState } from 'react'
import { X, Download, Share, Plus, ExternalLink, Copy, Check } from 'lucide-react'

export default function PwaInstall() {
  const [open, setOpen] = useState(false)
  const [bip, setBip] = useState(typeof window !== 'undefined' ? window.__bip : null)
  const [copied, setCopied] = useState(false)

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isInApp = /Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|KAKAOTALK|Line\/|Daum|DaumApps|; wv\)/i.test(ua)
  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone)

  useEffect(() => {
    const onBip = (e) => { e.preventDefault(); window.__bip = e; setBip(e) }
    const onOpen = () => { if (!isStandalone) setOpen(true) }
    const onInstalled = () => { setOpen(false); window.__bip = null; setBip(null) }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('chronit:open-install', onOpen)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('chronit:open-install', onOpen)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [isStandalone])

  const androidInstall = async () => {
    const p = bip || window.__bip
    if (!p) return
    try { p.prompt(); await p.userChoice } catch {}
    window.__bip = null; setBip(null); setOpen(false)
  }
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.origin); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  const openChrome = () => {
    const url = window.location.host + window.location.pathname
    window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`
  }

  if (!open) return null
  const hasPrompt = !!(bip || (typeof window !== 'undefined' && window.__bip))

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0" onClick={() => setOpen(false)}>
      <div className="relative w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setOpen(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><X size={20} /></button>
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#03C75A]/10 text-[#03C75A]"><Download size={26} /></div>
          <h3 className="text-lg font-black text-gray-900">홈 화면에 추가하고 앱처럼 쓰기</h3>
          <p className="mt-1.5 text-sm text-gray-500">아이콘 한 번으로 바로 들어와요. (설치·앱스토어 불필요)</p>
        </div>

        {isInApp ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">인앱 브라우저에선 추가가 안 돼요. <b>크롬/사파리</b>에서 열어주세요.</div>
            <div className="flex gap-2">
              {isAndroid && <button onClick={openChrome} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#03C75A] px-3 py-3 text-sm font-bold text-white active:scale-95"><ExternalLink size={15} /> Chrome에서 열기</button>}
              <button onClick={copyLink} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-3 text-sm font-bold text-gray-700 active:scale-95">{copied ? (<><Check size={15} /> 복사됨</>) : (<><Copy size={15} /> 주소 복사</>)}</button>
            </div>
          </div>
        ) : hasPrompt ? (
          <button onClick={androidInstall} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#03C75A] px-4 py-3.5 font-bold text-white active:scale-[0.98]"><Download size={18} /> 홈 화면에 추가</button>
        ) : isIOS ? (
          <ol className="space-y-3.5 text-sm text-gray-700">
            <li className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-black text-white">1</span> 하단 <Share size={16} className="inline" /> <b>공유</b> 버튼을 누르세요</li>
            <li className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-black text-white">2</span> <b>'홈 화면에 추가'</b> <Plus size={15} className="inline" /> 를 선택하세요</li>
            <li className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-black text-white">3</span> 우측 상단 <b>'추가'</b>를 누르면 끝!</li>
          </ol>
        ) : (
          <p className="text-center text-sm text-gray-600">브라우저 메뉴(⋮)에서 <b>'앱 설치'</b> 또는 <b>'홈 화면에 추가'</b>를 눌러주세요.</p>
        )}
      </div>
    </div>
  )
}
