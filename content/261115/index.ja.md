---
emoji: '🧭'
title: 'Biomeを2年間使った感想'
seoTitle: 'BiomeとESLintを2年間使った感想'
date: '2026-11-15'
categories: フロントエンド JavaScript
description: 'Biomeを約2年間使い、設定統合と検査速度を測定。ESLintで不足する検査、型情報ルールのコスト、Biome 2移行の差を実際のコードと公式ドキュメントをもとに解説し、実測結果と移行時の注意点も詳しくまとめ、導入時の判断材料も示す。'
keywords: 'Biome, ESLint, Prettier, Biome 2, 移行, フロントエンド, 静的解析'
locale: ja
translationOf: '261115'
sourceHash: feec0e755ce7548b6041920f4a0c6c5c69e93f2b62859ef17347e02523e41d8a
---

ESLint と Prettier を使っていて、Biome に移行するか、Biome 1 から 2 に上げるか悩んでいる開発者に向けて、筆者のコードで得た測定値と移行結果をまとめる。筆者は会社のフロントエンドサービス2つに、2024年11月と2025年1月に Biome 1.9.4 を導入した。[BiomeはESLintとPrettierを置き換えられるか？](/241201)は、導入直後に書いた紹介記事だ。

先に結論を述べると、2つのサービスでは Biome によって設定が一か所にまとまり、ファイル数がほぼ2倍になった後も全体検査は0.2秒台だった。その過程で ESLint の検査の一部を失い、Biome 2 へのアップグレードでは import の並べ替えを含む大きな diff が生じた。筆者が確認した結果をもとに、Biome に任せられることと任せられないことを整理する。

## 設定の統合と検査速度

移行前は設定が一か所で管理されていなかった。ESLint の設定は `.eslintrc.js` と `package.json` の `eslintConfig` に分かれていたが、ESLint 8 は同じフォルダ内の設定ファイルを1つだけ読み込んでいた。`package.json` 側の設定には airbnb の継承設定が含まれていたものの、airbnb 設定はインストールされていなかった。適用されないルールが、適用されるかのように記載されていた。

Prettier のオプションも `.prettierrc` と ESLint の `prettier/prettier` ルールに分かれており、import の並べ替えは ESLint の設定に別途記載されていた。Biome では lint、format、import の並べ替えを `biome.json` 1つで設定する。lint と format 関連の開発依存関係は、2つのサービスでそれぞれ12種類から1種類、10種類から1種類に減った。設定を判定する主体が一つになったことで、記載されたルールと実際に適用されるルールが食い違う余地も減った。

速度は Apple M2 Max 12コアで、導入直前のコードにある `src` の751ファイルをキャッシュなしで検査して比較した。ESLint 8.57 のスタックは10.34〜10.93秒、Biome 1.9.4 の `check` は lint、format、import の並べ替えを含めて0.21〜0.22秒だった。それぞれ5回測定した。ただし、両者が検査したルールの組み合わせは同じではない。

ESLint の `prettier/prettier` ルールを無効にすると、5.31〜5.35秒と半分ほどに減った。Prettier を lint ルールとして実行し、ファイルごとに再度パースする分が時間の半分を占めていた。ESLint の `--cache` が埋まった後は0.85〜0.91秒だった。Biome をスレッド1つに制限した場合は1.26秒だった。

筆者はこの結果から、0.22秒のうち並列処理が約6倍、残りのネイティブバイナリと、一度パースしたツリーを lint と format で共有する仕組みが約8倍を占めると逆算した。この値は個々の要素をそれぞれ制御して測定した結果ではなく、上記の測定値をもとにした推論だ。

2026年11月時点で、同じサービスの `src` ファイルは1,457個に増えている。Biome 1.9.4 の `check` が報告した時間は220〜275ms、Biome 2.6.8 は215〜236ms だった。それぞれ3回測定した。ファイル数がほぼ2倍になったのに、報告された検査時間はほぼ変わらなかった。筆者にとっては、キャッシュを別途管理せずに全体検査を実行できることが実務上の利点だった。

