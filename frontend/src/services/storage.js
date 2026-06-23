import { api } from './api';

// Local Storage Manager for Meetings with Database Sync
const MEETINGS_KEY = 'ai_meeting_editor_meetings';
const BACKEND_URL_KEY = 'ai_meeting_editor_backend_url';

let useDatabase = false;

// Debouncing state for database updates
const pendingUpdates = new Map();
const updateTimeouts = new Map();

export const storage = {
  // Database control
  setDatabaseActive(active) {
    useDatabase = !!active;
    console.log(`[Storage] Database active state set to: ${useDatabase}`);
  },

  isDatabaseActive() {
    return useDatabase;
  },

  // 1. Backend URL Management
  getBackendUrl() {
    return localStorage.getItem(BACKEND_URL_KEY) || 'https://meetingstt.onrender.com';
  },

  setBackendUrl(url) {
    localStorage.setItem(BACKEND_URL_KEY, url);
  },

  // Get local cache meetings
  getLocalMeetings() {
    try {
      const data = localStorage.getItem(MEETINGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse meetings from localStorage', e);
      return [];
    }
  },

  // Save local cache meetings
  saveLocalMeetings(meetings) {
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
  },

  // 2. Meetings Management (Async CRUD)
  async getMeetings() {
    // Flush any pending updates first to ensure DB is up to date before fetching
    await this.flushAllPendingUpdates();

    if (useDatabase) {
      try {
        const dbMeetings = await api.getDbMeetings();
        // Sync cache with DB
        this.saveLocalMeetings(dbMeetings);
        return dbMeetings;
      } catch (err) {
        console.warn('Failed to fetch from DB, falling back to local cache', err);
        return this.getLocalMeetings();
      }
    }
    return this.getLocalMeetings();
  },

  async createMeeting(title = '') {
    const newMeeting = {
      id: `meet_${Date.now()}`,
      title: title || `Cuộc họp ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      createdAt: new Date().toISOString(),
      rawText: '',
      chatHistory: [],
      finalMarkdown: '',
      audioDuration: 0
    };

    // Save to local cache first
    const meetings = this.getLocalMeetings();
    meetings.unshift(newMeeting);
    this.saveLocalMeetings(meetings);

    // Save to database if active
    if (useDatabase) {
      try {
        await api.createDbMeeting(newMeeting);
      } catch (err) {
        console.error('Failed to save new meeting to database:', err);
      }
    }

    return newMeeting;
  },

  async updateMeeting(id, updates) {
    // Update local cache first (instant feedback)
    const meetings = this.getLocalMeetings();
    const index = meetings.findIndex(m => m.id === id);
    let updatedMeeting = null;
    if (index !== -1) {
      meetings[index] = { ...meetings[index], ...updates };
      this.saveLocalMeetings(meetings);
      updatedMeeting = meetings[index];
    }

    // Debounce the database write
    if (useDatabase) {
      this.queueDbUpdate(id, updates);
    }

    return updatedMeeting;
  },

  async deleteMeeting(id) {
    // Cancel any pending updates for this meeting
    if (updateTimeouts.has(id)) {
      clearTimeout(updateTimeouts.get(id));
      updateTimeouts.delete(id);
      pendingUpdates.delete(id);
    }

    // Delete from local cache first
    const meetings = this.getLocalMeetings();
    const filtered = meetings.filter(m => m.id !== id);
    this.saveLocalMeetings(filtered);

    // Delete from database if active
    if (useDatabase) {
      try {
        await api.deleteDbMeeting(id);
      } catch (err) {
        console.error(`Failed to delete meeting ${id} from database:`, err);
      }
    }

    return filtered;
  },

  // Helper: Queue and Debounce database updates
  queueDbUpdate(id, updates) {
    // Merge new updates into existing pending updates for this meeting
    const existing = pendingUpdates.get(id) || {};
    pendingUpdates.set(id, { ...existing, ...updates });

    // Clear previous timeout if any
    if (updateTimeouts.has(id)) {
      clearTimeout(updateTimeouts.get(id));
    }

    // Set new timeout to write to DB (1 second debounce)
    const timeout = setTimeout(async () => {
      const finalUpdates = pendingUpdates.get(id);
      pendingUpdates.delete(id);
      updateTimeouts.delete(id);

      if (finalUpdates && useDatabase) {
        try {
          await api.updateDbMeeting(id, finalUpdates);
          console.log(`[Storage] Debounced DB update completed for meeting ${id}`);
        } catch (err) {
          console.error(`[Storage] Failed to update meeting ${id} in database:`, err);
        }
      }
    }, 1000);

    updateTimeouts.set(id, timeout);
  },

  // Helper: Flush all pending updates immediately (useful before listing or on unload)
  async flushAllPendingUpdates() {
    const promises = [];
    for (const [id, timeout] of updateTimeouts.entries()) {
      clearTimeout(timeout);
      updateTimeouts.delete(id);

      const finalUpdates = pendingUpdates.get(id);
      pendingUpdates.delete(id);

      if (finalUpdates && useDatabase) {
        promises.push(
          api.updateDbMeeting(id, finalUpdates)
            .then(() => console.log(`[Storage] Flushed DB update for meeting ${id}`))
            .catch(err => console.error(`[Storage] Failed to flush update for ${id}:`, err))
        );
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
};
