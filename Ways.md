# PHƯƠNG PHÁP TỰ ĐỘNG LỌC LỖI CHÍNH TẢ & LÀM SẠCH VĂN BẢN CUỘC HỌP DÀI

Tài liệu này hướng dẫn cách tích hợp thêm một lớp AI (GPT-4o-mini) vào giữa kết quả Speech-to-Text của Whisper và khung chỉnh sửa của người dùng nhằm tự động hóa việc sửa lỗi chính tả, xóa từ đệm và chuẩn hóa văn bản thô.

---

## 1. Kiến trúc luồng dữ liệu 2 lớp (Double-Pass)
[Audio Cuộc Họp]
│
▼
[LỚP 1: OpenAI Whisper API] ──> Trả về văn bản thô (Còn lỗi chính tả, từ đệm ờ, à)
│
▼
[LỚP 2: OpenAI GPT API]     ──> Soát lỗi, xóa từ đệm, thêm dấu câu (Giữ nguyên 100% ý)
│
▼
[Giao diện chỉnh sửa tay]   ──> Hiển thị văn bản sạch cho người dùng kiểm tra sau cùng


---

## 2. Kỹ thuật chia đoạn (Chunking) cho cuộc họp dài (2-3 tiếng)

Một cuộc họp dài 2-3 tiếng sẽ tạo ra lượng văn bản khổng lồ, vượt quá giới hạn xử lý tối ưu của một lượt gọi API đơn lẻ và dễ làm AI bị sót lỗi ở đoạn giữa.

### Giải pháp xử lý ở Backend:
1. **Cắt chuỗi (Split):** Khi nhận đoạn text thô từ Whisper, Backend sẽ chia nhỏ text thành từng đoạn (Chunks), mỗi đoạn giới hạn khoảng **2000 - 3000 từ**.
2. **Xử lý song song / Tuần tự:** Gửi từng đoạn text này lên API OpenAI cùng với câu `System Prompt` định hướng làm sạch.
3. **Gộp dữ liệu (Join):** Đợi tất cả các đoạn xử lý xong, Backend sẽ nối các đoạn text đã làm sạch lại theo đúng thứ tự thời gian trước khi trả về cho Frontend.

---

## 3. Bản mẫu System Prompt dành riêng cho việc làm sạch văn bản

Cấu hình câu lệnh hệ thống nghiêm ngặt để AI chỉ sửa lỗi chính tả chứ không tự ý tóm tắt hay cắt xén nội dung:

```text
Bạn là một trợ lý ảo chuyên biên dịch và soát lỗi chính tả văn bản tiếng Việt từ giọng nói (Speech-to-Text). Nhiệm vụ của bạn là nhận vào đoạn văn bản thô và thực hiện chuẩn hóa theo các quy tắc sau:

1. SỬA LỖI CHÍNH TẢ: Sửa các từ gõ sai, từ nói ngọng, hoặc từ bị AI nghe nhầm dựa trên ngữ cảnh của câu (Ví dụ: đặt đúng dấu hỏi/ngã, sửa từ đồng âm sai nghĩa).
2. LỌC TỪ ĐỆM: Loại bỏ hoàn toàn các từ thừa xuất hiện do thói quen nói lặp của người nói (Ví dụ: "ờ", "à", "ừm", "thì", "là", "mà", "đấy", "nhỉ").
3. ĐỊNH DẠNG CƠ BẢN: Tự động bổ sung dấu chấm, dấu phẩy và viết hoa đúng vị trí để câu văn mạch lạc, dễ đọc.

RẤT QUAN TRỌNG: 
- Tuyệt đối KHÔNG ĐƯỢC TÓM TẮT nội dung.
- Tuyệt đối KHÔNG ĐƯỢC BỎ SÓT bất kỳ thông tin, số liệu, ý kiến hay tên riêng nào.
- Giữ nguyên phong cách ngôn ngữ và độ dài cốt lõi của đoạn văn bản gốc.
4. Gợi ý thiết kế trải nghiệm trên Giao diện (UI/UX)
Để tối ưu hóa trải nghiệm người dùng trên Dashboard, bạn có thể thiết kế như sau:

Nút gạt (AI Auto-Correct Toggle): Đặt một nút gạt nhỏ ngay phía trên khung "VĂN BẢN GỐC".

Chế độ Bật: Sau khi Whisper chạy xong, hệ thống hiển thị hiệu ứng Loading nhỏ ("AI đang làm sạch văn bản...") rồi mới hiển thị kết quả đã sửa lỗi lên màn hình.

Chế độ Tắt: Hiển thị trực tiếp 100% văn bản thô từ Whisper để người dùng tự do xử lý.