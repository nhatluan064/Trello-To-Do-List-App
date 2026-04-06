# 🗺️ ROADMAP — Internal Trello

> File này ghi lại **tiến độ phát triển** và **kế hoạch tương lai**.
> Khi thêm tính năng mới → đánh dấu `[x]` và ghi ngày hoàn thành.
> Khi bắt đầu Phase mới → tạo section mới bên dưới.

---

## ✅ Phase 1 — Core Kanban (Hoàn thành 2026-04-04)

### Backend
- [x] SQLite database setup với `better-sqlite3`
- [x] Schema đầy đủ: users, boards, board_members, columns, cards, labels, card_labels, comments
- [x] Auth: register, login, logout, session (`express-session`)
- [x] Admin seed: tự tạo tài khoản `admin/admin123` khi DB trống
- [x] Board CRUD API (`/api/boards`)
- [x] Column CRUD + reorder API (`/api/columns`)
- [x] Card CRUD + move (drag-drop) API (`/api/cards`)
- [x] Comments API (`/api/cards/:id/comments`)
- [x] Admin API: list users, create user, reset password, toggle active

### Frontend
- [x] SPA single-page app (index.html + 5 JS modules)
- [x] Auth screen (login/register) với animation glassmorphism
- [x] Dashboard boards dạng grid, mỗi card là board
- [x] Kanban board view với drag-and-drop (HTML5 API)
- [x] Card detail modal: title, description, priority, due date, comments
- [x] Admin panel: quản lý users (tạo, reset PW, khóa/mở)
- [x] Toast notification system
- [x] Dark theme, responsive, Inter font

---

## ✅ Phase 2 — Team Collaboration (Hoàn thành 2026-04-06)

### Backend
- [x] `GET /api/boards/:id/members` — DS members của board
- [x] `POST /api/boards/:id/members` — Mời user vào board (only owner/admin)
- [x] `DELETE /api/boards/:id/members/:userId` — Xóa member (không xóa được owner)
- [x] `GET /api/boards/:id` cập nhật: trả thêm `labels` cho từng card + `members` của board
- [x] `GET /api/boards/:boardId/labels` — DS labels của board
- [x] `POST /api/boards/:boardId/labels` — Tạo label mới
- [x] `DELETE /api/labels/:id` — Xóa label (cascade xóa card_labels)
- [x] `GET /api/cards/:cardId/labels` — Labels của card
- [x] `POST /api/cards/:cardId/labels` — Gán label vào card
- [x] `DELETE /api/cards/:cardId/labels/:labelId` — Gỡ label khỏi card
- [x] `GET /api/auth/users-list` — DS user để invite member (dropdown)
- [x] `PUT /api/cards/:id` mở rộng: hỗ trợ `assignedTo` field

### Frontend
- [x] Nav buttons: "Thành viên" và "Nhãn" (hiện khi ở kanban view)
- [x] Members Modal: list members, invite từ dropdown, xóa member
- [x] Labels Modal: list labels, tạo label mới (chọn màu), xóa label
- [x] Card Modal mở rộng: dropdown "Người phụ trách" + label picker toggle
- [x] Label Pills trên kanban card (màu sắc)
- [x] Assignee Avatar trên kanban card
- [x] CSS đầy đủ cho tất cả component Phase 2

---

## ✅ Phase 3A — Search, Filter & View Enhancement (Hoàn thành 2026-04-06)
- [x] Thanh tìm kiếm card theo title/description
- [x] Filter card theo: date, label, assignee
- [x] Responsive Design cho màn phân giải hẹp (1366x768) tránh hụt Modal
- [x] Fix gãy layout Cuộn dọc/ngang (Scroll Overflow Cutoff) của danh sách To-Do-List do xung đột Flexbox
- [x] Hiển thị mặc định Ngày khởi tạo (Created Date) trên giao diện thẻ
- [x] Tính năng realtime frontend filter, tốc độ phản hồi ngay lập tức, không tốn tài nguyên tải lại API
- [x] Nút Clear Filter (chỉ xuất hiện khi đang có bộ lọc)

---

## ✅ Phase 4 — Data Safety & Recycle Bin (Hoàn thành 2026-04-06)
- [x] **Soft Delete Architecture**: Biến lệnh `DELETE` của Board, Column, Card thành cập nhật `is_deleted = 1`.
- [x] **Auto Cleanup**: Chế độ tự dọn rác đối với dữ liệu quá 7 ngày (`deleted_at < datetime('now', '-7 days')`).
- [x] **UI & UX**: Modal Custom cực ngầu thay thế `window.confirm()` khô khan của trình duyệt (Dạng Promise Async).
- [x] **Khôi phục dữ liệu**: Tích hợp UI cho "Thùng rác", tải về toàn bộ thẻ/cột bị xóa và 1 cú Click để Restore.
- **Lưu ý Cấu trúc**: Việc xóa Nhãn (Labels) hay Nhóm Nội Bộ (Members) trong Bảng vì lý do dọn dẹp kỹ thuật nên sẽ được giữ Hard Delete (Xóa thẳng không cần qua thùng rác).
- **Files đã sửa**:
  - `public/index.html`: Thêm Filter Bar UI gồm Text, Option và Date input
  - `public/css/style.css`: Media Queries (`max-width: 1366px`) và logic `.card-hidden`
  - `public/js/kanban.js`: Quản lý `this.currentFilters` và logic xử lý Date Time trên thẻ

---

