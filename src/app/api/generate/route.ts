import { NextRequest, NextResponse } from 'next/server';
import { callAI, buildSystemPrompt, buildGeneratePrompt } from '@/lib/ai-client';
import { getAISettings } from '@/lib/env';
import { countXChars, X_MAX_CHARS } from '@/lib/char-counter';
import type { BookInfo, ChatMessage } from '@/types';

const MAX_RETRIES = 2;
const TARGET_CHARS = 270; // 280より少し余裕を持たせた目標

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

    // 初回生成
    const messages: ChatMessage[] = [{ role: 'user', content: userPrompt }];
    let result = await callAI(messages, systemPrompt, aiSettings);
    let draft = result.updatedDraft || result.message;
    let charCount = countXChars(draft);

    // 280文字超過時は自動リトライ（最大MAX_RETRIES回）
    for (let i = 0; i < MAX_RETRIES && charCount > X_MAX_CHARS; i++) {
      const overBy = charCount - X_MAX_CHARS;
      const retryMessages: ChatMessage[] = [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: draft },
        {
          role: 'user',
          content: `この投稿文はXカウントで${charCount}文字あり、上限280を${overBy}文字超過しています。${TARGET_CHARS}文字以下になるよう短縮してください。内容紹介をさらに短くし、ハッシュタグを減らしてください。投稿文のみを返してください。`,
        },
      ];

      result = await callAI(retryMessages, systemPrompt, aiSettings);
      draft = result.updatedDraft || result.message;
      charCount = countXChars(draft);
    }

    return NextResponse.json({ draft, charCount });
  } catch (err: any) {
    console.error('Generate error:', err);
    return NextResponse.json(
      { error: err.message || '投稿文の生成に失敗しました' },
      { status: 500 }
    );
  }
}
