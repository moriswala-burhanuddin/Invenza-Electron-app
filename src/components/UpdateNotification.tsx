import { useEffect, useState } from 'react'

interface UpdateInfo {
    version: string
}

interface DownloadProgress {
    percent: number
}

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready'

interface ElectronUpdaterAPI {
    onUpdateAvailable?: (cb: (info: UpdateInfo) => void) => void
    onDownloadProgress?: (cb: (info: DownloadProgress) => void) => void
    onUpdateDownloaded?: (cb: (info: UpdateInfo) => void) => void
    onUpdaterError?: (cb: (info: { message: string }) => void) => void
    checkForUpdates?: () => Promise<{ success: boolean, info?: unknown, error?: string }>
    installUpdate?: () => void
}

function getAPI(): ElectronUpdaterAPI | null {
    return (window as Window & { electronAPI?: ElectronUpdaterAPI }).electronAPI ?? null
}

export function UpdateNotification() {
    const [state, setState] = useState<UpdateState>('idle')
    const [version, setVersion] = useState('')
    const [percent, setPercent] = useState(0)

    useEffect(() => {
        const api = getAPI()
        if (!api) {
            console.log('[UpdateNotification] No Electron API found.')
            return
        }

        console.log('[UpdateNotification] Initializing listeners...')

        api.onUpdateAvailable?.((info: UpdateInfo) => {
            console.log('[UpdateNotification] Update available:', info.version)
            setVersion(info.version)
            setState('available')
        })

        api.onDownloadProgress?.((info: DownloadProgress) => {
            setPercent(info.percent)
            setState('downloading')
        })

        api.onUpdateDownloaded?.((info: UpdateInfo) => {
            console.log('[UpdateNotification] Update ready to install.')
            setVersion(info.version)
            setState('ready')
        })

        api.onUpdaterError?.((info: { message: string }) => {
            console.error('[UpdateNotification] Updater error:', info.message)
        })
    }, [])

    if (state === 'idle') return null

    const handleInstall = () => {
        getAPI()?.installUpdate?.()
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999,
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: '12px',
                padding: '16px 20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '300px',
                color: '#e2e8f0',
                fontFamily: 'inherit',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔄</span>
                <div>
                    {state === 'available' && (
                        <>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>
                                Update Available — v{version}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                                Downloading in background…
                            </p>
                        </>
                    )}
                    {state === 'downloading' && (
                        <>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>
                                Downloading Update — v{version}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                                {percent}% complete
                            </p>
                        </>
                    )}
                    {state === 'ready' && (
                        <>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>
                                Update Ready — v{version}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                                Restart to apply the update
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            {state === 'downloading' && (
                <div
                    style={{
                        height: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${percent}%`,
                            background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                            borderRadius: '2px',
                            transition: 'width 0.3s ease',
                        }}
                    />
                </div>
            )}

            {/* Action button */}
            {state === 'ready' && (
                <button
                    onClick={handleInstall}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                    }}
                >
                    Restart &amp; Update
                </button>
            )}
        </div>
    )
}
