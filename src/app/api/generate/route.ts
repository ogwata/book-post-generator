import { NextRequest, NextResponse } from 'next/server';
import { callAI, buildSystemPrompt, buildGeneratePrompt } from '@/lib/ai-client';
import { getAISettings } from '@/lib/env';
import type { BookInfo } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { bookInfo } = (await req.json()) as {
      bookInfo: BookInfo;
    };

    if (!bookInfo) {
      return NextResponse.json(
        { error: '書籍情報がありません' },
        { status: 400 }
      );
    }

    const aiSettings = getAISettings();
    if (!aiSettings) {
      return NextResponse.json(
        { error: 'AI が設定されていません。管理者に環境変数の設定を依頼してください。' },
        { status: 500 }
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
