import CryptoJS from 'crypto-js';

// ZaloPay Sandbox Default credentials
export const ZALOPAY_CONFIG = {
  app_id: 2553,
  key1: 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
  key2: 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
  endpoint_create: 'https://sb-openapi.zalopay.vn/v2/create',
  endpoint_query: 'https://sb-openapi.zalopay.vn/v2/query',
};

export interface ZaloPayOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  order_url: string;
  zp_trans_token: string;
  app_trans_id: string;
}

export interface ZaloPayQueryResponse {
  return_code: number; // 1: success, 2: fail, 3: pending
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  is_processing: boolean;
  amount: number;
  discount_amount: number;
  zalo_trans_id: string;
}

/**
 * Tạo đơn hàng ZaloPay Sandbox
 * @param amount Số tiền nạp (VND)
 * @param redirectUrl URL deep link quay lại app (e.g. ewalletapp://deposit-callback)
 * @param appUser Định danh người dùng
 */
export async function createZaloPayOrder(
  amount: number,
  redirectUrl: string,
  appUser: string = 'ewallet_user'
): Promise<ZaloPayOrderResponse> {
  const now = new Date();
  const yy = String(now.getFullYear()).substring(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yy}${mm}${dd}`;
  const rand = Math.floor(100000 + Math.random() * 900000); // 6 chữ số ngẫu nhiên
  const app_trans_id = `${dateStr}_${rand}`;

  const app_time = Date.now();
  const item = '[]';
  const embed_data = JSON.stringify({
    redirecturl: redirectUrl,
  });
  const description = `E-Wallet Deposit ${amount}đ`;

  // HMAC SHA256 Signature calculation
  // data = app_id + "|" + app_trans_id + "|" + app_user + "|" + amount + "|" + app_time + "|" + embed_data + "|" + item
  const signatureData = `${ZALOPAY_CONFIG.app_id}|${app_trans_id}|${appUser}|${amount}|${app_time}|${embed_data}|${item}`;
  const mac = CryptoJS.HmacSHA256(signatureData, ZALOPAY_CONFIG.key1).toString(CryptoJS.enc.Hex);

  const payload = {
    app_id: ZALOPAY_CONFIG.app_id,
    app_user: appUser,
    app_trans_id,
    app_time,
    amount,
    item,
    embed_data,
    description,
    bank_code: '', // Để trống để ZaloPay tự động hiện danh sách ngân hàng / ví
    mac,
  };

  try {
    const response = await fetch(ZALOPAY_CONFIG.endpoint_create, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      ...data,
      app_trans_id,
    };
  } catch (err: any) {
    console.error('Lỗi khi tạo đơn hàng ZaloPay:', err);
    throw err;
  }
}

/**
 * Truy vấn trạng thái đơn hàng ZaloPay Sandbox
 * @param appTransId Mã giao dịch app_trans_id
 */
export async function queryZaloPayOrder(appTransId: string): Promise<ZaloPayQueryResponse> {
  const signatureData = `${ZALOPAY_CONFIG.app_id}|${appTransId}|${ZALOPAY_CONFIG.key1}`;
  const mac = CryptoJS.HmacSHA256(signatureData, ZALOPAY_CONFIG.key1).toString(CryptoJS.enc.Hex);

  const payload = {
    app_id: ZALOPAY_CONFIG.app_id,
    app_trans_id: appTransId,
    mac,
  };

  try {
    const response = await fetch(ZALOPAY_CONFIG.endpoint_query, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error('Lỗi khi truy vấn trạng thái ZaloPay:', err);
    throw err;
  }
}
