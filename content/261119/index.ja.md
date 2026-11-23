---
emoji: '🛠️'
title: 'Chrome DevToolsシリーズ目次'
seoTitle: 'Chrome DevToolsシリーズ目次と32本の記事'
date: '2026-11-19'
categories: フロントエンド DevTools
description: 'Chrome DevToolsシリーズで、Network、Elements、Sourcesなどのパネルを、読者が開くときの疑問に沿って紹介します。32本の記事の目次と読む順序、公開画面の観察範囲と測定方法、ローカルコードで再現する項目をまとめました。'
keywords: 'Chrome DevTools, DevTools 使い方, Networkパネル, Elementsパネル, Performanceパネル, ブラウザ開発者ツール, フロントエンド'
locale: ja
translationOf: '261119'
sourceHash: 702bba9ed249e486a86c7ef8f342eb15e8e15bf31740c2ac62f44abae34eb97d
---

Networkパネルを開いて画面のパフォーマンスを調べる読者は、このシリーズでDevToolsのほかのパネルや細かな機能も、疑問ごとに見つけられる。各記事では一つの疑問を設定し、答えを見つけるために使う機能を扱う。

私は会社で画面のパフォーマンスを調べるとき、毎日Networkパネルを開く。ブラウザの開発者ツールを使っていると、いつも使う機能だけに頼りがちだ。そこで、Elements、Sources、Console、Network、Performance、Memory、Application、Security、Lighthouse、Recorderを一つずつ掘り下げるシリーズを書く。公式ドキュメントや専門資料をもとに説明し、実際のブラウザ画面のスクリーンショットも載せる。

## 疑問ごとに分けた32本

このシリーズの目次は、タブ名ではなく、読者がタブを開くときの疑問ごとに分けている。機能を列挙した記事は、最後の節で前の節を一つの判断につなげられず、機能カタログになってしまう。各記事では一つの疑問を設定し、その答えを見つけるために使う機能だけを集めた。一つのタブの記事で扱いきれない機能は、同じタブの次の記事で別の疑問とともに扱う。

各記事は前の記事を読まなくても読める。一つのパネルが一つの疑問で収まらない場合は、サブシリーズに分ける。公式ドキュメントと実際のChrome画面を照らし合わせて、パネル内の要素をすべて書き出し、それぞれをどの記事で扱うか決めた。目次は32本だ。

### Network

- **最初の画面では何をどれだけ受信するのか**: リクエスト一覧、フィルター、列、Size、Initiator。[Networkパネルで追った42 MB](/261120)
- **一つのリクエストにかかる時間は何に使われるのか**: Waterfall、Timingの各段階、Priority、Protocol、Connection ID
- **リクエストとレスポンスの中では何がやり取りされるのか**: 詳細タブ、Cookie、preflight、WebSocket、EventStream
- **条件を変えて原因を絞り込む方法**: throttling、Request conditions、Overrides、Copy as、HAR

### Elements

- **画面のこの要素はDOMのどこにあるのか**: ツリー、バッジ、検索、編集、Break on
- **このスタイルはどこから来たのか**: Styles、Computed、cascade layer、各種エディター
- **レイアウトとアクセシビリティは何で確認するのか**: Layout、Accessibility、Properties、Event Listeners

### Console

- **コンソールのメッセージをどう絞り込んで読むのか**: レベル、フィルター、設定、スタックトレース
- **コンソールからページをどう調べるのか**: Utilities、Live expressions、オブジェクトの表示

### Sources

- **圧縮されたバンドルをどう読むのか**: ファイルツリー、pretty print、ソースマップ、ignore list
- **いつ停止するかをどう決めるのか**: 11種類のブレークポイント
- **停止したあと何を見るのか**: Scope、Watch、Call Stack、実行制御、Threads
- **DevToolsで修正したコードをどう残すのか**: Snippets、Workspace、Overrides、Changes

### Performance

- **記録する前に何を見るのか**: Local metrics、Field metrics、Environment settings
- **記録結果のトラックをどう読むのか**: 概要、Main flame chart、Network、Frames、Interactions、Layout shifts
- **遅い原因をどう絞り込むのか**: Summary、Bottom-up、Call tree、Event log、Insights
- **さらに詳しく測る方法**: Capture settings、Layers、Selector stats、Annotations、拡張API

### Memory

- **何がメモリを占有しているのか**: heap snapshotの4種類の表示、retainers
- **メモリはいつ増えるのか**: Allocations on timeline、sampling、Detached elements、Performance monitor

### Application

- **トスはブラウザに何を保存しているのか**: Cookie、storage、IndexedDB、Cache storage、Storage buckets
- **ページを閉じても動くもの**: Service worker、Manifest、Background services
- **戻る操作と次のページを速くする仕組み**: bfcache、Speculative loads、Frames

### Security, Issues

- **ブラウザが出す警告はどこで読むのか**: Security、Issues

### Lighthouse

- **スコア以外に何を読むのか**: 3つのモード、throttlingの方式、結果

### Recorder

- **ユーザーの操作を記録してテストに変える**: Recorder

### Coverage

- **受信したコードのうち実際に実行されたのはどれだけか**: Coverage

### Rendering

- **画面が再描画される場所を目で見る、メディアクエリを再現する**: Rendering

### Layers, Animations

- **合成レイヤーとアニメーション**: Layers、Animations

### Performance monitor

- **リアルタイム指標で長時間表示したままの画面を確認する**: Performance monitor

### Device mode, Sensors

- **モバイル環境を再現する方法とその限界**: Device mode、Sensors

### エージェント、AI

- **エージェントにDevToolsを使わせる**: DevTools for agents、AI assistance

### すばやく操作する

- **DevToolsをどうすばやく操作するのか**: Command menu、Search、Quick source、ショートカット、Settings

## 扱わないこと

- Media、WebAudio、WebAuthn、Autofillパネルと、プレビュー段階のCSS overviewは扱わない
- Memory inspectorはMemoryの記事で、Developer resourcesはSourcesの最初の記事で一段落を使って扱う

このシリーズが終わったら、ネイティブ開発向けのモバイル編を別に書く。

## 観察範囲と実測方法

観察対象はトスバンクとトス証券の公開画面だ。ログインせず新しいプロファイルで開いて確認し、ログイン画面やアカウントデータはキャプチャしない。サービスがなぜそのように作られているのか、私には分からないので判断しない。パネルに表示される数値と、その数値が生じる仕組みを扱う。

実際のサービス画面はデプロイによって、同じ日でも変わる。そのためすべての数値に測定日とChromeのバージョンを記載し、一つの記事で使う数値とキャプチャは、一度に続けて測定したものだけにする。ブレークポイントとheap snapshotを扱う記事は、読者が手順を再現できるようローカルコードで書く。サービスのバンドルは圧縮されているため、この行で止めるとこの値が見える、という過程を読者がたどれないからだ。必要な記事では、同じ構造を再現した小さなデモも作り、一緒に測定する。

## 読む順序

まずNetworkの4本を書く。Networkの読み方が分かると、PerformanceのNetworkトラックやApplicationを調べやすい。その次にElements、Console、Sourcesの最初の記事、Performanceの順で書く。ローカルコードが必要なSourcesの残り3本とMemoryの2本は、そのあとに書く。ほかのパネルの順序は決めていない。

記事を公開するたびに、この目次にリンクを追加する。各記事で扱うパネルや機能を確認したい読者は、上の項目をたどればよい。

:::ref
- [docs] [Chrome for Developers、Chrome DevTools](https://developer.chrome.com/docs/devtools)
:::