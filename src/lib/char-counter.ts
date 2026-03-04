/**
 * X (Twitter) の文字数カウント
 * - CJK文字は2としてカウント
 * - URLは23としてカウント (t.co短縮)
 * - 上限は280
 */

const URL_REGEX = /https?:\/\/[^\s]+/g;

function isCJK(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11FF) ||   // Hangul Jamo
    (code >= 0x2E80 && code <= 0x9FFF) ||   // CJK Unified
    (code >= 0xA960 && code <= 0xA97F) ||   // Hangul Jamo Extended-A
    (code >= 0xAC00 && code <= 0xD7FF) ||   // Hangul Syllables
    (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
    (code >= 0xFE30 && code <= 0xFE4F) ||   // CJK Compatibility Forms
    (code >= 0xFF00 && code <= 0xFFEF) ||   // Fullwidth Forms
    (code >= 0x20000 && code <= 0x2FA1F) || // CJK Extensions
    (code >= 0x3000 && code <= 0x303F) ||   // CJK Symbols
    (code >= 0x3040 && code <= 0x309F) ||   // Hiragana
    (code >= 0x30A0 && code <= 0x30FF) ||   // Katakana
    (code >= 0x31F0 && code <= 0x31FF) ||   // Katakana Extensions
    (code >= 0xFF65 && code <= 0xFF9F)      // Halfwidth Katakana
  );
}

export function countXChars(text: string): number {
  let count = 0;

  // URLを除去してカウント（各URLは23文字としてカウント）
  const urls = text.match(URL_REGEX);
  const textWithoutUrls = text.replace(URL_REGEX, '');

  if (urls) {
    count += urls.length * 23;
  }

  for (const char of textWithoutUrls) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (char === '\n') {
      count += 1;
    } else if (isCJK(code)) {
      count += 2;
    } else {
      count += 1;
    }
  }

  return count;
}

export const X_MAX_CHARS = 280;
