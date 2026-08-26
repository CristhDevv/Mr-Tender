import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateTenantAccess } from '@/lib/supabase/auth-helpers'
import { buildSupportDocUBLXML, SupportDocUblData } from '@/lib/dian/support-doc-ubl'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    
    const authCheck = validateTenantAccess(user)
    if (!authCheck.ok) {
      return authCheck.response
    }
    const { tenantId } = authCheck.context

    const body = await req.json()
    const {
      supplierName,
      supplierDocType = 'CC',
      supplierDocNumber,
      supplierEmail,
      supplierPhone,
      description,
      subtotal,
      retefuentePercent = 0,
      reteicaPercent = 0
    } = body

    if (!supplierName || !supplierDocNumber || !subtotal || !description) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para el documento soporte' }, { status: 400 })
    }

    const numSubtotal = Number(subtotal)
    const numRetefuente = (numSubtotal * Number(retefuentePercent)) / 100
    const numReteica = (numSubtotal * Number(reteicaPercent)) / 100
    const total = numSubtotal - numRetefuente - numReteica

    const consecutive = `DS-${Date.now().toString().slice(-4)}`
    const now = new Date()
    const issueDate = now.toISOString().split('T')[0]
    const issueTime = `${now.toTimeString().split(' ')[0]}-05:00`

    const ublData: SupportDocUblData = {
      consecutive,
      issueDate,
      issueTime,
      description,
      subtotal: numSubtotal,
      retefuentePercent: Number(retefuentePercent),
      retefuenteAmount: numRetefuente,
      reteicaPercent: Number(reteicaPercent),
      reteicaAmount: numReteica,
      total,
      companyNit: '901234567',
      companyName: 'EMPRESA DEMO S.A.S',
      supplierName,
      supplierDocType,
      supplierDocNumber,
      supplierEmail,
      supplierPhone,
      softwarePin: '12345',
      environment: '2'
    }

    const { xml, cuds, qrCode } = buildSupportDocUBLXML(ublData)

    const { data: supportDoc, error: insertErr } = await supabase
      .from('support_documents')
      .insert({
        tenant_id: tenantId,
        document_number: consecutive,
        supplier_name: supplierName,
        supplier_document_type: supplierDocType,
        supplier_document_number: supplierDocNumber,
        supplier_email: supplierEmail || null,
        supplier_phone: supplierPhone || null,
        issue_date: issueDate,
        description,
        subtotal: numSubtotal,
        retefuente_percent: Number(retefuentePercent),
        retefuente_amount: numRetefuente,
        reteica_percent: Number(reteicaPercent),
        reteica_amount: numReteica,
        total,
        cuds,
        qr_code: qrCode,
        xml_payload: xml,
        dian_status: 'emitted'
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({
      success: true,
      documentNumber: consecutive,
      cuds,
      qrCode,
      status: 'emitted',
      message: 'Documento Soporte Electrónico emitido exitosamente ante la DIAN'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al emitir documento soporte' }, { status: 500 })
  }
}
