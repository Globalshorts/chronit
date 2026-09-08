import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        // 아이콘(lucide)만 한 청크로 묶어 다수의 소청크 워터폴 제거. 나머지는 Rollup 기본.
        manualChunks(id) {
          if (id.includes('node_modules') && id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
})
