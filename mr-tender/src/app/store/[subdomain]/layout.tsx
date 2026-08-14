export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#F4F6F8', minHeight: '100vh' }}>
      {children}
    </div>
  )
}
