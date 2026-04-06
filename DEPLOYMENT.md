# 🚀 Hướng Dẫn Mang Source Code Sang Máy Chủ (Host) Khác Trong Mạng LAN

Ứng dụng này sử dụng Node.js và SQLite, mọi dữ liệu đều lưu trong một file duy nhất, do đó việc mang sang máy khác cực kỳ dễ dàng.

---

## BƯỚC 1: Chuẩn bị trên máy tính HIỆN TẠI (Máy copy)

1. **Copy toàn bộ thư mục** `internal-trello`.
2. **Lưu ý về dữ liệu cũ**: 
   - Mọi dữ liệu (tài khoản, bảng, thẻ) đang được lưu tại thư mục `data/kanban.db`.
   - Nếu bạn muốn mang **toàn bộ dữ liệu hiện tại** sang máy kia: Hãy giữ nguyên file `kanban.db` và copy theo.
   - Nếu bạn muốn một **hệ thống mới tinh, trống rỗng**: Hãy xóa file `kanban.db` đi trước khi copy. Khi chạy ở máy mới, hệ thống sẽ tự tạo file mới với tài khoản mặc định `admin`/`admin123`.
3. Nén thư mục lại thành file `.zip` hoặc cho vào USB để mang sang máy chủ nội bộ.

---

## BƯỚC 2: Cài đặt môi trường trên MÁY CHỦ (Máy Host)

Máy chủ là một máy tính bất kỳ trong mạng công ty mà mọi người có thể kết nối tới (LAN).

1. Tải và cài đặt **Node.js** (phiên bản LTS) trên máy chủ: [https://nodejs.org/](https://nodejs.org/)
2. Mở Command Prompt (cmd) và gõ `node -v` để chắc chắn đã cài thành công.
3. Giải nén/Copy thư mục `internal-trello` từ USB vào máy chủ.

***Lưu ý:** Thư mục `node_modules` đã có sẵn các thư viện, nên bạn **không cần có mạng Internet** trên máy chủ để cài lại. Mọi thứ đã đóng gói đủ!*

---

## BƯỚC 3: Mở Port tường lửa (Quan trọng để máy khác truy cập được)

Theo mặc định, Windows Firewall của máy chủ thường chặn kết nối mạng LAN vào app. Bạn phải mở Cổng (Port) `3000`.

1. Nhấn nút Windows, gõ **"Windows Defender Firewall"** và mở nó lên.
2. Click **"Advanced settings"** ở cột bên trái.
3. Click **"Inbound Rules"** ở góc trái.
4. Chọn **"New Rule..."** ở góc phải.
5. Chọn **"Port"** -> Next.
6. Chọn **TCP** và ghi vào ô Specific local ports: `3000` -> Next.
7. Chọn **Allow the connection** -> Next -> Next.
8. Điền tên: `Internal Trello Port 3000` -> Nhấn **Finish**.

---

## BƯỚC 4: Tìm IP Nội Bộ của Máy Chủ

Để các máy tính khác kết nối vào, chúng ta cần biết địa chỉ IP riêng của máy chủ này:

1. Trên máy chủ, mở **CMD** (Command Prompt).
2. Gõ lệnh: `ipconfig` và Enter.
3. Tìm phần **IPv4 Address**. Nó thường trông giống như: `192.168.1.5` hoặc `192.168.0.x` hoặc `10.0.x.x`. Hãy ghi nhớ số này.

---

## BƯỚC 5: Khởi Chạy Hệ Thống

1. Mở thư mục `internal-trello` trên máy chủ.
2. Click vào thanh đường dẫn ở trên cùng của thư mục, gõ `cmd` và Enter (Để mở cmd đen ngay tại thư mục đó).
3. Gõ câu lệnh: 
   ```bash
   node server.js
   ```
4. Nếu báo `🚀 Internal Trello is running!`, nghĩa là ứng dụng đã thành công. Phải **GIỮ NGUYÊN BẢNG CMD NÀY** không được tắt. Nếu tắt, Web sẽ ngừng hoạt động.

*(Mẹo: Bạn có thể tạo 1 file `start.bat` trong thư mục ghi nội dung `node server.js` để lần sau click đúp là chạy cho nhanh).*

---

## BƯỚC 6: Máy khác trong mạng truy cập

Gửi địa chỉ này cho những người cùng dùng mạng công ty, nội bộ, Wifi công ty:
👉 **http://[IP_CỦA_MÁY_CHỦ]:3000**

*Ví dụ: Nếu IP tìm được ở bước 4 là `192.168.1.25`, thì đường link là: `http://192.168.1.25:3000`*

Lần đầu mọi người vào sẽ đăng nhập hoặc tự đăng ký tài khoản mới. Admin có thể login `admin` / `admin123` để quản lý.
