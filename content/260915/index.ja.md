---
emoji: 🧮
title: 'ブラウザのCPUとメモリ'
seoTitle: 'ブラウザのメインスレッドとメモリの観測：Long Task、LoAF、プロファイリング、メモリ計測API'
date: '2026-09-15'
updatedAt: '2026-09-16'
categories: 観測 フロントエンド ブラウザ
description: 'ブラウザのメインスレッドとメモリの観測を整理する。long taskとTBT、LoAF、JS Self-Profiling、メモリ計測API、crash reportが何を見せるのかを、このブログのLighthouse実測とレスポンスヘッダーで確かめた。'
keywords: 'ブラウザ メインスレッド, long task 50ms, Long Animation Frames API, Total Blocking Time TBT, JS Self-Profiling API, Sentry ブラウザ プロファイリング, measureUserAgentSpecificMemory, ブラウザ メモリリーク'
locale: ja
translationOf: '260915'
sourceHash: 4e0b5c34d77d4e96bcc9d368f60407b6ed8ce76dd252e63bf908cd37e0a68225
---

今回は、ブラウザのメインスレッドとメモリを観測する方法について書いてみたい。

[前回の記事](/260914)では、ネットワークとレンダリング、Web Vitalsをたどりながら、ブラウザが読み込みとインタラクションについて残す値を見た。ところが、その指標が悪化した原因を掘り下げていくと、たいてい二つの場所にたどり着く。メインスレッドが別の仕事で忙しく入力やレンダリングを間に合わせられなかったか、メモリが積み上がってページが遅くなり、ついには落ちたかである。

この二つの領域はWeb Vitalsより観測が難しい。APIのほとんどはChromium専用で、あるAPIはレスポンスヘッダーを変えないと有効にならず、ある信号は構造的にJavaScriptが受け取れない。[シリーズ最初の記事](/260913)のSentry機能表でブラウザprofilingの判断をこの記事に先送りしたが、その条件もここで解いていく。

筆者が自分で確かめたのは、Lighthouseの2回の実行、本番のレスポンスヘッダー、インストールされた`web-vitals`のビルドファイルである。結論から言うと、このブログはメインスレッドをlab計測で輪郭だけ見ており、メモリとcrashを見る手段は持っていない。

## メインスレッドが忙しいということ

ブラウザのメインスレッドは、JavaScriptの実行、スタイル計算、レイアウト、ユーザー入力の処理を一列に並べて処理する。一つのタスクが動いている間は他の仕事が割り込めないので、その間にユーザーがボタンを押すと、入力イベントはタスクが終わるまで待つことになる。

