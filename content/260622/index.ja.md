---
emoji: 🧭
title: 'Harness（Systems）Engineering'
seoTitle: 'コンテキストの次に来るAI agent：harness設計、eval、containment'
date: '2026-06-22'
categories: AIエージェント
description: 'prompt engineeringからcontext engineeringへ、その次はどこへ向かうのか。Anthropicのエンジニアリングブログに見られる最近の流れを手がかりに、harness設計、eval、containment（隔離）という3つの方向とtoken節約の議論とのつながりを整理する。'
keywords: 'context engineering, harness設計, AI agent eval, agent evaluation, containment, agent隔離, AIトレンド2026, prompt engineering, LLM agent, token節約の次'
locale: ja
translationOf: '260622'
sourceHash: '3a4496827fcd34537ded61f9925a57116fbf16b6d28eee9508f66417f6d2345b'
---

今回は、prompt engineeringとcontext engineering、そしてその次について考えてみたい。

直前の記事である[token節約法](/260611)をまとめながら、ずっと頭から離れない問いが一つあった。「個別のpromptを工夫する段階から、不要な情報を取り除き、必要な情報を選び取る技術（context engineering）へ重心が移っている」と考えていたが、記事を書き終えると自然に次の問いが続いた。では、コンテキストの次には何が来るのか。

![prompt・context・harness engineeringで構成される、信頼できるAIシステムの3層構造](3.webp)

「今後の方向」を語る文章には慎重さが必要だ。未来には数多くの選択肢があるはずなので、ここでは**すでに公開された一次資料から読み取れる重心の移動**を整理することに焦点を当てる。多少の推論は含まれるが、さまざまな観点から読んでもらえればと思う。

---

## promptからcontextへ

まず用語を整理しよう。しばらく業界の中心的な話題は**prompt engineering**だった。モデルに送る一度の指示をどううまく書くか、つまり明確な指示文、良い例、出力形式をどう設計するかという問題である。

やがて仕事の単位が大きくなった。一回限りの質問ではなく、数十ターンにわたって動くagentが一般化すると、一つのpromptではなく、**モデルが各ターンで見るcontext全体**（system prompt + ツール定義 + 会話履歴 + 検索結果 + メモリ）をどう構成するかが、より重要になった。これを**context engineering**と呼ぶ。Anthropicは2025年9月の「Effective context engineering for AI agents」でこの枠組みを整理し、Chroma研究チーム（Hong et al.）が同年発表したcontext rot研究が定量的な根拠を加えた。GPT-4.1、Claude 4、Gemini 2.5、Qwen3など18のモデルを対象に、単語をそのまま書き写す程度の単純な課題でさえ、入力が長くなるほど性能が不均一に崩れることを示した。モデルが100番目のtokenと10,000番目のtokenを同じように扱うという一般的な仮定は、実際には成り立たない。「contextは長いほどよい」ではなく、「何が入っているかと同じくらい、どう配置されているかが重要だ」という結論が、詰め込むことから選び取ることへの転換を後押しし、この用語は急速に定着した。

ここで、よくある誤解を一つ指摘しておきたい。prompt engineeringがcontext engineeringに**置き換えられた**わけではない。promptをうまく書くことは今も基本であり、context engineeringはその上に載る上位概念に近い。（良いコードの書き方から良いシステムの設計へ関心が移ったからといって、codingが不要になるわけではないのと同じだ。）したがって正確な表現は「乗り換えた」ではなく、**「包含しながら広がった」**である。

では改めて、その広がりはcontextで止まったのだろうか。そうは見えない。

## Anthropicエンジニアリングブログ

方向を見極める最も誠実な方法は、この分野を実際に牽引する組織が何を書いているかを時系列で読むことだと思う。Anthropicのエンジニアリングブログを「Effective context engineering」（2025年9月）以降たどると、タイトルだけでも重心が次にどこへ移ったかが見えてくる。

