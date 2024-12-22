require('dotenv').config(); // loads .env into process.env
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { WebClient } = require('@slack/web-api');
const { google } = require('googleapis');
const { Configuration, OpenAIApi } = require('openai');

// ---------- ENVIRONMENT VARIABLES (Fill in your real values) ----------
const SLACK_TOKEN = process.env.SLACK_TOKEN;          // e.g. xoxb-...
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;    // e.g. sk-...
// For Gmail, you typically need OAuth credentials; see notes below.
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN; 
// This is a simplified approach (using a refresh token). 
// For a full OAuth flow, you'd store tokens in a local file or handle externally.

// ---------- SETUP CLIENTS ----------
let slackClient = null;
if (SLACK_TOKEN) {
  slackClient = new WebClient(SLACK_TOKEN);
}

// GMAIL Setup (simple example using refresh token)
let gmailClient = null;
if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
  const oAuth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // or your redirect
  );
  oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  gmailClient = google.gmail({ version: 'v1', auth: oAuth2Client });
}

let calendarClient = null;
if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
  // reuse the same oAuth2Client from above
  // oAuth2Client is still in scope if you define it outside these if-blocks, 
  // or replicate the same logic in a single if.

  // This code snippet assumes you created 'oAuth2Client' in the same block:
  calendarClient = google.calendar({ version: 'v3', auth: oAuth2Client });
}

// OPENAI Setup
let openai = null;
if (OPENAI_API_KEY) {
  const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
  openai = new OpenAIApi(configuration);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startURL =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, 'frontend/dist/index.html')}`;

  mainWindow.loadURL(startURL);

  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -------------- IPC HANDLERS --------------

// Slack: fetch recent messages from a channel
ipcMain.handle('slack:fetchMessages', async (event, { channelId }) => {
  if (!slackClient) {
    throw new Error('Slack client not configured. Check SLACK_TOKEN.');
  }
  try {
    const response = await slackClient.conversations.history({
      channel: channelId,
      limit: 5,
    });
    return response.messages; // array of Slack messages
  } catch (err) {
    console.error('Error fetching Slack messages', err);
    throw err;
  }
});

// Gmail: fetch unread messages from "INBOX"
ipcMain.handle('gmail:fetchEmails', async (event) => {
  if (!gmailClient) {
    throw new Error('Gmail client not configured. Check env credentials.');
  }
  try {
    // Get unread messages
    const res = await gmailClient.users.messages.list({
      userId: 'me',
      q: 'is:unread',  // simple query
      maxResults: 5,
    });
    const messages = [];
    if (res.data.messages) {
      for (const msg of res.data.messages) {
        const fullMsg = await gmailClient.users.messages.get({
          userId: 'me',
          id: msg.id,
        });
        messages.push(fullMsg.data);
      }
    }
    return messages;
  } catch (err) {
    console.error('Error fetching Gmail messages', err);
    throw err;
  }
});

ipcMain.handle('calendar:fetchEvents', async () => {
  if (!calendarClient) {
    throw new Error('Calendar client not configured. Check environment credentials/scopes.');
  }
  try {
    // For example: listing next 5 upcoming events
    const now = new Date().toISOString();
    const res = await calendarClient.events.list({
      calendarId: 'primary',
      timeMin: now,
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items || [];
  } catch (err) {
    console.error('Error fetching Calendar events', err);
    throw err;
  }
});

// AI Summaries: Summarize text
ipcMain.handle('ai:summarize', async (event, { text }) => {
  if (!openai) {
    throw new Error('OpenAI not configured. Check OPENAI_API_KEY.');
  }
  try {
    const prompt = `Summarize and extract action items from the following:\n\n${text}\n\nSummary:`;
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 150,
    });
    return response.data.choices[0].text.trim();
  } catch (err) {
    console.error('Error with OpenAI Summaries', err);
    throw err;
  }
});

// ------------------------------------------

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.whenReady().then(createWindow).catch(err => console.error(err));
