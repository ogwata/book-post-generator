import { NextRequest, NextResponse } from 'next/server';
import { hashToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const expected = process.env.LOGIN_PASSWORD;

    if (!expected || password !== expected) {
      return NextResponse.json(
        { error: 'パスワードが正しくありません' },
        { status: 401 }
      );
    }

    const token = await hashToken(expected);
    const response = NextResponse.json({ success: true });

    response.cookies.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30日間
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'リクエストが不正です' },
      { status: 400 }
    );
  }
}
