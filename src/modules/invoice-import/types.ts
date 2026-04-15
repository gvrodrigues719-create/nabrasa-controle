export interface ParsedInvoiceHeader {
    supplier_name: string;
    supplier_document: string;
    invoice_key: string;
    invoice_number: string;
    invoice_series: string;
    issued_at: string;
    total_amount: number;
}

export interface ParsedInvoiceItem {
    line_number: number;
    supplier_item_code: string;
    ean: string;
    item_description: string;
    purchase_unit: string;
    purchase_quantity: number;
    purchase_unit_cost: number;
    purchase_total_cost: number;
}

export interface ParsedInvoiceResult {
    success: boolean;
    header?: ParsedInvoiceHeader;
    items?: ParsedInvoiceItem[];
    error?: string;
}
