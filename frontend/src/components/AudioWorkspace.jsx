import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Upload, Mic, FileAudio, CheckCircle, RefreshCw, Save,
  AlertCircle, Sparkles, ToggleLeft, ToggleRight, X,
  Play, Pause, Volume2, VolumeX, SkipBack, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

// ─── Custom Audio Player ───────────────────────────────────────────────────
function AudioPlayer({ src, durationHint }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [customSpeed, setCustomSpeed] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [src]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
  };

  const changeVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    const next = !muted;
    setMuted(next);
    a.muted = next;
  };

  const applySpeed = (s) => {
    const v = parseFloat(s);
    if (!v || v < 0.1 || v > 4) return;
    setSpeed(v);
    if (audioRef.current) audioRef.current.playbackRate = v;
    setShowCustom(false);
    setCustomSpeed('');
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl bg-surface-50 border border-surface-200 overflow-hidden">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-600 flex items-center justify-center text-white flex-shrink-0 transition-all active:scale-95"
        >
          {playing
            ? <Pause className="w-3.5 h-3.5 fill-current" />
            : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        {/* Time + Seek */}
        <div className="flex-1 min-w-0 space-y-1">
          <div
            className="relative w-full h-2 bg-surface-200 rounded-full cursor-pointer group"
            onClick={seek}
          >
            <div
              className="absolute left-0 top-0 h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-brand-600 rounded-full shadow opacity-0 group-hover:opacity-100 transition-all"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-surface-400 font-mono">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration || (durationHint > 0 ? durationHint : 0))}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={toggleMute} className="text-surface-400 hover:text-surface-600 transition-colors">
            {muted || volume === 0
              ? <VolumeX className="w-3.5 h-3.5" />
              : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={changeVolume}
            className="w-16 h-1 accent-brand-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Speed row */}
      <div className="flex items-center gap-1.5 px-4 pb-3">
        <span className="text-[9px] text-surface-400 font-semibold uppercase tracking-wider mr-1">Tốc độ</span>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => applySpeed(s)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${speed === s && !showCustom
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-white text-surface-600 border-surface-200 hover:border-brand-300 hover:text-brand-600'
              }`}
          >
            {s}x
          </button>
        ))}
        {/* Custom speed */}
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${!SPEEDS.includes(speed)
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-white text-surface-600 border-surface-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            title="Nhập tốc độ tùy chỉnh"
          >
            {!SPEEDS.includes(speed) ? `${speed}x` : '…'}
          </button>
        ) : (
          <input
            autoFocus
            type="number" min="0.1" max="4" step="0.05"
            value={customSpeed}
            onChange={e => setCustomSpeed(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applySpeed(customSpeed); if (e.key === 'Escape') setShowCustom(false); }}
            onBlur={() => { if (customSpeed) applySpeed(customSpeed); else setShowCustom(false); }}
            placeholder="1.75"
            className="w-16 text-[10px] px-2 py-0.5 rounded-md border border-brand-300 outline-none ring-1 ring-brand-400"
          />
        )}
        {/* Back to start */}
        <button
          onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; }}
          className="ml-auto text-surface-400 hover:text-surface-600 transition-colors"
          title="Tua về đầu"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Duplicate File Dialog ─────────────────────────────────────────────────
function DuplicateDialog({ fileName, onSkip, onRerun }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 p-6 w-80 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-800">File trùng lặp</h3>
            <p className="text-[11px] text-surface-500 mt-1 leading-relaxed">
              File <span className="font-semibold text-surface-700">"{fileName}"</span> có vẻ giống file đã tải lên trước đó. Bạn muốn dịch lại?
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onSkip}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-surface-100 text-surface-600 hover:bg-surface-200 border border-surface-200 transition-all active:scale-95"
          >
            Bỏ qua
          </button>
          <button
            onClick={onRerun}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-all active:scale-95"
          >
            Dịch lại
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function AudioWorkspace({
  meeting,
  onUpdateMeeting,
  onStartRecord,
  serverOnline
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // Audio state
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioFile, setAudioFile] = useState(null); // track File object for dupe check
  const [prevFileName, setPrevFileName] = useState(null);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-correct
  const [autoCorrect, setAutoCorrect] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanStatus, setCleanStatus] = useState('');

  // Duplicate dialog
  const [dupeDialog, setDupeDialog] = useState(null); // { file, localUrl }

  // ── Drag handlers ──────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) maybeProcessFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) maybeProcessFile(e.target.files[0]);
    // reset so same file triggers onChange again
    e.target.value = '';
  };

  // ── Duplicate detection ────────────────────────────────────────────────
  const maybeProcessFile = (file) => {
    if (prevFileName && file.name === prevFileName) {
      const localUrl = URL.createObjectURL(file);
      setDupeDialog({ file, localUrl });
    } else {
      processAudioFile(file);
    }
  };

  // ── Remove audio ───────────────────────────────────────────────────────
  const handleRemoveAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioFile(null);
    setPrevFileName(null);
    setProgressStatus('');
    setProgressPercent(0);
    setErrorMsg('');
    onUpdateMeeting({ audioDuration: 0 });
  };

  // ── Core STT processing ────────────────────────────────────────────────
  const processAudioFile = useCallback(async (file) => {
    if (!serverOnline) {
      setErrorMsg('Máy chủ đang ngoại tuyến hoặc đang ngủ đông. Vui lòng kiểm tra lại kết nối!');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setProgressPercent(0);
    setProgressStatus('Đang chuẩn bị tải file...');

    const localUrl = URL.createObjectURL(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(localUrl);
    setAudioFile(file);
    setPrevFileName(file.name);

    let sessionId = null;
    try {
      setProgressStatus('Đang tải file lên máy chủ (0%)...');
      const prepareRes = await api.prepareAudio(file, (percent) => {
        setProgressPercent(percent * 0.4);
        setProgressStatus(`Đang tải file lên máy chủ (${percent}%)...`);
      });

      sessionId = prepareRes.sessionId;
      const totalChunks = prepareRes.totalChunks;
      onUpdateMeeting({ audioDuration: prepareRes.duration });

      let accumulatedText = '';
      for (let i = 0; i < totalChunks; i++) {
        setProgressStatus(`Đang phiên dịch phần ${i + 1}/${totalChunks}...`);
        setProgressPercent(Math.round(40 + i * (50 / totalChunks)));

        const chunkRes = await api.transcribeChunk(sessionId, i, autoCorrect);
        accumulatedText += (chunkRes.text || '') + ' ';
        onUpdateMeeting({ rawText: accumulatedText.trim() });
      }

      setProgressPercent(100);
      setProgressStatus('Phiên dịch hoàn tất!');
      await api.cleanup(sessionId);
      setTimeout(() => setIsProcessing(false), 1000);

    } catch (err) {
      console.error('Audio processing failed:', err);
      setErrorMsg(err.message || 'Có lỗi xảy ra trong quá trình phiên dịch.');
      setIsProcessing(false);
      if (sessionId) api.cleanup(sessionId);
    }
  }, [serverOnline, autoCorrect, audioUrl, onUpdateMeeting]);

  useEffect(() => {
    window.processRecordedAudio = processAudioFile;
    return () => { window.processRecordedAudio = null; };
  }, [processAudioFile]);

  // Reset audio player khi chuyển sang cuộc họp khác
  useEffect(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioFile(null);
    setPrevFileName(null);
    setProgressStatus('');
    setProgressPercent(0);
    setErrorMsg('');
    setIsProcessing(false);
  // chỉ chạy khi meeting.id thay đổi, không phụ thuộc audioUrl để tránh vòng lặp
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting?.id]);

  // ── AI Clean ──────────────────────────────────────────────────────────
  const handleCleanExistingText = async () => {
    if (!meeting?.rawText?.trim()) return;
    if (!serverOnline) { setErrorMsg('Máy chủ đang ngoại tuyến.'); return; }
    setIsCleaning(true);
    setCleanStatus('Đang gửi văn bản để AI sửa lỗi...');
    setErrorMsg('');
    try {
      const res = await api.cleanText(meeting.rawText);
      onUpdateMeeting({ rawText: res.cleanedText });
      setCleanStatus('Sửa lỗi hoàn tất! ✓');
      setTimeout(() => setCleanStatus(''), 3000);
    } catch (err) {
      setErrorMsg('Sửa lỗi thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSaveText = () => alert('Văn bản gốc đã được lưu làm tài liệu tham khảo cho AI.');

  // ── Duplicate dialog handlers ─────────────────────────────────────────
  const handleDupeSkip = () => {
    // Just swap the audio URL but don't re-run STT
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(dupeDialog.localUrl);
    setDupeDialog(null);
  };
  const handleDupeRerun = () => {
    const { file } = dupeDialog;
    setDupeDialog(null);
    processAudioFile(file);
  };

  // ── Empty state ───────────────────────────────────────────────────────
  if (!meeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-surface-400">
        <FileAudio className="w-10 h-10 text-surface-300 mb-3" />
        <p className="text-sm font-medium">Vui lòng chọn hoặc tạo cuộc họp ở thanh bên để bắt đầu.</p>
      </div>
    );
  }

  return (
    <>
      {/* Duplicate File Dialog */}
      {dupeDialog && (
        <DuplicateDialog
          fileName={dupeDialog.file.name}
          onSkip={handleDupeSkip}
          onRerun={handleDupeRerun}
        />
      )}

      <div className="flex-1 flex flex-col h-full bg-white border-r border-surface-200 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xs font-bold text-surface-700 tracking-wider uppercase">Đầu vào &amp; Văn bản gốc</h2>
          <span className="text-[9px] text-surface-300 font-mono">ID: {meeting.id.slice(0, 8)}</span>
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Audio Input Controls */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            {/* Record Button */}
            <button
              onClick={onStartRecord}
              className="py-4 px-4 rounded-xl border border-surface-200 bg-surface-50 hover:bg-brand-50 hover:border-brand-200 text-surface-600 hover:text-brand-700 font-semibold text-xs tracking-wide transition-all flex flex-col items-center justify-center gap-2 active:scale-95 group"
            >
              <div className="w-9 h-9 rounded-full bg-white border border-surface-200 group-hover:border-brand-200 group-hover:bg-brand-50 flex items-center justify-center transition-all">
                <Mic className="w-4.5 h-4.5 text-brand-500" />
              </div>
              Ghi âm trực tiếp
            </button>

            {/* Upload File Zone */}
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-200 ${dragActive
                ? 'border-brand-400 bg-brand-50'
                : 'border-surface-200 bg-surface-50 hover:bg-surface-100 hover:border-surface-300'
                }`}
            >
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
              <div className="w-9 h-9 rounded-full bg-white border border-surface-200 flex items-center justify-center mb-1.5">
                <Upload className="w-4 h-4 text-surface-400" />
              </div>
              <span className="text-[10px] font-bold text-surface-600 uppercase tracking-wider text-center">Tải file âm thanh</span>
              <span className="text-[9px] text-surface-400 text-center mt-0.5">Kéo thả hoặc bấm chọn</span>
            </div>
          </div>

          {/* Custom Audio Player */}
          {audioUrl && (
            <div className="flex-shrink-0 relative">
              <button
                onClick={handleRemoveAudio}
                className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow transition-all active:scale-90"
                title="Xoá file âm thanh này"
              >
                <X className="w-3 h-3" />
              </button>
              <AudioPlayer src={audioUrl} durationHint={meeting.audioDuration} />
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="flex-shrink-0 p-4 rounded-xl bg-brand-50 border border-brand-200 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-700 font-semibold flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {progressStatus}
                </span>
                <span className="text-brand-600 font-bold font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-brand-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {errorMsg && (
            <div className="flex-shrink-0 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-red-600">Lỗi biên dịch</h4>
                <p className="text-[11px] text-red-500 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* AI Auto-Correct Toggle */}
          <div className="flex-shrink-0 p-3.5 rounded-xl bg-surface-50 border border-surface-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <div>
                <p className="text-[11px] font-bold text-surface-700">AI Auto-Correct</p>
                <p className="text-[9px] text-surface-400 leading-tight">Tự động sửa lỗi chính tả &amp; lọc từ đệm bằng AI</p>
              </div>
            </div>
            <button
              id="auto-correct-toggle"
              onClick={() => setAutoCorrect(v => !v)}
              className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full border transition-all ${autoCorrect
                ? 'bg-violet-100 border-violet-300 text-violet-700'
                : 'bg-surface-100 border-surface-200 text-surface-500 hover:border-surface-300'
                }`}
              title={autoCorrect ? 'Tắt Auto-Correct' : 'Bật Auto-Correct'}
            >
              {autoCorrect ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {autoCorrect ? 'BẬT' : 'TẮT'}
            </button>
          </div>

          {/* Raw Text Editor — flex-1 so it fills remaining space */}
          <div className="flex flex-col flex-1 min-h-[200px] gap-2">
            <div className="flex items-center justify-between flex-shrink-0">
              <label className="section-label flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-brand-500" /> Văn bản gốc sau dịch
              </label>
              <div className="flex items-center gap-1.5">
                {meeting.rawText && !isCleaning && (
                  <button
                    id="clean-text-btn"
                    onClick={handleCleanExistingText}
                    disabled={isProcessing}
                    className="text-[10px] text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-md bg-violet-50 border border-violet-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Dùng AI để sửa lỗi chính tả và lọc từ đệm trong văn bản hiện tại"
                  >
                    <Sparkles className="w-3 h-3" /> Làm sạch
                  </button>
                )}
                {isCleaning && (
                  <span className="text-[10px] text-violet-600 font-semibold flex items-center gap-1 px-2 py-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Đang xử lý...
                  </span>
                )}
                {meeting.rawText && (
                  <button
                    onClick={handleSaveText}
                    className="text-[10px] text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 border border-brand-200 active:scale-95 transition-all"
                  >
                    <Save className="w-3 h-3" /> Lưu
                  </button>
                )}
              </div>
            </div>

            {cleanStatus && (
              <div className="flex-shrink-0 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200 text-[11px] text-violet-700 font-semibold flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> {cleanStatus}
              </div>
            )}

            <textarea
              value={meeting.rawText}
              onChange={(e) => onUpdateMeeting({ rawText: e.target.value })}
              placeholder="Nội dung dịch giọng nói (Whisper API) sẽ hiển thị ở đây. Bạn có thể trực tiếp sửa đổi lỗi chính tả hoặc chỉnh văn bản này cho hoàn chỉnh..."
              className="flex-1 w-full p-4 rounded-xl text-sm leading-relaxed text-surface-800 field-input resize-none bg-white font-sans"
            />
          </div>

        </div>
      </div>
    </>
  );
}
