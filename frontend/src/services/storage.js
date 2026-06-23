// Local Storage Manager for Meetings
const MEETINGS_KEY = 'ai_meeting_editor_meetings';
const BACKEND_URL_KEY = 'ai_meeting_editor_backend_url';

export const storage = {
  // 1. Backend URL Management
  getBackendUrl() {
    return localStorage.getItem(BACKEND_URL_KEY) || 'http://localhost:5000';
  },

  setBackendUrl(url) {
    localStorage.setItem(BACKEND_URL_KEY, url);
  },

  // 2. Meetings Management
  getMeetings() {
    try {
      const data = localStorage.getItem(MEETINGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse meetings from localStorage', e);
      return [];
    }
  },

  saveMeetings(meetings) {
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
  },

  createMeeting(title = '') {
    const meetings = this.getMeetings();
    const newMeeting = {
      id: `meet_${Date.now()}`,
      title: title || `Cuộc họp ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      createdAt: new Date().toISOString(),
      rawText: '',
      chatHistory: [],
      finalMarkdown: '',
      audioDuration: 0
    };
    meetings.unshift(newMeeting);
    this.saveMeetings(meetings);
    return newMeeting;
  },

  updateMeeting(id, updates) {
    const meetings = this.getMeetings();
    const index = meetings.findIndex(m => m.id === id);
    if (index !== -1) {
      meetings[index] = { ...meetings[index], ...updates };
      this.saveMeetings(meetings);
      return meetings[index];
    }
    return null;
  },

  deleteMeeting(id) {
    const meetings = this.getMeetings();
    const filtered = meetings.filter(m => m.id !== id);
    this.saveMeetings(filtered);
    return filtered;
  }
};
