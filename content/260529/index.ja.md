---
emoji: 🧭
title: 'AIエージェントツール'
seoTitle: 'AIコーディングエージェントのツール地図 — mdファイル、MCP、コードインテリジェンス、GitHub Trending'
date: '2026-05-29'
locale: ja
translationOf: '260529'
sourceHash: dcdf13a2067a0ae15b501b063ecf0c65202580351b7df388dad34849f41e1c3c
categories: AI 開発ツール Claude MCP CodeGraph
description: 'Claudeを使ったフロントエンド開発で出会ったツールを、4つの視点から整理する。CLAUDE.md・AGENTS.md・SKILL.mdの違い、MCPの仕組みとSerena、CodeGraphなどコードインテリジェンスツールの動作原理、GitHub Trendingの読み方まで解説。'
keywords: 'CLAUDE.md, AGENTS.md, SKILL.md, MCP, Model Context Protocol, Serena MCP, CodeGraph, コードインテリジェンス, GitHub Trending, AIコーディングエージェント, Claude Code, Cursor rules, tree-sitter, LSP'
---

今回の記事では、**AIコーディングエージェントを取り巻くツールエコシステム**について考えてみたい。

筆者はフロントエンド開発者として働きながら、日常的にClaudeを活用している。そうしているうちに、いつの間にかプロジェクトルートに`CLAUDE.md`ができ、その隣には誰かが作った`AGENTS.md`があり、`.cursorrules`も片隅に残り、どこかで読んだ記事に倣って`.claude/skills/`フォルダまで作るようになった。（気がつけば、似たような内容を書いたファイルが5つほどできていた。）

同じような混乱は、ほかの領域でも生じた。`serena`というMCPを追加し、`codegraph`なるものがGitHub Trendingに上がっているのを見てインストールし、さらに新しいツールを見つけるたびに、「これはいったいどのカテゴリのツールで、どのように動いているのだろう」という疑問を繰り返し抱いた。（特に、誰が作ったツールなのか、どのような仕組みでトークンを節約するのかといった部分は、毎回記憶が曖昧になった。）

そこで筆者は、この記事でツールを一つずつ薦めるのではなく、**ツールそのものの地図を描く**ことにした。次の4つの大きな軸に分けて整理する。
 
- コンテキストファイル（`.md`）の違い
- MCPの仕組みとSerena
- コードインテリジェンスツールの階層構造とCodeGraph
- GitHub Trendingに目を向ける

この4つを知っておけば、新しいツールが登場したときにも、「なるほど、これはこういう位置づけなのか」と見当をつけられるはずだ。


## コンテキストファイル

AIコーディングエージェントには、**永続的な記憶がない**という根本的な制約がある。すべてのセッションは空の状態から始まり、昨日合意した規約や1時間前に伝えたフォルダ構成を、次の会話では覚えていない。コンテキストファイルは、この問題を解決する最も単純な仕組みだ。セッションの開始時に毎回自動で読み込まれるファイルをプロジェクトに置けば、同じ説明を何度も繰り返さずに済む。

問題は、同じ発想から生まれたファイルがツールごとに別々に作られたことだ。Claude Codeは`CLAUDE.md`を、Cursorは`.cursorrules`（現在はdeprecatedとなり、`.cursor/rules`の使用が推奨されている）を、GitHub Copilotは`.github/copilot-instructions.md`を、OpenAI Codexは`AGENTS.md`を読む。チームで複数のツールを使えば、同じ内容を4か所にコピーしなければならない状況になる。


### CLAUDE.md

`CLAUDE.md`は、Claude Codeがセッション開始時に自動で読み込むファイルだ。Anthropicの公式ドキュメント（`code.claude.com/docs/en/memory`）によると、Claude Codeは次の3階層から`CLAUDE.md`を探す。

- **ユーザーメモリ**（`~/.claude/CLAUDE.md`）：マシン上のすべてのプロジェクトに適用されるグローバルなデフォルト
- **プロジェクトメモリ**（プロジェクトルートの`CLAUDE.md`）：Gitにコミットされ、チーム全体で共有
- **ローカルメモリ**（サブディレクトリの`CLAUDE.md`）：そのディレクトリで作業するときだけ追加で読み込まれる

3階層がすべて存在する場合、Claudeは**すべてを読み込んで連結（concatenate）**する。優先順位によって一つだけを選ぶのではなく、CSSのcascadeのように、より具体的なものが追加で重なる構造だ。（オーバーライドではなくマージである。）したがって、同じテーマのルールを複数の階層に分散させると競合する可能性がある。（Anthropicの公式ドキュメントも、競合時の動作は保証されないと明記している。）

ここで見落とされがちな点が一つある。**現在の作業ディレクトリからリポジトリルートまで遡り、途中にあるすべての`CLAUDE.md`を読む**という点だ。そのため、モノレポの`packages/ui/`に入って作業すると、ルートの`CLAUDE.md`と`packages/ui/CLAUDE.md`が両方読み込まれる。（これは強力だが、同時にコンテキストが気づかないうちに膨らむ可能性も意味する。）


### AGENTS.md

`AGENTS.md`は、前述したツール別ファイルの乱立を解消するために作られた標準だ。2025年12月、Anthropic・Block・OpenAIの3社がMCPとともにLinux Foundation傘下の**Agentic AI Foundation（AAIF）**へ寄贈し、事実上の業界標準となった。公式サイト（`agents.md`）では、**6万以上のオープンソースリポジトリがこのファイルを採用している**と明記されている。

