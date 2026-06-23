# KẾ HOẠCH PHÁT TRIỂN ỨNG DỤNG WEB: BIÊN TẬP CUỘC HỌP THÔNG MINH (AI MEETING EDITOR)

Tài liệu này phác thảo chi tiết kế hoạch xây dựng và phát triển một ứng dụng web đơn giản, hỗ trợ ghi âm trực tiếp hoặc tải file âm thanh lên, tự động chuyển đổi thành văn bản (Speech-to-Text), chỉnh sửa văn bản gốc và sử dụng Trợ lý AI để biên tập thành bài tóm tắt/bài báo chuyên nghiệp.

---

## 1. Kiến trúc Tổng quan & Luồng Xử lý (Workflow)

Hệ thống hoạt động dựa trên luồng xử lý tuần tự gồm 5 bước cốt lõi sau:

```
[1. Ghi âm / Upload File] ──> [2. API Whisper (STT)] ──> [3. Khung Chỉnh Sửa Text Gốc]
                                                                   │
[5. Xuất Bản Kết Quả]     <── [4. Tạo Bài Viết Cuối]   <── [Chốt Bố Cục Với Chatbot AI]
```

1. **Đầu vào (Input):** Người dùng thực hiện ghi âm trực tiếp từ trình duyệt hoặc tải lên một file âm thanh có sẵn (`.mp3`, `.wav`, `.m4a`,...).
2. **Chuyển đổi văn bản (Speech-to-Text):** Hệ thống gửi file âm thanh sang API OpenAI Whisper để chuyển đổi thành văn bản thô (Raw Transcription).
3. **Chuẩn hóa văn bản gốc:** Văn bản thô hiển thị trên giao diện trực quan, cho phép người dùng đọc soát, sửa lỗi chính tả/thuật ngữ chuyên ngành, và ấn **Lưu** để chốt nội dung làm "Văn bản gốc".
4. **Thảo luận bố cục với AI:** Người dùng trò chuyện với Chatbot (OpenAI GPT) để đưa ra ý tưởng, lựa chọn hình thức (biên bản cuộc họp, bài báo, bài viết tổng hợp) và cấu trúc mong muốn.
5. **Tổng hợp & Định dạng (Output):** AI kết hợp *Văn bản gốc* cùng *Bố cục đã thống nhất* để tạo ra bài viết hoàn chỉnh dưới định dạng chỉn chu (Markdown), hỗ trợ sao chép hoặc xuất file.

---

## 2. Thiết kế Giao diện Người dùng (UI/UX Layout)

Để tối ưu hóa trải nghiệm, giao diện sẽ được thiết kế theo dạng **Dashboard một trang (Single Page Application)**, chia làm 2 cột lớn hiển thị song song từ trái qua phải:

### CÔT TRÁI: Đầu Vào & Văn Bản Gốc (Input & Raw Text)

* **Khối Điều Khiển Âm Thanh (Audio Control Box):**
    * **Nút Ghi âm (Microphone Button):** Tích hợp hiệu ứng đổi màu khi hoạt động (Ví dụ: Nhấp nháy đỏ khi đang ghi).
    * **Vùng Tải file (Drag & Drop Zone):** Cho phép kéo thả hoặc bấm để chọn file từ máy tính.
    * **Trình phát nhạc (Audio Player):** Hiển thị thanh tiến trình để nghe lại đoạn âm thanh đã thu/tải lên.
    * **Nút Hành động:** `Xác nhận chuyển thành văn bản` (Kích hoạt API Whisper).
* **Khối Văn Bản Gốc (Raw Text Editor):**
    * Một ô nhập liệu lớn (Sử dụng Rich Text Editor hoặc Textarea chất lượng cao).
    * Hiển thị toàn bộ nội dung text trả về từ Whisper.
    * **Tính năng:** Cho phép gõ, xóa, chỉnh sửa tự do.
    * **Nút Hành động:** `Lưu văn bản gốc` (Chốt dữ liệu đầu vào cho AI).

### CỘT PHẢI: Trợ Lý AI & Kết Quả Đầu Ra (AI Assistant & Output)

* **Khối Trợ Lý Chatbot (AI Chat Workspace):**
    * Giao diện hộp thoại chat quen thuộc (Tin nhắn người dùng bên phải, tin nhắn của AI bên trái).
    * **Gợi ý nhanh (Quick Prompts):** Các nút bấm chọn nhanh như *"Tóm tắt dạng biên bản hành chính"*, *"Viết thành bài báo tin tức"*, *"Liệt kê hành động & phân công công việc"*.
    * **Nút Hành động:** `Xác nhận & Tạo bài viết` (Sau khi đã chốt xong format trong đoạn chat).
* **Khối Kết Quả Hoàn Chỉnh (Final Output View):**
    * Vùng hiển thị bài viết hoàn chỉnh đã được định dạng đẹp mắt (Tiêu đề, Đề mục lớn/nhỏ, Danh sách gạch đầu dòng).
    * **Nút Hành động:** `Sao chép toàn bộ` (Copy to Clipboard) hoặc `Xuất File (.docx/.pdf)`.

---

## 3. Chi tiết Chức năng & Đặc tả Kỹ thuật (Technical Specification)

