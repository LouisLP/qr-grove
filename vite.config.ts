import { svelte } from '@sveltejs/vite-plugin-svelte'
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

// base is /qr-grove/ in production for GitHub Pages project-site hosting
export default defineConfig(({ command }) => ({
  base: command === 'build'
    ? '/qr-grove/'
    : '/',
  plugins: [
    svelte(),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
