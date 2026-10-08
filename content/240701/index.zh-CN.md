---
emoji: 🧬
title: "LZ77 与 LZ78 的区别"
seoTitle: "LZ77 与 LZ78 的区别：滑动窗口、显式字典与 DEFLATE 的起源"
date: "2024-07-01"
updatedAt: "2026-10-08"
categories: 随想 软件
description: "整理 LZ77 与 LZ78 处理字典的方式有何不同：滑动窗口与显式字典的差异、遗忘旧内容方式的差异，以及经由 DEFLATE 延续到 ZIP、GZIP、Zstd 的 LZ77 一系谱系。"
keywords: "LZ77, LZ78, LZ77 LZ78 区别, LZ77 算法, 滑动窗口压缩, LZW, DEFLATE 原理, 基于字典的压缩"
locale: zh-CN
translationOf: '240701'
sourceHash: 3fe0bc5f9354bcd879485454d0b7f37acf77ad6e53d5a8ff9132076f428eb156
---

这篇文章想聊聊 **LZ77 与 LZ78 有何不同**。

本文写给使用 zip、gzip、zstd 这类压缩工具、好奇其中基于字典的压缩如何运作的开发者。读完之后，你能说明这两种算法在处理字典上的区别，以及如今的主流压缩工具出自哪一系。

比较构建产物该用哪种压缩格式时，最终都会一路追溯到这两种算法。

<hr>

## 什么是无损压缩？

无损压缩（Lossless Compression）是一种能够完整还原原始数据的压缩方式。它不同于图像和音频中常见的有损压缩（Lossy Compression）：解压后的数据与原始数据连一个比特都不会不同。源代码和构建产物对数据完整性要求很高，因此必须使用无损压缩。

无损压缩的核心思想是**利用数据中存在的统计冗余**。把反复出现的模式替换成更短的表示，整体体积就会减小。

