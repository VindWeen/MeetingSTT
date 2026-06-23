import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { getAudioDuration, splitAudio, cleanupFiles } from './utils/audio.js';

// Load environment variables
dotenv.config();

// Initialize Supabase client if credentials are provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isSupabaseConfigured = supabaseUrl && 
  supabaseUrl !== 'your_supabase_url_here' && 
  supabaseKey && 
  supabaseKey !== 'your_supabase_publishable_key_here';

let supabase = null;
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('==================================================');
  console.log('💚 Supabase client initialized successfully.');
  console.log('==================================================');
} else {
  console.log('==================================================');
  console.log('⚠️ Supabase credentials missing/placeholder. Hybrid fallback active.');
  console.log('==================================================');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Allow GitHub Pages frontend + local dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL  // e.g. https://vindween.github.io
].filter(Boolean).map(o => o.toLowerCase());  // normalize to lowercase

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, Render healthcheck)
    if (!origin) return callback(null, true);
    const originLower = origin.toLowerCase();
    if (allowedOrigins.some(o => originLower.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  }
}));
app.use(express.json());

// Setup upload directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// System Prompt for Spelling & Filler Cleaning (from Ways.md)
const CLEANING_SYSTEM_PROMPT = `Bạn là một trợ lý ảo chuyên biên dịch và soát lỗi chính tả văn bản tiếng Việt từ giọng nói (Speech-to-Text). Nhiệm vụ của bạn là nhận vào đoạn văn bản thô và thực hiện chuẩn hóa theo các quy tắc sau:

1. SỬA LỖI CHÍNH TẢ: Sửa các từ gõ sai, từ nói ngọng, hoặc từ bị AI nghe nhầm dựa trên ngữ cảnh của câu (Ví dụ: đặt đúng dấu hỏi/ngã, sửa từ đồng âm sai nghĩa).
2. LỌC TỪ ĐỆM: Loại bỏ hoàn toàn các từ thừa xuất hiện do thói quen nói lặp của người nói (Ví dụ: "ờ", "à", "ừm", "thì", "là", "mà", "đấy", "nhỉ").
3. ĐỊNH DẠNG CƠ BẢN: Tự động bổ sung dấu chấm, dấu phẩy và viết hoa đúng vị trí để câu văn mạch lạc, dễ đọc.

RẤT QUAN TRỌNG: 
- Tuyệt đối KHÔNG ĐƯỢC TÓM TẮT nội dung.
- Tuyệt đối KHÔNG ĐƯỢC BỎ SÓT bất kỳ thông tin, số liệu, ý kiến hay tên riêng nào.
- Giữ nguyên phong cách ngôn ngữ và độ dài cốt lõi của đoạn văn bản gốc.`;

// Utility function to clean raw text using GPT-4o-mini
async function cleanTextWithAI(rawText) {
  if (!rawText || !rawText.trim()) return '';

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Return mock cleaned text
    return `[Văn bản làm sạch Demo]: ${rawText.replace(/\b(ờ|à|ừm|thì|là|mà|đấy|nhỉ)\b/gim, '')}`;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: CLEANING_SYSTEM_PROMPT },
      { role: 'user', content: rawText }
    ],
    temperature: 0.3
  });

  return response.choices[0]?.message?.content || rawText;
}

// 1. Ping route to wake up backend and check status
app.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AI Meeting Editor Backend is awake',
    hasKey: !!process.env.OPENAI_API_KEY,
    hasDatabase: !!supabase
  });
});