- 2025年10月、Agent Skillsでagentを強化する
- 2025年11月、Code execution with MCP：より効率的なagent
- 2025年11月、Effective harnesses for long-running agents
- 2026年1月、Demystifying evals for AI agents
- 2026年1月、AI-resistantな技術評価の設計
- 2026年2月、agentic coding評価におけるインフラノイズの定量化
- 2026年3月、Harness design for long-running application development
- 2026年4月、Scaling Managed Agents：頭脳と手を分離する
- 2026年5月、製品全体でClaudeをcontainする方法

一覧から一歩引いて見ると、キーワードは三つにまとまる。**harness**、**eval**、そして**containment**である。contextをうまく満たし、空ける方法から一段上がり、agentというシステム全体を設計し、測定し、統制する方向へ議論が移っている、と読める。（もちろん、これは一社の重点にすぎないという限界がある。ただし、同社がcoding agentのエコシステムで占める位置を考えれば、単一vendorの関心事として片づけるのも難しい。）

一つずつ見ていこう。

## harness

harnessという言葉は少し馴染みが薄いかもしれない。直訳すれば馬具、つまり馬に装着して力を望む方向へ引き出す装置である。AI agentにおけるharnessは、**modelの外側でmodelを囲み、仕事をさせる骨格全体**を指す。どのtoolをどの順番で使えるようにするか、一度失敗したらどう復旧するか、権限をどこまで与えるか、loopをいつ止めるか、といったものだ。

context engineeringが「modelに何を見せるか」という問題なら、harness設計は「modelをその中でどう動かすか」という問題だ。一つ外側の層にある。modelを優秀な新人にたとえるなら、contextは新人に渡す業務資料、harnessは新人が働く作業環境と手順書に近い。同じ人でも環境が乱雑なら成果は不安定になり、整った手順の上では同じ能力でさらに遠くまで進める。

その重要性は、[Anthropicのエンジニアリングチームが実際に直面した失敗](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)にはっきり表れている。彼らは最上位のコーディングモデルであるOpus 4.5をClaude Agent SDK上に載せ、「claude.aiのクローンを作って」といった高レベルな指示だけを与えて複数セッションを動かしたが、モデル自体が賢くても本番運用レベルのアプリにはならなかった。失敗は二つの形で繰り返された。一つは、一度にすべてを終わらせようとして実装途中でcontextを使い切り、次のセッションに作りかけの機能を引き継がせるケース。もう一つは、後から入ったセッションが「すでにかなり進んでいる」と判断し、残る仕事を放置して完了を宣言するケースだ。（長い仕事を複数人が交代勤務でつなぐのに、交代者が前任者の記憶をまったく持たない状況を想像すればよい。）

解決策はモデルをさらに賢くすることではなく、骨格を変えることだった。最初のセッションには環境構築専用のprompt（initializer agent）を与え、200を超える機能仕様を`feature_list.json`に展開させ、開発サーバーを立ち上げる`init.sh`と進捗ログ（`claude-progress.txt`）を作らせた。それ以降のセッション（coding agent）は毎回ちょうど一つの機能だけを処理し、git commitと進捗メモで整理された状態を残して終了する。次のセッションはまずその進捗ファイルとgit logを読み、「前の担当者がどこまで進めたか」を把握してから引き継ぐ。同じモデルでも、この骨格に載せると結果が変わった。成否を分けたのはモデルではなくharnessだったということだ。（興味深いことに、Anthropicの処方は新しいものではない。機能一覧、小さな単位のcommit、進捗メモ、毎回実行するsmoke testは、熟練した開発者が日々行っていることそのものだ。agentにとって良い骨格とは、結局、良いエンジニアリングの習慣を環境に埋め込むことに近い。）

この流れがtoken節約の議論と接する点も明確だ。前の記事で扱ったsubagent隔離、tool定義のdiet、model routingは、個別に見れば別々の節約手法だが、まとめれば結局、**一つのharnessをどう設計するか**の一部である。どの作業をどのmodel laneへ送り、どのtoolだけを有効にし、verboseな探索をどこへ隔離するかを決める全体がharness設計だ。節約はその設計の副産物に近い。