## Biomeのパースと実行の仕組み

Biome のパーサーは構文エラーがあっても復旧できるように設計されている。公式の architecture ドキュメントによると、パース結果は CST(concrete syntax tree)で、rowan ライブラリの内部フォークを使って green/red tree パターンを実装している。CST はコメントや空白も保持する。

不正な構文は Bogus ノードとして表される。これにより、ルールやフォーマッターがその部分を正常な構文として扱わないようにする。公式ドキュメントでは、Biome のパーサーは Prettier のパーサーより意図的に厳しく、フォーマッターは Bogus ノードを修正せず、そのまま出力すると説明している。筆者のチーム設定は `formatWithErrors: true` なので、構文エラーのあるファイルもフォーマットする。

Biome はサーバーとクライアントの構成も備えている。バックグラウンドデーモンがエディターと CLI のリクエストを処理し、エディター拡張は `biome lsp-proxy` を使って LSP メッセージをデーモンに送る。公式ドキュメントでは、フォーマッターの中間表現(IR)を確認する `biome inspect` コマンドも紹介されている。このコマンドは2.6から利用できる。

scanner は常に基本実行に含まれるわけではなく、opt-in だ。project ドメインルールや型情報ルールを有効にすると、scanner がネストした `biome.json` と `.gitignore` を探し、`package.json` とソースファイルをインデックス化する。公式 FAQ では、約2,000ファイルの場合、scanner なしなら約800ms、scanner を有効にすると約2秒と案内している。筆者は、基本の `check` の測定値と、型情報ルールを有効にした測定値は同じ実行範囲を測っているわけではないと考える。

## ルールと修正の範囲

Biome の lint ルールは Accessibility、Complexity、Correctness、Nursery、Performance、Security、Style、Suspicious の8グループに分かれている。v2からはすべてのルールにデフォルトの重要度があり、Style グループはデフォルトで警告を出す。Nursery ルールは安定版のルールと異なり、設定で明示的に有効にする必要がある。

ルールは診断を出すだけでなく、コードを修正する場合もある。safe 修正はコードの意味を変えないことが保証され、`--write` で適用される。unsafe 修正は意味を変える可能性があり、`--write --unsafe` が必要だ。`noFloatingPromises` の修正は unsafe だ。

Biome の抑制コメントには理由が構文として含まれる。たとえば `// biome-ignore lint/<그룹>/<규칙>: <이유>` という形式を使う。ファイル全体の抑制にはファイル先頭の `biome-ignore-all` を、特定範囲の抑制には `biome-ignore-start` と `biome-ignore-end` を使う。使われていない抑制コメントは `suppression/unused` の診断として表示される。

筆者のコードには、React フックの依存配列を検査する recommended ルール `useExhaustiveDependencies` の警告が326件残っている。チームはこれらをエラーではなく警告としている。

## 型情報とprojectルール

Biome は型チェッカーではない。公式ドキュメントが説明しているのは、`typescript` パッケージなしでも型情報に基づく lint ルールを使えるという範囲だ。筆者の2つのサービスでは、CI の型検査は引き続きビルドコマンド内の `tsc` が担っている。

Biome 1 のルールは単一ファイルの構文だけを見るため、呼び出した関数が Promise を返すかどうかを知る必要のある検査はできなかった。Biome 2 では、TypeScript コンパイラーに依存しない型情報 lint ルールが導入された。最初のルール `noFloatingPromises` は、予備テストで typescript-eslint が検出するケースの約75%を検出したと公表された。v2.1では型推論が改善され、その割合が約85%になったとされ、`noMisusedPromises` を含む7つのルールが追加された。

