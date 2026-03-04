import { NextRequest, NextResponse } from 'next/server';
import { hashToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 公開パスと Next.js 内部リソースはスキップ
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // LOGIN_PASSWORD が未設定の場合は認証をスキップ（開発時）
  const password = process.env.LOGIN_PASSWORD;
  if (!password) {
    return NextResponse.next();
  }

  // セッション Cookie を検証
  const sessionToken = req.cookies.get('session-token')?.value;
  const expectedToken = await hashToken(password);

  if (!sessionToken || sessionToken !== expectedToken) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
