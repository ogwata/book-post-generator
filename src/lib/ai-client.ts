import type { AISettings, AIResponse, ChatMessage, BookInfo } from '@/types';

/** ライティング・ポリシーを含むシステムプロンプト */
export function buildSystemPrompt(
  bookInfo: BookInfo | null,
  currentDraft: string,
  currentCharCount?: number
): string {
  let prompt = `あなたは書籍紹介のX (Twitter) 投稿文を作成するアシスタントです。

## 最重要ルール：文字数制限（厳守）

Xの投稿は **280文字が上限** です。これを超えると投稿できません。
**260〜275文字の範囲** を目標に生成してください。短すぎず、長すぎず、280に近い文字数が理想です。

### Xの文字カウント方式（通常の文字数と異なります）
- **日本語・CJK文字**（漢字、ひらがな、カタカナ、全角記号）: **1文字 = 2としてカウント**
- **半角英数字・半角記号**: 1文字 = 1としてカウント
- **URL**: 長さに関係なく **1つ = 23としてカウント**
- **改行**: 1つ = 1としてカウント
- **ハッシュタグの#**: 半角 = 1、タグ内の日本語は各2としてカウント

### 実質的な文字数バジェット
- URL（23）+ 改行数分を引くと、テキスト部分に使えるのは約250程度
- 日本語は1文字が2カウントなので、**日本語のみなら約120〜130文字**を目標にする
- 書名＋著者名＋価格＋要約＋ハッシュタグ＋URLをすべて含めて260〜275が目標

### 文字数の調整テクニック
- 短すぎる場合：内容紹介をもう少し具体的にする、ハッシュタグを3個にする
- 長すぎる場合：内容紹介を1文に凝縮する、ハッシュタグを2個に減らす
- 冗長な表現を避け、体言止めや短い文を使う

## ライティング・ポリシー（厳守）

1. **煽り表現の禁止**: 「画期的」「魔法」「究極」「救世主」「奇跡」「衝撃」「革命的」「必読」「神」など過度な装飾語は一切使用しない
2. **事実に即した誠実なトーン**: 他の類似本と比較検討している読者に向け、その本が提供する「具体的な解決策」を淡々と、誠実に伝える
3. **情報の正確性**: 書名は正確に使用し、サブタイトルやキャッチコピーを勝手に創作しない

## 投稿フォーマット

書名 著者名 価格
内容紹介（1〜2文の簡潔な要約）
ハッシュタグ（2〜3個）
書誌情報URL

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
    if (currentCharCount !== undefined) {
      prompt += `\n\n## 現在の文字数状況\n\n`;
      prompt += `- Xカウント: **${currentCharCount} / 280**\n`;
      if (currentCharCount > 280) {
        prompt += `- ⚠️ **${currentCharCount - 280}文字オーバーしています！文章を短縮してください。**\n`;
      } else {
        prompt += `- 残り: ${280 - currentCharCount}文字\n`;
      }
    }
  }

  return prompt;
}

/** 初期ドラフト生成用プロンプト */
export function buildGeneratePrompt(bookInfo: BookInfo): string {
  // URLのXカウント（23固定）と改行分を差し引いた残り文字数を計算
  const urlCount = 23;
  const newlineCount = 3; // フォーマット上3行の改行
  const remainingBudget = 280 - urlCount - newlineCount;

  return `以下の書籍情報をもとに、X (Twitter) 向けの投稿文を生成してください。

【最重要】Xカウントで260〜275文字の範囲に収めてください（280が上限、短すぎてもNG）。
- URLは23カウント固定、改行は各1カウント
- 日本語1文字 = 2カウント、半角英数 = 1カウント
- URL・改行を除くと残り約${remainingBudget}カウント（日本語のみなら約${Math.floor(remainingBudget / 2)}文字が目標）
- 内容紹介は1〜2文で具体的に、ハッシュタグは2〜3個

フォーマット:
書名 著者名 価格
内容紹介（1〜2文の簡潔な要約）
ハッシュタグ（2〜3個）
${bookInfo.url}

## 書籍情報
- 書名: ${bookInfo.title}
- 著者: ${bookInfo.author}
- 価格: ${bookInfo.price}
- 内容紹介: ${bookInfo.description}

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
