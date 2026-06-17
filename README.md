# E-Wallet Expo Application 📱

Ứng dụng ví điện tử thông minh tích hợp bảo mật sinh trắc học và phân tích chi tiêu bằng trí tuệ nhân tạo (Gemini AI).

---

## 🚀 Hướng dẫn Cài đặt & Chạy ứng dụng (Setup & Run)

### 1. Tải dự án (Download / Clone)
Di chuyển đến thư mục làm việc của bạn và tải mã nguồn về:
```bash
git clone <repository_url>
cd ewallet
```

### 2. Cài đặt các thư viện (Install Dependencies)
Để cài đặt các thư viện cần thiết được liệt kê trong [requirements.txt](file:///e:/E-wallet/ewallet/requirements.txt), hãy chạy lệnh sau tại thư mục `ewallet`:

```bash
npm install $(cat requirements.txt)
```

Hoặc trên Windows (PowerShell):
```powershell
(Get-Content requirements.txt) -join " " | foreach { npm install $_.Split(" ") }
```

### 3. Cấu hình biến môi trường (Environment Setup)
Tạo tệp `.env` từ tệp mẫu `.env.example` và điền thông tin cấu hình của bạn:
```bash
cp .env.example .env
```
Các thông số cần cấu hình trong `.env`:
* `EXPO_PUBLIC_SUPABASE_URL`: Đường dẫn API của Supabase project.
* `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Khóa Anon Public của Supabase.
* `GEMINI_API_KEY`: API Key của Google Gemini.

### 4. Khởi tạo Cơ sở dữ liệu (Database Setup)
Ứng dụng sử dụng Supabase làm backend. Bạn cần chạy script SQL khởi tạo tại:
`supabase/migrations/20240527000000_init_schema.sql` trong trang quản trị SQL Editor của Supabase để tạo các bảng `users`, `wallets`, và `transactions`.

### 5. Chạy ứng dụng (Running the App)
Khởi động máy chủ phát triển Expo:
```bash
npm run start
```
Quét mã QR bằng ứng dụng **Expo Go** trên điện thoại (iOS/Android) hoặc sử dụng các lệnh sau để chạy trực tiếp trên giả lập:
* **Android:** `npm run android`
* **iOS:** `npm run ios`
* **Web:** `npm run web`

---

## 💡 Hướng dẫn Sử dụng (How to Use)

### 🔑 Đăng ký & Đăng nhập
1. Đăng ký tài khoản mới bằng Email và Mật khẩu.
2. Hệ thống sẽ tự động khởi tạo một ví điện tử (`wallet`) đi kèm với số dư mặc định ban đầu để bạn bắt đầu trải nghiệm.

### 🔐 Thiết lập Sinh trắc học (Biometrics)
1. Đăng nhập vào tài khoản của bạn, truy cập vào phần cài đặt tài khoản trong ứng dụng.
2. Kích hoạt tính năng **Đăng nhập bằng vân tay/Face ID**.
3. Ứng dụng sẽ mã hóa và lưu thông tin đăng nhập một cách an toàn vào thiết bị của bạn thông qua Keystore/Keychain.
4. Từ lần đăng nhập tiếp theo, bạn chỉ cần nhấn vào nút biểu tượng vân tay để mở khóa nhanh chóng.

### 🧠 Trải nghiệm Trí tuệ Nhân tạo (Gemini AI Insights)
1. Thực hiện một vài giao dịch chuyển tiền hoặc nạp tiền trên ứng dụng.
2. Quay lại trang chủ, hệ thống sẽ tự động gửi dữ liệu giao dịch ẩn danh tới Gemini AI để phân tích và hiển thị các gợi ý, biểu đồ chi tiêu thông minh.
3. Nếu mất kết nối mạng hoặc API quá tải, hệ thống dự phòng ngoại tuyến sẽ tự động phân tích hành vi chi tiêu dựa trên thuật toán nội bộ mà không làm gián đoạn trải nghiệm của bạn.

---

## Features & Technical Design

### 🔐 Biometric Authentication (Vân tay/Face ID)
* **OS-Level Security:** Thiết bị kiểm tra vân tay dựa trên cơ sở dữ liệu sinh trắc học nội bộ của hệ điều hành (Keychain/Keystore).
* **Multi-Account Isolation:** Để bảo mật nhiều tài khoản trên cùng một thiết bị, ứng dụng lưu trữ thông tin đăng nhập biệt lập theo định dạng khóa: `biometric_password_${safeEmailKey}`. Khi xác thực sinh trắc học thành công, mật khẩu tương ứng với email đăng nhập gần đây nhất (`lastEmail`) sẽ được giải mã để tự động đăng nhập.

### 🧠 AI Spending Insights (Gemini API)
Ứng dụng tích hợp mô hình ngôn ngữ lớn để phân tích hành vi chi tiêu của người dùng:
* **Tối ưu hóa tài khoản mới:** Bỏ qua việc gọi API bên ngoài nếu người dùng chưa có giao dịch nào (`monthTxs.length === 0`), tăng tốc độ tải màn hình chính và tiết kiệm quota.
* **Hệ thống Model Dự phòng (Fallback Chain):** Khi gọi API gặp các sự cố quá tải (503 Service Unavailable) từ Google, hệ thống tự động đổi qua các model thay thế theo thứ tự:
  $$\text{gemini-2.5-flash} \longrightarrow \text{gemini-3.5-flash} \longrightarrow \text{gemini-3.1-flash-lite}$$
* **Hỗ trợ Offline Mượt mà:** Nếu tất cả model AI đều lỗi hoặc không có kết nối mạng, ứng dụng sẽ kích hoạt mô hình Heuristic Offline để tự động tính toán dự báo chi tiêu cho người dùng mà không làm lỗi màn hình.

---

## Testing & Quality Assurance

Dự án hỗ trợ kiểm tra tĩnh và kiểm thử đơn vị tự động (Unit Tests):
* **TypeScript Typechecking:**
  ```bash
  npm run typecheck
  ```
* **Run Unit Tests (Jest):**
  ```bash
  npm test
  ```
