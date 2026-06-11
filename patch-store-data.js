const fs = require('fs');
let text = fs.readFileSync('src/lib/store-data.ts', 'utf-8');

const missing = ['addStore', 'addGiftCard', 'addTransaction', 'addActivityLog', 'addQuotation', 'addSupplier', 'addSupplierTransaction', 'addSupplierCustomField', 'addPaymentTerm', 'addSupplierDocument', 'addPayroll', 'addEmployee', 'addCheque'];

let count = 0;
for (const method of missing) {
    const regex = new RegExp('(' + method + '\\s*:\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?const\\s+new\\w+\\s*(?::\\s*[A-Za-z]+)?\\s*=\\s*\\{\\s*\\n\\s*)', 'g');
    if (regex.test(text)) {
        text = text.replace(regex, '$1companyId: get().currentUser?.companyId,\n          ');
        count++;
    }
}

fs.writeFileSync('src/lib/store-data.ts', text);
console.log('Injected companyId into ' + count + ' methods in store-data.ts');
