import { NextRequest, NextResponse } from 'next/server';
import { callAI, buildSystemPrompt, buildGeneratePrompt } from '@/lib/ai-client';
import { getAISettings } from '@/lib/env';
import { countXChars, X_MAX_CHARS } from '@/lib/char-counter';
import type { BookInfo, ChatMessage } from '@/types';

const MAX_RETRIES = 2;
const TARGET_MIN = 250;  // これ以下なら短すぎ → 引き伸ばし
const TARGET_MAX = 275;  // これ以上なら長すぎ → 短縮

function isInRange(count: number): boolean {
  return count >= TARGET_MIN && count <= X_MAX_CHARS;
}

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

    // 範囲外（短すぎ or 長すぎ）の場合は自動リトライ
    for (let i = 0; i < MAX_RETRIES && !isInRange(charCount); i++) {
      let retryInstruction: string;

      if (charCount > X_MAX_CHARS) {
        const overBy = charCount - X_MAX_CHARS;
        retryInstruction = `この投稿文はXカウントで${charCount}文字あり、上限280を${overBy}文字超過しています。${TARGET_MAX}文字以下になるよう短縮してください。内容紹介を短くし、ハッシュタグを減らしてください。投稿文のみを返してください。`;
      } else {
        const shortBy = TARGET_MIN - charCount;
        retryInstruction = `この投稿文はXカウントで${charCount}文字しかなく、短すぎます。${TARGET_MIN}〜${TARGET_MAX}文字の範囲になるよう、内容紹介をもう少し具体的にするか、関連するハッシュタグを追加してください。投稿文のみを返してください。`;
      }

      const retryMessages: ChatMessage[] = [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: draft },
        { role: 'user', content: retryInstruction },
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
