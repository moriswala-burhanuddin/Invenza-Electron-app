import { Sale, SaleItem, Store } from '@/lib/store-data';

interface ReceiptTemplateProps {
    sale: Partial<Sale>;
    store: Store;
}

export function ReceiptTemplate({ sale, store }: ReceiptTemplateProps) {
    const dateStr = sale.date ? new Date(sale.date).toLocaleString() : new Date().toLocaleString();

    return (
        <div style={{
            width: '80mm',
            padding: '5mm',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#000',
            backgroundColor: '#fff'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '900' }}>{store.name.toUpperCase()}</h2>
                <p style={{ margin: '0', fontSize: '10px' }}>{store.address?.toUpperCase()}</p>
                <p style={{ margin: '0', fontSize: '10px' }}>TEL: {store.phone}</p>
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

            <div style={{ marginBottom: '10px', fontSize: '10px' }}>
                <p style={{ margin: '2px 0' }}>INV: {sale.invoiceNumber || 'DRAFT'}</p>
                <p style={{ margin: '2px 0' }}>DATE: {dateStr}</p>
                <p style={{ margin: '2px 0' }}>SALESPERSON: STORE ADMIN</p>
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

            <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ textAlign: 'left', paddingBottom: '5px' }}>ITEM</th>
                        <th style={{ textAlign: 'right', paddingBottom: '5px' }}>QTY</th>
                        <th style={{ textAlign: 'right', paddingBottom: '5px' }}>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items?.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td style={{ padding: '5px 0' }}>{item.productName.toUpperCase()}</td>
                            <td style={{ textAlign: 'right', padding: '5px 0' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '5px 0' }}>${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

            <div style={{ fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span>SUBTOTAL</span>
                    <span>${sale.subtotal?.toFixed(2)}</span>
                </div>
                {sale.discountAmount && sale.discountAmount > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                        <span>DISCOUNTS</span>
                        <span>-${sale.discountAmount.toFixed(2)}</span>
                    </div>
                ) : null}
                {sale.taxAmount && sale.taxAmount > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                        <span>TAX</span>
                        <span>${sale.taxAmount.toFixed(2)}</span>
                    </div>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0', fontSize: '14px', fontWeight: '900' }}>
                    <span>TOTAL balance</span>
                    <span>${sale.totalAmount?.toFixed(2)}</span>
                </div>
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px' }}>
                <p style={{ margin: '0' }}>THANK YOU FOR YOUR BUSINESS</p>
                <p style={{ margin: '5px 0 0 0', fontStyle: 'italic' }}>POWERED BY INVENZA ERP</p>
            </div>
        </div>
    );
}

// Helper to generate HTML string for silent printing
export function generateReceiptHtml(sale: any, store: any) {
    // A simple way to get the HTML without full React DOM rendering if needed, 
    // but better to just use a template string for perfectly controlled thermal layout.
    return `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          .receipt {
            width: 80mm;
            padding: 5mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
          }
          .center { text-align: center; }
          .dashed { border-bottom: 1px dashed #000; margin: 10px 0; }
          .flex { display: flex; justify-content: space-between; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          th { border-bottom: 1px solid #000; text-align: left; }
          .total { font-size: 16px; font-weight: 900; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center">
            <h2 style="margin: 0; font-size: 18px;">${store.name.toUpperCase()}</h2>
            <p style="margin: 5px 0; font-size: 10px;">${store.address?.toUpperCase() || ''}</p>
            <p style="margin: 0; font-size: 10px;">TEL: ${store.phone || ''}</p>
          </div>
          
          <div class="dashed"></div>
          
          <div style="font-size: 10px;">
            <p style="margin: 2px 0;">INV: ${sale.invoiceNumber || 'DRAFT'}</p>
            <p style="margin: 2px 0;">DATE: ${new Date(sale.date).toLocaleString()}</p>
            <p style="margin: 2px 0;">CUST: ${sale.customerId || 'WALK-IN'}</p>
          </div>
          
          <div class="dashed"></div>
          
          <table>
            <thead>
              <tr>
                <th style="padding-bottom: 5px;">ITEM</th>
                <th style="text-align: right; padding-bottom: 5px;">QTY</th>
                <th style="text-align: right; padding-bottom: 5px;">PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map((item: any) => `
                <tr>
                  <td style="padding: 5px 0;">${item.productName.toUpperCase()}</td>
                  <td style="text-align: right; padding: 5px 0;">${item.quantity}</td>
                  <td style="text-align: right; padding: 5px 0;">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="dashed"></div>
          
          <div class="flex" style="font-size: 10px; margin: 2px 0;">
            <span>SUBTOTAL</span>
            <span>$${sale.subtotal.toFixed(2)}</span>
          </div>
          ${sale.discountAmount ? `
          <div class="flex" style="font-size: 10px; margin: 2px 0;">
            <span>DISCOUNTS</span>
            <span>-$${sale.discountAmount.toFixed(2)}</span>
          </div>` : ''}
          ${sale.taxAmount ? `
          <div class="flex" style="font-size: 10px; margin: 2px 0;">
            <span>TAX</span>
            <span>$${sale.taxAmount.toFixed(2)}</span>
          </div>` : ''}
          
          <div class="flex total">
            <span>TOTAL</span>
            <span>$${sale.totalAmount.toFixed(2)}</span>
          </div>
          
          <div class="dashed"></div>
          
          <div class="center" style="margin-top: 20px; font-size: 10px;">
            <p>THANK YOU FOR YOUR BUSINESS</p>
            <p style="margin-top: 5px; font-style: italic;">INVENZA ERP</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
