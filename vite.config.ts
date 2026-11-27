import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
      // Serves the Scene 5 kissing MP3 (whose filename includes `#` and emojis,
      // which Vite's default static middleware strips as URL fragments) at a
      // clean URL-safe route `/origin-kiss-track.mp3` with HTTP Range support
      // in dev and copies it into `dist/origin-kiss-track.mp3` on build.
      {
        name: 'serve-origin-kiss-audio',
        configureServer(server) {
          const sourceFile = path.resolve(
            __dirname,
            'public',
            'In The Night No Control 🖤🔥  Song Lyrics Status #shorts_ #lyrics_.mp3',
          );
          server.middlewares.use((req, res, next) => {
            const urlPath = (req.url || '').split('?')[0];
            if (urlPath !== '/origin-kiss-track.mp3') {
              return next();
            }
            if (!fs.existsSync(sourceFile)) {
              res.statusCode = 404;
              res.end('Not found');
              return;
            }
            const stat = fs.statSync(sourceFile);
            const totalSize = stat.size;
            const range = req.headers.range;

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'no-cache');

            if (req.method === 'HEAD') {
              res.setHeader('Content-Length', totalSize);
              res.statusCode = 200;
              res.end();
              return;
            }

            if (range) {
              const match = /^bytes=(\d*)-(\d*)$/.exec(range);
              if (match) {
                const start = match[1] ? parseInt(match[1], 10) : 0;
                const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
                if (start < totalSize && end < totalSize && start <= end) {
                  res.statusCode = 206;
                  res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
                  res.setHeader('Content-Length', end - start + 1);
                  fs.createReadStream(sourceFile, {start, end}).pipe(res);
                  return;
                }
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Length', totalSize);
            fs.createReadStream(sourceFile).pipe(res);
          });
        },
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const sourceFile = path.resolve(
            __dirname,
            'public',
            'In The Night No Control 🖤🔥  Song Lyrics Status #shorts_ #lyrics_.mp3',
          );
          const distDir = path.resolve(__dirname, 'dist');
          const targetFile = path.resolve(distDir, 'origin-kiss-track.mp3');
          if (fs.existsSync(distDir) && fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, targetFile);
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string): string | undefined {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (
              id.includes('/node_modules/firebase/') ||
              id.includes('/node_modules/@firebase/')
            ) {
              return 'vendor-firebase';
            }
            if (
              id.includes('/node_modules/motion/') ||
              id.includes('/node_modules/framer-motion/')
            ) {
              return 'vendor-motion';
            }
            if (id.includes('/node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
