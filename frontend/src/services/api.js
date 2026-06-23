import { storage } from './storage';

export const api = {
  // Get current active base URL
  getBaseUrl() {
    return storage.getBackendUrl();
  },

  // 1. Check if backend is awake
  async ping() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/ping`);
      if (!res.ok) return { online: false, hasDatabase: false };
      const data = await res.json();
      return { online: true, hasKey: data.hasKey, hasDatabase: !!data.hasDatabase };
    } catch (e) {
      return { online: false, hasDatabase: false };
    }
  },

  // 2. Upload file with progress tracking using raw XMLHttpRequest
  prepareAudio(file, onUploadProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('audio', file);

      xhr.open('POST', `${this.getBaseUrl()}/api/audio/prepare`, true);

      // Track upload progress
      if (xhr.upload && onUploadProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onUploadProgress(percentComplete);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error || `Upload failed with status ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network connection error during upload'));
      };

      xhr.send(formData);
    });
  },

  // 3. Request transcription for a specific chunk index
  async transcribeChunk(sessionId, chunkIndex, clean = false) {
    const res = await fetch(`${this.getBaseUrl()}/api/audio/transcribe-chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, chunkIndex, clean })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to transcribe chunk');
    }
    return await res.json();
  },

  // 5b. Clean/correct existing raw transcript text using AI
  async cleanText(rawText) {
    const res = await fetch(`${this.getBaseUrl()}/api/audio/clean-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to clean text');
    }
    return await res.json();
  },

  // 4. Request server cleanup of temp files
  async cleanup(sessionId) {
    try {
      await fetch(`${this.getBaseUrl()}/api/audio/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    } catch (e) {
      console.error('Cleanup request failed', e);
    }
  },

  // 5. Connect to streaming chat endpoint
  async streamChat(messages, onChunk, onDone, onError) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to start AI chat session');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Leave the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') {
            onDone();
            return;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const rawJson = trimmed.slice(6);
              const data = JSON.parse(rawJson);
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                onChunk(content);
              }
            } catch (err) {
              console.error('Error parsing SSE line:', trimmed, err);
            }
          }
        }
      }
      onDone();
    } catch (err) {
      onError(err);
    }
  },

  // 6. Database meetings CRUD operations (Supabase proxy)
  async getDbMeetings() {
    const res = await fetch(`${this.getBaseUrl()}/api/meetings`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch meetings');
    }
    return await res.json();
  },

  async createDbMeeting(meeting) {
    const res = await fetch(`${this.getBaseUrl()}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meeting)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create meeting');
    }
    return await res.json();
  },

  async updateDbMeeting(id, updates) {
    const res = await fetch(`${this.getBaseUrl()}/api/meetings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update meeting');
    }
    return await res.json();
  },

  async deleteDbMeeting(id) {
    const res = await fetch(`${this.getBaseUrl()}/api/meetings/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete meeting');
    }
    return await res.json();
  }
};
