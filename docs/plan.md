# Plan: Classroom Management System trên Cloudflare (logic, UX principle, bảo mật)

## Mục 0. Context và các quyết định đã chốt

**Vấn đề.** Repo `ptv-student` hiện là bản fork của Frappe Education (Python, Frappe v17, ERPNext, MariaDB, Redis). PVD/SAD (`cms_education_pvd.md`, `cms_education_sad.md`) mô tả một sản phẩm khác: nền tảng quản lý lớp học cho **giáo viên freelancer** và học sinh, với khoá học, buổi học, điểm danh, bài tập (trắc nghiệm, tự luận, speaking), chấm điểm, nhận xét, hóa đơn PDF, portal học sinh. Yêu cầu thêm: deploy trên Cloudflare, giao diện sẽ được thiết kế lại sau, nên plan này chỉ chốt logic tính năng, nguyên tắc UX và chuẩn bảo mật.

**Kết luận sau khi đọc code.** Frappe không chạy được trên Cloudflare Workers, và code hiện có lệch PVD ở các điểm sau:

| PVD/SAD cần | Code hiện có |
|---|---|
| Bài tập + nộp bài + speaking/audio + chấm chữa | Không có (chỉ có Quiz, Course Activity, Assessment Plan theo kiểu kỳ thi trường học) |
| Giáo viên freelancer, mỗi người một không gian dữ liệu riêng | Mô hình một trường: Program, Academic Year/Term, Student Group, Guardian, Admission |
| Portal giáo viên | Không có, giáo viên dùng Desk `/app` của Frappe |
| Hóa đơn hàng tháng gửi email + PDF, không cần payment gateway | Hóa đơn kế toán ERPNext (Sales Invoice, Fee Schedule) + Razorpay |
| Feedback học sinh, nhắc nhở, báo cáo | Không có |
| Portal học sinh: lịch, bài tập, điểm, nhận xét | Chỉ có 4 trang: Schedule, Grades, Fees, Attendance |

**Quyết định đã chốt với anh:**

| Chủ đề | Quyết định |
|---|---|
| Hướng kiến trúc | Viết lại Cloudflare-native. Frappe Education giữ làm tài liệu tham chiếu nghiệp vụ, không mang code sang |
| Tenancy | Mỗi giáo viên freelancer là 1 tenant. Mọi bảng có `tenant_id`, thiết kế sẵn để tách D1-per-tenant sau này |
| Đăng nhập | **Không dùng mật khẩu.** Mọi người (giáo viên và học sinh) đăng nhập bằng link gửi qua email. Lý do: gói Cloudflare Free chỉ cho 10 mili-giây xử lý mỗi request, không đủ để băm mật khẩu an toàn; số người dùng ít nên bỏ hẳn mật khẩu cho đơn giản và dễ vận hành (không còn quên mật khẩu, đổi mật khẩu, khoá tài khoản). Không SSO ở MVP |
| Gói Cloudflare | Chạy được trên gói **Free** (không cần Workers Paid): không băm mật khẩu, gửi email bằng SMTP hoặc dịch vụ ngoài qua `waitUntil`, không dùng Queues, hoá đơn PDF tạo ở trình duyệt hoặc bằng thư viện nhẹ. Trần Free cần theo dõi: 10 mili-giây xử lý mỗi request, 100.000 request mỗi ngày |
| Thanh toán | MVP chỉ tạo hóa đơn PDF, giáo viên tự đánh dấu đã thanh toán (đúng phần Out of Scope trong PVD) |
| Điểm danh và tiền | Chỉ có 2 trạng thái, hiển thị là **Attended** (`attended`, đã học) và **Absent** (`absent`, vắng mặt). Buổi nào học sinh đã học (`attended`) thì tính tiền, `absent` không tính. Không có "đi trễ", không có "vắng có phép" |
| Ngôn ngữ giao diện | Tiếng Anh cơ bản, câu ngắn, không dùng từ khó hiểu. MVP chỉ có một ngôn ngữ (English); vẫn để chuỗi trong message catalog để thêm ngôn ngữ sau |
| Tiền tệ và múi giờ | VND (số nguyên, không có số lẻ), timezone `Asia/Ho_Chi_Minh` |
| Link video speaking | Chấp nhận mọi tên miền `https`, kèm cảnh báo "liên kết ngoài" và hiển thị rõ tên miền |
| Tên miền | Không mua tên miền riêng. Dùng địa chỉ có sẵn của Cloudflare: `ptv-lms-staging.<account>.workers.dev` và `ptv-lms.<account>.workers.dev`. Cookie `__Host-sid`, HTTPS, Turnstile và Cloudflare Access đều dùng được trên `workers.dev`. Sau này muốn đổi sang tên miền riêng chỉ cần gắn Custom Domain vào Worker, không đổi code |
| Gửi email thật | Cần tên miền để gửi (SPF/DKIM), nên **chưa gửi email thật được** khi chỉ có `workers.dev` (cần kiểm chứng ở spike M0). Trong lúc đó dùng adapter `EmailProvider` chế độ dev: ghi email vào bảng `email_outbox` và log, có màn hình admin xem nội dung, magic link hiện ra để copy. Khi muốn gửi thật, gắn một tên miền vào Cloudflare, không đổi code |
| Pháp lý hóa đơn | Không ràng buộc quy định hóa đơn ở giai đoạn này; sẽ thiết kế khi vào đặc tả chi tiết tính năng hóa đơn (M4) |
| Quét virus | Chấp nhận `skipped` ở MVP (chỉ allowlist + kiểm tra magic bytes) |
| Email | Dùng Cloudflare Email Service (đang Beta), bọc sau một lớp `EmailProvider` để đổi được nếu cần |
| Data residency | Không yêu cầu |
| Học sinh nhỏ tuổi | Không cần email phụ huynh, không có luồng đồng ý riêng |
| Bài speaking | Học sinh **gắn link video** do mình tự đăng ở nơi khác. Hệ thống không ghi âm, không lưu audio/video, không phát media |

**Giả định còn lại:** team 1-2 dev.

---

## Mục 1. Đánh giá code hiện tại

