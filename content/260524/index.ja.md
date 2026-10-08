---
emoji: 🔌
title: "MCPとfunction calling"
seoTitle: "MCPはfunction callingと何が違うのか: プロトコル構造と呼び出しの流れ"
date: "2026-05-24"
updatedAt: "2026-10-08"
locale: ja
translationOf: '260524'
sourceHash: 2293f3e018d512db6374f7146c812d706079a5d30ab86c875e6a6dd19b522ea4
categories: AI 開発ツール Claude MCP CodeGraph
description: "MCPがfunction callingとどう違うのかをプロトコル構造から整理する。6つのプリミティブ、stdioとStreamable HTTP、tools/listからtool_useループまでの流れ、Tool Poisoningなどのセキュリティ問題を扱う。"
keywords: "MCP, Model Context Protocol, MCP function calling 違い, MCP プリミティブ, tools/list, Streamable HTTP, Tool Poisoning Attack, MCP セキュリティ"
---

今回の記事では、**MCP（Model Context Protocol）がfunction callingと何が違うのか**について話してみたい。

Claude CodeやCursorにMCPサーバーをつないで使ってはいるものの、それがLLM APIのfunction callingとどこで分かれるのかを説明しにくかった開発者に向けた記事だ。先に答えを書くと、MCPはfunction callingを置き換えない。ホストアプリケーションがMCPサーバーから受け取ったツール一覧をfunction callingの`tools`パラメータに変換して渡し、モデルが選んだ呼び出しを再びMCPサーバーへ渡す。最後まで読めば、その上にMCPが加える4つの違いがプロトコルのどの部分から来ているのか、2026-07-28改訂版の後も残る違いは何か、そしてその構造がどのような攻撃面を開くのかがわかる。

筆者はフロントエンド開発者として日常的にClaudeを活用しているが、MCPサーバーを一つ追加するたびに、これらのツールがどのような仕組みでモデルの視野に入るのかが毎回あやふやだった。


## MCP（Model Context Protocol）

MCP（Model Context Protocol）は「**エージェントに何ができるようにするか**」という問題を解く。

少し具体的に説明しよう。AIエージェントがSlackへメッセージを送るには、Slack APIを呼び出せなければならない。GitHub Issueを作るには、GitHub APIを呼び出せなければならない。Postgresへクエリするには、DB接続を扱えなければならない。こうした外部システムとの統合を、**一つの標準プロトコルにまとめたもの**がMCPだ。（どのクライアントも、どのサーバーにも、同じインターフェースで接続できるという意味だ。）

MCPはAnthropicが**2024年11月25日**に初めて公開したオープン標準だ。そして**2025年12月9日**、Anthropic・Block・OpenAIの3社は共同創設者として、MCP仕様をLinux Foundation傘下の**Agentic AI Foundation**（AAIF）へ寄贈した。Google・Microsoft・AWS・Cloudflare・Bloombergがプラチナメンバーとして参加した。（2025年12月の寄贈時点で、SDKは月間9,700万回以上ダウンロードされ、1万以上の公開MCPサーバーが稼働していた。）

