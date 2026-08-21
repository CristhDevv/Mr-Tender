import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Droguería & Farmacia | Mr Tender',
  description: 'Módulo farmacéutico con control de lotes FEFO, INVIMA, termohigrometría y genéricos.'
}

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
