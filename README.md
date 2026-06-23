# AI Meeting Editor (Biên tập cuộc họp thông minh) 🚀

Ứng dụng web hỗ trợ ghi âm trực tiếp hoặc tải lên file âm thanh cuộc họp dung lượng lớn (dài 2-3 tiếng), tự động chuyển giọng nói thành văn bản (Speech-to-Text) thông qua OpenAI Whisper và sử dụng trợ lý AI (GPT-4o-mini) để tóm tắt, viết bài báo hoặc lập biên bản hành chính theo định dạng Markdown.

## 🌟 Kiến trúc Hệ thống Hybrid (Lai)

Để hỗ trợ các cuộc họp dài (2-3 tiếng) tạo ra các file âm thanh siêu nặng mà không làm đơ/lag trình duyệt, dự án được chia làm 2 phần:
1. **Frontend (Giao diện):** React + Vite + Tailwind CSS v4. Được build thành mã tĩnh hoàn toàn và deploy miễn phí lên **GitHub Pages** (hoàn toàn không bị ngủ đông, tải trang tức thì).
2. **Backend (Máy chủ phụ):** Node.js + Express. Deploy lên **Render** (hoặc host tương tự). 
   - Đảm nhận nhiệm vụ nặng: tự động cắt nhỏ file âm thanh (Audio Chunking) thành các phần < 25MB bằng `fluent-ffmpeg` để gửi song song lên OpenAI Whisper.
   - Proxy kết nối OpenAI GPT-4o-mini hỗ trợ Stream tin nhắn trực tiếp về trình duyệt.
   - **Tối ưu hóa chi phí:** Tích hợp tính năng đánh thức máy chủ (Ping) ngay khi mở giao diện, và tự động xóa file âm thanh tạm trên đĩa sau khi dịch xong.

---

## 📁 Cấu trúc Thư mục

```text
ThayLogSpeechToText/
├── frontend/                # Thư mục giao diện chính (Deploy lên GitHub Pages)
│   ├── src/
│   │   ├── components/      # UI: Sidebar, AudioWorkspace, AIChatWorkspace, RecordingModal
│   │   └── services/        # Logic: Gọi API sang Render, quản lý localStorage
│   ├── package.json
│   └── vite.config.js
└── backend/                 # Thư mục máy chủ xử lý âm thanh (Deploy lên Render)
    ├── src/
    │   ├── server.js        # Khởi tạo API Express, định cấu hình CORS & OpenAI
    │   └── utils/
    │       └── audio.js     # Tiện ích chia nhỏ file bằng fluent-ffmpeg
    ├── package.json
    └── .env                 # Lưu trữ OPENAI_API_KEY (chạy local)
```

---

## 💻 Cài đặt & Chạy Cục bộ (Local Development)

### 1. Cấu hình Backend
1. Cài đặt công cụ `ffmpeg` trên máy tính của bạn:
   - **Windows:** Tải qua `winget install Gyan.FFmpeg` hoặc tải từ trang chủ và thêm vào biến môi trường Path.
   - **macOS:** Chạy `brew install ffmpeg`.
   - **Linux:** Chạy `sudo apt install ffmpeg`.
2. Di chuyển vào thư mục backend và cài đặt dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Tạo file `.env` từ `.env.example`:
   - Mở file `.env` lên và thay thế `your_openai_api_key_here` bằng OpenAI API Key thực tế của bạn.
4. Chạy server ở chế độ phát triển:
   ```bash
   npm run dev
   ```
   *Server backend sẽ chạy tại: `http://localhost:5000`*

### 2. Cấu hình Frontend
1. Mở một terminal mới, di chuyển vào thư mục frontend và cài đặt dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Khởi chạy giao diện phát triển:
   ```bash
   npm run dev
   ```
   *Giao diện sẽ chạy tại: `http://localhost:5173` (hoặc cổng tương đương)*

---

## 🚀 Hướng dẫn Triển khai (Deployment Guide)

### Bước 1: Deploy Backend lên Render.com
1. Tạo một tài khoản trên [Render.com](https://render.com).
2. Tạo mới một **Web Service** kết nối tới repo GitHub của bạn.
3. Cấu hình thông tin dịch vụ:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Cấu hình Biến môi trường (Environment Variables) trong tab **Environment**:
   - Thêm `OPENAI_API_KEY` = `[Key thật của bạn]`
   - Thêm `PORT` = `5000`
5. Bấm **Deploy**. Sau khi hoàn tất, Render sẽ cấp cho bạn một đường dẫn URL dạng: `https://ten-backend-cua-ban.onrender.com`.

*(Lưu ý: Render Free có ffmpeg được cài đặt sẵn mặc định trong môi trường chạy Node.js).*

### Bước 2: Cấu hình và Deploy Frontend lên GitHub Pages
1. Mở giao diện AI Meeting Editor trên môi trường local (hoặc sau khi build).
2. Bấm vào biểu tượng **Răng cưa (Cài đặt)** ở góc dưới cùng bên trái thanh Sidebar.
3. Nhập đường dẫn URL backend của bạn trên Render (Ví dụ: `https://ten-backend-cua-ban.onrender.com`) vào ô địa chỉ máy chủ và nhấn **Lưu thay đổi**. 
   *(Địa chỉ này sẽ được lưu cố định trong trình duyệt của bạn).*
4. Để tự động hóa việc deploy lên GitHub Pages của bạn:
   - Cài đặt package `gh-pages` trong thư mục `frontend`:
     ```bash
     cd frontend
     npm install gh-pages --save-dev
     ```
   - Thêm các lệnh sau vào phần `"scripts"` trong `frontend/package.json`:
     ```json
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
     ```
   - Chạy lệnh sau để tự động compile và đẩy trang web lên nhánh `gh-pages` trên repo của bạn:
     ```bash
     npm run deploy
     ```
5. Kích hoạt tính năng GitHub Pages trên Repo cài đặt của bạn bằng cách chọn nguồn chạy từ nhánh `gh-pages`. Bạn sẽ có một liên kết web tĩnh hoàn hảo!

---

## 🛠️ Hướng dẫn sử dụng
1. Khi truy cập trang web lần đầu trong ngày, đèn báo kết nối ở góc dưới bên trái có thể hiển thị **"Máy chủ ngủ đông"** (màu đỏ). Hệ thống sẽ tự động gửi lệnh Ping để kích hoạt Render. Vui lòng đợi 30-50 giây để đèn chuyển sang màu **xanh** (Sẵn sàng).
2. Tạo cuộc họp mới, nhấn **Ghi âm trực tiếp** hoặc tải lên file ghi âm cuộc họp có sẵn.
3. Theo dõi tiến trình phiên dịch hiển thị trực quan theo phần trăm.
4. Chỉnh sửa lỗi chính tả ở khung **Văn bản gốc** nếu cần và bấm **Lưu văn bản gốc**.
5. Nhấp chọn các gợi ý nhanh (Biên bản cuộc họp, bài báo...) hoặc nhập yêu cầu trực tiếp vào khung chat để thảo luận cấu trúc tài liệu với trợ lý AI.
6. Nhấn **Tạo bài viết cuối** và sao chép/tải về file Markdown hoặc Word (.docx) ở góc dưới bên phải.
