import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  themeColor: '#4A90E2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: { default: 'Mr Tender — ERP & POS para tu negocio 🇨🇴', template: '%s | Mr Tender' },
  description: 'Punto de venta y control de inventario para tiendas de barrio, micromercados y pequeños negocios en Colombia.',
  keywords: ['ERP', 'punto de venta', 'POS', 'inventario', 'tienda de barrio', 'Colombia'],
  authors: [{ name: 'Mr Tender' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'Mr Tender',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW reg error:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