其中，**基于字典（Dictionary-Based）的方法**是无损压缩中被广泛使用的算法家族。这里的“字典”不是解释词义的词典，而是一张把之前出现过的数据片段映射成短代码的查找表。Jacob Ziv 和 Abraham Lempel 在 1977 年发表于 IEEE Transactions on Information Theory 的论文 [A Universal Algorithm for Sequential Data Compression](https://doi.org/10.1109/TIT.1977.1055714) 中提出的 **LZ77**，以及第二年以 [Compression of Individual Sequences via Variable-Rate Coding](https://doi.org/10.1109/TIT.1978.1055934) 发表的 **LZ78**，正是这个家族的始祖。“LZ”取自两位研究者姓氏的首字母。后来出现的基于字典的压缩算法（DEFLATE、LZMA、LZ4、Zstd 等）都能追溯到这两种算法。

举个简单的例子。如果“Linux”这个单词在文本中出现 100 次，压缩器可以在第一次出现时把它登记进字典，后续出现时则替换成表示“字典第 1 项”的短引用，也就是指针。“Linux”占 5 个字节，而指针通常可以用更少的字节表示，整体大小因此下降。

那么，LZ77 和 LZ78 具体有什么区别？

<hr>

### LZ77：滑动窗口方式

LZ77 **不会单独建立一份显式字典**，而是把输入流中的一段区域直接当作字典。这段区域称为**滑动窗口**，因为它会随着数据处理不断向前移动。（算法题里也经常见到这个词。）

窗口分成两个区域。

- **搜索缓冲区（Search Buffer）**：已经处理过的数据，承担字典的作用。
- **前向缓冲区（Look-ahead Buffer）**：尚未处理、接下来要压缩的数据。

算法会检查前向缓冲区的开头是否曾在搜索缓冲区中出现。如果找到相同模式，就把这次匹配编码为（**距离、长度、下一个字符**）的元组。距离表示要向后退多少字符才能找到匹配的起点，长度表示匹配持续多少字符。

例如，用本文后面给出的教学用编码器压缩字符串 `"banana_banana"`，会得到五个 LZ77 token：`(0,0,b)` `(0,0,a)` `(0,0,n)` `(2,3,_)` `(7,5,a)`。前三个是第一次见到的字符，没有匹配，只带下一个字符。第二个 `"banana"` 只用最后一个 token `(7,5,a)` 就处理完了，意思是“向后退 7 个字符，复制 5 个字符，再接上 `a`”。之所以不复制全部 6 个字符，是因为这个编码器总是把输入的最后一个字符留在“下一个字符”的位置上。

在 `(2,3,_)` 中，长度 3 比距离 2 还长。解码器在已经写出 `ban` 的状态下，从往回 2 个字符处的 `a` 开始复制；复制第三个字符时，读到的是刚刚写出的 `a`。于是得到 `ana`，再接上 `_`。逐个字符跟下来是这样的。

| 步骤 | 读到的字符 | 输出 |
|---|---|---|
| 开始 | 无 | `ban` |
| 复制 1 | 第 2 个字符 `a` | `bana` |
| 复制 2 | 第 3 个字符 `n` | `banan` |
| 复制 3 | 第 4 个字符 `a`（复制 1 中写出的） | `banana` |
| 下一个字符 | token 中的 `_` | `banana_` |

[RFC 1951](https://www.rfc-editor.org/rfc/rfc1951) 也明确规定了同样的行为：若最后两个字节是 X、Y，`<length = 5, distance = 2>` 会追加 X,Y,X,Y,X。之所以能这样做，是因为字典本身就是刚刚还原出来的数据。

这种方式**不另外保存或传输字典。** 解码器在解压过程中自行重建搜索缓冲区，因此字典被隐式地嵌入数据本身。由于引用指向前面的数据，解压基本上要从开头按顺序进行。不过，引用能够到达的范围只到窗口为止。RFC 1951 把 DEFLATE 的引用限制在最多往前 32K 字节。因此 zlib 提供了重置压缩状态的 `Z_FULL_FLUSH`，[zlib.h](https://github.com/madler/zlib/blob/v1.3.1/zlib.h) 写明可以从该位置重新开始解压，需要随机访问时可以使用它。文档同时警告，用得太频繁会严重降低压缩率。

窗口大小与压缩率之间存在直接的权衡。窗口越大，就越能引用距离更远的模式，压缩率通常也越高；但匹配搜索所需的计算量和内存占用也会随之增加。

<hr>

### LZ78：显式字典方式

与 LZ77 不同，LZ78 会在压缩过程中**构建一份显式字典**，不使用滑动窗口。它把之前见过的模式保存成带索引的字典项，之后遇到相同模式时用索引替换。

LZ78 的输出单位是（**字典索引、下一个字符**）形式的标签。编码器先找到字典中最长的匹配项，再输出该项的索引和打破匹配的下一个字符，随后把 **“刚才匹配的项＋新字符”** 加入字典。字典会在处理过程中逐步增长。

用 LZ78 压缩同一个 `"banana_banana"`，会得到八个 token，字典里积累七个条目。token 是 `(0,b)` `(0,a)` `(0,n)` `(2,n)` `(2,_)` `(1,a)` `(3,a)` `(7,)`，字典是 `1:b` `2:a` `3:n` `4:an` `5:a_` `6:ba` `7:na`。第二个 `"banana"` 被拆成生成 `ba`、`na`、`na` 的三个 token，而 LZ77 只用一个 token 就处理完了这一段。LZ78 的字典条目每次只能变长一个字符，所以同一个词要见过好几次，才会出现长条目。最后的 `(7,)` 是输入结束、没有下一个字符的情况。这个编码器不把 token 打包成比特，因此不能用 token 数量来比较压缩率。

这两组 token 可以用下面的代码复现。这是 2026-10-08 在 macOS 26.6.2、Node v24.16.0 上把代码保存为文件并运行 `node lz.mjs` 得到的结果。

```js
// LZ77: (거리, 길이, 다음 문자). 가장 긴 일치를 고르고, 겹친 복사를 허용한다
function lz77(s, win = 4096) {
  const out = []
  let i = 0
  while (i < s.length) {
    let best = { d: 0, l: 0 }
    for (let j = Math.max(0, i - win); j < i; j++) {
      let l = 0
      // 입력의 마지막 글자는 매치에 넣지 않고 다음 문자로 남긴다
      while (i + l < s.length - 1 && s[j + l] === s[i + l]) l++
      if (l > best.l) best = { d: i - j, l }
    }
    out.push([best.d, best.l, s[i + best.l]])
    i += best.l + 1
  }
  return out
}

// LZ78: (사전 인덱스, 다음 문자). 인덱스 0 은 빈 문자열이다
function lz78(s) {
  const dict = new Map()
  const out = []
  let w = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (dict.has(w + c)) {
      if (i < s.length - 1) { w += c; continue }
      out.push([dict.get(w + c), '']) // 입력이 끝나 다음 문자가 없다
      break
    }
    out.push([w ? dict.get(w) : 0, c])
    dict.set(w + c, dict.size + 1)
    w = ''
  }
  return { out, dict: [...dict.keys()] }
}

// 두 디코더 모두 토큰만 받는다. 사전은 전달받지 않는다
function unlz77(tokens) {
  let o = ''
  for (const [d, l, c] of tokens) {
    for (let k = 0; k < l; k++) o += o[o.length - d] // 방금 쓴 글자도 다시 읽는다
    o += c
  }
  return o
}
function unlz78(tokens) {
  const dict = ['']
  let o = ''
  for (const [i, c] of tokens) {
    const entry = dict[i] + c
    o += entry
    dict.push(entry) // 인코더와 같은 순서로 사전을 다시 쌓는다
  }
  return o
}

const s = 'banana_banana'
const a = lz77(s)
const b = lz78(s)
console.log('LZ77', a.map(([d, l, c]) => `(${d},${l},${c})`).join(' '), unlz77(a) === s)
console.log('LZ78', b.out.map(([i, c]) => `(${i},${c})`).join(' '), unlz78(b.out) === s)
console.log('사전', b.dict.map((e, k) => `${k + 1}:${e}`).join(' '))
```

```text
LZ77 (0,0,b) (0,0,a) (0,0,n) (2,3,_) (7,5,a) true
LZ78 (0,b) (0,a) (0,n) (2,n) (2,_) (1,a) (3,a) (7,) true
사전 1:b 2:a 3:n 4:an 5:a_ 6:ba 7:na
```

代码里的两个解码器都只接收 token。也就是说，**LZ78 同样不传输字典**。解码器一边读 token，一边按与编码器相同的顺序添加条目，于是重新积累出同一份字典。不传输字典是两种算法的共同点，二者真正分开的地方在于**遗忘旧内容的方式**。LZ77 的窗口向前滑动，旧数据会自然被遗忘。LZ78 的字典只会增长，所以实现必须设定上限，字典满了以后要么冻结，要么清空。

LZ78 最著名的变体是 **LZW**（Lempel-Ziv-Welch）。Terry Welch 在 1984 年发表了这项改进，它被用于 GIF 图像格式和 Unix 的 `compress` 工具（扩展名为 `.Z`）。这两种实现都给字典设了上限。[GIF89a 规范](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) 把编码限制在最多 12 位（最大值 4095），并另设一个把字典恢复到初始状态的 Clear code。根据 [ncompress 手册页](https://github.com/vapier/ncompress/blob/v5.0/compress.1)，`compress` 在编码长度达到 `-b` 上限（默认 16 位）之后会持续观察压缩率，一旦压缩率下降，就丢弃字典并从头重建。

<hr>

### 现代压缩算法属于哪一支？

今天的主流压缩算法大多是 **LZ77 的后代**。

Storer 和 Szymanski 在 1982 年发表的 **LZSS** 是 LZ77 的改进变体。如果匹配太短，指针反而比原始字符更长，它就不输出指针，而是直接输出“字面量（原始字符）”。

**DEFLATE** 由 Phil Katz 为 PKZIP 2 设计，1996 年其规范整理为 RFC 1951。RFC 1951 把 DEFLATE 描述为 LZ77 与**霍夫曼编码**（为高频符号分配更短比特串的熵编码）的组合。它的输出是字面量与（长度, 距离）对交错的序列，并把字面量和匹配长度合并进同一个字母表（0～285），用同一套霍夫曼编码来区分。ZIP 的默认压缩方式、GZIP 和 PNG 都使用这个 DEFLATE。也就是说，我们每天接触的 `.zip`、`.gz`、`.png` 文件大多是 LZ77 的直系后代。

后来出现的 **LZMA**（7-Zip、XZ）、**LZ4** 和 **Zstd** 也都以 LZ77 的滑动窗口思想为起点，继续改进匹配搜索的数据结构和熵编码方法。LZ78 一系则以 LZW 的形式留在 GIF 这类格式之中。

两篇论文各自在自己的模型下证明了渐近最优性。1977 年的论文证明了 LZ77 的压缩率会一致地逼近为事先已知信源而设计的编码所能达到的下界（"uniformly approaches the lower bounds"），1978 年的论文则以个体序列（individual sequence）为对象，证明了 LZ78 的 incremental parsing 是渐近最优的。由于模型不同，仅凭这些结果无法比较两者。

<hr>

## 结语

LZ77 与 LZ78 都源于“用简短引用替换重复模式”这一想法。两者都不传输字典，而是由解码器重新积累，但它们在引用指向的是已经走过的数据中的位置，还是另外积累的字典中的编号这一点上分道扬镳，遗忘旧内容的方式也不同。从 DEFLATE 到 LZMA、LZ4、Zstd，此后的主流压缩工具都是 LZ77 一系的后代，LZ78 一系则以 LZW 的形式留在 GIF 这类格式中。

这一谱系在实际选择格式时会带来怎样的差异，也就是比较 ZIP、GZIP、ZSTD、XZ 的速度与压缩率、决定构建产物该用哪一种，请见 [理解压缩算法](/240706)。

下次解压 `.zip` 或 `.gz` 文件时，希望你能想起，其中正来回传递着“往回数若干个字符，再复制若干个字符”这样的指令。


### 参考资料

:::ref
- [paper] [Storer, Szymanski, Data compression via textual substitution (1982)](https://doi.org/10.1145/322344.322346)
- [paper] [Welch, A Technique for High-Performance Data Compression (1984)](https://doi.org/10.1109/MC.1984.1659158)
- [docs] [PKWARE, APPNOTE.TXT: .ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- [docs] [W3C, Portable Network Graphics (PNG) Specification (Third Edition)](https://www.w3.org/TR/png-3/)
:::
