/**
 * Mr. Tender - Resiliencia Offline (IndexedDB POS Manager)
 * Permite operar el punto de venta sin conexión a Internet y sincronizar automáticamente
 * cuando la red se restablece.
 */

const DB_NAME = 'mr_tender_offline_db'
const DB_VERSION = 1

export interface OfflineSale {
  id: string
  tenant_id: string
  warehouse_id?: string | null
  customer_id?: string | null
  customer_name?: string
  total_amount: number
  payment_method: string
  lines: {
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
    tax_rate?: number
  }[]
  created_at: string
  synced: boolean
  sync_error?: string | null
}

export interface OfflineProduct {
  id: string
  tenant_id: string
  name: string
  sku: string
  barcode?: string | null
  price: number
  cost: number
  stock: number
  tax_rate: number
  category_id?: string | null
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está disponible en este entorno'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Store: offline_sales
      if (!db.objectStoreNames.contains('offline_sales')) {
        const salesStore = db.createObjectStore('offline_sales', { keyPath: 'id' })
        salesStore.createIndex('synced', 'synced', { unique: false })
        salesStore.createIndex('created_at', 'created_at', { unique: false })
      }

      // Store: offline_products (Catálogo en caché)
      if (!db.objectStoreNames.contains('offline_products')) {
        const prodStore = db.createObjectStore('offline_products', { keyPath: 'id' })
        prodStore.createIndex('barcode', 'barcode', { unique: false })
        prodStore.createIndex('sku', 'sku', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Guarda una venta offline cuando no hay conexión a internet
 */
export async function saveOfflineSale(sale: Omit<OfflineSale, 'id' | 'created_at' | 'synced'>): Promise<OfflineSale> {
  const db = await openDB()
  const fullSale: OfflineSale = {
    ...sale,
    id: 'off_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    created_at: new Date().toISOString(),
    synced: false
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite')
    const store = tx.objectStore('offline_sales')
    const req = store.add(fullSale)

    req.onsuccess = () => resolve(fullSale)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Obtiene todas las ventas pendientes de sincronización
 */
export async function getPendingOfflineSales(): Promise<OfflineSale[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readonly')
    const store = tx.objectStore('offline_sales')
    const req = store.getAll()

    req.onsuccess = () => {
      const all: OfflineSale[] = req.result || []
      resolve(all.filter(s => !s.synced))
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Marca una venta offline como sincronizada con éxito
 */
export async function markSaleSynced(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite')
    const store = tx.objectStore('offline_sales')
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const item: OfflineSale = getReq.result
      if (item) {
        item.synced = true
        store.put(item)
      }
      resolve()
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

/**
 * Guarda o actualiza productos en la caché local para venta sin conexión
 */
export async function cacheOfflineProducts(products: OfflineProduct[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_products', 'readwrite')
    const store = tx.objectStore('offline_products')

    products.forEach(p => store.put(p))

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Obtiene el catálogo de productos almacenado localmente
 */
export async function getOfflineProducts(): Promise<OfflineProduct[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_products', 'readonly')
    const store = tx.objectStore('offline_products')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}
