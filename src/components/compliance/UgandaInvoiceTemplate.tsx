import { numberToWords, capitalizeFirstLetter } from '@/lib/number-to-words';
import { formatCurrency } from '@/lib/utils';

export interface UgandaComplianceData {
    invoiceNumber: string;
    date: string | Date;
    items: Array<{
        productName: string;
        quantity: number;
        unitPrice: number;
        total: number;
        taxCategory?: string;
        unitMeasure?: string;
    }>;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    customerName?: string;
    customerPhone?: string;
    supplierName?: string;
    supplierPhone?: string;
    paymentMode?: string;
    notes?: string;
    fiscalNumber?: string;
    deviceNumber?: string;
    verificationCode?: string;
}

export function generateUgandaComplianceHtml(data: UgandaComplianceData, store: any, type: 'SALE' | 'PURCHASE' | 'INVOICE' = 'SALE', showTax: boolean = true) {
    const dateObj = new Date(data.date);
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString();

    // Default business details from prompt if not in store config
    const brn = store.brn || '80034282000906';
    const tin = store.taxId || '1037861252';
    const legalName = store.name || 'GHIZER ENTERPRISES U LIMITED';
    const address = store.address || 'NAMUWONGO BUKASA ROAD NAMUWONGO CENTER\nNAMUWONGO CENTER KAMPALA MAKINDYE DIVISION EAST\nMAKINDYE DIVISION BUKASA';
    
    const amountInWords = capitalizeFirstLetter(numberToWords(data.totalAmount));
    
    // Determine Buyer Name
    const buyerName = data.customerName || data.supplierName || 'WALK-IN CUSTOMER';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #000;
            margin: 0;
            padding: 20px;
            background: #fff;
        }
        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ccc;
            padding: 10px;
        }
        .header {
            text-align: center;
            font-weight: bold;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .section-title {
            background-color: #f2f2f2;
            text-align: center;
            font-weight: bold;
            border: 1px solid #000;
            padding: 2px;
            margin-top: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
        }
        table, th, td {
            border: 1px solid #000;
        }
        th, td {
            padding: 4px;
            text-align: left;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .no-border td {
            border: none;
        }
        .qr-container {
            text-align: center;
            margin-top: 20px;
        }
        .qr-placeholder {
            width: 120px;
            height: 120px;
            margin: 0 auto;
            border: 1px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
        }
        .footer-note {
            text-align: center;
            font-weight: bold;
            margin-top: 10px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            e-INVOICE/TAX INVOICE
        </div>

        <div class="section-title">Section A: Seller's Details</div>
        <table>
            <tr><td width="30%">BRN:</td><td>${brn}</td></tr>
            <tr><td>TIN:</td><td>${tin}</td></tr>
            <tr><td>Legal Name:</td><td>${legalName}</td></tr>
            <tr><td>Trade Name:</td><td>${legalName}</td></tr>
            <tr><td>Address:</td><td>${address.replace(/\n/g, '<br>')}</td></tr>
            <tr><td>Seller's Reference Number:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Served by:</td><td>ADMIN</td></tr>
            <tr><td>Issued Date:</td><td>${dateStr}</td></tr>
            <tr><td>Time:</td><td>${timeStr}</td></tr>
        </table>

        <div class="section-title">Section B: Buyer's Details</div>
        <table>
            <tr><td width="30%">Name:</td><td>${buyerName}</td></tr>
            ${data.customerPhone ? `<tr><td>Phone:</td><td>${data.customerPhone}</td></tr>` : ''}
        </table>

        <div class="section-title">Section C: Goods & Services Details</div>
        <table>
            <thead>
                <tr>
                    <th>No.</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Measure</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map((item, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${item.productName}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-center">${item.unitMeasure || 'PCE-Piece'}</td>
                        <td class="text-right">${item.unitPrice.toLocaleString()}</td>
                        <td class="text-right">${item.total.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${showTax ? `
        <div class="section-title">Section D: Tax Details</div>
        <table>
            <thead>
                <tr>
                    <th>Tax Category</th>
                    <th>Net Amount</th>
                    <th>Tax Amount</th>
                    <th>Gross Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>A: VAT-Standard (18%)</td>
                    <td class="text-right">${(data.totalAmount / 1.18).toFixed(4)}</td>
                    <td class="text-right">${(data.totalAmount - (data.totalAmount / 1.18)).toFixed(4)}</td>
                    <td class="text-right">${data.totalAmount.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>
        ` : ''}

        <div class="section-title">${showTax ? 'Section E' : 'Section D'}: Summary</div>
        <table>
            ${showTax ? `
            <tr><td width="30%">Net Amount:</td><td class="text-right">${(data.totalAmount / 1.18).toFixed(4)}</td></tr>
            <tr><td>Tax Amount:</td><td class="text-right">${(data.totalAmount - (data.totalAmount / 1.18)).toFixed(4)}</td></tr>
            ` : ''}
            <tr><td width="30%">${showTax ? 'Gross Amount' : 'Total Amount'}:</td><td class="text-right">${data.totalAmount.toLocaleString()}</td></tr>
            <tr><td>Amount in words:</td><td>${amountInWords}</td></tr>
            <tr><td>Currency:</td><td>UGX</td></tr>
            <tr><td>Number of Items:</td><td>${data.items.length}</td></tr>
            <tr><td>Mode:</td><td>${data.paymentMode || 'Online'}</td></tr>
            <tr><td>Remarks:</td><td>${data.notes || 'N/A'}</td></tr>
        </table>

        <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://efris.ura.go.ug/verify/${data.invoiceNumber}" alt="QR Code" width="120" height="120" />
            <div style="font-size: 8px; margin-top: 5px;">Verify on efris.ura.go.ug</div>
        </div>

        <div class="footer-note">
            *** END OF e-INVOICE/TAX INVOICE ***
        </div>
    </div>
</body>
</html>
    `;
    return html;
}
