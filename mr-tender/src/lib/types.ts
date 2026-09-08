/**
 * Centralized TypeScript type definitions for Mr Tender POS & ERP.
 * 
 * Provides strict type-safety across sales payloads, payments,
 * customer fiscal metadata, warehouse inventory rows, and cash operations.
 */

export interface SaleItemPayload {
  product_id: string
  variant_id?: string | null
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  original_price: number
  discount_percentage: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  subtotal: number
  total: number
  cost_price: number
  warehouse_id: string | null
}

export interface SalePaymentPayload {
  payment_method: string
  amount: number
  received_amount: number
  change_amount: number
  reference: string | null
}

export interface SalePayload {
  tenant_id: string
  seller_id: string
  register_id: string | null
  session_id: string | null
  branch_id: string | null
  customer_id: string | null
  subtotal: number
  discount_amount: number
  tax_amount: number
  tip_amount: number
  total: number
  change_amount: number
  points_redeemed: number
  offline_id: string
  items: SaleItemPayload[]
  payments: SalePaymentPayload[]
}

export interface ProductStockInventoryRow {
  quantity: number | string
  warehouse_id: string | null
}

export interface ProductStockRow {
  id: string
  name: string
  sale_price: number | string
  cost_price: number | string
  sku: string | null
  barcode: string | null
  category_id: string | null
  tax_rate: number | string | null
  image_url: string | null
  categories: { name: string } | { name: string }[] | null
  inventory: ProductStockInventoryRow[] | null
}

export interface PharmacyLotRow {
  current_quantity: number | string | null
  expiration_date: string | null
  status: string | null
}

export interface PharmacyMedicineRow {
  id: string
  tenant_id?: string
  trade_name: string
  generic_name: string
  concentration?: string | null
  pharmaceutical_form?: string | null
  laboratory?: string | null
  invima_registration?: string | null
  unit_price?: number | string | null
  box_price?: number | string | null
  blister_price?: number | string | null
  units_per_box?: number | string | null
  units_per_blister?: number | string | null
  prescription_type?: string | null
  is_controlled?: boolean | null
  requires_prescription?: boolean | null
  pharmacy_lots?: PharmacyLotRow[] | null
}

export interface CustomerMetadata {
  id_type?: '13' | '31' | '22' | '41' | '42' | string
  dv?: string
  person_type?: '1' | '2' | string
  [key: string]: unknown
}

export interface CustomerRow {
  id: string
  full_name: string
  tax_id: string | null
  tax_name: string | null
  tax_regime: string | null
  tax_address: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  credit_limit: number | string | null
  credit_used: number | string | null
  total_purchases: number | string | null
  total_orders: number | string | null
  metadata?: CustomerMetadata | null
}

export interface WarehouseRow {
  id: string
  name: string
  code: string | null
  is_main: boolean
  is_active: boolean
}

export interface TenantSettingsRow {
  id?: string
  tenant_id?: string
  tax_id?: string | null
  business_name?: string | null
  email?: string | null
  whatsapp?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  tax_rate?: number | string | null
  dian_environment?: string | null
  dian_regimen?: string | null
  dian_resolution?: string | null
  dian_prefix?: string | null
  dian_from?: number | string | null
  dian_to?: number | string | null
  dian_technical_key?: string | null
  [key: string]: unknown
}

export interface AbonoResponsePayload {
  success: boolean
  abono_id?: string
  credit_id?: string
  new_balance?: number
  message?: string
  error?: string
}

export interface OfflineSaleQueueItem {
  offline_id?: string
  payload: SalePayload
  created_at: string
}
