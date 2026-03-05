'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { BookInfo, ChatMessage } from '@/types';
import { countXChars, X_MAX_CHARS } from '@/lib/char-counter';

interface ConfigStatus {
  ai: { configured: boolean };
  x: { configured: boolean };
}

export default function Home() {
  // --- State ---
  const [url, setUrl] = useState('');
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [draftText, setDraftText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ url: string } | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

  const charCount = countXChars(draftText);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // サーバーの設定状態を取得
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setConfigStatus(data))
      .catch(() => {});
  }, []);

  // チャットの自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // --- 書籍情報取得 ---
  const handleFetch = useCallback(async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setPostResult(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBookInfo(data);

      if (configStatus?.ai?.configured) {
        // AI で初期ドラフト生成
        const genRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookInfo: data }),
        });
        const genData = await genRes.json();
        if (genData.draft) {
          setDraftText(genData.draft);
          setChatMessages([
            {
              role: 'assistant',
              content:
                '書籍情報をもとに投稿文を生成しました。修正したい点があればこちらでお知らせください。',
            },
          ]);
        } else {
          setDraftText(buildFallbackDraft(data));
          setChatMessages([]);
        }
      } else {
        // AI未設定：フォールバック
        setDraftText(buildFallbackDraft(data));
        setChatMessages([
          {
            role: 'assistant',
            content:
              'AI が未設定のため、基本テンプレートで投稿文を作成しました。管理者に AI 接続の設定を依頼してください。',
          },
        ]);
      }
    } catch (err: any) {
      alert('取得エラー: ' + (err.message || '不明なエラー'));
    } finally {
      setIsLoading(false);
    }
  }, [url, configStatus]);

  // --- チャット送信 ---
  const handleChat = useCallback(async () => {
    if (!chatInput.trim()) return;

    if (!configStatus?.ai?.configured) {
      alert('AI が未設定です。管理者に AI 接続の設定を依頼してください。');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          bookInfo,
          currentDraft: draftText,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ]);

      if (data.updatedDraft) {
        setDraftText(data.updatedDraft);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'エラーが発生しました: ' + (err.message || '不明なエラー'),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, chatMessages, bookInfo, draftText, configStatus]);

  // --- X投稿 ---
  const handlePost = useCallback(async () => {
    if (!configStatus?.x?.configured) {
      alert(
        'X (Twitter) APIが設定されていません。管理者に環境変数の設定を依頼してください。'
      );
      return;
    }

    if (charCount > X_MAX_CHARS) {
      alert(
        `文字数が${X_MAX_CHARS}文字を超えています（現在: ${charCount}文字）。${charCount - X_MAX_CHARS}文字削減してください。`
      );
      return;
    }

    if (!draftText.trim()) {
      alert('投稿テキストが空です。');
      return;
    }

    if (!confirm('この内容でXに投稿しますか？')) return;

    setIsPosting(true);
    try {
      const res = await fetch('/api/post-to-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: draftText,
          imageUrl: bookInfo?.coverImage,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPostResult({ url: data.url });
    } catch (err: any) {
      alert('投稿エラー: ' + (err.message || '不明なエラー'));
    } finally {
      setIsPosting(false);
    }
  }, [draftText, charCount, bookInfo, configStatus]);

  // --- ヘルパー ---
  function buildFallbackDraft(info: BookInfo): string {
    const parts = [info.title];
    if (info.author) parts[0] += ` ${info.author}`;
    if (info.price) parts[0] += ` ${info.price}`;
    if (info.description) {
      const desc =
        info.description.length > 120
          ? info.description.slice(0, 120) + '...'
          : info.description;
      parts.push(desc);
    }
    parts.push(info.url);
    return parts.join('\n');
  }

  function charCountColor(): string {
    if (charCount > X_MAX_CHARS) return 'text-red-600 font-bold';
    if (charCount > 260) return 'text-yellow-600';
    return 'text-gray-500';
  }

  // --- レンダリング ---
  return (
    <div className="space-y-4">
      {/* 1. URL入力欄 */}
      <section className="card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          書誌情報ページURL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder="https://books.booko.co.jp/..."
              className="input-field w-full pr-8"
              disabled={isLoading}
            />
            {url && (
              <button
                onClick={() => setUrl('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-400/60 hover:bg-gray-500/80 text-white transition-colors"
                aria-label="URLをクリア"
                type="button"
              >
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleFetch}
            disabled={isLoading || !url.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                取得中...
              </span>
            ) : (
              '取得'
            )}
          </button>
        </div>
      </section>

      {/* 書影プレビュー */}
      {bookInfo?.coverImage && (
        <div className="flex justify-center">
          <img
            src={bookInfo.coverImage}
            alt={bookInfo.title || '書影'}
            className="max-h-48 rounded-lg shadow-md object-contain"
          />
        </div>
      )}

      {/* 2 & 3. テキスト編集欄 + チャットウィンドウ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* テキスト編集欄 */}
        <section className="card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              投稿テキスト
            </label>
            <span className={`text-sm ${charCountColor()}`}>
              {charCount} / {X_MAX_CHARS}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="書誌情報URLを入力して「取得」を押すと、投稿文が自動生成されます"
            className="input-field flex-1 min-h-[300px] font-mono text-sm leading-relaxed"
          />
          {charCount > X_MAX_CHARS && (
            <p className="text-red-600 text-xs mt-1">
              {charCount - X_MAX_CHARS}文字オーバーしています
            </p>
          )}
        </section>

        {/* チャットウィンドウ */}
        <section className="card p-4 flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">
            AIチャット
          </label>

          <div className="flex-1 min-h-[260px] max-h-[400px] overflow-y-auto chat-messages bg-gray-50 rounded-lg p-3 mb-3 space-y-3">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">
                書籍情報を取得すると、AIが投稿文を生成します。
                <br />
                ここでAIと会話しながら投稿文を編集できます。
              </p>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              placeholder="例: もう少し短くして、ハッシュタグを追加して"
              className="input-field flex-1"
              disabled={isChatLoading}
            />
            <button
              onClick={handleChat}
              disabled={isChatLoading || !chatInput.trim()}
              className="btn-primary"
            >
              送信
            </button>
          </div>
        </section>
      </div>

      {/* 4. X投稿ボタン */}
      <section className="flex flex-col items-center gap-3 pt-2 pb-4">
        <button
          onClick={handlePost}
          disabled={isPosting || !draftText.trim()}
          className="btn-x flex items-center gap-2"
        >
          {isPosting ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              投稿中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Xに投稿する
            </>
          )}
        </button>

        {postResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            投稿が完了しました！{' '}
            <a
              href={postResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              投稿を確認する →
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
