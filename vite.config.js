import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 앱 CSS 링크를 비차단(preload→stylesheet 스왑)으로 변환 → 첫 페인트가 CSS를 기다리지 않음(흰 화면 제거)
function nonBlockingCss() {
  return {
    name: 'non-blocking-css',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*?)href="(\/assets\/index-[^"]+\.css)"([^>]*)>/g,
        (_m, a, href, b) =>
          `<link rel="preload" as="style"${a}href="${href}"${b} onload="this.onload=null;this.rel='stylesheet'">` +
          `<noscript><link rel="stylesheet"${a}href="${href}"${b}></noscript>`
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), nonBlockingCss()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
})
