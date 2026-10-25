async function readImage(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error('Chọn ảnh dưới 10 MB.');
  const address = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = address;
    await image.decode();
    return { image, close: () => URL.revokeObjectURL(address) };
  } catch {
    URL.revokeObjectURL(address);
    throw new Error('Chưa đọc được ảnh. Chọn JPG, PNG hoặc WebP.');
  }
}
function stretchGrayscaleContrast(pixels: Uint8ClampedArray) {
  const pixelCount = pixels.length / 4;
  const luminances = new Uint8Array(pixelCount);
  const histogram = new Uint32Array(256);
  for (let index = 0; index < pixelCount; index++) {
    const luminance = Math.round(
      0.299 * (pixels[index * 4] ?? 0) +
        0.587 * (pixels[index * 4 + 1] ?? 0) +
        0.114 * (pixels[index * 4 + 2] ?? 0),
    );
    luminances[index] = luminance;
    histogram[luminance] = (histogram[luminance] ?? 0) + 1;
  }
  const percentile = (share: number) => {
    let seen = 0;
    for (let level = 0; level < 256; level++) {
      seen += histogram[level] ?? 0;
      if (seen >= pixelCount * share) return level;
    }
    return 255;
  };
  const darkest = percentile(0.02);
  const range = Math.max(1, percentile(0.99) - darkest);
  for (let index = 0; index < pixelCount; index++) {
    const stretched = (((luminances[index] ?? 0) - darkest) * 255) / range;
    pixels[index * 4] = pixels[index * 4 + 1] = pixels[index * 4 + 2] = stretched;
  }
}
export async function prepareReceiptImage(file: File) {
  const { image, close } = await readImage(file);
  try {
    const ratio = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * ratio);
    canvas.height = Math.round(image.naturalHeight * ratio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt chưa hỗ trợ đọc ảnh.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    stretchGrayscaleContrast(frame.data);
    context.putImageData(frame, 0, 0);
    return {
      name: file.name,
      mime: 'image/jpeg' as const,
      base64: canvas.toDataURL('image/jpeg', 0.92).split(',')[1] ?? '',
    };
  } finally {
    close();
  }
}
export async function decodeReceivingQr(file: File): Promise<string> {
  const { image, close } = await readImage(file);
  try {
    const { RGBLuminanceSource, HybridBinarizer, BinaryBitmap, QRCodeReader, DecodeHintType } =
      await import('@zxing/library');
    const ratio = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * ratio);
    const height = Math.round(image.naturalHeight * ratio);
    const base = document.createElement('canvas');
    base.width = width;
    base.height = height;
    const context = base.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error();
    context.drawImage(image, 0, 0, width, height);
    const regions = [
      { x: 0, y: 0, width, height },
      ...[0.9, 0.65].map((scale) => {
        const size = Math.floor(Math.min(width, height) * scale);
        return {
          x: Math.floor((width - size) / 2),
          y: Math.floor((height - size) / 2),
          width: size,
          height: size,
        };
      }),
    ];
    for (const region of regions) {
      const frame = context.getImageData(region.x, region.y, region.width, region.height);
      const pixels = new Int32Array(region.width * region.height);
      for (let index = 0; index < pixels.length; index++)
        pixels[index] =
          ((frame.data[index * 4] ?? 0) << 16) |
          ((frame.data[index * 4 + 1] ?? 0) << 8) |
          (frame.data[index * 4 + 2] ?? 0);
      try {
        const bitmap = new BinaryBitmap(
          new HybridBinarizer(new RGBLuminanceSource(pixels, region.width, region.height)),
        );
        const value = new QRCodeReader()
          .decode(bitmap, new Map([[DecodeHintType.TRY_HARDER, true]]))
          .getText();
        if (new TextEncoder().encode(value).byteLength > 1024) throw new Error('Mã QR quá dài.');
        return value;
      } catch {
        /* Tiếp tục vùng ảnh có ít chi tiết nền hơn. */
      }
    }
    throw new Error('Chưa tìm thấy QR. Chọn ảnh rõ toàn bộ mã.');
  } finally {
    close();
  }
}
