import { NextRequest, NextResponse } from 'next/server';
import { callAI, buildSystemPrompt, parseAIResponse } from '@/lib/ai-client';
import { getAISettings } from '@/lib/env';
import { countXChars, X_MAX_CHARS } from '@/lib/char-counter';
import type { BookInfo, ChatMessage } from '@/types';

const MAX_RETRIES = 2;
const TARGET_MAX = 275;

export async function POST(req: NextRequest) {
  try {
    const { messages, bookInfo, currentDraft } = (await req.json()) as {
      messages: ChatMessage[];
      bookInfo: BookInfo | null;
      currentDraft: string;
    };

    const aiSettings = getAISettings();
    if (!aiSettings) {
      return NextResponse.json(
        { error: 'AI が設定されていません。管理者に環境変数の設定を依頼してください。' },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'メッセージがありません' },
        { status: 400 }
      );
    }

    const currentCharCount = currentDraft ? countXChars(currentDraft) : undefined;
    const systemPrompt = buildSystemPrompt(bookInfo, currentDraft, currentCharCount);

    let result = await callAI(messages, systemPrompt, aiSettings);

    // updatedDraft が280文字を超えていたら自動リトライ
    if (result.updatedDraft) {
      let draftCharCount = countXChars(result.updatedDraft);

      for (let i = 0; i < MAX_RETRIES && draftCharCount > X_MAX_CHARS; i++) {
        const overBy = draftCharCount - X_MAX_CHARS;
        const retryMessages: ChatMessage[] = [
          ...messages,
          { role: 'assistant', content: `${result.message}\n\n---DRAFT---\n${result.updatedDraft}\n---END_DRAFT---` },
          {
            role: 'user',
            content: `提案された投稿文はXカウントで${draftCharCount}文字あり、上限280を${overBy}文字超過しています。${TARGET_MAX}文字以下に短縮してください。`,
          },
        ];

        const updatedSystemPrompt = buildSystemPrompt(bookInfo, result.updatedDraft, draftCharCount);
        result = await callAI(retryMessages, updatedSystemPrompt, aiSettings);
        if (result.updatedDraft) {
          draftCharCount = countXChars(result.updatedDraft);
        } else {
          break;
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Chat error:', err);
    return NextResponse.json(
      { error: err.message || 'AIとの通信に失敗しました' },
      { status: 500 }
    );
  }
}
