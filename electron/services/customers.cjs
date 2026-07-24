module.exports = function({ db, storeRedirects, toCamelCase, deviceId }) {
  return {
    getAllCustomers: (companyId, storeId) => {
      const effectiveStoreId = storeRedirects.get(storeId) || storeId;
      const customers = db.prepare('SELECT * FROM customers WHERE store_id = ? AND is_deleted = 0 ORDER BY updated_at DESC').all(effectiveStoreId)
      return customers.map(toCamelCase)
    },

    deleteCustomer: (id) => {
      return db.prepare("UPDATE customers SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
    },

    addCustomer: (customer) => {
      const stmt = db.prepare(`
        INSERT INTO customers(id, company_id, name, phone, email, area, credit_balance, credit_limit, total_purchases, store_id, joined_at, device_id, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      stmt.run(
        customer.id, customer.companyId, customer.name, customer.phone, customer.email,
        customer.area, customer.creditBalance || 0, customer.creditLimit || 0, customer.totalPurchases || 0,
        customer.storeId, customer.joinedAt, deviceId
      )
      const result = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id)
      return toCamelCase(result)
    },

    updateCustomer: (id, updates) => {
      const fields = []
      const values = []

      const fieldMap = {
        name: 'name',
        phone: 'phone',
        email: 'email',
        area: 'area',
        creditBalance: 'credit_balance',
        creditLimit: 'credit_limit',
        totalPurchases: 'total_purchases'
      }

      Object.keys(updates).forEach(key => {
        if (fieldMap[key]) {
          fields.push(`${fieldMap[key]} = ?`)
          values.push(updates[key])
        }
      })

      if (fields.length === 0) return null

      fields.push(`updated_at = datetime('now')`)
      fields.push(`sync_status = 0`) // Dirty flag for sync
      values.push(id)

      const stmt = db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ? `)
      stmt.run(...values)
      const result = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
      return toCamelCase(result)
    }
  };
};
