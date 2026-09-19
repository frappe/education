# Screen behavior specs (for the designer)

These describe what each screen must **do**, not how it looks. The visual design is separate and will replace `apps/web/src/ui` and the design tokens.

Rules for **every** screen (not repeated below):

- Four states are always designed: **loading** (skeleton), **empty** (says what to do next), **error** (says what happened and what to do), **success**.
- All text comes from the message catalog, in plain English (see `packages/shared/src/glossary.ts`).
- Works with keyboard only. Touch targets at least 44 px. Phone first.
- Dates show in the person's time zone (default `Asia/Ho_Chi_Minh`). Money shows as VND without decimals.
- A form never loses what the person typed when an error happens. Field errors show next to the field.
- Anything that can be undone is undone with an "Undo" message, not a confirm box. Deleting means "archive" and can be restored for 30 days.

Milestone in brackets = when it is built.

## Everyone

| Screen | Purpose and rules | Special states / errors |
|---|---|---|
| Sign up (teacher) [M1] | "Continue with Google" (when it is set up) or name and email. Bot check. The email way sends a link that confirms the email and signs the person in. No password. | Email already used shows the same "check your email" result (and that person gets a sign in link). |
| Sign in [M1] | "Continue with Google" or email only. The email way has a bot check and sends a sign in link (works 15 minutes, once); the answer is the same for every email. A tick box "This is my own device" (on by default) keeps the person signed in for 30 days. Students are told to use the same email their teacher added. | Too many asks: same quiet answer, no mail. Google problems show on this page: `NOT_INVITED`, `GOOGLE_ACCOUNT_CHANGED`, `GOOGLE_FAILED`. |
| Open the link from email [M1] | One button ("Sign in" or "Confirm my email"). The link is used up when the button is pressed. Option "this is my own device" keeps students signed in longer. | Used or old link: `LINK_EXPIRED` with a button to ask again. |
| Verify email [M1] | Opens from the email link. | Expired link: ask again. |
| Magic link landing (student) [M1] | Student opens the invite link and joins with one button, or with "Continue with Google" using the same email the teacher added. Shows which teacher invited them. | Expired or used: "Ask your teacher for a new invite" (`LINK_EXPIRED`). Wrong Google email: back on this page with `NOT_INVITED`, the link still works. |
| Google (test page) [M1, local only] | Pretends to be Google on the developer's computer: type an email and a name. | Shows "only for testing" anywhere else. |
| Devices [M1] | List of signed-in devices, "Sign out" per device and "Sign out everywhere". | |
| Profile and settings [M5] | Name, time zone, which emails to get (security and invoice emails cannot be turned off), download my data, ask to delete my data. | |

## Teacher

| Screen | Purpose and rules | Special states / errors |
|---|---|---|
| Start guide [M2] | 4 steps: create a course, add students, set the lesson days, create the first homework. Can skip any step. Goal: done in under 10 minutes. | Progress is saved. |
| Home [M5] | Today's lessons, work waiting to be scored, invoices to send. Each item opens the right screen. | Empty: shows the start guide. |
| Courses [M2] | List with status (Draft, Active, Archived). Create, edit, archive, restore. Fields: name, description, price per lesson, dates. | Archived courses hidden by default. |
| Course detail [M2] | Tabs: Overview, Students, Lessons, Course files, Homework. | |
| Students [M2] | Search, add one, paste a list or import CSV (preview first, show which rows have problems). Status: Invited, Active, Archived. Private notes only the teacher sees. | Duplicate email: show which student it matches. |
| Student profile [M2] | Contact info, courses joined, attendance summary, scores, notes (student can see / private). | |
| Invite students [M2] | Sends an invite email. Can resend or cancel. Shows if the email was sent. | Daily limit for new accounts (`RATE_LIMITED`). |
| Lessons and calendar [M2] | Month / week view. Create one lesson or repeat weekly. Edit "only this lesson" or "this and the next ones". Cancel a lesson (students get a message). Online link or place. | Online link must start with http or https. |
| Attendance [M2] | Everyone starts as **Attended**. Teacher changes to **Absent** for exceptions. One save. | Changing attendance after the invoice was sent: warning, invoice does not change. |
| Course files [M3] | Upload files (up to 25 MB), add links, choose what students can see. | `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `STORAGE_FULL`. |
| Homework create / edit [M3] | Type: Multiple choice, Essay, Speaking (student adds a video link). Due date, who gets it (whole class or chosen students), score scale, allow late work. Draft, then Publish. | Cannot change the type after students turned in work. Changing the due date tells students. |
| Work to score [M3] | Queue of work turned in. Next / previous with keyboard. Score, write feedback, save as draft, then "Send back to student". Or "Ask to do again". Can give one student more time. | Students only see the score after "Send back". Speaking: link opens in a new tab with an outside-link warning. |
| Notes [M2] | Write a note for a student: "Student can see" or "Private". History is kept. | |
| Invoices [M4] | Choose a month, see one invoice per student (attended lessons x price). Edit lines, add a note, preview, download PDF or Excel, send by email. Mark as Paid or Cancelled. | After sending, the invoice cannot be edited (`INVOICE_LOCKED`); cancel and make a new one. Email failed: shows the reason and "Send again". |
| Score scale settings [M3] | Choose 0-10, 0-100 or A-F. | |
| Feedback summary [v1.1] | Averages and comments for a lesson. Shown only when at least 3 students answered. | |

## Student

| Screen | Purpose and rules | Special states / errors |
|---|---|---|
| To do [M5] | One list: Late, Due today, Coming soon, Turned in. Each shows the due time in the student's time. | Empty: "Nothing to do. Good job!" |
| My courses [M5] | Courses joined, next lesson for each. | |
| Course detail [M5] | Lessons, course files, homework, scores and notes. | |
| Do homework [M3] | Multiple choice: pick answers. Essay: type text and/or attach a file, saved automatically as a draft. Speaking: paste a video link (starts with https), checked as typed. Shows "Turned in at HH:mm" after sending. | After the due date: `DEADLINE_PASSED` unless the teacher gave more time or allows late work (shown as "Late"). Network lost: draft kept, retry is safe (no double turn-in). |
| Scores and notes [M5] | Scores with feedback, notes from the teacher (only the ones shared). | |
| Schedule [M5] | Upcoming lessons. | |
| Invoices [M5] | Sent invoices, download PDF. | |
| Give feedback [v1.1] | Short questions about a lesson. Option to stay anonymous. | |

## Admin (only through Cloudflare Access) [M5]

| Screen | Purpose and rules |
|---|---|
| Tenants | List of teachers, suspend or restore an account. No "sign in as user". |
| Audit log | Search sign-ins, grade changes and invoice actions. |
| Email outbox (dev mode) | Read emails that were not sent (only in dev mode). |
