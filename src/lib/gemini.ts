export interface GeminiTransaction {
  amount: number;
  type: string;
  created_at: string;
  description: string | null;
}

export async function generateSpendingInsights(
  transactions: GeminiTransaction[],
  historyTransactions: GeminiTransaction[],
  monthlyLimit: number,
  currentSpent: number
): Promise<{
  forecastMessage: string;
  installmentAlert: string | null;
  aiShoppingAlert: string | null;
  forecastType: 'success' | 'warning' | 'danger' | 'info';
}> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API Key');
  }

  // Định dạng danh sách giao dịch tháng này để đưa vào prompt
  const txList = transactions.map(tx => {
    return `- [Giao dịch tháng này] ${new Date(tx.created_at).toLocaleDateString('vi-VN')}: ${tx.type === 'transfer' ? 'Chuyển tiền' : tx.type === 'withdrawal' ? 'Rút tiền' : 'Nạp tiền'} ${new Intl.NumberFormat('vi-VN').format(tx.amount)} đ. Nội dung: "${tx.description || 'Không có'}"`;
  }).join('\n');

  // Định dạng lịch sử giao dịch 90 ngày để đưa vào prompt
  const histList = historyTransactions.map(tx => {
    return `- [Lịch sử 90 ngày] ${new Date(tx.created_at).toLocaleDateString('vi-VN')}: ${tx.type === 'transfer' ? 'Chuyển tiền' : tx.type === 'withdrawal' ? 'Rút tiền' : 'Nạp tiền'} ${new Intl.NumberFormat('vi-VN').format(tx.amount)} đ. Nội dung: "${tx.description || 'Không có'}"`;
  }).join('\n');

  const prompt = `Bạn là trợ lý tài chính AI thông minh được tích hợp trực tiếp vào ứng dụng E-Wallet của người dùng.
Hạn mức chi tiêu tháng này của người dùng: ${new Intl.NumberFormat('vi-VN').format(monthlyLimit)} đ.
Số tiền đã chi tiêu tính đến hôm nay: ${new Intl.NumberFormat('vi-VN').format(currentSpent)} đ.
Hôm nay là ngày: ${new Date().toLocaleDateString('vi-VN')}.

Dưới đây là danh sách các giao dịch trong tháng này của người dùng:
${txList || 'Chưa có giao dịch'}

Dưới đây là lịch sử giao dịch 90 ngày qua của người dùng để phân tích thói quen và chu kỳ:
${histList || 'Chưa có lịch sử giao dịch'}

Nhiệm vụ của bạn:
1. Phân tích các giao dịch này và tạo các thông điệp phân tích tài chính cá nhân hóa, tự nhiên và thân thiện bằng tiếng Việt:
   - "forecastMessage": Dự báo chi tiêu chung (Ví dụ: Dự kiến người dùng có vượt hạn mức không, tốc độ chi tiêu nhanh hay chậm, lời khuyên thắt chặt hay khen ngợi). Giới hạn dưới 100 từ.
   - "installmentAlert": Trả về một chuỗi cảnh báo nếu phát hiện các giao dịch trả góp/định kỳ (ví dụ: các khoản tiền mất đi hàng tháng cố định hoặc gần giống nhau khoảng 1-5 triệu VND như tiền trả góp, tiền học, thuê nhà). Trả lời ngắn gọn, nêu rõ số tiền và ngày dự kiến trả tiếp theo. Nếu không phát hiện gì, trả về null.
   - "aiShoppingAlert": Trả về một chuỗi phân tích thói quen mua sắm tại các siêu thị (ví dụ: WinMart, Co.opmart, Lotte Mart, Bách Hóa Xanh, v.v. dựa trên nội dung mô tả chứa các tên siêu thị hoặc mã thanh toán). Hãy chỉ ra số tiền đã tiêu tại siêu thị, liệt kê các siêu thị đã ghé thăm và mã hóa đơn phát hiện nếu có. Nếu không có giao dịch siêu thị nào, trả về null.
2. Chọn "forecastType" phù hợp cho tình hình chi tiêu của người dùng:
   - "success": Chi tiêu rất tốt, dự kiến dưới hạn mức nhiều.
   - "warning": Tốc độ chi tiêu nhanh, có nguy cơ vượt hạn mức.
   - "danger": Đã vượt hoặc chắc chắn vượt hạn mức tháng.
   - "info": Chưa đủ dữ liệu hoặc bình thường.

Hãy trả về phản hồi dưới dạng JSON thuần túy (có thể bọc trong markdown \`\`\`json ... \`\`\`), với cấu trúc sau:
{
  "forecastMessage": "...",
  "installmentAlert": "..." hoặc null,
  "aiShoppingAlert": "..." hoặc null,
  "forecastType": "success" | "warning" | "danger" | "info"
}`;

  const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-1.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per attempt

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      // Xử lý bóc tách markdown ```json để ép kiểu dữ liệu an toàn trên bản v1beta fetch
      const cleanText = responseText.trim();
      const match = cleanText.match(/^(?:```json\s*)?([\s\S]*?)(?:\s*```)?$/i);
      const jsonToParse = match ? match[1].trim() : cleanText;

      const result = JSON.parse(jsonToParse);
      const allowedTypes: ('success' | 'warning' | 'danger' | 'info')[] = ['success', 'warning', 'danger', 'info'];
      const forecastType = allowedTypes.includes(result.forecastType) ? result.forecastType : 'info';

      return {
        forecastMessage: result.forecastMessage || 'Không thể tạo dự báo.',
        installmentAlert: result.installmentAlert || null,
        aiShoppingAlert: result.aiShoppingAlert || null,
        forecastType,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        lastError = new Error(`Gemini API call timed out for model ${model}`);
      } else {
        lastError = error;
      }
      console.warn(`Gemini API model ${model} failed:`, lastError.message || lastError);
    }
  }

  console.warn('All Gemini API models failed. Falling back to local heuristic model.');
  throw lastError || new Error('All Gemini API models failed');
}