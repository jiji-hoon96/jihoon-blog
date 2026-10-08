---
emoji: 🧬
title: "The Difference Between LZ77 and LZ78"
seoTitle: "LZ77 vs LZ78: Sliding Window, Explicit Dictionary, DEFLATE"
date: "2024-07-01"
updatedAt: "2026-10-08"
categories: curiosities software
description: "How LZ77 and LZ78 handle their dictionaries differently, how each forgets old data, and how DEFLATE, ZIP, GZIP, and Zstd descend from LZ77."
keywords: "LZ77, LZ78, LZ77 vs LZ78, LZ77 algorithm, sliding window compression, LZW, how DEFLATE works, dictionary-based compression"
locale: en
translationOf: '240701'
sourceHash: 29216d8e93d6fdaf86db46ce5a539dbbda0ebcb2b851d59aa3a5e384e313908f
---

In this post, I want to talk about **how LZ77 and LZ78 differ**.

This post is for developers who use tools like zip, gzip, and zstd and have wondered how the dictionary-based compression inside them works. By the end, you will be able to explain how the two algorithms differ in handling their dictionaries and which of the two today's mainstream compressors descend from.

If you compare formats for compressing build artifacts, you eventually end up tracing them back to these two algorithms.

<hr>

## Dictionary-based compression

Lossless compression is a method that lets us restore the original data perfectly. Unlike lossy compression, which is common for images and audio, decompressed data does not differ from the original by even a single bit. Source code and build artifacts require lossless compression because their integrity must be preserved.

The central idea behind lossless compression is **taking advantage of statistical redundancy in data**. Replacing repeated patterns with shorter representations reduces the total size.