この待ち時間を区切る基準が50msだ。W3Cの[Long Tasks API仕様](https://w3c.github.io/longtasks/)は、50ms以上メインスレッドを占有したタスクをlong taskと定義し、その根拠も記している。入力に100ms以内に反応するには、入力の瞬間に実行中だったタスクが50ms以内に終わり、その入力を処理するタスクも50ms以内に終わらなければならない、というものだ。50msは100msの応答目標を二つに割った値なのである。

### TBTはlong taskの超過分を足す

個数だけを数えると60msと600msが同じになるので、labツールはTotal Blocking Time(TBT)を使う。web.devのTBTの記事によれば、long task一つのblocking timeは50msを超えた部分で、TBTはFCP以降のlong taskのblocking timeを合計した値である。LighthouseはデフォルトではTTI(Time to Interactive)までしか数えない。

![メインスレッドのタイムライン上の五つのタスクのうち、50msを超えた三つの超過分がそれぞれ200、40、105msと示された図](1.png?w=720)

(図の出典: [web.dev, Total Blocking Time (TBT)](https://web.dev/articles/tbt), CC BY 4.0)

黄色の部分が各タスクの最初の50ms、赤い部分がblocking timeである。同じ記事の例では、タスクの実行時間の合計は560msだがTBTは345msだ。50msより短いタスクは、どれほど頻繁に来てもTBTには寄与しない。

### TBTはINPの代わりにならない

TBTはlab指標で、Core Web Vitalsの応答性指標はINPである。web.devの[INPの記事](https://web.dev/articles/inp)は、インタラクションなしに読み込みだけを見るlabツールではTBTが妥当な代理指標にはなりうるが、代替物ではないと線を引いている。

TBTは、ユーザーがいつ何を押したかを知らないからだ。メインスレッドが大きく塞がっていても、ユーザーがスクリプトの終わった後に押せばINPは低くなりうる。long taskがINPに届く経路は、押した瞬間に実行中だったタスクの残り時間の分だけ、前回の記事で見たinput delayを伸ばすことである。だから低いTBTが教えてくれるのは「読み込み中にメインスレッドが大きく塞がらなかった」までだ。実際の入力が何に塞がれたのかは、fieldでタスクとフレームを見なければわからない。

## Long TasksとLong Animation Frames

fieldでメインスレッドを見るブラウザAPIは二つある。Chrome 58からあるLong Tasks API(`PerformanceLongTaskTiming`)と、Chrome 123でリリースされたLong Animation Frames API(`PerformanceLongAnimationFrameTiming`、略してLoAF)だ。どちらも:term[PerformanceObserver]{key="performance-observer"}で購読する。

### LoAFは置き換えではなく代替案だ

ChromeチームのLoAFの記事(下の図の出典)は、LoAFをLong Tasks APIの"update"であり"alternative"だと紹介しており、replacementという言葉は使っていない。MDNの互換性データでも`PerformanceLongTaskTiming`にdeprecatedの表示はなく、両APIともexperimentalで、FirefoxとSafariはサポートしていない。

新しいAPIが必要だった理由は帰属(attribution)である。同じ記事によれば、Long Tasks APIの帰属は"at best only tells you the container"、つまりトップレベルのドキュメントかどのiframeかまでで、どのスクリプトが時間を使ったかは教えてくれない。

LoAFは個々のタスクではなく、**レンダリング更新が50ms以上遅れたフレーム**をentryとして報告する。短いタスクいくつかとレンダリングが集まって基準を超えた場合も捕まえられる。

### blockingDurationとスクリプトの帰属

LoAFでINPと直接つながるフィールドは`blockingDuration`だ。フレーム内で50msを超えたタスクの超過分を足すが、最も長いタスクには最後のレンダリング時間まで含める。記事の例では、55ms、65msのタスクの後に20msのレンダリングが続くと、`duration`は約140ms、`blockingDuration`は(55 - 50) + (65 + 20 - 50) = 40msになる。TBTの発想を、読み込み区間ではなくページ全体のフレームに移したものと言える。

![ページのタイムラインに複数のlong frameがあり、そのうちINPとして選ばれたインタラクションと重なるフレームが点線で強調された図](2.png?w=720)

(図の出典: [Chrome for Developers, Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames), CC BY 4.0)

ページにはlong frameがいくつも生じるが、INPの値を説明するのはINPのインタラクションと重なったフレームである。そのフレームの`scripts`配列には、5msを超えて実行されたスクリプトごとに、呼び出し地点、ソースURL、実行時間が入っている。Long Tasks APIになかった「誰が」がここで得られる。

ただし、スクリプトの帰属はメインスレッドとsame-originのiframeにしか付かない。cross-originのiframe、worker、拡張機能のコードは、フレームを長くしても名前がない。このブログの記事ページにあるutteranc.esのコメントiframe内の処理は、LoAFでも帰属されないということだ。

### このブログはLoAFを収集していない

LoAFを直接購読せずに使う方法もある。`web-vitals`は[v4.0.0(2024-05-13)のchangelog](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md)で"Add INP breakdown timings and LoAF attribution"を入れ、その後、最も長いスクリプト(`longestScript`)と、スクリプト、レイアウト、ペイント時間の合計を加えた。ただしこれはattributionビルド(`web-vitals/attribution`)からしか得られない。

前回の記事で見たとおり、このブログの`src/components/WebVitalsReporter.tsx`は`import('web-vitals')`でstandardビルドを使っている。**INPの値は収集しているが、そのINPがどのスクリプトに塞がれたのかは収集していない。** インストールされた`web-vitals@6.2.1`で、`long-animation-frame`という文字列は`dist/web-vitals.js`に0回、`dist/web-vitals.attribution.js`に1回出てくる。standardビルドはLoAFのobserverをそもそも登録しないのである。(この事実はメモリの節で再び重要になる)

attributionビルドは[README](https://github.com/GoogleChrome/web-vitals#attribution-build)によればbrotliで約1.5K大きいが、筆者がためらった理由はサイズよりも送り先にある。このブログのトラフィックでGA4にスクリプト別の分布が意味のある形で出るかを確かめていないので、収集を増やす前にまずlabを見ることにした。

## このブログで捕まったlong task

そこで記事ページを一つ、labで回してみた。Lighthouse 12.8.2(`npx lighthouse@12`)、ローカルのChrome headless、デフォルトのmobileフォームファクター、simulated throttling(RTT 150ms、1638.4kbps、CPU 4倍の減速)、対象は`https://hooninedev.com/260914`で、2026-09-16に25分間隔で2回実行した。

| 項目 | 1回目 (08:46:15Z) | 2回目 (09:11:01Z) |
|---|---|---|
| Performance score | 0.92 | 0.93 |
| FCP、LCP | 2501ms | 2415ms |
| TBT | 40ms | 47ms |
| TTI | 5489ms | 5375ms |
| メインスレッド処理の合計 | 916ms | 1035ms |
| うちStyle & Layout | 343ms | 344ms |
| うちScript Evaluation | 254ms | 292ms |

2回ともLCP要素は画像ではなく最初の段落(`div#post-content > p`)だったのでFCPとLCPが同じになり、メインスレッドで最も大きい項目はスクリプトではなくStyle & Layoutだった。

![Lighthouseの2回の実行で、ドキュメント、Nextのチャンク、gtag二つのlong taskが同じ順序で現れたタイムラインの図表](3.png?w=720)

long taskは2回とも四つで、順序も同じだった。ドキュメントのタスク(104ms、122ms)、Next.jsのチャンク一つ(68ms、69ms)、そして`googletagmanager.com/gtag/js`のタスク二つ(1回目は66msと56ms、2回目は69msと59ms)である。時刻はLighthouseがCPU 4倍の減速を仮定して計算した時間軸なので、実機での絶対時間として読んではいけない。

TBTはFCP以降の三つのタスクの超過分とぴったり一致する。1回目は(68 - 50) + (66 - 50) + (56 - 50) = 40ms、2回目は(69 - 50) + (69 - 50) + (59 - 50) = 47msだ。低いTBTは「long taskがない」ではなく「FCP以降の超過分が小さい」という意味である。

次はgtagの位置だ。layoutでgtagは`next/script`の`strategy="afterInteractive"`で読み込まれ、LCPから2.8秒あまり後に続けて実行され、この最後のlong taskが終わる地点がそのままTTIとして記録される。読み込み指標よりも、**ページが表示された直後に押された入力のinput delay**と重なりうる位置である。ただしlabの時間軸の上での推論であり、実際のユーザーがそのとき何を押したかは、このブログでは収集していない。

そしてこれはn=2のlab計測だ。同じ形が再現されたことは、この構造が偶然ではないという弱い根拠にすぎず、実際のユーザーの端末とネットワークの分布の代わりにはならない。

では、gtagのタスク66msの中でどの関数が時間を使ったのかは、どうすればわかるのだろうか。

## サンプリングプロファイラー

関数単位の答えはプロファイラーがくれる。DevToolsのPerformanceパネルの仕事を実際のユーザーのブラウザでやろうとするのが、JS Self-Profiling APIである。

### JS Self-Profiling API

WICGの[JS Self-Profiling仕様](https://wicg.github.io/js-self-profiling/)は、Webアプリがブラウザのサンプリングプロファイラーを制御するAPIを定義している。例は`new Profiler({ sampleInterval: 10, maxBufferSize: 10000 })`で、10msごとにコールスタックを記録し、最大1万個まで集めるという意味だ。すべての呼び出しを計測せず:term[サンプリング]{key="sampling"}するのでオーバーヘッドは小さい代わりに、間隔より短い呼び出しは見逃しうる。仕様は、CORSで許可されていないcross-originスクリプトのスタックフレームを結果から除外する。gtagのように別のoriginのスクリプトの内部は、このAPIでも見えない可能性があるということだ。

仕様の状態は標準トラックではなくWICG Community Group Draftで、MDNの互換性データによれば`Profiler`はChrome 94以降のChromium系でしか動かない。そして[MDN](https://developer.mozilla.org/en-US/docs/Web/API/JS_Self-Profiling_API)が書いているとおり、ドキュメントは`js-profiling`を含むDocument Policyとともにレスポンスされなければならない。HTMLのレスポンスに`Document-Policy: js-profiling`ヘッダーが必要だという意味である。

### ヘッダーを有効にすることもコストだ

調べている途中で、ドキュメント同士が食い違う点があった。2026年1月に仕様リポジトリに入った変更で`js-profiling`は**deprecated**になり、代わりに`js-profiling-mode`(`eager`、`lazy`)が定義された。実装は後方互換のために`js-profiling`をサポートすべき(SHOULD)だが、削除してもよい(MAY)。

仕様によれば、`eager`(従来の`js-profiling`と同じ意味)は読み込み中にプロファイリング基盤をあらかじめ準備するので、プロファイラーを使わなくてもFCPとLCPに影響しうる。`lazy`は最初の`Profiler`生成まで準備を遅らせるが、その初期化がインタラクションの処理中に起きるとINPに影響しうる。**計測のために有効にしたヘッダーが、計測対象の指標にコストを与えうる**ことを仕様が認めたわけだ。一方、Sentryのドキュメントは2026-09-16の閲覧時点でも`Document-Policy: js-profiling`だけを案内している。Chromeが`js-profiling-mode`を実装したかは確かめていないので、今どちらのヘッダーを使うべきかまでは言えない。

### Sentryブラウザprofilingの条件

Sentryの[JavaScript profilingドキュメント](https://docs.sentry.io/platforms/javascript/profiling/)は条件をはっきり書いている。ブラウザprofilingはbetaで、JS Self-Profiling APIを使うためChromeやEdgeのようなChromium系でしか動かず、サーバーが`Document-Policy: js-profiling`を送らなければならない。ヘッダーを変えられないホスティングでは使えないと明記している。SDKは`@sentry/browser` 10.27.0以上で`browserProfilingIntegration()`と、セッション単位の比率`profileSessionSampleRate`を使う。FAQは、Chromeユーザーからだけプロファイルが届くのが正常だと答えている。集まったプロファイルを全ユーザーの代表として読んではいけないということだ。

課金は[UI Profile Hours](https://docs.sentry.io/pricing/quotas/manage-ui-profile-hours/)単位で、バンドルは`sentry-javascript`リポジトリの`.size-limit.js`(developブランチ、2026-09-16閲覧)のgzip上限値で見ると、Tracingの組み合わせ56 KBにProfilingを加えると59 KBになる。

### このブログでは二重に無効になっている

一つ目に、ブラウザSDKがない。このブログのSentryはサーバー専用で、`src/instrumentation-client.ts`がない。クライアントSDKがclient JSをgzipで78.8 KB増やすという2026-08-04の実測をもとに下した決定である(前回の記事で扱った)。

二つ目に、ヘッダーがない。2026-09-16T09:10:42Zに`curl -sI https://hooninedev.com/260914`で確認したレスポンスに`document-policy`はない。このリポジトリがHTMLに付けるヘッダーは`next.config.ts`の`headers()`にある`Content-Security-Policy`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`の四つで、レスポンスでもその四つが確認できる。(`public/_headers`は静的アセットにしか適用されずHTMLには届かないことを、このリポジトリで実測してある)

だから、このブログでブラウザprofilingを有効にするのはオプション一つの話ではない。79KBの決定を覆し、すべてのHTMLにヘッダーを付け、そのヘッダーがFCP、LCP、INPに与えるコストを新たに測る作業になる。前に見たgtagのタスク二つが、そのコストを正当化する問題だという根拠はまだない。

## メモリを計測するということ

CPUが「今何が塞いでいるか」だとすれば、メモリは「時間とともに何が積み上がるか」の問題なので、セッション内の変化を見なければならない。ところが、この値をfieldから持ってくる道はCPUより狭い。

### performance.memoryは非標準だ

`performance.memory`は[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory)で"non-standard and legacy"なプロパティとされ、互換性データではdeprecated、Chromium専用と表示されている。「ヒープ」が正確に何を指すのかからして標準化されていない。

### measureUserAgentSpecificMemoryは分離を要求する

代わりになるのが`performance.measureUserAgentSpecificMemory()`だ。web.devの[ページのメモリ計測の記事](https://web.dev/articles/monitor-total-page-memory-usage)は、ガベージコレクションの最中に計測するので結果が遅れて届くとし、平均5分のランダムな間隔で呼び出すよう勧めている。Chrome 89以降のChromium系でしかサポートされない。

決定的な条件は別にある。[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory)は、ドキュメントがsecure contextであり、かつ**cross-origin isolated**でなければならないと明記している。`Cross-Origin-Opener-Policy`と`Cross-Origin-Embedder-Policy`ヘッダーで分離され、`window.crossOriginIsolated`が`true`でなければならないという意味だ。

前述の`curl`のレスポンスには二つのヘッダーがないので、このブログではこのAPIを呼び出せない。有効にするコストもprofilingヘッダーより大きいと見ている。COEPを有効にすると、ページが読み込むcross-originリソースがそのポリシーに従わなければならないが、このブログはgtagスクリプトとutteranc.esのiframeを読み込んでいる。この二つが実際に壊れるかは、有効にして確かめてはいない。

fieldが塞がれているとき残るのは、DevToolsのMemoryパネルによるローカルでの再現である。Chromeチームの[メモリ問題の解決ドキュメント](https://developer.chrome.com/docs/devtools/memory-problems)がリークのよくある原因として挙げるdetached DOMツリーをHeap snapshotで探す方法だが、筆者がこのブログでやってみたわけではない。

### 観測コードが生んだリーク

メモリの話で筆者が最も興味深く見た事例は、観測ライブラリから出てきた。`web-vitals` v6.2.2(2026-09-14)のchangelogの最初の行が"Cap pending LoAFs to avoid memory leak"である。

[issue #795](https://github.com/GoogleChrome/web-vitals/issues/795)の説明によれば、attributionビルドの`onINP`は、INPと重なるLoAFを探すためにLoAFのentryを`pendingLoAFs`に溜める。整理の基準である「最後に処理されたイベント」の時刻はユーザー入力がないと進まないので、動画再生のように長時間入力なしで見るページではLoAFが溜まる一方だった。[修正PR #796](https://github.com/GoogleChrome/web-vitals/pull/796)は、イベントグループのリストですでに使っていた上限`MAX_PENDING_FRAMES`(10)をLoAFのリストにも適用し、INP候補と重なるフレームでなければ直近10個までしか残さないようにした。

このブログは6.2.1だが、このリークを抱えているだろうか。そうではない。PRが直したソースファイルは`src/attribution/onINP.ts`一つ(残りはテストファイル)で、前に見たとおり、このブログのstandardビルドにはLoAFのobserverがない。**LoAF attributionを収集しないと決めた同じ判断が、このリークの経路も塞いでいたのである。** だからといって「収集しないでおこう」という結論ではない。観測コードのコストもchangelogでようやく明らかになることがあり、attributionビルドに切り替えるなら6.2.2以上が前提だということだ。

## ブラウザが落ちたとき

メモリを使い切るとページは落ちる。このとき残る信号がReporting APIのcrash reportだ。

### crash reportの形

WICGの[Crash Reporting仕様](https://wicg.github.io/crash-reporting/)はreport type `"crash"`を定義し、W3C標準でも標準トラックでもないと自ら明記している。bodyの`reason`には、ページがメモリを使い切ったという`oom`と、応答しなくなって終了したという`unresponsive`がある。送信先は、`Reporting-Endpoints`ヘッダーに`crash-reporting`エンドポイントがあればそこ、なければ`default`で、どちらもなければ送らない。

### JavaScriptでは受け取れない

この信号の核心的な性質は、仕様の一文にある。

> Crash reports are not observable to JavaScript, as the page which would receive them is, by definition, not able to.

報告を受け取るはずのページはそのcrashですでに落ちているので、JavaScriptがこの報告を観察する方法は定義上ないということだ。ブラウザがページの外からサーバーのエンドポイントへPOSTするだけである。

これがブラウザSDKにとって何を意味するかは、コードで見られる。`sentry-javascript`の[`reportingObserverIntegration`のソース](https://github.com/getsentry/sentry-javascript/blob/develop/packages/browser/src/integrations/reportingobserver.ts)は、デフォルトの購読タイプに`'crash'`、`'deprecation'`、`'intervention'`を置き、`report.type === 'crash'`の分岐もある。しかしこの統合はページ内の`ReportingObserver`を使うので、仕様どおりなら実際のOOM crashでその分岐が実行される経路はない。(仕様から導いた筆者の推論であり、crashを起こして確かめてはいない)

サーバー側で、Sentryが`Reporting-Endpoints`の送信先になることはできるだろうか。この機能を要望した[getsentry/sentry#38940](https://github.com/getsentry/sentry/issues/38940)は2022-09-15に開かれ、2026-09-16の閲覧時点でもopenだ。今使える方法は、エンドポイントを自前で置いてSentryに中継するところまでである。

### このブログのcrashは記録されない

前述の`curl`のレスポンスには`reporting-endpoints`ヘッダーもない。仕様の送信ルール上、エンドポイントがなければ報告は送られない。このブログを読んでいた誰かのタブがメモリ不足で落ちたとしても、その事実はどこにも残らない。Sentryが対応しているかどうかとは関係なく、受け取る場所を宣言していないからだ。

長い静的な記事を読むページなので、すぐに変えるつもりはない。ただ、「crashがない」と「crashを見る手段がない」は、ダッシュボード上ではまったく同じ空の画面だという点は書き留めておく。

## 結論

ブラウザのCPUとメモリの観測は、ほとんどが**条件付きで開かれる観測**である。long taskとLoAFはChromiumからしか届かず、LoAFのスクリプト帰属はcross-originのiframeを見られない。サンプリングプロファイラーは`Document-Policy`ヘッダーを要求するが、そのヘッダー名は仕様上変わりつつあり、ヘッダー自体が指標にコストを与えうる。メモリ計測APIはcross-origin isolationを、crash reportはJavaScriptの外にあるサーバーのエンドポイントを要求する。

このブログはその条件のどれも有効にしていない。その状態は放置ではなく、79KBの決定、standardビルド、ヘッダーを増やさなかった選択が積み重なった結果であり、そのうちstandardビルドはweb-vitalsのLoAFリークを避ける結果にもつながった。観測を増やすこともコストのかかるコードをページに載せることだという点が、この領域では特にはっきりしている。

この記事の数値はすべてlabか、筆者のローカルでの確認だった。実際のユーザーから集まったfield dataがブラウザの外に出て、CrUXやSearch Console、検索でどんな意味を持つのかは、[次の記事](/260916)で続けるつもりだ。この記事を読んだ皆さんも、自分のサービスで有効にしていない観測が何で、それが決定の結果なのか単に見過ごしたものなのか、一度仕分けてみてほしい。

:::ref
- [docs] [MDN, PerformanceLongAnimationFrameTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming)
- [docs] [web.dev, Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
:::
