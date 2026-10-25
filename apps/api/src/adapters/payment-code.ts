interface TlvField {
  tag: string;
  value: string;
}
function parseFields(payload: string): TlvField[] {
  const fields: TlvField[] = [];
  let offset = 0;
  while (offset < payload.length) {
    const tag = payload.slice(offset, offset + 2);
    const lengthText = payload.slice(offset + 2, offset + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) throw new Error('TLV chưa hợp lệ.');
    const length = Number(lengthText);
    offset += 4;
    if (offset + length > payload.length) throw new Error('TLV bị thiếu.');
    fields.push({ tag, value: payload.slice(offset, offset + length) });
    offset += length;
  }
  return fields;
}
function encodeFields(fields: TlvField[]) {
  return fields
    .map((field) => {
      if (field.value.length > 99) throw new Error('Trường QR quá dài.');
      return `${field.tag}${String(field.value.length).padStart(2, '0')}${field.value}`;
    })
    .join('');
}
function checksum(payload: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function put(fields: TlvField[], tag: string, value: string) {
  const previous = fields.find((field) => field.tag === tag);
  if (previous) previous.value = value;
  else {
    fields.push({ tag, value });
    fields.sort((left, right) => left.tag.localeCompare(right.tag));
  }
}
export interface PaymentCodeFormatter {
  supports(payload: string): boolean;
  format(payload: string, amount: number, reference: string): string;
}
export class NapasPaymentCodeFormatter implements PaymentCodeFormatter {
  supports(payload: string) {
    try {
      const fields = parseFields(payload);
      return (
        fields.find((field) => field.tag === '00')?.value === '01' &&
        fields.find((field) => field.tag === '38')?.value.startsWith('0010A000000727') === true &&
        fields.find((field) => field.tag === '53')?.value === '704' &&
        fields.at(-1)?.tag === '63' &&
        checksum(payload.slice(0, -4)) === payload.slice(-4).toUpperCase()
      );
    } catch {
      return false;
    }
  }
  format(payload: string, amount: number, reference: string) {
    const fields = parseFields(payload).filter((field) => field.tag !== '63');
    put(fields, '01', '12');
    put(fields, '54', String(amount));
    const additional = fields.find((field) => field.tag === '62');
    const content = additional ? parseFields(additional.value) : [];
    put(content, '08', reference.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 25));
    put(fields, '62', encodeFields(content));
    const encoded = `${encodeFields(fields)}6304`;
    return encoded + checksum(encoded);
  }
}
export class PaymentCodeRenderer {
  constructor(private readonly formatters: readonly PaymentCodeFormatter[]) {}
  build(payload: string, amount: number, reference: string) {
    return (
      this.formatters
        .find((formatter) => formatter.supports(payload))
        ?.format(payload, amount, reference) ?? payload
    );
  }
}
