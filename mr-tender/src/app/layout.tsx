import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Mr Tender — ERP para tu negocio', template: '%s | Mr Tender' },
  description: 'Plataforma ERP cloud-native para gestionar tu negocio desde el celular. POS, inventario, clientes, finanzas y más en un solo toque.',
  keywords: ['ERP', 'punto de venta', 'POS', 'inventario', 'negocios', 'SaaS'],
  authors: [{ name: 'Mr Tender' }],
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Mr Tender',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