筆者が2.6.8で現在のコードに `noFloatingPromises` を有効にすると、22件が検出された。そのうちの一例は、Promise を返す確認コールバックを `await` せずに呼び出した直後、ウィンドウを閉じるコードだった。このルールは2.6.8でも Nursery グループに属する。公式ドキュメントでは Nursery を実験段階と説明し、動作はいつでも変わる可能性があるとしている。デフォルトの重要度は info で、有効にするとプロジェクトファイルを走査する scanner と型推論エンジンが動き、検査時間が延びる。

project ドメインルールは `package.json` の依存関係を見て、ルールの組み合わせを自動で有効にする。たとえば React 16以上、Next 14以上、Vitest などのテストツールを基準に、関連ルールを有効化する。筆者は2.6.8で、現在のコードの `src` にある1,438ファイルを Apple M2 Max で直接測定した。現在の設定のまま lint のみを実行すると122〜160msで、型推論を使う `noFloatingPromises` だけを追加すると225〜262msだった。

`noImportCycles` は Suspicious グループのルールで、デフォルトの重要度は警告だ。公式ドキュメントでは計算コストが大きいと説明している。筆者のコードでは、このルールを有効にした実行は253〜264msで、警告が88件出た。

`noUnresolvedImports` は、import した名前が実際に export されているかを確認する Correctness グループのルールで、デフォルトの重要度はエラーだ。動的な `import()` と `require()` は検査しない。実際の `node_modules` を接続した状態で実行した時間は243〜253msで、エラーが553件出た。このコードはビルドとテストを通過するが、553件はすべて実際のエラーではなかった。

そのうち、Vitest からインポートした `describe`、`it`、`expect`、`vi` などの名前が499件、React の `Fragment`、`Suspense` が28件、Vite の `?url`、`?worker` サフィックスを付けた import が25件だった。残り1件はパッケージだった。React パッケージのエントリーファイルは CommonJS の `module.exports` で export している。Biome はこのような export を静的に見つけられなかったようだ、というのは筆者の推論だ。

`node_modules` を接続せずに同じルールを実行すると、約700msで4,136件が出た。この結果をもとに筆者は、現在のコードでは project ルールによって ESLint 時代の `import/no-unresolved` 検査を復活させるのは難しいと判断した。この判断は筆者のコードから得られた結果に限られる。

ルールごとの時間は、v2.4から使える `--profile-rules` で確認した。前処理の時間を除き、スレッドごとのルール実行時間を合計する方法だ。筆者の測定では `useExhaustiveDependencies` が54.6msで最も長く、24,086回実行された。次は `noFallthroughSwitchClause` の13.0ms、`noUnusedVariables` の9.3ms、`useImportType` の8.7msだった。全体の `check` は format と import の並べ替えを含めて215〜236msだった。lint のみを実行した122〜160msとの差が format と assist によるものだというのは筆者の推論だ。oxlint も同じコードで測ろうとしたが、今回は測定できなかったため、速度比較には含めない。

## 2年間で増えた機能

筆者が導入した1.9.4は、npm では2024年10月17日に公開された。v2.0.0は2025年6月17日、v2.6.8は2026年11月15日に公開された。その間 Biome は型情報 lint だけでなく、対応範囲と実行ツールも拡張した。

v2では GritQL プラグインと、複数の設定ファイルを置く monorepo のサポートが追加された。

v2.3では Vue、Svelte、Astro のサポートが実験段階として追加され、`!` で除外する新しい無視構文と Tailwind v4 のディレクティブ解析も含まれた。v2.4では JavaScript 内の CSS と GraphQL の断片を検査し、HTML アクセシビリティルール15個が追加された。ルールごとの時間を測る `--profile-rules` もこのバージョンに入った。

v2.5では lint ルールが500を超え、`--watch` モードが追加された。GritQL プラグインはコード修正の提案もできるようになった。v2.6では Markdown、SCSS、YAML をサポートし、JavaScript プラグインを developer preview として公開した。

