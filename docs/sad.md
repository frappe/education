# Software Architecture Document: Classroom Management System

## 1. Architecture Overview

Classroom Management System được thiết kế theo **mô hình Client-Server với separation of concerns** giữa Teacher Portal, Student Portal, và Admin Console, đều tương tác với centralized Backend API.

### 1.1 Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Cloud Infrastructure                         │
├──────────────────────┬──────────────────────┬──────────────────────┤
│  Teacher Portal      │  Student Portal      │  Admin Console       │
│  (Web/Mobile)        │  (Web/Mobile)        │  (Dashboard)         │
└──────────┬───────────┴──────────┬───────────┴──────────┬───────────┘
           │                      │                      │
           │                   API Layer (REST/GraphQL)  │
           │                                             │
┌──────────┴─────────────────────────────────────────────┴───────────┐
│                      Backend Services                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │   User Mgmt  │ │  Course Mgmt  │ │  Assignment  │               │
│  │  & Auth      │ │  & Enrollment │ │  & Grading   │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │  Lesson Mgmt │ │  Invoice Mgmt │ │  Feedback &  │               │
│  │  & Material  │ │  & Payment    │ │  Reporting   │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
└─────────┬────────────────────────────────────────────────┬─────────┘
          │                                                │
┌─────────┴────────────────────┬──────────────────────────┴─────────┐
│         Database Layer        │      File Storage Layer            │
│  (PostgreSQL / MySQL)         │  (Cloud Storage Service)           │
│  - Users                      │  - Assignment Files                │
│  - Courses                    │  - Lesson Materials                │
│  - Lessons & Materials        │  - Invoice PDFs                    │
│  - Assignments & Submissions  │  - User Avatars                    │
│  - Grades & Feedback          │                                    │
│  - Invoices                   │                                    │
│  - Notifications              │                                    │
└───────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Core Components & Responsibilities

### 2.1 User Management & Authentication Service
**Chức năng:**
- Quản lý tài khoản người dùng (giáo viên, học sinh, admin)
- Xác thực (login/logout, password reset, email verification)
- Quản lý quyền truy cập (role-based access control: teacher, student, admin)
- Session management & token-based authentication

**Trách Nhiệm:**
- Bảo vệ dữ liệu người dùng
- Hỗ trợ đăng nhập/đăng xuất an toàn
- Xác thực email người dùng
- Hỗ trợ lấy lại mật khẩu

---

### 2.2 Course & Enrollment Management Service
**Chức năng:**
- Tạo/chỉnh sửa khóa học
- Quản lý danh sách học sinh của mỗi khóa học
- Cho phép đăng ký khóa học (thủ công hoặc tự động)
- Theo dõi trạng thái của học sinh (active, completed, dropped)
- Quản lý thông tin khóa học (mô tả, mục tiêu, lịch học, giá)

**Trách Nhiệm:**
- Đảm bảo giáo viên chỉ quản lý các khóa học của chính họ
- Học sinh chỉ thấy khóa học đã đăng ký
- Hỗ trợ xóa/archive khóa học khi kết thúc

---

### 2.3 Lesson & Material Management Service
**Chức năng:**
- Tạo bài giảng, thêm nội dung (text, link tài liệu)
- Upload tài liệu (PDF, Word, Excel, hình ảnh)
- Tổ chức bài giảng thành chuỗi học tập
- Học sinh download tài liệu, xem nội dung bài học

**Trách Nhiệm:**
- Lưu trữ file an toàn, backup tự động
- Cho phép giáo viên kiểm soát quyền truy cập bài học
- Học sinh chỉ truy cập bài học của khóa học đã đăng ký

---

### 2.4 Assignment & Submission Service
**Chức năng:**
- Tạo bài tập (trắc nghiệm, tự luận, speaking)
- Gán bài tập cho học sinh cụ thể hoặc cả lớp
- Đặt deadline
- Học sinh nộp bài (text, file, hoặc ghi âm)
- Lưu trữ submission, kèm timestamp
- Quản lý trạng thái submission (drafted, submitted, graded)

