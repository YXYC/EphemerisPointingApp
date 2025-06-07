import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/

function getAllElectronTsEntries(dir: string, baseDir = dir) {
  let entries: Record<string, string> = {}
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      entries = { ...entries, ...getAllElectronTsEntries(fullPath, baseDir) }
    } else if (file.endsWith('.ts')) {
      const entryName = path.relative(baseDir, fullPath).replace(/\\/g, '/').replace(/\.ts$/, '')
      entries[entryName] = fullPath
    }
  }
  return entries
}

const electronEntries = getAllElectronTsEntries(path.resolve(__dirname, 'electron'))

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        // 主进程入口
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'better-sqlite3'],
              input: {
                ...electronEntries
              },
              output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
              }
            }
          }
        }
      }
    ])
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})
