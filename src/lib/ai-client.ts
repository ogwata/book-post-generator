import type { AISettings, AIResponse, ChatMessage, BookInfo } from '@/types';

/** ライティング・ポリシーを含むシステムプロンプト */
export function buildSystemPrompt(bookInfo: BookInfo | null, currentDraft: string): string {
  let prompt = `あなたは書籍紹介の投稿文を作成するアシスタントです。

## ライティング・ポリシー（厳守）

1. **煽り表現の禁止**: 「画期的」「魔法」「究極」「救世主」「奇跡」「衝撃」「革命的」「必読」「神」など過度な装飾語は一切使用しない
2. **事実に即した誠実なトーン**: 他の類似本と比較検討している読者に向け、その本が提供する「具体的な解決策」を淡々と、誠実に伝える
3. **情報の正確性**: 書名は正確に使用し、サブタイトルやキャッチコピーを勝手に創作しない

## 投稿フォーマット

書名 著者名 価格
内容紹介（要約）
ハッシュタグ
書誌情報URL

## 投稿文の要件

- 書誌ページ掲載の内容紹介を適宜要約する
- 本が解決する課題、具体的なメリットを凝縮する
- 内容にあった複数のハッシュタグを自動生成する
- X (Twitter) の280文字制限を意識して簡潔にまとめる

## 投稿文更新時のルール

投稿文を更新・提案する場合は、必ず以下の形式で返答してください:

[会話の返答テキスト]

---DRAFT---
[更新された投稿文の全文]
---END_DRAFT---

投稿文を更新しない場合は、会話の返答のみを返してください。`;

  if (bookInfo) {
    prompt += `\n\n## 現在の書籍情報\n\n`;
    prompt += `- 書名: ${bookInfo.title}\n`;
    prompt += `- 著者: ${bookInfo.author}\n`;
    prompt += `- 価格: ${bookInfo.price}\n`;
    prompt += `- 内容紹介: ${bookInfo.description}\n`;
    prompt += `- URL: ${bookInfo.url}\n`;
  }

  if (currentDraft) {
    prompt += `\n\n## 現在の投稿文ドラフト\n\n${currentDraft}`;
  }

  return prompt;
}

/** 初期ドラフト生成用プロンプト */
export function buildGeneratePrompt(bookInfo: BookInfo): string {
  return `以下の書籍情報をもとに、X (Twitter) 向けの投稿文を生成してください。

フォーマット:
書名 著者名 価格
内容紹介の要約（本が解決する課題・具体的なメリットを凝縮）
ハッシュタグ（#書名 #著者名 を含む複数のハッシュタグ）
書誌情報URL

## 書籍情報
- 書名: ${bookInfo.title}
- 著者: ${bookInfo.author}
- 価格: ${bookInfo.price}
- 内容紹介: ${bookInfo.description}
- URL: ${bookInfo.url}

投稿文のみを返してください。余計な説明は不要です。`;
}

/** AIプロバイダーにリクエストを送信 */
export async function callAI(
  messages: ChatMessage[],
  systemPrompt: string,
  settings: AISettings
): Promise<AIResponse> {
  switch (settings.provider) {
    case 'anthropic':
      return callAnthropic(messages, systemPrompt, settings);
    case 'openai':
      return callOpenAI(messages, systemPrompt, settings);
    case 'google':
      return callGoogle(messages, systemPrompt, settings);
    case 'custom':
      return callOpenAICompatible(messages, systemPrompt, settings);
    default:
      throw new Error(`未対応のAIプロバイダー: ${settings.provider}`);
  }
}

/** レスポンスからドラフト更新を抽出 */
export function parseAIResponse(text: string): AIResponse {
  const draftMatch = text.match(/---DRAFT---\n?([\s\S]*?)\n?---END_DRAFT---/);

  if (draftMatch) {
    const message = text.replace(/---DRAFT---[\s\S]*?---END_DRAFT---/, '').trim();
    return {
      message: message || '投稿文を更新しました。',
      updatedDraft: draftMatch[1].trim(),
    };
  }

  return { message: text.trim() };
}

/** Anthropic Claude API */
async function callAnthropic(
  messages: ChatMessage[],
  systemPrompt: string,
  settings: AISettings
): Promise<AIResponse> {
  const anthropicMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: settings.model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API エラー: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  return parseAIResponse(text);
}

/** OpenAI API */
async function callOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
  settings: AISettings
): Promise<AIResponse> {
  const openaiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o',
      messages: openaiMessages,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API エラー: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return parseAIResponse(text);
}

/** Google Gemini API */
async function callGoogle(
  messages: ChatMessage[],
  systemPrompt: string,
  settings: AISettings
): Promise<AIResponse> {
  const model = settings.model || 'gemini-pro';
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI API エラー: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseAIResponse(text);
}

/** OpenAI互換API（カスタムエンドポイント） */
async function callOpenAICompatible(
  messages: ChatMessage[],
  systemPrompt: string,
  settings: AISettings
): Promise<AIResponse> {
  const endpoint = settings.endpoint || 'https://api.openai.com/v1';
  const openaiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o',
      messages: openaiMessages,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API エラー: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return parseAIResponse(text);
}
