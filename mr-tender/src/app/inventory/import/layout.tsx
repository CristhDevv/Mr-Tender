import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Importador Masivo Excel / CSV | Mr. Tender',
  description: 'Carga masiva de productos, inventario inicial y clientes'
}

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ width: '100%' }}>{children}</div>
}
