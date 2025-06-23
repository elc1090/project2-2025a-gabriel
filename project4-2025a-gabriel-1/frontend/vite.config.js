import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/project4-2025a-gabriel-1/',
  build: {
    outDir: '../docs'
	}
})
