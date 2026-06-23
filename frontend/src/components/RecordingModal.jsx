import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Send, Pause, Play } from 'lucide-react';

export default function RecordingModal({ isOpen, onClose, onSave }) {
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startRecording();
    } else {
      stopAndCleanup();
    }
    return () => { stopAndCleanup(); };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isOpen, isPaused]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      setSeconds(0);
      setIsPaused(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const options = { mimeType: 'audio/webm' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const extension = recorder.mimeType ? recorder.mimeType.split('/')[1].split(';')[0] : 'webm';
        const audioFile = new File([audioBlob], `recording_${Date.now()}.${extension}`, {
          type: audioBlob.type
        });
        onSave(audioFile);
      };

      recorder.start(250);
      setupWebAudio(stream);

    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Không thể truy cập Microphone. Vui lòng cấp quyền ghi âm.');
      onClose();
    }
  };

  const setupWebAudio = (stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;

      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      requestAnimationFrame(drawWaveform);
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!ctx || !analyser || !dataArray) return;

    const width = canvas.width;
    const height = canvas.height;

    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, width, height);

    const barWidth = 3;
    const gap = 5;
    const numBars = Math.floor(width / (barWidth + gap));

    // Use indigo color for waveform bars
    ctx.fillStyle = '#6366f1';

    for (let i = 0; i < numBars; i++) {
      const dataIndex = Math.floor((i / numBars) * dataArray.length);
      let value = isPaused ? 5 : dataArray[dataIndex] || 0;
      const percent = value / 255;
      const barHeight = Math.max(3, percent * height * 0.85);
      const x = i * (barWidth + gap) + (width - numBars * (barWidth + gap)) / 2;
      const y = (height - barHeight) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  const handlePauseToggle = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (isPaused) {
      recorder.resume();
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
      setIsPaused(false);
    } else {
      recorder.pause();
      if (audioContextRef.current?.state === 'running') audioContextRef.current.suspend();
      setIsPaused(true);
    }
  };

  const handleStopAndSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    onClose();
  };

  const stopAndCleanup = () => {
    clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close().catch(console.error);

    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
    streamRef.current = null;
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm p-4">
      {/* Sheet-style bottom panel matching user's design */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-surface-200 p-6 flex flex-col items-center space-y-6 fade-up">
        
        {/* Drag handle */}
        <div className="w-10 h-1 bg-surface-200 rounded-full" />

        {/* Header: status + timer */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPaused ? 'bg-amber-400' : 'bg-red-500 record-pulse'}`} />
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-widest">
              {isPaused ? 'Đang tạm dừng...' : 'Đang ghi âm...'}
            </span>
          </div>
          <span className="text-2xl font-bold text-surface-900 font-mono tracking-wider">
            {formatTime(seconds)}
          </span>
        </div>

        {/* Waveform Canvas */}
        <div className="w-full h-28 bg-brand-50 rounded-2xl border border-brand-100 flex items-center justify-center overflow-hidden p-2">
          <canvas
            ref={canvasRef}
            width={400}
            height={90}
            className="w-full h-full"
          />
        </div>

        {/* Controls — matches the design: [trash] [Stop & Send] [pause] */}
        <div className="w-full flex items-center gap-3 px-2">
          {/* Cancel / Trash */}
          <button
            onClick={handleCancel}
            className="w-12 h-12 rounded-full bg-surface-100 border border-surface-200 text-surface-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
            title="Hủy bỏ ghi âm"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Stop & Send — main action */}
          <button
            onClick={handleStopAndSend}
            className="flex-1 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-brand-md active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" /> Dừng & Chuyển văn bản
          </button>

          {/* Pause */}
          <button
            onClick={handlePauseToggle}
            className="w-12 h-12 rounded-full bg-surface-100 border border-surface-200 text-surface-500 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
            title={isPaused ? 'Tiếp tục ghi' : 'Tạm dừng ghi'}
          >
            {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
