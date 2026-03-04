'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StatusData {
  ai: {
    configured: boolean;
    provider: string | null;
    model: string | null;
    hasEndpoint: boolean;
  };
  x: {
    configured: boolean;
  };
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI (GPT)',
  anthropic: 'Anthropic (Claude)',
  google: 'Google (Gemini)',
  custom: 'カスタム (OpenAI互換)',
};

export default function SettingsPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
        <h1 className="text-2xl font-bold">接続状態</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : !status ? (
        <div className="text-center py-12 text-red-500">
          状態の取得に失敗しました
        </div>
      ) : (
        <>
          {/* AI接続状態 */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <StatusBadge configured={status.ai.configured} />
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-xl">🤖</span>
                AI接続（MCP）
              </h2>
            </div>

            {status.ai.configured ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">プロバイダー</span>
                  <span className="font-medium">
                    {PROVIDER_LABELS[status.ai.provider || ''] || status.ai.provider}
                  </span>
                </div>
                {status.ai.model && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">モデル</span>
                    <span className="font-medium">{status.ai.model}</span>
                  </div>
                )}
                {status.ai.hasEndpoint && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">カスタムエンドポイント</span>
                    <span className="font-medium text-green-600">設定済み</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                AI が接続されていません。管理者に環境変数の設定を依頼してください。
              </p>
            )}
          </section>

          {/* X接続状態 */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <StatusBadge configured={status.x.configured} />
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X (Twitter) API
              </h2>
            </div>

            {status.x.configured ? (
              <p className="text-sm text-green-700">
                X API が正しく設定されています。投稿機能が利用可能です。
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                X API が設定されていません。管理者に環境変数の設定を依頼してください。
              </p>
            )}
          </section>

          {/* 管理者向け案内 */}
          <section className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
            <p>
              API キーの設定は、管理者がサーバーの環境変数で行います。
              設定変更が必要な場合は管理者にお問い合わせください。
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100">
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ) : (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100">
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}
