import { parseReceiptText } from '@debtnote/application';
import { createWorker, type Worker as OcrWorker, PSM } from 'tesseract.js';
import type { ReceiptReader } from './receipt-reader';

export function createTesseractReceiptReader(modelCache: string): ReceiptReader {
  let engine: Promise<OcrWorker> | null = null;
  async function startEngine() {
    const createdEngine = await createWorker(['vie', 'eng'], 1, { cachePath: modelCache });
    await createdEngine.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
      preserve_interword_spaces: '1',
    });
    return createdEngine;
  }
  async function stopEngine() {
    const stoppingEngine = engine;
    engine = null;
    try {
      await (await stoppingEngine)?.terminate();
    } catch {
      /* Engine lỗi được tạo lại ở lần đọc sau. */
    }
  }
  return {
    name: 'tesseract',
    async read(image) {
      try {
        engine ??= startEngine();
        const response = await (await engine).recognize(image.path);
        return parseReceiptText(response.data.text, response.data.confidence);
      } catch (error) {
        await stopEngine();
        throw error;
      }
    },
    close: stopEngine,
  };
}
