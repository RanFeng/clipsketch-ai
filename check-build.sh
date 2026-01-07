#!/bin/bash

# EdgeOne 部署前检查脚本
# 用法: bash check-build.sh

set -e

echo "🔍 ClipSketch AI - EdgeOne 部署检查"
echo "=================================="
echo ""

# 1. 检查依赖
echo "1️⃣  检查依赖..."
if ! npm list tailwindcss > /dev/null 2>&1; then
  echo "   ❌ tailwindcss 未安装"
  exit 1
fi
if ! npm list postcss > /dev/null 2>&1; then
  echo "   ❌ postcss 未安装"
  exit 1
fi
echo "   ✅ 依赖完整"
echo ""

# 2. 检查配置文件
echo "2️⃣  检查配置文件..."
files=(
  "vite.config.ts"
  "tailwind.config.js"
  "postcss.config.cjs"
  "index.css"
  "index.html"
)
for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "   ❌ $file 缺失"
    exit 1
  fi
done
echo "   ✅ 所有配置文件存在"
echo ""

# 3. 检查 CSS 导入
echo "3️⃣  检查 index.tsx CSS 导入..."
if grep -q "import './index.css'" index.tsx; then
  echo "   ✅ CSS 导入正确"
else
  echo "   ❌ index.tsx 缺少 CSS 导入"
  exit 1
fi
echo ""

# 4. 检查代理函数
echo "4️⃣  检查代理函数..."
if [ ! -f "functions/proxy.ts" ]; then
  echo "   ⚠️  functions/proxy.ts 缺失 (可在 EdgeOne 手动部署)"
else
  echo "   ✅ 代理函数存在"
fi
echo ""

# 5. 清理旧构建
echo "5️⃣  清理旧构建..."
rm -rf dist
echo "   ✅ 完成"
echo ""

# 6. 执行构建
echo "6️⃣  构建应用..."
npm run build
echo ""

# 7. 验证构建产物
echo "7️⃣  验证构建产物..."

if [ ! -f "dist/index.html" ]; then
  echo "   ❌ dist/index.html 缺失"
  exit 1
fi

if ! ls dist/assets/*.css > /dev/null 2>&1; then
  echo "   ❌ CSS 文件缺失"
  exit 1
fi

if ! ls dist/assets/*.js > /dev/null 2>&1; then
  echo "   ❌ JavaScript 文件缺失"
  exit 1
fi

echo "   ✅ 构建产物完整"
echo ""

# 8. 检查 HTML 中的资源引用
echo "8️⃣  检查 HTML 资源引用..."
if grep -q "href=\"/assets/" dist/index.html && grep -q "src=\"/assets/" dist/index.html; then
  echo "   ✅ 资源引用正确"
else
  echo "   ⚠️  资源引用可能需要手动检查"
  echo "   内容:"
  grep -E 'href=|src=' dist/index.html | head -5
fi
echo ""

# 9. 显示构建大小
echo "9️⃣  构建大小统计..."
echo "   dist/:"
ls -lh dist/ | awk '{print "     "$9": "$5}'
echo ""
echo "   dist/assets/:"
ls -lh dist/assets/ | awk '{print "     "$9": "$5}'
echo ""

# 10. 最终检查
echo "✅ 所有检查通过！"
echo ""
echo "🚀 后续步骤："
echo "  1. 推送到 GitHub: git push origin main"
echo "  2. 在 EdgeOne Pages 创建部署"
echo "  3. 部署 functions/proxy.ts 到 EdgeOne Workers"
echo "  4. 配置路由: /api/proxy -> proxy worker"
echo "  5. 访问生产 URL 进行最终测试"
echo ""
echo "📝 参考文档: EDGEONE_FIX_STEPS.md"
