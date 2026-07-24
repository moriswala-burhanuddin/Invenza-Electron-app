module.exports = function({ db, storeRedirects, toCamelCase, deviceId }) {
  return {
    getAllCheques(companyId, storeId) {
      const effectiveStoreId = storeRedirects.get(storeId) || storeId;
      const results = db.prepare('SELECT * FROM cheques WHERE store_id = ? AND is_deleted = 0 ORDER BY issue_date DESC').all(effectiveStoreId)
      return results.map(toCamelCase)
    },

    addCheque(cheque) {
      const stmt = db.prepare(`
        INSERT INTO cheques(
          id, company_id, party_type, party_id, party_name, cheque_number, bank_name,
          amount, issue_date, clearing_date, status, store_id, notes, device_id, updated_at, sync_status
        ) VALUES(
          @id, @companyId, @partyType, @partyId, @partyName, @chequeNumber, @bankName,
          @amount, @issueDate, @clearingDate, @status, @storeId, @notes, @deviceId, datetime('now'), 0
        )
      `)
      return stmt.run({
        clearingDate: null,
        notes: '',
        ...cheque,
        deviceId
      })
    },

    updateCheque(id, updates) {
      const fields = Object.keys(updates).map(key => {
        // camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        return `${snakeKey} = @${key} `
      }).join(', ')

      console.log(`[DB] updateCheque called for ID: ${id} with:`, JSON.stringify(updates));
      try {
        const stmt = db.prepare(`
          UPDATE cheques 
          SET ${fields}, updated_at = datetime('now'), sync_status = 0 
          WHERE id = @id
        `);
        const result = stmt.run({ ...updates, id });
        console.log(`[DB] updateCheque result:`, JSON.stringify(result));
        return result;
      } catch (err) {
        console.error(`[DB] updateCheque FAILED:`, err.message);
        throw err;
      }
    },

    deleteCheque(id) {
      return db.prepare("UPDATE cheques SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0 WHERE id = ?").run(id)
    }
  };
};
