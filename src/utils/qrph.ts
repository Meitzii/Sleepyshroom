import jsQR from 'jsqr';
import QRCode from 'qrcode';

export interface EmvcoTlvNode {
  tag: string;
  value: string;
}

/**
 * Standard EMVCo / QRPh CRC-16/CCITT-FALSE checksum
 * Polynomial: 0x1021, Initial Value: 0xFFFF, No final XOR
 */
export function computeCrc16Ccitt(payloadWith6304: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payloadWith6304.length; i++) {
    crc ^= (payloadWith6304.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Parses a raw EMVCo Merchant-Presented QR string (used by GCash, Maya, QRPh)
 * into sequential Tag-Length-Value nodes.
 */
export function parseEmvcoTlv(raw: string): EmvcoTlvNode[] | null {
  const clean = String(raw || '').trim();
  if (!clean || clean.length < 12) return null;

  const nodes: EmvcoTlvNode[] = [];
  let cursor = 0;

  while (cursor < clean.length) {
    if (cursor + 4 > clean.length) return null;
    const tag = clean.slice(cursor, cursor + 2);
    const lenStr = clean.slice(cursor + 2, cursor + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lenStr)) {
      return null;
    }
    const len = parseInt(lenStr, 10);
    const valueStart = cursor + 4;
    const valueEnd = valueStart + len;
    if (valueEnd > clean.length) {
      return null;
    }
    const value = clean.slice(valueStart, valueEnd);
    nodes.push({ tag, value });
    cursor = valueEnd;
  }

  return nodes.length > 0 ? nodes : null;
}

export function isValidEmvcoQrPayload(raw: string): boolean {
  const nodes = parseEmvcoTlv(raw);
  if (!nodes) return false;
  const hasFormatIndicator = nodes.some(n => n.tag === '00' && n.value === '01');
  const hasCrc = nodes.some(n => n.tag === '63' && n.value.length === 4);
  return hasFormatIndicator && hasCrc;
}

function serializeTlvNode(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Injects the exact PHP transaction amount (Tag 54) into a static or dynamic
 * EMVCo / QRPh payload (GCash, Maya, InstaPay/PESONet QRPh), marks Initiation
 * Method (Tag 01) as dynamic ('12') when an amount > 0 is set, and recalculates
 * the EMVCo CRC-16 checksum (Tag 63).
 */
export function injectQrPhAmount(rawPayload: string, amountPhp: number): string | null {
  const parsed = parseEmvcoTlv(rawPayload);
  if (!parsed) return null;

  const hasFormatIndicator = parsed.some(n => n.tag === '00' && n.value === '01');
  if (!hasFormatIndicator) return null;

  const safeAmount = Number(amountPhp);
  const hasPositiveAmount = Number.isFinite(safeAmount) && safeAmount > 0;
  const formattedAmount = hasPositiveAmount ? safeAmount.toFixed(2) : '';

  // Strip CRC (Tag 63) and existing Amount (Tag 54); update Tag 01 -> '12'
  const filtered = parsed.filter(n => n.tag !== '63' && n.tag !== '54');

  const updatedNodes: EmvcoTlvNode[] = [];
  let hasTag01 = false;

  for (const node of filtered) {
    if (node.tag === '01') {
      hasTag01 = true;
      updatedNodes.push({
        tag: '01',
        value: hasPositiveAmount ? '12' : '11',
      });
    } else {
      updatedNodes.push(node);
    }
  }

  if (!hasTag01) {
    const idx00 = updatedNodes.findIndex(n => n.tag === '00');
    updatedNodes.splice(idx00 >= 0 ? idx00 + 1 : 0, 0, {
      tag: '01',
      value: hasPositiveAmount ? '12' : '11',
    });
  }

  if (hasPositiveAmount) {
    // Insert Tag 54 in ascending tag order (right after 53 Currency, before 58 Country Code)
    const insertIdx = updatedNodes.findIndex(n => parseInt(n.tag, 10) > 54);
    const amountNode: EmvcoTlvNode = { tag: '54', value: formattedAmount };
    if (insertIdx >= 0) {
      updatedNodes.splice(insertIdx, 0, amountNode);
    } else {
      updatedNodes.push(amountNode);
    }
  }

  const bodyWithoutCrc = updatedNodes.map(n => serializeTlvNode(n.tag, n.value)).join('');
  const forCrc = `${bodyWithoutCrc}6304`;
  const crc = computeCrc16Ccitt(forCrc);
  return `${forCrc}${crc}`;
}

/**
 * Decodes a QR code string (such as a GCash or Maya QRPh payload) from an image data URL or URL.
 */
export async function decodeQrPayloadFromImageSrc(imageSrc: string): Promise<string | null> {
  const cleanSrc = String(imageSrc || '').trim();
  if (!cleanSrc || typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const loadImage = (src: string, useCors: boolean) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (useCors && !src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    });

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(cleanSrc, true);
  } catch {
    return null;
  }

  const naturalW = img.naturalWidth || img.width || 0;
  const naturalH = img.naturalHeight || img.height || 0;
  if (!naturalW || !naturalH) return null;

  // Try natural/capped resolution first, then padded white quiet-zone canvas
  const attempts = [
    { scale: Math.min(1, 900 / Math.max(naturalW, naturalH)), padding: 0 },
    { scale: Math.min(1.5, 900 / Math.max(naturalW, naturalH)), padding: 36 },
  ];

  for (const attempt of attempts) {
    try {
      const drawW = Math.max(1, Math.round(naturalW * attempt.scale));
      const drawH = Math.max(1, Math.round(naturalH * attempt.scale));
      const pad = attempt.padding;

      const canvas = document.createElement('canvas');
      canvas.width = drawW + pad * 2;
      canvas.height = drawH + pad * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad, drawW, drawH);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (decoded?.data) {
        return decoded.data.trim();
      }
    } catch {
      // Canvas might be tainted if external URL blocks CORS
      return null;
    }
  }

  return null;
}

export async function generateQrCodeDataUrl(payload: string): Promise<string> {
  return await QRCode.toDataURL(payload, {
    width: 440,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111827',
      light: '#FFFFFF',
    },
  });
}
