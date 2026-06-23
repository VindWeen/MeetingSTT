import React, { useState, useEffect } from 'react';
import { Settings, X, Globe, Key, Wifi, WifiOff } from 'lucide-react';
import { storage } from '../services/storage';
import { api } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onUrlChange }) {
  const [backendUrl, setBackendUrl] = useState('');
  const [status, setStatus] = useState({ checking: false, checked: false, online: false, hasKey: false });

  useEffect(() => {
    if (isOpen) {
      const savedUrl = storage.getBackendUrl();
      setBackendUrl(savedUrl);
      checkConnection(savedUrl);
    }
  }, [isOpen]);

  const checkConnection = async (urlToCheck) => {
    setStatus(s => ({ ...s, checking: true }));
    const originalUrl = storage.getBackendUrl();
    storage.setBackendUrl(urlToCheck);

    const result = await api.ping();

    setStatus({
      checking: false,
      checked: true,
      online: result.online,
      hasKey: result.hasKey || false
    });

    storage.setBackendUrl(originalUrl);
  };

  const handleSave = () => {
    storage.setBackendUrl(backendUrl);
    onUrlChange(backendUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-xl border border-surface-200 fade-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-bold text-surface-800 tracking-tight">Cấu hình hệ thống</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Backend URL */}
          <div className="space-y-2">
            <label className="section-label flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Địa chỉ Máy chủ Backend
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:5000 hoặc https://app.onrender.com"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-surface-800 field-input outline-none placeholder:text-surface-300"
              />
              <button
                onClick={() => checkConnection(backendUrl)}
                className="px-4 py-2.5 rounded-xl bg-surface-50 border border-surface-200 text-xs font-semibold text-surface-600 hover:text-surface-800 hover:bg-surface-100 transition-all active:scale-95"
              >
                Kiểm tra
              </button>
            </div>
            <p className="text-[11px] text-surface-400 leading-relaxed">
              Nhập địa chỉ máy chủ Node.js của bạn. Mặc định: <code className="font-mono text-brand-600 bg-brand-50 px-1 rounded">http://localhost:5000</code>
            </p>
          </div>

          {/* Status Panel */}
          <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-3">
            <h3 className="section-label">Trạng thái hiện tại</h3>

            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Kết nối máy chủ</span>
              {status.checking ? (
                <span className="text-xs text-brand-500 animate-pulse font-medium">Đang kiểm tra...</span>
              ) : status.checked ? (
                status.online ? (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <Wifi className="w-3 h-3" /> Sẵn sàng
                  </span>
                ) : (
                  <span className="text-xs text-red-500 font-semibold flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                    <WifiOff className="w-3 h-3" /> Mất kết nối
                  </span>
                )
              ) : (
                <span className="text-xs text-surface-400">Chưa kiểm tra</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">OpenAI API Key</span>
              {!status.online ? (
                <span className="text-xs text-surface-400">—</span>
              ) : status.hasKey ? (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Key className="w-3 h-3" /> Đã nhận (.env)
                </span>
              ) : (
                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Chưa điền Key (.env)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-surface-100 bg-surface-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-surface-500 hover:text-surface-700 transition-all"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-brand-sm active:scale-95 transition-all"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
