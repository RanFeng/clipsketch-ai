// EdgeOne Pages 配置文件
export default {
  // 路由配置
  routes: [
    // 代理路由 - 必须在静态资源前面
    {
      pattern: '/api/proxy*',
      function: 'proxy'
    },
    // 其他所有请求返回 index.html (SPA)
    {
      pattern: '/*',
      function: 'index'
    }
  ]
};
