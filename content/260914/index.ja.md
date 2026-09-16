---
emoji: 🔭
title: 'ブラウザの可観測性'
seoTitle: 'ブラウザ性能計測：PerformanceObserverとWeb Vitals、soft navigation実測'
date: '2026-09-14'
updatedAt: '2026-09-16'
categories: 観測 フロントエンド ブラウザ RUM
description: 'ブラウザSDKなしでページ内から見える信号を整理する。Performance Timeline、ネットワーク区間、LCP・INP・CLSの計算ルール、web-vitals reportSoftNavsの実測と、このブログがGA4に送る値までまとめた。'
keywords: 'ブラウザ パフォーマンス計測, PerformanceObserver 使い方, Web Vitals 計算方法, INP 計測, CLS セッションウィンドウ, Soft Navigations API, web-vitals reportSoftNavs, Resource Timing Timing-Allow-Origin'
locale: ja
translationOf: '260914'
sourceHash: 3976b490db6bef1a28388bab84a42d789e23e2df6fc503abd0ac827c7b892867
---

今回は、ブラウザの可観測性について書いてみたい。

[前回の記事](/260913)では、会社で長く使ってきたSentryをこのブログに導入しながら、機能をあらためて見直した話をした。ところがその記事の構成には、目立つ空白が一つある。筆者はSentryをサーバーにだけ入れ、ブラウザSDKは有効にしなかった。

理由はバンドルサイズだった。（根拠になった実測は最初の節に書いた）だからといって、ブラウザの中で起きていることをまったく見ないという意味ではなかった。ブラウザはSDKがなくても、読み込みとレンダリングについてかなり多くのことを自ら記録している。

そこでこの記事の問いはこうだ。**外部SDKなしで、ページの中でブラウザが自ら教えてくれる読み込みとレンダリングの信号から何が見えるのか。** ネットワーク区間、Web Vitalsの計算ルール、SPAで曖昧になるページの境界を順に見て、最後にこのブログが実際に何を送り、何を送っていないのかを書く。（CPUとメモリは次の記事、収集した値がCrUXと検索につながる話は最後の記事で扱う）

## ブラウザSDKを有効にしなかった理由

まず判断の根拠を書いておく。筆者はSentryの構成を変えながら、clean buildを基準に`.next/static/chunks/*.js`のgzip合計を比較した。

| 構成 | client JS (gzip) | 増加分 |
|---|---|---|
| Sentry未適用 | 181.6 KB | 基準 |
| **サーバー専用（現在）** | **182.3 KB** | **+0.7 KB** |
| サーバー専用 + エラーフォールバックUIで`captureException`を呼び出し | 186.0 KB | +4.4 KB |
| クライアント + サーバー | 260.4 KB | +78.8 KB |

この表は2026-08-04、Next 16.1.4基準の測定だ。サーバーの計測は実質的にタダだったが、ブラウザの計測は78.8KBを要求した。`bundleSizeOptimizations.excludeTracing`も有効にしてみたが数値は変わらず、コストをなくす方法はブラウザの初期化ファイル（`src/instrumentation-client.ts`）を置かないことだけだった。三行目も同じ構造だ。ブラウザSDKがなければフォールバックUIの`captureException`は何もしないのに、SDKのコードはバンドルに載る。だから呼び出し自体を外した。

現在の状態も測り直した。2026-09-16に同じ方法で再測定すると206.1KBだった。基準線より23.8KB大きいが、その間にNextが16.3.4に上がり、後で扱うsoft navigationの報告が入った。Sentryの構成は今もサーバー専用なので、この増加分はSentryのせいではない。（二つのうちどちらがどれだけを占めるのかは、コミットごとにビルドし直していないのでわからない）

このブログでは読み込み性能がそのまま訪問者の体験であり、78.8KBを払うのは筆者ではなく訪問者だ。個人ブログのブラウザエラーがそのコストに見合うとは判断しなかった。ただ、こう決めたからには、ブラウザ側は別の方法で見なければならない。その出発点が、ブラウザがすでに残している記録だ。

## ブラウザが残す記録

