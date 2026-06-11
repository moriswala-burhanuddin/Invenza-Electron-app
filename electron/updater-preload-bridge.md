# Updater IPC Bridge Notes

The following IPC channels are used by the auto-updater.

## Main → Renderer (via `webContents.send`)
| Channel | Payload | Description |
|---|---|---|
| `updater:update-available` | `{ version }` | Fired when a new version is found. App is downloading in the background. |
| `updater:download-progress` | `{ percent }` | Download % (0–100) |
| `updater:update-downloaded` | `{ version }` | Full download complete. Safe to prompt restart. |

## Renderer → Main (via `ipcRenderer.send`)
| Channel | Description |
|---|---|
| `updater:install-now` | User clicked "Restart & Update" button. Triggers `quitAndInstall`. |
