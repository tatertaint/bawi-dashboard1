// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchSlackMessages: (channelId) => ipcRenderer.invoke('slack:fetchMessages', { channelId }),
  fetchGmail: () => ipcRenderer.invoke('gmail:fetchEmails'),
  summarizeText: (text) => ipcRenderer.invoke('ai:summarize', { text }),
  fetchCalendarEvents: () => ipcRenderer.invoke('calendar:fetchEvents')
});
