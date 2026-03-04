'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AISettings {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
}

interface XSettings {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

const DEFAULT_AI: AISettings = {
  provider: 'openai',
  apiKey: '',
  model: '',
  endpoint: '',
};

const DEFAULT_X: XSettings = {
  apiKey: '',
  apiSecret: '',
  accessToken: '',
  accessTokenSecret: '',
};

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT)', defaultModel: 'gpt-4o' },
  { value: 'anthropic', label: 'Anthropic (Claude)', defaultModel: 'claude-sonnet-4-20250514' },
  { value: 'google', label: 'Google (Gemini)', defaultModel: 'gemini-pro' },
  { value: 'custom', label: 'カスタム (OpenAI互換)', defaultModel: '' },
];

export default function SettingsPage() {
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI);
  const [xSettings, setXSettings] = useState<XSettings>(DEFAULT_X);
  const [saved, setSaved] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({
    ai: false,
    xKey: false,
    xSecret: false,
    xToken: false,
    xTokenSecret: false,
  });

  // 初期読み込み
  useEffect(() => {
    try {
      const storedAI = localStorage.getItem('aiSettings');
      if (storedAI) setAiSettings(JSON.parse(storedAI));
      const storedX = localStorage.getItem('xSettings');
      if (storedX) setXSettings(JSON.parse(storedX));
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
    localStorage.setItem('xSettings', JSON.stringify(xSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleProviderChange = (provider: string) => {
    const providerInfo = AI_PROVIDERS.find((p) => p.value === provider);
    setAiSettings((prev) => ({
      ...prev,
      provider,
      model: providerInfo?.defaultModel || prev.model,
    }));
  };

  const toggleVisibility = (key: keyof typeof showApiKeys) => {
    setShowApiKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold">設定</h1>
      </div>

      {/* AI接続設定 */}
      <section className="card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">🤖</span>
          AI接続設定（MCP）
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          投稿文の自動生成・要約・ハッシュタグ生成に使用するAIプロバイダーを設定します。
        </p>

        <div className="space-y-4">
          {/* プロバイダー選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AIプロバイダー
            </label>
            <select
              value={aiSettings.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="input-field"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              APIキー
            </label>
            <div className="relative">
              <input
                type={showApiKeys.ai ? 'text' : 'password'}
                value={aiSettings.apiKey}
                onChange={(e) =>
                  setAiSettings((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                placeholder="sk-..."
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => toggleVisibility('ai')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKeys.ai ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* モデル名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              モデル名
            </label>
            <input
              type="text"
              value={aiSettings.model}
              onChange={(e) =>
                setAiSettings((prev) => ({ ...prev, model: e.target.value }))
              }
              placeholder={
                AI_PROVIDERS.find((p) => p.value === aiSettings.provider)?.defaultModel ||
                'モデル名を入力'
              }
              className="input-field"
            />
          </div>

          {/* カスタムエンドポイント */}
          {aiSettings.provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                APIエンドポイント
              </label>
              <input
                type="url"
                value={aiSettings.endpoint}
                onChange={(e) =>
                  setAiSettings((prev) => ({ ...prev, endpoint: e.target.value }))
                }
                placeholder="https://api.example.com/v1"
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">
                OpenAI互換のChat Completions APIエンドポイントを指定してください
              </p>
            </div>
          )}
        </div>
      </section>

      {/* X (Twitter) 設定 */}
      <section className="card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X (Twitter) API設定
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          X Developer Portalで取得したAPIキーを設定します。
          <a
            href="https://developer.x.com/en/portal/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline ml-1"
          >
            Developer Portal →
          </a>
        </p>

        <div className="space-y-4">
          {[
            { key: 'apiKey' as const, label: 'API Key (Consumer Key)', visKey: 'xKey' as const },
            { key: 'apiSecret' as const, label: 'API Secret (Consumer Secret)', visKey: 'xSecret' as const },
            { key: 'accessToken' as const, label: 'Access Token', visKey: 'xToken' as const },
            { key: 'accessTokenSecret' as const, label: 'Access Token Secret', visKey: 'xTokenSecret' as const },
          ].map(({ key, label, visKey }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <div className="relative">
                <input
                  type={showApiKeys[visKey] ? 'text' : 'password'}
                  value={xSettings[key]}
                  onChange={(e) =>
                    setXSettings((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(visKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKeys[visKey] ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 保存ボタン */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} className="btn-primary">
          設定を保存
        </button>
        {saved && (
          <span className="text-green-600 text-sm font-medium animate-pulse">
            保存しました
          </span>
        )}
      </div>
    </div>
  );
}
