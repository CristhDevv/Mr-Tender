import { calculateCUDS, generateSupportDocQRCode } from './support-doc-cuds'
import { calculateNITVerificationDigit, formatDianAmount } from './cufe'

export interface SupportDocUblData {
  consecutive: string
  issueDate: string
  issueTime: string
  description: string
  subtotal: number
  retefuentePercent: number
  retefuenteAmount: number
  reteicaPercent: number
  reteicaAmount: number
  total: number

  // Buyer (Company)
  companyNit: string
  companyName: string
  companyDv?: string

  // Non-obligated Supplier (Natural person)
  supplierName: string
  supplierDocType: string
  supplierDocNumber: string
  supplierEmail?: string
  supplierPhone?: string

  // Technical
  softwarePin: string
  environment: '1' | '2'
}

export function buildSupportDocUBLXML(data: SupportDocUblData): { xml: string; cuds: string; qrCode: string } {
  const { cuds } = calculateCUDS({
    numDoc: data.consecutive,
    fecDoc: data.issueDate,
    horDoc: data.issueTime,
    valBruto: data.subtotal,
    valRetFuente: data.retefuenteAmount,
    valRetIca: data.reteicaAmount,
    valTotal: data.total,
    nitAdquiriente: data.companyNit,
    docProveedor: data.supplierDocNumber,
    pinSoftware: data.softwarePin,
    tipoAmbiente: data.environment
  })

  const qrCode = generateSupportDocQRCode({
    numDoc: data.consecutive,
    fecDoc: data.issueDate,
    horDoc: data.issueTime,
    nitAdquiriente: data.companyNit,
    docProveedor: data.supplierDocNumber,
    valTotal: data.total,
    cuds,
    tipoAmbiente: data.environment
  })

  const companyDv = data.companyDv || calculateNITVerificationDigit(data.companyNit)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>05</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: Documento Soporte en adquisiciones efectuadas a no obligados a facturar</cbc:ProfileID>
  <cbc:ID>${data.consecutive}</cbc:ID>
  <cbc:UUID schemeID="${data.environment}" schemeName="CUDS-SHA384">${cuds}</cbc:UUID>
  <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${data.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>05</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyID="195" schemeName="${data.supplierDocType}">${data.supplierDocNumber}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${data.supplierName}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:CityName>Bogotá</cbc:CityName>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyID="195" schemeName="NIT">${data.companyNit}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${data.companyName}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${data.companyName}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${companyDv}" schemeName="31">${data.companyNit}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${formatDianAmount(data.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${formatDianAmount(data.subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${formatDianAmount(data.subtotal)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${formatDianAmount(data.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">1.00</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${formatDianAmount(data.subtotal)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${data.description}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${formatDianAmount(data.subtotal)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`

  return { xml, cuds, qrCode }
}