### 1.1 Cái gì tái dùng (chỉ ý tưởng nghiệp vụ, không copy code)

| Nguồn | Dùng lại điều gì |
|---|---|
| `education/education/api.py:358-382` `get_grade` | Thuật toán chấm theo ngưỡng (grading scale interval), cho thang 0-10, 0-100, A-F |
| `education/education/doctype/student_attendance/student_attendance.py` | Luật điểm danh: trùng bản ghi, học sinh phải thuộc lớp, không điểm danh ngoài thời gian khoá học |
| `education/education/api.py:606-662` `apply_leave` | Chỉ để tham khảo. Hệ mới không có nghỉ phép/`excused` |
| `frontend/src/pages/Schedule|Attendance|Grades|Fees.vue`, `Calendar.vue` | Cấu trúc portal học sinh: lịch, điểm danh dạng calendar, bảng điểm, danh sách hóa đơn |
| `frontend/` (Vue 3 + Vite + Tailwind + Pinia + vue-router) | Giữ stack Vue 3 + Tailwind + Pinia. Bỏ `frappe-ui`, `frappeRequest` vì gắn chặt Frappe; Vite 2.7 quá cũ, nâng lên bản hiện hành |

### 1.2 Lỗ hổng đã có trong code (bài học, không được lặp lại)

| # | Vị trí | Vấn đề |
|---|---|---|
| 1 | `education/education/api.py:246-252` `collect_fees` | `@whitelist` nhưng không kiểm tra quyền, dùng `db.set_value` bỏ qua permission: user đăng nhập nào cũng đánh dấu được hóa đơn đã trả |
| 2 | `education/education/billing.py:47-68` `get_payment_options` | Nhận `doctype` tuỳ ý (dò tồn tại tài liệu), không kiểm tra hóa đơn thuộc về người gọi |
| 3 | `education/education/billing.py:96-127` `handle_payment_success` | Xác thực chữ ký Razorpay nhưng không ràng buộc order với hóa đơn và số tiền, cộng với `ignore_permissions`: trả 1 đồng vẫn tất toán được hóa đơn khác |
| 4 | `education/education/billing.py:5-8` | Import từ module test (`test_payment_entry`) trong code production; `razorpay` không khai báo dependency |
| 5 | `education/education/api.py:523-539` `get_student_info` | `[0]` gây IndexError với user không phải học sinh; `fields=["*"]` trả toàn bộ PII |
| 6 | `api.py` `get_student_invoices(student)`, `get_student_attendance(student, ...)` | Tin `student` do client gửi (IDOR), phụ thuộc hoàn toàn vào DocType permission. Role Student có quyền đọc `Student`, `Student Attendance`, `Assessment Result` không giới hạn theo dòng |
| 7 | `frontend/src/router.js` (`beforeEach`), `stores/session.js` | `next` không tồn tại, `sessionUser.reload()` gọi lên một hàm. Auth guard chỉ đọc cookie `user_id`, không phải cơ chế bảo mật |

Nguyên tắc rút ra cho hệ mới: mọi quyền đều **do server suy ra từ session**, không bao giờ tin `student_id`/`tenant_id` từ client; mọi truy vấn đi qua repository đã bắt buộc scope theo tenant/actor.

---

## Mục 2. Kiến trúc đích trên Cloudflare

### 2.1 Sơ đồ

```
Browser (Vue SPA, PWA)
   │  HTTPS, same-origin (cookie __Host-sid, không cần CORS)
   ▼
Cloudflare edge: WAF managed rules, Bot management/Turnstile, Rate limiting rules, TLS Full (strict), HSTS
   ▼
Worker "api"  ── Workers Static Assets (SPA) + Hono API (/api/*)
   ├─ D1  (dữ liệu chính, SQL có tham số trong repositories, migrations)
   ├─ R2  (file: tài liệu, bài nộp, audio, PDF hóa đơn, backup)
   ├─ Queues: email, notify (+ DLQ)      ── consumer: cùng Worker
   ├─ Cron Triggers: nhắc deadline, bản nháp hóa đơn tháng, dọn dẹp, backup
   ├─ Browser Rendering (HTML → PDF cho hóa đơn)
   ├─ Rate Limiting binding, Analytics Engine (KSM), Workers Logs
   └─ Cloudflare Email Service (Beta, gói Workers Paid) qua lớp EmailProvider
Admin console (/admin) ── bảo vệ bằng Cloudflare Access (SSO + MFA), Worker verify JWT Access
```

Một Worker phục vụ cả SPA lẫn API để **same-origin**: cookie `HttpOnly` + `SameSite=Lax`, không phải mở CORS, giảm bề mặt CSRF.

### 2.2 Tài nguyên theo môi trường (dev / staging / prod tách hẳn)

| Tài nguyên | Ghi chú |
|---|---|
| Worker `ptv-app-{env}` | Custom domain riêng mỗi env; `wrangler.jsonc` có khối `env` |
| D1 `ptv-db-{env}` | Location hint `apac`. Time Travel (PITR 30 ngày) + export đêm sang R2 backup. Ràng buộc đã kiểm tra: 10 GB/DB, 1.000 query/invocation, không có transaction tương tác nên dùng `db.batch()` cho thao tác nguyên tử |
| R2 `ptv-files-{env}`, `ptv-backup-{env}` | Bucket private, không bật public access. Lifecycle rule: PDF cache xoá sau 30 ngày (SAD Mục 5.3) |
| Queues `email`, `notify`, `dlq` | Retry có backoff, DLQ để điều tra |
| Turnstile | Đăng ký và xin link đăng nhập |
| Email | Binding gửi mail của Cloudflare Email Service; gửi thật cần onboard một tên miền và cấu hình SPF/DKIM/DMARC (xem dòng "Gửi email thật" ở Mục 0). Đang Beta nên chưa rõ hạn mức, đo ở M0 (xem Mục 10) |
| Secrets | `TURNSTILE_SECRET`, `HMAC_KEY`, `ACCESS_AUD`; chỉ qua `wrangler secret` hoặc Secrets Store, không có trong repo |
| Gói dịch vụ | Gói **Workers Free** là đủ cho số người dùng ít. Workers Paid (5 USD/tháng) chỉ cần khi số người dùng tăng, hoặc khi muốn Queues, Browser Rendering và Cloudflare Email Service |