**Trách Nhiệm:**
- Đảm bảo deadline được enforce (không cho phép nộp sau deadline)
- Ghi lại lịch sử submission
- Hỗ trợ revise (học sinh có thể nộp lại hoặc giáo viên cho phép)
- Tối ưu lưu trữ file submission

---

### 2.5 Grading & Feedback Service
**Chức năng:**
- Giáo viên chấm điểm bài tập
- Viết phản hồi chi tiết cho từng bài
- Lưu lịch sử chấm chữa
- Học sinh xem điểm & phản hồi
- Tính điểm tổng khóa học

**Trách Nhiệm:**
- Đảm bảo giáo viên chỉ chấm chữa bài của học sinh trong khóa học của họ
- Lưu trữ phản hồi để học sinh theo dõi tiến bộ
- Hỗ trợ tuỳ chỉnh scale điểm (0-10, 0-100, A-F)

---

### 2.6 Lesson Schedule & Attendance Service
**Chức năng:**
- Giáo viên lên lịch buổi học (ngày, giờ, địa điểm/link)
- Quản lý danh sách dự kiến học sinh
- Điểm danh (có mặt/vắng mặt) sau buổi học
- Học sinh xem lịch học sắp tới
- Thống kê tỷ lệ attendance của học sinh

**Trách Nhiệm:**
- Gửi thông báo cho học sinh về buổi học sắp tới
- Lưu trữ lịch sử buổi học & attendance
- Hỗ trợ tìm kiếm buổi học theo ngày, khóa học

---

### 2.7 Invoice & Billing Service
**Chức năng:**
- Giáo viên tạo hóa đơn hàng tháng (thủ công hoặc tự động)
- Hóa đơn chứa: khóa học, số buổi học, học phí, tổng cộng, notes
- Download hóa đơn (PDF)
- Gửi hóa đơn cho học sinh qua email
- Quản lý trạng thái hóa đơn (draft, sent, paid)

**Trách Nhiệm:**
- Đảm bảo hóa đơn đúng format, pháp lý
- Lưu lịch sử hóa đơn, hỗ trợ re-send
- Học sinh có thể download lại hóa đơn từ portal

---

### 2.8 Student Feedback & Comment Service
**Chức năng:**
- Học sinh gửi feedback về buổi học (survey ngắn hoặc comment)
- Giáo viên xem tổng hợp feedback
- Giáo viên viết nhận xét chung cho học sinh (tiến độ, thái độ, điểm mạnh)
- Học sinh xem nhận xét từ giáo viên

**Trách Nhiệm:**
- Ẩn danh feedback nếu học sinh muốn
- Lưu lịch sử nhận xét để theo dõi sự phát triển

---

### 2.9 Notification & Email Service
**Chức năng:**
- Gửi thông báo (in-app & email) cho:
  - Học sinh: bài tập mới, deadline sắp tới, nhận được phản hồi, lịch học
  - Giáo viên: học sinh nộp bài, học sinh vắng mặt, phản hồi từ học sinh
- Quản lý tần suất gửi (không spam)

**Trách Nhiệm:**
- Đảm bảo email được gửi đúng giờ
- Hỗ trợ opt-in/opt-out notifications
- Retry mechanism nếu email fail

---

### 2.10 Reporting & Analytics Service
**Chức năng:**
- Báo cáo tiến độ khóa học (tỷ lệ hoàn thành bài tập, điểm trung bình, attendance)
- Báo cáo cá nhân học sinh (bài tập hoàn thành, điểm, nhận xét)
- Export dữ liệu (CSV, PDF)
- Dashboard thống kê cho giáo viên

**Trách Nhiệm:**
- Tính toán đúng thống kê
- Hiệu suất query lớn (không quá chậm)
- Hỗ trợ filter theo khoảng thời gian

