import { calculateCUNE, generatePayrollQRCode } from './payroll-cune'
import { calculateNITVerificationDigit, formatDianAmount } from './cufe'

export interface PayrollUblData {
  consecutive: string
  periodStart: string
  periodEnd: string
  issueDate: string
  issueTime: string
  workedDays: number
  
  // Employer
  employerNit: string
  employerName: string
  employerDv?: string
  
  // Employee
  employeeName: string
  employeeDocType: string
  employeeDocNumber: string
  employeeEmail?: string
  employeeSalary: number
  contractType: string
  salaryType: string
  paymentFrequency: string
  bankName?: string
  bankAccountType?: string
  bankAccountNumber?: string

  // Earnings
  basicPay: number
  transportAllowance: number
  overtimePay: number
  bonuses: number
  commissions: number
  grossEarnings: number

  // Deductions
  healthDeduction: number
  pensionDeduction: number
  solidarityFund: number
  withholdingTax: number
  otherDeductions: number
  totalDeductions: number

  // Net
  netPay: number

  // Technical
  softwarePin: string
  environment: '1' | '2'
}

export function buildPayrollUBLXML(data: PayrollUblData): { xml: string; cune: string; qrCode: string } {
  const { cune } = calculateCUNE({
    numNom: data.consecutive,
    fecNom: data.issueDate,
    horNom: data.issueTime,
    valDev: data.grossEarnings,
    valDed: data.totalDeductions,
    valTol: data.netPay,
    nitOFE: data.employerNit,
    docEmp: data.employeeDocNumber,
    pinSoftware: data.softwarePin,
    tipoAmbiente: data.environment
  })

  const qrCode = generatePayrollQRCode({
    numNom: data.consecutive,
    fecNom: data.issueDate,
    horNom: data.issueTime,
    nitOFE: data.employerNit,
    docEmp: data.employeeDocNumber,
    valDev: data.grossEarnings,
    valDed: data.totalDeductions,
    valTol: data.netPay,
    cune,
    tipoAmbiente: data.environment
  })

  const employerDv = data.employerDv || calculateNITVerificationDigit(data.employerNit)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual"
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  SchemaLocation="dian:gov:co:facturaelectronica:NominaIndividual NominaIndividualElectronicaXSD.xsd">
  <Novedad CUNENov="">false</Novedad>
  <Periodo FechaIngreso="${data.periodStart}" FechaLiquidacionInicio="${data.periodStart}" FechaLiquidacionFin="${data.periodEnd}" TiempoLaborado="${data.workedDays}.00" FechaGen="${data.issueDate}"/>
  <NumeroSecuenciaXML CodigoTrabajador="${data.employeeDocNumber}" Prefijo="NOM" Consecutivo="${data.consecutive}" Numero="${data.consecutive}"/>
  <LugarGeneracionXML Pais="CO" DepartamentoEstado="11" MunicipioCiudad="11001" Idioma="es"/>
  <InformacionGeneral Version="V1.0: Documento Soporte de Pago de Nomina Electronica" Ambiente="${data.environment}" TipoXML="102" CUNE="${cune}" EncripCUNE="CUNE-SHA384" FechaGen="${data.issueDate}" HoraGen="${data.issueTime}" PeriodoNomina="4" TipoMoneda="COP"/>
  <Empleador RazonSocial="${data.employerName}" NIT="${data.employerNit}" DV="${employerDv}" Pais="CO" DepartamentoEstado="11" MunicipioCiudad="11001" Direccion="Principal"/>
  <Trabajador TipoIdentificacion="${data.employeeDocType === 'CC' ? '13' : '31'}" NumeroDocumento="${data.employeeDocNumber}" PrimerApellido="${data.employeeName.split(' ')[1] || 'Empleado'}" PrimerNombre="${data.employeeName.split(' ')[0] || data.employeeName}" LugarTrabajoPais="CO" TipoContrato="${data.contractType === 'indefinido' ? '1' : '2'}" Sueldo="${formatDianAmount(data.employeeSalary)}"/>
  <Pago Forma="1" Metodo="${data.bankAccountNumber ? '47' : '10'}" Banco="${data.bankName || 'Bancolombia'}" TipoCuenta="${data.bankAccountType || 'Ahorros'}" NumeroCuenta="${data.bankAccountNumber || '0000'}"/>
  <FechasPagos>
    <FechaPago>${data.issueDate}</FechaPago>
  </FechasPagos>
  <Devengados>
    <Basico DiasTrabajados="${data.workedDays}" SueldoTrabajado="${formatDianAmount(data.basicPay)}"/>
    ${data.transportAllowance > 0 ? `<Transporte AuxilioTransporte="${formatDianAmount(data.transportAllowance)}"/>` : ''}
    ${data.overtimePay > 0 ? `<HorasExtras Recargo="${formatDianAmount(data.overtimePay)}"/>` : ''}
    ${data.bonuses > 0 ? `<Bonificaciones BonificacionS="${formatDianAmount(data.bonuses)}"/>` : ''}
    ${data.commissions > 0 ? `<Comisiones Comision="${formatDianAmount(data.commissions)}"/>` : ''}
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="${formatDianAmount(data.healthDeduction)}"/>
    <Pension Porcentaje="4.00" Deduccion="${formatDianAmount(data.pensionDeduction)}"/>
    ${data.solidarityFund > 0 ? `<FondoSP Deduccion="${formatDianAmount(data.solidarityFund)}"/>` : ''}
    ${data.withholdingTax > 0 ? `<RetencionFuente Deduccion="${formatDianAmount(data.withholdingTax)}"/>` : ''}
    ${data.otherDeductions > 0 ? `<OtrasDeducciones Deduccion="${formatDianAmount(data.otherDeductions)}"/>` : ''}
  </Deducciones>
  <DevengadosTotal>${formatDianAmount(data.grossEarnings)}</DevengadosTotal>
  <DeduccionesTotal>${formatDianAmount(data.totalDeductions)}</DeduccionesTotal>
  <ComprobanteTotal>${formatDianAmount(data.netPay)}</ComprobanteTotal>
</NominaIndividual>`

  return { xml, cune, qrCode }
}
