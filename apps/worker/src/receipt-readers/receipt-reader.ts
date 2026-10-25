import type { ReceiptOcrResult } from '@debtnote/application';

export interface ReceiptImage {
  path: string;
  mime: string;
}

export interface ReceiptReader {
  readonly name: string;
  read(image: ReceiptImage): Promise<ReceiptOcrResult>;
  close(): Promise<void>;
}
