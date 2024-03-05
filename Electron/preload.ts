import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("browserWindow", {
    versions: () => ipcRenderer.invoke("versions"),
});
contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel: any, data: any) => ipcRenderer.send(channel, data),
    receive: (channel: any, func: any) => ipcRenderer.on(channel, (event, ...args) => func(...args))
})