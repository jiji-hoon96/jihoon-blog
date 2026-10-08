---
emoji: 🔎
title: "コードインテリジェンスの4つの階層"
seoTitle: "AIコーディングエージェントのコード探索: Repomix、Aider、CodeGraph、Serena比較"
date: "2026-05-26"
updatedAt: "2026-10-08"
locale: ja
translationOf: '260526'
sourceHash: 304a68bf926e1e4a57305879af694146757f66c9c9fc0156071532ede8230aff
categories: AI 開発ツール Claude MCP CodeGraph
description: "AIコーディングエージェントが関連コードを探すコストを減らすツールを4つの階層に分けて比較する。Repomixのようなコンテキストパッキング、Aiderのtree-sitterリポジトリマップ、CodeGraphのナレッジグラフ、SerenaのようなLSPベースのツールを整理する。"
keywords: "コードインテリジェンス, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, AIコーディングエージェント トークン削減"
---

今回の投稿では、**AIコーディングエージェントが関連コードを探すコストを減らすツール同士が、互いに何が違うのか**について話してみようと思う。

大きなコードベースでエージェントがgrepとファイル読み込みを繰り返してトークンを使うのを見て、Repomix、CodeGraph、Serenaのようなツールのうちどれを組み込むべきか悩んでいる開発者に向けた記事だ。これらのツールはコードをどれだけ深く理解するかによって、context packing、tree-sitter repo map、ナレッジグラフ、LSPの4つの階層に分かれ、階層ごとに探索コストを減らす箇所が異なる。ナレッジグラフは開発元のベンチマークを、残りの3つの階層はこのブログのリポジトリの `src/` で直接測った結果を載せる。

`codegraph`がGitHub Trendingに載ったのを見て真似してインストールしてみて以来、筆者は新しいツールを見るたびに、それがどんな原理でトークンを節約しているのかが気になっていた。この記事に出てくるツールの多くも、筆者が普段weekly単位でTypeScriptとPythonに絞って眺めているGitHub Trendingで初めて知ったものだ。


## コードインテリジェンスツール

エージェントはコードを直す前に、まず関連コードがどこにあるかを探す。grepで探し、ファイルを読み、絞り込み、またgrepするループだ。後で見るCodeGraphのベンチマークでは、ツールなしで答えた側は質問1つにtool callを最大43回使った。コードインテリジェンスツールは、この探索コストを減らそうとする試みである。

ただし、「コスト」という言葉が指すものは1つではない。モデルが処理したトークン、tool callの回数、そして作業が終わった後もcontext windowに残っているトークンは、それぞれ別々に動く。この記事では、各階層がこの3つのうち何を減らすのかを見る。

筆者はツールがコードをどれだけ深く理解するかを基準に、これらの試みを以下の4つの階層(tier)に分けて捉えている。業界で決まった分類はなく、この区分は筆者が整理したものだ。筆者が直接測った値はすべてこのリポジトリのコミット `36e5cfa` で2026-10-08に得たもので、トークンはtiktokenの `o200k_base` で数えた。Claudeのトークナイザーとは値が異なるので、絶対値よりも比較に使う。


### コンテキストパッキング

最も単純な解決策は、「**全部を1つのcontext windowに入れてしまおう**」という発想だ。グラフも作らず、インデックスも作らない。リポジトリ全体をテキストの塊としてシリアライズし、モデルに丸ごと渡す。

代表的なツールが**Repomix**だ。デフォルトの出力形式はXMLで、READMEはAnthropicのXMLタグに関するドキュメントへのリンクを載せている。CLI、Web、ブラウザ拡張、MCPサーバーまで揃っている。

**GitIngest**は摩擦ゼロの使いやすさで知られている。GitHubのURLで `github.com` を `gitingest.com` に1語だけ置き換えると、そのリポジトリ全体が1枚のテキストページに変換される。(例: `github.com/facebook/react` → `gitingest.com/facebook/react`。) ブラウザのアドレスバーで単語を1つ変えるだけなので、別途インストールする必要もない。1回きりの素早い探索に特化している。

**code2prompt**(Mufeed VH作)はRustベースのCLIで、テンプレートシステムによるカスタマイズに強みがある。

**rtk**(`rtk-ai/rtk`)は少し方向が違う。上のツールがリポジトリ全体を一度にパッキングするのに対し、rtkはエージェントが実行したCLIコマンドの出力を圧縮する。Rustで作られた単一バイナリで、Claude Code、Cursor、Copilot、Gemini CLI、Codexなど複数のエージェントのhookに登録され、エージェントが `git status` を呼び出すと `rtk git status` に置き換えて実行する。100以上のコマンドにfiltering、grouping、truncation、deduplicationを適用する。このhookはBashのtool callにしかかからない。Claude Codeの `Read`、`Grep`、`Glob` はそのまま素通りする。

