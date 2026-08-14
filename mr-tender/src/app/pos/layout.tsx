import { Metadata } from 'next'
import POSLayout from '../dashboard/layout'

export const metadata: Metadata = { title: 'Punto de Venta | Mr Tender' }

export default function POSPageLayout({ children }: { children: React.ReactNode }) {
  return <POSLayout>{children}</POSLayout>
}
