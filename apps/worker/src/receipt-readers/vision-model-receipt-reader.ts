import { readFile } from 'node:fs/promises';
import { summarizeReceipt } from '@debtnote/application';
import { z } from 'zod';
import type { ReceiptReader } from './receipt-reader';

const instruction = `Đọc hóa đơn trong ảnh. Chỉ trả về JSON đúng dạng {"items":[{"title":string,"amount":number}],"total":number|null}.
- Mỗi món một phần tử; amount là thành tiền của dòng (đơn giá × số lượng).
- title là tên món viết lại đúng chính tả tiếng Việt có dấu, chỉ viết hoa chữ cái đầu và tên riêng (ví dụ "Mẹt khô thập cẩm", "Bia Heineken lùn", "Coca"). Sửa lỗi in hoặc lỗi gõ của quán theo tên món ăn Việt Nam thông dụng (ví dụ "DA GÀ MẮM TOIIR" thành "Da gà mắm tỏi"); không thêm từ không có trên bill.
- Tiền là số nguyên VND, không dấu phân cách.
- Không đưa vào items các dòng tổng, chiết khấu, phụ thu, thuế, tiền khách trả, tiền thừa.
- total là tổng cộng cuối bill, null nếu không thấy.`;

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});
const receiptSchema = z.object({
  items: z.array(z.object({ title: z.string(), amount: z.coerce.number().int().positive() })),
  total: z.coerce.number().int().positive().nullable().optional(),
});

export function createVisionModelReceiptReader(options: {
  baseUrl: string;
  apiKey: string;
  models: string[];
  timeoutMs: number;
}): ReceiptReader {
  return {
    name: 'vision-model',
    async read(image) {
      const imageBase64 = (await readFile(image.path)).toString('base64');
      const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(options.timeoutMs),
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.models[0],
          models: options.models,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: instruction },
                {
                  type: 'image_url',
                  image_url: { url: `data:${image.mime};base64,${imageBase64}` },
                },
              ],
            },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Model đọc bill trả về HTTP ${response.status}.`);
      const content = completionSchema.parse(await response.json()).choices[0]?.message.content;
      const json = content?.replace(/^\s*```(?:json)?|```\s*$/g, '') ?? '';
      const receipt = receiptSchema.parse(JSON.parse(json));
      return summarizeReceipt({
        text: json,
        confidence: null,
        items: receipt.items,
        detectedTotal: receipt.total ?? null,
      });
    },
    async close() {},
  };
}