---

## 3. Data Model (Tóm Tắt)

### 3.1 Core Entities
```
Users
├── id, email, password_hash, name, role (teacher/student/admin)
├── phone, avatar, created_at, last_login
└── profile_data (bio, qualifications nếu là teacher)

Courses
├── id, teacher_id, name, description, status
├── start_date, end_date, price_per_session
└── is_public, max_students, created_at

Enrollments
├── id, course_id, student_id, status (active/completed/dropped)
├── enrolled_at, completed_at
└── notes

Lessons
├── id, course_id, title, description, sequence
├── lesson_date, duration, location_or_link
└── materials (uploaded files reference)

Assignments
├── id, lesson_id, type (multiple_choice/essay/speaking)
├── title, description, deadline, max_score
└── instructions, sample_submission

Submissions
├── id, assignment_id, student_id, submitted_at
├── content (text/file_url/audio_url), status (drafted/submitted/graded)
└── revision_count

Grades
├── id, submission_id, score, feedback, graded_at
├── graded_by (teacher_id)
└── rubric_applied (nếu có)

Attendance
├── id, lesson_id, student_id, status (present/absent/late)
├── marked_at, marked_by (teacher_id)
└── notes

Invoices
├── id, teacher_id, start_date, end_date, status
├── total_amount, issued_at, paid_at
├── line_items (course_name, sessions_count, unit_price)
└── students_list

Comments
├── id, student_id, teacher_id, content, type (general/on_assignment)
├── created_at, updated_at
└── rubric_category (nếu có structured comment)

Feedback
├── id, lesson_id, student_id, rating (1-5), comment
├── submitted_at, anonymous (yes/no)
└── question_responses (JSON for survey questions)
```

---

## 4. System Interactions & Key Workflows

### 4.1 Teacher Workflow: Create & Grade Assignment
```
1. Teacher logs in → selects course
2. Teacher creates assignment (title, type, deadline, description)
3. System saves assignment → shows confirmation
4. Teacher assigns to: specific students or entire class
5. System sends notification to students (async)
6. Students submit → system records submission (with timestamp)
7. Teacher reviews submissions → grades & writes feedback
8. System sends notification to student (grade posted)
9. Student views grade & feedback in portal
```

### 4.2 Student Workflow: Submit Assignment & View Feedback
```
1. Student logs in → selects course
2. Portal shows: assignments (pending, due today, overdue, completed)
3. Student clicks on assignment → reads description & instructions
4. Student submits: (type-dependent)
   - Multiple choice: clicks answers, submits
   - Essay: types/pastes text, uploads file
   - Speaking: records audio, uploads
5. System confirms submission, shows "submitted at [time]"
6. Student waits for feedback
7. When teacher grades → student gets notification
8. Student views: grade, teacher feedback, rubric (if applicable)
```

### 4.3 Teacher Workflow: Generate & Send Invoice
```
1. Teacher navigates to "Billing" → selects month
2. System shows: enrolled students, sessions taught, sessions per student
3. Teacher can adjust or auto-calculate:
   - Default: [sessions_count × price_per_session]
4. Teacher reviews invoice → adds notes if needed
5. Teacher downloads invoice (PDF) or sends directly to students
6. System records invoice, sends email to students
7. Student receives email → downloads invoice from portal
```

### 4.4 Student Workflow: View Dashboard & Progress
```
1. Student logs in → sees "Dashboard" or "My Courses"
2. Shows:
   - Courses enrolled (with upcoming lessons)
   - Pending assignments (due dates sorted)
   - Recent grades & feedback
   - Attendance summary
   - Messages from teacher
3. Click on course → detailed view: lessons, assignments, grades, comments
4. Click on assignment → full details, feedback, revision option (if allowed)
```

---

## 5. Architectural Patterns & Decisions

