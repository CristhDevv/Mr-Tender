'use client'
import React, { useState } from 'react'
import {
  Download,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  FileJson,
  FileSpreadsheet,
  ShieldCheck,
  HardDrive
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ContingencyBackupModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  businessName?: string
}

export default function ContingencyBackupModal({
  isOpen,
  onClose,
  tenantId,
  businessName = 'MI_NEGOCIO'
}: ContingencyBackupModalProps) {
  const supabase = createClient()
  const [downloading, setDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  if (!isOpen) return null

  const handleDownloadBackup = async (format: 'json' | 'csv') => {
    if (!tenantId) {
      alert('Identificador de negocio no encontrado.')
      return
    }

    setDownloading(true)
    try {
      // Fetch core tenant tables
      const [prodsRes, invRes, catsRes, custsRes, salesRes, settRes] = await Promise.all([
        supabase.from('products').select('*').eq('tenant_id', tenantId),
        supabase.from('inventory').select('*').eq('tenant_id', tenantId),
        supabase.from('categories').select('*').eq('tenant_id', tenantId),
        supabase.from('customers').select('*').eq('tenant_id', tenantId),
        supabase.from('sales').select('*').eq('tenant_id', tenantId).limit(500),
        supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId)
      ])

      const backupData = {
        meta: {
          app: 'Mr Tender POS',
          version: '2.0-eleventa-sync',
          export_date: new Date().toISOString(),
          tenant_id: tenantId,
          business_name: businessName
        },
        products: prodsRes.data || [],
        inventory: invRes.data || [],
        categories: catsRes.data || [],
        customers: custsRes.data || [],
        recent_sales: salesRes.data || [],
        settings: settRes.data || []
      }

      const timestamp = new Date().toISOString().slice(0, 10)
      const cleanName = businessName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const filename = `mr_tender_backup_${cleanName}_${timestamp}.json`

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), 3000)
    } catch (err: any) {
      alert('Error al generar respaldo: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="neu-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-card, #ffffff)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, rgba(0,0,0,0.1))'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Database size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Respaldo Local de Contingencia
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Descarga una copia completa de tu catálogo, inventario y ventas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'rgba(2,132,199,0.06)', border: '1px solid rgba(2,132,199,0.2)', padding: 14, borderRadius: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <HardDrive size={20} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              <strong>Tranquilidad y seguridad para tu negocio:</strong> Al igual que en Eleventa, puedes descargar en cualquier momento un archivo seguro de respaldo para guardar en una memoria USB o disco externo.
            </div>
          </div>
        </div>

        {downloadSuccess && (
          <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', padding: 12, borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-green)' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>¡Respaldo descargado exitosamente en tu equipo!</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <button
            onClick={() => handleDownloadBackup('json')}
            disabled={downloading}
            className="btn-neu btn-primary"
            style={{ padding: '14px', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12 }}
          >
            <FileJson size={20} />
            <span>{downloading ? 'Generando archivo de respaldo...' : 'Descargar Respaldo Completo (.JSON)'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-neu" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
