---
emoji: 🧭
title: 'コンテキストファイル'
seoTitle: "CLAUDE.md・AGENTS.md・SKILL.mdの違い: AIコーディングエージェントのコンテキストファイル"
date: '2026-05-29'
updatedAt: "2026-10-08"
locale: ja
translationOf: '260529'
sourceHash: a8deda13246ed45566b723f969c3c12046709a55068c9d2bbec8d976fd7f8ec5
categories: AI 開発ツール Claude MCP CodeGraph
description: "CLAUDE.md・AGENTS.md・SKILL.md・Cursor rulesがいつ、どのようにエージェントに読み込まれるのかを整理する。CLAUDE.mdがuser messageとして注入される仕組みとコンテキストの忘却、ETH Zurichの研究をもとに、何を書くべきかの基準を示す。"
keywords: "CLAUDE.md, AGENTS.md, SKILL.md, MEMORY.md, Cursor rules, copilot-instructions.md, コンテキストファイル, AIコーディングエージェント, Claude Code, ETH Zurich AGENTS.md 研究"
---

今回の記事では、**AIコーディングエージェントが読み込むコンテキストファイル**について話してみたい。

一つのプロジェクトに`CLAUDE.md`、`AGENTS.md`、`SKILL.md`、`.cursor/rules`が積み重なっていて、それぞれがいつ読まれ、何を書くべきなのかがわからなくなっている開発者に向けた記事だ。最後まで読めば、ファイルごとの違いと、エージェントがそのファイルを読み込む仕組み、そしてETH Zurichの研究にもとづく「推論できない情報だけを書く」という判断基準が得られる。

筆者はフロントエンド開発者として働きながら、日常的にClaudeを活用している。そうしているうちに、いつの間にかプロジェクトルートに`CLAUDE.md`ができ、その隣には誰かが作った`AGENTS.md`があり、`.cursorrules`も片隅に残り、どこかで読んだ記事に倣って`.claude/skills/`フォルダまで作るようになった。（気がつけば、似たような内容を書いたファイルが5つほどできていた。）


## 永続メモリを持たないエージェント

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

`AGENTS.md`は、前述したツール別ファイルの乱立を解消するために作られた標準だ。2025年12月、Anthropic・Block・OpenAIの3社がMCP（エージェントを外部システムにつなぐプロトコル）とともにLinux Foundation傘下の**Agentic AI Foundation（AAIF）**へ寄贈し、事実上の業界標準となった。公式サイト（`agents.md`）では、**6万以上のオープンソースリポジトリがこのファイルを採用している**と明記されている。

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

ここでSkillsと比較されたMCP（Model Context Protocol）は、エージェントがSlack、GitHub、DBのような外部システムを呼び出せるようにつなぐ標準プロトコルだ。コンテキストファイルがエージェントに何を知らせるかの問題なら、MCPは何をできるようにするかの問題だ。MCPがfunction callingと何が違うのかは、[MCPとfunction calling](/260524)に別途まとめておいた。


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


## まとめ

コンテキストファイルは、ツールごとに名前も、置き場所も、読み込まれるタイミングも異なる。この記事で見たものだけでも、CLAUDE.md、AGENTS.md、SKILL.md、Cursor rules、copilot-instructions.md、MEMORY.mdがあり、どのツールがどのファイルに対応しているかも変わり続けている。ファイルの一覧を覚えておくだけでは、すぐに古くなる。

そこで筆者がこの記事で目指したのは、特定のファイル形式を薦めることではなく、**ファイルがエージェントにどう読まれるのかを見る目**を養うことだった。CLAUDE.mdがなぜuser messageとして注入されるのか、同じAGENTS.mdをツールごとになぜ異なる形で読むのか、指示がなぜコンテキストの中間で弱まるのかを理解すれば、新しいコンテキストファイルの形式が登場したときにも、「これはいつロードされ、どれくらい強く作用するのか」を素早く読み解ける。

最後に残るのは、ETH Zurichの研究が示した一つの直感だ。**モデルはすでに多くのことを知っている。** コンテキストファイルへ何もかも詰め込んだからといって、エージェントがよりよく従うわけではない。モデルが知らない可能性の高いもの、つまりプロジェクト固有の規約、非標準ツール、過去の失敗だけを残し、それ以外を取り除くほうがよい。コンテキストファイルを長く書くことと、うまく書くことは別の問題なのだ。

この記事を読んだ方にも、今すぐCLAUDE.mdを数百行へ増やすのではなく、いま使っているツールがそのファイルをいつ、どこに、どれくらい強く読み込むのか、一度掘り下げてみることを勧めたい。それが、ファイル形式がどう変わっても揺らがない土台になると考えている。


## 参考資料

:::ref
- [docs] [Claude Code Memory, Anthropic](https://code.claude.com/docs/en/memory)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [docs] [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [paper] [ETH Zurich, "Evaluating AGENTS.md" (2602.11988)](https://arxiv.org/abs/2602.11988)
- [paper] [Yue Zhang et al., "Siren's Song" (2309.01219)](https://arxiv.org/abs/2309.01219)
- [paper] [Ziwei Xu et al., "Hallucination is Inevitable" (2401.11817)](https://arxiv.org/abs/2401.11817)
- [paper] [Nelson F. Liu et al., "Lost in the Middle" (2307.03172)](https://arxiv.org/abs/2307.03172)
- [article] [Simon Willison, "Claude Skills are awesome"](https://simonwillison.net/2025/Oct/16/claude-skills/)
:::
