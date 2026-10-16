import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(() => {
  const server = {
    proxy: {
      // Запросы с фронта на /api уходят на бэкенд тем же origin, без CORS.
      // В Docker localhost — это сам контейнер фронта, поэтому цель задаётся
      // переменной API_PROXY_TARGET (host.docker.internal:5080).
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  }

  // В Docker Desktop события файловой системы с bind-mount часто не доходят.
  // Локальный `npm run dev` эту переменную не задаёт, порт остаётся 5173.
  if (process.env.CHOKIDAR_USEPOLLING === 'true') {
    server.watch = { usePolling: true }
  }

  return {
    plugins: [react(), tailwindcss()],
    server,
  }
})