ページが開くと、ブラウザは何種類もの:term[PerformanceEntry]{key="performance-entry"}を作る。W3Cの[Performance Timeline](https://www.w3.org/TR/performance-timeline/)は、これらの項目を一つの時間軸で読むための共通の枠組みだ。開発者がストップウォッチのように開始と終了を打たなくても、ブラウザはドキュメントのナビゲーション、リソースのリクエスト、ペイント、入力といった出来事をすでに知っている。

| 観測対象 | entry type | 答えられる問い |
|---|---|---|
| ドキュメントのナビゲーション | `navigation` | DNS、接続、応答、DOM処理のどこで時間がかかったか |
| 画像・スクリプト・CSS | `resource` | どのリソースが遅れ、転送サイズはどれくらいだったか |
| 画面表示 | `paint`, `largest-contentful-paint` | 最初の画面と主要コンテンツがいつ見えたか |
| レイアウトの変化 | `layout-shift` | 見ていた画面がいつ動いたか |
| ユーザー入力 | `event` | 入力の後、次の画面が描画されるまでどれくらいかかったか |
| アプリケーションの区間 | `mark`, `measure` | サービスが自ら定義した処理にどれくらいかかったか |

メインスレッドを長く占有したフレームを見る`long-animation-frame`も同じ枠組みに属するが、それはCPUの話なので次の記事で扱う。

この記録を受け取る標準インターフェースが:term[PerformanceObserver]{key="performance-observer"}だ。

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.startTime, entry.duration)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

コードは短いが、いくつかの条件が隠れている。MDNの[`observe()`のドキュメント](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)によると、`buffered`は`type`と一緒に使う必要があり、複数の種類をまとめて受け取る`entryTypes`とは併用できない。収集スクリプトはたいていページがかなり進んだ後に実行されるので、`buffered`なしで登録すると、それ以前に生じたLCP候補やリソースの記録を受け取れない。

また、ブラウザがサポートしていないtypeは例外なしに無視され、同じドキュメントによればコンソールに警告が残る程度だ。`PerformanceObserver.supportedEntryTypes`で確認しなければ、**entryがないこと**と**entryが生成されないブラウザだったこと**を区別できない。ダッシュボードの空白区間は、性能の問題ではなくブラウザ構成の違いかもしれないのだ。

## ネットワーク時間の構成

ページが遅いという言葉は、よくネットワークの問題に置き換えられる。しかし`duration`一つでは原因を切り分けられない。`navigation` entry（`PerformanceNavigationTiming`）と`resource` entry（`PerformanceResourceTiming`）は、一つのリクエストを複数のタイムスタンプに分けてくれる。

| 区間 | 計算 | 大きいときに疑う場所 |
|---|---|---|
| DNS | `domainLookupEnd - domainLookupStart` | DNS層 |
| 接続とTLS | `connectEnd - connectStart` | 接続の再利用、TLSネゴシエーション |
| 最初のバイトまで | `responseStart - requestStart` | サーバー処理と往復遅延 |
| 本文の転送 | `responseEnd - responseStart` | 応答サイズと転送速度 |

