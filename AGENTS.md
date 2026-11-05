# AGENTS.md — book-post-generator

このリポジトリは書籍情報ページの URL から X（Twitter）投稿文を生成・推敲する Web アプリケーションである。構成・環境変数・手順は [`README.md`](README.md) を参照する。

## 共通指示・共有メモリ・ハンドオフの入口

- 全体指示の正本 `/Users/ogwata/dev/oboe/global/AGENTS.md`、ワークスペース共通指示 `/Users/ogwata/dev/AGENTS.md`、および BookoPub 共通指示 `/Users/ogwata/dev/BookoPub/AGENTS.md`・`/Users/ogwata/dev/BookoPub/CONTEXT.md`（全文）・`/Users/ogwata/dev/BookoPub/LICENSE-RULES.md` に従う。
- 作業開始時に共有メモリの目次 [`.agents/memory/MEMORY.md`](.agents/memory/MEMORY.md) と、依頼に関係する記憶ファイルを読む。ユーザーから指摘・訂正・好みを受けた場合は `.agents/memory/` に記録し、目次を更新する（詳細は [`.clinerules/01-記憶.md`](.clinerules/01-記憶.md) を参照）。
- 作業開始時にハンドオフの共通目次 `/Users/ogwata/dev/oboe/handoffs/INDEX.md` を確認し、該当作業の現行 `HANDOFF.md` があれば読む。
