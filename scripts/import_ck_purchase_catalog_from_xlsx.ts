import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
})

// Normalization function (remove accents, extra spaces, to uppercase)
function normalizeString(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim()
}

// Convert string to valid number or null
function parseNumber(val: any): number | null {
    if (val == null || val === '' || val === '—' || val === '-') return null
    const num = Number(val)
    return isNaN(num) ? null : num
}

// Parse date string (assuming DD/MM/YYYY)
function parseDate(val: any): string | null {
    if (!val) return null
    if (typeof val === 'number') {
        // Excel serial date
        const date = new Date(Math.round((val - 25569) * 864e5))
        return date.toISOString().split('T')[0]
    }
    const str = String(val).trim()
    if (!str || str === '—' || str === '-') return null
    const parts = str.split('/')
    if (parts.length === 3) {
        // DD/MM/YYYY -> YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
    return null
}

async function runImport() {
    console.log('=== STARTING IMPORT ===')
    
    const filePath = path.resolve('private_imports/NaBrasa_Icarai_Compras_v3.xlsx')
    const wb = XLSX.readFile(filePath)

    const consolidadoName = wb.SheetNames.find(s => s.includes('Consolidado'))
    if (!consolidadoName) {
        console.error('Aba Consolidado não encontrada!')
        process.exit(1)
    }
    
    const ws = wb.Sheets[consolidadoName]
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    // Achar o cabeçalho
    let headerRow = -1
    for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i].some((c: any) => String(c || '').trim().toUpperCase() === 'FORNECEDOR')) {
            headerRow = i
            break
        }
    }
    
    if (headerRow === -1) {
        console.error('Cabeçalho FORNECEDOR não encontrado!')
        process.exit(1)
    }
    
    const headers = (data[headerRow] as any[]).map((h: any) => String(h || '').trim())
    const get = (row: any[], col: string) => {
        const idx = headers.findIndex(h => h.toUpperCase().includes(col.toUpperCase()))
        return idx >= 0 ? row[idx] : undefined
    }

    let stats = { suppliersAdded: 0, itemsAdded: 0, itemsUpdated: 0, historyAdded: 0 }
    console.log(`Found header row at ${headerRow}. Data length: ${data.length}`)
    
    // Process rows
    for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i]
        if (!row) continue
        
        const rawForn = get(row, 'FORNECEDOR')
        const rawItem = get(row, 'ITEM')
        if (!rawForn || String(rawForn).trim() === '') continue
        if (!rawItem || String(rawItem).trim() === '') continue
        
        const fornName = String(rawForn).trim()
        const fornNorm = normalizeString(fornName)
        const cat = get(row, 'CATEGORIA')
        
        // 1. Upsert Supplier
        let { data: supplier, error: suppErr } = await supabase
            .from('ck_suppliers')
            .select('id')
            .eq('normalized_name', fornNorm)
            .single()
            
        if (!supplier) {
            const { data: newSupp, error: newSuppErr } = await supabase
                .from('ck_suppliers')
                .insert({
                    name: fornName,
                    normalized_name: fornNorm,
                    category_main: cat ? String(cat).trim() : null
                })
                .select('id')
                .single()
            
            if (newSuppErr) throw newSuppErr
            supplier = newSupp
            stats.suppliersAdded++
        }
        
        const itemName = String(rawItem).trim()
        const itemNorm = normalizeString(itemName)
        const unit = get(row, 'UNID') ? String(get(row, 'UNID')).trim() : 'UN'
        const subcat = get(row, 'SUBCATEGORIA') ? String(get(row, 'SUBCATEGORIA')).trim() : null
        const status = get(row, 'STATUS') ? String(get(row, 'STATUS')).trim() : null
        const obs = get(row, 'OBSERVAÇÃO') ? String(get(row, 'OBSERVAÇÃO')).trim() : null
        
        const nf = get(row, 'NF') ? String(get(row, 'NF')).trim() : null
        const purchaseDate = parseDate(get(row, 'DATA'))
        const qty = parseNumber(get(row, 'QTD'))
        const unitPrice = parseNumber(get(row, 'V.UNIT (R$)'))
        const totalPrice = parseNumber(get(row, 'V.TOTAL (R$)'))
        const invoiceTotal = parseNumber(get(row, 'V.NOTA (R$)'))
        
        // 2. Upsert Catalog Item
        let { data: catalogItem } = await supabase
            .from('ck_purchase_catalog_items')
            .select('id, last_unit_price, last_purchase_date')
            .eq('supplier_id', supplier.id)
            .eq('normalized_item_name', itemNorm)
            .eq('unit', unit)
            .single()
            
        if (!catalogItem) {
            const { data: newItem, error: newItmErr } = await supabase
                .from('ck_purchase_catalog_items')
                .insert({
                    supplier_id: supplier.id,
                    fiscal_item_name: itemName,
                    normalized_item_name: itemNorm,
                    category: cat ? String(cat).trim() : null,
                    subcategory: subcat,
                    unit: unit,
                    last_unit_price: unitPrice,
                    last_total_price: totalPrice,
                    last_nf: nf,
                    last_purchase_date: purchaseDate,
                    status: status,
                    observation: obs
                })
                .select('id')
                .single()
                
            if (newItmErr) throw newItmErr
            catalogItem = { ...newItem, last_unit_price: unitPrice, last_purchase_date: purchaseDate }
            stats.itemsAdded++
        } else {
            // Update if we have a newer or better price
            let updatePayload: any = {}
            let shouldUpdate = false
            
            // se o item não tem preço e achamos um
            if (catalogItem.last_unit_price == null && unitPrice != null) {
                updatePayload.last_unit_price = unitPrice
                updatePayload.last_total_price = totalPrice
                shouldUpdate = true
            }
            
            if (catalogItem.last_purchase_date == null && purchaseDate != null) {
                updatePayload.last_purchase_date = purchaseDate
                updatePayload.last_nf = nf
                shouldUpdate = true
            } else if (catalogItem.last_purchase_date && purchaseDate && new Date(purchaseDate) > new Date(catalogItem.last_purchase_date)) {
                // se for mais recente
                updatePayload.last_purchase_date = purchaseDate
                updatePayload.last_nf = nf
                if (unitPrice != null) {
                    updatePayload.last_unit_price = unitPrice
                    updatePayload.last_total_price = totalPrice
                }
                shouldUpdate = true
            }
            
            if (shouldUpdate) {
                await supabase
                    .from('ck_purchase_catalog_items')
                    .update(updatePayload)
                    .eq('id', catalogItem.id)
                stats.itemsUpdated++
            }
        }
        
        // 3. Upsert Price History (idempotent logic using match)
        const historyMatch = {
            supplier_id: supplier.id,
            catalog_item_id: catalogItem.id,
            nf: nf,
            quantity: qty,
            unit_price: unitPrice
        }
        
        // If nf is null, we can't really track it perfectly without duplicating.
        // Let's check if there's any identical entry.
        let query = supabase.from('ck_purchase_price_history').select('id')
            .eq('supplier_id', supplier.id)
            .eq('catalog_item_id', catalogItem.id)
        
        if (nf) query = query.eq('nf', nf)
        else query = query.is('nf', null)
        
        if (qty) query = query.eq('quantity', qty)
        else query = query.is('quantity', null)
        
        if (unitPrice) query = query.eq('unit_price', unitPrice)
        else query = query.is('unit_price', null)
        
        const { data: existingHist } = await query.limit(1).maybeSingle()
        
        if (!existingHist) {
            const { error: histErr } = await supabase
                .from('ck_purchase_price_history')
                .insert({
                    catalog_item_id: catalogItem.id,
                    supplier_id: supplier.id,
                    nf: nf,
                    purchase_date: purchaseDate,
                    quantity: qty,
                    unit: unit,
                    unit_price: unitPrice,
                    total_price: totalPrice,
                    invoice_total: invoiceTotal,
                    status: status,
                    observation: obs,
                    source_file: 'NaBrasa_Icarai_Compras_v3.xlsx'
                })
            
            if (histErr) throw histErr
            stats.historyAdded++
        }
    }
    
    console.log('=== IMPORT COMPLETE ===')
    console.log(stats)
}

runImport().catch(console.error)
