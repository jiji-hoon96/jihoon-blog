---
emoji: 🔎
title: 'Networkパネルで追った42 MB'
seoTitle: 'DevTools Networkパネル実践、InitiatorでToss Bankの42 MBを追う'
date: '2026-11-20'
categories: フロントエンド パフォーマンス DevTools
description: 'Toss Bankのトップページは42 MBを受信する。Networkパネルの下部の概要行、Size、Initiatorを追い、27 MBがカードの背景色の1ピクセルを読むために受信した元PNGだと突き止めた。lazyで防げなかったリクエストと、Disable cacheで膨らんだ10 MBも測る。'
keywords: 'Chrome DevTools Networkパネル, DevTools Networkタブの使い方, Initiator 非同期スタック, Disable cache 初回訪問, loading lazy 画像, Resource Timing transferSize, canvas getImageData CORS, 画像転送量の最適化'
locale: ja
translationOf: '261120'
sourceHash: d042953f2b5f612a21f4d2c9e416a9ddd7b509eafa8de9fa080916dede2a3734
---
今回はChrome DevToolsのNetworkパネルを使って、ページの転送量を最後まで追ってみる。

Networkタブを開いて失敗したAPIを探したことはあるけれど、ページがなぜ重いのか、どこから見ればよいのかわからないフロントエンド開発者に向けた記事だ。下部の概要行、Size列、Initiatorを順に追い、Toss Bankのトップページの42 MBがどこから来たのか、コード1行まで突き止める。その過程で、`loading="lazy"` が防げないリクエストや、Disable cacheを有効にして測った数値が初回訪問と異なる場合も確認する。

私は会社で画面のパフォーマンスを扱うとき、毎日Networkパネルを開いているが、開くといつも見慣れた項目だけを見てしまう。そこでDevToolsのパネルを1つずつ実際のサービスに適用して、最後まで調べることにした。最初の対象には、ログインせず誰でも開けるToss Bankのホーム（`www.tossbank.com`）を選んだ。Toss Bankがなぜこのように作ったのか、私にはわからないので判断はしない。この記事で扱うのは、パネルが示す数値と、その数値が生じる仕組みだ。

## 下部の概要行

測定は2026年11月20日18時台に、Chrome 157.0.8103.80をheadlessで起動して行った。毎回新しいプロファイルを使い、ウィンドウサイズを1600x1000にして開き、ネットワーク制限なしで15秒間に受信したものを数えた。3回繰り返して開くと、MBの小数第2位まで同じ値になった。Toss Bankのホームはデプロイやフィードに応じて変わるため、同じ日の午前中はカードが1つ異なり、2 MB大きかった。そこで同じ構造を再現したデモを[jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/image-color-sampling)に作り、記事の後半で一緒に測定する。

