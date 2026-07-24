const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'db.cjs');
let text = fs.readFileSync(p, 'utf-8');

// 1. Remove cheques block (line 5691 - 5740 approx)
// Let's use precise string replacements instead of regex so we don't accidentally match the wrong things.
const chequesPattern = /getAllCheques\(companyId, storeId\) \{[\s\S]*?deleteCheque\(id\) \{[\s\S]*?\},/g;
text = text.replace(chequesPattern, '');

// 2. Remove customers block
const customersPattern = /getAllCustomers: \(companyId, storeId\) => \{[\s\S]*?deleteCustomer: \(id\) => \{[\s\S]*?\},/g;
text = text.replace(customersPattern, '');

// 3. Remove products block (main)
const productsPattern = /getAllProducts: \(companyId, storeId\) => \{[\s\S]*?restoreProduct: \(id\) => \{[\s\S]*?\},/g;
text = text.replace(productsPattern, '');

// 4. Remove bulk products block
const bulkProductsPattern = /bulkDeleteProducts: \(ids\) => \{[\s\S]*?bulkUpdateProducts: \(ids, updates\) => \{[\s\S]*?\},/g;
text = text.replace(bulkProductsPattern, '');

// 5. Inject the service requires and modify dbHelpers
const injection = `
const dbHelpers = {}; // Forward declaration for circular refs
const chequesService = require('./services/cheques.cjs')({ db, storeRedirects, toCamelCase, deviceId, dbHelpers });
const customersService = require('./services/customers.cjs')({ db, storeRedirects, toCamelCase, deviceId, dbHelpers });
const productsService = require('./services/products.cjs')({ db, storeRedirects, toCamelCase, deviceId, dbHelpers });

Object.assign(dbHelpers, {
`;

text = text.replace('const dbHelpers = {', injection);

// Inject the spreads at the top of dbHelpers
text = text.replace('  ...hrHelpers,', '  ...hrHelpers,\n  ...chequesService,\n  ...customersService,\n  ...productsService,');

// Replace the closing brace of dbHelpers with });
text = text.replace(/}\n\n\/\/ Ensure getCommissions/, '});\n\n// Ensure getCommissions');

fs.writeFileSync(p, text);
console.log("Refactor successful");
