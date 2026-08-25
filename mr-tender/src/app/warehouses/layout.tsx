import AdminLayout from '../dashboard/layout'

export const metadata = {
  title: 'Bodegas & Almacenes - Mr Tender',
  description: 'Control multi-bodega, existencias físicas, transferencias y exportaciones de stock'
}

export default function WarehousesLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
