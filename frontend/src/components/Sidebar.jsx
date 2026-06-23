import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Settings, Edit3, Check, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function Sidebar({
  meetings,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  serverStatus,
  onOpenSettings
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Group meetings by date
  const today = [];
  const older = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  meetings.forEach(meeting => {
    const createdDate = new Date(meeting.createdAt);
    if (createdDate >= startOfToday) {
      today.push(meeting);
    } else {
      older.push(meeting);
    }
  });

  const handleStartEdit = (e, m) => {
    e.stopPropagation();
    setEditingId(m.id);
    setEditTitle(m.title);
  };

  const handleSaveRename = (e, id) => {
    e.stopPropagation();
    if (editTitle.trim()) onRename(id, editTitle.trim());
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const renderMeetingItem = (m) => {
    const isActive = m.id === activeId;
    const isEditing = m.id === editingId;

    return (
      <div
        key={m.id}
        onClick={() => !isEditing && onSelect(m.id)}
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
          isActive
            ? 'bg-brand-50 text-brand-700 border border-brand-200'
            : 'text-surface-600 hover:bg-surface-100 hover:text-surface-800'
        }`}
      >
        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-brand-500' : 'text-surface-400 group-hover:text-surface-500'}`} />
        
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(e, m.id)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white border border-brand-300 rounded-md px-2 py-0.5 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-200"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-xs font-medium truncate">{m.title}</span>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
          {isEditing ? (
            <>
              <button
                onClick={(e) => handleSaveRename(e, m.id)}
                className="p-1 hover:bg-emerald-100 rounded text-emerald-600 transition-colors"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelRename}
                className="p-1 hover:bg-surface-200 rounded text-surface-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => handleStartEdit(e, m)}
                className="p-1 hover:bg-surface-200 rounded text-surface-400 hover:text-surface-600 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
                className="p-1 hover:bg-red-50 rounded text-surface-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[260px] bg-white border-r border-surface-200 flex flex-col h-full flex-shrink-0">
      
      {/* Logo / App name */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-surface-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-brand-sm flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-bold text-surface-800 tracking-tight">AI Meeting</h1>
          <p className="text-[10px] text-surface-400 font-medium tracking-wide uppercase">Biên tập thông minh</p>
        </div>
      </div>

      {/* New Meeting Button */}
      <div className="px-4 py-3">
        <button
          onClick={onCreate}
          className="w-full py-2.5 px-3 rounded-lg border border-surface-200 bg-surface-50 hover:bg-surface-100 text-xs font-semibold text-surface-700 tracking-wide transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5 text-brand-500" />
          Cuộc họp mới
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {today.length > 0 && (
          <div className="space-y-0.5">
            <h3 className="section-label px-3 py-1.5">Hôm nay</h3>
            {today.map(renderMeetingItem)}
          </div>
        )}
        {older.length > 0 && (
          <div className="space-y-0.5">
            <h3 className="section-label px-3 py-1.5">Trước đó</h3>
            {older.map(renderMeetingItem)}
          </div>
        )}
        {meetings.length === 0 && (
          <div className="text-center py-10 text-surface-400 text-[11px] font-medium italic">
            Chưa có cuộc họp nào
          </div>
        )}
      </div>

      {/* Connection status */}
      <div className="px-4 py-2.5 border-t border-surface-100 flex items-center gap-2">
        {serverStatus.checking ? (
          <>
            <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
            <span className="text-[10px] text-amber-600 font-medium">Đang kết nối...</span>
          </>
        ) : serverStatus.online ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-[10px] text-emerald-600 font-semibold">Máy chủ hoạt động</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            <span className="text-[10px] text-red-500 font-semibold">Máy chủ ngủ đông</span>
          </>
        )}
      </div>

      {/* User info & settings */}
      <div className="p-4 border-t border-surface-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-[9px] font-bold text-brand-700 flex-shrink-0">
            AD
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold text-surface-700">Alex Johnson</div>
            <div className="text-[9px] text-brand-500 font-medium">Pro Account</div>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-all"
          title="Cấu hình Backend"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
