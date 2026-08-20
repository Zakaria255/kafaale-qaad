import crypto from 'crypto';
import sharp from 'sharp';
import { sysLog } from './logger';

/** SHA-256 of a file buffer — used for exact-duplicate detection (images & documents). */
export function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Perceptual hash (dHash) — detects resized/compressed/cropped/re-encoded copies of the
 * same photo, unlike sha256 which only catches byte-identical files. Downscales to 9x8
 * grayscale and compares each pixel to its right-hand neighbor: 72 comparisons -> 72 bits,
 * returned as an 18-char hex string. Returns null for non-decodable buffers (e.g. a
 * corrupt upload) rather than throwing — a missing perceptual hash just means that
 * image's row falls back to sha256-only matching in the scoring engine.
 */
export async function perceptualHash(buffer: Buffer): Promise<string | null> {
  try {
    const { data } = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let bits = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        bits += left > right ? '1' : '0';
      }
    }
    // Pack 72 bits into hex (18 chars)
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch (err: any) {
    sysLog.warn(`perceptualHash: could not decode image buffer — ${err.message}`);
    return null;
  }
}

/** Hamming distance between two equal-length hex hash strings, as a fraction 0-1 (0 = identical). */
export function hammingDistance(hashA: string, hashB: string): number {
  if (!hashA || !hashB || hashA.length !== hashB.length) return 1;
  let diffBits = 0;
  for (let i = 0; i < hashA.length; i++) {
    const xor = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    diffBits += xor.toString(2).split('1').length - 1;
  }
  return diffBits / (hashA.length * 4);
}
