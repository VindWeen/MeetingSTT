import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AudioWorkspace from './components/AudioWorkspace';
import AIChatWorkspace from './components/AIChatWorkspace';
import FinalOutput from './components/FinalOutput';
import RecordingModal from './components/RecordingModal';
import SettingsModal from './components/SettingsModal';
import { storage } from './services/storage';
import { api } from './services/api';

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [activeMeetingId, setActiveMeetingId] = useState(null);
  
  // Modals & Panels toggle
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);
  
  // Connection states
  const [serverStatus, setServerStatus] = useState({ checking: true, online: false });

  // 1. Initial Load
  useEffect(() => {
    const list = storage.getMeetings();
    setMeetings(list);
    if (list.length > 0) {
      setActiveMeetingId(list[0].id);
    } else {
      // Auto-create a default meeting if list is empty
      const defaultMeeting = storage.createMeeting('Cuộc họp chào mừng 🚀');
      const updatedList = storage.getMeetings();
      setMeetings(updatedList);
      setActiveMeetingId(defaultMeeting.id);
    }

    // Ping check server
    checkConnection();

    // Auto-ping every 30 seconds to prevent Render spin-down if active,
    // and keep check status updated
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    setServerStatus(s => ({ ...s, checking: true }));
    const status = await api.ping();
    setServerStatus({
      checking: false,
      online: status.online
    });
  };

  const activeMeeting = meetings.find(m => m.id === activeMeetingId);

  // 2. Action Handlers
  const handleCreateMeeting = () => {
    const newMeet = storage.createMeeting();
    setMeetings(storage.getMeetings());
    setActiveMeetingId(newMeet.id);
  };

  const handleDeleteMeeting = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cuộc họp này? Dữ liệu lịch sử sẽ mất hoàn toàn.')) {
      const remaining = storage.deleteMeeting(id);
      setMeetings(remaining);
      if (activeMeetingId === id) {
        setActiveMeetingId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const handleRenameMeeting = (id, newTitle) => {
    storage.updateMeeting(id, { title: newTitle });
    setMeetings(storage.getMeetings());
  };

  const handleUpdateActiveMeeting = (updates) => {
    if (!activeMeetingId) return;
    storage.updateMeeting(activeMeetingId, updates);
    // Reload state from localstorage
    setMeetings(storage.getMeetings());
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleStartRecord = () => {
    setIsRecordingOpen(true);
  };

  // Called when Recording finishes
  const handleSaveRecording = (audioFile) => {
    setIsRecordingOpen(false);
    
    // Proactively call AudioWorkspace's file processing handler
    if (window.processRecordedAudio) {
      window.processRecordedAudio(audioFile);
    } else {
      console.warn('AudioWorkspace upload handler is not mounted yet');
    }
  };

  return (
    <div className="h-screen w-screen bg-surface-50 flex overflow-hidden select-none">
      
      {/* 1. Sidebar - Left Panel */}
      <Sidebar
        meetings={meetings}
        activeId={activeMeetingId}
        onSelect={setActiveMeetingId}
        onCreate={handleCreateMeeting}
        onDelete={handleDeleteMeeting}
        onRename={handleRenameMeeting}
        serverStatus={serverStatus}
        onOpenSettings={handleOpenSettings}
      />

      {/* 2. Main Workspace - Right Area */}
      <div className="flex-1 flex overflow-hidden h-full">
        {activeMeeting ? (
          <>
            {/* Left Workspace Column: Audio inputs & raw text */}
            <div className="w-1/2 h-full flex flex-col">
              <AudioWorkspace
                meeting={activeMeeting}
                onUpdateMeeting={handleUpdateActiveMeeting}
                onStartRecord={handleStartRecord}
                serverOnline={serverStatus.online}
              />
            </div>

            {/* Right Workspace Column: AI chat (top) & Final formatted output (bottom) */}
            <div className="w-1/2 h-full flex flex-col">
              {/* Top 55% - AI Chat */}
              <div className="h-[55%] w-full">
                <AIChatWorkspace
                  meeting={activeMeeting}
                  onUpdateMeeting={handleUpdateActiveMeeting}
                  serverOnline={serverStatus.online}
                />
              </div>

              {/* Bottom 45% - Final rendered output */}
              <div className="h-[45%] w-full">
                <FinalOutput meeting={activeMeeting} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-surface-400">
            <p className="text-sm font-medium">Vui lòng chọn hoặc tạo cuộc họp mới để bắt đầu làm việc.</p>
          </div>
        )}
      </div>

      {/* Modals & Overlays */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUrlChange={checkConnection}
      />

      <RecordingModal
        isOpen={isRecordingOpen}
        onClose={() => setIsRecordingOpen(false)}
        onSave={handleSaveRecording}
      />

    </div>
  );
}
