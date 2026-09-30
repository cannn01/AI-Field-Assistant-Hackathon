# AI Worklog

## 1. AI tools used (Các công cụ AI đã sử dụng)

- Gemini (Mô hình ngôn ngữ lớn để hỗ trợ lập trình, debug và cấu hình hệ thống).

- Google Gemini API (Sử dụng model `gemini-1.5-flash` để tích hợp vào ứng dụng phân tích dữ liệu hiện trường).

## 2. How AI helped (AI đã giúp đỡ như thế nào)

- **Kiến trúc và Logic:** Hỗ trợ xây dựng luồng ứng dụng bằng React Native (Expo) và viết hàm `fetch` để gọi API Google Gemini chuyển đổi ghi chú dạng văn bản tự do thành báo cáo JSON có cấu trúc.

- **Xử lý trạng thái và lỗi (State & Error Handling):** Hỗ trợ thiết kế kịch bản xử lý lỗi khi gọi API. Xây dựng cơ chế Auto-Retry (tự động thử lại) khi gặp lỗi quá tải (HTTP 429) hoặc máy chủ bận (HTTP 503), và cơ chế Offline Fallback (chuyển sang form điền tay) khi mất mạng hoặc API tiếp tục lỗi.

- **Bảo mật và Triển khai:** Hỗ trợ tách API Key khỏi mã nguồn bằng biến môi trường `.env` cho môi trường local và EAS Secrets cho môi trường build đám mây), xử lý lỗi chặn đẩy mã nguồn của GitHub Push Protection, và hướng dẫn build xuất file `.apk`.

- **UI/UX:** Xử lý lỗi chớp màn hình khi khởi động bằng cách cấu hình lại `resizeMode` cho Splash Screen trong `app.json`.

## 3. Incorrect AI outputs (Những kết quả sai từ AI)

- **Sai tên Model:** Trợ lý AI đã cung cấp sai tên mô hình Gemini thành `gemini-3.8-flash` (một model không tồn tại), dẫn đến việc API không thể xử lý và trả về lỗi.

- **Nhầm lẫn về định dạng API Key:** Khi quá trình xác thực thất bại, trợ lý AI đã đưa ra chẩn đoán sai rằng định dạng khóa API bắt đầu bằng `AQ...` là không hợp lệ (so với chuẩn cũ là `AIzaSy...`), dù thực tế đây là định dạng khóa mới nhất của Google AI Studio.

## 4. How you improved them (Cách khắc phục và cải thiện)

- Để khắc phục lỗi gọi API, tôi đã chủ động chèn thêm đoạn mã `console.log("Trạng thái:", response.status)` vào sau hàm `fetch` để bắt chính xác mã lỗi HTTP trả về thay vì phụ thuộc vào dự đoán của AI. 

- Sau khi kiểm tra log và đối chiếu với tài liệu API của Google, tôi đã xác nhận khóa `AQ...` là hợp lệ, tìm ra nguyên nhân gốc rễ là sai tên model, và tự sửa mã nguồn thành `gemini-1.5-flash`. Hệ thống sau đó đã gọi API thành công (Status 200).

## 5. What you would improve with 7 more days (Định hướng phát triển nếu có thêm 7 ngày)

- **Đồng bộ hóa đám mây (Cloud Sync):** Xây dựng hệ thống cơ sở dữ liệu (như Firebase hoặc Supabase) để tự động đồng bộ các báo cáo đã lưu offline lên máy chủ ngay khi thiết bị có kết nối mạng trở lại.

- **Tích hợp bản đồ và vị trí (GPS):** Tự động gắn tọa độ GPS vào metadata của ảnh và báo cáo để bộ phận bảo trì biết chính xác vị trí thiết bị hỏng tại hiện trường.

- **Chuyển giọng nói thành văn bản (Speech-to-Text):** Tích hợp thêm các API nhận dạng giọng nói Native (như Whisper hoặc Google Speech-to-Text) để người dùng ở công trường chỉ cần nói, ứng dụng sẽ tự chuyển thành văn bản (Ghi chú) trước khi gửi cho Gemini phân tích.