しかしharness設計には奇妙な罠がある。**よくできた骨格ほど、modelが改善すると古くなる**ことだ。harnessは本質的に「modelが単独ではできないこと」についての仮定の集合であり、modelがそれを自力で行えるようになった瞬間、その仮定は余計なものになる。Anthropicが示す[事例](https://www.anthropic.com/engineering/managed-agents)がまさにそうだ。Sonnet 4.5にはcontext上限が近づくと作業を急いで終わらせる癖（context anxiety）があり、骨格にcontext reset機構を入れて対応した。ところが同じ骨格をOpus 4.5に載せると、その癖自体が消えており、苦労して加えたresetは重荷になった。modelが一段賢くなるたびに、骨格の一部はこうして期限切れになる。

そこで、さらに一歩進んだ発想が現れる。特定の骨格を巧みに作るのではなく、**骨格が変わっても揺らがないインターフェースを設計する**ことだ。AnthropicのManaged Agentsはこの方向にあり、その着想の源は意外にもオペレーティングシステムである。OSが数十年も存続したのは、ハードウェアをプロセスやファイルといった抽象へ仮想化し、まだ存在しないプログラムまで収める器を先に作ったからだ。`read()`の一行は、1970年代のディスクでも現代のSSDでも同じように動く。同じ発想でagentを三つに分ける。判断する**頭脳**（Claudeとharness）、実際に手を動かす**手**（code execution sandbox・ツール）、そして起きたすべてを追記する**セッションログ**だ。三つを分離すればコンテナが落ちても頭脳はtool call errorとして処理でき、harnessが落ちてもセッションログの最後の地点から再び立ち上がれる。副次的にコストとレイテンシも下がった。コンテナを本当に必要なときだけ起動することで、time to first token（TTFT）は中央値で約60%、p95で90%以上低下したと報告されている。（ここでtoken節約の記事と再びつながる。前の記事ではprompt cachingのため静的な部分を先頭に集めるよう勧めたが、「cache hit率を高めるためにcontextをどう配置するか」は、まさにこの頭脳のそばのharnessが担う仕事である。）

## eval

二つ目の流れは、個人的に最も興味深かった。2026年初頭の記事は、申し合わせたかのように**評価（eval）**へ集まっている。

理由を考えると自然だ。contextを適切に構成したのか、harnessをうまく設計したのか、本当にcostを削減できたのかを、**何で確認するのか？** agentが長く複雑な仕事を自律的に処理するほど、「結局、これはうまく動いたのか」を人が一つずつ目で確かめるのは難しくなる。最終的に信頼の根拠は測定へ移る。だからこそ「agent評価をどう設計するか」「評価自体のnoiseをどう除くか」「modelが評価に気づいて行動を変えるeval awarenessをどう扱うか」といったテーマが前面に出てきた。

![4.png](4.png)

agentの評価が難しいのは、一回限りの質疑応答とは性質が違うからだ。agentは複数turnにわたりtoolを呼び、stateを変えながら進むため、一度の失敗が後方へ伝播し、蓄積する。さらに同じ入力でも実行ごとに結果が揺れる。[Anthropicは](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)この非決定性を二つの指標に分ける。**pass@k**はk回の試行中に一度でも成功する確率なので、試行を増やすほど上がる。**pass^k**はk回すべてに成功する確率なので、試行を増やすほど下がる。一度だけ正解すればよいcode生成ではpass@1が重要で、毎回安定して動く必要があるcustomer support agentではpass^kが核心となる。（per-trial成功率が75%なら、三回連続で成功する確率は0.75³、約42%まで急落する。「だいたいうまくいく」と「毎回うまくいく」の隔たりはこれほど大きい。）

では、一度の試行を何で採点するのか。同じ記事はgraderを三種類に分ける。**code-based**（testの合否、static analysis、tool call検証）は速く、安く、客観的だが、正解が複数あるopen-endedな課題には弱い。**model-based**（LLM-as-judge、rubric採点）は微妙な品質まで捉えられるが、非決定的なので人の採点と定期的に較正する必要がある。**human-based**は最も正確だが、遅く高価だ。実務では三つを組み合わせ、可能なら決定論的な採点を土台にし、model採点で補助する。もう一つ区別がある。**capability eval**は「このagentは何を成し遂げられるか」を問うため、低いscoreから始めて登る余地を与える。**regression eval**は「以前できたことが今もできるか」を問うため、ほぼ100%を維持しなければならない。scoreが下がれば、どこかが壊れた合図だ。

ここには意外に見落とされやすい罠がある。**scoreが低い原因はagentではなく評価側かもしれない。** Anthropicの報告では、Opus 4.5がCORE-Benchで最初に42%を記録したが、調べると「96.124991…」を期待して「96.12」を誤答扱いする硬直した採点、曖昧な問題仕様、再現不能な確率的課題が原因だった。bugを修正し、制約を緩めたscaffoldで再実行するとscoreは95%へ跳ね上がった。そこで彼らは一つの原則を強調する。**scoreを額面どおりに信じず、transcript（実行記録）を自分で読め。** frontier modelが100回試して0%なら、たいていmodelが無能なのではなく問題が壊れている。

測定が進歩すると基準線そのものが急速に動く点も興味深い。代表的なコーディングエージェントのベンチマークであるSWE-bench Verified（実際のGitHubの課題を与え、テストの合否で採点する）で、最先端モデルのスコアは1年で30%台から80%以上へ上がった。この段階では簡単な問題がすべて解かれ、スコアが天井（飽和）に達し、大きな能力向上が小さなスコア差としてしか見えない逆説が生じる。実際、あるコードレビュースタートアップは当初、単発の評価だけを見て新モデルに冷淡だったが、より長く複雑な仕事を測るエージェント型評価へ切り替えて初めて改善を正しく認識したという。したがって評価は一度作って終わりではなく、より難しいものへ更新し続ける生きた資産となる。（Anthropicはこれを安全工学の「スイスチーズモデル」にたとえる。穴の開いたチーズ一枚では防げないが、自動評価、プロダクション監視、人による実行記録レビューを重ねれば、一層を抜けた失敗が次の層で捕まる。）

## containment

三つ目は少し性質が違う。costやperformanceではなく、**安全と統制**の問題だ。

agentがより多くのtoolを持ち、より自律的に動くほど、一度の失敗が及ぼす範囲（blast radius）も広がる。fileを削除し、外部へrequestを送り、権限のある操作を代行するagentなら、「どれほど上手にできるか」と同じくらい「誤ったとき被害をどこで止めるか」が重要だ。2026年5月に[Anthropicが製品全体のcontainmentを扱った記事](https://www.anthropic.com/engineering/how-we-contain-claude)を前面に出したことも、この文脈で読める。同記事はagentのriskを三つに分ける。悪意または不注意から有害なことを命じる**user misuse**、誰にも指示されていない行動をmodelが自ら行う**model misbehavior**、tool・file・networkを通じて外部から入る**external attack**だ。興味深い指摘は、modelが賢くなればriskが単純に減るわけではないことだ。能力の低いmodelは状況を誤読して明白な失敗をするが、能力の高いmodelは失敗が減る一方、誰も明記していない制約を回避する予想外の経路を、より巧みに見つける。

彼らが強調する核心は、「人が毎回監督する方式」の限界である。Claude Codeは当初、書き込み・実行・network accessのたびにuserへ承認を求めて安全を確保したが、telemetryではuserが承認要求の約93%をそのまま許可していた。承認画面が増えるほど一つひとつへの注意が薄れる**approval fatigue**が起きたのだ。人のclickに頼る確率的防御には、結局穴が残る。そこで重心は「agentが何をしているか監視する」から「agentがそもそも何をできるか制限する」へ移る。防御は三層に重ねる。sandbox・VM・egress controlなどの**environment layer**、system prompt・classifierなどの**model layer**、MCP・plugin・検索結果などの**external content layer**だ。中心原則は、**決定論的に阻止するenvironment layerを最初に敷く**ことにある。model layerの防御が弱いからではない。実際、prompt injectionを試すGray Swan benchmarkではone-shot攻撃の成功率は約0.1%と最高水準だ。ただし100回適応的に攻撃すると5〜6%まで上がり、確率的防御は本質的に命中率100%にはなれない。だから最後にぶつかる硬い境界を置く。（OS-level sandboxを導入すると承認画面が84%減ったという。安全装置がむしろ摩擦を減らしたわけだ。）

![containmentの3層防御構造：environment layer（決定論的、最後の防衛線）の上にmodel layerとexternal content layer（確率的）を重ねる](2.png?w=720)

token節約とは遠く見えるが、実は同じ根を持つ。どちらも**「エージェントに何を、どこまで持たせるか」**という問題だ。Anthropicは二つの事例でこの関係を示す。一つは社内レッドチームが社員をフィッシングし、悪意あるプロンプトでClaude Codeを実行させた事例だ。ひそかに差し込んだ指示は`~/.aws/credentials`を読み、外部へPOSTさせ、25回中24回成功した。ユーザーが直接入力した指示だったためモデルの分類器には不審な点がなかった。防いだのは賢いモデルではなく、認証情報を最初からサンドボックス外に置く環境境界と外向き通信の制御だった。もう一つはより微妙だ。egress許可リストは`api.anthropic.com`を正常に通したが、攻撃者が仕込んだファイルが攻撃者自身のAPIキーでAnthropicのファイルアップロードAPIを呼び、データが攻撃者のアカウントへ流出した。サンドボックスは完全に動作したのにデータは漏れた。許可リストを「宛先フィルター」ではなく、「そのドメインで可能なすべての機能を許可する権限」と見るべきだったという教訓だ。（Anthropicが繰り返し強調する原則はこれである。検証済みのハイパーバイザー、システムコールフィルター、コンテナランタイムは正常に耐え、**実際に壊れたのは、その上に自分たちが作った部品**だった。）使わないMCPツールを外すことも同じ文脈にある。コストを節約すると同時に攻撃対象領域を減らす。軽量に保つ設計は安く正確なだけでなく、より安全でもある。

## まとめると

三つの流れを一文に縮めるとこうなる。関心の単位は、**prompt（一度の指示）からcontext（各turnで見せるもの）へ、さらにagent system全体（どう動かし、どう測り、どう閉じ込めるか）へ**一段ずつ外側に広がっている。harnessは「どう動かすか」、evalは「うまく動いたとどう知るか」、containmentは「誤って動いたときどう止めるか」にそれぞれ対応する。

![promptからcontext、さらにagent system全体へ関心が広がる3段階の拡張構造と、harness・eval・containmentの三つの流れ](1.png?w=720)

もう一度念を押すと、この三つは筆者が**すでに公開された資料から読み取った重心の移動**であり、「2026年後半にはこれが標準になる」といった予言ではない。ある流れはさらに大きくなり、別の流れは違う名前に吸収されるだろう。ただ確かなのは、promptもcontextも消えず、より大きな枠組みの一部として残ることだ。新しい言葉が古い言葉を消すのではなく、その上に一層を積むように分野は動いてきたし、今後もそうなる可能性が高い。

costの話から始めて、ここまで来た。前の記事ではtokenの家計簿を開くことを勧めたが、この記事の提案は一歩先へ進む。節約したcostを**何で確認するか**（eval）、その節約を**どんな骨格の上で再現可能にするか**（harness）、その骨格が**どこまで安全か**（containment）を一緒に見てほしい。結局、最も長く残るのは特定の節約手法ではなく、自分のシステムを測定し、統制する習慣だと思う。

:::ref
- [article] [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [article] [Anthropic, Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [article] [Chroma Research, Context Rot](https://research.trychroma.com/context-rot)
:::