ESLint プラグインのエコシステムをそのまま持ち込むことはできない。GritQL プラグインは Biome の Rust ルールが使う semantic model にアクセスできない。JavaScript プラグインは developer preview のため、パッチリリースでも変わる可能性がある。したがって、既存の ESLint プラグインをそのまま持ち込めると判断する根拠はない。

2026年11月15日時点の公式サイトによると、Biome は Prettier と97%互換で、lint ルールは816個ある。97%をどのように測定したかは公式ドキュメントに記載されていない。

Biome のダウンロード数も増えた。npm の週間ダウンロードを、2024年11月11日から17日までと2026年11月9日から15日までで比較すると、Biome は124万から2,739万に増加した。同じ期間の ESLint は4,806万から2億705万、Prettier は4,379万から1億8,472万、oxlint は9万から4,828万だった。

Prettier とフォーマット結果が異なる具体例もある。オブジェクトやクラスのプロパティの引用符を外す場合、Prettier は ES5 識別子までを対象にするが、Biome は ES2015以降の識別子も対象にする。計算されたキー内の代入式では、Biome は括弧を外す。

## ESLintで抜けた検査

Biome に移行した際、一部の検査は実際に抜けた。`import/no-unresolved` と `import/named` は Biome 1.9 にはなく、import のパスや名前の検査を担えなかったため、筆者のサービスでは `tsc` が代わりに確認する。ただし、前の節で触れた `noUnresolvedImports` の実測では実際のエラーではない診断が出たため、project ルールで置き換えるのは難しいと判断した。

フックの呼び出し位置の検査も抜けた。ESLint ではエラーだったが、導入時には Biome の `useHookAtTopLevel` を無効にしていた。ファイル名とフォルダ名のルールも抜けた。当時 ESLint の `check-file` では336件に該当したが、Biome にはファイル名用の `useFilenamingConvention` しかなく、フォルダ名のルールはない。

未処理の Promise を検査するルールも Biome 1 にはなかった。関数の戻り値が Promise かどうかを知るには型情報が必要だが、Biome 1 のルールは単一ファイルの構文しか見ていなかった。ブラウザーの `unhandledrejection` を受け取るエラーモニタリングは、一部を検出するだけのセーフティネットだった。Biome 2 には `noFloatingPromises` が導入されたが、このルールは Nursery グループに属し、有効にすると実行時間が延びる。

## Biome 2への移行

2つのサービスはまだ Biome 1.9.4 を使っている。筆者は現在のコードのコピーに `biome migrate --write` を実行し、設定変更と診断の違いを確認した。`files.include` と `ignore` は `includes` に統合され、除外パターンは `!` で始まる。`organizeImports` は `assist.actions.source.organizeImports` に移動した。一部のルールは名前やグループも変わった。たとえば `noMultipleSpacesInRegularExpressionLiterals` は `noAdjacentSpacesInRegex` になり、`noWith` と `noVar` は Suspicious グループに移った。

公式のアップグレードガイドによると、import の並べ替え方法が変わったため、1.x とまったく同じ順序にはできない。glob の先頭に `**/` を付けない変更もある。`biome migrate --write` で設定を移行した後に検査すると、import の並べ替えが異なるという診断が322ファイル、format の差が15ファイルで出た。Biome 2 に上げるには、これらの差をまとめて修正するコミットが必要だ。

`biome migrate eslint --write` は ESLint のルール、globals、overrides、ignore パターンを移行する。古い eslintrc と flat config の両方を読み、extends をたどる。ルール preset は none に設定し、移行したルールだけを有効にする。デフォルト設定では同じルールだけを移行し、`--include-inspired` を指定すると類似ルールも移行する。公式ガイドも、結果を確認してから使うよう案内している。

`biome migrate prettier --write` は現在の出力を維持するよう、Prettier のオプションをすべて明示的に記載する。

## CIでの判定

