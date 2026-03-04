import { NextRequest, NextResponse } from 'next/server';
import { callAI, buildSystemPrompt } from '@/lib/ai-client';
import { getAISettings } from '@/lib/env';
import type { BookInfo, ChatMessage } from '@/types';

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

    const systemPrompt = buildSystemPrompt(bookInfo, currentDraft);

    const result = await callAI(messages, systemPrompt, aiSettings);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Chat error:', err);
    return NextResponse.json(
      { error: err.message || 'AIとの通信に失敗しました' },
      { status: 500 }
    );
  }
}
