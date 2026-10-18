import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { eatingDuration, eatingFrames } from './eating';

describe('eating v2 assets', () => {
  it('has 16 ordered frames and 7.45 seconds of variable holds', () => {
    expect(eatingFrames).toHaveLength(16);
    expect(eatingDuration).toBe(7450);
    expect(new Set(eatingFrames.map(f => f.duration)).size).toBeGreaterThan(1);
    eatingFrames.forEach((f, i) => expect(f.src).toContain(`${String(i + 1).padStart(2, '0')}.png`));
  });
  it('decodes every transparent frame with the same viewport and clear edges', async () => {
    for (const frame of eatingFrames) {
      const bytes = readFileSync(`public${frame.src}`);
      const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect([info.width, info.height]).toEqual([560, 360]);
      for (let x = 0; x < info.width; x++) {
        expect(data[x * 4 + 3]).toBe(0);
        expect(data[((info.height - 1) * info.width + x) * 4 + 3]).toBe(0);
      }
      for (let y = 0; y < info.height; y++) {
        expect(data[y * info.width * 4 + 3]).toBe(0);
        expect(data[(y * info.width + info.width - 1) * 4 + 3]).toBe(0);
      }
    }
  });
});