### 5.1 Separation of Concerns
- **Frontend (Portal Layer):** Teacher Portal, Student Portal, Admin Dashboard
  - Responsible for UI, form validation, caching, user experience
  - Communicates via REST API or GraphQL

- **Backend (Service Layer):** Microservices or monolith with clear service boundaries
  - Each service handles a business domain (courses, assignments, invoicing, etc.)
  - Services communicate via internal APIs or message queue (async jobs)

- **Data Layer:** Centralized database(s) with clear schema
  - Normalized for consistency & performance
  - Backup & disaster recovery built-in

### 5.2 Authentication & Authorization
- **Session-based (server)** or **Token-based (JWT)** authentication
- Role-based access control (RBAC):
  - Teacher: full control of own courses, students, assignments, invoices
  - Student: read-only access to enrolled courses, assignments, grades
  - Admin: view all, manage system settings, user management
- API endpoints enforce authorization (e.g., `GET /courses/123` checks if requester is teacher or enrolled student)

### 5.3 File Storage Strategy
- **Lesson Materials & Assignment Files:** Uploaded to cloud storage (CDN)
  - Can be large (PDFs, videos, audio)
  - Served via signed URLs (secure, short-lived)
  - Versioning supported

- **Invoice PDFs:** Generated on-the-fly or cached (short-lived)
  - Stored temporarily, auto-cleanup after 30 days

- **User Avatars:** Small image files, cached aggressively

### 5.4 Real-Time Notification Strategy
- **In-App Notifications:** Stored in DB, fetched via API polling or WebSocket
- **Email Notifications:** Sent asynchronously via job queue (to avoid blocking requests)
  - Retry logic for failed emails
  - Rate limiting to prevent spam

### 5.5 Data Consistency
- **ACID compliance:** All critical transactions (enrollment, grading, invoice) must succeed or fail completely
- **Eventual Consistency:** Non-critical data (notifications, analytics) can be eventually consistent

---

## 6. Scalability Considerations

### 6.1 Horizontal Scaling
- Stateless backend services → can run multiple instances
- Load balancer distributes requests
- Database connection pooling

### 6.2 Database Optimization
- Indexing on frequently queried fields (teacher_id, course_id, student_id, deadline)
- Query optimization (avoid N+1 queries)
- Read replicas for analytics/reporting (if needed)

### 6.3 Caching Strategy
- **Application Cache:** Course list, teacher profile (low change rate)
- **Browser Cache:** Static assets (CSS, JS, images)
- **CDN Cache:** Lesson materials & invoice files

### 6.4 Async Processing
- **Background Jobs:** Generate invoices, send emails, generate reports
- **Message Queue:** Decouple long-running tasks from request-response

---

## 7. Security Considerations

### 7.1 Data Protection
- HTTPS/TLS for all communication
- Password hashing (bcrypt or similar)
- SQL injection prevention (parameterized queries)
- XSS & CSRF protection

### 7.2 Access Control
- Role-based access control (RBAC) at API level
- Data isolation (teacher sees only their courses, students see only enrolled courses)
- Audit logging of sensitive actions (grade changes, invoice generation)

### 7.3 File Security
- Antivirus scanning on uploaded files
- File type validation (no executable files)
- Secure file storage (encryption at rest)

### 7.4 Compliance
- GDPR compliance (data deletion, export)
- Local data residency (if required by regulations)
- Regular security audits & penetration testing

---

## 8. Deployment & Infrastructure

### 8.1 Infrastructure Setup
- **Cloud Platform:** AWS, GCP, Azure, or VPS
- **API Server:** Multiple instances behind load balancer
- **Database:** Managed service (RDS, Cloud SQL, etc.) with automated backups
- **File Storage:** Object storage (S3, GCS, etc.) with CDN
- **Email Service:** Third-party service (SendGrid, Mailgun, etc.)

### 8.2 Monitoring & Logging
- Application logs → centralized logging system
- Performance monitoring (response time, error rate, CPU, memory)
- Database monitoring (query performance, disk usage)
- Alerts for critical issues (email service down, database error, high error rate)