### 2.3 Cấu trúc repo (monorepo pnpm)

```
apps/api        Worker: Hono + Zod + SQL có tham số trong `repos/` (chưa dùng ORM; request schema dùng chung nằm ở `packages/shared`). modules/ theo domain (auth, courses, lessons, attendance, assignments, submissions, grading, invoices, notifications, files, admin)
apps/web        Vue 3 + Vite + Tailwind + Pinia. features/<domain>/{api,model,composables} tách khỏi ui/
packages/shared Zod schema, kiểu dùng chung, ma trận quyền, mã lỗi, message catalog (MVP: English)
docs/           pvd.md, sad.md (chuyển từ root), plan.md, threat-model.md, api (OpenAPI sinh tự động)
legacy/         KHÔNG copy code. Frappe Education được giữ ở git tag `legacy-frappe-education` + nhánh `legacy/frappe`, xoá khỏi nhánh chính (Mục 8)
```

### 2.4 Các quyết định kỹ thuật cần lưu ý

| Chủ đề | Quyết định | Lý do |
|---|---|---|
| Phiên đăng nhập | Session token ngẫu nhiên 256-bit, cookie `__Host-sid`, DB chỉ lưu SHA-256 của token. Không dùng JWT | SAD cho phép cả hai; session thu hồi được ngay (đổi mật khẩu, đăng xuất mọi thiết bị) |
| Mật khẩu | **Không có.** Đăng nhập bằng link email dùng một lần (15 phút), xác nhận email bằng link (24 giờ). Không cần hash nặng nên không vướng giới hạn CPU của gói Free | Bỏ Argon2id sau spike M0 (xem `docs/spikes.md`): chạy được nhưng cần gói Paid |
| ID | UUIDv7/ULID ngẫu nhiên, không tự tăng | Chống dò ID |
| Tiền | Số nguyên + `currency` (VND không có đơn vị nhỏ) | Tránh sai số float |
| Thời gian | Lưu UTC, hiển thị theo timezone tenant/học sinh | Đúng deadline giữa các timezone |
| Upload file | Đi qua Worker (có kiểm tra quyền, dung lượng, magic bytes, quota) rồi ghi R2 bằng binding. Tải xuống cũng qua Worker có kiểm tra quyền | Khác SAD (signed URL trực tiếp) vì kiểm soát quyền và quota nguyên tử; giới hạn 25 MB/file. Chỉ tài liệu và bài nộp dạng file; video/audio không lưu trên hệ thống, chỉ là link ngoài, giảm tải và chi phí R2 |
| PDF hóa đơn | HTML → PDF bằng Browser Rendering, lưu cache R2. Phương án dự phòng: pdf-lib + nhúng font | Tên học sinh và giáo viên vẫn có dấu tiếng Việt nên font phải hỗ trợ đầy đủ ký tự có dấu |
| Excel/CSV | Xuất CSV + XLSX phía Worker | PVD 4.4 yêu cầu PDF/Excel |
| Chống spam link | Bảng `rate_limits` trong D1 (đếm theo khoá đã băm): tối đa 5 link mỗi giờ cho một email, 10 mỗi giờ cho một kết nối, cộng 5 email mỗi giờ mỗi địa chỉ | KV không nhất quán tức thời nên không dùng |
| Realtime | MVP dùng polling 60s + refetch khi focus. Durable Objects/WebSocket để phase sau | SAD Mục 5.4 cho phép polling |
| Scale | Một D1 đủ cho hàng nghìn giáo viên. Mốc cảnh báo: DB > 5 GB hoặc write latency tăng → tách D1-per-tenant-group (repository đã scope theo tenant nên chuyển được) | D1 thiết kế để scale ngang bằng nhiều DB nhỏ |

---

## Mục 3. Đặc tả logic nghiệp vụ

### 3.1 Vai trò và quyền

- **`users`** là toàn cục (email duy nhất). **`memberships(user_id, tenant_id, role)`** với `role` = `teacher` | `student`. Một người có thể là giáo viên của tenant mình và học sinh ở tenant của giáo viên khác. Portal học sinh gom khoá học từ nhiều giáo viên, mỗi request được ủy quyền theo tài nguyên.
- **`platform_admin`**: chỉ qua Cloudflare Access ở `/admin`. Không có tính năng "đăng nhập thay người dùng" ở MVP.
- **`students`** (hồ sơ do giáo viên sở hữu trong tenant: tên, SĐT, ghi chú riêng, trạng thái) khác **`users`**. `students.user_id` để trống cho đến khi học sinh chấp nhận lời mời. Ghi chú riêng của giáo viên không bao giờ lộ cho học sinh.

Ma trận quyền (nguồn duy nhất ở `packages/shared`, dùng cả cho server và test tự sinh):

| Tài nguyên | Giáo viên (trong tenant của mình) | Học sinh |
|---|---|---|
| Khoá học | CRUD, archive | Đọc các khoá đã ghi danh (và khoá công khai khi có tính năng tự đăng ký) |
| Học sinh, ghi danh | CRUD, import CSV | Đọc hồ sơ của chính mình |
| Buổi học | CRUD, lặp lại theo tuần | Đọc buổi của khoá đã ghi danh |
| Điểm danh | Ghi/sửa | Đọc của chính mình |
| Tài liệu | CRUD, kiểm soát hiển thị | Đọc/tải tài liệu khoá đã ghi danh, đã publish |
| Bài tập | CRUD, publish, gia hạn theo từng học sinh | Đọc bài được giao |
| Bài nộp | Đọc, chấm, trả bài, cho nộp lại | Tạo/sửa bản nháp/nộp bài của chính mình, đọc điểm đã trả |
| Nhận xét | CRUD (`student_visible` hoặc `private`) | Đọc nhận xét `student_visible` về mình |
| Feedback buổi học | Đọc tổng hợp | Gửi (tuỳ chọn ẩn danh) |
| Hóa đơn | CRUD khi còn nháp, gửi, đánh dấu paid/void | Đọc và tải hóa đơn của mình (khi đã gửi) |