減る量は注意して読む必要がある。[rtkのREADME](https://github.com/rtk-ai/rtk/blob/8533612180c60efbcb5827c7db4e910aba096705/README.md#L66-L70)は、Bashの出力を最大90%減らすと書きつつ、それが請求額を90%減らすという意味ではないとすぐに付け加えている。コマンドの出力はモデルから見れば入力トークンの一部で、入力トークンは請求額の一部なので、段階ごとに薄まる。[公式サイト](https://www.rtk-ai.app/)が掲げる数字は、rtkが置き換えて実行したコマンド基準で平均56%だ。上のツールが入っていくテキストを減らすのだとすれば、rtkはtool callの結果として戻ってくるテキストを減らす。

この階層の限界は、**大きなリポジトリはトークン上限に引っかかる**ことだ。このブログの `src/` のファイル109個をパッキングするだけで94,596 tokensになる。Repomixはこの問題に `--compress` で答える。[README](https://github.com/yamadashy/repomix/blob/8d6429121e98ed178e4d3a975c2bdbbecc958c4a/README.md#L797-L831)によれば、Tree-sitterで関数とクラスのシグネチャを残し、実装の本体を捨てる。

```bash
# repomix 1.18.1, 이 리포 커밋 36e5cfa, 2026-10-08
npx -y repomix@1.18.1 src -o out.xml              # Total Tokens: 94,596 tokens
npx -y repomix@1.18.1 src --compress -o out.xml   # Total Tokens: 30,320 tokens
```

68%減った。コメントはそのまま残るので、JSDocが長い `visit-counter.ts` は1,642から約1,220 tokensへと26%しか減らなかった。圧縮版に残るのはファイルごとの構文で、誰が誰を呼ぶかといった関係はない。そのため、この階層と次の階層の境界は、構文を見るかどうかよりも、関係を問えるかどうかにある。


### tree-sitterリポジトリマップ

次の階層は、**tree-sitter**を活用してコードの構造を解析しつつ、別途インデックスサーバーは立ち上げない方式だ。

**AST**(Abstract Syntax Tree、抽象構文木)は、ソースコードの構造を木で表したデータ構造だ。コンパイラの構文解析の結果物で、括弧やセミコロンのような表面的な情報を捨て、変数、演算子、関数呼び出しのような要素だけをノードとして残す。ところが、この階層のツールが使うtree-sitterが作るのは**CST**(Concrete Syntax Tree)だ。[tree-sitter公式ドキュメント](https://tree-sitter.github.io/tree-sitter/)もconcrete syntax treeを作ると書いている。括弧や句読点までノードとして残した木で、以下のツールが扱うのもこの木だ。

**tree-sitter**は、オープンソースのパーサジェネレータであり、インクリメンタル(incremental)パースライブラリだ。[GitHubのcode navigation](https://docs.github.com/en/repositories/working-with-files/using-files/navigating-code-on-github)がtree-sitterを使っている。編集された部分だけを再パースするので、エディタで1行を直してもファイル全体を再パースせず、変わった部分の木だけを直す。この利点は、編集が絶えず起きるエディタのものだ。以下のAiderは、ファイルの更新時刻でキャッシュを持ち、変わっていないファイルを再パースしない。

ターミナルで使うAIペアプログラミングツール**Aider**が、このアプローチの代表例だ。Aiderはtree-sitterでファイルごとに関数、クラス、メソッドの定義と参照を抽出する。そしてファイルをノードとするグラフを作る。ファイルAがファイルBで定義された識別子を参照すると、AからBへエッジができる。

このグラフで重要なファイルを選ぶのに、AiderはPageRankを使う。PageRankは、リンクを多く、そして重く受けるノードほど高いスコアを与えるアルゴリズムだ。Aiderが使うのはその変種のpersonalized PageRankで、指定したノードの側へスコアを傾ける。こうして順位の高いファイルから、定義とシグネチャをトークン予算の分だけ入れる。

何が予算に入るかは、いまの会話によって変わる。Aiderの[`repomap.py`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L487-L525)では、エッジの重みは参照回数の平方根に倍率を掛けた値だ。会話に出た識別子は10倍、8文字以上のcamelCase、snake_case、kebab-caseの識別子も10倍だ。`_` で始まる識別子と、5つを超えるファイルで定義された識別子はそれぞれ0.1倍で、いまチャットに追加したファイルから出ていくエッジは50倍になる。チャットに追加したファイルと会話で言及したファイルは、PageRankのpersonalizationスコアも受け取る。

予算も固定値ではない。[Aiderのドキュメント](https://aider.chat/docs/repomap.html)は `--map-tokens` のデフォルトを1kと書いているが、[コード](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/models.py#L782-L789)はモデルの入力上限の1/8を1,024から4,096の間に切り詰める。そしてチャットにファイルがなければ `--map-multiplier-no-files`(デフォルト2)倍まで広げる。このリポジトリの `src/` で確かめた。実行した0.86.1と上でリンクしたコミットは、ランキングのコードが同じだ。

```bash
# aider-chat 0.86.1, 리포 루트에서 시작한다, 2026-10-08
mkdir /tmp/aidermap && cp -R src /tmp/aidermap/ && cd /tmp/aidermap && git init -q && git add -A && git commit -qm init
# 키는 더미 값이다. --show-repo-map 은 map 만 출력하고 LLM 을 부르지 않는다
export OPENAI_API_KEY=dummy
AIDER="uvx --python 3.12 --from aider-chat==0.86.1 aider --no-check-update --analytics-disable --no-gitignore --model gpt-4o"
$AIDER --show-repo-map                                              # Repo-map: using 4096 tokens
$AIDER --map-tokens 1024 --show-repo-map                            # Repo-map: using 1024 tokens
$AIDER --map-tokens 1024 --show-repo-map src/lib/filter-posts.ts    # 이 파일을 채팅에 올린 상태
```

| 条件 | Aiderが決めた予算 | 出力されたmap | 含まれたファイル |
|---|---|---|---|
| デフォルト、チャットにファイルなし | 4,096 | 7,370 tokens | 61個 |
| `--map-tokens 1024`、チャットにファイルなし | 1,024 | 2,019 tokens | 27個 |
| `--map-tokens 1024`、`filter-posts.ts` をチャットに追加 | 1,024 | 983 tokens | 12個 |

gpt-4oの入力上限は128kなので1/8が4,096に切り詰められ、チャットが空なのでその2倍以内でmapが出た。ファイルを1つチャットに追加すると、mapは予算内に縮み、前の27個のうち10個だけが残った場所に `PostList.tsx` と `SearchModal.tsx` が新たに入った。repo mapはリポジトリの固定された要約ではなく、その瞬間の会話に合わせた抜粋だ。

**AFT**(`cortexkit/aft`)は、読み込みと編集をシンボル単位で行う。行番号ベースの編集は対象より上のコードが動いた瞬間に壊れるが、AFTのシンボルモードの編集は関数を名前で指定するので、その影響を受けない。

同じ階層でもう1つ触れておきたいツールがある。**ast-grep**(`ast-grep/ast-grep`)だ。tree-sitterベースの構造検索とrewriteを行うCLIで、テキストではなく構文木のノードをマッチングする。たとえば `console.log($A)` というパターンは、改行や空白がどうなっていても、引数1つで `console.log` を呼ぶ呼び出しをすべて捉える。捉えるのは同じ構文構造だ。`$A` の型や、`console` がどこから来た名前なのかは知らない。`ast-grep-mcp` サーバーもあるので、エージェントにテキストgrepの代わりに構造検索を使わせることができる。


### Knowledge Graph

3つ目の階層はさらに一歩進む。**事前にコードベース全体をパースしてナレッジグラフを作り、ディスクに保存**しておき、エージェントは保存しておいたグラフにクエリを投げる方式だ。最も話題になっている例が**CodeGraph**というツールである。

[CodeGraphのREADME](https://github.com/colbymchenry/codegraph/blob/b635dd467f0578926a9c01a37b9d28d2b26689f1/README.md)が説明する構造は単純だ。tree-sitterでコードをパースしてシンボル、エッジ、ファイル情報を抽出し、それをローカルのSQLiteデータベースに保存する。名前検索はSQLiteのFTS5インデックスで行う。エージェントはMCPを通じてこのグラフに問い合わせる。READMEが説明する手順にLLMは登場しない。そのため筆者は、この抽出は決定論的だと見ている。

ここで登場する**FTS5**(SQLite Full-Text Search 5)は、SQLiteの仮想テーブルの形で提供される全文検索拡張だ。[SQLiteのドキュメント](https://www.sqlite.org/fts5.html)によれば、3.9.0(2015-10-14)からamalgamationに含まれており、`CREATE VIRTUAL TABLE ... USING fts5(...)` でテーブルを作り、`MATCH` 演算子で問い合わせる。Elasticsearchのような別の検索エンジンを立てなくても、SQLiteファイル1つで全文検索インデックスを持てる。

いま使った**決定論的**(deterministic)という言葉は、同じコードを入れれば常に同じ結果が出るという意味だ。LLMがコードを要約してグラフを作ると、同じコードでも結果が変わりうるし、ハルシネーションが混ざる危険がある。一方、構文木を直接パースすれば言語の文法が定めた規則どおりにだけシンボルの関係を抽出するので、そうした解釈が入り込む余地がない。

ただし、決定論的であることと漏れがないことは別だ。同じREADMEは、慣習やリフレクションに頼るフレームワークのルート認識率をSpring 83.3%、ASP.NET 83.9%と記し、これを静的解析の限界(honest static-analysis ceiling)と呼んでいる。同じコードからは同じ結果が出るが、その結果から抜け落ちたエッジがありうる。

ベンチマークはCodeGraph自身が測ったものだ。同じREADMEの2026-08-05の再測定では、Claude Opus 4.8をheadlessで動かし、7つのオープンソースリポジトリにアーキテクチャの質問を1つずつ投げた。CodeGraph MCPを有効にした側が、平均コストを44%、処理トークンを62%、tool callを88%減らした。この再測定では、両側ともBashで `codegraph` CLIを呼べないようにブロックした。ブロックしないハーネスでは、ツールなしの側が28回中26回CLIを見つけて使っており、READMEは以前に発表した数値がこのブロックなしで出たものだと明かしている。

削減幅はリポジトリの大きさに従わなかった。ツールなしの側がtool callを28〜43回使った質問ではコストが57〜78%減り、7回で終わったGinではほぼ同じだった。ファイル約11k個のVS Codeが71%、約640個のExcalidrawが78%だった。質問に探索が多く必要なほど、得るものが大きかった。

READMEは逆方向の数字も記している。処理したトークンは減るが、複数ターンのセッションが終わった時点でcontext windowに残っているretrieval結果は、7つのリポジトリを通じてCodeGraph側が約80%多い。リポジトリごとの差は大きく、VS Code 1つでは67k対18k tokensで約3.7倍だった。一度に原文を密に返し、それがウィンドウにそのまま残るからだ。この階層はtool callと処理トークンを減らす代わりに、ウィンドウに残る量を増やす。

学術界にも同じ方向の研究がある。[GraphCoder](https://arxiv.org/abs/2406.07003)(ASE 2024)はcontrol flowとdata/control dependenceを統合したCode Context Graphを作り、[CodexGraph](https://aclanthology.org/2025.naacl-long.7/)(NAACL 2025)はLLMエージェントがグラフデータベースのクエリを自ら書いて実行するようにした。査読を経ていないプレプリントである[Prometheus](https://arxiv.org/abs/2507.19942)は、tree-sitterベースのナレッジグラフにworking memoryを付け、複数言語のイシュー解決に適用した。

**Cursor**は別の道を進み、その後方向を変えた。[2026年1月のCursorブログ](https://cursor.com/blog/secure-codebase-indexing)が説明したインデックスは、構文グラフではなく**ベクトル埋め込みベースのセマンティック検索**だった。ローカルでファイルをchunkに分け、Merkle treeのハッシュでサーバーと同期し、chunkを埋め込みに変えてセマンティック検索に使っていた。2026年7月、CursorのCommunity Support Engineerは[フォーラム](https://forum.cursor.com/t/what-do-you-think-about-cursor-removing-the-codebase-indexing-settings/165899)で「Semantic/embeddings indexing is being turned down in favor of grep-based retrieval」と答えた。同じスレッドで別のスタッフは、モデルがgrepをうまく使えるようになるにつれ、以前のセマンティック検索の経路はもう意味のある形で役立たなくなったと書いた。現在の[Cursorのドキュメント](https://cursor.com/docs/context/codebase-indexing)は、Instant Grepがインデックスをローカルで作って問い合わせ、コードベースの埋め込みを保存しないと記している。


### LSP

最後の階層は、**言語サーバーに直接依存**する方式だ。tree-sitterが「シンボルが存在すること」を知っているとすれば、LSPは「そのシンボルが何であるか」を知っている。

**[LSP](https://microsoft.github.io/language-server-protocol/)**(Language Server Protocol)は、エディタと言語解析ツール(コード補完、定義へ移動、参照の検索、リファクタリングなど)の間の通信を標準化した、JSON-RPCベースのオープンプロトコルだ。2016年に[Microsoft、Red Hat、Codenvyが協力を発表した](https://www.redhat.com/en/about/press-releases/red-hat-codenvy-and-microsoft-collaborate-language-server-protocol)。核となる発想は、「エディタごとに言語解析器を作り直すのではなく、言語ごとにサーバーを1つ置き、すべてのエディタがそのサーバーに問い合わせよう」というものだ。rust-analyzerやPythonのpyrightがLSPサーバーで、TypeScriptは独自プロトコルを使う `tsserver` をLSPで包んだtypescript-language-serverを使う。

**Serena**(`oraios/serena`)がこの階層に属するMCPサーバーだ。2026-10-08時点で30,093 starsで、リポジトリは2025年3月に作られた。Serenaの核となる発想は一行にまとめられる。**エージェントにコードをシンボル単位で見せよう。** 主なツールは `find_symbol`、`find_referencing_symbols`、`get_symbols_overview` などだ。バックエンドは2つのうち1つを選べる。デフォルトはLSPを実装した言語サーバー(無料/オープンソース)、もう1つはJetBrains IDEのコード解析を活用する有料プラグイン(無料トライアルあり)だ。

このリポジトリで測ってみると、差がどこから生まれるのかが見える。非公開記事を除外する `isHiddenPost`(`src/lib/filter-posts.ts:12`)の使用箇所を、2つの方法で探した。テキスト側はgrepだ。

```bash
# 커밋 36e5cfa, 2026-10-08. 이 글도 같은 이름을 담고 있어 content/ 는 뺐다
git grep -n isHiddenPost -- ':!content'   # 16줄, 파일 9개
```

LSP側では、typescript-language-serverが `textDocument/references` に答えるときに使うTypeScriptの `findReferences` APIを直接呼んだ。Serenaを起動して測ったわけではない。LSPの参照検索は、位置(ファイルと行、列)で問い合わせる。そのためSerenaの[`find_referencing_symbols`](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/tools/symbol_tools.py#L169-L172)も `name_path` と `relative_path` を一緒に受け取る。この例なら `find_referencing_symbols(name_path="isHiddenPost", relative_path="src/lib/filter-posts.ts")` になる。

```js
// 리포 루트에서 실행한다: node - < refs.cjs
const path = require('path')
const ts = require('typescript')
const cfg = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic() {} })
const service = ts.createLanguageService({
  getScriptFileNames: () => cfg.fileNames,
  getScriptVersion: () => '0',
  getScriptSnapshot: f => ts.sys.fileExists(f) ? ts.ScriptSnapshot.fromString(ts.sys.readFile(f)) : undefined,
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => cfg.options,
  getDefaultLibFileName: o => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
})
const file = 'src/lib/filter-posts.ts'
// 이름이 아니라 정의가 있는 위치(파일과 오프셋)로 묻는다
const pos = ts.sys.readFile(file).indexOf('isHiddenPost')
for (const group of service.findReferences(file, pos) ?? []) {
  for (const ref of group.references) {
    const { line } = service.getProgram().getSourceFile(ref.fileName).getLineAndCharacterOfPosition(ref.textSpan.start)
    console.log(`${path.relative(process.cwd(), ref.fileName)}:${line + 1}${ref.isDefinition ? ' (정의)' : ''}`)
  }
}
```

```text
$ node - < refs.cjs   # typescript 5.9.3, Node 24.16.0
src/lib/filter-posts.ts:12 (정의)
src/lib/filter-posts.ts:24
src/lib/post-navigation.ts:2
src/lib/post-navigation.ts:6
src/app/[lang]/[slug]/opengraph-image.tsx:7
src/app/[lang]/[slug]/opengraph-image.tsx:38
src/app/[lang]/[slug]/page.tsx:5
src/app/[lang]/[slug]/page.tsx:47
src/app/[lang]/[slug]/page.tsx:67
src/app/[lang]/[slug]/page.tsx:74
src/app/[lang]/[slug]/page.tsx:90
```

コードの位置は両側とも同じ11か所だった。この名前はリポジトリに1つしかないので、grepもコードの位置を取りこぼしたり余計に拾ったりしなかった。差は残りの5か所で生まれた。grepは `CLAUDE.md` やコマンドのドキュメント、そのスナップショットにある説明文5行も一緒に返した。

Serenaは参照ごとに[前後1行](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/repl/api/lsp_api.py#L367-L369)を付けて返す。そこで両側に同じ基準を当て、位置ごとに `file:line` と前後1行を付けたテキストのトークンを数えた。grepは定義のある行もマッチとして返すので、参照側も定義を含めて数えた。

```python
# 리포 루트에서 실행한다: python3 count.py (tiktoken 0.13.0)
import subprocess, tiktoken
enc = tiktoken.get_encoding("o200k_base")
def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.splitlines()
def tokens(locs):  # 위치마다 file:line 과 앞뒤 1줄을 붙여 센다
    total = 0
    for f, n in locs:
        lines = open(f).read().splitlines()
        total += len(enc.encode(f"{f}:{n}\n" + "\n".join(lines[max(0, n - 2):n + 1])))
    return total
grep = [(l.split(":")[0], int(l.split(":")[1])) for l in run("git grep -n isHiddenPost -- ':!content'")]
refs = [(l.rsplit(":", 1)[0], int(l.rsplit(":", 1)[1])) for l in (x.removesuffix(" (정의)") for x in run("node - < refs.cjs"))]
code = [x for x in grep if x[0].startswith("src/")]
print(f"grep {len(grep)}곳 {tokens(grep)} (코드 {len(code)}곳 {tokens(code)}) | 참조 {len(refs)}곳 {tokens(refs)}")
```

```text
$ python3 count.py
grep 16곳 1172 (코드 11곳 453) | 참조 11곳 453
```

| 方式 | 位置 | tokens |
|---|---|---|
| grep | 16か所(コード11、ドキュメント5) | 1,172(コード453、ドキュメント719) |
| findReferences(定義を含む) | 11か所 | 453 |

差の719 tokensはすべてドキュメント5か所から出た。このリポジトリでLSPが節約したのは、コードの位置を探すコストではなく、ノイズのマッチを読むコストだった。エージェントがgrepに引っかかったファイル9個を丸ごと読むなら、読む量は47,034 tokensで、そのうち43,318がドキュメント5個だ。これは上限だ。`CLAUDE.md` は実際のセッションではすでにcontextに載っていて、改めて読まない可能性が高い。`isLocale` のようなありふれた名前なら、コードの位置でも結果が分かれうる。

AiderはLSPを使わないので、関数とクラスのレベルの認識までにとどまる。[OpenCode](https://opencode.ai/docs/lsp/)はLSPサーバーをつなぎ、デフォルトで診断結果をエージェントにフィードバックする。定義、参照、hover、call hierarchyを問い合わせる `lsp` ツールは、[`OPENCODE_EXPERIMENTAL_LSP_TOOL=true`](https://opencode.ai/docs/tools/) のときだけ有効になる。いずれにせよ、言語ごとに良いLSPサーバーが必要だという条件が付く。


## まとめ

まとめると、4つの階層はコードをどれだけ深く理解するかで分かれ、減らすコストも異なる。context packingはコードをテキストとして渡し、`--compress` を付けても構文までしか残さず、入っていくトークンを減らす。tree-sitter repo mapはシンボルが存在することまでを知り、入っていくトークンに予算で上限を設け、その中を何で埋めるかはその瞬間の会話が決める。ナレッジグラフは関係をあらかじめ保存してtool callと処理トークンを減らすが、ベンダーの測定ではウィンドウに残る量がむしろ増えた。LSPはシンボルが何であるかまで知り、このリポジトリではgrepが一緒に引き連れてくるノイズのマッチを取り除いて処理するトークンを減らしたことが、削減のすべてだった。

だから筆者はツールを選ぶとき、階層の深さよりも、いまどのコストが問題なのかを先に見る。ウィンドウが小さくセッションが長いなら残る量を、往復が遅いならtool callの回数を、ドキュメントとコードが同じ名前を共有するリポジトリならノイズのマッチを見る。Cursorがセマンティック検索を外してgrepに戻ったことも、深い階層が常に良いわけではないというサインとして読める。

これらのツールがエージェントのコード探索コストを減らすものだとすれば、エージェントが最初から知っておくべきプロジェクトのルールをどのファイルにどれだけ書くかは、また別の問題だ。その話は[コンテキストファイル](/260529)で扱う。


## 参考資料

:::ref
- [repo] [cortexkit/aft](https://github.com/cortexkit/aft)
- [repo] [ast-grep/ast-grep](https://github.com/ast-grep/ast-grep)
- [repo] [ast-grep/ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp)
:::
