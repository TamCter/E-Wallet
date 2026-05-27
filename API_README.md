# Tài liệu API (Supabase Backend) cho E-Wallet

Dưới đây là hướng dẫn cách gọi các API của Backend Supabase từ Frontend (React Native/Expo) dựa trên các Controller trong biểu đồ UML.

**Lưu ý:** Bạn cần khởi tạo Supabase Client bằng thư viện `@supabase/supabase-js`.

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 1. AuthController

Supabase hỗ trợ sẵn các tính năng xác thực, an toàn và bảo mật.

### Đăng ký tài khoản (`registerUser`)

Sử dụng tính năng đăng ký Email/Password (hoặc Số điện thoại tuỳ cấu hình Supabase của bạn). Ở đây tôi demo với Email:

```typescript
const registerUser = async (email, password, phone, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email: email, // Hoặc dùng phone thay email nếu dùng Phone Auth
    password: password,
    options: {
      data: {
        phone_number: phone,
        full_name: fullName
      }
    }
  });
  
  if (error) console.error("Lỗi đăng ký:", error.message);
  else console.log("Đăng ký thành công:", data.user);
  // Lưu ý: Database Trigger (handle_new_user) sẽ tự động tạo Ví và Profile ở bảng public.users.
}
```

### Đăng nhập (`loginUser`)

```typescript
const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  
  if (error) console.error("Lỗi đăng nhập:", error.message);
  else console.log("Đăng nhập thành công, token lưu tự động:", data.session);
}
```

*(Các hàm `authenticateBiometric` và `verifyJWTToken` có thể tự động được xử lý bởi logic local hoặc thư viện của Supabase JS)*

---

## 2. WalletController

Các thao tác lấy dữ liệu thông thường. RLS đã chặn user không xem được ví của người khác.

### Lấy thông tin ví (`getWalletInfo`)

```typescript
const getWalletInfo = async () => {
  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('*')
    .single(); // Sẽ chỉ lấy được ví của user đang đăng nhập do RLS
    
  if (error) console.error("Lỗi lấy thông tin ví:", error.message);
  else console.log("Số dư ví:", wallet.balance);
  return wallet;
}
```

---

## 3. TransactionController

Đối với các giao dịch ảnh hưởng đến số dư, ta sẽ gọi các **RPC (Stored Procedures)** được định nghĩa trong PostgreSQL để đảm bảo tính Acid (không bị sai lệch số dư nếu mạng rớt).

### Chuyển tiền (`processTransfer`)

```typescript
const processTransfer = async (receiverPhone, amount) => {
  const { data: transactionId, error } = await supabase
    .rpc('process_transfer', { 
      receiver_phone: receiverPhone, 
      transfer_amount: amount 
    });
    
  if (error) {
    console.error("Giao dịch thất bại:", error.message);
    // Ví dụ: Lỗi "Không đủ số dư" hoặc "Không tìm thấy người nhận"
  } else {
    console.log("Giao dịch thành công, ID:", transactionId);
  }
}
```

### Nạp tiền (`processDeposit`)

```typescript
const processDeposit = async (amount) => {
  const { data: transactionId, error } = await supabase
    .rpc('process_deposit', { deposit_amount: amount });
    
  if (error) console.error("Lỗi nạp tiền:", error.message);
  else console.log("Nạp tiền thành công, ID:", transactionId);
}
```

### Rút tiền (`processWithdrawal`)

```typescript
const processWithdrawal = async (amount) => {
  const { data: transactionId, error } = await supabase
    .rpc('process_withdrawal', { withdrawal_amount: amount });
    
  if (error) console.error("Lỗi rút tiền:", error.message);
  else console.log("Rút tiền thành công, ID:", transactionId);
}
```

### Lấy lịch sử giao dịch (`getTransactionHistory`)

```typescript
const getTransactionHistory = async () => {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id, amount, type, status, created_at,
      sender_wallet:sender_wallet_id ( user_id, users ( phone_number, full_name ) ),
      receiver_wallet:receiver_wallet_id ( user_id, users ( phone_number, full_name ) )
    `)
    .order('created_at', { ascending: false }); // Mới nhất lên đầu
    
  if (error) console.error("Lỗi lấy lịch sử giao dịch:", error.message);
  else console.log("Lịch sử giao dịch:", transactions);
  return transactions;
}
```

---

## Các điểm nổi bật của kiến trúc này:
1. **Bảo mật tuyệt đối với RLS:** Mọi câu query (ví dụ lấy lịch sử giao dịch, số dư) đều được tự động chặn quyền ở cấp cơ sở dữ liệu. User chỉ có thể thao tác trên dữ liệu của chính mình.
2. **Database Transaction cho Chuyển tiền:** Mọi logic trừ tiền người này, cộng tiền người kia đều được đẩy xuống Stored Procedure (`rpc`) của Postgres. Nếu có bất kỳ lỗi gì xảy ra giữa chừng, toàn bộ thay đổi sẽ được rollback lại 100%, chống hack/gặp lỗi mất tiền.
3. **Trigger tự động hoá:** Khi User đăng ký bằng Supabase Auth thành công, DB Trigger lập tức kích hoạt để tạo Profile (`users`) và Ví (`wallets`), giúp phía Client chỉ cần gọi API đăng ký 1 lần duy nhất.
