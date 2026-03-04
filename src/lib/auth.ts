/**
 * セッショントークン生成（SHA-256）
 * Edge Runtime / Node.js 両方で動作する Web Crypto API を使用
 */
export async function hashToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`bookpost-session:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return (
    'bp_' +
    hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32)
  );
}
