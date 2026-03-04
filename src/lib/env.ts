import type { AISettings, XSettings } from '@/types';

/**
 * 環境変数からAI設定を取得
 */
export function getAISettings(): AISettings | null {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;

  const provider = (process.env.AI_PROVIDER || 'openai') as AISettings['provider'];
  const validProviders = ['openai', 'anthropic', 'google', 'custom'];
  if (!validProviders.includes(provider)) return null;

  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL || '',
    endpoint: process.env.AI_ENDPOINT || undefined,
  };
}

/**
 * 環境変数からX (Twitter) API設定を取得
 */
export function getXSettings(): XSettings | null {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) return null;

  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

/**
 * ログインパスワードを取得
 */
export function getLoginPassword(): string {
  return process.env.LOGIN_PASSWORD || '';
}
