import re

with open('src/lib/store-data.ts', 'r', encoding='utf-8') as f:
    text = f.read()

missing = ['addStore', 'addGiftCard', 'addTransaction', 'addActivityLog', 'addQuotation', 'addSupplier', 'addSupplierTransaction', 'addSupplierCustomField', 'addPaymentTerm', 'addSupplierDocument', 'addPayroll', 'addEmployee', 'addCheque']

count = 0
for method in missing:
    pattern = r'(' + method + r'\s*:\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?const\s+new\w+\s*(?::\s*[A-Za-z]+)?\s*=\s*\{\s*\n\s*)'
    if re.search(pattern, text):
        text = re.sub(pattern, r'\g<1>companyId: get().currentUser?.companyId,\n          ', text)
        count += 1

with open('src/lib/store-data.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print(f'Injected companyId into {count} methods in store-data.ts')
