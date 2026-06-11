import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Types
export interface InventoryRow {
    name: string;
    barcode: string;
    price: number;
    purchasePrice?: number;
    stock: number;
    category?: string;
    brand?: string;
    unit?: string;
    minStock?: number;
    reorderQuantity?: number;
}

export interface InventoryValidationResult {
    row: number;
    data?: InventoryRow;
    errors: string[];
    isValid: boolean;
}

export interface ExcelUploadSummary {
    total_rows: number;
    created_products: number;
    updated_products: number;
    failed_rows: number;
    errors: { row: number; reason: string }[];
}

export interface BarcodeResponse {
    product_id?: string;
    product_name?: string;
    barcode: string;
    previous_stock?: number;
    updated_stock?: number;
    status: 'SUCCESS' | 'NOT_FOUND' | 'ERROR';
    warning?: string; // e.g., low stock
    action_type?: 'IN' | 'OUT';
}

/**
 * Validates a barcode format.
 * Rules: Numeric, 8-14 characters.
 */
export const validateBarcode = (barcode: string): boolean => {
    const regex = /^[a-zA-Z0-9_\-.]{1,20}$/;
    return regex.test(barcode);
};

/**
 * Validates a single row of inventory data from Excel/CSV.
 */
export const validateInventoryRow = (row: Record<string, unknown>, rowIndex: number): InventoryValidationResult => {
    const errors: string[] = [];

    // Required fields
    if (!row.barcode && !row.Barcode) errors.push('Missing barcode');
    if (!row.name && !row.Name) errors.push('Missing product name');

    // Data type and value checks
    const barcode = String(row.barcode || row.Barcode || '').trim();
    const name = String(row.name || row.Name || '').trim();
    const price = Number(row.price || row.Price || 0);
    const purchasePrice = Number(row.purchasePrice || row['Purchase Price'] || row.PurchasePrice || 0);
    const stock = Number(row.stock || row.Stock || 0);
    const category = row.category || row.Category ? String(row.category || row.Category) : undefined;
    const brand = row.brand || row.Brand ? String(row.brand || row.Brand) : undefined;
    const unit = row.unit || row.Unit || row['Unit of Measure'] ? String(row.unit || row.Unit || row['Unit of Measure']) : undefined;
    const minStock = Number(row.minStock || row.MinStock || row['Low Stock Alert'] || 0);
    const reorderQuantity = Number(row.reorderQuantity || row.ReorderQuantity || row['Reorder Amount'] || 0);

    if ((row.price !== undefined || row.Price !== undefined) && (isNaN(price) || price < 0)) {
        errors.push('Invalid price (must be non-negative number)');
    }

    if ((row.stock !== undefined || row.Stock !== undefined) && (isNaN(stock) || stock < 0)) {
        errors.push('Invalid stock (must be non-negative integer)');
    }

    // Barcode format check (if present)
    if (barcode && !validateBarcode(barcode)) {
        errors.push('Invalid barcode format (8-14 digits required)');
    }

    if (errors.length > 0) {
        return { row: rowIndex, errors, isValid: false };
    }

    return {
        row: rowIndex,
        data: {
            name,
            barcode,
            price: price || 0,
            purchasePrice: purchasePrice || 0,
            stock: stock || 0,
            category,
            brand,
            unit,
            minStock: isNaN(minStock) ? 0 : minStock,
            reorderQuantity: isNaN(reorderQuantity) ? 0 : reorderQuantity
        },
        errors: [],
        isValid: true
    };
};

/**
 * Parses an Excel or CSV file and returns validated inventory data.
 */
export const parseInventoryFile = async (file: File): Promise<{ validRows: InventoryRow[], errors: { row: number; reason: string }[], totalRows: number }> => {
    const isCSV = file.name.toLowerCase().endsWith('.csv');

    if (isCSV) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const validRows: InventoryRow[] = [];
                    const errors: { row: number; reason: string }[] = [];
                    const rawRows = results.data as Record<string, unknown>[];

                    rawRows.forEach((row, index) => {
                        const validation = validateInventoryRow(row, index + 2);
                        if (validation.isValid && validation.data) {
                            validRows.push(validation.data);
                        } else {
                            errors.push({ row: validation.row, reason: validation.errors.join(', ') });
                        }
                    });

                    resolve({ validRows, errors, totalRows: rawRows.length });
                }
            });
        });
    }

    // Default to Excel
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const rawRows = XLSX.utils.sheet_to_json(sheet);

                const validRows: InventoryRow[] = [];
                const errors: { row: number; reason: string }[] = [];

                rawRows.forEach((row: unknown, index: number) => {
                    const validation = validateInventoryRow(row as Record<string, unknown>, index + 2);

                    if (validation.isValid && validation.data) {
                        validRows.push(validation.data);
                    } else {
                        errors.push({ row: validation.row, reason: validation.errors.join(', ') });
                    }
                });

                resolve({ validRows, errors, totalRows: rawRows.length });

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};

/**
 * @deprecated Use parseInventoryFile instead.
 */
export const parseExcelInventory = parseInventoryFile;