### 8.3 Disaster Recovery
- Database backup (daily or more frequent)
- Point-in-time recovery capability
- Failover strategy (active-passive or active-active)

---

## 9. Integration Points

### 9.1 External Services
- **Email Service:** SendGrid, Mailgun (send notifications, invoices)
- **Payment Gateway:** (Future) Stripe, PayPal (payment processing when scope expands)
- **File Storage:** AWS S3, Google Cloud Storage, Azure Blob Storage
- **Analytics:** Google Analytics, Mixpanel (optional, for product insights)

### 9.2 Third-Party Integrations (Future)
- **Calendar Sync:** Google Calendar, Outlook (optional)
- **Video Hosting:** YouTube, Vimeo (optional, for lesson videos)
- **Payment:** Stripe, PayPal (if billing automation needed)

---

## 10. Quality Attributes

### 10.1 Performance
- API response time: < 500ms for 95th percentile
- File upload/download: efficient, with progress tracking
- Dashboard load time: < 2 seconds
- Batch operations (generate invoices for 100 students): < 5 minutes

### 10.2 Availability
- System uptime: 99.5% SLA
- Maintenance windows: planned during off-hours
- Graceful degradation (if one service down, others still work)

### 10.3 Usability
- Intuitive UI for teachers (no steep learning curve)
- Mobile-responsive design (works on phones & tablets)
- Offline capability (some features, if needed)

### 10.4 Maintainability
- Clear API documentation (OpenAPI/Swagger)
- Code comments & architecture documentation
- Automated testing (unit, integration, E2E)
- CI/CD pipeline for continuous deployment

---

## 11. Architectural Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Database bottleneck | High load on single DB | Read replicas, caching, DB optimization |
| File storage outage | Can't access materials/invoices | Multiple storage backends, backup |
| Email service down | Notifications don't reach users | Retry logic, fallback service, in-app notifications |
| Security breach | Student data compromised | Encryption, access control, audit logging |
| Scope creep | Delays MVP launch | Clear MVP definition, phased rollout |

---

## 12. Technology Stack Recommendation (Guidance Only)

**Frontend:** Modern web/mobile framework (flexible choice based on team expertise)
**Backend:** RESTful API, stateless services
**Database:** Relational DB for consistency (data model is normalized)
**File Storage:** Cloud object storage with CDN
**Email:** Third-party service (managed)
**Hosting:** Cloud platform with auto-scaling
**Monitoring:** Centralized logging & alerting

*(Details omitted per product strategy preference)*

---

## 13. Future Architecture Evolution

### Phase 1 (MVP)
- Monolithic or simple microservices
- Single database
- File storage in cloud

### Phase 2 (v1.1+)
- Consider service separation if performance bottlenecks appear
- Add caching layer (Redis) if needed
- Implement async job queue for background tasks

### Phase 3 (v2.0+)
- Microservices architecture (if complexity increases)
- Event-driven architecture (kafka, for real-time notifications)
- Advanced analytics & ML (student performance prediction)

---

## Appendix: Component Interaction Matrix

| Component A | Component B | Interaction Type | Async? |
|---|---|---|---|
| Student Portal | Assignment Service | Submit assignment | Sync |
| Assignment Service | Submission Service | Store submission | Sync |
| Grading Service | Submission Service | Fetch for grading | Sync |
| Grading Service | Notification Service | Notify student (grade posted) | Async |
| Invoice Service | Email Service | Send invoice | Async |
| Teacher Portal | Attendance Service | Mark attendance | Sync |
| Enrollment Service | Notification Service | Notify student (enrolled) | Async |
| Admin Console | User Service | Create/manage users | Sync |
| Analytics Service | All services | Aggregate data | Async |

---

**Lần cập nhật cuối:** [Today]  
**Phiên bản:** 1.0