Among these techniques, **dictionary-based compression** is a widely used family of lossless algorithms. Here, a dictionary is a mechanism that lets the compressor point back to data it has already seen. Whether that mechanism is the data already passed through or a separately built list is what separates LZ77 from LZ78. **LZ77**, first proposed by Jacob Ziv and Abraham Lempel in a 1977 [paper](https://doi.org/10.1109/TIT.1977.1055714) in IEEE Transactions on Information Theory, and **LZ78**, from the [paper the two published the following year](https://doi.org/10.1109/TIT.1978.1055934), are the ancestors of this family. The letters “LZ” come from the researchers’ surnames. The dictionary-based compression algorithms that followed, including DEFLATE, LZMA, LZ4, and Zstd, trace their roots back to these two.

Here is a simple example. If the word “Linux” is repeated 100 times, from the second occurrence on the compressor writes a short reference pointing to “that piece seen earlier” instead of the original text. If the reference is shorter than the original, the total size shrinks.

So how exactly do LZ77 and LZ78 differ?

<hr>

## LZ77: the sliding-window approach

LZ77 does **not build a separate explicit dictionary**. Instead, it treats a region of the input stream itself as a dictionary. This region is called a **sliding window** because it slides forward by as much as has been processed.

The window has two regions.

- **Search buffer**: data that has already been processed. It acts as the dictionary.
- **Look-ahead buffer**: data that has not yet been processed and is about to be compressed.

The algorithm checks whether the beginning of the look-ahead buffer has appeared somewhere in the search buffer. When it finds the same pattern, it encodes the match as a **(distance, length, next character)** tuple. Distance tells the decoder how far back to find the start of the match, while length says how many characters the match contains. The original paper recorded the first value as a position inside the buffer, and today’s implementations record the same information as a distance.

For example, compressing the string `"banana_banana"` with the teaching encoder included later in this post produces five LZ77 tokens: `(0,0,b)` `(0,0,a)` `(0,0,n)` `(2,3,_)` `(7,5,a)`. The first three are characters seen for the first time, so they carry only a next character and no match. The second `"banana"` is handled by the single last token `(7,5,a)`. It means “go back seven characters, copy five, and append `a`.” It does not copy all six characters because this encoder always leaves the last character of the input in the next-character slot.

In `(2,3,_)`, the length 3 is longer than the distance 2. With `ban` already written, the decoder starts copying from the `a` two characters back, and when it copies the third character it reads the `a` it has just written. That yields `ana`, and then `_` is appended. Followed one character at a time, it looks like this.

| Step | Character read | Output |
|---|---|---|
| Start | none | `ban` |
| Copy 1 | 2nd character, `a` | `bana` |
| Copy 2 | 3rd character, `n` | `banan` |
| Copy 3 | 4th character, `a` (written in copy 1) | `banana` |
| Next character | `_` from the token | `banana_` |

[RFC 1951](https://www.rfc-editor.org/rfc/rfc1951) specifies the same behavior: if the last two bytes are X and Y, `<length = 5, distance = 2>` appends X,Y,X,Y,X. This works because the dictionary is the data that has just been restored.

In this approach, **the dictionary is not stored or transmitted separately.** The decoder reconstructs the search buffer itself while decompressing, so the dictionary is implicitly embedded in the data itself. Because references point to earlier data, decompression basically proceeds in order from the beginning. References, however, only reach as far back as the window. RFC 1951 limits DEFLATE references to at most 32K bytes back. zlib’s `Z_FULL_FLUSH` resets the compression state so that decompression can restart from that point if earlier compressed data has been damaged or random access is needed. [zlib.h](https://github.com/madler/zlib/blob/v1.3.1/zlib.h) warns that using it too often can seriously degrade compression.

Window size has a direct trade-off with compression ratio. A larger window can refer to patterns farther away and therefore compress better, but it uses more memory, and with more candidates to check, match searching usually gets slower too.

<hr>

## LZ78: an explicit dictionary

Unlike LZ77, LZ78 **constructs an explicit dictionary** as it compresses the input. There is no sliding window. Previously observed patterns are stored as indexed dictionary entries, and later occurrences are replaced by their indexes.

LZ78 outputs tags in the form **(dictionary index, next character)**. The encoder finds the longest matching dictionary entry, outputs its index together with the next character that breaks the match, and then adds **“the matched entry plus the new character”** to the dictionary. The dictionary grows incrementally as the input is processed.

Compressing the same `"banana_banana"` with LZ78 produces eight tokens and builds up seven dictionary entries. The tokens are `(0,b)` `(0,a)` `(0,n)` `(2,n)` `(2,_)` `(1,a)` `(3,a)` `(7,)`, and the dictionary is `1:b` `2:a` `3:n` `4:an` `5:a_` `6:ba` `7:na`. The second `"banana"` is split into three tokens that produce `ba`, `na`, and `na`. This is the part LZ77 finished with one token. An LZ78 dictionary entry grows by only one character at a time, so a long entry appears only after the same word has been seen several times. The last token `(7,)` is the case where the input ends and there is no next character. This encoder does not pack tokens into bits, so token counts cannot be used to compare compression ratios.

You can reproduce both token streams with the code below. I saved it to a file and ran it with `node lz.mjs` on macOS 26.6.2 and Node v24.16.0 on 2026-10-08.

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

Both decoders in the code receive only tokens. That means **LZ78 does not transmit its dictionary either**. The decoder reads the tokens and adds entries in the same order as the encoder, so the same dictionary is rebuilt. Not transmitting the dictionary is something the two algorithms share. Where they part ways is **how they forget old content**. LZ77’s window slides forward and forgets old data automatically. An LZ78 dictionary keeps growing if left alone. The original paper cleared the whole dictionary each time a block of fixed length ended, and real implementations cap the dictionary size and, once it is full, freeze it, clear it, or reuse some of its entries.

The best-known variation of LZ78 is **LZW** (Lempel-Ziv-Welch). Terry Welch published the improvement in 1984, and it was used by the GIF image format and the Unix `compress` utility with its `.Z` extension. Both implementations put a limit on the dictionary. The [GIF89a specification](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) caps codes at 12 bits (a maximum value of 4095) and provides a separate Clear code that returns the dictionary to its initial state. According to the [ncompress man page](https://github.com/vapier/ncompress/blob/v5.0/compress.1), `compress` keeps watching the compression ratio once the code length reaches the `-b` limit (16 bits by default) and, if the ratio drops, discards the dictionary and rebuilds it from scratch.

<hr>

## Descendants of LZ77

So which side do modern compression algorithms come from? Most mainstream compression algorithms we use today are **descendants of LZ77**.

**LZSS**, which grew out of the 1982 paper by Storer and Szymanski, is a variant of LZ77. When a match is so short that a pointer would be longer than the original, it emits a literal (the original character) instead of the pointer.

**DEFLATE** was designed by Phil Katz for PKZIP 2, and its specification was written up as RFC 1951 in 1996. RFC 1951 describes DEFLATE as a combination of LZ77 and **Huffman coding**, an entropy-coding technique that gives shorter bit sequences to more frequent symbols. Its output is a mix of literals and (length, distance) pairs, and it merges literals and match lengths into a single alphabet (0 to 285) distinguished by one Huffman code. The compression method most ZIP programs use by default, GZIP, and PNG all use DEFLATE. In other words, most of the `.zip`, `.gz`, and `.png` files we handle every day are direct descendants of LZ77.

Later algorithms such as **LZMA** (used by 7-Zip and XZ), **LZ4**, and **Zstd** also started from LZ77’s sliding-window idea. LZMA and Zstd developed match searching and entropy coding together, while LZ4 dropped entropy coding entirely and chose speed with a byte-oriented format. The LZ78 family lives on as LZW inside formats such as GIF.

Each paper showed asymptotic optimality under its own model. The 1977 paper showed that the compression ratio of LZ77 “uniformly approaches the lower bounds” attainable by codes designed with full knowledge of the source, and the 1978 paper showed, for individual sequences, that LZ78’s incremental parsing is asymptotically optimal. Because the models differ, these results alone cannot be used to compare the two.

<hr>

## Conclusion

LZ77 and LZ78 started from the same idea of replacing repeated patterns with short references. Neither transmits its dictionary, and in both the decoder rebuilds it, but they diverged on whether a reference points to a position in the data already seen or to the number of an entry in a separately built dictionary, and they also forget old content differently. The mainstream compressors that run from DEFLATE through LZMA, LZ4, and Zstd descend from LZ77, while the LZ78 side lives on as LZW in formats such as GIF.

How this lineage plays out in an actual format choice, comparing the speed and compression ratio of ZIP, GZIP, ZSTD, and XZ and deciding what to use for build artifacts, is covered in [Understanding Compression Algorithms](/240706).

The next time you extract a `.zip` or `.gz` file, I hope you will remember that instructions like “go back this many characters and copy this many” are being exchanged inside it.


### References

:::ref
- [paper] [Storer, Szymanski, Data compression via textual substitution (1982)](https://doi.org/10.1145/322344.322346)
- [paper] [Welch, A Technique for High-Performance Data Compression (1984)](https://doi.org/10.1109/MC.1984.1659158)
- [docs] [PKWARE, APPNOTE.TXT: .ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- [docs] [W3C, Portable Network Graphics (PNG) Specification (Third Edition)](https://www.w3.org/TR/png-3/)
:::
