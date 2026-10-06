export type HSV = { h: number; s: number; v: number };
export const DEFAULT_CATEGORY_COLOR = '#7C3AED';
export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function hexToHsv(input?: string): HSV {
  let hex = (input ?? DEFAULT_CATEGORY_COLOR).replace('#', '');
  if (/^[\da-f]{3}$/i.test(hex))
    hex = hex
      .split('')
      .map((s) => s + s)
      .join('');
  if (!/^[\da-f]{6}$/i.test(hex)) return hexToHsv(DEFAULT_CATEGORY_COLOR);
  const [r, g, b] = [0, 2, 4].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  );
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToHex({ h, s, v }: HSV): string {
  const hue = (((h % 360) + 360) % 360) / 60;
  const chroma = clamp(v) * clamp(s);
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const m = clamp(v) - chroma;
  const components =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return (
    '#' +
    components
      .map((c) =>
        Math.round((c + m) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}
