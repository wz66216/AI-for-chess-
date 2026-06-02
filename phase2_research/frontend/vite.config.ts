import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appBase = env.VITE_APP_BASE || '/'
  const normalizedBase = appBase.endsWith('/') ? appBase : `${appBase}/`

  return {
    base: normalizedBase,
    plugins: [react()],
  }
})
