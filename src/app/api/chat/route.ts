import { NextRequest, NextResponse } from 'next/server';
import { callAI, buildSystemPrompt } from '@/lib/ai-client';
import type { AISettings, BookInfo, ChatMessage } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { messages, bookInfo, currentDraft, aiSettings } = (await req.json()) as {
      messages: ChatMessage[];
      bookInfo: BookInfo | null;
      currentDraft: string;
      aiSettings: AISettings;
    };

    if (!aiSettings?.apiKey) {
      return NextResponse.json(
        { error: 'AI APIキーが設定されていません' },
        { status: 400 }
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
