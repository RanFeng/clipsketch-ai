import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      // 生产环境 base 路径配置（EdgeOne 部署时重要）
      base: mode === 'production' ? '/' : '/',
      
      server: {
        port: 3000,
        host: '0.0.0.0',
        // CORS 配置用于开发环境
        cors: true,
      },
      
      plugins: [react()],
      
      build: {
        // 确保输出到标准 dist 目录
        outDir: 'dist',
        emptyOutDir: true,
        // 优化资源大小
        minify: 'terser',
        // 关闭 sourcemap 以减小生产包大小
        sourcemap: false,
        // 分块策略优化
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor': ['react', 'react-dom'],
              'ui': ['lucide-react'],
            }
          }
        }
      },
      
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.PROXY_URL': JSON.stringify(env.PROXY_URL || '/api/proxy'),
      },
      
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './'),
        }
      }
    };
});
