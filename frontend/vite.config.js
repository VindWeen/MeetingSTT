import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/MeetingSTT/',  // ← đổi thành tên repo GitHub của bạn, ví dụ: '/MeetingSTT/'
})
