# BookPost Generator

書籍情報ページのURLを入力すると、書名・著者名・価格・内容紹介などを自動抽出し、AIが要約・ハッシュタグ付きのX（Twitter）投稿文を生成するWebアプリです。チャットウィンドウでAIと会話しながら投稿文を推敲し、そのままXに投稿できます。

---

## 管理者向け：セットアップとデプロイ

### 必要な環境

- Node.js 18以上
- npm
- 各種APIキー（後述）

### インストール

```bash
git clone https://github.com/ogwata/book-post-generator.git
cd book-post-generator
npm install
```

### 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、各値を設定してください。

```bash
cp .env.example .env.local
```

設定する環境変数：

| 変数名 | 必須 | 説明 |
|---|---|---|
| `AI_PROVIDER` | Yes | AIプロバイダー（`openai` / `anthropic` / `google` / `custom`） |
| `AI_API_KEY` | Yes | AIプロバイダーのAPIキー |
| `AI_MODEL` | No | モデル名（例: `gpt-4o`, `claude-sonnet-4-20250514`）。空欄でデフォルト使用 |
| `AI_ENDPOINT` | No | カスタムプロバイダーの場合のみ。OpenAI互換APIのエンドポイント |
| `X_API_KEY` | Yes | X Developer PortalのAPI Key (Consumer Key) |
| `X_API_SECRET` | Yes | API Secret (Consumer Secret) |
| `X_ACCESS_TOKEN` | Yes | Access Token |
| `X_ACCESS_TOKEN_SECRET` | Yes | Access Token Secret |
| `LOGIN_PASSWORD` | Yes | 運用者がログインに使う共有パスワード |

> **X API の注意点:**
> - [X Developer Portal](https://developer.x.com/en/portal/dashboard) でアプリの権限を **Read and Write** に設定してください
> - 権限変更後は Access Token を **再生成** してください（古いトークンは旧権限のまま）
> - コールバックURL・ウェブサイトURLにはデプロイ先のURLを入力してください

### ローカルで動作確認

```bash
npm run dev
```

http://localhost:3000 にアクセスし、`LOGIN_PASSWORD` に設定したパスワードでログインできることを確認します。

### Vercelへのデプロイ

```bash
npm install -g vercel
vercel
```

デプロイ後、Vercel ダッシュボードの **Settings → Environment Variables** で上記の環境変数を全て設定してください。

### 運用者への引き継ぎ

以下の情報を運用者に共有してください：

1. **アプリのURL**（例: `https://book-post-generator-xxx.vercel.app`）
2. **ログインパスワード**（`LOGIN_PASSWORD` に設定した値）

API キーの管理は管理者側で行うため、運用者にAPIキーを共有する必要はありません。

---

## 運用者向け：使い方

### ログイン

アプリのURLにアクセスし、管理者から共有されたパスワードでログインしてください。

### 手順1: 書誌情報URLを入力

メインページ上部の入力欄に、書籍の情報が掲載されているページのURLを貼り付けて **「取得」** ボタンを押します。

対応サイトの例:
- books.booko.co.jp
- amazon.co.jp
- OGタグやJSON-LD構造化データを持つ書籍情報ページ全般

取得される情報:
- 書名
- 著者名
- 価格
- 書影（カバー画像）
- 内容紹介

### 手順2: 投稿文の自動生成

取得した書籍情報をもとにAIが自動で投稿文を生成します。フォーマットは以下の通りです。

```
書名 著者名 価格
内容紹介（要約）
#ハッシュタグ
書誌情報URL
```

### 手順3: AIチャットで推敲

画面右側のチャットウィンドウでAIに指示を出して投稿文を修正できます。

入力例:
- 「もう少し短くして」
- 「ハッシュタグを追加して」
- 「価格の表記を"＋税"に変えて」
- 「内容紹介をもっと具体的にして」

AIが更新した投稿文は左側のテキスト編集欄に自動反映されます。テキスト編集欄を直接編集することもできます。

### 手順4: 文字数を確認

テキスト編集欄の右上に **文字数カウンター** が表示されます。

- Xの上限は **280文字**（日本語等のCJK文字は2文字としてカウント、URLは23文字としてカウント）
- 260文字以下: 緑色
- 261〜280文字: 黄色
- 281文字以上: 赤色（投稿不可）

### 手順5: Xに投稿

内容を確認したら **「Xに投稿する」** ボタンを押します。確認ダイアログが表示されるので「OK」を押すと投稿されます。書影画像がある場合は画像付きで投稿されます。

投稿完了後、投稿へのリンクが表示されます。

### 接続状態の確認

ヘッダーの「接続状態」をクリックすると、AI と X API の接続状況を確認できます。未接続の場合は管理者にお問い合わせください。

---

## 投稿文のライティング・ポリシー

AIは以下のポリシーに従って投稿文を生成します。

- **煽り表現の禁止:** 「画期的」「魔法」「究極」「救世主」「奇跡」などの過度な装飾語は使用しない
- **事実に即した誠実なトーン:** 具体的な解決策を淡々と伝える
- **情報の正確性:** 書名は正確に使用し、サブタイトルやキャッチコピーを創作しない

### 投稿例

```
せいろ１つで晩ごはん 本澤知美 1650円＋税
3,000人の料理の悩みを解決してきた元講師が提案する、せいろ1段で主菜と副菜が同時に仕上がるレシピ集。「帰宅後30分で夕飯を完成させたい」「忙しくても野菜をしっかり摂りたい」そんな日常に寄り添う一冊です。
#せいろ１つで晩ごはん #本澤知美 #Booko出版 #自分で本を作る
https://books.booko.co.jp/topics-archives/books-archives/296/
```

## 技術スタック

- Next.js 14 / React 18 / TypeScript
- Tailwind CSS
- Cheerio（HTMLスクレイピング）
- OAuth 1.0a（X API認証）

## ライセンス

MIT