// 1b. Meetings CRUD Database Endpoints (Supabase)
app.get('/api/meetings', async (req, res) => {
  if (!supabase) {
    return res.status(400).json({ error: 'Supabase database not configured on backend' });
  }
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const meetings = data.map(m => ({
      id: m.id,
      title: m.title,
      createdAt: m.created_at,
      rawText: m.raw_text || '',
      chatHistory: m.chat_history || [],
      finalMarkdown: m.final_markdown || '',
      audioDuration: parseFloat(m.audio_duration) || 0
    }));

    res.json(meetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings', async (req, res) => {
  if (!supabase) {
    return res.status(400).json({ error: 'Supabase database not configured on backend' });
  }
  const { id, title, rawText, chatHistory, finalMarkdown, audioDuration, createdAt } = req.body;
  if (!id || !title) {
    return res.status(400).json({ error: 'id and title are required fields' });
  }
  try {
    const newDbMeeting = {
      id,
      title,
      raw_text: rawText || '',
      chat_history: chatHistory || [],
      final_markdown: finalMarkdown || '',
      audio_duration: audioDuration || 0,
      created_at: createdAt || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('meetings')
      .insert([newDbMeeting])
      .select();

    if (error) throw error;

    res.json({ success: true, meeting: data[0] });
  } catch (err) {
    console.error('Error creating meeting:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/meetings/:id', async (req, res) => {
  if (!supabase) {
    return res.status(400).json({ error: 'Supabase database not configured on backend' });
  }
  const { id } = req.params;
  const updates = req.body;
  try {
    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.rawText !== undefined) dbUpdates.raw_text = updates.rawText;
    if (updates.chatHistory !== undefined) dbUpdates.chat_history = updates.chatHistory;
    if (updates.finalMarkdown !== undefined) dbUpdates.final_markdown = updates.finalMarkdown;
    if (updates.audioDuration !== undefined) dbUpdates.audio_duration = updates.audioDuration;
    if (updates.createdAt !== undefined) dbUpdates.created_at = updates.createdAt;

    const { data, error } = await supabase
      .from('meetings')
      .update(dbUpdates)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ success: true, updated: data[0] });
  } catch (err) {
    console.error(`Error updating meeting ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  if (!supabase) {
    return res.status(400).json({ error: 'Supabase database not configured on backend' });
  }
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error(`Error deleting meeting ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Prepare audio endpoint (accepts upload, measures duration, splits if large)
app.post('/api/audio/prepare', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const sourcePath = req.file.path;
  const sessionId = crypto.randomUUID();
  const sessionDir = path.join(UPLOADS_DIR, sessionId);
  
  try {
    // Create dedicated session folder
    fs.mkdirSync(sessionDir, { recursive: true });

    // Move source file to session directory
    const targetPath = path.join(sessionDir, `source${path.extname(sourcePath)}`);
    fs.renameSync(sourcePath, targetPath);

    console.log(`[Session ${sessionId}] File uploaded: ${targetPath}`);

    // Get audio duration
    const duration = await getAudioDuration(targetPath);
    console.log(`[Session ${sessionId}] Audio duration: ${duration.toFixed(2)}s`);

    // Define chunk duration (10 minutes = 600s)
    const CHUNK_DURATION = 600;
    let chunkPaths = [];

    if (duration <= CHUNK_DURATION) {
      // Small file, no splitting needed
      chunkPaths = [targetPath];
      console.log(`[Session ${sessionId}] Audio size/duration is small. No splitting required.`);
    } else {
      // Split the audio using ffmpeg
      console.log(`[Session ${sessionId}] Splitting audio into chunks...`);
      chunkPaths = await splitAudio(targetPath, duration, sessionDir, CHUNK_DURATION);
      console.log(`[Session ${sessionId}] Split completed: ${chunkPaths.length} chunks generated.`);
    }

    // Save session metadata
    const metadata = {
      sessionId,
      duration,
      originalFile: targetPath,
      chunks: chunkPaths.map((p, index) => ({
        index,
        path: p,
        filename: path.basename(p)
      }))
    };

    fs.writeFileSync(
      path.join(sessionDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    res.json({
      success: true,
      sessionId,
      totalChunks: chunkPaths.length,
      duration
    });

  } catch (err) {
    console.error(`[Session ${sessionId}] Preparation failed:`, err);
    // Cleanup folder
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    res.status(500).json({ error: `Audio preparation failed: ${err.message}` });
  }
});

// 3. Transcribe specific chunk endpoint
app.post('/api/audio/transcribe-chunk', async (req, res) => {
  const { sessionId, chunkIndex, clean } = req.body;

  if (!sessionId || chunkIndex === undefined) {
    return res.status(400).json({ error: 'Missing sessionId or chunkIndex' });
  }

  const sessionDir = path.join(UPLOADS_DIR, sessionId);
  const metadataPath = path.join(sessionDir, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const chunkInfo = metadata.chunks.find(c => c.index === parseInt(chunkIndex));

    if (!chunkInfo) {
      return res.status(400).json({ error: `Chunk index ${chunkIndex} not found in session` });
    }

    const chunkPath = chunkInfo.path;
    if (!fs.existsSync(chunkPath)) {
      return res.status(404).json({ error: `Chunk file not found` });
    }

    console.log(`[Session ${sessionId}] Transcribing chunk ${chunkIndex + 1}/${metadata.chunks.length}...`);

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      // Mock result if key is placeholder
      setTimeout(async () => {
        let rawDemoText = `[Bản ghi âm Demo Phần ${chunkIndex + 1}]: Đây là kết quả biên dịch thử nghiệm từ giọng nói tiếng Việt cho phần số ${chunkIndex + 1} của cuộc họp. Ờ, thì cuộc họp hôm nay sẽ bàn về vấn đề phát triển dự án, à, phần mềm mới đấy nhỉ.`;
        let textResult = rawDemoText;
        if (clean) {
          textResult = await cleanTextWithAI(rawDemoText);
        }
        res.json({
          text: textResult
        });
      }, 2000);
      return;
    }

    // Call OpenAI Whisper API
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(chunkPath),
      model: 'whisper-1',
      language: 'vi'
    });

    let resultText = response.text || '';

    if (clean && resultText.trim()) {
      console.log(`[Session ${sessionId}] AI Auto-Correct: Cleaning transcript for chunk ${chunkIndex + 1}...`);
      resultText = await cleanTextWithAI(resultText);
    }

    res.json({
      text: resultText
    });

  } catch (err) {
    console.error(`[Session ${sessionId}] Transcription failed for chunk ${chunkIndex}:`, err);
    res.status(500).json({ error: `Transcription failed: ${err.message}` });
  }
});

// 4. Cleanup session endpoint
app.post('/api/audio/cleanup', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  const sessionDir = path.join(UPLOADS_DIR, sessionId);
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[Session ${sessionId}] Cleanup completed. Removed all temp files.`);
      res.json({ success: true });
    } catch (err) {
      console.error(`[Session ${sessionId}] Cleanup failed:`, err);
      res.status(500).json({ error: `Cleanup failed: ${err.message}` });
    }
  } else {
    res.json({ success: true, message: 'Session already cleaned up' });
  }
});

// 5. Standalone clean/correct existing text using AI
app.post('/api/audio/clean-text', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing text body field' });
  }

  try {
    const cleaned = await cleanTextWithAI(text);
    res.json({ cleanedText: cleaned });
  } catch (err) {
    console.error('[Clean Text] Error:', err);
    res.status(500).json({ error: `Text cleaning failed: ${err.message}` });
  }
});

// 6. Proxy AI Chat Completions endpoint (with streaming support)
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Mock response if key is placeholder
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const demoText = "Chào bạn! Đây là câu trả lời thử nghiệm của Trợ lý AI khi chưa điền API Key. Khi bạn điền OpenAI API Key thật vào file `.env`, hệ thống sẽ trả về văn bản biên tập thực tế dạng Markdown chuẩn từ GPT-4o-mini.";
    let i = 0;
    const interval = setInterval(() => {
      if (i < demoText.length) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: demoText[i] } }] })}\n\n`);
        i++;
      } else {
        res.write('data: [DONE]\n\n');
        clearInterval(interval);
        res.end();
      }
    }, 20);
    return;
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemPrompt = {
      role: 'system',
      content: 'Bạn là chuyên gia biên tập cuộc họp cấp cao. Nhiệm vụ của bạn là lắng nghe ý tưởng từ người dùng để định hình bố cục (ví dụ: cơ cấu ban ngành tham gia, danh sách đại biểu, nội dung chính, kết luận). Sau đó, dựa trên văn bản gốc được cung cấp, bạn sẽ tái cấu trúc lại thành một văn bản hoàn chỉnh, chuyên nghiệp theo đúng định dạng Markdown.'
    };

    const apiMessages = [systemPrompt, ...messages];

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: apiMessages,
      stream: true
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('[AI Chat] Error:', err);
    res.status(500).json({ error: `AI Chat failed: ${err.message}` });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🚀 Environment: ${process.env.OPENAI_API_KEY ? 'API Key Loaded' : 'API Key Missing/Placeholder'}`);
  console.log(`==================================================`);
});
