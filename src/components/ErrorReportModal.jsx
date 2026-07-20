import { useEffect, useState } from 'react'
import { registerErrorModal, setModalOpen, sendErrorReport } from '../lib/errorReport'

// 오류 발생 시 뜨는 팝업. 사용자가 '리포트 보내기'를 눌러야 전송(동의).
export default function ErrorReportModal() {
  const [payload, setPayload] = useState(null)
  const [memo, setMemo] = useState('')
  const [state, setState] = useState('idle') // idle | sending | sent | err
  const [detail, setDetail] = useState(false)

  useEffect(() => {
    registerErrorModal((p) => { setPayload(p); setMemo(''); setState('idle'); setDetail(false); setModalOpen(true) })
  }, [])

  if (!payload) return null
  const close = () => { setModalOpen(false); setPayload(null) }
  const send = async () => {
    setState('sending')
    try {
      const { error } = await sendErrorReport(payload, memo)
      if (error) { setState('err') } else { setState('sent'); setTimeout(close, 1500) }
    } catch { setState('err') }
  }

  const label = { video_gen: '영상 생성 중 오류', react: '화면 오류', promise: '처리 중 오류', runtime: '오류' }[payload.source] || '오류'

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif" }}>
        {state === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ fontSize: 34 }}>✅</p>
            <p style={{ fontWeight: 800, fontSize: 16 }}>리포트를 보냈어요. 감사합니다!</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 30, textAlign: 'center', margin: 0 }}>⚠️</p>
            <h2 style={{ fontSize: 18, fontWeight: 900, textAlign: 'center', margin: '6px 0 4px' }}>{label}가 발생했어요</h2>
            <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', margin: '0 0 14px', lineHeight: 1.6 }}>
              불편을 드려 죄송해요. 리포트를 보내주시면 문제를 빠르게 고칠 수 있어요.
            </p>
            <textarea
              value={memo} onChange={(e) => setMemo(e.target.value)}
              placeholder="무슨 작업 중이었는지 알려주시면 큰 도움이 돼요 (선택)"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: 12, border: '1px solid #E5E7EB', padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none' }}
            />
            <button onClick={() => setDetail(v => !v)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, padding: '6px 0', cursor: 'pointer' }}>
              {detail ? '오류 상세 숨기기' : '오류 상세 보기'}
            </button>
            {detail && (
              <pre style={{ background: '#F9FAFB', borderRadius: 8, padding: 10, fontSize: 11, color: '#6B7280', maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap', margin: '0 0 8px' }}>
                {payload.message}{payload.stack ? '\n\n' + payload.stack.slice(0, 600) : ''}
              </pre>
            )}
            {state === 'err' && <p style={{ color: '#DC2626', fontSize: 12, textAlign: 'center', margin: '4px 0' }}>전송에 실패했어요. 잠시 후 다시 시도해 주세요.</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={close} style={{ flex: 1, borderRadius: 12, padding: '12px', fontWeight: 800, fontSize: 14, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>닫기</button>
              <button onClick={send} disabled={state === 'sending'} style={{ flex: 2, borderRadius: 12, padding: '12px', fontWeight: 800, fontSize: 14, border: 'none', background: '#0064FF', color: '#fff', cursor: 'pointer', opacity: state === 'sending' ? 0.6 : 1 }}>
                {state === 'sending' ? '보내는 중…' : '리포트 보내기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