### 3.2 Máy trạng thái

| Đối tượng | Trạng thái và chuyển đổi |
|---|---|
| Khoá học | `draft` → `active` → `archived` (khôi phục được) |
| Ghi danh | `pending` → `active` → `completed` \| `dropped`. `pending` khi chờ học sinh chấp nhận hoặc chờ duyệt (tự đăng ký) |
| Lời mời | `sent` → `accepted` \| `expired` \| `revoked`. Token dùng một lần, lưu dạng hash, hiệu lực 7 ngày |
| Buổi học | `scheduled` → `held` \| `cancelled`. Đổi giờ gửi thông báo |
| Bài tập | `draft` → `published` → `closed`. Không đổi loại bài khi đã có bài nộp |
| Bài nộp | `not_started` → `drafted` → `submitted` → `graded` (chưa trả) → `returned` (học sinh thấy điểm). Từ `returned` có thể `revision_requested` → `submitted` |
| Hóa đơn | `draft` → `sent` → `paid` \| `void`. Khi đã `sent`, số liệu bất biến; sửa = huỷ (`void`) và phát hành lại số mới, có audit |

### 3.3 Quy tắc nghiệp vụ chính

1. **Deadline chốt ở server** bằng giờ server. Sau deadline: từ chối nộp (mã lỗi riêng). Giáo viên có thể gia hạn cho từng học sinh (`submission_extensions`) hoặc bật `allow_late` (nộp trễ, gắn nhãn "trễ"). Ghi timestamp `submitted_at`, đếm `revision_count`.
2. **Giao bài**: `target_mode = all | selected`. Với `all`, học sinh ghi danh sau khi bài đã publish vẫn thấy bài (tính động theo ghi danh `active`), bản ghi bài nộp tạo lười (lazy).
3. **Trắc nghiệm**: học sinh chọn đáp án, hệ thống lưu; **giáo viên chấm tay**, không tự động (PVD Mục 8 loại tự chấm khỏi MVP).
4. **Speaking**: bài nộp là **một link video** (YouTube, Google Drive, Loom... do học sinh tự đăng). Hệ thống chỉ lưu và hiển thị link, không tải về, không nhúng player, không ghi âm. Ràng buộc: chỉ `https`, tối đa 2.048 ký tự, chặn `javascript:`/`data:`, hiển thị tên miền rõ ràng, mở tab mới với `noopener noreferrer`. Hướng dẫn của giáo viên ở đề bài nhắc học sinh đặt quyền chia sẻ để giáo viên xem được (link không xem được là lỗi thường gặp, giáo viên có nút "Yêu cầu nộp lại"). Học sinh có thể nộp thêm ghi chú văn bản.
5. **Chấm điểm**: điểm lưu nháp, chỉ hiện cho học sinh sau khi giáo viên bấm "Trả bài" (tránh lộ điểm dở dang). Mỗi lần đổi điểm/phản hồi ghi `grade_revisions` (ai, khi nào, giá trị cũ → mới). Thang điểm 0-10, 0-100, A-F cấu hình theo tenant, ghi đè theo bài tập. Điểm tổng khoá học = trung bình theo `weight` của các bài đã trả (mặc định trọng số bằng nhau).
6. **Điểm danh**: chỉ `attended | absent` (hiển thị "Attended" / "Absent"). Mặc định cả lớp "Attended", giáo viên chỉ sửa ngoại lệ. Học sinh phải thuộc khoá; không trùng bản ghi. Sửa điểm danh sau khi hóa đơn kỳ đó đã gửi thì cảnh báo và ghi audit, hóa đơn cũ không tự đổi.
7. **Hóa đơn tháng**: mỗi học sinh một hóa đơn/kỳ. Tự tính = số buổi tính tiền × `price_per_session` (cho phép giá riêng theo ghi danh). Buổi tính tiền là buổi học sinh `attended` (đã học); **`absent` không tính tiền** (quyết định đã chốt, không cần cấu hình). Buổi `cancelled` do giáo viên cũng không tính. Giáo viên vẫn chỉnh tay được từng dòng trước khi gửi. Nội dung mẫu và yêu cầu pháp lý của hóa đơn sẽ đặc tả ở M4. Giáo viên chỉnh dòng, thêm ghi chú, xem trước, tải PDF/Excel hoặc gửi email. **Số hóa đơn** liên tục theo tenant (`INV-YYYYMM-0001`), cấp bằng bộ đếm trong cùng `db.batch()` với việc insert để không sinh trùng/thủng số. Snapshot dòng hàng khi gửi.
8. **Feedback ẩn danh**: không lưu `student_id`, chỉ lưu `HMAC(key, student_id + lesson_id)` để chống gửi trùng. Giáo viên chỉ xem tổng hợp khi có ít nhất 3 phản hồi (chống suy ra danh tính).
9. **Xoá dữ liệu**: mặc định archive/soft delete, khôi phục trong 30 ngày. Xoá hẳn cần xác nhận gõ tên. Yêu cầu xoá dữ liệu cá nhân của học sinh: ẩn danh hoá hồ sơ, giữ số liệu hóa đơn theo yêu cầu kế toán.
10. **Lịch lặp**: sinh cụ thể các buổi học cho N tuần tới (`series_id`), sửa được "chỉ buổi này" hoặc "từ buổi này trở đi".
11. **Nhất quán**: các thao tác "ACID" của SAD (ghi danh, chấm điểm, hóa đơn) dùng `db.batch()` và cột `version` (optimistic locking). Thông báo và thống kê chấp nhận nhất quán cuối cùng.
12. **Idempotency**: các POST tạo tài nguyên/nộp bài nhận `Idempotency-Key` để retry an toàn khi mạng chập chờn.

### 3.4 Thông báo và email

