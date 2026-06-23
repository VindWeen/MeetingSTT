import React from 'react';
import { X, Plus, MessageSquare, Trash2, Settings, Edit3, Check, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function MobileDrawer({
  isOpen,
  onClose,
  meetings,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  serverStatus,
  onOpenSettings,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const today = [];
  const older = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  meetings.forEach(meeting => {
    const createdDate = new Date(meeting.createdAt);
    if (createdDate >= startOfToday) today.push(meeting);
    else older.push(meeting);
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

  const handleSelect = (id) => {
    onSelect(id);
    onClose();
  };

  const renderItem = (m) => {
    const isActive = m.id === activeId;
    const isEditing = m.id === editingId;
    return (
      <div
        key={m.id}
        onClick={() => !isEditing && handleSelect(m.id)}
        className={`group relative flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer transition-all ${
          isActive
            ? 'bg-brand-50 text-brand-700 border border-brand-200'
            : 'text-surface-600 hover:bg-surface-100'
        }`}
      >
        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-500' : 'text-surface-400'}`} />
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(e, m.id)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white border border-brand-300 rounded-lg px-2 py-1 text-sm outline-none"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-medium truncate">{m.title}</span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {isEditing ? (
            <>
              <button onClick={(e) => handleSaveRename(e, m.id)} className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-600">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCancelRename} className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={(e) => handleStartEdit(e, m)} className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(m.id); }} className="p-1.5 hover:bg-red-50 rounded-lg text-surface-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed top-0 left-0 bottom-0 z-50 w-[80vw] max-w-xs bg-white flex flex-col shadow-2xl md:hidden animate-slide-in-left">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-surface-800">AI Meeting</h1>
              <p className="text-[10px] text-surface-400 uppercase tracking-wide font-medium">Biên tập thông minh</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-surface-400 hover:bg-surface-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New meeting */}
        <div className="px-4 py-3">
          <button
            onClick={() => { onCreate(); onClose(); }}
            className="w-full py-3 px-4 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 text-sm font-semibold text-surface-700 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-brand-500" />
            Cuộc họp mới
          </button>
        </div>

        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
          {today.length > 0 && (
            <div className="space-y-1">
              <h3 className="section-label px-3 py-1.5">Hôm nay</h3>
              {today.map(renderItem)}
            </div>
          )}
          {older.length > 0 && (
            <div className="space-y-1">
              <h3 className="section-label px-3 py-1.5">Trước đó</h3>
              {older.map(renderItem)}
            </div>
          )}
          {meetings.length === 0 && (
            <div className="text-center py-10 text-surface-400 text-xs italic">Chưa có cuộc họp nào</div>
          )}
        </div>

        {/* Status + Settings */}
        <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {serverStatus.checking ? (
              <><RefreshCw className="w-3 h-3 text-amber-500 animate-spin" /><span className="text-[10px] text-amber-600 font-medium">Đang kết nối...</span></>
            ) : serverStatus.online ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[10px] text-emerald-600 font-semibold">Máy chủ hoạt động</span></>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-[10px] text-red-500 font-semibold">Máy chủ ngủ đông</span></>
            )}
          </div>
          <button onClick={() => { onOpenSettings(); onClose(); }} className="p-2 rounded-lg text-surface-400 hover:bg-surface-100">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
