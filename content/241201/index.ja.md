---
emoji: 🔧
title: 'BiomeはESLintとPrettierを置き換えられるのか？'
seoTitle: 'Biome vs ESLint vs Prettier — Rust製オールインワンツールチェーンの性能比較と移行'
date: '2024-12-01'
categories: フロントエンド JavaScript
description: "BiomeのLintとフォーマット性能をESLint、Prettierと比較する。Rust製オールインワンツールチェーンの実務導入経験と移行ガイドをまとめた。"
keywords: "Biome vs ESLint, Biome vs Prettier, Biome移行, JavaScriptリンター比較, Rust製リンター, フロントエンド開発ツール"
locale: ja
translationOf: '241201'
sourceHash: 16af1949a7c5575b586c919af82c78646819b783ebee024a579d48a0c0ac5032
---

今回は、Biomeというツールについて紹介したい。

筆者のチームでは、WebStormやVSCodeなど異なるIDEを使う環境で、一貫したコードスタイルを維持することにかなり苦労していた。IDEごとに設定ファイルを個別管理する手間もあり、フォーマットの違いによって、コードレビューでロジックとは無関係な指摘が飛び交うことも多かった。

そうした状況でESLintのフォーマット関連ルールがDeprecatedとなり、新たな選択肢を探す必要が生じた。**Prettier + ESLint**の組み合わせではツール間の競合を避けるための追加設定が必要で、**@stylistic/eslint-plugin-ts**はまだコミュニティの初期段階にあり、安定性の検証が十分ではなかった。そんなときにBiomeというツールに関心を持った。

では、Biomeとは正確にはどのようなツールで、本当にESLintとPrettierを置き換えられるのだろうか？

<hr>

## Biomeとは？

BiomeはWebプロジェクト向けのオールインワン（All-in-One）ツールチェーンだ。JavaScript、TypeScript、JSX、CSS、JSON、GraphQLなどのコードフォーマットとLintを一つのツールで統合的に提供する。ESLintとPrettierがそれぞれ担ってきた役割を、単一のバイナリで解決することが中核となる思想だ。

