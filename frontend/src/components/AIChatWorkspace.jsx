import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, FileText } from 'lucide-react';
import { api } from '../services/api';

export default function AIChatWorkspace({
  meeting,
  onUpdateMeeting,
  serverOnline
}) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    { label: '📝 Biên bản họp', text: 'Hãy tóm tắt cuộc họp này thành biên bản hành chính chuẩn, bao gồm: Ngày họp, Đại biểu tham gia, Nội dung chính thảo luận, Quyết định thống nhất và Phân công công việc.' },
    { label: '📰 Bài báo tin tức', text: 'Hãy viết lại nội dung cuộc họp này thành một bài báo tin tức chuyên nghiệp, hành văn mượt mà, hấp dẫn và có tiêu đề ấn tượng.' },
    { label: '✅ Danh sách việc cần làm', text: 'Hãy trích xuất toàn bộ các đầu việc cần làm (Action Items) được thảo luận trong cuộc họp, kèm theo người chịu trách nhiệm và thời hạn hoàn thành (nếu có).' },
    { label: '📊 Tóm tắt ý chính', text: 'Hãy tóm tắt ngắn gọn cuộc họp này dưới dạng gạch đầu dòng các ý chính quan trọng nhất trong vòng 200 từ.' }
  ];

  const messages = meeting?.chatHistory || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (messageText) => {
    if (!messageText.trim() || isSending || !meeting) return;
    if (!meeting.rawText) {
      alert('Vui lòng cung cấp văn bản gốc (bằng cách ghi âm hoặc upload file) trước khi chat với AI.');
      return;
    }
    if (!serverOnline) {
      alert('Máy chủ đang ngoại tuyến. Vui lòng kết nối để trò chuyện với AI.');
      return;
    }

    const userMessage = { role: 'user', content: messageText };
    const updatedHistory = [...messages, userMessage];
    onUpdateMeeting({ chatHistory: updatedHistory });
    setInput('');
    setIsSending(true);

    const contextPrompt = {
      role: 'system',
      content: `VĂN BẢN GỐC CUỘC HỌP (Tài liệu tham khảo chính): \n"""\n${meeting.rawText}\n"""`
    };

    const payload = [contextPrompt, ...updatedHistory];
    let assistantMessage = { role: 'assistant', content: '' };

    try {
      await api.streamChat(
        payload,
        (chunk) => {
          assistantMessage.content += chunk;
          onUpdateMeeting({ chatHistory: [...updatedHistory, { ...assistantMessage }] });
        },
        () => { setIsSending(false); },
        (err) => {
          console.error(err);
          assistantMessage.content += '\n\n[Có lỗi kết nối xảy ra khi stream tin nhắn]';
          onUpdateMeeting({ chatHistory: [...updatedHistory, { ...assistantMessage }] });
          setIsSending(false);
        }
      );
    } catch (e) {
      console.error(e);
      setIsSending(false);
    }
  };

  const handleGenerateFinal = async () => {
    if (!meeting || isSending) return;
    if (!meeting.rawText) {
      alert('Vui lòng cung cấp văn bản gốc trước.');
      return;
    }

    setIsSending(true);
    const userMessage = { role: 'user', content: 'Hãy tạo bài viết hoàn chỉnh cuối cùng dựa trên các bố cục đã thảo luận!' };
    const updatedHistory = [...messages, userMessage];
    onUpdateMeeting({ chatHistory: updatedHistory });

    const contextPrompt = {
      role: 'system',
      content: `Nhiệm vụ của bạn: Hãy tổng hợp văn bản gốc dưới đây cùng toàn bộ thảo luận đã qua để tạo thành một văn bản báo cáo hoặc bài tóm tắt cuối cùng hoàn chỉnh nhất bằng Markdown. Trình bày thật sạch sẽ, phân chia tiêu đề rõ ràng, không chứa các câu hội thoại thừa.\n      \n      VĂN BẢN GỐC: \n"""\n${meeting.rawText}\n"""`
    };

    const payload = [contextPrompt, ...messages, userMessage];
    let finalContent = '';

    try {
      await api.streamChat(
        payload,
        (chunk) => {
          finalContent += chunk;
          onUpdateMeeting({ finalMarkdown: finalContent });
        },
        () => {
          setIsSending(false);
          onUpdateMeeting({
            chatHistory: [...updatedHistory, { role: 'assistant', content: 'Tôi đã tạo và định dạng xong bài viết cuối cùng ở khung kết quả phía dưới. Bạn có thể xem và tải về!' }]
          });
        },
        (err) => {
          console.error(err);
          setIsSending(false);
        }
      );
    } catch (e) {
      console.error(e);
      setIsSending(false);
    }
  };

  if (!meeting) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-white border-r border-surface-200 border-b overflow-hidden">
      
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <h2 className="text-xs font-bold text-surface-700 tracking-wider uppercase">Trợ lý biên tập AI</h2>
        </div>
        {meeting.rawText && (
          <button
            onClick={handleGenerateFinal}
            disabled={isSending}
            className="text-[10px] text-white bg-brand-600 hover:bg-brand-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all shadow-brand-sm disabled:opacity-50 disabled:scale-100"
          >
            <FileText className="w-3 h-3" /> Tạo bài viết cuối
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 max-w-xs mx-auto py-10">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-500">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-surface-700">Thảo luận định dạng với AI</h3>
              <p className="text-[11px] text-surface-400 leading-relaxed">
                Sau khi có văn bản gốc bên cột trái, hãy gửi yêu cầu hoặc chọn nhanh một mẫu bên dưới để AI biên tập bài viết của bạn.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div key={index} className={`flex items-end gap-2.5 fade-up ${isUser ? 'justify-end' : ''}`}>
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-[9px] font-bold text-brand-600 flex-shrink-0 mb-0.5">
                  AI
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-br-md shadow-brand-sm'
                    : 'bg-surface-50 border border-surface-200 text-surface-700 rounded-bl-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {isUser && (
                <div className="w-6 h-6 rounded-full bg-surface-200 flex items-center justify-center text-[9px] font-bold text-surface-600 flex-shrink-0 mb-0.5">
                  U
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-end gap-2.5">
            <div className="w-6 h-6 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-[9px] font-bold text-brand-600 flex-shrink-0 mb-0.5">
              AI
            </div>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      {messages.length === 0 && (
        <div className="px-5 pb-2 flex flex-wrap gap-1.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.text)}
              className="px-3 py-1.5 rounded-full bg-surface-50 border border-surface-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 text-[10px] text-surface-600 font-medium transition-all active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="p-4 border-t border-surface-100 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="Yêu cầu AI viết lại, bổ sung chi tiết hoặc định dạng..."
          className="flex-1 px-4 py-2.5 rounded-xl text-xs text-surface-800 field-input outline-none placeholder:text-surface-400"
          disabled={isSending}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={isSending || !input.trim()}
          className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-surface-100 text-white disabled:text-surface-300 transition-all active:scale-95 shadow-brand-sm disabled:shadow-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
