import React from 'react';
import { MessageSquare, Mic, Sparkles, FileText } from 'lucide-react';

const tabs = [
  { id: 'meetings', icon: MessageSquare, label: 'Cuộc họp' },
  { id: 'audio',    icon: Mic,           label: 'Ghi âm'   },
  { id: 'chat',     icon: Sparkles,      label: 'AI Chat'  },
  { id: 'output',   icon: FileText,      label: 'Kết quả'  },
];

export default function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-surface-200 flex md:hidden safe-bottom">
      {tabs.map(({ id, icon: Icon, label }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all active:scale-95 ${
              isActive ? 'text-brand-600' : 'text-surface-400'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            {isActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-brand-500 rounded-full" style={{ marginBottom: '0px' }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
