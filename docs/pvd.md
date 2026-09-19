# Product Vision Document: Classroom Management System

## 1. Product Overview

**Tên Sản Phẩm:** Classroom Management System  
**Mục Tiêu:** Cung cấp nền tảng quản lý lớp học hiện đại, dễ sử dụng cho giáo viên freelancer và học sinh, giúp tối ưu hóa quản lý học tập, hóa đơn, và giao tiếp.

---

## 2. Business Goals

- **Tối ưu hóa thời gian quản lý:** Giảm thời gian giáo viên dành cho quản trị (học sinh, lịch học, hóa đơn) từ 30% xuống 10%
- **Tăng tính chuyên nghiệp:** Cung cấp công cụ tạo hóa đơn, theo dõi tiến độ học tập, và ghi nhận học sinh chuyên nghiệp
- **Nâng cao trải nghiệm học tập:** Học sinh có cái nhìn tổng thể về tiến độ, bài tập, và nhận xét từ giáo viên
- **Tăng khả năng mở rộng:** Hỗ trợ giáo viên quản lý nhiều khóa học, nhiều học sinh cùng lúc

---

## 3. Target Users

### 3.1 Giáo viên Freelancer
- **Mô tả:** Giáo viên độc lập dạy bán thời gian hoặc toàn thời gian (dạy thêm tiếng Anh, toán, lập trình, v.v.)
- **Nhu cầu chính:**
  - Quản lý danh sách học sinh hiệu quả
  - Lên lịch dạy, theo dõi buổi học, điểm danh
  - Giao bài tập, chấm chữa, ghi nhận tiến độ
  - Tạo hóa đơn tính tiền hàng tháng
  - Ghi nhận nhận xét, phản hồi cho học sinh
- **Kỳ vọng:** Công cụ đơn giản, nhanh chóng, tiết kiệm thời gian

### 3.2 Học sinh
- **Mô tả:** Học sinh bất kỳ tuổi học thêm qua các khóa học trực tuyến hoặc offline
- **Nhu cầu chính:**
  - Xem bài giảng, tài liệu của khóa học
  - Làm bài tập, nộp bài tập
  - Xem điểm số, nhận xét từ giáo viên
  - Tự đăng ký vào khóa học
  - Gửi phản hồi/đánh giá cho giáo viên
- **Kỳ vọng:** Giao diện rõ ràng, dễ theo dõi tiến độ

---

## 4. Core Features (MVP)

### 4.1 Quản Lý Học Sinh
- Danh sách học sinh của từng khóa học
- Thông tin cơ bản: tên, email, số điện thoại, trạng thái đăng ký
- Chức năng: thêm/sửa/xóa/tìm kiếm học sinh
- **Ưu tiên:** Critical (MVP)

### 4.2 Quản Lý Lịch Dạy & Buổi Học
- Lên lịch dạy hàng tuần/tháng
- Tạo buổi học, thiết lập thời gian, địa điểm (hoặc link online)
- Điểm danh học sinh (có mặt/vắng mặt)
- Xem lịch sử buổi học, rút kinh nghiệm
- **Ưu tiên:** Critical (MVP)

### 4.3 Giao & Chấm Chữa Bài Tập
- Các loại bài tập: trắc nghiệm, tự luận, speaking (kèm hướng dẫn ghi âm)
- Tạo bài tập, gán deadline, gán cho học sinh cụ thể hoặc cả lớp
- Học sinh nộp bài tập (text, file, hoặc ghi âm)
- Giáo viên chấm điểm, viết phản hồi chi tiết
- Học sinh xem điểm và phản hồi
- **Ưu tiên:** Critical (MVP)

### 4.4 Tạo & Quản Lý Hóa Đơn
- Hóa đơn hàng tháng (tự động hoặc thủ công)
- Chứa: khóa học, số buổi học, học phí, tổng cộng
- Download hóa đơn (PDF/Excel)
- Gửi hóa đơn cho học sinh qua email
- **Ưu tiên:** Critical (MVP)

### 4.5 Ghi Nhận Nhận Xét Học Sinh
- Nhận xét tổng thể: tiến độ, thái độ, điểm mạnh, điểm yếu
- Lịch sử nhận xét để theo dõi sự phát triển của học sinh
- Học sinh có thể xem nhận xét từ giáo viên
- **Ưu tiên:** Critical (MVP)

### 4.6 Portal Học Sinh
- Đăng nhập học sinh
- Xem bài giảng, tài liệu của khóa học (upload bởi giáo viên)
- Xem danh sách bài tập (làm, chưa làm, đã nộp)
- Xem điểm số, phản hồi từ giáo viên
- Xem lịch học sắp tới
- **Ưu tiên:** Critical (MVP)

---

## 5. Should-Have Features