- Trong ứng dụng: bảng `notifications`; email: đẩy vào Queue `email`, retry theo backoff, lỗi cuối vào DLQ, hiện trạng thái gửi cho giáo viên.
- Sự kiện: bài mới, sắp đến hạn (24h, dedupe theo khoá), đã có điểm/phản hồi, học sinh nộp bài, học sinh vắng, hóa đơn đã gửi, lời mời, đặt lại mật khẩu.
- Người dùng tắt được từng loại (opt-out); email an ninh và hóa đơn là bắt buộc. Có `List-Unsubscribe`, gộp nhắc nhở tránh spam.
- Chống dùng nền tảng làm relay spam: giáo viên phải xác minh email mới được mời; giới hạn số lời mời/ngày cho tenant mới.

---

## Mục 4. Kế hoạch bảo mật (chuẩn tham chiếu: OWASP ASVS L2 + OWASP Top 10)

### 4.1 Kiểm soát theo nhóm rủi ro

| Nhóm | Biện pháp |
|---|---|
| A01 Kiểm soát truy cập | Lớp policy tập trung `can(actor, action, resource)`; repository **bắt buộc** nhận `tenantId`/`actor`, không có đường truy vấn trần. Học sinh chỉ đi qua join ghi danh. Test tự sinh: mọi route × vai trò × sở hữu ⇒ mã trạng thái mong đợi. Suite chống IDOR chéo tenant chạy ở CI |
| A02 Mật mã | TLS Full (strict), TLS ≥ 1.2, HSTS preload. Không lưu mật khẩu. Token (session, link đăng nhập, link xác nhận, lời mời) ngẫu nhiên 256-bit, chỉ lưu hash, dùng một lần khi cần, so sánh hằng thời gian |
| A03 Injection/XSS | Mọi truy vấn D1 dùng `prepare().bind()` có tham số, cấm ghép chuỗi SQL, chỉ một danh sách module cho phép (`repos/`, audit, rate-limit, health...) được gọi `prepare()`; test `architecture.test.ts` giữ quy tắc này và cấm ghép chuỗi SQL. Zod xác thực mọi input (body, query, params, header). Rich text: lưu văn bản/markdown, render qua sanitizer (DOMPurify). CSP nghiêm ngặt, không `unsafe-inline` |
| A04 Thiết kế | Threat model STRIDE ở M0 (`docs/threat-model.md`), cập nhật mỗi milestone |
| A05 Cấu hình | Header: CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (tắt micro, camera, định vị), COOP. Tách env; API token Cloudflare theo đúng quyền tối thiểu |
| A06 Thành phần | Lockfile, Renovate/Dependabot, `pnpm audit`, GitHub Actions ghim theo SHA |
| A07 Xác thực | Xem 4.2 |
| A08 Toàn vẹn | CI/CD có phê duyệt cho production, không deploy từ máy cá nhân, migration D1 chạy trong pipeline |
| A09 Log/giám sát | Audit log bất biến (Mục 4.4), Workers Logs + Logpush sang R2, cảnh báo lỗi 5xx/đăng nhập thất bại tăng đột biến |
| A10 SSRF/link độc hại | Link do người dùng nhập (link buổi học online, tài liệu ngoài, **link video bài speaking**) **không bao giờ được server fetch**. Chỉ cho phép `https` (link buổi học cho phép `http`), giới hạn độ dài, chặn scheme nguy hiểm, render `rel="noopener noreferrer"`, hiển thị rõ tên miền đích. Giáo viên là người mở link nên có cảnh báo "liên kết ngoài, chỉ mở nếu tin tưởng". Không có lưu trữ/phát media nên loại bỏ cả nhóm rủi ro file audio/video |

### 4.2 Xác thực và phiên

- Đăng ký và xin link đăng nhập: Turnstile + giới hạn theo email và theo kết nối. Câu trả lời luôn giống nhau dù email có tài khoản hay không. Mail được gửi **sau khi trả lời** (`waitUntil`) nên thời gian phản hồi không lộ email nào có tài khoản.
- Không có mật khẩu, nên không có khoá tài khoản, quên mật khẩu hay kiểm tra mật khẩu bị lộ. Độ an toàn của tài khoản bằng độ an toàn của hộp thư email (đúng như luồng "quên mật khẩu" của mọi hệ thống khác). Có thể thêm TOTP cho giáo viên sau này (v1.2).
- Session: idle 7 ngày, tuyệt đối 30 ngày (học sinh: idle 24h nếu dùng magic link trên máy chung, có tuỳ chọn "thiết bị này tin cậy"); xoay token khi đăng nhập/đổi quyền; thu hồi toàn bộ khi đổi mật khẩu; trang "Thiết bị đang đăng nhập".
- Magic link: 15 phút, dùng một lần, gắn với email; lời mời: 7 ngày. Link xem hóa đơn từ email là token giới hạn 1 tài nguyên, 7 ngày.
- CSRF: `SameSite=Lax` + kiểm tra `Origin`/`Sec-Fetch-Site` cho phương thức thay đổi dữ liệu + header tuỳ chỉnh bắt buộc.
- TOTP MFA cho giáo viên: đưa vào phase 3, thiết kế bảng sẵn từ đầu. Admin console bắt buộc MFA qua Cloudflare Access.

### 4.3 File và dữ liệu người dùng tải lên

- Allowlist đuôi và MIME (pdf, docx, xlsx, pptx, txt, png, jpg, webp), **không** nhận audio/video, kiểm tra **magic bytes**, chặn Office có macro (`.docm`, `.xlsm`...), giới hạn dung lượng và quota theo tenant.
- Lưu R2 bằng khoá ngẫu nhiên, tên gốc chỉ nằm trong DB đã làm sạch. Trả file với `Content-Disposition: attachment` (trừ ảnh), `nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private`.
- Cột `scan_status` (`pending|clean|infected|skipped`) có từ đầu. **MVP đã chốt: allowlist + magic bytes, `skipped`.** Khi cần quét virus (SAD Mục 7.3) thì thêm bất đồng bộ qua Queue tới dịch vụ ngoài mà không phải đổi schema.
- Xoá file mồ côi bằng cron; PDF cache hết hạn 30 ngày.

### 4.4 Quyền riêng tư, tuân thủ, audit

