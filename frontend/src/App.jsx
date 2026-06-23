import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AudioWorkspace from './components/AudioWorkspace';
import AIChatWorkspace from './components/AIChatWorkspace';
import FinalOutput from './components/FinalOutput';
import RecordingModal from './components/RecordingModal';
import SettingsModal from './components/SettingsModal';
import MobileNav from './components/MobileNav';
import MobileDrawer from './components/MobileDrawer';
import { storage } from './services/storage';
import { api } from './services/api';
import { Menu } from 'lucide-react';

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [activeMeetingId, setActiveMeetingId] = useState(null);

  // Modals & Panels toggle
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);

  // Mobile state
  const [mobileTab, setMobileTab] = useState('audio'); // 'audio' | 'chat' | 'output'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Connection states
  const [serverStatus, setServerStatus] = useState({ checking: true, online: false });

  // 1. Initial Load & Connection Check
  useEffect(() => {
    const initializeApp = async () => {
      // 1. Verify connection and DB presence
      setServerStatus(s => ({ ...s, checking: true }));
      const status = await api.ping();
      setServerStatus({ checking: false, online: status.online });
      storage.setDatabaseActive(status.online && status.hasDatabase);

      // 2. Fetch and load meetings list
      const list = await storage.getMeetings();
      setMeetings(list);
      if (list.length > 0) {
        setActiveMeetingId(list[0].id);
      } else {
        const defaultMeeting = await storage.createMeeting('Cuộc họp chào mừng 🚀');
        const updatedList = await storage.getMeetings();
        setMeetings(updatedList);
        setActiveMeetingId(defaultMeeting.id);
      }
    };

    initializeApp();

    const interval = setInterval(async () => {
      const status = await api.ping();
      setServerStatus({ checking: false, online: status.online });
      
      const wasDbActive = storage.isDatabaseActive();
      const isDbActive = status.online && status.hasDatabase;
      storage.setDatabaseActive(isDbActive);

      // Reload meetings if the database active status flipped
      if (wasDbActive !== isDbActive) {
        const list = await storage.getMeetings();
        setMeetings(list);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    setServerStatus(s => ({ ...s, checking: true }));
    const status = await api.ping();
    setServerStatus({ checking: false, online: status.online });
    
    const wasDbActive = storage.isDatabaseActive();
    const isDbActive = status.online && status.hasDatabase;
    storage.setDatabaseActive(isDbActive);

    if (wasDbActive !== isDbActive) {
      const list = await storage.getMeetings();
      setMeetings(list);
    }
  };

  const activeMeeting = meetings.find(m => m.id === activeMeetingId);

  // 2. Action Handlers
  const handleCreateMeeting = async () => {
    const newMeet = await storage.createMeeting();
    const updatedList = await storage.getMeetings();
    setMeetings(updatedList);
    setActiveMeetingId(newMeet.id);
  };

  const handleDeleteMeeting = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cuộc họp này? Dữ liệu lịch sử sẽ mất hoàn toàn.')) {
      const remaining = await storage.deleteMeeting(id);
      setMeetings(remaining);
      if (activeMeetingId === id) {
        setActiveMeetingId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const handleRenameMeeting = async (id, newTitle) => {
    await storage.updateMeeting(id, { title: newTitle });
    const updatedList = await storage.getMeetings();
    setMeetings(updatedList);
  };

  const handleUpdateActiveMeeting = (updates) => {
    if (!activeMeetingId) return;
    
    // Update local React state immediately for responsive typing & UI rendering
    setMeetings(prev =>
      prev.map(m => m.id === activeMeetingId ? { ...m, ...updates } : m)
    );

    // Save asynchronously (localStorage immediately, DB debounced)
    storage.updateMeeting(activeMeetingId, updates);
  };

  const handleStartRecord = () => {
    setIsRecordingOpen(true);
  };

  const handleSaveRecording = (audioFile) => {
    setIsRecordingOpen(false);
    if (window.processRecordedAudio) {
      window.processRecordedAudio(audioFile);
    } else {
      console.warn('AudioWorkspace upload handler is not mounted yet');
    }
  };

  // When user picks a meeting from mobile drawer → switch to audio tab
  const handleMobileSelectMeeting = (id) => {
    setActiveMeetingId(id);
    setMobileTab('audio');
  };

  return (
    <div className="h-screen w-screen bg-surface-50 flex overflow-hidden select-none">

      {/* ── DESKTOP: Sidebar ── */}
      <div className="hidden md:flex">
        <Sidebar
          meetings={meetings}
          activeId={activeMeetingId}
          onSelect={setActiveMeetingId}
          onCreate={handleCreateMeeting}
          onDelete={handleDeleteMeeting}
          onRename={handleRenameMeeting}
          serverStatus={serverStatus}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* ── MOBILE: Drawer ── */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        meetings={meetings}
        activeId={activeMeetingId}
        onSelect={handleMobileSelectMeeting}
        onCreate={handleCreateMeeting}
        onDelete={handleDeleteMeeting}
        onRename={handleRenameMeeting}
        serverStatus={serverStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden h-full flex-col">

        {/* ── MOBILE: Top bar ── */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-surface-200 flex-shrink-0">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 active:scale-90 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">AI</span>
            </div>
            <span className="text-sm font-bold text-surface-800 truncate max-w-[160px]">
              {activeMeeting?.title || 'AI Meeting'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              serverStatus.checking ? 'bg-amber-400 animate-pulse' :
              serverStatus.online   ? 'bg-emerald-500' : 'bg-red-400'
            }`} />
          </div>
        </div>

        {/* ── DESKTOP layout: side-by-side columns ── */}
        <div className="hidden md:flex flex-1 overflow-hidden h-full">
          {activeMeeting ? (
            <>
              <div className="w-1/2 h-full flex flex-col">
                <AudioWorkspace
                  meeting={activeMeeting}
                  onUpdateMeeting={handleUpdateActiveMeeting}
                  onStartRecord={handleStartRecord}
                  serverOnline={serverStatus.online}
                />
              </div>
              <div className="w-1/2 h-full flex flex-col">
                <div className="h-[55%] w-full">
                  <AIChatWorkspace
                    meeting={activeMeeting}
                    onUpdateMeeting={handleUpdateActiveMeeting}
                    serverOnline={serverStatus.online}
                  />
                </div>
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

        {/* ── MOBILE layout: single tab panel ── */}
        <div className="flex md:hidden flex-1 overflow-hidden pb-16">
          {activeMeeting ? (
            <>
              {mobileTab === 'audio' && (
                <div className="w-full h-full flex flex-col">
                  <AudioWorkspace
                    meeting={activeMeeting}
                    onUpdateMeeting={handleUpdateActiveMeeting}
                    onStartRecord={handleStartRecord}
                    serverOnline={serverStatus.online}
                  />
                </div>
              )}
              {mobileTab === 'chat' && (
                <div className="w-full h-full flex flex-col">
                  <AIChatWorkspace
                    meeting={activeMeeting}
                    onUpdateMeeting={handleUpdateActiveMeeting}
                    serverOnline={serverStatus.online}
                  />
                </div>
              )}
              {mobileTab === 'output' && (
                <div className="w-full h-full flex flex-col">
                  <FinalOutput meeting={activeMeeting} />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-surface-400">
              <p className="text-sm font-medium">Vui lòng tạo cuộc họp mới để bắt đầu.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE: Bottom Nav ── */}
      <MobileNav activeTab={mobileTab} onTabChange={setMobileTab} />

      {/* Modals */}
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