MCPはJSON-RPC上に構築されたプロトコルだ。[JSON-RPC 2.0](https://www.jsonrpc.org/specification)は、JSONをワイヤーフォーマットとして使うstatelessで軽量なRPC（Remote Procedure Call）プロトコルである。トランスポート層に依存せず、HTTP・TCP・標準入出力のいずれでも動作する。notification（応答のない呼び出し）とbatch呼び出しも定義しているが、MCPは[2025-06-18改訂版](https://modelcontextprotocol.io/specification/2025-06-18/changelog)でbatchを外した。この記事は2025-11-25改訂版を基準に説明する。この版のMCPは、接続ごとにセッションを張るstatefulなプロトコルだ。その後の改訂版で何が変わったのかは、呼び出しの流れを見てから扱う。


### プロトコルの内部

2025-11-25仕様の概要は、クライアントとサーバーがやり取りする機能を6つのプリミティブ（primitive）に分けている。ここでいうプリミティブは、JavaScriptのプリミティブ型（stringやnumberなど）とは関係がなく、プロトコルが定めた基本的なやり取りの種類を指す。サーバー側の3つとクライアント側のSampling・Rootsは最初の改訂版（2024-11-05）からあり、Elicitationは2025-06-18改訂版で加わった。

**サーバー側プリミティブ**

- **Tool**（model-controlled）：モデルが呼び出すかどうかを自ら判断して実行する操作。この操作は副作用（side effect）を持つことがある
- **Resource**（application-controlled）：URIで識別されるデータ。仕様には内容を読み出す`resources/read`だけがあり、書き込むメソッドはない。どのリソースを公開するかはホストアプリケーションが決める
- **Prompt**（user-controlled）：ユーザーがスラッシュコマンドなどで明示的にトリガーする、再利用可能なテンプレート

**クライアント側プリミティブ**

- **Sampling**：サーバーから逆にクライアントのLLMへcompletionを要求できる仕組みで、クライアントとサーバーを双方向の構造にする。ツールの実行中に文章の生成が必要になったサーバーが、自前のAPIキーなしでクライアントの使うモデルを借りるための仕組みだ。2026-07-28改訂版では削除予定のdeprecatedになった
- **Roots**：クライアントがサーバーへ「ここまでが作業可能な範囲」と伝えるワークスペース境界の情報
- **Elicitation**：サーバーがツールの実行中に、構造化された形式でユーザーへ追加入力を求められる機能

この区別が重要なのは、**誰が呼び出しや提供を決めるのか**が異なるからだ。Toolはモデルの判断で実行されるため誤った呼び出しのリスクがあり、Promptはユーザーが明示的に選ぶ。Resourceはアプリが選ぶのが基本だが、仕様はヒューリスティクスやモデルの選択による自動的な取り込みを行う実装も認めている。そのため、Resourceが常にToolより安全だとは言えない。クライアント側の3つは向きが逆だ。サーバーが要求し、応じるかどうかはクライアントが決める。

[標準の転送方式](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)は2つで、仕様はそれ以外のカスタム転送も認めている（MAY）。一つは**stdio**で、MCPサーバーをローカルのサブプロセスとして実行し、標準入出力で通信する方式だ。ファイルシステムやGitなど、ローカルで動くツールに適している。もう一つは**Streamable HTTP**で、HTTP POST上にSSEストリーミングを重ね、双方向に近い通信を実現する方式だ。リモートサーバー、OAuth認証、複数クライアント接続、クラウドデプロイなど、ネットワーク越しのシナリオに適している。

ここでSSE（Server-Sent Events）とは、HTTP接続を通じてサーバーからクライアントへ一方向にデータをpushする方式で、現在は[WHATWG HTML標準](https://html.spec.whatwg.org/multipage/server-sent-events.html)に定義されている。media typeは`text/event-stream`で、JavaScriptからは`EventSource` APIでアクセスする。WebSocketと違って一方向だが、HTTP上で動作するため、プロキシやファイアウォールとの相性がよい。Streamable HTTPは、このSSEを使って双方向通信を再現している。**2025年3月26日**のspec（version `2025-03-26`）で導入され、従来のHTTP+SSE転送を置き換えた。


### LLMがMCPツールを呼び出す流れ

プリミティブと転送方式を確認したので、次は**実際にLLMがMCPツールをどのように発見し、呼び出すのか**を追ってみよう。

2025-11-25改訂版では、接続が始まると次の順序でハンドシェイクが行われる。2026-10-08時点で、TypeScript SDKの1.32.1とv2系の2.3.1も、既定の設定ではこの順序で動く。

- **クライアント → サーバー**：`initialize`リクエスト（対応するプロトコルバージョンとクライアントcapabilitiesを渡す）
- **サーバー → クライアント**：`initialize`レスポンス（サーバーcapabilitiesと、任意の`instructions`フィールド）
- **クライアント → サーバー**：`notifications/initialized`通知
- **クライアント → サーバー**：`tools/list`リクエスト → 利用可能なツール一覧を受信
- （以後）LLMがツールを呼び出すと判断 → クライアントが`tools/call`を送信 → 結果を受信

ここで見落とされがちなのが、**`initialize`レスポンスの`instructions`フィールド**だ。サーバーがツールの使い方をテキストで書いて送る場所だが、[仕様スキーマのコメント](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts)は、この内容をシステムプロンプトに追加してもよい（MAY）と書いているだけだ。追加するかどうかはホストが決める。下の例では、TypeScript SDK 1.32.1はこの値を`getInstructions()`で取り出せるようにするだけで、モデル側へは渡さない。筆者は、この枠も後で扱うTool Poisoningと同じ性質の場所だと見ている。サーバーが書いたテキストがモデルの前に置かれうるからだ。

では、tool定義そのものはどのようにLLMの視野に入るのか。MCPのtool定義は、次のようなJSON Schemaの形をしている。

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

ホストは`tools/list`で受け取ったこの一覧を、**Anthropic Messages APIの`tools`パラメータ**または**OpenAI function callingの`tools`パラメータ**へ変換し、LLM APIの呼び出し時に一緒に渡す。Anthropicの場合、toolパラメータが渡されると[special system promptが自動的に追加](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)され、モデルがtoolの呼び出し方を理解できるようになる。その長さはモデルによって異なる。2026-10-08に見たドキュメントの表では、`tool_choice: auto`の場合、現行モデルで286〜675トークンだった。

LLMがツールを呼び出す必要があると判断すると、レスポンス内に`tool_use`ブロック（`{"type": "tool_use", "name": ..., "input": ...}`）が挿入され、レスポンスの`stop_reason`は`tool_use`で終わる。ホストはこれを受け取り、実際のMCPサーバーへ`tools/call`を送信する。結果を受け取ると、次のuserメッセージの`tool_result`ブロックに入れて、再びLLMへ送る。**`stop_reason`が`tool_use`以外の値（`end_turn`、`max_tokens`など）に変わるまで、このループが繰り返される。** 私たちが一般に「エージェントが働く」と呼ぶ動作は、実際にはこの呼び出し・結果・呼び出しのループが連続することに近い。

図にすると、モデルとMCPサーバーの間には線がない。モデルは`tools`で受け取った定義だけを見て、MCPサーバーはモデルではなくホストからリクエストを受ける。2つのプロトコルをつなぐのは真ん中のホストだ。

![左のLLM APIと中央のホストの間をtools、tool_use、tool_resultの矢印が行き来し、ホストと右のMCPサーバーの間をtools/list、tools/callの矢印が行き来する。LLM APIとMCPサーバーの間には線がない](1.png?w=720)

この変換が実際にどれほど短いのかを動かして確かめた。2026-10-08にNode v24.16.0、`@modelcontextprotocol/sdk` 1.32.1、`zod` 4.6.5で実行した。転送はstdioではなく、同じプロセス内でサーバーとクライアントをつなぐ`InMemoryTransport`で、LLMは呼び出していない。`tool_use`ブロックはAnthropicのドキュメントの形どおりに手で作った。

```js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";

// MCP 서버: 도구 하나와 instructions 를 둔다
const server = new McpServer(
  { name: "weather", version: "1.0.0" },
  { instructions: "Use get_weather for current conditions only." }
);
server.registerTool(
  "get_weather",
  { description: "Get current weather information for a location", inputSchema: { location: z.string() } },
  async ({ location }) => ({ content: [{ type: "text", text: `${location}: 15C, partly cloudy` }] })
);

// 호스트: 같은 프로세스 안에서 서버와 잇고, 클라이언트가 보내는 메서드 이름을 찍는다
const [clientT, serverT] = InMemoryTransport.createLinkedPair();
const send = clientT.send.bind(clientT);
clientT.send = (m) => { console.log("C->S", m.method, m.params?.protocolVersion ?? ""); return send(m); };
await server.connect(serverT);
const client = new Client({ name: "demo-host", version: "1.0.0" });
await client.connect(clientT);
console.log("instructions:", client.getInstructions());

// 1. tools/list 결과를 LLM API 의 tools 파라미터 모양으로 바꾼다
const { tools } = await client.listTools();
const anthropicTools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
const openaiTools = tools.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.inputSchema }));
console.log("anthropic:", JSON.stringify(anthropicTools[0]));
console.log("openai:", JSON.stringify(openaiTools[0]));

// 2. 모델이 이런 tool_use 블록을 돌려줬다고 가정한다. input 이 그대로 tools/call 의 arguments 가 된다
const toolUse = { type: "tool_use", id: "toolu_demo", name: "get_weather", input: { location: "Seoul" } };
const result = await client.callTool({ name: toolUse.name, arguments: toolUse.input });
console.log("tool_result:", JSON.stringify({ type: "tool_result", tool_use_id: toolUse.id, content: result.content }));
await client.close();
```

コードの途中で`clientT.send`を上書きしている2行は、クライアントが送るメッセージのメソッド名を表示するためだけに入れたもので、変換には関わらない。`node post-demo.mjs`の出力は次のとおりだ。

```text
C->S initialize 2025-11-25
C->S notifications/initialized 
instructions: Use get_weather for current conditions only.
C->S tools/list 
anthropic: {"name":"get_weather","description":"Get current weather information for a location","input_schema":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"],"$schema":"http://json-schema.org/draft-07/schema#"}}
openai: {"type":"function","name":"get_weather","description":"Get current weather information for a location","parameters":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"],"$schema":"http://json-schema.org/draft-07/schema#"}}
C->S tools/call 
tool_result: {"type":"tool_result","tool_use_id":"toolu_demo","content":[{"type":"text","text":"Seoul: 15C, partly cloudy"}]}
```

変換はフィールド名を変えるだけだ。MCPの`inputSchema`がAnthropicでは`input_schema`、OpenAIでは`parameters`になる。SDKがスキーマに`$schema`を付け足すことも出力からわかる。逆方向も短い。Anthropicの`tool_use.input`はオブジェクトなので、そのまま`tools/call`の`arguments`になる。上のOpenAI側の形はResponses APIの形式だ。OpenAIが返す呼び出しの`arguments`は[JSON文字列](https://developers.openai.com/api/docs/guides/function-calling)なので、渡す前に`JSON.parse`を一度通す必要がある。上のコードはAnthropic形式の`tool_use`ブロックしか作っていないので、このparseの段階は出力に現れない。


### MCPが加える4つのもの

では、MCPはfunction callingに何を加えるのか。2025-11-25改訂版を基準にすると4つある。

- **動的な発見**：ビルド時にはツール一覧を知らず、実行時に`tools/list`で取得する。サーバーは`notifications/tools/list_changed`で、接続中に一覧が変わったことを知らせられる
- **Stateful session**：`initialize`で接続を確立し、その中でリクエストがやり取りされる。専用の終了メッセージはなく、転送を閉じることがそのまま終了になる
- **Tool以外のプリミティブ**：Resource・Prompt・Sampling・Roots・Elicitationをcapability negotiationで公開する。capability negotiationとは、`initialize`で双方が対応する機能を互いに知らせる段階だ
- **双方向性**：サーバーがSamplingを使って、クライアントのLLMへ逆にcompletionを要求できる（2026-07-28改訂版でdeprecated）

ところが2026-10-08時点で、公式サイトでlatestとして開くのは[2026-07-28改訂版](https://modelcontextprotocol.io/specification/2026-07-28/changelog)で、ここでこのリストの半分が変わった。まず、`initialize`と`notifications/initialized`からなるハンドシェイクとプロトコルレベルのセッションがなくなった。代わりに、すべてのリクエストが`_meta`にプロトコルバージョンとクライアントcapabilitiesを載せる。このフィールドは、メッセージ本来の引数とは別にメタデータを付けるためにMCPが予約している場所だ。サーバーは`server/discover`を必ず実装しなければならない（MUST）。クライアントがほかのリクエストより先に呼び出し、サーバーが対応するプロトコルバージョン、capabilities、サーバー情報を受け取るRPCだ。

サーバーが先に送っていたリクエストは、Multi Round-Trip Requests（MRTR）というパターンに置き換えられた。サーバーは別途リクエストを送る代わりに、追加の入力が必要だという中間結果（`input_required`）を返し、クライアントがその入力を埋めて元のリクエストを送り直す方式だ。

SamplingとRootsはLoggingとともにdeprecatedになった。仕様に残っていて動作もするが新しい実装は採用すべきでないという意味で、仕様はSamplingの代わりにLLMプロバイダーのAPIへ直接つなぐよう勧めている。

ただし、SDKの既定の動作はまだ古い方式だ。TypeScript SDK 1.32.1は最新バージョン定数が`2025-11-25`なので2026-07-28改訂版を知らず、2.3.1はこの改訂版に対応しているが、バージョン交渉の既定値が`legacy`だ。上の出力の1行目`initialize 2025-11-25`がその結果である。

すると、4つのうち残るのは動的な発見とTool以外のプリミティブ（Resource、Prompt、Elicitation）だ。動的な発見も形が少し変わり、一覧の変更通知は`subscriptions/listen`ストリームにopt-inしたクライアントだけが受け取る。結局、MCPがfunction callingと分かれるところは、セッションや双方向性よりも、**ツール一覧とコンテキストを実行時にやり取りする契約**にある。


### APIがMCPクライアントになるとき

この契約のうちどこまでがモデルに届くのかは、Anthropicの[MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)が示している。Messages APIがリモートのMCPサーバーに直接つなぐ機能だが、ドキュメントのLimitationsは、MCP仕様の機能のうち"only tool calls are currently supported"と書き、"Local STDIO servers cannot be connected directly"と書いている。同じドキュメントは、ローカルサーバーやMCPのprompt、resourceが必要なら、MCP SDKで接続を自分で管理しながらAnthropic SDKの変換helperを使うよう案内している。

つまり、function callingのレイヤーでMCPを消費するとToolだけが残る。ResourceとPromptは、それを画面やコンテキストへ運ぶホストがあって初めて意味を持つ。OpenAIもfunction callingガイドで、MCPサーバーの機能をbuilt-in toolとして使う方法を紹介している。OpenAIのRemote MCPガイドはツール一覧の取得と呼び出しの方法だけを説明し、ResourceやPromptに対応しているかどうかは書いていない。


### 動的な発見が開く攻撃面

**MCPは権限付与を自動化しない。** [tool仕様](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)は、tool呼び出しを拒否できる人間がループの中にいるべきだと勧め（SHOULD）、信頼できるサーバーからのものでない限りtool annotationを信頼しないよう求めている（MUST）。どのサーバーを信頼するか、そのツールが時間が経っても同じ動作をするかは、ホストとユーザーが受け持つ。

代表的な2つの攻撃は、どちらもツール定義が実行時にやり取りされることから生まれる。

- **Tool Poisoning Attack（TPA）**：[Invariant Labs](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)が2025年4月に命名し、PoCを公開した攻撃だ。MCPサーバーのツール説明（description）に悪意ある指示を隠すと、モデルはそれをユーザーの指示と誤認して従う。ユーザーには見えないが、モデルには見えるテキストである。

- **Rug Pull**（Silent Redefinition）：ユーザーが承認した後に、サーバーがツール定義を変える攻撃だ。Invariant Labsが同じ記事で先に説明しており、Silent Redefinitionという名前はElena Crossの記事に由来し、[Simon Willison](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)が2025年4月9日にそれを引用してまとめた。ツールは最初、正当なものとして始まる。ユーザーが確認・承認し、ワークフローへ統合する。数週間後、ツール定義がひそかに変更され、悪意ある指示が含まれるようになる。ユーザーは再承認を求められないため、動作はそのまま変わってしまう。

Rug Pullが起きる場所は、動的な発見を可能にした`notifications/tools/list_changed`と同じだ。この名前は2025-11-25改訂版のもので、2026-07-28改訂版では先に見たとおり、opt-inしたクライアントだけがこの通知を受け取る。仕様は一覧が変わったことを知らせる方法を定めるだけで、変わった定義をユーザーに改めて見せることまでは求めていない。Willisonは、MCPクライアントが最初にツール説明をユーザーに見せ、説明が変わったら警告すべきだと書いている。変更後に再承認を取るのは、仕様ではなくホストの役目だ。


## まとめ

まとめると、MCPはfunction callingを置き換えるものではなく、その上に載った標準だ。モデルがツールを呼び出す方法は依然として`tools`パラメータと`tool_use`ループであり、2つのプロトコルの間はホストが翻訳する。2025-11-25改訂版でMCPが加えたのは、動的な発見、stateful session、Tool以外のプリミティブ、そしてサーバーからクライアントへ向かう呼び出しだった。2026-07-28改訂版でセッションがなくなりSamplingがdeprecatedになると、残るのはツール一覧とコンテキストを実行時にやり取りする契約だ。その契約があるからこそ、ツール定義を汚染したり、こっそり書き換えたりする攻撃も同じところから生まれる。MCPサーバーをもう一つつなぐときは、そのサーバーが何をできるのかとあわせて、定義が変わったときにホストが知らせてくれるかどうかも確かめてみてほしい。

MCPがエージェントに何をできるようにするかの問題なら、何を知らせるかは`CLAUDE.md`や`AGENTS.md`のようなコンテキストファイルの問題だ。それらのファイルがエージェントにどのように読まれ、どこまで守られるのかは[コンテキストファイル](/260529)で扱う。


## 参考資料

:::ref
- [docs] [MCP Specification 2025-11-25, Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [docs] [MCP Specification 2026-07-28, Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [docs] [OpenAI, Remote MCP](https://developers.openai.com/api/docs/guides/tools-remote-mcp)
:::