### 5.1 Phản Hồi Học Sinh → Giáo Viên
- Học sinh có thể đánh giá, phản hồi buổi học
- Câu hỏi hỗ trợ: "Buổi học có rõ không?", "Nội dung thú vị không?", "Tốc độ dạy như thế nào?"
- Giáo viên xem tổng hợp phản hồi, cải thiện giảng dạy
- **Ưu tiên:** Should-have (hoặc sau MVP)

### 5.2 Đăng Ký Khóa Học Tự Động
- Học sinh tự tìm kiếm, đăng ký khóa học
- Giáo viên có thể đặt khóa học công khai hoặc riêng tư
- Cho phép đăng ký tự động hoặc cần phê duyệt
- **Ưu tiên:** Should-have (hoặc sau MVP)

### 5.3 Báo Cáo & Thống Kê
- Báo cáo tiến độ lớp (tỷ lệ hoàn thành bài tập, điểm trung bình)
- Báo cáo cá nhân học sinh (bài tập hoàn thành, điểm, nhận xét)
- Export báo cáo
- **Ưu tiên:** Should-have

### 5.4 Thông Báo & Nhắc Nhở
- Thông báo cho học sinh: bài tập mới, deadline sắp tới, nhận được phản hồi
- Thông báo cho giáo viên: học sinh nộp bài, học sinh vắng mặt
- Email notifications
- **Ưu tiên:** Should-have

### 5.5 Quản Lý Khóa Học
- Tạo/chỉnh sửa thông tin khóa học
- Mô tả, mục tiêu, yêu cầu
- Danh sách bài giảng, tài liệu
- **Ưu tiên:** Critical (MVP giai đoạn 1)

---

## 6. Key Success Metrics (KSM)

1. **Thời gian quản lý giảm:** Giáo viên dành < 20% thời gian cho quản trị
2. **Tỷ lệ hoàn thành bài tập:** ≥ 85% học sinh hoàn thành bài tập đúng hạn
3. **Satisfaction:** Giáo viên & học sinh rating ≥ 4/5
4. **Adoption:** ≥ 50% giáo viên tạo hóa đơn qua platform trong tháng 1
5. **Retention:** ≥ 70% giáo viên quay lại sau 3 tháng sử dụng

---

## 7. User Personas & User Journeys

### 7.1 Giáo Viên Mới
**Journey:** 
1. Đăng ký tài khoản → Tạo khóa học → Thêm học sinh → Tạo bài tập → Tạo hóa đơn
2. Pain Point: Quá nhiều bước, muốn "nhanh chóng bắt đầu"
3. Solution: Hướng dẫn trực quan, wizard setup nhanh

### 7.2 Học Sinh Đang Thi Đấu
**Journey:**
1. Đăng nhập → Xem bài tập → Làm bài tập → Nộp → Chờ phản hồi
2. Pain Point: Không biết deadline khi nào, muốn nhắc nhở
3. Solution: Hiển thị deadline rõ ràng, gửi thông báo trước hạn

---

## 8. Out of Scope (MVP)

- Tích hợp payment gateway (chỉ tạo hóa đơn)
- Video hosting (giáo viên upload video → liên kết external hoặc tải file)
- Học tập đa ngôn ngữ
- Tự động điểm trắc nghiệm (chỉ hỗ trợ giáo viên chấm)
- Lớp học trực tuyến tích hợp (Zoom, Meet link hoặc offline)

---

## 9. Success Criteria

**MVP coi như thành công khi:**
1. Giáo viên có thể quản lý học sinh, lịch học, bài tập, hóa đơn trong **< 10 phút setup ban đầu**
2. Học sinh có thể đăng nhập, xem bài tập, nộp bài trong **< 2 phút**
3. **Không lỗi:** Zero crash khi quản lý ≥ 20 học sinh
4. **Phản hồi tích cực:** ≥ 3 giáo viên dùng thử, rating ≥ 4/5

---

## 10. Launch Strategy

- **Phase 1 (MVP):** Ra mắt core features (quản lý học sinh, buổi học, bài tập, hóa đơn)
- **Phase 2 (v1.1):** Thêm feedback học sinh, đăng ký tự động, thông báo
- **Phase 3 (v1.2+):** Báo cáo, tích hợp payment, tối ưu hóa hiệu suất

---

## 11. Assumptions & Dependencies

### Assumptions
- Giáo viên cơ bản có kỹ năng công nghệ
- Học sinh có email và khả năng truy cập internet
- Giáo viên muốn quản lý hóa đơn qua platform (không muốn dùng Excel)

### Dependencies
- Hệ thống email (gửi thông báo, hóa đơn)
- Lưu trữ file (bài tập, hóa đơn, tài liệu)
- Xác thực người dùng (email/password hoặc SSO)

---

## Ghi chú & Ưu tiên

**MVP Focus:** Dễ dàng, nhanh chóng quản lý học sinh, buổi học, hóa đơn.  
**Tránh:** Tính năng phức tạp, giao diện rối rắm, các loại report chi tiết.
