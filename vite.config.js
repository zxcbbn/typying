import { defineConfig } from 'vite'

// 部署到 GitHub Pages 时把 base 改成 '/<repo-name>/'
export default defineConfig({
  base: './',
  build: { target: 'es2020' }
})