対応ツールの一覧を見れば、さらに明確だ。OpenAI Codex、Google Jules、VS Code、GitHub Copilot、Cursor、JetBrains Junie、Aider、Devin、Zed、Factory、Warp、goose、opencode、Amp、RooCode、Gemini CLI、Kilo Code、Phoenix、Semgrep、Ona、Windsurf、Augment Codeなど、数多くのツールが対応している。GitHub Copilotは2025年8月から`AGENTS.md`をネイティブサポートし始めた。興味深いのは、**Claude Codeによる`AGENTS.md`のネイティブサポートは、いまだactive feature requestの状態**だという点だ。Claude Codeは今も`CLAUDE.md`を第一のファイルとして扱う。

標準とはいっても、本当に採用が進んでいるのか疑わしく思えるかもしれない。最も強力な証拠は、**dogfooding**（自分たちが作った標準を自ら使うこと）だ。

- **Vercel/Next.js**のcanaryブランチのルートには`AGENTS.md`がある。実際には`CLAUDE.md`を指すシンボリックリンクだが、その中にはモノレポ構成、`pnpm --filter=next dev`による1〜2秒単位の反復、TurbopackとWebpack双方のテストガイド、`pr-status`スクリプト、環境変数やシークレットの扱いに関するルールまで含まれている。`create-next-app`が新規プロジェクトに`AGENTS.md`と`CLAUDE.md`を一緒に生成するようになったのも、同じ流れだ。
- **OpenAI/codex**リポジトリ自体が、独自の`AGENTS.md`を運用している。

戦略としては、次の運用が定石として定着しつつある。**`AGENTS.md`を単一の情報源（single source of truth）とし**、`CLAUDE.md`は最小限に抑え、`AGENTS.md`を参照する1行とClaude Code固有の指示だけを書く方法だ。これなら重複がなくなり、Claude Codeは両方のファイルを読むため、失うものもない。


### SKILL.md

`SKILL.md`は、前の2つとは性質が異なる。`CLAUDE.md`と`AGENTS.md`が**常にコンテキストに存在する永続的な指示**であるのに対し、スキル（Skill）は**必要なときだけ呼び出されるオンデマンドの能力**だ。

スキルはフォルダ単位で構成される。フォルダの中には、1つの`SKILL.md`と、そのスキルが実行するスクリプト、追加のMarkdownドキュメントが入る。Claudeは、現在のタスクがスキルの`description`と一致するときだけ、そのフォルダを読み込む。これを**progressive disclosure（段階的開示）**と呼ぶ。これは1995年にUX分野でJakob Nielsenが確立した概念で、高度な機能や使用頻度の低い機能を補助画面に移し、ユーザーが一度に一つの作業だけに集中できるようにして、認知負荷とエラーを減らす手法だ。Claude Skillsの文脈では、「必要なときだけ、そのスキルの本文をコンテキストへ取り込む」仕組みを指す。その結果、コンテキストウィンドウのコストを劇的に節約できる。

`SKILL.md`のfrontmatterには、いくつか固有のフィールドがある。

- **`description`**：どのような状況でこのスキルが必要かを説明する。モデルが呼び出すかどうかを判断するトリガーになる
- **`allowed-tools`**：スキル内で利用できるツールを制限する（例：`"Read, Glob, Grep, Bash(python:*)"`）
- **`disable-model-invocation: true`**：モデルからは呼び出せず、ユーザーだけがスラッシュコマンドでトリガーできる。副作用のある作業（デプロイ・コミットなど）に使う
- **`user-invocable: false`**：ユーザーのスラッシュメニューには表示されず、Claudeだけが自律的に呼び出し、背景知識として利用する

Claude Skillsは2025年10月16日、Claude.ai、Claude Code、API、Agent SDKで同時にリリースされた。そして2025年12月18日、AnthropicはSkillsの仕様そのものをオープン標準（`agentskills.io`）として公開した。Simon Willisonは「**Skills are awesome, maybe a bigger deal than MCP**」と評価している。その理由は、形式がMCPよりも劇的に単純でありながら、コンテキストウィンドウのコスト問題をprogressive disclosureで解決している点にあった。


### ほかのツールのファイル

Cursorの`.cursorrules`は、**バージョン0.43からdeprecated**となった。現在、公式には`.cursor/rules/`ディレクトリ内に複数の`.mdc`ファイルを置く方法が推奨されている。各`.mdc`ファイルはYAML frontmatterを持つ。

- **`description`**：エージェントがこのルールの関連性を判断するときに参照する
- **`globs`**：一致するファイルが会話に含まれたとき、自動で添付（auto-attach）される
- **`alwaysApply`**：`true`なら、すべての会話に必ず含まれる（この場合、`globs`は無視される）

GitHub Copilotも同じような方向へ進化した。リポジトリ全体への指示は`.github/copilot-instructions.md`に置き、パスごとのスコープが必要な指示は`.github/instructions/*.instructions.md`ファイルを作成して、frontmatterの`applyTo:`キーでglobを指定する。（Copilot code reviewは2025年9月からpath-scoped instructionsを正式にサポートしている。）

Cursor・Copilot以外のツールも、すべて似たパターンへ収束している。表にまとめると次のようになる。

