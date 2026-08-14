import { Metadata } from 'next'
import POSClient from './pos-client'

export const metadata: Metadata = { title: 'Punto de Venta' }

export default function POSPage() {
  return <POSClient />
}
