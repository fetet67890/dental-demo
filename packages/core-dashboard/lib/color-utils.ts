// Pure color-space math — no theme/preset knowledge here on purpose, so this
// stays reusable anywhere a hex color needs converting/checking (currently:
// theme-presets.ts's custom-palette generator, see buildCustomPalette there).

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }

const HEX_RE = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim())
}

export function normalizeHex(value: string): string {
  let v = value.trim().replace(/^#/, '')
  if (v.length === 3) v = v.split('').map((c) => c + c).join('')
  return `#${v.toLowerCase()}`
}

export function hexToRgb(hex: string): RGB {
  const v = normalizeHex(hex).slice(1)
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}

function toHex2(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
}

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`
}

export function hexToHsl(hex: string): HSL {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)); break
    case gn: h = (bn - rn) / d + 2; break
    default:  h = (rn - gn) / d + 4
  }
  return { h: h * 60, s: s * 100, l: l * 100 }
}

export function hslToHex(h: number, s: number, l: number): string {
  const hn = ((h % 360) + 360) % 360 / 360
  const sn = Math.min(100, Math.max(0, s)) / 100
  const ln = Math.min(100, Math.max(0, l)) / 100

  if (sn === 0) {
    const v = ln * 255
    return rgbToHex({ r: v, g: v, b: v })
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  const hue2rgb = (t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return rgbToHex({
    r: hue2rgb(hn + 1 / 3) * 255,
    g: hue2rgb(hn) * 255,
    b: hue2rgb(hn - 1 / 3) * 255,
  })
}

// WCAG relative luminance — standard formula, used to pick readable text
// color for an arbitrary background rather than always assuming white works.
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const [R, G, B] = [r, g, b].map((c) => {
    const cn = c / 255
    return cn <= 0.03928 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

// Picks near-black or white text for a given background, whichever the
// background is dark/light enough to need — an arbitrary user-picked accent
// color can't be assumed bright enough for white text to stay readable
// (e.g. a pale yellow), the way every hand-picked preset accent always was.
export function contrastTextColor(bgHex: string): string {
  return relativeLuminance(bgHex) > 0.5 ? '#0f172a' : '#FFFFFF'
}

export function clampL(l: number): number {
  return Math.min(97, Math.max(3, l))
}