- **Audit log** (ai, khi nào, IP băm, đối tượng, giá trị cũ → mới): đăng nhập thành công/thất bại, đổi mật khẩu, đổi điểm, sửa điểm danh sau khi khoá, tạo/gửi/void/paid hóa đơn, đổi vai trò, export/xoá dữ liệu, thao tác admin.
- Tối thiểu hoá dữ liệu học sinh (nhiều em là trẻ vị thành niên, không có luồng phụ huynh nên chỉ thu tên, email, SĐT tuỳ chọn). Có màn "Xuất dữ liệu của tôi" (JSON/CSV) và quy trình yêu cầu xoá. Không yêu cầu data residency; dùng location hint APAC cho D1/R2 chỉ để giảm độ trễ.
- Khuyến nghị rà soát pháp lý về bảo vệ dữ liệu cá nhân trước khi mở rộng công khai.
- Hóa đơn: quy định pháp lý sẽ đặc tả ở M4 (đã chốt hoãn). Trong lúc chưa có, PDF gọi là "Phiếu thu học phí" để tránh nhầm với hóa đơn điện tử theo quy định thuế.

### 4.5 Rate limit mặc định

| Hành động | Giới hạn |
|---|---|
| Xin link đăng nhập | 5 lần / giờ / email, 10 lần / giờ / kết nối |
| Đăng ký | 10 lần / giờ / kết nối |
| API chung | 120 req / phút / session |
| Upload | 20 file / phút / user |
| Mời học sinh (tenant mới) | 50 email / ngày cho tới khi đủ điều kiện tin cậy |

---

## Mục 5. Nguyên tắc UX và hợp đồng frontend (không phụ thuộc giao diện)

### 5.1 Nguyên tắc UX (đo được)

| Nguyên tắc | Cách áp dụng |
|---|---|
| Nhanh ra giá trị | Wizard giáo viên: tạo khoá, dán/import danh sách học sinh, đặt lịch lặp, giao bài đầu tiên. Mục tiêu setup **< 10 phút**; học sinh mở link, thấy bài, nộp **< 2 phút** (PVD Mục 9) |
| Một việc, một màn | Học sinh có "Việc cần làm" duy nhất, nhóm: quá hạn, hôm nay, sắp tới, đã nộp, sắp theo deadline; deadline hiển thị theo giờ của họ và "còn X giờ" |
| Không mất dữ liệu | Bài tự luận tự lưu nháp mỗi vài giây (local + server), giữ nguyên form khi lỗi, cảnh báo khi rời trang, retry với idempotency key khi mất mạng. Ô nhập link video kiểm tra định dạng ngay khi gõ |
| Hành động hàng loạt và mặc định thông minh | Điểm danh mặc định "có mặt" cho cả lớp; hàng đợi "cần chấm" bấm tới/lui, phím tắt; mẫu nhận xét; hoàn tác (undo) thay cho hộp thoại xác nhận với thao tác đảo được; thao tác phá huỷ = archive + khôi phục |
| Trạng thái rõ ràng | Mỗi màn có 4 trạng thái được đặc tả: loading (skeleton), rỗng (kèm hành động tiếp theo), lỗi (kèm cách khắc phục), thành công. Nhận biên nhận "đã nộp lúc HH:mm" |
| Lỗi thân thiện | Mã lỗi ổn định trong `packages/shared`, thông điệp lấy từ message catalog, lỗi theo từng trường, không lộ chi tiết kỹ thuật |
| Chữ dễ hiểu (plain English) | Toàn bộ chữ trên giao diện, thông báo lỗi và email dùng tiếng Anh cơ bản (mức A2-B1): câu ngắn, từ thông dụng, động từ rõ ràng ("Save", "Send invoice", "Turn in"), tránh từ chuyên ngành ("enrollment" → "Joined students", "submission" → "Work turned in"). Mỗi thông báo lỗi nói rõ chuyện gì xảy ra và làm gì tiếp. Có bảng thuật ngữ (glossary) trong `packages/shared` để mọi màn dùng thống nhất |
| Truy cập | WCAG 2.2 AA: bàn phím đầy đủ, focus rõ, tương phản, nhãn form, `aria-live` cho toast, vùng chạm ≥ 44 px, `prefers-reduced-motion` |
| Mobile-first | Thiết kế cho điện thoại/tablet trước (SAD Mục 10.3); PWA cài được, đọc lịch/bài tập ngoại tuyến (chỉ đọc) |
| Đơn giản | Tránh báo cáo phức tạp và giao diện rối (PVD ghi chú cuối). Báo cáo ở phase 3 chỉ có tiến độ lớp và cá nhân |
| Đo lường | Bắn sự kiện ẩn danh vào Analytics Engine cho 5 KSM của PVD (thời gian setup, tỷ lệ nộp đúng hạn, dùng hóa đơn, quay lại sau 3 tháng, rating) |

### 5.2 Kiến trúc frontend để đổi giao diện không phải viết lại logic

1. **API contract-first**: `zod-openapi` sinh OpenAPI, sinh client có kiểu. Giao diện mới chỉ cần gọi cùng client.
2. `apps/web/src/features/<domain>/` chứa **logic thuần** (composable, store, máy trạng thái nộp bài, validate, định dạng ngày/tiền) và **không import thư viện UI**.
3. `apps/web/src/ui/` là **lớp duy nhất** import thư viện component (đề xuất headless như Reka UI + Tailwind) và chỉ dùng design token qua CSS variables (màu, spacing, radius, font). Đổi giao diện = thay `ui/` và token.
4. Mọi chuỗi nằm trong message catalog (MVP chỉ English, viết theo bảng thuật ngữ plain English ở Mục 5.1), không hard-code, để thêm ngôn ngữ sau mà không sửa logic.
5. Test E2E dùng role/label và `data-testid`, không dựa vào class CSS, để không vỡ khi đổi thiết kế.

### 5.3 Danh sách màn hình cần đặc tả (để designer dùng)