Biomeの前身は[Rome](https://github.com/rome/tools)である。**Rome Tools Inc.** は2021年に450万ドルのベンチャー投資を獲得して意欲的にスタートしたものの、2023年半ばに全社員が解雇され、リポジトリもアーカイブされた。その後、主要コントリビューターがプロジェクトをフォークし、2023年8月にBiomeとして再出発した。Rome時代の「大言壮語、成果不足」というイメージから脱し、実用的で継続的なリリースによって信頼を築いている。

最大の特徴はRustで書かれていることだ。それが性能にどのような違いをもたらすのかは、後ほど詳しく取り上げる。

<hr>

## なぜBiomeを使うのか？

Biomeを選ぶ理由は、大きく三つにまとめられる。

**一つのツールでフォーマットとLintの両方を処理できる。** ESLint + Prettierの組み合わせでは、二つのツール間でルールが競合しないよう、`eslint-config-prettier`のような追加設定が必要だった。Biomeはこの複雑さを根本から取り除く。

**圧倒的な性能を持つ。** 公式ベンチマークによると、Prettierより約25倍、ESLintより約15倍高速だ。この数値が実際にどの程度なのかは、後ほど直接比較する。

![1.png](1.png)

**既存ツールとの互換性がある。** Prettierと約97%のフォーマット互換性を提供し、ESLintの主要ルールをビルトインで備えている。`eslint-plugin-react-hooks`や`eslint-plugin-jsx-a11y`など、よく使われるプラグインのルールも内蔵されているため、移行の負担は比較的小さい。

<hr>

## どう使うのか？

Biomeの設定は非常に簡単だ。[公式ドキュメント](https://biomejs.dev/guides/getting-started/)にも分かりやすく説明されているので、参考にしてほしい。

まずBiomeをインストールする。

```bash
npm install --save-dev --save-exact @biomejs/biome
```

次に設定ファイルを生成する。

```bash
npx @biomejs/biome init
```

すると`biome.json`ファイルが作成される。ここにチームのフォーマットとLintのルールを定義すればよい。

IDE拡張機能もインストールする必要がある。VSCodeを使う場合は[VSCode Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)、WebStormを使う場合は[WebStorm Biome](https://plugins.jetbrains.com/plugin/22761-biome)プラグインをインストールしよう。

最後に、VSCodeの`settings.json`へ以下の設定を追加すると、保存時にフォーマットとLintが自動で適用される。

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

<hr>

## 直接比較してみよう

速いと言葉で説明するだけでは実感しにくいため、同じプロジェクトでBiomeとESLint + Prettierを直接比較した。左がBiome、右がESLint + Prettierだ。

### Viteプロジェクトのローカル実行時間

![biome1.png](biome1.png)  ![lint1.png](lint1.png)


Biomeは**506ms**、ESLint + Prettierは**630ms**で、約20%速い実行時間を示した。

<hr>

### Viteプロジェクトのビルド時間

![biome2.png](biome2.png) ![lint2.png](lint2.png)


Biomeは**117.13s**、ESLint + Prettierは**131.48s**で、約10%速いビルド時間を示した。

<hr>

### Lint処理

![biome3.png](biome3.png) ![lint3.png](lint3.png)

最も大きな差が現れたのはLint処理だった。Biomeは**0.79s**（CPU 0.470s）、ESLintは**16.32s**（CPU 8.600s）で、**Biomeが約20倍高速な性能**を示した。CPU使用量もはるかに効率的だった。

開発環境でも体感差は大きいが、CI/CDパイプラインで数百のファイルを検査すると、その差はさらに劇的に広がる。Biomeはnpmでインストールせずにバイナリを直接実行できるため、CIのコールドスタート時間まで短縮できる。

<hr>

![3.jpeg](3.jpeg)

うーん……（ここまで来ると、使わない理由を探すほうが難しい。）

<hr>

## なぜこれほど速いのか？

「Rustで作られているから速い」というのは正しいが、それだけでは説明が足りない。Biomeの性能優位を生み出している具体的な技術要因を見ていこう。

<hr>

### Rustの低レベル性能

| ![5.webp](5.webp) | ![6.webp](6.webp) |
| --- | --- |

Biomeはシステムプログラミング言語であるRustで書かれている。Rustはゼロコスト抽象化（Zero-cost Abstraction）を志向する言語で、高水準の抽象化を使っても、手動で最適化した低レベルコードと同等の性能を発揮する。また、ガベージコレクター（GC）を使わず、所有権（Ownership）システムによってメモリを管理するため、GCによるランタイムオーバーヘッドが発生しない。

一方、ESLintとPrettierはJavaScriptで書かれ、Node.jsランタイム上で動作する。V8エンジンのJIT（Just-In-Time）コンパイルがJavaScriptを最適化するものの、インタプリタ言語の根本的な制約とガベージコレクションのコストを完全には避けられない。

<hr>

### 単一パースアーキテクチャ

Biomeは一つのパーサー（Parser）でコードを一度だけパースし、AST（Abstract Syntax Tree、抽象構文木）を生成する。このASTをフォーマットとLintの両方で再利用する。

ESLint + Prettierの組み合わせを使うとどうなるだろうか。ESLintがコードをパースしてASTを作り、Lintを実行した後、Prettierが同じコードを再びパースして別のASTを作り、フォーマットを実行する。同じファイルに対してパースが二度発生するわけだ。Biomeの単一パースアーキテクチャは、この重複を根本から排除する。

<hr>

### ネイティブ並列処理

![7.png](7.png)

Rustの並行処理モデルを活用し、Biomeは複数のスレッドでファイルを並列処理する。作業を小さな単位に分割し、Work-stealingスケジューラーによってスレッド間の負荷を効率よく分散する。Rustの所有権システムはコンパイル時にデータ競合（Data Race）を根本から防ぐため、ランタイムでの同期コストも最小限に抑えられる。

Node.jsは基本的にイベントループベースのシングルスレッドモデルだ。Worker Threadsを使えば並列処理は可能だが、スレッド生成とメッセージパッシングによる追加のオーバーヘッドが発生する。BiomeはOSレベルのネイティブスレッドを直接活用するため、こうしたオーバーヘッドなしにCPUコアを最大限利用できる。

<hr>

### メモリ効率に優れたAST処理

![4.svg](4.svg)

BiomeはCST（Concrete Syntax Tree、具象構文木）を使用する。Biomeの公式アーキテクチャドキュメントによると、このCSTはrowanライブラリの内部フォークを基盤に実装したGreen/Red Treeパターンで、コメントや空白など、元のコードに含まれるすべての情報を保持する。RowanのArena方式のメモリ割り当ては、ノードを連続したメモリ領域に配置してCPUのキャッシュ局所性（Cache Locality）を高め、不要なオブジェクト割り当てを最小限に抑える。

JavaScriptのオブジェクトベースのAST処理では、各ノードが独立したヒープオブジェクトとして存在するため、メモリが分散し、GCへの負荷が高くなる。Biomeの方式なら、より少ないメモリで、より高速なツリー走査が可能になる。

<hr>

## では、Biomeを導入すべきか？

Biomeの性能と利便性は明らかに魅力的だ。しかし、すべてのプロジェクトに無条件で導入することが正解だとは思わない。現実的な検討事項をいくつか確認しよう。

<hr>

### Biomeが適している場合

- **大規模なコードベース**を運用しており、ビルドやLintの性能が重要な場合
- CI/CDパイプラインでコード検査の時間を短縮したい場合
- ESLint + Prettierの設定の複雑さに疲れた場合
- 新しいプロジェクトを始めるにあたり、簡潔なツール設定を求める場合

筆者のチームも大規模プロジェクトを運用する中で、CIパイプラインのLintに多くの時間を費やしており、開発者も遅いLint速度に不便を感じていたため、Biomeの導入を決めた。

<hr>

### 注意すべき点

**プラグインエコシステムの制約が最も大きい。** ESLintには数千のコミュニティプラグインが存在するが、Biomeはビルトインルールを中心に運営されている。`eslint-plugin-react`、`eslint-plugin-react-hooks`、`eslint-plugin-jsx-a11y`、`eslint-plugin-unicorn`、`typescript-eslint`など主要プラグインのルールは相当数が内蔵されているものの、各プラグインのすべてのルールが移植されたわけではない。Biome v2ではGritQLベースのプラグインシステムの導入が予告されているが、まだ実験的な段階だ。`@next/eslint-plugin-next`や`eslint-plugin-angular`のようなフレームワーク固有のルールが不可欠なプロジェクトでは、慎重に移行する必要がある。

**言語サポートの範囲も確認が必要だ。** JavaScript、TypeScript、JSX、CSS、JSON、GraphQLは安定してサポートされているが、VueやSvelteのSFC（Single File Component）ファイルは`<script>`ブロックのみ部分的に対応している。HTML、YAML、Markdownはまだサポートされていない。

**ESLintも進化していることを忘れてはいけない。** ESLint v9（2024年4月）で導入されたFlat Config（`eslint.config.js`）は、従来の`.eslintrc`方式の複雑さを大幅に軽減した。さらに`@eslint/json`（2024年10月）と`@eslint/css`（2025年2月）をリリースし、JavaScript以外の言語にもLintの範囲を広げている。ESLint Stylistic（`@stylistic/eslint-plugin`）プロジェクトは、PrettierなしでもESLintだけでフォーマットを処理できる選択肢を提供する。Biomeの「オールインワン」という利点が、ESLintエコシステムの進化によってやや薄まりつつある構図だ。

また、RomeからBiomeへ移行した歴史も覚えておく必要がある。Romeがアーカイブされた際に既存ユーザーが経験した不便は、ツール選びにおいてプロジェクトの持続可能性がいかに重要かを示す事例だ。幸いBiomeはOpenCollectiveとGitHub Sponsorsによる資金で運営され、安定したリリースサイクルを維持している。

![8.png](8.png)

npm trendsを見ると、Biomeの週間ダウンロード数は約690万で、ESLintの約1億2,000万、Prettierの約8,200万とはまだ大きな差がある。しかし、Biomeの成長速度は注目に値する。わずか1年あまりで週間ダウンロード数が3〜4倍以上に増え、特に新規プロジェクトでの採用率が目に見えて高まっている。

<hr>

## おわりに

BiomeがESLintとPrettierを完全に置き換えられるかという問いに対する筆者の答えは、**「まだだが、十分に有力な選択肢」**である。

性能は圧倒的で、設定は簡潔、開発速度も速い。ただし、プラグインエコシステムの未成熟さと一部言語サポートの制約は、プロジェクトによっては障害になり得る。プロジェクトの技術スタックとチームの要件を綿密に検討した上で、導入の可否を判断するのが望ましい。

一つ確かなのは、フロントエンドツールのエコシステムが「より速く、より簡潔で、より統合された」方向へ進んでいることだ。Biomeがその流れの先頭に立っていることは否定できない。今後の成長が期待されるツールであることは間違いない。

## 参考資料

:::ref
:::