筆者の開発フローでは、エディターでの保存時とコミット直前に Biome が修正しながら検査する。pull request とデプロイパイプラインの CI では `biome ci` を実行し、ファイルを修正せずに format、lint、assist を判定する。コミットフックはスキップできるため、合否は CI が決める。

`biome ci --changed` は、デフォルトブランチ、または `--since` で指定した基準と比較し、コミット済みの変更ファイルだけを検査する CI 用だ。`--staged` はステージ済みのファイルだけを検査するローカル用だ。レポーターは github、gitlab、junit、checkstyle、sarif、rdjson、summary から選べ、json は実験段階だ。

## よくある質問と回答

- **Biome は型検査を代替するか**：しない。型情報 lint ルールは使えるが、筆者の2つのサービスでは CI の `tsc` が型検査を担っている。
- **Biome 2 の `noFloatingPromises` は安定ルールか**：違う。2.6.8でも Nursery グループに属し、公式ドキュメントでは実験段階のため動作が変わる可能性があると説明している。
- **`noFloatingPromises` を有効にすると検査時間はどれだけ延びたか**：筆者の現在のコードでは lint のみの場合は122〜160msで、このルールを追加すると225〜262msだった。
- **Biome の `noUnresolvedImports` で ESLint の検査を代替できるか**：筆者のコードでは難しいと判断した。`node_modules` を接続しても553件すべてが実際のエラーではない診断で、接続しない場合は約700msで4,136件が出た。
- **Biome 2 に上げると大きなコード変更が生じるか**：筆者のコードでは、import の並べ替えの診断が322ファイル、format の差が15ファイルで出た。
- **Biome の自動修正はすべて意味を保つか**：保たない。safe 修正は意味を変えないことが保証されるが、unsafe 修正は意味を変える可能性があり、`--write --unsafe` が必要だ。
- **`biome ci` はコードを修正するか**：しない。format、lint、assist を検査し、ファイルは修正しない。
- **既存の ESLint プラグインをそのまま使えるか**：GritQL プラグインは Biome の Rust ルールが使う semantic model にアクセスできず、JavaScript プラグインは developer preview だ。既存の ESLint プラグインのエコシステムをそのまま持ち込むことはできない。

## 結論

筆者の2つのサービスでは、Biome によって実際に適用される設定が一か所にまとまり、ファイル数がほぼ2倍になった後も全体検査は0.2秒台だった。この結果は、ルールの組み合わせが ESLint と同じという意味ではない。import 検査、フックの呼び出し位置、フォルダ名のルールなど、移行時に抜けた検査と、Biome 2 の project ルールで確認した実際のエラーではない診断をあわせて考える必要がある。

Biome 2 は型情報ルールと対応範囲を広げたが、筆者のコードでは移行によって322ファイルの import の並べ替え変更と15ファイルの format の差が生じた。移行を検討するなら、速度と設定の統合だけでなく、現在適用されているルール、抜ける検査、実際の変換 diff もあわせて確認するとよい。

:::ref
- [docs] [Biome、Biome v2](https://biomejs.dev/blog/biome-v2/)
- [docs] [Biome、Biome v2への移行](https://biomejs.dev/guides/upgrade-to-biome-v2/)
- [docs] [Biome、ESLintとPrettierからの移行](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [docs] [Biome、Architecture](https://biomejs.dev/internals/architecture/)
- [docs] [Biome、Linter](https://biomejs.dev/linter/)
- [docs] [Biome、Linter domains](https://biomejs.dev/linter/domains/)
- [docs] [Biome、noFloatingPromises](https://biomejs.dev/linter/rules/no-floating-promises/)
- [docs] [Biome、noUnresolvedImports](https://biomejs.dev/linter/rules/no-unresolved-imports/)
- [docs] [Biome、Suppressions](https://biomejs.dev/analyzer/suppressions/)
- [docs] [Biome、CLI](https://biomejs.dev/reference/cli/)
- [docs] [Biome、Differences with Prettier](https://biomejs.dev/formatter/differences-with-prettier/)
:::