import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/cloud-budgetter/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5380,
    strictPort: true,
  },
})
