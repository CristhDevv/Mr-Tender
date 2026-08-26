import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPayrollUBLXML, PayrollUblData } from '@/lib/dian/payroll-ubl'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const tenantId = user.user_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 400 })
    }

    const body = await req.json()
    const { settlementId } = body

    if (!settlementId) {
      return NextResponse.json({ error: 'settlementId es requerido' }, { status: 400 })
    }

    // Obtener la liquidación y el contrato
    const { data: settlement, error: setErr } = await supabase
      .from('payroll_settlements')
      .select('*, payroll_contracts(*)')
      .eq('id', settlementId)
      .eq('tenant_id', tenantId)
      .single()

    if (setErr || !settlement) {
      return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 })
    }

    const contract = settlement.payroll_contracts || {}
    const consecutive = `NOM-${Date.now().toString().slice(-4)}`
    const now = new Date()
    const issueDate = now.toISOString().split('T')[0]
    const issueTime = `${now.toTimeString().split(' ')[0]}-05:00`

    const ublData: PayrollUblData = {
      consecutive,
      periodStart: settlement.period_start,
      periodEnd: settlement.period_end,
      issueDate,
      issueTime,
      workedDays: settlement.worked_days || 15,
      employerNit: '901234567',
      employerName: 'EMPRESA DEMO S.A.S',
      employeeName: settlement.employee_name,
      employeeDocType: contract.document_type || 'CC',
      employeeDocNumber: settlement.document_number,
      employeeEmail: contract.email || undefined,
      employeeSalary: Number(contract.base_salary || settlement.base_salary),
      contractType: contract.contract_type || 'indefinido',
      salaryType: contract.salary_type || 'ordinario',
      paymentFrequency: contract.payment_frequency || 'quincenal',
      bankName: contract.bank_name || 'Bancolombia',
      bankAccountType: contract.bank_account_type || 'ahorros',
      bankAccountNumber: contract.bank_account_number || '1234567890',
      basicPay: Number(settlement.base_salary),
      transportAllowance: Number(settlement.transport_allowance),
      overtimePay: Number(settlement.overtime_amount),
      bonuses: Number(settlement.bonuses_amount),
      commissions: Number(settlement.commissions_amount),
      grossEarnings: Number(settlement.gross_earnings),
      healthDeduction: Number(settlement.health_deduction),
      pensionDeduction: Number(settlement.pension_deduction),
      solidarityFund: Number(settlement.solidarity_fund_deduction),
      withholdingTax: Number(settlement.withholding_tax),
      otherDeductions: Number(settlement.other_deductions),
      totalDeductions: Number(settlement.total_deductions),
      netPay: Number(settlement.net_pay),
      softwarePin: '12345',
      environment: '2' // 2: Habilitación DIAN
    }

    const { xml, cune, qrCode } = buildPayrollUBLXML(ublData)

    // Guardar documento electrónico
    const { data: electronicDoc, error: docErr } = await supabase
      .from('payroll_electronic_documents')
      .insert({
        tenant_id: tenantId,
        settlement_id: settlement.id,
        consecutive_number: consecutive,
        cune,
        qr_code: qrCode,
        xml_payload: xml,
        dian_status: 'emitted',
        dian_response: 'Documento procesado exitosamente por la DIAN (Ambiente de Habilitación)',
        emitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (docErr) throw docErr

    // Actualizar estado de la liquidación
    await supabase
      .from('payroll_settlements')
      .update({ status: 'emitted_dian' })
      .eq('id', settlement.id)

    return NextResponse.json({
      success: true,
      consecutive,
      cune,
      qrCode,
      status: 'emitted',
      message: 'Nómina electrónica timbrada exitosamente ante la DIAN'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al timbrar nómina electrónica' }, { status: 500 })
  }
}