### 3.1. Chức năng Ghi âm & Upload File
* **Phía Giao diện (Frontend):** Sử dụng `MediaRecorder API` có sẵn của trình duyệt để thu giữ luồng âm thanh từ microphone của người dùng.
* **Xử lý dữ liệu:** Lưu trữ tạm thời các mảnh dữ liệu (`Audio Chunks`), gộp lại thành đối tượng `Blob` sau khi bấm dừng và xuất ra định dạng chuẩn (khuyến nghị `audio/mp3` hoặc `audio/webm`).

### 3.2. Chức năng Chuyển đổi Giọng nói thành Văn bản (Speech-to-Text)
* **Tích hợp API:** Gửi yêu cầu qua giao thức HTTP POST đến endpoint `v1/audio/transcriptions` của OpenAI (Model: `whisper-1`).
* **Tham số tối ưu:** Cài đặt tham số `language="vi"` để ép Whisper tập trung nhận diện tiếng Việt chính xác nhất.
* **Lưu ý kỹ thuật:** Whisper giới hạn file gửi lên tối đa **25MB**. Đối với cuộc họp dài, Backend cần tích hợp thư viện cắt nhỏ file âm thanh (Audio Chunking như `fluent-ffmpeg`) trước khi gửi lên API, sau đó nối các đoạn văn bản lại.

### 3.3. Chức năng Thảo luận và Biên tập nội dung với AI
* **Tích hợp API:** Sử dụng OpenAI Chat Completions (`v1/chat/completions`) với model hiệu năng cao và tiết kiệm chi phí như `gpt-4o-mini` (hoặc `gpt-4o` nếu cần độ thông minh cao tối đa).
* **Thiết lập Prompt hệ thống (System Prompt):** Nhằm định hình vai trò của AI ngay khi bắt đầu phiên làm việc:
    > *"Bạn là chuyên gia biên tập cuộc họp cấp cao. Nhiệm vụ của bạn là lắng nghe ý tưởng từ người dùng để định hình bố cục (ví dụ: cơ cấu ban ngành tham gia, danh sách đại biểu, nội dung chính, kết luận). Sau đó, dựa trên văn bản gốc được cung cấp, bạn sẽ tái cấu trúc lại thành một văn bản hoàn chỉnh, chuyên nghiệp theo đúng định dạng Markdown."*

### 3.4. Chức năng Tạo & Định dạng bài viết cuối cùng
* **Luồng dữ liệu cuối (Final Prompt):** Khi người dùng bấm chốt, hệ thống gửi một payload gồm:
    1. Toàn bộ nội dung văn bản gốc đã được đính chính.
    2. Lịch sử thảo luận / cấu trúc đã thống nhất.
    3. Yêu cầu cuối: *"Dựa trên văn bản gốc và cấu trúc đã duyệt, hãy viết thành văn bản hoàn chỉnh."*
* **Hiển thị:** Sử dụng thư viện chuyển đổi Markdown sang HTML (như `react-markdown` ở Frontend) để văn bản hiển thị có cấu trúc phân tầng rõ ràng, chuyên nghiệp.

---

## 4. Đề xuất Công nghệ Triển khai (Tech Stack)

Để nhanh chóng hoàn thiện phiên bản thử nghiệm (MVP) ổn định và dễ mở rộng, cấu trúc công nghệ sau được khuyến nghị:

* **Frontend (Giao diện):**
    * **Framework:** `React.js` (Khởi tạo bằng Vite) hoặc `Next.js` để quản lý tốt các luồng trạng thái phức tạp (Ghi âm, Text thô, Lịch sử Chat).
    * **CSS & UI Component:** `Tailwind CSS` kết hợp `Shadcn UI` hoặc `Ant Design` để dựng nhanh khung giao diện và các hộp thoại chat hiện đại mà không mất thời gian tùy biến CSS thô.
* **Backend (Xử lý logic & Điều hướng API):**
    * **Nền tảng:** `Node.js` với framework `Express` (JavaScript) hoặc `Python` với `FastAPI`. Cả hai đều có thư viện SDK chính thức từ OpenAI (`npm install openai` hoặc `pip install openai`) giúp xử lý kết nối mượt mà.
* **Lưu trữ (Database - Tùy chọn mở rộng):**
    * Ở giai đoạn đầu, có thể lưu trữ trạng thái trực tiếp trên bộ nhớ Trình duyệt (State/Local Storage).
    * Khi mở rộng quản lý lịch sử: Sử dụng `MongoDB` hoặc `PostgreSQL` để lưu thông tin cuộc họp (Tiêu đề, ngày tháng, text gốc, bài viết cuối cùng).

---

## 5. Các Thách thức & Giải pháp Tối ưu

1.  **Lỗi mất ngữ cảnh hội thoại:** Đảm bảo khi người dùng chat với AI, toàn bộ mảng lịch sử tin nhắn (`messages` array chứa các vai trò `user` và `assistant`) phải được gửi kèm liên tục lên API để AI không bị quên những gì đã thảo luận ở câu trước.
2.  **Lọc tiếng ồn cuộc họp:** Giọng nói trong cuộc họp thực tế dễ bị lẫn tạp âm. Có thể bổ sung thêm tham số `prompt` trong API Whisper để mồi một số từ khóa chuyên ngành hoặc định hình phong cách viết hoa, giúp AI nhận diện chuẩn hơn.
3.  **Trải nghiệm mượt mà:** Khuyến khích bật tính năng `stream: true` ở API Chat để văn bản tạo ra từ AI chạy chữ từ từ (Streaming giống ChatGPT), tránh việc người dùng phải chờ đợi quá lâu trước một màn hình đứng yên.