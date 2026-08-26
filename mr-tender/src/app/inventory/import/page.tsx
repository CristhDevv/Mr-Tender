'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Package,
  Users,
  Building2,
  Layers,
  FileText
} from 'lucide-react'

interface ParsedProduct {
  name: string
  sku: string
  barcode: string
  category: string
  price: number
  cost: number
  stock: number
  min_stock: number
  product_type: 'simple' | 'combo' | 'raw_material'
  isValid: boolean
  error?: string
}

interface ParsedCustomer {
  doc_type: string
  doc_number: string
  name: string
  phone: string
  email: string
  address: string
  city: string
  isValid: boolean
  error?: string
}

export default function MassImportPage() {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState('')
  const [activeType, setActiveType] = useState<'products' | 'customers'>('products')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([])
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [mainWarehouseId, setMainWarehouseId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.user_metadata?.tenant_id) {
        const tid = data.user.user_metadata.tenant_id
        setTenantId(tid)
        
        // Get main warehouse
        const { data: wh } = await supabase
          .from('warehouses')
          .select('id')
          .eq('tenant_id', tid)
          .eq('is_main', true)
          .single()
        
        if (wh) setMainWarehouseId(wh.id)
      }
    })
  }, [])

  // Download Templates
  function downloadProductTemplate() {
    let csv = String.fromCharCode(0xFEFF)
    csv += 'Nombre,SKU,CodigoBarras,Categoria,PrecioVenta,Costo,StockInicial,StockMinimo,TipoProducto\n'
    csv += 'Pan Frances Familiar,PAN-001,770123456001,Panadería,2500,1200,50,10,simple\n'
    csv += 'Tinto Campesino 7oz,CAF-002,,Bebidas Calientes,1800,600,100,20,simple\n'
    csv += 'Gaseosa Postobon 400ml,GAS-003,770200100200,Bebidas Frias,3500,2200,48,12,simple\n'
    csv += 'Harina de Trigo Extra x 50kg,MAT-004,,Materia Prima,180000,165000,10,2,raw_material\n'

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_productos_mr_tender.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function downloadCustomerTemplate() {
    let csv = String.fromCharCode(0xFEFF)
    csv += 'TipoDoc,NumeroIdentificacion,NombreORazonSocial,Telefono,Email,Direccion,Ciudad\n'
    csv += 'CC,1020304050,CARLOS ALBERTO GOMEZ,3101234567,carlos.gomez@gmail.com,Calle 45 # 12-34,Bogota\n'
    csv += 'NIT,901234567-1,INVERSIONES ANDINAS S.A.S,3209876543,contacto@andinassa.com,Carrera 7 # 100-20,Medellin\n'
    csv += 'CC,52987456,LUCIA MENDOZA,3004567890,lucia.mendoza@hotmail.com,Avenida 6 # 22-10,Cali\n'

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_clientes_mr_tender.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Parse CSV File or Text
  function parseCSVContent(text: string) {
    setCsvText(text)
    setImportSuccess(null)
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length <= 1) return

    // Skip header line
    const dataLines = lines.slice(1)

    if (activeType === 'products') {
      const items: ParsedProduct[] = dataLines.map((line, idx) => {
        const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim())
        const name = cols[0] || ''
        const sku = cols[1] || 'SKU-' + (idx + 1)
        const barcode = cols[2] || ''
        const category = cols[3] || 'General'
        const price = Number(cols[4]) || 0
        const cost = Number(cols[5]) || 0
        const stock = Number(cols[6]) || 0
        const min_stock = Number(cols[7]) || 5
        const product_type = (cols[8] === 'raw_material' || cols[8] === 'combo') ? cols[8] : 'simple'

        const isValid = name.length > 0 && price > 0
        const error = !name ? 'Nombre requerido' : price <= 0 ? 'Precio debe ser > 0' : undefined

        return { name, sku, barcode, category, price, cost, stock, min_stock, product_type, isValid, error }
      })
      setParsedProducts(items)
    } else {
      const items: ParsedCustomer[] = dataLines.map(line => {
        const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim())
        const doc_type = cols[0] || 'CC'
        const doc_number = cols[1] || ''
        const name = cols[2] || ''
        const phone = cols[3] || ''
        const email = cols[4] || ''
        const address = cols[5] || ''
        const city = cols[6] || 'Bogotá'

        const isValid = name.length > 0 && doc_number.length > 0
        const error = !doc_number ? 'Identificación requerida' : !name ? 'Nombre requerido' : undefined

        return { doc_type, doc_number, name, phone, email, address, city, isValid, error }
      })
      setParsedCustomers(items)
    }
  }

  // Handle File Upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = evt => {
      const text = evt.target?.result as string
      if (text) parseCSVContent(text)
    }
    reader.readAsText(file)
  }

  // Execute Import
  async function handleExecuteImport() {
    if (!tenantId || importing) return

    if (activeType === 'products') {
      const validItems = parsedProducts.filter(p => p.isValid)
      if (validItems.length === 0) return alert('No hay productos válidos para importar')

      setImporting(true)
      try {
        let importedCount = 0

        for (const item of validItems) {
          // 1. Insert product
          const { data: prod, error: prodErr } = await supabase
            .from('products')
            .insert({
              tenant_id: tenantId,
              name: item.name,
              sku: item.sku,
              barcode: item.barcode || null,
              sale_price: item.price,
              cost_price: item.cost,
              min_stock: item.min_stock,
              product_type: item.product_type,
              is_active: true
            })
            .select('id')
            .single()

          if (prod && mainWarehouseId && item.stock > 0) {
            // 2. Insert initial inventory
            await supabase
              .from('inventory')
              .insert({
                tenant_id: tenantId,
                product_id: prod.id,
                warehouse_id: mainWarehouseId,
                quantity: item.stock,
                avg_cost: item.cost
              })
          }
          importedCount++
        }

        setImportSuccess('¡Éxito! Se importaron ' + importedCount + ' productos al catálogo.')
        setParsedProducts([])
        setCsvText('')
      } catch (err: any) {
        alert('Error en la importación: ' + err.message)
      } finally {
        setImporting(false)
      }
    } else {
      const validItems = parsedCustomers.filter(c => c.isValid)
      if (validItems.length === 0) return alert('No hay clientes válidos para importar')

      setImporting(true)
      try {
        let importedCount = 0

        for (const item of validItems) {
          await supabase.from('customers').insert({
            tenant_id: tenantId,
            name: item.name,
            document_type: item.doc_type,
            document_number: item.doc_number,
            phone: item.phone || null,
            email: item.email || null,
            address: item.address || null,
            city: item.city || null
          })
          importedCount++
        }

        setImportSuccess('¡Éxito! Se importaron ' + importedCount + ' clientes a la base de datos.')
        setParsedCustomers([])
        setCsvText('')
      } catch (err: any) {
        alert('Error en la importación: ' + err.message)
      } finally {
        setImporting(false)
      }
    }
  }

  const validProductsCount = parsedProducts.filter(p => p.isValid).length
  const validCustomersCount = parsedCustomers.filter(c => c.isValid).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 1100, margin: '0 auto', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/inventory" className="btn-neu btn-ghost" style={{ padding: 8 }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Importador Masivo Excel & CSV
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>
              Carga tu catálogo completo de productos con stock inicial o base de clientes en segundos
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setActiveType('products'); setParsedProducts([]); setParsedCustomers([]); setImportSuccess(null); }}
            className="btn-neu"
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: activeType === 'products' ? 700 : 500,
              background: activeType === 'products' ? 'var(--text-primary)' : 'var(--bg)',
              color: activeType === 'products' ? 'var(--bg)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Package size={15} strokeWidth={2} />
            <span>Productos & Inventario</span>
          </button>

          <button
            onClick={() => { setActiveType('customers'); setParsedProducts([]); setParsedCustomers([]); setImportSuccess(null); }}
            className="btn-neu"
            style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: activeType === 'customers' ? 700 : 500,
              background: activeType === 'customers' ? 'var(--text-primary)' : 'var(--bg)',
              color: activeType === 'customers' ? 'var(--bg)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Users size={15} strokeWidth={2} />
            <span>Clientes & Terceros</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {importSuccess && (
        <div className="neu-card" style={{ padding: 14, background: 'var(--bg-deep)', borderLeft: '4px solid var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} style={{ color: 'var(--text-primary)' }} />
          <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{importSuccess}</strong>
        </div>
      )}

      {/* Step 1: Download Template */}
      <div className="neu-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: '0 0 2px', color: 'var(--text-primary)' }}>
            Paso 1: Descarga la plantilla oficial
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
            Diligencia los datos en Excel o Google Sheets y guárdalo como archivo .CSV separado por comas.
          </p>
        </div>

        <button
          onClick={activeType === 'products' ? downloadProductTemplate : downloadCustomerTemplate}
          className="btn-neu btn-primary"
          style={{ padding: '8px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={15} />
          <span>Descargar Plantilla CSV ({activeType === 'products' ? 'Productos' : 'Clientes'})</span>
        </button>
      </div>

      {/* Step 2: Upload or Paste */}
      <div className="neu-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
          Paso 2: Cargar archivo CSV o pegar contenido
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ border: '2px dashed var(--border-color)', borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Upload size={24} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Seleccionar archivo .CSV</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Haz clic para buscar en tu equipo</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>O pega aquí el texto copiado de Excel:</span>
            <textarea
              className="input-neu"
              rows={4}
              placeholder="Nombre,SKU,CodigoBarras,Categoria,PrecioVenta,Costo,StockInicial..."
              value={csvText}
              onChange={e => parseCSVContent(e.target.value)}
              style={{ fontSize: '0.74rem', width: '100%', fontFamily: 'monospace', resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* Step 3: Preview Table */}
      {activeType === 'products' && parsedProducts.length > 0 && (
        <div className="neu-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Previsualización de Productos ({parsedProducts.length} filas detectadas)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {validProductsCount} listos para importar • {parsedProducts.length - validProductsCount} con observaciones
              </p>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={importing || validProductsCount === 0}
              className="btn-neu btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 800 }}
            >
              {importing ? 'Importando catálogo...' : 'Confirmar e Importar ' + validProductsCount + ' Productos'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Estado</th>
                  <th style={{ padding: '6px 8px' }}>Nombre</th>
                  <th style={{ padding: '6px 8px' }}>SKU</th>
                  <th style={{ padding: '6px 8px' }}>Categoría</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Precio Venta</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Costo</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Stock Inicial</th>
                </tr>
              </thead>
              <tbody>
                {parsedProducts.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: p.isValid ? 'transparent' : 'rgba(255,0,0,0.03)' }}>
                    <td style={{ padding: '6px 8px' }}>
                      {p.isValid ? (
                        <CheckCircle2 size={15} style={{ color: 'var(--text-primary)' }} />
                      ) : (
                        <span title={p.error} style={{ fontSize: '0.68rem', color: 'red', fontWeight: 700 }}>{p.error}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{p.sku}</td>
                    <td style={{ padding: '6px 8px' }}>{p.category}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.price)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatCurrency(p.cost)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3: Customers Preview Table */}
      {activeType === 'customers' && parsedCustomers.length > 0 && (
        <div className="neu-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Previsualización de Clientes ({parsedCustomers.length} filas detectadas)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {validCustomersCount} listos para importar • {parsedCustomers.length - validCustomersCount} con observaciones
              </p>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={importing || validCustomersCount === 0}
              className="btn-neu btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 800 }}
            >
              {importing ? 'Importando clientes...' : 'Confirmar e Importar ' + validCustomersCount + ' Clientes'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Estado</th>
                  <th style={{ padding: '6px 8px' }}>Tipo</th>
                  <th style={{ padding: '6px 8px' }}>Identificación</th>
                  <th style={{ padding: '6px 8px' }}>Nombre / Razón Social</th>
                  <th style={{ padding: '6px 8px' }}>Teléfono</th>
                  <th style={{ padding: '6px 8px' }}>Email</th>
                  <th style={{ padding: '6px 8px' }}>Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {parsedCustomers.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: c.isValid ? 'transparent' : 'rgba(255,0,0,0.03)' }}>
                    <td style={{ padding: '6px 8px' }}>
                      {c.isValid ? (
                        <CheckCircle2 size={15} style={{ color: 'var(--text-primary)' }} />
                      ) : (
                        <span title={c.error} style={{ fontSize: '0.68rem', color: 'red', fontWeight: 700 }}>{c.error}</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>{c.doc_type}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{c.doc_number}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '6px 8px' }}>{c.phone || '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{c.email || '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{c.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
