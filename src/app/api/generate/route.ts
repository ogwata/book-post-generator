import { NextRequest, NextResponse } from 'next/server';
import { callAI, buildSystemPrompt, buildGeneratePrompt } from '@/lib/ai-client';
import type { AISettings, BookInfo } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { bookInfo, aiSettings } = (await req.json()) as {
      bookInfo: BookInfo;
      aiSettings: AISettings;
    };

    if (!bookInfo) {
      return NextResponse.json(
        { error: '書籍情報がありません' },
        { status: 400 }
      );
    }

    if (!aiSettings?.apiKey) {
      return NextResponse.json(
        { error: 'AI APIキーが設定されていません' },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(bookInfo, '');
    const userPrompt = buildGeneratePrompt(bookInfo);

    const result = await callAI(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      aiSettings
    );

    // レスポンスから投稿文を抽出
    const draft = result.updatedDraft || result.message;

    return NextResponse.json({ draft });
  } catch (err: any) {
    console.error('Generate error:', err);
    return NextResponse.json(
      { error: err.message || '投稿文の生成に失敗しました' },
      { status: 500 }
    );
  }
}
