import React, { useState } from 'react';
import {
  fetchSlackMessages,
  fetchGmail,
  fetchCalendarEvents,
  summarizeText,
} from './services/ipc';
import TaskItem from './components/TaskItem/TaskItem';

// Extend Task to allow 'calendar'
interface Task {
  id: string;
  source: 'slack' | 'gmail' | 'manual' | 'calendar';
  title: string;
  description: string;
  category: string; // e.g. 'finance', 'admin', etc.
  done: boolean;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Example channel ID for Slack
  const slackChannelId = 'C123456';

  // ---------------------------
  // 1. Fetch Slack
  // ---------------------------
  async function handleFetchSlack() {
    try {
      setLoading(true);
      setError(null);
      const messages = await fetchSlackMessages(slackChannelId);
      const newTasks = messages.map((msg: any) => ({
        id: 'slack-' + msg.ts,
        source: 'slack',
        title: msg.user || 'Slack message',
        description: msg.text || '(No text)',
        category: 'admin',
        done: false,
      }));
      setTasks(prev => [...prev, ...newTasks]);
    } catch (err) {
      console.error('Slack error:', err);
      setError('Failed to fetch Slack messages.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // 2. Fetch Gmail
  // ---------------------------
  async function handleFetchGmail() {
    try {
      setLoading(true);
      setError(null);
      const emails = await fetchGmail();
      const newTasks = emails.map((email: any) => {
        const snippet = email.snippet || '(No snippet)';
        return {
          id: 'gmail-' + email.id,
          source: 'gmail',
          title: 'Email from ' + (
            email.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'unknown'
          ),
          description: snippet,
          category: 'admin',
          done: false,
        };
      });
      setTasks(prev => [...prev, ...newTasks]);
    } catch (err) {
      console.error('Gmail error:', err);
      setError('Failed to fetch Gmail messages.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // 3. Fetch Calendar
  // ---------------------------
  async function handleFetchCalendar() {
    try {
      setLoading(true);
      setError(null);
      const events = await fetchCalendarEvents(); // from services/ipc.ts
      // Convert events to tasks
      const newTasks = events.map((evt: any) => ({
        id: 'calendar-' + evt.id,
        source: 'calendar',
        title: evt.summary || 'No title',
        description: evt.description || '(No description)',
        category: 'admin',
        done: false,
      }));
      setTasks(prev => [...prev, ...newTasks]);
    } catch (err) {
      console.error('Calendar error:', err);
      setError('Failed to fetch Calendar events.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // 4. AI Summaries
  // ---------------------------
  async function handleSummarize() {
    try {
      setLoading(true);
      setError(null);
      const text = tasks.map(t => `Task: ${t.title}\nDesc: ${t.description}\n`).join('\n');
      const summary = await summarizeText(text);
      setAiSummary(summary);
    } catch (err) {
      console.error('AI Summarize error:', err);
      setError('Failed to generate AI summary.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // Toggle a Task as Done
  // ---------------------------
  function toggleDone(taskId: string) {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, done: !t.done }
        : t
    ));
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Bawi Dashboard MVP</h1>

      <button onClick={handleFetchSlack} disabled={loading}>
        Fetch Slack
      </button>
      <button onClick={handleFetchGmail} disabled={loading}>
        Fetch Gmail
      </button>
      <button onClick={handleFetchCalendar} disabled={loading}>
        Fetch Calendar
      </button>
      <button onClick={handleSummarize} disabled={loading}>
        AI Summaries
      </button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>AI Summary</h2>
      <pre>{aiSummary}</pre>

      <h2>Tasks</h2>
      <ul>
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} toggleDone={toggleDone} />
        ))}
      </ul>
    </div>
  );
}

export default App;
