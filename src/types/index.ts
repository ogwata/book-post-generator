/** 書籍情報 */
export interface BookInfo {
  title: string;
  author: string;
  price: string;
  coverImage: string;
  description: string;
  url: string;
}

/** チャットメッセージ */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** AI接続設定 */
export interface AISettings {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  model: string;
  endpoint?: string;
}

/** X (Twitter) API設定 */
export interface XSettings {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/** AI応答 */
export interface AIResponse {
  message: string;
  updatedDraft?: string;
}
