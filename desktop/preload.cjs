'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nailsDesktop', Object.freeze({
  read: () => ipcRenderer.sendSync('nails:load'),
  save: snapshot => ipcRenderer.invoke('nails:save', snapshot),
  where: () => ipcRenderer.invoke('nails:where')
}));
