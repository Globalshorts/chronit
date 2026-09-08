import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

// 마크다운 렌더러 래퍼 — 이 파일을 동적 import(lazy)하면 react-markdown+플러그인 전체가 별도 청크로 분리됨(홈 엔트리 제외)
export default function Md({ children, components, raw = false }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={raw ? [rehypeRaw] : []}
      components={components}
    >
      {children || ''}
    </ReactMarkdown>
  )
}
