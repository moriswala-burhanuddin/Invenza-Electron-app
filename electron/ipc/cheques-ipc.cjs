module.exports = function(ipcMain, dbHelpers, getMainWindow) {
    // Cheques
    ipcMain.handle('db:getCheques', async (event, storeId, companyId) => {
        return dbHelpers.getAllCheques(companyId, storeId)
    })

    ipcMain.handle('db:addCheque', async (event, cheque) => {
        const result = dbHelpers.addCheque(cheque)
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.webContents.send('sync:trigger')
        return result
    })

    ipcMain.handle('db:updateCheque', async (event, id, updates) => {
        console.log(`[IPC] updateCheque called for ${id}`, updates)
        const result = dbHelpers.updateCheque(id, updates)
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.webContents.send('sync:trigger')
        return result
    })

    ipcMain.handle('db:deleteCheque', async (event, id) => {
        const result = dbHelpers.deleteCheque(id)
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.webContents.send('sync:trigger')
        return result
    })
};
