import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const reactPackages = /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/
const firebaseBase = /[\\/]node_modules[\\/](@firebase[\\/](app|util|component|logger)|firebase[\\/]app|idb)[\\/]/

/** Páginas públicas que se anuncian a los buscadores. */
const publicPages = ['/', '/conocenos', '/estudiantes', '/calendario', '/documentos', '/contactanos']

/**
 * Dirección pública del sitio (VITE_SITE_URL) en index.html, más robots.txt y
 * sitemap.xml generados al compilar. Mientras no haya dominio propio se usa el
 * de Firebase Hosting.
 */
function siteMeta(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '')
  return {
    name: 'site-meta',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', base),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: [
        'User-agent: *',
        'Allow: /',
        // Áreas privadas: no tienen nada que indexar.
        'Disallow: /panel',
        'Disallow: /docente',
        'Disallow: /iniciar-sesion',
        '',
        `Sitemap: ${base}/sitemap.xml`,
        '',
      ].join('\n') })
      const today = new Date().toISOString().slice(0, 10)
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...publicPages.map((page) => `  <url><loc>${base}${page === '/' ? '/' : page}</loc><lastmod>${today}</lastmod></url>`),
        '</urlset>',
        '',
      ].join('\n') })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), siteMeta(env.VITE_SITE_URL || 'https://portal-escolar-hugo-pineda.web.app')],
    resolve: { alias: { '@': '/src' } },
    build: {
      // El SDK completo de Firestore solo lo descarga el panel.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Paquetes estables en archivos propios para que el navegador los conserve entre versiones.
          // Lo demás lo divide Vite según lo que use cada ruta (el panel no se descarga en el sitio público).
          manualChunks(id) {
            const path = id.replace(/\\/g, '/')
            if (reactPackages.test(path)) return 'react'
            if (path.includes('/node_modules/@firebase/firestore/dist/lite/') || path.includes('/node_modules/firebase/firestore/lite/')) return 'firebase-firestore-lite'
            if (path.includes('/node_modules/@firebase/firestore/') || path.includes('/node_modules/firebase/firestore/')) return 'firebase-firestore'
            if (path.includes('/node_modules/@firebase/auth/') || path.includes('/node_modules/firebase/auth/')) return 'firebase-auth'
            if (firebaseBase.test(path)) return 'firebase-app'
          },
        },
      },
    },
  }
})
