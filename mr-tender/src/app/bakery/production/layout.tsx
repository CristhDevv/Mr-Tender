import AdminLayout from '@/app/dashboard/layout'

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
