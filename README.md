# # 👷 AI Field Assistant - Trợ Lý Báo Cáo Hiện Trường

> Dự án 7-Day AI Builder Challenge for Mobile Developer

## 📖 Bối cảnh & Vấn đề (Problem)

Các kỹ sư và công nhân hiện trường thường xuyên phải xử lý sự cố máy móc, bảo trì thiết bị. Tuy nhiên, việc phải đứng tại công trường, tháo găng tay để gõ và điền các biểu mẫu báo cáo kỹ thuật dài dòng trên điện thoại gây mất rất nhiều thời gian và giảm hiệu suất thực tế.

## 💡 Giải pháp (Solution)

**AI Field Assistant** là một ứng dụng di động giúp thay đổi hoàn toàn quy trình báo cáo hiện trường. Thay vì điền form thủ công, người dùng chỉ cần:

1. **Chụp một bức ảnh** hiện trạng sự cố.
2. **Nhập (hoặc nói) một câu mô tả ngắn gọn** (VD: "Điều hòa ở khu tiếp tân bị khét lẹt, khách phàn nàn quá trời").
3. **AI tự động phân tích** ảnh và văn bản để bóc tách thông tin, điền vào một "Biên bản kiểm tra kỹ thuật" chuẩn chỉnh với cấu trúc JSON (Phân loại, Mức độ khẩn cấp, Nguyên nhân sơ bộ, Đề xuất xử lý).



## 🚀 Tính năng nổi bật & Tư duy xử lý lỗi (Core Features & Error Thinking)

Ứng dụng được thiết kế theo tư duy B2B SaaS (phần mềm doanh nghiệp), tập trung mạnh vào tính ổn định ngoài hiện trường:

- **Xác thực người dùng (Demo):** Giao diện màn hình đăng nhập, tạo luồng người dùng (User flow) chỉn chu và mượt mà.
- **Tích hợp Gemini AI:** Phân tích ngữ nghĩa để tự động sinh Form kỹ thuật có cấu trúc.
- **Cơ chế Auto-Retry (Chống quá tải 503):** Do API miễn phí thường xuyên bị nghẽn (lỗi 503/429), ứng dụng được trang bị vòng lặp tự động chờ 2s và gọi lại tối đa 3 lần ngầm dưới background mà không làm gián đoạn UI.
- **Smart Offline Fallback:** Nếu API sập hoàn toàn hoặc thiết bị mất mạng, ứng dụng tự động kích hoạt hàm "Mock Fallback" nội suy từ khóa bằng Regex để điền Form dự phòng, đảm bảo luồng công việc của kỹ sư không bao giờ bị đứng.
- **Quản lý lịch sử (Local Storage):** Lưu trữ toàn bộ báo cáo ngay trên thiết bị bằng `AsyncStorage`. Cho phép người dùng dễ dàng xem lại chi tiết, **xóa** các báo cáo cũ và **chia sẻ (Share)** báo cáo ra ngoài (qua Zalo, Email, tin nhắn...).
- **Trải nghiệm mượt mà (UX):** Màn hình Splash Screen chuẩn Native, giả lập State-based Login flow, Animation Modal xem chi tiết rất trực quan.



## 🏗️ Kiến trúc & Công nghệ (Architecture & Tech Stack)

- **Framework:** React Native (sử dụng Expo Router cho tốc độ prototyping nhanh).
- **Camera:** `expo-camera` để truy cập thiết bị phần cứng.
- **AI Integration:** Google Gemini API `gemini-3.8-flash`) thông qua REST API fetch trực tiếp. Prompt được thiết kế đóng gói chặt chẽ để ép đầu ra luôn là chuẩn JSON.
- **Lưu trữ:** `@react-native-async-storage/async-storage`.



## 🛠️ Quyết định Kỹ thuật (Technical Decisions)

1. **State-based Login thay vì React Navigation:** Để đảm bảo ứng dụng không bị văng lỗi định tuyến trong thời gian ngắn của Hackathon, luồng Đăng nhập được xử lý bằng State `isLoggedIn`), giúp UX chuyển cảnh mượt mà và an toàn tuyệt đối.
2. **Sử dụng JSC Engine thay vì Hermes:** Trong quá trình Build APK qua EAS, động cơ Hermes gặp lỗi tạo bytecode (Hermes bytecode failed) khi tương thích với Expo Router. Quyết định chuyển sang `"jsEngine": "jsc"` trong `app.json` đã giúp quá trình Bundle JavaScript thành công 100% mà không ảnh hưởng đến hiệu năng thực tế.
3. **Làm sạch chuỗi JSON:** Output của Gemini đôi khi dính các thẻ Markdown (như ````json`). Một bước Regex`.replace(/```json/g, ''`được thực hiện ở Frontend để ngăn chặn lỗi` JSON.parse()`.



## 🚧 Hạn chế & Hướng phát triển (Limitations & Future Work)

Nếu có thêm thời gian hoặc nguồn lực tích hợp hệ thống Backend thực tế, ứng dụng sẽ được mở rộng các tính năng:

- **Xác thực thực tế (Real Auth):** Triển khai hệ thống đăng nhập thông minh hỗ trợ đa nền tảng (Google, Facebook, Email/Password).
- **Xuất biểu mẫu linh hoạt (Dynamic Word Templates):** Vì mỗi công ty sẽ có một mẫu báo cáo riêng, ứng dụng sẽ cho phép doanh nghiệp **tải lên mẫu Word (.docx) của họ**. Hệ thống backend sẽ mapping dữ liệu AI sinh ra vào các placeholder trong mẫu và xuất ra file Word chuẩn format của từng công ty.
- **Đồng bộ Đám mây (Cloud Sync):** Đồng bộ dữ liệu lịch sử báo cáo về Dashboard quản trị tập trung thay vì chỉ lưu Local.
- **Phân tích Hình ảnh trực tiếp:** Hướng tới sử dụng model Vision để phân tích trực tiếp mức độ hư hỏng từ ảnh chụp hiện trường.



## 🎥 Demo

- **Video trình diễn sản phẩm:** [https://drive.google.com/drive/folders/1u1nKOZfIw4lnboPOiU1DBdLggwtR8VXb?usp=sharing](https://drive.google.com/drive/folders/1u1nKOZfIw4lnboPOiU1DBdLggwtR8VXb?usp=sharing)
- **File APK cài đặt: [https://expo.dev/accounts/cantodong/projects/AIFieldAssistant/builds/66b6e15e-5b09-487f-a719-50dc70dc9dbf](https://expo.dev/accounts/cantodong/projects/AIFieldAssistant/builds/66b6e15e-5b09-487f-a719-50dc70dc9dbf)**

---

*Dự án được xây dựng trong vòng 7 ngày - Trọng tâm vào tính thực tiễn, tính tùy biến cho doanh nghiệp, độ ổn định và tư duy xử lý lỗi tự động.*