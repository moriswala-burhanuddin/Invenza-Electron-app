import re

file_path = r'd:\paid-erp\invenza-erp\electron\db.cjs'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace "invoice_number TEXT UNIQUE NOT NULL," with "invoice_number TEXT NOT NULL," in CREATE TABLE statements
content = content.replace("invoice_number TEXT UNIQUE NOT NULL,", "invoice_number TEXT NOT NULL,")
# Handle the invoice_number in the "invoices" table which might be defined slightly differently or identical
content = content.replace("invoice_number TEXT UNIQUE NOT NULL", "invoice_number TEXT NOT NULL")

# Now add the safe migration script. I will append it near where the product migration script is (around line 872)
migration_code = '''
      // Relax INVOICE_NUMBER uniqueness for multi-tenancy sales, quotations, purchases, invoices
      const tablesToCheck = ['sales', 'quotations', 'purchases', 'invoices'];
      for (const table of tablesToCheck) {
          const schemaResult = db.prepare(SELECT sql FROM sqlite_master WHERE type='table' AND name=?).get(table);
          if (schemaResult && schemaResult.sql.toLowerCase().includes("invoice_number text unique")) {
              console.log([DB] Migration: Refining  schema (removing invoice_number uniqueness)...);
              db.transaction(() => {
                  db.pragma('foreign_keys = OFF');
                  db.exec(ALTER TABLE  RENAME TO _old);
                  
                  // Extract columns dynamically from old table to reconstruct exact structure in new table without unique
                  const oldCols = db.prepare(PRAGMA table_info(_old)).all();
                  let createCols = [];
                  for (let col of oldCols) {
                      let colDef = ${col.name} ;
                      if (col.name === 'id') colDef += " PRIMARY KEY";
                      else if (col.name === 'invoice_number') colDef += " NOT NULL"; // stripped unique
                      else {
                          if (col.notnull) colDef += " NOT NULL";
                          if (col.dflt_value !== null) colDef +=  DEFAULT ;
                      }
                      createCols.push(colDef);
                  }
                  
                  db.exec(CREATE TABLE  (\n\n));
                  
                  const colNames = oldCols.map(c => c.name).join(', ');
                  db.exec(INSERT INTO  () SELECT  FROM _old);
                  
                  db.exec(DROP TABLE IF EXISTS _old);
                  db.pragma('foreign_keys = ON');
              })();
          }
      }
'''

# We will inject this before the product migration script
content = content.replace("// Relax SKU uniqueness for multi-tenancy", migration_code + "\n      // Relax SKU uniqueness for multi-tenancy")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('DB Patch applied successfully')
