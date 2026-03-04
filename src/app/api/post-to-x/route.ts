import { NextRequest, NextResponse } from 'next/server';
import { postTweet } from '@/lib/x-client';
import type { XSettings } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { text, imageUrl, xSettings } = (await req.json()) as {
      text: string;
      imageUrl?: string;
      xSettings: XSettings;
    };

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '投稿テキストが空です' },
        { status: 400 }
      );
    }

    if (
      !xSettings?.apiKey ||
      !xSettings?.apiSecret ||
      !xSettings?.accessToken ||
      !xSettings?.accessTokenSecret
    ) {
      return NextResponse.json(
        { error: 'X (Twitter) のAPI設定が不完全です' },
        { status: 400 }
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
