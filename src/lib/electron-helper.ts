// Helper to detect if running in Electron and use appropriate data source
export const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
}

export const getDataSource = () => {
    if (isElectron()) {
        return 'electron'
    }
    return 'mock'
}
