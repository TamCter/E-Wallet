# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Features & Technical Design

### 🔐 Biometric Authentication (Vân tay/Face ID)
* **OS-Level Security:** Thiết bị kiểm tra vân tay dựa trên cơ sở dữ liệu sinh trắc học nội bộ của hệ điều hành (Keychain/Keystore).
* **Multi-Account Isolation:** Để bảo mật nhiều tài khoản trên cùng một thiết bị, ứng dụng lưu trữ thông tin đăng nhập biệt lập theo định dạng khóa: `biometric_password_${safeEmailKey}`. Khi xác thực sinh trắc học thành công, mật khẩu tương ứng với email đăng nhập gần đây nhất (`lastEmail`) sẽ được giải mã để tự động đăng nhập.

### 🧠 AI Spending Insights (Gemini API)
Ứng dụng tích hợp mô hình ngôn ngữ lớn để phân tích hành vi chi tiêu của người dùng:
* **Tối ưu hóa tài khoản mới:** Bỏ qua việc gọi API bên ngoài nếu người dùng chưa có giao dịch nào (`monthTxs.length === 0`), tăng tốc độ tải màn hình chính và tiết kiệm quota.
* **Hệ thống Model Dự phòng (Fallback Chain):** Khi gọi API gặp các sự cố quá tải (503 Service Unavailable) từ Google, hệ thống tự động đổi qua các model thay thế theo thứ tự:
  $$\text{gemini-2.5-flash} \longrightarrow \text{gemini-3.5-flash} \longrightarrow \text{gemini-1.5-flash} \longrightarrow \text{gemini-3.1-flash-lite}$$
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

---

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
