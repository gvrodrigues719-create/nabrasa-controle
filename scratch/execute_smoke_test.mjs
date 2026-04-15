import fs from 'fs'
import { XMLParser } from 'fast-xml-parser'
import { createClient } from '@supabase/supabase-js'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').filter(l => l.includes('=')).forEach(line => {
    const idx = line.indexOf('=')
    if (idx !== -1) envs[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
})
const supabase = createClient(envs.NEXT_PUBLIC_SUPABASE_URL, envs.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN_ID = 'b4ac5ffd-40c3-46b1-9508-a1219cb925b6' // ID fictício para o teste de criação

// Lógica idêntica ao parser.ts
function parseInvoiceXml(xmlContent) {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        })
        const parsed = parser.parse(xmlContent)
        const nfeRoot = parsed.nfeProc?.NFe || parsed.NFe
        if (!nfeRoot) throw new Error("Tag <NFe> ausente.")
        const infNFe = nfeRoot.infNFe
        if (!infNFe) throw new Error("Tag <infNFe> ausente.")
        
        let invoice_key = ''
        if (infNFe['@_Id']) invoice_key = String(infNFe['@_Id']).replace('NFe', '')
        else if (parsed.nfeProc?.protNFe?.infProt?.chNFe) invoice_key = String(parsed.nfeProc.protNFe.infProt.chNFe)
        if (!invoice_key) throw new Error("Chave da NFe não encontrada.")
            
        const emit = infNFe.emit
        const ide = infNFe.ide
        const total = infNFe.total?.ICMSTot
        
        const header = {
            supplier_name: String(emit?.xNome || emit?.xFant || 'Desconhecido'),
            supplier_document: String(emit?.CNPJ || emit?.CPF || ''),
            invoice_key,
            invoice_number: String(ide?.nNF || ''),
            invoice_series: String(ide?.serie || ''),
            issued_at: String(ide?.dhEmi || new Date().toISOString()),
            total_amount: Number(total?.vNF || 0)
        }
        
        const items = []
        let detArray = infNFe.det
        if (!Array.isArray(detArray)) detArray = detArray ? [detArray] : []
        
        for (const det of detArray) {
            if (!det) continue
            const prod = det.prod
            items.push({
                line_number: Number(det['@_nItem'] || 1),
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
    } catch (e) {
        return { success: false, error: e.message }
    }
}

async function runTests() {
    console.log("=== INICIANDO SMOKE TEST DA ETAPA 2 ===")
    
    // Ler arquivos
    const xmlA = fs.readFileSync('scratch/nfe_test_A.xml', 'utf8')
    const xmlB = fs.readFileSync('scratch/nfe_test_B.xml', 'utf8')
    
    // TESTE 1: PREVIEW A
    console.log("\n-> TESTE 1: PREVIEW XML A (1 item)")
    const resA = parseInvoiceXml(xmlA)
    if (!resA.success) { console.log("FALHOU no parser A:", resA.error); return }
    console.log("SUCESSO. Chave:", resA.header.invoice_key, "| Fornecedor:", resA.header.supplier_name, "| Total:", resA.header.total_amount, "| Itens:", resA.items.length)
    console.dir(resA.items[0])

    // TESTE 2: IMPORTAÇÃO A
    console.log("\n-> TESTE 2: IMPORTAÇÃO XML A")
    let { error: errA } = await supabase.from('supplier_invoices').insert([{ ...resA.header, imported_by: null, status: 'pending' }])
    if (errA) console.log("ERRO Salvando Cabeçalho A:", errA.message)
    else {
        const { data: invA } = await supabase.from('supplier_invoices').select('id').eq('invoice_key', resA.header.invoice_key).single()
        console.log("Cabeçalho salvo com ID:", invA.id)
        const itemsToInsertA = resA.items.map(i => ({ ...i, supplier_invoice_id: invA.id, review_status: 'pending' }))
        const { error: errItA } = await supabase.from('supplier_invoice_items').insert(itemsToInsertA)
        console.log("Itens salvos A:", errItA ? errItA.message : "OK (1 registro)")
        const { error: errLogA } = await supabase.from('invoice_import_logs').insert([{ supplier_invoice_id: invA.id, action: 'import_completed', payload_json: { header: resA.header } }])
        console.log("Logs salvos A:", errLogA ? errLogA.message : "OK (1 registro)")
    }

    // TESTE 3: DUPLICIDADE A
    console.log("\n-> TESTE 3: DUPLICIDADE XML A")
    const { data: existingA } = await supabase.from('supplier_invoices').select('id').eq('invoice_key', resA.header.invoice_key).single()
    if (existingA) console.log("SUCESSO: Foi detectado no banco validando a consulta de duplicidade antes do insert.")
    else console.log("FALHOU: Duplicidade não capturada.")

    // TESTE 4: PREVIEW B
    console.log("\n-> TESTE 4: PREVIEW XML B (Múltiplos itens)")
    const resB = parseInvoiceXml(xmlB)
    if (!resB.success) { console.log("FALHOU no parser B:", resB.error); return }
    console.log("SUCESSO. Chave:", resB.header.invoice_key, "| Fornecedor:", resB.header.supplier_name, "| Total:", resB.header.total_amount, "| Itens:", resB.items.length)
    for(const i of resB.items) { console.log("   Item:", i.line_number, "-", i.item_description, "| Qtde:", i.purchase_quantity, "| Total:", i.purchase_total_cost) }

    // TESTE 5: IMPORTAÇÃO B
    console.log("\n-> TESTE 5: IMPORTAÇÃO XML B")
    const { data: dupB } = await supabase.from('supplier_invoices').select('id').eq('invoice_key', resB.header.invoice_key).single()
    if (!dupB) {
        let { error: errB } = await supabase.from('supplier_invoices').insert([{ ...resB.header, imported_by: null, status: 'pending' }])
        if (errB) console.log("ERRO Salvando Cabeçalho B:", errB.message)
        else {
            const { data: invB } = await supabase.from('supplier_invoices').select('id').eq('invoice_key', resB.header.invoice_key).single()
            console.log("Cabeçalho salvo com ID:", invB.id)
            const itemsToInsertB = resB.items.map(i => ({ ...i, supplier_invoice_id: invB.id, review_status: 'pending' }))
            const { error: errItB } = await supabase.from('supplier_invoice_items').insert(itemsToInsertB)
            console.log("Itens salvos B:", errItB ? errItB.message : "OK (4 registros)")
            const { error: errLogB } = await supabase.from('invoice_import_logs').insert([{ supplier_invoice_id: invB.id, action: 'import_completed', payload_json: { header: resB.header } }])
            console.log("Logs salvos B:", errLogB ? errLogB.message : "OK")
        }
    } else {
         console.log("Nota B já estava no banco")
    }

    // TESTE 6: VALIDAÇÃO FINAL (Lendo do Banco)
    console.log("\n-> TESTE 6: CONSISTÊNCIA NO BANCO")
    const { data: finalQuery } = await supabase.from('supplier_invoices').select('id, supplier_name, total_amount, supplier_invoice_items(count)').in('invoice_key', [resA.header.invoice_key, resB.header.invoice_key])
    console.dir(finalQuery, { depth: null })
}

runTests()
