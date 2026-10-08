---
emoji: 🔌
title: "MCPとfunction calling"
seoTitle: "MCPはfunction callingと何が違うのか: プロトコル構造と呼び出しの流れ"
date: "2026-05-24"
locale: ja
translationOf: '260524'
sourceHash: c8c4c1ecc1bcc3dec03f51f86523bff1a97cfb134b8b21433ff155fcea071b34
categories: AI 開発ツール Claude MCP CodeGraph
description: "MCPがfunction callingとどう違うのかをプロトコル構造から整理する。6つのプリミティブ、stdioとStreamable HTTP、tools/listからtool_useループまでの流れ、Tool Poisoningなどのセキュリティ問題を扱う。"
keywords: "MCP, Model Context Protocol, MCP function calling 違い, MCP プリミティブ, tools/list, Streamable HTTP, Tool Poisoning Attack, MCP セキュリティ"
---

今回の記事では、**MCP（Model Context Protocol）がfunction callingと何が違うのか**について話してみたい。

Claude CodeやCursorにMCPサーバーをつないで使ってはいるものの、それがLLM APIのfunction callingとどこで分かれるのかを説明しにくかった開発者に向けた記事だ。先に答えを書くと、違いは4つある。ツール一覧を実行時に取得する動的な発見、ライフサイクルが定義されたstateful session、Tool以外のプリミティブ、そしてサーバーがクライアントのLLMを逆に呼び出せる双方向性だ。最後まで読めば、この4つがプロトコルのどの部分から来ているのか、そしてその構造がどのようなセキュリティ問題につながるのかがわかる。

筆者はフロントエンド開発者として日常的にClaudeを活用しているが、MCPサーバーを一つ追加するたびに、これらのツールがどのような仕組みでモデルの視野に入るのかが毎回あやふやだった。


## MCP（Model Context Protocol）

MCP（Model Context Protocol）は「**エージェントに何ができるようにするか**」という問題を解く。

少し具体的に説明しよう。AIエージェントがSlackへメッセージを送るには、Slack APIを呼び出せなければならない。GitHub Issueを作るには、GitHub APIを呼び出せなければならない。Postgresへクエリするには、DB接続を扱えなければならない。こうした外部システムとの統合を、**一つの標準プロトコルにまとめたもの**がMCPだ。（どのクライアントも、どのサーバーにも、同じインターフェースで接続できるという意味だ。）

MCPはAnthropicが**2024年11月25日**に初めて公開したオープン標準だ。そして**2025年12月9日**、Anthropic・Block・OpenAIの3社は共同創設者として、MCP仕様をLinux Foundation傘下の**Agentic AI Foundation（AAIF）**へ寄贈した。Google・Microsoft・AWS・Cloudflare・Bloombergがプラチナメンバーとして参加した。（2025年12月の寄贈時点で、SDKは月間9,700万回以上ダウンロードされ、1万以上の公開MCPサーバーが稼働していた。）

MCPはJSON-RPC上に構築された、状態を持つ（stateful）セッションプロトコルだ。**JSON-RPC**は、JSONをワイヤーフォーマットとして使うstatelessで軽量なRPC（Remote Procedure Call）プロトコルである。トランスポート層に依存せず、HTTP・TCP・標準入出力のいずれでも動作する。notification（応答のない呼び出し）とbatch呼び出しにも対応する。


### プロトコルの内部

MCPでクライアントとサーバーが交わすすべてのやり取りは、6つのプリミティブ（primitive）のいずれかで表現される。ここでいうプリミティブは、JavaScriptのプリミティブ型（stringやnumberなど）とは関係がなく、プロトコルが定めた基本的なやり取りの種類を指す。当初はサーバー側の3つから始まったが、2025-06-18 specでクライアント側のプリミティブ3つが追加され、現在は合計6つが標準となっている。

**サーバー側プリミティブ**

- **Tool**（model-controlled）：モデルが呼び出すかどうかを自ら判断して実行する操作。この操作は副作用（side effect）を持つことがある
- **Resource**（application-controlled）：URIで識別される読み取り専用データ。どのリソースを公開するかはホストアプリケーションが決める
- **Prompt**（user-controlled）：ユーザーがスラッシュコマンドなどで明示的にトリガーする、再利用可能なテンプレート

**クライアント側プリミティブ**

