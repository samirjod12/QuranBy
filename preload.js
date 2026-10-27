const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  info: () => ipcRenderer.invoke('app:info'),
  list: () => ipcRenderer.invoke('file:list'),
  read: (id) => ipcRenderer.invoke('file:read', id),
  remove: (id) => ipcRenderer.invoke('file:remove', id),
  size: (url) => ipcRenderer.invoke('file:size', url),
  download: (id, url) => ipcRenderer.invoke('file:download', { id, url }),
  pick: (id) => ipcRenderer.invoke('file:pick', id),
  openExternal: (url) => ipcRenderer.invoke('open:external', url),
  onProgress: (cb) => ipcRenderer.on('download:progress', (_e, d) => cb(d)),
});
