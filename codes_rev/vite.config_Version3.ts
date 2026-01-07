import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 生产部署时使用相对 base './' 便于在子路径或静态托管上正确加载资源。
export default defineConfig(({ mode }) => {
  return {
    base: './',
    plugins: [react()],
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname),
      },
    },
    // 注意：不要在这里注入密钥到前端（我们将它存放在 EdgeOne 的 env）
  }
})