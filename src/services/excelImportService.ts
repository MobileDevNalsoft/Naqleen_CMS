import * as XLSX from 'xlsx';

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
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // 1. Parse Header Info (Cells)
                // Access specific cells. Note: xlsx uses A1 notation. 0-indexed r,c is handled by utility or address decoding.
                // B1 (0,1) -> Customer
                // D1 (0,3) -> Email
                // F1 (0,5) -> Contact
                // B2 (1,1) -> Container No
                // D2 (1,3) -> OTM Shipment No
                // F2 (1,5) -> Terminal

                const getCellValue = (cellAddress: string) => {
                    const cell = sheet[cellAddress];
                    return cell ? cell.v : '';
                };

                const customer = getCellValue('B1') || '';
                const email = getCellValue('D1') || ''; // Not currently in payload but good to have
                const contact = getCellValue('F1') || ''; // Not currently in payload
                const containerNbr = getCellValue('B2') || '';
                const shipmentNbr = getCellValue('D2') || '';
                const terminal = getCellValue('F2') || ''; // Not currently in payload

                // 2. Parse Items Table
                // Table headers are at Row 3 (Index 2). Data starts at Row 4 (Index 3).
                // We use sheet_to_json with 'range' option to skip top rows.
                // range: 2 means start at row index 2 (Row 3 in Excel) which is the header row.

                const rawItems = XLSX.utils.sheet_to_json<any>(sheet, { range: 2 });

                const payloadItems: InventoryPayloadItem[] = rawItems.map((row: any) => {
                    // Map columns based on the "Row 3" headers seen in image:
                    // S.NO, HS Code, Description, Qty, UOM, Weight, Weight UOM, Volume, Volume UOM, Country Of Origin

                    return {
                        customer: customer,
                        customer_nbr: '',
                        container_nbr: containerNbr,
                        shipment_nbr: shipmentNbr,

                        item_description: row['Description'] || '',
                        cargo_description: row['Description'] || '', // Fallback
                        hs_code: row['HS Code'] || '',
                        gross_weight: parseFloat(row['Weight'] || 0) || 0,
                        net_weight: 0, // Not in Excel
                        weight_uom: row['Weight UOM'] || 'KGM',
                        volume: parseFloat(row['Volume'] || 0) || 0,
                        volume_uom: row['Volume UOM'] || 'M3',
                        un_class: 'N/A', // Not in Excel
                        country_of_origin: row['Country Of Origin'] || '',
                        quantity: parseFloat(row['Qty'] || 0) || 0,
                        quantity_uom: row['UOM'] || 'EA',
                        rcvd_qty: parseFloat(row['Qty'] || 0) || 0,
                    };
                });

                // Filter out empty rows (e.g. if S.NO is missing or HS Code is missing)
                const validItems = payloadItems.filter(item => item.hs_code || item.item_description);

                resolve(validItems);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
