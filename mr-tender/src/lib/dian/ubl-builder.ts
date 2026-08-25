import {
  DianInvoicePayload,
  DianCreditNotePayload,
  DianDebitNotePayload
} from './types'
import { calculateCUFE, calculateCUDE, calculateSoftwareSecurityCode, formatDianAmount } from './cufe'
import { buildDianQrString, getDianVerificationUrl } from './qr'

/**
 * Escapa caracteres especiales XML
 */
function escapeXml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Construye el documento XML UBL 2.1 para Factura Electrónica de Venta (Tipo 01)
 * Conforme al Anexo Técnico 1.9 de la DIAN.
 */
export function buildInvoiceUblXml(payload: DianInvoicePayload): { xml: string; cufe: string; qrData: string } {
  const { emisor, adquiriente, resolution, totals, items, paymentMeans } = payload

  // 1. Calcular CUFE
  const ivaTotal = totals.taxBreakdown.iva19.tax + totals.taxBreakdown.iva5.tax + totals.taxBreakdown.iva0.tax
  const incTotal = totals.taxBreakdown.inc.tax

  const { cufe } = calculateCUFE({
    numFac: payload.number,
    fecFac: payload.issueDate,
    horFac: payload.issueTime,
    valFac: totals.taxExclusiveAmount,
    codImp1: '01',
    valImp1: ivaTotal,
    codImp2: '04',
    valImp2: incTotal,
    codImp3: '03',
    valImp3: 0,
    valTot: totals.payableAmount,
    nitOFE: emisor.nit,
    numAdq: adquiriente.id,
    claveTecnica: resolution.technicalKey,
    tipoAmbiente: payload.environment
  })

  // 2. Calcular SoftwareSecurityCode
  const softwareSecurityCode = calculateSoftwareSecurityCode(
    emisor.softwareId || 'dian-soft-001',
    emisor.softwarePin || '12345',
    payload.number
  )

  // 3. Generar datos QR
  const qrData = buildDianQrString({
    numFac: payload.number,
    fecFac: payload.issueDate,
    horFac: payload.issueTime,
    nitFac: emisor.nit,
    docAdq: adquiriente.id,
    valFac: totals.taxExclusiveAmount,
    valIva: ivaTotal,
    valOtroIm: incTotal,
    valTolFac: totals.payableAmount,
    cufe,
    environment: payload.environment
  })

  const verificationUrl = getDianVerificationUrl(cufe, payload.environment)

  // 4. Generar líneas de ítems XML
  const linesXml = items.map((item, idx) => {
    const lineId = idx + 1
    const itemSubtotal = formatDianAmount(item.subtotal)
    const itemTotal = formatDianAmount(item.total)
    const itemPrice = formatDianAmount(item.unitPrice)
    const lineTaxes = item.taxes.map(t => `
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="COP">${formatDianAmount(t.taxAmount)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="COP">${formatDianAmount(t.taxableAmount)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="COP">${formatDianAmount(t.taxAmount)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:Percent>${formatDianAmount(t.taxRate)}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID>${escapeXml(t.taxCode)}</cbc:ID>
              <cbc:Name>${escapeXml(t.taxName)}</cbc:Name>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>`).join('')

    return `
    <cac:InvoiceLine>
      <cbc:ID>${lineId}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${escapeXml(item.unitCode || 'EA')}">${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="COP">${itemSubtotal}</cbc:LineExtensionAmount>
      ${lineTaxes}
      <cac:Item>
        <cbc:Description>${escapeXml(item.name)}</cbc:Description>
        <cac:StandardItemIdentification>
          <cbc:ID schemeID="01" schemeAgencyID="195">${escapeXml(item.sku)}</cbc:ID>
        </cac:StandardItemIdentification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="COP">${itemPrice}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="${escapeXml(item.unitCode || 'EA')}">1</cbc:BaseQuantity>
      </cac:Price>
    </cac:InvoiceLine>`
  }).join('\n')

  // 5. Ensamblar documento UBL 2.1 completo
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceControl>
            <sts:InvoiceAuthorization>${escapeXml(resolution.resolutionNumber)}</sts:InvoiceAuthorization>
            <sts:AuthorizationPeriod>
              <cbc:StartDate>${escapeXml(resolution.validFrom)}</cbc:StartDate>
              <cbc:EndDate>${escapeXml(resolution.validTo)}</cbc:EndDate>
            </sts:AuthorizationPeriod>
            <sts:AuthorizedInvoices>
              <sts:Prefix>${escapeXml(resolution.prefix)}</sts:Prefix>
              <sts:From>${resolution.fromNumber}</sts:From>
              <sts:To>${resolution.toNumber}</sts:To>
            </sts:AuthorizedInvoices>
          </sts:InvoiceControl>
          <sts:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe" listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1">CO</cbc:IdentificationCode>
          </sts:InvoiceSource>
          <sts:SoftwareProvider>
            <sts:ProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="${escapeXml(emisor.dv)}" schemeName="${escapeXml(emisor.idType)}">${escapeXml(emisor.nit)}</sts:ProviderID>
            <sts:SoftwareID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">${escapeXml(emisor.softwareId || 'dian-soft-001')}</sts:SoftwareID>
          </sts:SoftwareProvider>
          <sts:SoftwareSecurityCode schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)">${softwareSecurityCode}</sts:SoftwareSecurityCode>
          <sts:AuthorizationProvider>
            <sts:AuthorizationProviderID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="4" schemeName="31">800197268</sts:AuthorizationProviderID>
          </sts:AuthorizationProvider>
          <sts:QRCode>${verificationUrl}</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>
  <cbc:ProfileExecutionID>${escapeXml(payload.environment)}</cbc:ProfileExecutionID>
  <cbc:ID>${escapeXml(payload.number)}</cbc:ID>
  <cbc:UUID schemeID="${escapeXml(payload.environment)}" schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${escapeXml(payload.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${escapeXml(payload.issueTime)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${escapeXml(payload.documentType)}</cbc:InvoiceTypeCode>
  <cbc:Note>${escapeXml(payload.notes || 'Factura generada por Mr. Tender ERP & AI')}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${items.length}</cbc:LineCountNumeric>
  
  <!-- Emisor / Facturador -->
  <cac:AccountingSupplierParty>
    <cbc:AdditionalAccountID>${escapeXml(emisor.personType)}</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(emisor.businessName)}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:CityName>${escapeXml(emisor.city)}</cbc:CityName>
          <cbc:CountrySubentity>${escapeXml(emisor.state)}</cbc:CountrySubentity>
          <cac:AddressLine>
            <cbc:Line>${escapeXml(emisor.address)}</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            <cbc:Name languageID="es">Colombia</cbc:Name>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(emisor.businessName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="${escapeXml(emisor.dv)}" schemeName="${escapeXml(emisor.idType)}">${escapeXml(emisor.nit)}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="${escapeXml(emisor.regime)}">${escapeXml(emisor.regime === '48' ? 'O-13' : 'O-47')}</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(emisor.businessName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="${escapeXml(emisor.dv)}" schemeName="${escapeXml(emisor.idType)}">${escapeXml(emisor.nit)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(emisor.phone)}</cbc:Telephone>
        <cbc:ElectronicMail>${escapeXml(emisor.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Adquiriente / Cliente -->
  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>${escapeXml(adquiriente.personType)}</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(adquiriente.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:CityName>${escapeXml(adquiriente.city || 'Bogotá')}</cbc:CityName>
          <cbc:CountrySubentity>${escapeXml(adquiriente.state || 'Bogotá D.C.')}</cbc:CountrySubentity>
          <cac:AddressLine>
            <cbc:Line>${escapeXml(adquiriente.address || 'Ciudad')}</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            <cbc:Name languageID="es">Colombia</cbc:Name>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(adquiriente.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="${escapeXml(adquiriente.dv || '0')}" schemeName="${escapeXml(adquiriente.idType)}">${escapeXml(adquiriente.id)}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="${escapeXml(adquiriente.regime)}">${escapeXml(adquiriente.regime === '48' ? 'O-13' : 'R-99-PN')}</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(adquiriente.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeAgencyName="CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)" schemeID="${escapeXml(adquiriente.dv || '0')}" schemeName="${escapeXml(adquiriente.idType)}">${escapeXml(adquiriente.id)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(adquiriente.phone || '')}</cbc:Telephone>
        <cbc:ElectronicMail>${escapeXml(adquiriente.email || '')}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Forma y Medio de Pago -->
  <cac:PaymentMeans>
    <cbc:ID>${paymentMeans.isCredit ? '2' : '1'}</cbc:ID>
    <cbc:PaymentMeansCode>${escapeXml(paymentMeans.code)}</cbc:PaymentMeansCode>
    ${paymentMeans.dueDate ? `<cbc:PaymentDueDate>${escapeXml(paymentMeans.dueDate)}</cbc:PaymentDueDate>` : ''}
  </cac:PaymentMeans>

  <!-- Totales de Impuestos -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${formatDianAmount(ivaTotal + incTotal)}</cbc:TaxAmount>
    ${totals.taxBreakdown.iva19.tax > 0 ? `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${formatDianAmount(totals.taxBreakdown.iva19.base)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${formatDianAmount(totals.taxBreakdown.iva19.tax)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>19.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>` : ''}
    ${totals.taxBreakdown.iva5.tax > 0 ? `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${formatDianAmount(totals.taxBreakdown.iva5.base)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${formatDianAmount(totals.taxBreakdown.iva5.tax)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>5.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>` : ''}
  </cac:TaxTotal>

  <!-- Totales Monetarios -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${formatDianAmount(totals.lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${formatDianAmount(totals.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${formatDianAmount(totals.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="COP">${formatDianAmount(totals.allowanceTotalAmount)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="COP">${formatDianAmount(totals.payableAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Detalle de Ítems -->
  ${linesXml}

</Invoice>`

  return { xml, cufe, qrData }
}

/**
 * Construye el documento XML UBL 2.1 para Nota Crédito (Tipo 91)
 */
export function buildCreditNoteUblXml(payload: DianCreditNotePayload): { xml: string; cude: string; qrData: string } {
  const { emisor, adquiriente, resolution, totals, items, billingReference, discrepancyResponse } = payload

  const ivaTotal = totals.taxBreakdown.iva19.tax + totals.taxBreakdown.iva5.tax + totals.taxBreakdown.iva0.tax
  const incTotal = totals.taxBreakdown.inc.tax

  const { cude } = calculateCUDE({
    numDoc: payload.creditNoteNumber,
    fecDoc: payload.issueDate,
    horDoc: payload.issueTime,
    valDoc: totals.taxExclusiveAmount,
    codImp1: '01',
    valImp1: ivaTotal,
    codImp2: '04',
    valImp2: incTotal,
    codImp3: '03',
    valImp3: 0,
    valTot: totals.payableAmount,
    nitOFE: emisor.nit,
    numAdq: adquiriente.id,
    pinSoftware: emisor.softwarePin || '12345',
    tipoAmbiente: payload.environment
  })

  const qrData = buildDianQrString({
    numFac: payload.creditNoteNumber,
    fecFac: payload.issueDate,
    horFac: payload.issueTime,
    nitFac: emisor.nit,
    docAdq: adquiriente.id,
    valFac: totals.taxExclusiveAmount,
    valIva: ivaTotal,
    valOtroIm: incTotal,
    valTolFac: totals.payableAmount,
    cufe: cude,
    environment: payload.environment
  })

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
            xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
            xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
            xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"
            xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: Nota Crédito de Factura Electrónica de Venta</cbc:ProfileID>
  <cbc:ProfileExecutionID>${escapeXml(payload.environment)}</cbc:ProfileExecutionID>
  <cbc:ID>${escapeXml(payload.creditNoteNumber)}</cbc:ID>
  <cbc:UUID schemeID="${escapeXml(payload.environment)}" schemeName="CUDE-SHA384">${cude}</cbc:UUID>
  <cbc:IssueDate>${escapeXml(payload.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${escapeXml(payload.issueTime)}</cbc:IssueTime>
  <cbc:CreditNoteTypeCode>91</cbc:CreditNoteTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${escapeXml(billingReference.invoiceNumber)}</cbc:ReferenceID>
    <cbc:ResponseCode>${escapeXml(discrepancyResponse.code)}</cbc:ResponseCode>
    <cbc:Description>${escapeXml(discrepancyResponse.description)}</cbc:Description>
  </cac:DiscrepancyResponse>

  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(billingReference.invoiceNumber)}</cbc:ID>
      <cbc:UUID schemeName="CUFE-SHA384">${escapeXml(billingReference.invoiceCufe)}</cbc:UUID>
      <cbc:IssueDate>${escapeXml(billingReference.invoiceIssueDate)}</cbc:IssueDate>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(emisor.businessName)}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(emisor.businessName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${escapeXml(emisor.dv)}" schemeName="${escapeXml(emisor.idType)}">${escapeXml(emisor.nit)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(adquiriente.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(adquiriente.name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${escapeXml(adquiriente.dv || '0')}" schemeName="${escapeXml(adquiriente.idType)}">${escapeXml(adquiriente.id)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${formatDianAmount(totals.lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${formatDianAmount(totals.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${formatDianAmount(totals.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${formatDianAmount(totals.payableAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</CreditNote>`

  return { xml, cude, qrData }
}