## ✅ Phase 5 — Form Mẫu Nhanh & Thời Gian Dự Án Dài Hạn (Hoàn thành 2026-04-06)
- [x] **Cơ sở dữ liệu**: Bổ sung bảng `templates` (id, title, desc). Bổ sung cột `start_date` và `is_long_term` vào bảng `cards`.
- [x] **Admin Panel**: Phân chia Tab và thiết kế giao diện cho Quản lý Form Mẫu Động.
- [x] **Giao diện Modal**: Hỗ trợ Dropdown Nạp Form mẫu nhanh chỉ bằng 1 cú Click, thêm lịch chọn Ngày Bắt Đầu (Start Date), thêm Checkbox `[x] Dự Án Dài Hạn`.
- [x] **Hiển thị Bảng**: Tự động Render giao diện đặc biệt nổi bật (Viền Tím/Chữ To/Thanh Tiến Độ Timeline) khi một thẻ được ghim là Dự Án Dài Hạn.
- [x] Khắc phục triệt để lỗi Box Chi Tiết Form bị tụt mất đít (Mất nút Bấm) bằng cách fix CSS `max-height` vào class `.modal-body` thay vì Media query.

---

## ✅ Phase 6 — Realtime Collaboration & Đa Assignee (Hoàn thành 2026-04-06)
- [x] **Multi-Assignee**: Bảng `card_assignees` cho phép gán nhiều người phụ trách 1 thẻ. UI chuyển từ Dropdown đơn sang Multi-Checkbox Picker.
- [x] **Socket.IO Realtime**: Cài đặt `socket.io`, tích hợp vào `server.js` với Room-based architecture (mỗi Board = 1 Room).
- [x] **Backend Emit**: Mọi action Create/Update/Delete/Move Card, Create/Delete Column đều phát tín hiệu `board-updated` tới tất cả client đang xem Board đó.
- [x] **Frontend Listen**: `kanban.js` kết nối Socket, lắng nghe sự kiện và tự động `silentReload()` mà không làm gián đoạn UX.
- [x] **Avatar Cluster**: Hiển thị tối đa 3 avatar xếp chồng + badge "+N" trên mỗi thẻ ngoài Bảng.
- [x] **Bug Sweep**: Quét sạch toàn bộ `req.user.id` còn sót → `req.session.userId` (column, trash, template routes).
- [x] **Thùng rác nâng cao (Batch Action)**: Hỗ trợ "Chọn tất cả" bằng Checkbox, Nút Xóa Vĩnh Viễn hàng loạt và Nút Khôi Phục hàng loạt. Đã xử lý triệt để bug treo hệ thống khi Auto-commit va chạm với Transactions thủ công trong `sql.js`.

---

## 🔜 Phase 3B — Notifications & Activity (Kế hoạch)
- [ ] Activity log per board (ai làm gì lúc nào)
- [ ] Badge số notification trên nav
- [ ] Table `activity_logs`: `board_id, user_id, action, target_type, target_id, created_at`
- **Files cần sửa**:
  - `src/db/database.js`: thêm bảng `activity_logs`
  - Tạo `src/routes/activity.routes.js`
  - `server.js`: mount route mới
  - `api.js`: thêm methods
  - `index.html` + `app.js`: UI hiển thị

### 3C — Card Enhancements (Ưu tiên trung bình)
- [ ] Card checklist (subtasks)
- [ ] File attachments (upload image/file)
- [ ] Card cover image
- [ ] Multiple assignees (hiện chỉ 1)
- **Files cần sửa**:
  - `src/db/database.js`: bảng `card_checklists`, `card_attachments`
  - Tạo routes mới
  - `kanban.js`: mở rộng `openCardModal()`, `renderCard()`

### 3D — Board Enhancements (Ưu tiên trung bình)
- [ ] Column drag-and-drop (hiện chỉ card)
- [ ] Board background: upload ảnh (thay vì chỉ gradient)
- [ ] Board templates (tạo board từ template)
- **Files cần sửa**:
  - `column.routes.js`: reorder đã có, chỉ cần UI drag-drop
  - `kanban.js`: thêm drag-drop cho columns

### 3E — Production Ready (Ưu tiên thấp)
- [ ] Session persistence: dùng `connect-sqlite3` thay in-memory
- [ ] Rate limiting (`express-rate-limit`)
- [ ] HTTPS support (reverse proxy hoặc `https` module)
- [ ] Docker containerize
- [ ] Backup script cho SQLite DB
- **Files cần sửa**:
  - `server.js`: thêm middleware
  - `package.json`: thêm dependencies

---

## 🐛 Known Issues

| Issue | Mức độ | Ghi chú |
|---|---|---|
| Session mất sau restart server | Thấp (nội bộ) | In-memory store — dùng `connect-sqlite3` để fix |
| Không có rate limiting | Trung bình | Thêm `express-rate-limit` |
| Labels không tự reload sau khi tạo trong card modal | Thấp | Phải đóng/mở lại card modal mới thấy label mới |

---

## 📦 Dependency Map

```
package.json
├── express          — Web framework
├── express-session  — Session management
├── better-sqlite3   — SQLite (sync, nhanh hơn node-sqlite3)
├── bcryptjs         — Password hashing
├── cors             — CORS middleware
├── dotenv           — Đọc .env file
└── nodemon (dev)    — Auto-restart khi code thay đổi
```

---

## 🔧 Quick Commands

```bash
# Chạy dev (với auto-restart)
cd c:\Users\Administrator\.gemini\antigravity\scratch\internal-trello
npx nodemon server.js

# Chạy production
node server.js

# Xem DB
# Dùng DB Browser for SQLite: mở file data/kanban.db

# Reset DB (cẩn thận — xóa hết data)
del data\kanban.db && node server.js
```

---

*Tạo: 2026-04-06 | Cập nhật: 2026-04-06*