| Phân hệ | Màn |
|---|---|
| Chung | Đăng ký, đăng nhập bằng link email, xác nhận email, mở link đăng nhập, chọn ngôn ngữ/timezone, thiết bị đăng nhập |
| Giáo viên | Wizard bắt đầu, Tổng quan (việc hôm nay, cần chấm, hóa đơn chờ), Khoá học (danh sách, chi tiết, tài liệu, buổi học), Học sinh (danh sách, hồ sơ, import CSV, lời mời), Lịch, Điểm danh, Bài tập (tạo/sửa/giao), Hàng đợi chấm, Nhận xét, Hóa đơn (kỳ, xem trước, gửi), Cài đặt (thang điểm, hồ sơ, thông báo) |
| Học sinh | Việc cần làm, Chi tiết khoá học, Làm/nộp bài (trắc nghiệm, tự luận, speaking bằng link video), Điểm và nhận xét, Lịch học, Hóa đơn, Gửi feedback |
| Admin | Danh sách tenant, tạm khoá, audit log |

Mỗi màn sẽ có đặc tả hành vi (dữ liệu, quyền, 4 trạng thái, lỗi) ở M0 để anh giao cho designer.

---

## Mục 6. Yêu cầu phi chức năng và chiến lược kiểm thử

### 6.1 Mục tiêu (lấy từ SAD/PVD)

| Chỉ tiêu | Mục tiêu |
|---|---|
| API p95 | < 500 ms |
| Dashboard | < 2 s |
| Tạo hóa đơn hàng loạt cho 100 học sinh | < 5 phút (Cron → Queue, mỗi học sinh 1 message; Workflows nếu cần bền vững) |
| Ổn định | 0 crash với ≥ 20 học sinh/giáo viên |
| Uptime | 99,5% |
| Khôi phục | RPO ≤ 24h (export đêm), PITR trong 30 ngày qua D1 Time Travel; diễn tập khôi phục ở M6 |

### 6.2 Kiểm thử

| Loại | Công cụ / phạm vi |
|---|---|
| Unit | Vitest: policy, máy trạng thái, tính hóa đơn, thang điểm, deadline/timezone |
| Integration | `@cloudflare/vitest-pool-workers` (Miniflare có D1/R2/Queues) cho từng module API |
| Ma trận phân quyền | Test sinh tự động từ ma trận ở `packages/shared` |
| Bảo mật | Suite IDOR chéo tenant, upload độc hại (giả đuôi/magic bytes, quá dung lượng), CSRF, rate limit, snapshot header; Semgrep, gitleaks, `pnpm audit` mỗi PR; OWASP ZAP baseline hàng tuần trên staging; pen test ngoài trước khi mở beta |
| E2E | Playwright chạy trên `wrangler dev`/preview: hành trình giáo viên mới, hành trình học sinh nộp bài, hóa đơn |
| A11y | axe-core trong Playwright |
| Tải | k6 theo mục tiêu 6.1 |
| Usability | 3 giáo viên dùng thử (PVD Mục 9), đo thời gian setup và nộp bài |

---

## Mục 7. Lộ trình triển khai

Ước lượng thô cho 1-2 dev, khoảng 14 tuần đến beta. Mỗi milestone kết thúc bằng deploy staging.

| MS | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| **M0 Nền tảng** (1 tuần) | Tái cấu trúc repo (Mục 8); monorepo, Worker + D1 + R2 + Queues qua `wrangler.jsonc` 3 env; CI/CD (lint, typecheck, test, deploy staging/prod có phê duyệt, migration); security headers, logging, mã lỗi, i18n; **spike Argon2id** đo CPU; **spike Cloudflare Email Service** (kiểm chứng có gửi được từ `workers.dev` không, và cần gì để gửi thật; nếu cần tên miền thì hoãn phần gửi thử sang khi có, đo hạn mức, độ trễ, tỷ lệ vào inbox); adapter email chế độ dev + màn hình xem `email_outbox`; threat model; đặc tả hành vi các màn hình | Deploy staging tự động, `GET /api/health`, 2 spike có số đo và quyết định |
| **M1 Tenant và xác thực** (2 tuần) | Đăng ký giáo viên + xác minh email, đăng nhập bằng link email, session, lời mời học sinh, Turnstile, rate limit, audit log, policy layer + repository scope, thiết bị đăng nhập | Suite IDOR/AuthN xanh; không có đường query thiếu tenant; cùng thông điệp khi email không tồn tại |
| **M2 Khoá học, học sinh, buổi học, điểm danh** (2 tuần) | CRUD khoá học (PVD 4.1, 5.5), học sinh + ghi danh + import CSV, buổi học và lịch lặp, điểm danh mặc định cả lớp, nhận xét (PVD 4.5) | Quản lý 20 học sinh không lỗi; điểm danh cả lớp ≤ 3 thao tác |
| **M3 Bài tập, nộp bài, chấm điểm, file** (2,5 tuần) | Upload/tải file an toàn (tài liệu, bài nộp dạng file), tài liệu khoá học, 3 loại bài tập (speaking = link video, kiểm tra link), giao bài (all/selected), máy trạng thái nộp bài, autosave nháp, thang điểm, chấm/phản hồi, "Trả bài", grade_revisions, gia hạn, "Yêu cầu nộp lại" | Nộp bài < 2 phút; deadline chốt server; bộ test upload độc hại và link độc hại xanh |
| **M4 Hóa đơn và email** (2 tuần) | Đặc tả chi tiết hóa đơn (gồm nội dung pháp lý nếu cần) ngay đầu milestone; EmailProvider (Cloudflare Email Service) + Queue + DLQ, template email và PDF bằng plain English, tính hóa đơn tháng (chỉ buổi `attended`), số liên tục, xem trước, PDF/XLSX, gửi email kèm link an toàn, đánh dấu paid/void, cron bản nháp hóa đơn | Hóa đơn 100 học sinh < 5 phút; số hóa đơn không trùng/thủng khi chạy song song |
| **M5 Portal học sinh, thông báo, hoàn thiện** (2 tuần) | Dashboard "Việc cần làm", điểm/nhận xét/hóa đơn/lịch, thông báo in-app + email, nhắc deadline, opt-out, PWA, a11y, xuất/xoá dữ liệu cá nhân, admin console tối thiểu (Access) | axe không lỗi nghiêm trọng; nhắc deadline không trùng lặp |
| **M6 Kiểm định và beta** (2 tuần) | Pen test, ZAP, k6, diễn tập backup/restore, runbook sự cố, giám sát và cảnh báo, beta ≥ 3 giáo viên | Đạt Mục 6.1 và tiêu chí thành công PVD Mục 9 |
| **Sau MVP (v1.1)** | Feedback học sinh (5.1), tự đăng ký khoá học công khai/riêng tư có duyệt (5.2), thông báo nâng cao (5.4) | |
| **v1.2+** | Báo cáo và xuất (5.3), TOTP MFA, quét virus bất đồng bộ (nếu cần), payment gateway, đồng bộ lịch | |

