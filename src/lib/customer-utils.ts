import * as XLSX from 'xlsx';
import { Customer } from './store-data';

/**
 * Exports customers to an Excel file.
 */
export const exportCustomersToExcel = (customers: Customer[]) => {
    const data = customers.map(c => ({
        'Person ID': c.id.replace(/\D/g, ''),
        'Name': c.name,
        'E-Mail': c.email || '',
        'Phone Number': c.phone,
        'Area': c.area || '',
        'Credit Balance': c.creditBalance,
        'Total Purchases': c.totalPurchases,
        'Joined At': c.joinedAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    // Generate buffer and download
    XLSX.writeFile(workbook, `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Validates a single row of customer data from Excel.
 */
const validateCustomerRow = (row: any, rowIndex: number) => {
    const errors: string[] = [];

    if (!row.Name) errors.push('Missing Name');
    if (!row['Phone Number']) errors.push('Missing Phone Number');

    if (errors.length > 0) {
        return { row: rowIndex, errors, isValid: false };
    }

    return {
        row: rowIndex,
        data: {
            name: String(row.Name),
            phone: String(row['Phone Number']),
            email: row['E-Mail'] ? String(row['E-Mail']) : undefined,
            area: row.Area ? String(row.Area) : undefined,
            creditBalance: Number(row['Credit Balance']) || 0,
            totalPurchases: Number(row['Total Purchases']) || 0,
            joinedAt: row['Joined At'] ? String(row['Joined At']) : new Date().toISOString()
        },
        errors: [],
        isValid: true
    };
};

/**
 * Parses an Excel file and returns validated customer data.
 */
export const parseExcelCustomers = async (file: File): Promise<{ validRows: any[], errors: { row: number; reason: string }[], totalRows: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                const rawRows = XLSX.utils.sheet_to_json(sheet);
                const validRows: any[] = [];
                const errors: { row: number; reason: string }[] = [];

                rawRows.forEach((row: any, index: number) => {
                    const validation = validateCustomerRow(row, index + 2);

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
 * Triggers a print for mailing labels
 */
export const printMailingLabels = (customers: Customer[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsHtml = customers.map(c => `
    <div style="width: 2.625in; height: 1in; padding: 0.125in; border: 1px dashed #ccc; float: left; margin: 0.05in; font-family: sans-serif; font-size: 12px; box-sizing: border-box; overflow: hidden;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">${c.name}</div>
      <div>${c.area || ''}</div>
      <div>${c.phone}</div>
      ${c.email ? `<div>${c.email}</div>` : ''}
    </div>
  `).join('');

    printWindow.document.write(`
    <html>
      <head>
        <title>Mailing Labels</title>
        <style>
          @media print {
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="no-print" style="padding: 10px; background: #eee; border-bottom: 1px solid #ccc; margin-bottom: 20px;">
          <h1>Print Preview</h1>
          <p>This layout is optimized for standard label sheets. Close this window after printing.</p>
        </div>
        <div style="width: 8.5in; margin: 0 auto;">
          ${labelsHtml}
        </div>
      </body>
    </html>
  `);
    printWindow.document.close();
};
