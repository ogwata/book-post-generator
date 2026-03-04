import { NextRequest, NextResponse } from 'next/server';
import { postTweet } from '@/lib/x-client';
import { getXSettings } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const { text, imageUrl } = (await req.json()) as {
      text: string;
      imageUrl?: string;
    };

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '投稿テキストが空です' },
        { status: 400 }
      );
    }

    const xSettings = getXSettings();
    if (!xSettings) {
      return NextResponse.json(
        { error: 'X (Twitter) APIが設定されていません。管理者に環境変数の設定を依頼してください。' },
        { status: 500 }
      );
    }

    const result = await postTweet(text, imageUrl, xSettings);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Post to X error:', err);
    return NextResponse.json(
      { error: err.message || 'Xへの投稿に失敗しました' },
      { status: 500 }
    );
  }
}