---

## Mục 8. Xử lý code hiện tại

Thao tác này làm thay đổi cấu trúc repo nên sẽ xin xác nhận lại ở đầu M0, không tự làm khi chưa được duyệt.

1. Tạo git tag `legacy-frappe-education` và nhánh `legacy/frappe` từ `develop` hiện tại (không mất lịch sử).
2. Trên nhánh mới cho hệ thống này: gỡ `education/`, `docker/`, `pyproject.toml`, `MANIFEST.in`, workflow Frappe trong `.github/`, giữ `LICENSE` (GPL-3 của Frappe Education: **cần xác nhận** nếu có mang code sang thì ràng buộc giấy phép; kế hoạch này không copy code nên tránh được).
3. Chuyển `cms_education_pvd.md` và `cms_education_sad.md` vào `docs/`.
4. Thay `README.md`, `.github/workflows/*` bằng pipeline mới (Mục 7, M0); giữ Semgrep/pre-commit hiện có nếu còn phù hợp.

---

## Mục 9. Quyết định đã chốt ở vòng 2 và câu hỏi còn mở

**Đã chốt** (đã phản ánh vào các mục trên): điểm danh chỉ `attended`/`absent`, chỉ `attended` tính tiền; pháp lý hóa đơn hoãn tới đặc tả tính năng (M4); chấp nhận `skipped` cho quét virus; dùng Cloudflare Email Service; không cần data residency; không cần email phụ huynh; speaking chỉ gắn link video, cho mọi tên miền `https`; giao diện tiếng Anh cơ bản; VND; timezone Hồ Chí Minh; dùng địa chỉ `workers.dev` có sẵn của Cloudflare, không cần tên miền riêng.

**Còn mở (không chặn M0):**
1. Gửi email thật cần một tên miền. Chưa cần quyết ngay: M0 đến M3 chạy được hoàn toàn với email dev (ghi vào `email_outbox`). Chỉ cần quyết trước M4/beta, khi giáo viên và học sinh thật cần nhận magic link và hóa đơn qua email. Lúc đó có 2 lựa chọn: mua một tên miền rẻ chỉ để gửi email, hoặc dùng tên miền anh đã có.

---

## Mục 10. Rủi ro chính

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Vượt 10 mili-giây xử lý mỗi request trên gói Free (nhập CSV 200 dòng, danh sách lớn) | Thấp | Đo ước lượng: kiểm tra 200 dòng CSV khoảng 2 mili-giây lần đầu, dưới 0,5 khi đã nóng. Sau lần deploy đầu xem CPU time trong dashboard; nếu gần trần thì giảm số dòng nhập tối đa hoặc nâng lên Workers Paid |
| D1 không có transaction tương tác | Trung bình | Thiết kế mọi thao tác nguyên tử quanh `db.batch()` và bộ đếm; test đồng thời |
| Rò rỉ dữ liệu chéo tenant | Cao | Repository bắt buộc scope + suite IDOR ở CI + pen test |
| Lạm dụng email (spam) | Trung bình | Xác minh email, giới hạn lời mời, rate limit, List-Unsubscribe |
| Cloudflare Email Service còn Beta (hạn mức, SLA, deliverability chưa rõ) | Trung bình | Spike ở M0; `EmailProvider` trừu tượng để đổi sang Resend/Postmark chỉ bằng thay adapter; email lời mời/hóa đơn luôn có hiển thị trạng thái gửi và nút gửi lại; thông báo in-app là kênh dự phòng |
| Link video của học sinh không xem được hoặc là link độc hại | Thấp | Kiểm tra định dạng, hiển thị tên miền, cảnh báo liên kết ngoài, "Yêu cầu nộp lại" |
| Mở rộng phạm vi (scope creep) | Cao | Bám PVD Mục 8 (Out of Scope); mọi thêm bớt đi qua bảng ưu tiên |
| Giao diện thay đổi muộn | Trung bình | Kiến trúc 5.2 và đặc tả màn hình ở M0 |
| Kiểm soát quyền D1 khi lên nhiều DB | Thấp | Repository đã scope theo tenant; chuyển D1-per-tenant-group khi đạt mốc |

---

## Mục 11. Cách kiểm chứng end-to-end

1. `pnpm install && pnpm test` chạy unit + integration (Miniflare) + ma trận phân quyền, tất cả xanh.
2. `wrangler dev` (local D1/R2/Queues) rồi `pnpm e2e` (Playwright): giáo viên mới hoàn thành wizard dưới 10 phút; học sinh nhận magic link, xem bài, nộp tự luận và link video speaking dưới 2 phút; giáo viên chấm, trả bài, học sinh thấy điểm; tạo hóa đơn tháng, tải PDF, email đến hộp thư thử.
3. Bộ bảo mật: IDOR chéo tenant trả 404/403; upload file giả đuôi bị từ chối; link `javascript:`/`http` cho bài speaking bị từ chối; nộp sau deadline bị từ chối trừ khi được gia hạn; sai mật khẩu 6 lần bị khoá; header đúng snapshot; ZAP baseline không lỗi cao.
4. Staging: `k6` đạt p95 < 500 ms, tạo hóa đơn 100 học sinh < 5 phút; kill Queue consumer rồi kiểm tra retry và DLQ; khôi phục D1 từ Time Travel thành công.
5. Đối chiếu từng tiêu chí thành công trong PVD Mục 9 trước khi mở beta.
