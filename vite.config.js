import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Inject a build timestamp into sw.js so the cache name auto-updates on each deploy
function swCacheBust() {
  return {
    name: 'sw-cache-bust',
    generateBundle(_, bundle) {
      // Copy sw.js into the build output with the placeholder replaced
      const fs = require('fs');
      const path = require('path');
      const swSrc = fs.readFileSync(path.resolve(__dirname, 'public/sw.js'), 'utf-8');
      const swOut = swSrc.replace('__BUILD_TIMESTAMP__', Date.now().toString());
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swOut });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swCacheBust()],
  base: '/personal_budget/',
})
