import { XMLParser } from 'fast-xml-parser'
import { ParsedInvoiceResult, ParsedInvoiceHeader, ParsedInvoiceItem } from './types'

export function parseInvoiceXml(xmlContent: string): ParsedInvoiceResult {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        })
        const parsed = parser.parse(xmlContent)
        
        // Trata os envelopamentos contendo namespace ou NFe direto
        const nfeRoot = parsed.nfeProc?.NFe || parsed.NFe
        if (!nfeRoot) {
            // Pode ser que nao seja uma NFe mas apenas o bloco
            throw new Error("Formato de XML não reconhecido. Tag <NFe> ausente.")
        }
        
        const infNFe = nfeRoot.infNFe
        if (!infNFe) {
            throw new Error("Informações da nota (infNFe) não encontradas no XML.")
        }
        
        // 1. Chave da Nota
        let invoice_key = ''
        if (infNFe['@_Id']) {
            invoice_key = String(infNFe['@_Id']).replace('NFe', '')
        } else if (parsed.nfeProc?.protNFe?.infProt?.chNFe) {
            invoice_key = String(parsed.nfeProc.protNFe.infProt.chNFe)
        }
        
        if (!invoice_key) {
            throw new Error("Chave da NFe não encontrada.")
        }
        
        // 2. Outros campos de cabeçalho
        const emit = infNFe.emit
        const ide = infNFe.ide
        const total = infNFe.total?.ICMSTot
        
        const header: ParsedInvoiceHeader = {
            supplier_name: String(emit?.xNome || emit?.xFant || 'Desconhecido'),
            supplier_document: String(emit?.CNPJ || emit?.CPF || ''),
            invoice_key,
            invoice_number: String(ide?.nNF || ''),
            invoice_series: String(ide?.serie || ''),
            issued_at: String(ide?.dhEmi || new Date().toISOString()),
            total_amount: Number(total?.vNF || 0)
        }
        
        // 3. Itens
        const items: ParsedInvoiceItem[] = []
        let detArray = infNFe.det
        if (!Array.isArray(detArray)) {
            detArray = [detArray]
        }
        
        for (const det of detArray) {
            if (!det) continue
            const prod = det.prod
            const line_number = Number(det['@_nItem'] || 1)
            
            items.push({
                line_number,
                supplier_item_code: String(prod?.cProd || ''),
                ean: String(prod?.cEAN || ''),
                item_description: String(prod?.xProd || ''),
                purchase_unit: String(prod?.uCom || ''),
                purchase_quantity: Number(prod?.qCom || 0),
                purchase_unit_cost: Number(prod?.vUnCom || 0),
                purchase_total_cost: Number(prod?.vProd || 0)
            })
        }
        
        return { success: true, header, items }
        
    } catch (e: any) {
        return { success: false, error: "Falha ao analisar XML: " + e.message }
    }
}