- **Sampling**：サーバーから逆にクライアントのLLMへcompletionを要求できる仕組みで、クライアントとサーバーを双方向の構造にする
- **Roots**：クライアントがサーバーへ「ここまでが作業可能な範囲」と伝えるワークスペース境界の情報
- **Elicitation**：サーバーがツールの実行中に、構造化された形式でユーザーへ追加入力を求められる機能

この6つの区別が重要なのは、**誰が呼び出し／提供を決めるのか**という権限が異なるからだ。Toolはモデルの自律的な判断で実行されるため、誤った呼び出しのリスクがある。Resourceはアプリがキュレーションするため、比較的安全だ。Promptはユーザーが明示的にトリガーするため、最も制御しやすい。Sampling／Roots／Elicitationはクライアント側の制御により、権限モデルをさらに精緻にする。

転送方式は**ちょうど2つ**だけだ。これは意図的な設計であり、エコシステムが数十もの競合プロトコルへ分裂しないようにするためである。一つは**stdio**で、MCPサーバーをローカルのサブプロセスとして実行し、標準入出力で通信する方式だ。ファイルシステムやGitなど、ローカルで動くツールに適している。もう一つは**Streamable HTTP**で、HTTP POST上にSSEストリーミングを重ね、双方向に近い通信を実現する方式だ。リモートサーバー、OAuth認証、複数クライアント接続、クラウドデプロイなど、ネットワーク越しのシナリオに適している。

ここでSSE（Server-Sent Events）とは、HTTP接続を通じてサーバーからクライアントへ一方向にデータをpushするW3C標準である。media typeは`text/event-stream`で、JavaScriptからは`EventSource` APIでアクセスする。WebSocketと違って一方向だが、HTTP上で動作するため、プロキシやファイアウォールとの相性がよい。Streamable HTTPは、このSSEを使って双方向通信を再現している。**2025年3月26日**のspec（version `2025-03-26`）で導入され、従来のHTTP+SSE転送を置き換えた。


### LLMがMCPツールを呼び出す流れ

プリミティブと転送方式を確認したので、次は**実際にLLMがMCPツールをどのように発見し、呼び出すのか**を追ってみよう。

MCPセッションが始まると、次の順序でハンドシェイクが行われる。

- **クライアント → サーバー**：`initialize`リクエスト（対応するプロトコルバージョンとクライアントcapabilitiesを渡す）
- **サーバー → クライアント**：`initialize`レスポンス（サーバーcapabilitiesと、任意の`instructions`フィールド）
- **クライアント → サーバー**：`notifications/initialized`通知
- **クライアント → サーバー**：`tools/list`リクエスト → 利用可能なツール一覧を受信
- （以後）LLMがツールを呼び出すと判断 → クライアントが`tools/call`を送信 → 結果を受信

ここで見落とされがちな点が一つある。**`initialize`レスポンスの`instructions`フィールド**だ。サーバーがこのフィールドにテキストを入れて送ると、その内容は事実上、LLMのシステムプロンプトへ追加される。つまり、「これらのツールをどのように使うべきか」というガイドをMCPサーバーがLLMへ直接注入できる正式なスロットが、specに存在する。（後述するTool Poisoning Attackが危険である理由の一つが、まさにこのスロットの存在だ。）

では、tool定義そのものはどのようにLLMの視野へ入るのだろうか。MCPのtool定義は、次のようなJSON Schema形式である。

```json
{
  "name": "get_weather",
  "description": "Get current weather information for a location",
  "inputSchema": {
    "type": "object",
    "properties": { "location": { "type": "string" } },
    "required": ["location"]
  }
}
```

クライアントは`tools/list`で受け取ったこの一覧を、**Anthropic Messages APIの`tools`パラメータ**または**OpenAI function callingの`tools`パラメータ**へ変換し、LLM APIの呼び出し時に一緒に渡す。Anthropicの場合、toolパラメータが渡されると、**special system promptが自動的に追加**され、モデルがtoolの呼び出し方を理解できるようになる。（Claude 4.xでは`tool_choice: auto`の場合、このプロンプトだけで346トークンが加わる。）

