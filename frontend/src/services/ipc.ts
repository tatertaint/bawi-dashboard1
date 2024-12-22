declare global {
    interface Window {
      electronAPI: {
        fetchSlackMessages: (channelId: string) => Promise<any>;
        fetchGmail: () => Promise<any>;
        summarizeText: (text: string) => Promise<string>;
        fetchCalendarEvents: () => Promise<any>;
      };
    }
  }
  export {};
  
// frontend/src/services/ipc.ts

export async function fetchSlackMessages(channelId: string) {
    return window.electronAPI.fetchSlackMessages(channelId);
  }
  
  export async function fetchGmail() {
    return window.electronAPI.fetchGmail();
  }

  // frontend/src/services/ipc.ts
export async function fetchCalendarEvents() {
    return window.electronAPI.fetchCalendarEvents(); // or your chosen handle name
  }  
  
  export async function summarizeText(text: string) {
    return window.electronAPI.summarizeText(text);
  }

  
  