W3Cの[Navigation Timing](https://www.w3.org/TR/navigation-timing-2/)仕様には、これらのタイムスタンプがどんな順序で打たれるかを示す図がある。区間の名前になじみがなければ、表よりもその図を一度見るほうが早い。

一つの落とし穴はcross-originのリソースだ。W3Cの[Resource Timing仕様](https://www.w3.org/TR/resource-timing/)では、別のoriginのリソースは、提供するサーバーが`Timing-Allow-Origin`レスポンスヘッダーで許可しない限り、DNS、接続、リクエストとレスポンスの開始といった詳細なタイムスタンプが0で隠される。外部CDNの画像が遅い気がして開いてみたらDNSも接続もすべて0だったなら、速かったのではなく見る権限がなかったのだ。**この領域では、0は速いという意味ではないかもしれない。**

このブログの最初のバイトまでの時間も軽くはない。2026-09-16に韓国のある地点から`curl`で記事二本とホームを一回ずつリクエストしたところ、`time_starttransfer`は0.95秒から2.43秒の間だった（DNS、接続、TLSの時間を含む値だ）。レスポンスヘッダーはNetlify Durableキャッシュがhit、エッジキャッシュがmissだった。サンプルが三つだけなので一般化はしないが、後で見る実測のTTFB 798msと同じ規模だ。こうした区間の分解があって初めて、LCPが遅いときに画像を小さくするのか、ドキュメントの到着を早めるのかを選べる。

## Web Vitalsの計算

ネットワーク区間が原材料なら、:term[Web Vitals]{key="web-vitals"}はその上に計算ルールを載せた指標だ。GoogleのWeb Vitalsドキュメントが定めるCore Web VitalsはLCP、INP、CLSの三つで、良好の基準はLCP 2.5秒、INP 200ms、CLS 0.1以下だ。

![LCP、INP、CLSの三指標の良好、要改善、不良の区間。LCPは2.5秒と4.0秒、INPは200msと500ms、CLSは0.1と0.25が境界だ](1.png?w=720)

（図の出典：[web.dev, Web Vitals](https://web.dev/articles/vitals)のしきい値の図三枚を横につなげたもの、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)）

三つの指標はどれも、ブラウザが一度打ったタイムスタンプではない。複数のentryとページのライフサイクルを解釈して初めて値が出る。この違いを知らないと、自作の収集コードの値がライブラリやツールの値とずれたとき、どちらが正しいのか判断できない。

### LCPは候補が変わり続ける

[LCPのドキュメント](https://web.dev/articles/lcp)によると、ブラウザはより大きなコンテンツ要素が描画されるたびに`largest-contentful-paint` entryを新たに送る。テキストが先に描画されれば`<p>`が候補になり、後から大きな画像が読み込まれれば`<img>`に変わる。そしてユーザーがタップ、スクロール、キー入力をした瞬間に、新しいentryの報告を止める。だからLCPは最初のentryではなく入力前までに報告された最後の有効な候補であり、この確定時点を決めるのが収集コードの役割になる。

### INPは入力の三区間を足す

web.devのINPドキュメントは、一つのインタラクションを三つの区間に分ける。入力が入ってからイベントハンドラーが始まるまでのinput delay、ハンドラーが実行されるprocessing duration、そして次のフレームが画面に表示されるまでのpresentation delayだ。

![メインスレッドで一つの入力が処理される過程。blocking taskのせいでinput delayが生じ、pointerup、mouseup、clickのハンドラーがprocessing durationを成し、renderとpaintを経てフレームが表示されるまでがpresentation delayだ。paintの下にはcompositing、GPU、rasterの処理が続く](2.png?w=720)

（図の出典：[web.dev, Interaction to Next Paint (INP)](https://web.dev/articles/inp)、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)、白背景のPNGに変換）

この図で注目すべきは、ユーザーが押した時点ですでに灰色のblocking taskが動いているという点だ。ハンドラーのコードがどれだけ速くても、入力の直前に別の処理がメインスレッドを占有していればINPは悪くなる。（その別の処理が何なのかを探すのが次の記事のテーマだ）

ページのINPは、一回の訪問の間に観察したインタラクションのうち最も遅い値に近い。同じドキュメントは、インタラクション50回ごとに最も大きい値を一つ無視すると説明している。だからインタラクションが50回未満の訪問では、最も遅かったインタラクション一つがそのままINPになる。

### CLSは移動をまとめて数える

[CLSのドキュメント](https://web.dev/articles/cls)は、CLSをページの生存期間中の移動をすべて足した値ではなく、最も大きなまとまり（burst）のスコアとして定義する。移動の間隔が1秒未満なら同じsession windowにまとめ、一つのwindowは最大5秒までだ。それらのwindowのうちスコアの合計が最も大きいものがCLSになる。長く開いたままのタブで少しずつ生じた移動が際限なく累積しないように作られたルールだ。

三つの指標のルールを自分で実装することはできる。しかしタブが隠れる時点、ページが復元される時点まで境界条件を合わせるのは難しい。Googleの[`web-vitals`](https://github.com/GoogleChrome/web-vitals)ライブラリは、entryをそのまま渡すツールではなく、標準APIの上にこのライフサイクルのルールを適用した実装だ。このブログもこれを使っている。

ところがこれらのルールはすべて「ページ一つ」という単位を前提にしている。その単位が曖昧になるとどうなるだろうか。

## 曖昧になったページの境界

伝統的なnavigationでは、ブラウザはドキュメントの始まりを知っている。SPAのclient-side navigationでは、URLと画面が変わってもドキュメントは新しく作られない。ブラウザから見れば最初の読み込み一つが長く続いているようなもので、一覧から記事へ移った二つ目の画面には自分のLCPがない。

これまではRUMツールとフレームワークがそれぞれのヒューリスティックで「新しい画面」を定義してきた。Chromeチームは[Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations)で、この判断をブラウザに持ち込んだ。ユーザー入力、URLの変更、画面のペイントが一緒に起きると、ブラウザが`soft-navigation` entryを作る。この機能はChrome 151からデフォルトで有効になり、Chrome 151のstableリリース日は[2026-07-28](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=151)だ。`web-vitals`も6.0から`reportSoftNavs`オプションでsoft navigation単位の指標を報告する。READMEによると、この報告はChromium 151以上でのみ動作し、ほかのブラウザではオプションを有効にしても報告の方式は変わらない。

### reportSoftNavsを有効にして測った値

このブログもNext.jsの`Link`で記事一覧から記事へ入る。2026-09-14に`web-vitals`を6.2.1に上げて`reportSoftNavs`を有効にした後（`cc21a0d`）、プロダクションのページを開いたヘッドレスChromeにCDPで接続し、GA4へ出ていくリクエストをそのまま開いてみた。一つのセッションで出ていった値はこうだった。（表にない指標はこのセッションのリクエストになかったもので、その理由は別途確認していない）

| 指標 | 値 | `navigationType` |
|---|---|---|
| TTFB | 798ms | `navigate` |
| FCP | 1680ms | `navigate` |
| LCP | 1680ms | `navigate` |
| FCP | 542ms | `soft-navigation` |
| TTFB | 0ms | `soft-navigation` |

一覧から記事へ入った遷移が、意図どおり別の体験として捕捉された。だがこの表は、オプション一つでは終わらない理由も見せている。**soft navigationのTTFBは0だ。** サーバーにドキュメントをリクエストしていないのだからREADMEに書かれたとおりの値だが、この0が最初の読み込みの798msと同じイベントに積み重なると、TTFBの平均はコードを直さなくても静かに下がる。そこで指標ごとに付いてくる`navigationType`をGA4のパラメータとして一緒に送るよう直した。観測の単位を一つ増やせば、それを区別する次元も一緒に増えるのだ。

測りながらわかったことがあと二つある。一つは、soft navigationには**実際のユーザー入力が必要だ**という点だ。ページの中でスクリプトから`click()`を呼んだときは、URLが変わり画面が更新されたのに`soft-navigation` entryが生成されず、CDPの`Input.dispatchMouseEvent`で座標クリックを送って初めて捕捉された。テスト自動化でこの機能を確認するなら、DOMの`click()`ではなくブラウザレベルの入力イベントを送る必要がある。

もう一つは、このブログでsoft navigationが起きる場所が思ったより狭いということだ。一覧とヘッダーのリンクは`Link`なのでclient-side navigationだが、**記事本文の中の内部リンクはマークダウンが作る普通の`a`タグなので、フルページロード**だ。同じサイトの中でも、ある移動はsoft navigationで、ある移動はそうではない。

### 最初のページの指標が打ち切られる時点

実測の後でREADMEを読み返していて、見落としていた一文を見つけた。

> Note that this will change the way the first page loads are measured as the metrics for the initial URL will be finalized once the first soft nav occurs.

オプションを有効にすると、最初のページの指標が最初のsoft navigationの瞬間に確定するという意味だ。INPとCLSは本来ページを離れるまで観察する指標だが、これからはユーザーが一覧で記事のリンクを押した瞬間に一覧ページの観察が終わり、新しい画面のINPとCLSが0からやり直しになる。同じREADMEは、LCPとFCPもsoft navigationの後に新しく描画された要素だけを数えると書いている。画面をまたいでそのまま残るヘッダーのような要素は、新しい画面の候補になれない。

だから、オプションを有効にする前後で最初の読み込みの指標の分布が変わりうる。同じサイトを測定していて、デプロイの時点を境にINPが良くなったなら、コードが良くなったのではなく観察の窓が短くなっただけかもしれない。Chromium 151以上でのみこう動作するので、ブラウザごとの違いも生じる。（筆者はこの違いを実測の前に知っておくべきだった。表の値よりも、この一文のほうが解釈に大きく影響する）

### bfcacheの復元も新しい体験だ

ページの境界を曖昧にする経路がもう一つある。:term[bfcache]{key="bfcache"}は、戻る・進むの移動のときにページをメモリから丸ごと復元する。web.devの[bfcacheのドキュメント](https://web.dev/articles/bfcache)は、Chromeの利用データでデスクトップの移動10件に1件、モバイルの5件に1件が戻る・進むの移動だと書いている。復元は新しい読み込みではないので、本来最も速かったはずの再訪問が読み込みの分布から抜け、実際の体験は良くなったのに収集された分布は遅い側に傾くことがある。同じドキュメントは、TTFBのような指標をnavigation typeで分けて見るよう勧めている。`web-vitals`はこの場合`navigationType`を`back-forward-cache`として報告するので、このブログがsoft navigationのために入れたパラメータがbfcacheの復元も一緒に区別してくれる。

## このブログが実際に送っているもの

ここまでをこのブログのコードに移すと、`src/components/WebVitalsReporter.tsx`一つになる。クライアントコンポーネントが`web-vitals`を動的に読み込んでLCP、INP、CLS、FCP、TTFBを登録し、GA4に`web_vitals`という一つのイベントとして送る。インストールされているバージョンはlockfile基準で6.2.1だ。

| パラメータ | 内容 |
|---|---|
| `event_label` | 指標名（`LCP`、`INP`など） |
| `value` | 指標の値。GA4のvalueは整数なので、CLSは1000を掛けて四捨五入 |
| `metric_id` | 一つのページ生存期間における指標一つを識別するid。同じ指標が再び報告されると、この値でまとめる |
| `metric_rating` | ライブラリが判定したgood、needs-improvement、poor |
| `metric_navigation_type` | `navigate`、`soft-navigation`、`back-forward-cache`など |

別の収集サーバーなしで、すでに運用していたGA4に載せた:term[RUM]{key="rum"}の構成だ。モジュールの読み込み自体が失敗すると、`web_vitals_unavailable`イベントを一つ残す。デプロイ直後に古いHTMLが消えたチャンクを呼ぶときに起きる失敗で、ブラウザのSentryがないので、これがなければ収集が丸ごと止まっても痕跡が残らない。

送らないものもはっきりしている。`web-vitals`のattributionビルドではなく標準ビルドなので、LCP要素が何だったのか、INPの三区間がそれぞれどれだけだったのか、どの要素がレイアウトを押し出したのかは収集しない。前の節のINPの図を思い出すと、このブログは三区間の合計だけを知っていて、どの区間が長かったのかは知らない。そしてブラウザでだけ起きるJSエラーも、どこにも記録されない。79KBを節約した代償だ。

もう一つ書いておく。`metric_navigation_type`を送ってはいるが、GA4でこのパラメータをカスタムディメンションとして登録し実際に分けて見ているかどうかは、この記事を書きながら確認していない。GA4 Admin APIがこのGCPプロジェクトで無効になっていて、すぐに確認する手段もなかった。送ることと分けて読めることは別の問題だ。

## ブラウザはすでに記録している

まとめると、ブラウザSDKを有効にしなくても、ブラウザはネットワーク区間、ペイント、レイアウトの移動、入力の遅延をすでに記録している。`PerformanceObserver`はその記録を読む入口であり、Web Vitalsはそこに候補の更新、三区間の合計、session windowのような計算ルールを載せた指標だ。

そしてこの計算ルールはページという単位を前提にしている。soft navigationを有効にすると新しい画面の指標が生まれる代わりに、最初のページの観察の窓が短くなり、TTFBには0が混ざり、bfcacheの復元は読み込みの分布から抜ける。筆者が今回新たに理解したのは、オプション一つが値だけでなく**何を一回の体験として数えるか**を変えるという点だ。だから数字を比較する前に、その数字がどんな境界で切られたのかを先に見なければならない。この記事を読んでいる読者の方々も、いま見ている性能の数字がどの時点で確定した値なのか、一度振り返ってみるとよいと思う。

ただし、この記事は三区間の合計までしか見ていない。入力が入ったときにメインスレッドを占有していた処理が何だったのか、そして長く開いたページがメモリをどれだけ使うのかには、別のAPIが必要だ。次の記事である[ブラウザのCPUとメモリ](/260915)で、その話を続けようと思う。

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [web.dev, Debug performance in the field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [WICG, Soft Navigations explainer](https://github.com/WICG/soft-navigations)
:::
