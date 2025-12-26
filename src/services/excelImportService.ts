import ExcelJS from 'exceljs';

export interface ExcelImportRow {
    // Define expected columns from Excel based on "Customer Inventory CSV.xlsx"
    // I am assuming common headers based on the inventory structure.
    // If the file has specific headers, I should map them.
    // For now I'll use a loose mapping and normalize.
    Customer?: string;
    'Container Number'?: string;
    'Shipment Number'?: string;
    'HS Code'?: string;
    'Description'?: string;
    'Quantity'?: number;
    'UOM'?: string;
    'Gross Weight'?: number;
    'Weight UOM'?: string;
    'Volume'?: number;
    'Volume UOM'?: string;
    'UN Class'?: string;
    'Country of Origin'?: string;
}

export interface InventoryPayloadItem {
    customer: string;
    customer_nbr?: string;
    container_nbr: string;
    shipment_nbr: string;
    item_description: string;
    cargo_description: string;
    hs_code: string;
    gross_weight: number;
    net_weight: number;
    weight_uom: string;
    volume: number;
    volume_uom: string;
    un_class: string;
    country_of_origin: string;
    quantity: number;
    quantity_uom: string;
    rcvd_qty: number;
}

export const parseInventoryExcel = async (file: File): Promise<InventoryPayloadItem[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
    }

    // Helper to get cell value
    const getCellValue = (row: number, col: number): string => {
        const cell = worksheet.getCell(row, col);
        const value = cell.value;
        if (value === null || value === undefined) return '';
        if (typeof value === 'object' && 'text' in value) return String(value.text);
        if (typeof value === 'object' && 'result' in value) return String(value.result);
        return String(value);
    };

    // 1. Parse Header Info (Cells)
    // B1 -> Customer
    // D1 -> Email (not used)
    // F1 -> Contact (not used)
    // B2 -> Container No
    // D2 -> OTM Shipment No
    // F2 -> Terminal (not used)
    const customer = getCellValue(1, 2); // B1
    const containerNbr = getCellValue(2, 2); // B2
    const shipmentNbr = getCellValue(2, 4); // D2

    // 2. Parse Items Table
    // Table headers are at Row 3. Data starts at Row 4.
    // Get headers from row 3
    const headerRow = worksheet.getRow(3);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').trim();
    });

    // Build column index map
    const colIndex: Record<string, number> = {};
    headers.forEach((header, idx) => {
        if (header) colIndex[header] = idx;
    });

    // Parse data rows starting from row 4
    const payloadItems: InventoryPayloadItem[] = [];
    const rowCount = worksheet.rowCount;

    for (let rowNum = 4; rowNum <= rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);

        // Skip empty rows
        if (!row.hasValues) continue;

        const getRowValue = (headerName: string): string => {
            const col = colIndex[headerName];
            if (!col) return '';
            const cell = row.getCell(col);
            const value = cell.value;
            if (value === null || value === undefined) return '';
            if (typeof value === 'object' && 'text' in value) return String(value.text);
            if (typeof value === 'object' && 'result' in value) return String(value.result);
            return String(value);
        };

        const description = getRowValue('Description');
        const hsCode = getRowValue('HS Code');

        // Skip rows without HS Code or Description
        if (!hsCode && !description) continue;

        payloadItems.push({
            customer: customer,
            customer_nbr: '',
            container_nbr: containerNbr,
            shipment_nbr: shipmentNbr,
            item_description: description,
            cargo_description: description, // Fallback
            hs_code: hsCode,
            gross_weight: parseFloat(getRowValue('Weight')) || 0,
            net_weight: 0, // Not in Excel
            weight_uom: getRowValue('Weight UOM') || 'KGM',
            volume: parseFloat(getRowValue('Volume')) || 0,
            volume_uom: getRowValue('Volume UOM') || 'M3',
            un_class: 'N/A', // Not in Excel
            country_of_origin: getRowValue('Country Of Origin'),
            quantity: parseFloat(getRowValue('Qty')) || 0,
            quantity_uom: getRowValue('UOM') || 'EA',
            rcvd_qty: parseFloat(getRowValue('Qty')) || 0,
        });
    }

    return payloadItems;
};
