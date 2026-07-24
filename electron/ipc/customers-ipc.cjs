module.exports = function(ipcMain, dbHelpers, getMainWindow) {
    // Customers
    ipcMain.handle('db:getCustomers', async (event, storeId, companyId) => {
        return dbHelpers.getAllCustomers(companyId, storeId)
    })

    ipcMain.handle('db:addCustomer', async (event, customer) => {
        const result = dbHelpers.addCustomer(customer)
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.webContents.send('sync:trigger')
        return result
    })

    ipcMain.handle('db:updateCustomer', async (event, id, updates) => {
        const result = dbHelpers.updateCustomer(id, updates)
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.webContents.send('sync:trigger')
        return result
    })

    ipcMain.handle('db:deleteCustomer', async (event, id) => {
        const result = dbHelpers.deleteCustomer(id)
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.webContents.send('sync:trigger')
        return result
    })
};