| ツール | ファイル／ディレクトリ | 特徴 |
|------|--------------|------|
| **Claude Code** | `CLAUDE.md`（3階層） | ディレクトリツリーに沿ってマージ |
| **Cursor** | `.cursor/rules/*.mdc` | `globs`でファイルパターンをスコープ化 |
| **GitHub Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` | `applyTo` globをサポート |
| **Cline** | `.clinerules/`ディレクトリ | すべての`.md`／`.txt`を統合し、`paths` globで条件付き有効化 |
| **Continue.dev** | `.continue/rules/*.md` | `name`／`globs`／`alwaysApply` frontmatter |
| **Aider** | `CONVENTIONS.md` + `.aider.conf.yml` | リクエストごとに含まれ、**200行以内を推奨** |
| **Windsurf** | `.windsurfrules` + `global_rules.md` | グローバルとプロジェクトの2段階 |
| **標準** | `AGENTS.md`（AAIF） | 60,000以上のリポジトリが採用 |

なかでも、**Aiderの`CONVENTIONS.md`は興味深い**。公式ドキュメントには、リクエストのたびにこのファイル全体をコンテキストへ含めるため、**「200行以内に保つこと」**と明記されている。（Aiderは、この制約を早くから認識し、ユーザーへ明示的に伝えているわけだ。）


### MEMORY.md

これまでのファイルとは別に、最近よく見かけるようになったパターンがもう一つある。`MEMORY.md`だ。公式標準ではないが、コミュニティから自然発生した慣習であり、**時間の経過に伴う意思決定と失敗を記録する**ために使われる。

```markdown
## 2026-04-10
Pages Router에서 App Router로 이전. 신규 라우트는 App Router 컨벤션 사용.

## 2026-04-22
Prisma 쿼리 결과에 optional chaining 쓰지 말 것 — null은 if-check로 명시적 처리.
(이전에 옵셔널 체이닝으로 null을 흘려보내 프로덕션 이슈 발생.)
```

`CLAUDE.md`や`AGENTS.md`が**現時点のルール**を書く場所なら、`MEMORY.md`は**そのルールがなぜ作られたのかという歴史**を書く場所だ。（両者は補完関係にあり、代替関係ではない。）


### エージェントはこれらのファイルをどう読むのか

ここまで、どのようなファイルがあるのかを整理してきた。しかし、意外に見落とされやすい問いが一つある。**エージェントはこれらのファイルを、正確にはどこへ、どのように読み込むのだろうか。** 実はこの仕組みを理解すると、後で扱うETH Zurichの結果（コンテキストファイルの指示があまり守られないという結果）が、よりすっきりと理解できる。

まず押さえておくべき事実が一つある。**`CLAUDE.md`はsystem promptではなく、user messageとして注入される。** Anthropicの公式ドキュメントには、次のように明記されている。

::::quote
:::translation
CLAUDE.mdの内容はシステムプロンプトの一部ではなく、システムプロンプトの後にユーザーメッセージとして渡される。Claudeはそれを読み、従おうとするが、厳密な遵守が保証されるわけではない。
:::

:::original
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::
::::

つまり、強制ルールではなく「参考用コンテキスト」にすぎない。特定の動作を確実に強制したいなら、`PreToolUse`フックのような別の仕組みを使うべきだと、公式ガイドでも推奨されている。

読み込み順は、broad → specificの順で積み重なる。具体的には、managed policy（組織レベルの設定）→ ユーザーグローバル（`~/.claude/CLAUDE.md`）→ プロジェクト（`./CLAUDE.md`）→ ローカル（`./CLAUDE.local.md`）の順だ。同じディレクトリでは、`CLAUDE.md`の後に`CLAUDE.local.md`が続く。**最も近い場所の指示が最後に読まれる**ことを利用すれば、LLMのrecency biasによって、より具体的なルールが強く働く効果を期待できる。

ここで興味深いのが`@import`構文だ。CLAUDE.mdの本文中に`@path/to/file`と書くと、そのファイルがその位置に展開され、一緒に読み込まれる。**再帰の最大深度は4 hops**まで許可され、相対パスはimport文が書かれたファイルを基準に解決される。そのため、公式には`@AGENTS.md`で橋渡しする方法が推奨されている。`CLAUDE.md`をほぼ空にして`@AGENTS.md`の1行だけを書けば、Claude Codeも自然にAGENTS.mdを読む。（CLAUDE.mdがまだAGENTS.mdをネイティブサポートしていない現状では、最もすっきりした回避策だ。）

トークンの観点も確認しておこう。CLAUDE.md自体には明示的なトークン上限がなく、**存在する内容はすべて読み込まれる**。ただし、公式の推奨は**1ファイル200行以内**だ。200行を超えると「consume more context and may reduce adherence」と明記されている。興味深いことに、Claude 4.xでは**tool useを有効にするだけでspecial system promptが自動的に346トークン増える**（`tool_choice: auto`の場合）。コンテキストは、知らないうちに少しずつ消費されているのだ。

Cursorは別の方法を採る。`.cursor/rules/*.mdc`のルールは、次の4タイプで動作する。

- **Always Apply**：すべてのチャットに必ず含まれる。globs／descriptionは無視される
- **Apply Intelligently**（Agent Requested）：エージェントが`description`を読み、関連性を判断して利用する
- **Apply to Specific Files**（Auto Attached）：globパターンに一致するファイルがコンテキストに入ったときに有効化される
- **Apply Manually**：`@rule-name`でユーザーが明示的に呼び出す

ほかのツールは、さらに異なる。OpenAI CodexはGitリポジトリのルートからcwdへ向かってwalkし、すべての`AGENTS.md`を収集して**ユーザープロンプトの直前**に注入する。GitHub Copilotは`.github/copilot-instructions.md`を、「edit contextとexplicit referencesの後、loosely related open filesより前」という、コンテキストウィンドウの中間的な優先位置に挿入する。同じ`AGENTS.md`ファイルでも、読み込み時点、優先順位、マージルールはツールごとに異なるため、**3つのツールがまったく同じ方法でそのファイルを見る保証はない。**

しかし、ここには一つ根本的な問いが残る。**なぜモデルは、コンテキストにある指示の一部しか守らないのだろうか。** 単に「指示が長いから」という説明では不十分だ。この現象の根底には、LLMの構造的な限界がある。

### ハルシネーションとコンテキスト忘却

AIエージェントが会話の文脈を混同したり、前に明確に伝えた内容を後になって忘れたりする経験があるなら、それはまさに**ハルシネーション（Hallucination）**の一種だ。一般にハルシネーションといえば「存在しない事実を作り出すこと」がまず思い浮かぶが、学術的には3つに分類される。Yue Zhangらの研究チームによる2023年のサーベイ「Siren's Song in the AI Ocean」では、これを**入力競合型**（ユーザーが明示した内容と異なる生成）、**文脈競合型**（以前に自ら生成した内容との矛盾）、**事実競合型**（世界知識との不一致）に分けている。コンテキストファイルの指示を無視する現象は、3番目ではなく**1番目のタイプ**だ。モデルが入力を処理するとき、その中の一部の情報を「存在しなかったかのように」扱うのである。

さらに根本的な問題は、このハルシネーションを**原理的に排除できない**ことだ。シンガポール国立大学の研究チームは、学習理論を用いてこれを数学的に証明した。どのLLMもすべての計算可能関数を学習することはできず、したがって汎用問題解決器として使う限り、どこかで必ずハルシネーションが生じるという。

位置効果も重要だ。Stanfordの研究チームは、関連情報が**コンテキストウィンドウの先頭または末尾にあるとき**、モデルが最もよく参照し、**中央に埋もれたとき**に性能が大きく低下することを実験で示した。これはコンテキストファイルに直接関係する。`CLAUDE.md`は読み込み順の中ほどに挿入され、会話が長くなるほど、その指示はコンテキストの「中央」へ押し込まれていく。先ほど触れたrecency bias（新しい情報ほどよく従う傾向）の反対側、つまり**primacy-recency効果において中央部分が最も弱い**という事実ともつながっている。

これらの現象をまとめると、一つの図が見えてくる。コンテキストファイルは、LLMの**最初のuserターンより前に、システムの外から差し込まれるテキスト**にすぎない。モデルの決定を強制する仕組みではなく、コンテキストウィンドウに置かれる、もう一つのトークンの塊なのだ。長いほど、そして会話が長引くほど、指示は「中央」へ押し込まれ、参照率が下がる。ETH Zurichの結果は、この構造的な限界を定量的に確認したものだといえる。


### ETH Zurichの研究

多くの人は、「それなら、このファイルにできるだけ多く書いておけばよいのでは」と考えただろう。しかし、その直感に真正面から反論する研究が最近発表された。先ほどから触れてきたETH Zurichの研究である。

ETH Zurichの研究チームが2026年2月に発表した論文「Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?」だ。138件の実際のPythonソフトウェアエンジニアリングタスクのベンチマーク（AGENTBENCH）とSWE-bench Liteを使い、Claude Code（Sonnet-4.5）、Codex（GPT-5.2／GPT-5.1 mini）、Qwen Codeの4つのエージェントで測定したところ、意外な結果が得られた。

- **LLMが自動生成したコンテキストファイル**は、SWE-bench Liteで約0.5%、AGENTBENCHで約2%、**タスク成功率をむしろ低下させた**
- **人間が直接書いたファイル**でさえ、平均約4%のわずかな改善にとどまった
- コンテキストファイルを追加すると、**推論コストがインスタンス当たり20%以上増加**した
- より強力なモデル（GPT-5.2）では、コンテキストファイルの効果がさらに小さかった（強力なモデルほどパラメトリック知識が十分で、追加コンテキストがノイズとして働く）

ただし、例外が一つあった。**非標準ツールを明記した場合**だ。たとえば、Pythonのパッケージマネージャーである`uv`をコンテキストに明記すると、エージェントが`uv`を使う頻度がインスタンス当たり0.01回から1.6回へと、**約160倍に増加した**。

先ほど扱ったAiderの「200行推奨」「毎回コンテキストに入るため短く保つこと」という案内は実用的な指針であり、ETH Zurichの研究は「長いコンテキストファイルが統計的に性能を下げる」ことを定量的に示した。筆者が考える、この研究の実践的な示唆は次のとおりだ。

- **自動生成された巨大なコンテキストファイルは、役立つより害になる可能性がある**。300行の`CLAUDE.md`にコーディング規約・アーキテクチャ・ワークフローをすべて詰め込むと、エージェントは一部だけに従い、残りを無視する。その不整合は、コンテキストがない場合より悪い結果につながり得る。
- **必ず書くべきなのは「推論できない情報」**だ。非標準ツール、プロジェクト固有の規約、過去の失敗事例などが該当する。一般的なコーディングのベストプラクティスは、モデルがすでに知っている。
- AGENTS.mdを単一の情報源とし、CLAUDE.mdにはツール固有の短い指示だけを書き、詳細なワークフローはSkillへ分離する。


## MCP（Model Context Protocol）

`.md`ファイルが「エージェントに何を知らせるか」という問題を解くものなら、MCP（Model Context Protocol）は「**エージェントに何ができるようにするか**」という問題を解く。

少し具体的に説明しよう。AIエージェントがSlackへメッセージを送るには、Slack APIを呼び出せなければならない。GitHub Issueを作るには、GitHub APIを呼び出せなければならない。Postgresへクエリするには、DB接続を扱えなければならない。こうした外部システムとの統合を、**一つの標準プロトコルにまとめたもの**がMCPだ。（どのクライアントも、どのサーバーにも、同じインターフェースで接続できるという意味だ。）

MCPはAnthropicが**2024年11月25日**に初めて公開したオープン標準だ。そして**2025年12月9日**、Anthropic・Block・OpenAIの3社は共同創設者として、MCP仕様をLinux Foundation傘下の**Agentic AI Foundation（AAIF）**へ寄贈した。Google・Microsoft・AWS・Cloudflare・Bloombergがプラチナメンバーとして参加した。（2025年12月の寄贈時点で、SDKは月間9,700万回以上ダウンロードされ、1万以上の公開MCPサーバーが稼働していた。）

MCPはJSON-RPC上に構築された、状態を持つ（stateful）セッションプロトコルだ。**JSON-RPC**は、JSONをワイヤーフォーマットとして使うstatelessで軽量なRPC（Remote Procedure Call）プロトコルである。トランスポート層に依存せず、HTTP・TCP・標準入出力のいずれでも動作する。notification（応答のない呼び出し）とbatch呼び出しにも対応する。


### プロトコルの内部

MCPでクライアントとサーバーが交わすすべてのやり取りは、6つのプリミティブ（primitive）のいずれかで表現される。当初はサーバー側の3つから始まったが、2025-06-18 specでクライアント側のプリミティブ3つが追加され、現在は合計6つが標準となっている。

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

プリミティブと転送方式を確認したので、次は**実際にLLMがMCPツールをどのように発見し、呼び出すのか**を追ってみよう。（`.md`ファイルでは「どこに注入されるか」が問題だったが、ここではMCPが「どのようにLLMの視野へ入るか」が問題となる。）

MCPセッションが始まると、次の順序でハンドシェイクが行われる。

- **クライアント → サーバー**：`initialize`リクエスト（対応するプロトコルバージョンとクライアントcapabilitiesを渡す）
- **サーバー → クライアント**：`initialize`レスポンス（サーバーcapabilitiesと、任意の`instructions`フィールド）
- **クライアント → サーバー**：`notifications/initialized`通知
- **クライアント → サーバー**：`tools/list`リクエスト → 利用可能なツール一覧を受信
- （以後）LLMがツールを呼び出すと判断 → クライアントが`tools/call`を送信 → 結果を受信

ここで見落とされがちな点が一つある。**`initialize`レスポンスの`instructions`フィールド**だ。サーバーがこのフィールドにテキストを入れて送ると、その内容は事実上、LLMのシステムプロンプトへ追加される。つまり、「これらのツールをどのように使うべきか」というガイドをMCPサーバーがLLMへ直接注入できる正式なスロットが、specに存在する。（前述したTool Poisoning Attackが危険である理由の一つが、まさにこのスロットの存在だ。）

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

クライアントは`tools/list`で受け取ったこの一覧を、**Anthropic Messages APIの`tools`パラメータ**または**OpenAI function callingの`tools`パラメータ**へ変換し、LLM APIの呼び出し時に一緒に渡す。Anthropicの場合、toolパラメータが渡されると、**special system promptが自動的に追加**され、モデルがtoolの呼び出し方を理解できるようになる。（これが先ほど触れた346トークン増加の正体だ。）

LLMがツールを呼び出す必要があると判断すると、レスポンス内に`tool_use`ブロック（`{"type": "tool_use", "name": ..., "input": ...}`）が挿入され、レスポンスの`stop_reason`は`tool_use`で終わる。クライアントはこれを受け取り、実際のMCPサーバーへ`tools/call`を送信する。結果を受け取ると、次のuserメッセージの`tool_result`ブロックに入れて、再びLLMへ送る。**`stop_reason`が`tool_use`以外の値（`end_turn`、`max_tokens`など）に変わるまで、このループが繰り返される。** 私たちが一般に「エージェントが働く」と呼ぶ動作は、実際にはこの呼び出し・結果・呼び出しのループが連続することに近い。

では、MCPは単純なfunction callingと何が違うのだろうか。4つの違いにまとめられる。

- **動的な発見**：ビルド時点ではツール一覧を知らず、ランタイムに`tools/list`で取得する。`notifications/tools/list_changed`により、セッション中の変更も可能
- **Stateful session**：lifecycle phaseが定義されているため（initialize → operation → shutdown）、適切に終了できる
- **Tool以外のプリミティブ**：Prompt・Resource・Sampling・Roots・Elicitationまで、capability negotiationを通じて公開する
- **双方向性**：サーバーから逆にクライアントのLLMをsamplingで呼び出すことも、spec上は可能

（この違いから、MCPは「エージェント向けfunction callingの一般化された標準」と呼ばれることもある。）

### Serena

**Serena**（`oraios/serena`）は、MCPサーバーの中でもコーディングエージェントに関連して最も頻繁に言及されるツールの一つだ。2026年5月時点で約24.7k starsを獲得し、およそ1年でニッチなツールから事実上の標準コードMCPへと成長した。

Serenaの中心的なアイデアは、一言で要約できる。**エージェントにはテキストではなく、シンボルを見せよう。**

少し詳しく説明しよう。`calculateTotal`関数のすべての使用箇所を探すとする。一般的なテキストベースのツール（grepやReadなど）は、次のように動く。

コードベース全体を`calculateTotal`でgrepする。次に、一致したすべての行番号を集め、各ファイルを一定の行範囲だけ読んでコンテキストを作る。変数名、文字列リテラル、コメントに偶然含まれた一致まで、すべて拾ってしまう。

LSPベースのSerenaは、`find_referencing_symbols("calculateTotal")`を1回呼び出すだけで、変数名やコメントの一致といったノイズを含まず、正確なシンボル参照だけを返す。

**LSP（Language Server Protocol）**は、コードエディタ／IDEと「言語インテリジェンスツール」（コード補完、定義へ移動、参照の検索、リファクタリングなど）の間の通信を標準化した、JSON-RPCベースのオープンプロトコルだ。2016年にMicrosoft・Red Hat・Codenvyが共同で標準化した。中心的な発想は、「エディタごとに言語解析器を再実装せず、言語ごとにサーバーを一つ用意し、すべてのエディタがそのサーバーへ問い合わせよう」というものだ。（TypeScriptサーバー、Rust analyzer、Pythonのpyrightなどは、すべてLSPサーバーである。）

Serenaの主要ツールには、`find_symbol`、`find_referencing_symbols`、`get_symbols_overview`などがある。バックエンドは2つから選べる。デフォルトはLSPを実装した言語サーバー（無料／オープンソース）、もう一つはJetBrains IDEのコード解析を利用する有料プラグイン（無料トライアルあり）だ。

Serenaが急速に採用された本当の理由は、**トークンの節約**にある。テキストgrepとファイルreadのループは多くのトークンを消費するが、LSPへの正確な問い合わせ1回なら、ほとんど消費しない。コードベースが大きいほど、その差は広がる。


### では、MCPは安全なのか

ここで確認しておくべきことがある。**MCPが権限付与を自動化するわけではない。** どのサーバーを信頼できるのか、どのツールにどのような副作用があるのか、そのツールが時間の経過後も同じ動作をするのかは、すべてユーザー自身が判断しなければならない。

代表的な2つの攻撃を知っておくとよい。

- **Tool Poisoning Attack（TPA）**：Invariant Labsが2025年4月に命名し、PoCを公開した攻撃だ。MCPサーバーのツール説明（description）に悪意ある指示を隠すと、モデルはそれをユーザーの指示と誤認して従う。ユーザーには見えないが、モデルには見えるテキストである。

- **Rug Pull**（Silent Redefinition）：Simon Willisonが2025年4月9日の公開分析で扱った概念だ。ツールは最初、正当なものとして始まる。ユーザーが確認・承認し、ワークフローへ統合する。数週間後、ツール定義がひそかに変更され、悪意ある指示が含まれるようになる。ユーザーは再承認を求められないため、動作はそのまま変わってしまう。

セキュリティに関する事件が、**2026年4月15日**に起きた。OX Securityは、主要なMCP SDK（Python・TypeScript・Java・Rust）すべてに影響するシステム的なRCE脆弱性を公開した。1億5千万回以上のダウンロード、約7,000の公開サーバー、約20万の脆弱と推定されるデプロイが影響範囲に入った。14件以上のCVEが割り当てられ、Cursor・VS Code・Windsurf・Claude Code・Gemini-CLIはいずれも影響を受けた。

その後、どのような対応が取られたのだろうか。Anthropicは、**プロトコルのアーキテクチャ自体は変更しなかった**。代わりに`SECURITY.md`を更新し、stdioアダプターを使用する際の入力sanitizationは、下流の開発者が責任を負うことを明記した。specでは、**2025-06-18改訂でOAuth 2.1とRFC 8707 Resource Indicatorsを必須化**し、トークン再利用攻撃を防いだ。さらに、**2025-11-25改訂ではincremental scope consent**（必要な最小権限だけを段階的にユーザーが承認する方式）を導入した。それでも、2026年1〜2月だけでMCP関連のCVEが30件以上発行され、そのうち**command injectionが43%**を占めたという統計もある。**セキュリティは、今なお進行中の課題なのだ。**


## コードインテリジェンスツール

`.md`ファイルが「何を知らせるか」、MCPが「何をできるようにするか」なら、コードインテリジェンスツールは「**関連するコードをいかに素早く見つけるか**」という問題を解く。

大規模なコードベースでは、AIエージェントのコストの大半が、コードの変更そのものではなく、**関連コードがどこにあるかを探すこと**に費やされる。すべてのタスクがgrep → read → filter → 再びgrepという反復から始まれば、トークン、時間、ツール呼び出しを浪費する。コードインテリジェンスツールは、この検索コストを減らすためのさまざまな試みだ。

これを4つの階層（tier）に分けて見ると、全体像を整理しやすい。


### コンテキストパッキング

最も単純な解決策は、「**すべてを一つのコンテキストウィンドウへ入れてしまおう**」という発想だ。グラフも作らず、インデックスも構築しない。リポジトリ全体を一つのテキストの塊に直列化し、そのままモデルへ渡す。

代表的なツールに**Repomix**がある。リポジトリ全体を、ClaudeのXMLパースに最適化された構造へパッキングする。CLI、Web、Extension、MCPサーバーをすべて備え、この分野で最も充実したエコシステムを持つ。

**GitIngest**は、摩擦のない使い勝手で知られている。GitHub URLの`github.com`を`gitingest.com`へ一語だけ変更すれば、そのリポジトリ全体が一つのテキストページに変換される。（例：`github.com/facebook/react` → `gitingest.com/facebook/react`。）ブラウザのアドレスバーで一語変えるだけなので、別途インストールする必要もない。一度きりの素早い探索に特化している。

**code2prompt**（Mufeed VH作）はRust製のCLIで、テンプレートシステムによるカスタマイズ性に強みがある。

興味深い派生形として、**rtk**（`rtk-ai/rtk`、約55k stars）にも触れておきたい。前述のツールが「リポジトリ全体を一度にパッキング」するのに対し、rtkは**CLIコマンドの出力そのものをリアルタイムに圧縮**するツールだ。Rust製の単一バイナリで、Claude Code・Cursor・Copilot・Gemini CLI・Codexなど、13のツールのshell hookへ自動登録される。エージェントが`git status`を呼び出すと、内部で`rtk git status`へrewriteされる。（ユーザーがワークフローを変える必要がないことが、最大の違いだ。）100以上のコマンドにsmart filtering・grouping・truncation・deduplicationのヒューリスティクスを適用し、出力トークンを60〜90%削減する。公式サイトの一文が、このカテゴリをよく要約している——*「70% of your bill is noise the LLM doesn't need.」* 前述のツールが「入力されるコンテキスト」の量を減らすものなら、rtkは「tool callの結果として戻るコンテキスト」の量を減らすものだ。

ただし、この階層の限界は明確である。**大規模なリポジトリではトークン上限に達する。** そして、コードを「テキストの塊」として渡すだけで、シンボル間の関係や構造的な理解は存在しない。


### tree-sitterリポジトリマップ

次の階層は、**tree-sitter**を使ってコード構造を解析しつつ、独立したインデックスサーバーは立てない方式だ。

**AST（Abstract Syntax Tree、抽象構文木）**は、ソースコードの構造を木として表現するデータ構造だ。コンパイラの構文解析段階で得られるもので、空白・セミコロン・括弧などの表面的な詳細を取り除き、変数・演算子・関数呼び出し・制御フローなど、意味のある要素だけをノードとして残す。コードインテリジェンスツールによる精密な解析は、最終的にはすべてAST上で行われる。

**tree-sitter**は、オープンソースのパーサージェネレーターであり、増分（incremental）パースライブラリでもある。GitHubのコードナビゲーション、Neovim、Zed、Helixなどで採用されている。最大の特徴は、**編集された部分だけを再パースする**ことだ。エディタで1行を変更してもファイル全体を再パースせず、変更されたツリーだけをpatchする。そのため応答が速く、AIエージェントがコードを素早く調べる用途にも適している。

先ほど取り上げた**Aider**が、このアプローチの代表例だ。tree-sitterを使ってソースファイルから関数・クラス・メソッドなどのシンボル定義を抽出し、ファイルをノード、ファイル間の依存関係をエッジとするグラフを作る。そして、そのグラフにPageRank系のランキングアルゴリズム（ページへ入るリンクの数と質から、ページの重要度を評価するアルゴリズム）を適用し、トークン予算に合わせて主要な定義とシグネチャだけを抽出する。（デフォルトの`--map-tokens=1024`では、1kトークンのリポジトリマップを作る。）

**AFT**（`cortexkit/aft`）は、このアプローチをさらに精密に発展させた。AFTの公式READMEの表現をそのまま訳すと、次のようになる。**「500行のファイルを読むと、約375トークンかかる。しかし、エージェントがたいてい一つの関数しか必要としない場合、`aft_zoom`へシンボル名を渡せば、その関数とわずかなコンテキストだけが返る。約40トークンで済む。」** また、行番号ベースの編集は対象より上のコードが動いた瞬間に壊れるが、AFTのシンボルモード編集は関数を名前で指定するため安定している。

同じ階層でもう一つ、補足として紹介したいツールがある。**ast-grep**（`ast-grep/ast-grep`、約13.9k stars）だ。tree-sitterベースの構造検索・rewriting CLIで、一般的なgrepとの決定的な違いは、テキストではなくCST（Concrete Syntax Tree）パターンでマッチする点にある。たとえば`console.log($A)`パターンを検索すると、テキストの見た目に関係なく、同じ意味構造を持つすべての呼び出しを正確に検出する。独立した`ast-grep-mcp`サーバーもあり、AIエージェントにテキストgrepの代わりに構造検索を使わせられる。


### Knowledge Graph

第3の階層は、さらに一歩先へ進む。**あらかじめコードベース全体をパースしてナレッジグラフを作り、ディスクへ保存**しておき、エージェントは保存済みのグラフへクエリを投げる方式だ。最も話題になっている例が、**CodeGraph**というツールである。

アーキテクチャは意外に単純だ。**tree-sitter**でコードをパースし、抽出したシンボル・エッジ・ファイル情報をSQLiteのFTS5全文検索へ保存し、そのナレッジグラフをMCP経由でAIエージェントへ公開する。ここで押さえておきたいのは、**この抽出のすべてがLLMによる要約ではなく、ASTパースによって決定論的に行われる**点だ。つまり、ハルシネーションが入り込む余地がない。

ここに登場する**FTS5（SQLite Full-Text Search 5）**は、SQLiteの仮想テーブルとして提供される全文検索拡張機能だ。SQLite 3.9.0（2015-10-14）からamalgamationに含まれ、`CREATE VIRTUAL TABLE ... USING fts5(...)`でテーブルを作成し、`MATCH`演算子でクエリする。Elasticsearchのような独立した検索エンジンを立ち上げなくても、SQLiteファイル一つで全文インデックスを運用できることが決定的な利点であり、CodeGraphが「100%ローカル動作」を掲げられる理由の一つでもある。

そして、先ほど触れた**決定論的（deterministic）パース**とは、バックトラッキングを行わず、各段階で唯一の選択だけを許すパースアルゴリズムを指す。LL（1）・LRパーサーが代表的であり、線形時間で動作する。CodeGraphの文脈では、「ASTから抽出したシンボル関係は、LLMの解釈ではなく数学的に正確である」という意味になる。LLMがコードを要約してグラフを作るとハルシネーションの危険があるが、ASTを直接パースすれば、**数学的に正確なシンボル関係**を得られる。この原則が中核を成している。

ベンチマークも印象的だ。Claude Opus 4.7をヘッドレスで実行し、CodeGraph MCPを有効にした場合と無効にした場合を比較した。公式READMEの平均値では、**コストが35%下がり**、**トークン使用量が57%減り**、**46%高速化し**、**ツール呼び出しは71%減少**した。しかも、この効果はコードベースの規模に比例して大きくなる。Tokioのような大規模リポジトリでは、コスト82%減、トークン86%減、速度71%向上、ツール呼び出し92%減まで測定された。（CodeGraphがなければ、エージェントはgrep／find／Readを広範囲にfan-outするが、CodeGraphがあれば、そのすべてを1回のインデックスクエリで置き換えられる。）

学術的な背景も深い。**GraphCoder**（ASE 2024）は、control flowとdata／control dependenceを統合したCode Context Graphを作った。**CodexGraph**（NAACL 2025）は、LLMエージェントがグラフデータベースのクエリを直接作成・実行できるようにした。**Prometheus**は、tree-sitterベースのナレッジグラフと統合メモリを組み合わせ、多言語のIssue解決へ応用した。この方向性は、学術界と産業界が同時に収束しつつある明確なパターンだ。

ここで、興味深い派生形を一つ見てみよう。**Cursorのインデックス機能**は、前述とは異なる道を選んでいる。ASTグラフではなく、**ベクトル埋め込みベースのセマンティック検索**だ。ローカルでファイルを関数・クラス単位のチャンクへ分割し、Merkle treeのハッシュでサーバーと同期し、埋め込みだけをTurbopufferというベクトルDBへ保存する。（元のソースコードをクラウドに保存しないことが、重要なプライバシーモデルだ。）クエリ時には質問を埋め込みへ変換し、nearest-neighbor検索を実行する。そこで得たファイルパスと行範囲をローカルで再び読み、LLMへ渡す。**「正確なシンボル」ではなく「意味的に関連するコード」**を探す方向であるため、精度は低いものの自然言語クエリに強い。CodeGraphとCursorのインデックス機能は、同じ問題（検索コスト）を異なる前提で解いているのだ。


### LSP

最後の階層は、**言語サーバーへ直接依存**する方式だ。tree-sitterが「シンボルが存在すること」を知るのに対し、LSPは「そのシンボルが何であるか」を知る。

具体例で違いを見てみよう。TypeScriptのLSPは、`UserService`が`IUserService`インターフェースを実装していること、どのジェネリック型パラメーターを受け取るのか、どのようなオーバーロードがあるのか、どの戻り値の型を持つのかを知っている。tree-sitterは、そこまでは理解できない。

MCPの節で取り上げた**Serena**は、まさにこの階層に位置する。AiderはLSPを使わず、独自にファイルを解析するため、関数・クラスレベルの認識までしかできない。一方、**OpenCode**のようなツールのLSP統合は、より深い型認識を提供するが、言語ごとに優れたLSPサーバーへ依存するという限界がある。


## GitHub Trending

![AIコーディングエージェントのツールとコードインテリジェンスの流れ](1.webp)

最後にもう一つ。前述のツールの多くを筆者が初めて知ったきっかけは、**GitHub Trending**だった。誰がどのようなツールを作り、何が急速に人気を集めているのかを、一目で確認できる場所だ。

`github.com/trending`を開くと、today、this week、this monthという3つの期間で確認できる。言語とカテゴリによるフィルタリングも可能だ。（筆者は通常、weekly + TypeScript / Pythonで確認し、ときどき全言語へ広げている。）

筆者がここ数週間Trendingを追いながら気づいた興味深い点は、**今四半期の上位リポジトリが、明確なクラスターを形成している**ことだ。クラスターが分かれば、個々のツールの位置づけも見えやすくなる。

## まとめ

この記事を書きながら筆者が最も強く感じたのは、**ツールがあまりにも速いペースで増えている**ことだった。執筆中にも新しいMCPサーバーがGitHub Trendingに上がり、AGENTS.mdの対応状況が変わり、新たなセキュリティCVEが発行された。書きかけの段落がすぐ古くなる感覚は技術記事の宿命だが、AIエージェントのエコシステムでは、その速度がとりわけ急だ。

そこで筆者がこの記事で目指したのは、特定のツールを薦めることではなく、**ツール同士の関係を見る目**を養うことだった。CLAUDE.mdがなぜuser messageとして注入されるのか、MCPがfunction callingと具体的にどう違うのか、tree-sitterとLSPがなぜ別の階層なのかを理解すれば、新しいツールが登場したときにも、「これはどの階層にあり、どの問題をどのような方法で解いているのか」を素早く読み解ける。

最後に残るのは、ETH Zurichの研究が示した一つの直感だ。**モデルはすでに多くのことを知っている。** コンテキストファイルへ何もかも詰め込んだからといって、エージェントがよりよく従うわけではない。モデルが知らない可能性の高いもの、つまりプロジェクト固有の規約、非標準ツール、過去の失敗だけを残し、それ以外を取り除くほうがよい。ツールを数多くインストールすることと、ツールを使いこなすことは別の問題なのだ。

この記事を読んだ方にも、今すぐMCPを10個追加したり、CLAUDE.mdを数百行へ増やしたりするのではなく、現在使っているツールがどのような仕組みで動いているのか、一度掘り下げてみることを勧めたい。それが、エコシステムがどの方向へ進んでも揺らがない土台になると考えている。


## 参考資料

:::ref
- [docs] [Claude Code Memory, Anthropic](https://code.claude.com/docs/en/memory)
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [docs] [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [paper] [ETH Zurich, "Evaluating AGENTS.md" (2602.11988)](https://arxiv.org/abs/2602.11988)
- [paper] [Yue Zhang et al., "Siren's Song" (2309.01219)](https://arxiv.org/abs/2309.01219)
- [paper] [Ziwei Xu et al., "Hallucination is Inevitable" (2401.11817)](https://arxiv.org/abs/2401.11817)
- [paper] [Nelson F. Liu et al., "Lost in the Middle" (2307.03172)](https://arxiv.org/abs/2307.03172)
- [article] [Simon Willison, "Claude Skills are awesome"](https://simonwillison.net/2025/Oct/16/claude-skills/)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
- [repo] [rtk-ai/rtk](https://github.com/rtk-ai/rtk)
:::