LLMがツールを呼び出す必要があると判断すると、レスポンス内に`tool_use`ブロック（`{"type": "tool_use", "name": ..., "input": ...}`）が挿入され、レスポンスの`stop_reason`は`tool_use`で終わる。クライアントはこれを受け取り、実際のMCPサーバーへ`tools/call`を送信する。結果を受け取ると、次のuserメッセージの`tool_result`ブロックに入れて、再びLLMへ送る。**`stop_reason`が`tool_use`以外の値（`end_turn`、`max_tokens`など）に変わるまで、このループが繰り返される。** 私たちが一般に「エージェントが働く」と呼ぶ動作は、実際にはこの呼び出し・結果・呼び出しのループが連続することに近い。

では、MCPは単純なfunction callingと何が違うのだろうか。4つの違いにまとめられる。

- **動的な発見**：ビルド時点ではツール一覧を知らず、ランタイムに`tools/list`で取得する。`notifications/tools/list_changed`により、セッション中の変更も可能
- **Stateful session**：lifecycle phaseが定義されているため（initialize → operation → shutdown）、適切に終了できる
- **Tool以外のプリミティブ**：Prompt・Resource・Sampling・Roots・Elicitationまで、capability negotiationを通じて公開する
- **双方向性**：サーバーから逆にクライアントのLLMをsamplingで呼び出すことも、spec上は可能

（この違いから、MCPは「エージェント向けfunction callingの一般化された標準」と呼ばれることもある。）


### では、MCPは安全なのか

ここで確認しておくべきことがある。**MCPが権限付与を自動化するわけではない。** どのサーバーを信頼できるのか、どのツールにどのような副作用があるのか、そのツールが時間の経過後も同じ動作をするのかは、すべてユーザー自身が判断しなければならない。

代表的な2つの攻撃を知っておくとよい。

- **Tool Poisoning Attack（TPA）**：Invariant Labsが2025年4月に命名し、PoCを公開した攻撃だ。MCPサーバーのツール説明（description）に悪意ある指示を隠すと、モデルはそれをユーザーの指示と誤認して従う。ユーザーには見えないが、モデルには見えるテキストである。

- **Rug Pull**（Silent Redefinition）：Simon Willisonが2025年4月9日の公開分析で扱った概念だ。ツールは最初、正当なものとして始まる。ユーザーが確認・承認し、ワークフローへ統合する。数週間後、ツール定義がひそかに変更され、悪意ある指示が含まれるようになる。ユーザーは再承認を求められないため、動作はそのまま変わってしまう。

セキュリティに関する事件が、**2026年4月15日**に起きた。OX Securityは、主要なMCP SDK（Python・TypeScript・Java・Rust）すべてに影響するシステム的なRCE脆弱性を公開した。1億5千万回以上のダウンロード、約7,000の公開サーバー、約20万の脆弱と推定されるデプロイが影響範囲に入った。14件以上のCVEが割り当てられ、Cursor・VS Code・Windsurf・Claude Code・Gemini-CLIはいずれも影響を受けた。

その後、どのような対応が取られたのだろうか。Anthropicは、**プロトコルのアーキテクチャ自体は変更しなかった**。代わりに`SECURITY.md`を更新し、stdioアダプターを使用する際の入力sanitizationは、下流の開発者が責任を負うことを明記した。specでは、**2025-06-18改訂でOAuth 2.1とRFC 8707 Resource Indicatorsを必須化**し、トークン再利用攻撃を防いだ。さらに、**2025-11-25改訂ではincremental scope consent**（必要な最小権限だけを段階的にユーザーが承認する方式）を導入した。それでも、2026年1〜2月だけでMCP関連のCVEが30件以上発行され、そのうち**command injectionが43%**を占めたという統計もある。**セキュリティは、今なお進行中の課題なのだ。**


## まとめ

まとめると、MCPはfunction callingを置き換えるものではなく、その上に載った標準だ。モデルがツールを呼び出す方法は依然として`tools`パラメータと`tool_use`ループであり、MCPが加えるのは、ツール一覧を実行時にやり取りする方法、セッションのライフサイクル、Tool以外のプリミティブ、そしてサーバーからクライアントへ向かう呼び出しだ。ツール定義が実行時にやり取りされるからこそ、その定義を汚染したり、こっそり書き換えたりする攻撃も同じところから生まれる。

MCPがエージェントに何をできるようにするかの問題なら、何を知らせるかは`CLAUDE.md`や`AGENTS.md`のようなコンテキストファイルの問題だ。それらのファイルがエージェントにどのように読まれ、どこまで守られるのかは[AIエージェントツール](/260529)で扱う。


## 参考資料

:::ref
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
:::