Networkパネルを開いてページを再読み込みしたら、まず一番下の1行を見る。Toss Bankのホームでは、リクエスト156件、`42,202 kB transferred`、`55,603 kB resources`と表示された。[Networkパネルのリファレンス](https://developer.chrome.com/docs/devtools/network/reference)によると、この行は転送サイズと展開後サイズの合計を示す。transferredは、レスポンスヘッダーと圧縮された本文が実際にネットワークを通った量だ。resourcesは圧縮を展開したサイズで、キャッシュから取り出され、ネットワーク上では0バイトだったレスポンスも、そのサイズのまま加算される。そのためresourcesのほうが大きい。

フィルターを適用すると、この行は「フィルター結果 / 全体」の2つの値に変わる。タイプフィルターでImgをクリックすると、`57 / 156 requests`、`40,450 kB / 42,202 kB transferred`となる。リクエスト数では37%の画像が、転送量の96%を占める。そこでまず画像を見る。同じフィルターでresourcesは50,862 kBとなり、transferredより10 MBほど大きい。PNGは圧縮されて届くわけではないので、この差はほぼすべてキャッシュから取り出した画像によるものだ。この数値はDisable cacheを扱うときにもう一度登場する。

![Toss BankのホームのNetwork画面でImgフィルターを有効にし、Sizeを降順に並べ替えると、一番上のバナーはParserが、その下のカードサムネイルはScriptがリクエストしたことがわかる。1はImgフィルター、2は降順に並べ替えたSize列の見出し、3は先頭行tossbank-banner-web-Financial-sector.pngのSizeの2行で、5,590 kBと5,587 kB。4は同じ行のInitiatorで、(index):5とParser。5は2行目bankfeed-gold-decline-cover.pngのInitiatorで、index-8989962b29fa3f03.js:1とScript。6はlogo-bank-mono-white.svgのSizeの2行で、1,616 kBと2,140 kB。7は下部の行にある40,450 kB / 42,202 kB transferred、8は50,862 kB / 55,603 kB resources](1.png?w=720)

## Size列の2行

フィルターをかけたままSize列の見出しをクリックし、大きいものから並べ替える。Size列はデフォルトでは1行だ。フィルターの行の上、Networkパネルのツールバー右端にある歯車アイコンを押してBig request rowsを有効にすると、2行になる。リファレンスによると、上はサーバーが送ったヘッダーと本文を合わせたサイズ、下は圧縮を展開したサイズだ。

一番上のバナー`tossbank-banner-web-Financial-sector.png`は、上が5,590 kB、下が5,587 kBでほぼ同じだ。PNGはすでに圧縮された形式なので、サーバーはレスポンスを再圧縮せず、レスポンスヘッダーに`content-encoding`もなかった。残る3.7 kBはレスポンスヘッダーだけでは説明できない。このレスポンスはHTTP/2で届き、HTTP/2は本文をフレーム（デフォルトの最大サイズは16 KB）に分け、フレームごとに9バイトのヘッダーを付ける。Chromiumはこのフレームヘッダーも受信バイト数に含める（[`spdy_session.cc`](https://github.com/chromium/chromium/blob/main/net/spdy/spdy_session.cc)）。5.6 MBを16 KBのフレームに分けると340個ほどになるため、フレームヘッダーだけで約3 kB。ここにレスポンスヘッダーを加えれば計算が合う。対してロゴの`logo-bank-mono-white.svg`は、上が1,616 kB、下が2,140 kBで差が開いている。SVGはテキストなのでgzipで圧縮されて転送された。ロゴが2 MBあるのは、ファイル内にPNGが2枚base64で入っているからだ。

並べ替えた一覧の上のほうには、トップバナーとフィードカードのサムネイルが並ぶ。大きなバナー3枚は元画像が5120x2800で、画面上では1600x1000に描画される。`bankfeed-`で始まるカードサムネイルは元画像が3200x2160で、画面上では302x170に描画される。CSSピクセル1つを物理ピクセル2つで描画するRetina画面のような環境（デバイスピクセル比2）を基準にしても、バナーには必要な幅3,200 pxに対して5,120 px、カードには604 pxに対して3,200 pxの画像が届く。元画像のサイズは、ページで`naturalWidth`を読み取って確認した。

別の方法でもSizeの上段の値を照合した。この記事の転送量は、Chrome DevTools Protocol（CDP）がリクエストごとに返す`encodedDataLength`を合計した値で、下部の行とバイト単位で一致した。ページ内のJavaScriptからも読み取れる。`performance.getEntriesByType('resource')`で最大のカードサムネイルを見ると、`transferSize`は`encodedBodySize`より300大きい。[Resource Timing仕様](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-transfersize)では、実際のヘッダーサイズが明らかにならないように、本文サイズに定数300を加えると定めている。この値が別originの画像で確認できたのは、リクエストがCORSで送信され、サーバーが`access-control-allow-origin`と`timing-allow-origin`の両方を`*`に設定していたからだ。

サイズだけを見ると、よくある画像最適化の話だ。ところがInitiator列も見ると、カードサムネイルは画面上の`<img>`ではなく、スクリプトがリクエストしていた。

## Initiatorと非同期スタック

Initiator列は、誰がこのリクエストを作ったかを示す。リファレンスにある値はParser、Redirect、Script、Early Hints、Otherだ。図1では、バナーのInitiatorは`(index):5`とParserだ。HTMLを読み込んでいたパーサーが`<img>`を見つけてリクエストした。カードサムネイルの`bankfeed-gold-decline-cover.png`は、`index-8989962b29fa3f03.js:1`とScriptだ。スクリプトの実行中にリクエストが送信された。

画面に見えるカードは`<img>`なのに、なぜScriptなのだろう。行をクリックして詳細画面のInitiatorタブを開くと、リクエストを作った呼び出しスタックが表示される。

![同じリクエストのInitiatorタブに、Image、setTimeout、await in fetchの3つの非同期境界に分かれた呼び出しスタックが表示される。1はInitiatorタブ、2は最初のまとまりImageで、T.o、T、(anonymous)の2つがどちらもindex-8989962b29fa3f03.jsにある。3はsetTimeoutのまとまりで、mainと_appバンドルのbatch、setData、fetchがある。4はawait in fetchのまとまりで、H、onSubscribe、subscribeがある](2.png?w=720)

太字の`Image`、`setTimeout`、`await in fetch`は非同期境界だ。各境界の下にあるフレームは、その非同期処理を予約した時点のスタックだ。だから下から上へ読むと時間順になる。

1. `fetch`という名前の関数が`await`でデータを待ち、再開する（4）。この名前はブラウザーの`window.fetch`ではなく、バンドル内の関数名だ。その下の`onSubscribe`、`subscribe`は、その関数を呼び出した側だ
2. その関数が`setData`で状態を変更し、`batch`を経由して`setTimeout`を予約する（3）
3. タイマーが動き、React内部に見える`framework-*.js`のフレームを通って、関数`T`が画像の`src`を設定する（2）

一番上の境界`Image`は、スクリプトが画像要素に`src`を設定した瞬間だ。実際のリクエストはその直後にブラウザーが別途送信するため、Initiatorはその瞬間のスタックを示す。この名前だけでは、DOMの`<img>`なのか`new Image()`なのかを区別できない。それはコードを開いてみないとわからない。

スタックの`index-8989962b29fa3f03.js:1`をクリックすると、Sourcesパネルでその位置が開く。Sourcesは圧縮されたファイルをデフォルトで展開して（pretty print）表示するので、1行だけのバンドルでも読める。バンドルのハッシュはデプロイごとに変わるが、Initiatorのリンクをたどればそのときのファイルに移動できる。私は同じファイルを入手して読み、カードコンポーネントのeffectと思われるコールバックが、サムネイルのURLを使って`T`を呼び出していることを確認した。`T`が行うのは4つだ。

1. `new Image()`を作り、`crossOrigin`を`"anonymous"`に設定してから、カードサムネイルの元のURLを入れる
2. 読み込みが終わると、画像と同じサイズのcanvasを作る
3. 画像をcanvasに描画する
4. `getImageData`で右端から20 px、上から20 pxの位置にあるピクセルを1つ読み取り、その色をカードの背景色として使う

`T`はサムネイルの端の色でカードの背景を塗る。その1ピクセルを読み取るために、元のPNGを丸ごと受信する。トップページでこの経路から受信したカードサムネイルは24枚、27.14 MBだ。画像転送量40.45 MBの3分の2にあたる。

この流れを1枚の図にまとめると、こうなる。同じ元画像を2つの経路からリクエストする。

![同じ元PNGをリクエストする2つの経路。カードのimg loading lazyは画面に近づくとInitiator Parserでリクエストする。スクリプトのnew Image()はフィードデータが届くと24枚すべてをInitiator Scriptでリクエストし、受信した元画像を同じサイズのcanvasに描画してからgetImageDataでピクセルを1つ読み取る。3200x2160の元画像ならcanvasは約27.6 MB。2つ目のリクエストはキャッシュが有効なら0 Bで、Disable cacheでは再度受信する](3.png?w=720)

この違いを確認できるのはDevToolsのInitiatorだ。ページ内のResource Timingでは区別できない。`new Image()`で受信したサムネイルも、`initiatorType`は`"img"`と記録された。仕様ではimg要素の`src`を処理して生じたリクエストを`img`に分類し、`new Image()`もimg要素だからだ。

### 元画像サイズのcanvasとCORS

`T`はcanvasの`width`と`height`を画像の元サイズに設定する。[HTML仕様](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element)ではcanvasのビットマップのサイズはこの2つの属性で決まるため、3200x2160の画像なら691万ピクセルのビットマップができる。1ピクセルあたりRGBA 4バイトで計算すると約27.6 MBだ。`drawImage`を実行するには元のPNGも展開する必要があるので、同じサイズのデコード済みビットマップがもう1つでき、この処理をサムネイルごとに繰り返す。canvasは関数内のローカル変数なので、GCが片付けるまで一時的に存在する。この数値は計算で求めた。私はプロセスメモリで測ろうとしたが、レンダラーとGPUプロセスに分散した値が実行ごとに変わり、バリエーション間の差を見分けられなかった。

`crossOrigin="anonymous"`は`getImageData`のために必要だ。画像はページとは異なるoriginの`static.toss.im`から届く。[HTML仕様](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements)では、異なるoriginの画像を許可なく描画したcanvasを読み取れないようにし、その状態で`getImageData`を呼ぶと`SecurityError`を投げると定めている。`crossOrigin`を設定するとリクエストがCORSで送信され、サーバーが許可すればcanvasを読み取れる。その許可はHeadersタブのレスポンスヘッダー`access-control-allow-origin: *`で確認できる。

## lazyの対象外にあるスクリプトリクエスト

カードの`<img>`には`loading="lazy"`が付いている。それでも24枚をトップページで受信するのは、lazyがその`<img>`自身のリクエストを遅らせるだけだからだ。[HTML仕様](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#lazy-loading-attributes)では、条件が満たされるまで受信を遅らせる状態としてlazyを定義している。同じURLをスクリプトが別途リクエストすれば、そのリクエストはlazyとは関係がない。

どれだけ先に読み込まれたかを数えると、次のようになる。lazyが付いたカードの`<img>`24個は、文書上の位置760 pxから3,411 pxの間にある。15秒後に読み込まれていたのは1,896 pxまでの12個で、2,275 pxから下にある残り12個は読み込まれていなかった。[web.devの遅延読み込みに関するドキュメント](https://web.dev/articles/browser-level-image-lazy-loading)によると、Chromeは接続状態を4Gと推定した場合、ビューポートから1,250 px以内に入ったlazy画像を先行して受信する。ウィンドウの高さ1,000 pxに1,250 pxを加えると2,250 pxなので、観察した境界はこの基準と一致する。その下の12枚は`<img>`ではまだ受信するタイミングではなかったのに、スクリプトが17.20 MBを先に受信した。最大のサムネイル5,376 kBも文書上の位置2,654 pxにあり、これに含まれる。

モバイル画面ではこの割合がさらに大きくなる。同じページをiPhoneのユーザーエージェントと390x844の画面で開くと、転送量は42.17 MBでほぼ同じだった。カードが1行に1つずつ並ぶことで、ウィンドウの高さ844 pxに1,250 pxを加えた境界の外に押し出されるカードは19枚、23.88 MBに増えた。

トップバナーはlazyとは別の理由で、画面に表示されない画像を受信する。モバイル画面ではデスクトップ用バナー4枚、10.27 MBを受信し、デスクトップではモバイル用バナー4枚、1.42 MBを受信した。どちらも`display: none`の領域にある`<img>`で、`loading`はない。HTML仕様では画像はデフォルトですぐに受信すると定めているため、非表示の`<img>`も受信する。

## Disable cacheと重複リクエスト

ここまではDisable cacheをオフにして測定した。Networkパネルのリファレンスでは、このチェックボックスを説明する節のタイトルを「初回訪問者を模倣する（Emulate a first-time visitor）」としている。Chrome 157のPerformanceパネルも、この設定の横に初回訪問に似たネットワーク体験を模倣すると記載している。そのため、初回訪問を測る際に、まずこのチェックボックスをオンにすることが多い。Toss Bankのホームで有効にして再度測定した。

![Disable cacheを有効にすると同じサムネイルがParserとScriptで2回受信され、転送量が52 MBに増える。1はチェック済みのDisable cache、2はbankfeed-ipo-reorganization-cover.pngが2行で表示され、上の行はInitiator (index):5 Parser、下の行はindex-8989962b29fa3f03.js:1 Scriptで、どちらも1,625 kB。3は下部の行にある50,391 kB / 52,148 kB transferred](4.png?w=720)

転送量は42.20 MBから52.15 MBに9.95 MB増えた。そのうち9.94 MBは、画面に近く読み込まれたカードの`<img>`12個によるものだ。残りのリクエスト7件は画像ではなく、小さなpreflightリクエストだった。キャッシュが有効な初回訪問では、この12個は0バイトだった。スクリプトが同じファイルを先に受信していて、後から来た`<img>`リクエストがそれを再利用していた。Disable cacheを有効にすると、同じファイルをもう一度受信する。図4では、同じファイル名の行がParserとScriptで2回表示されている。下部の概要行でresourcesがtransferredより10 MBほど大きかったのも、この12個が原因だ。

どのキャッシュがそのファイルを再利用したのかは、この測定では確認できなかった。12個のうち1つはレスポンス情報にディスクキャッシュと表示され、残りの11個はキャッシュ表示なしで0バイトだった。レスポンスは`cache-control: max-age=86400`で、`Vary`ヘッダーはなかった。CORSリクエスト（`crossOrigin`）と通常の`<img>`リクエストではcredentialsモードが異なる。Blinkのメモリキャッシュを扱う[`resource.cc`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/loader/fetch/resource.cc)には、credentialsモードが先行リクエストと異なる場合は再取得するとあり、その例として、サーバーが`Access-Control-Allow-Origin: *`を返し、CORSリクエストとそうでないリクエストが混在する場合を挙げている。一方、HTTPキャッシュをcredentialsで分割する機能（`kSplitCacheByIncludeCredentials`）は[`net/base/features.cc`](https://github.com/chromium/chromium/blob/main/net/base/features.cc)でデフォルトで無効になっている。そのためHTTPキャッシュ側で再利用されたように見えるが、測定で確認したわけではない。

初回訪問者とは、キャッシュが空の人であって、キャッシュがない人ではない。最初に受信したファイルは、同じページ内ですぐに再利用される。Disable cacheはその再利用まで防ぐため、1つのページが同じファイルを2回リクエストする構造なら、このチェックボックスを有効にして測った値は初回訪問より大きくなる。そのようなページで初回訪問を測るには、キャッシュを消去してからチェックボックスをオフにしたまま再読み込みする。Networkパネルのリクエスト一覧を右クリックするとClear browser cacheがある。同じ処理をするCDPコマンドで確認したところ、1度開いた後にキャッシュを消去して再度開くと42.20 MBで、初回に開いたときと同じだった。消去せずに再度開くと0.16 MBだった。

## 同じ構造をデモで測る

Toss Bankのホームはこの記事の公開後も変わる。そこで同じ構造を公開素材で再現した。3200x2160のPNGカード24枚を異なるoriginから受信し、カードごとに`<img loading="lazy">`を配置する。カードの背景色を決める方法だけを3種類に変えた。色を読み取るコードは次のとおりだ。

```js
async function sampleColor(src, x, y) {
  const img = await new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const [r, g, b] = ctx.getImageData(img.width - x, y, 1, 1).data;
  return { r, g, b };
}
```

- **元画像から読み取る**: Toss Bankと同じ構造。カードの元画像を使って`sampleColor`を呼び出す
- **サムネイルから読み取る**: 同じ関数を64x43のサムネイルで呼び出す
- **事前計算した色**: 色をJSONで受け取って使う

同じ条件（ウィンドウ1600x1000、新しいプロファイル、3回）で測った3つのバリエーションの転送量は、16.80 MB、8.03 MB、7.94 MBだった。元画像から読み取ると、画面から遠いカード12枚まで受信するため、2倍になる。サムネイルから読み取る場合、64x43のサムネイル24枚の転送量98 kBが加わるだけだ。Disable cacheを有効にすると、元画像から読み取るバリエーションだけが24.73 MBに増えた。事前計算した色を使うバリエーションは同じファイルを2回リクエストしないため、7.94 MBのままだった。NetworkパネルのInitiatorもToss Bankと同じで、色の読み取りリクエスト24件はScript、カードの`<img>`リクエストはParserと表示された。

## 下部の行からコード1行まで

Toss Bankのトップページの42.20 MBのうち、40.45 MBは画像で、そのうち27.14 MBはスクリプトがカードの背景色の1ピクセルを読むために受信した元PNG24枚だった。`loading="lazy"`はカードの`<img>`リクエストだけを遅らせたため、画面から遠いカード12枚、17.20 MBもトップページで受信した。Disable cacheを有効にして測ると、同じファイルを2回受信し、52.15 MBになる。

この結論を出すのに使った機能は多くない。下部の概要行で全体の転送量を確認し、タイプフィルターで重い種類を見分け、Sizeを並べ替えて大きいものから調べ、Initiator列でリクエスト元を分け、Initiatorタブの非同期スタックでコードまでたどった。画像が大きいことはSize列だけでわかる。その画像をなぜ受信するのかは、Initiatorまで見て初めてわかる。

皆さんのサービスでもImgフィルターを有効にしてSizeで並べ替えるか、フィルターボックスに`larger-than:500k`を入力して大きなレスポンスだけを残し、上のほうの行のInitiatorがParserかScriptか、一度見てみることを勧める。Scriptなら、そのリクエストには`loading="lazy"`も`srcset`も適用されない。画像から色を読み取る必要があるなら、デモで測ったように色を事前計算してデータとして渡すか、小さなサムネイルから読み取るだけで、受信量は半分になる。そして初回訪問を測るときは、そのページが同じファイルを2回リクエストするか、まず確認しよう。そうならDisable cacheではなく、キャッシュを消去したブラウザーで開く。

この記事は、DevToolsのパネルを1つずつ実際のサービスに適用して調べるシリーズの第1回だ。次回は、同じNetworkパネルのWaterfallとTimingタブで、1つのリクエストにどれだけ時間が使われるかを見る。

:::ref
- [docs] [MDN、画像とcanvasのクロスオリジン利用を許可する](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [docs] [Chrome DevTools、ネットワークアクティビティを検査する](https://developer.chrome.com/docs/devtools/network)
:::