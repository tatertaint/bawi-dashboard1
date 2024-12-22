// frontend/src/global.d.ts
export {};

declare global {
  interface Window {
    electronAPI: {
      fetchSlackMessages: (channelId: string) => Promise<any>;
      fetchGmail: () => Promise<any>;
      summarizeText: (text: string) => Promise<any>;
      fetchCalendarEvents: () => Promise<any>;
    };
  }
}
