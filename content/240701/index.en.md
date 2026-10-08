---
emoji: 🧬
title: "The Difference Between LZ77 and LZ78"
seoTitle: "LZ77 vs LZ78: Sliding Window, Explicit Dictionary, DEFLATE"
date: "2024-07-01"
categories: curiosities software
description: "How LZ77 and LZ78 handle their dictionaries differently, and why LZSS, DEFLATE, ZIP, GZIP, and Zstd all ended up in the LZ77 family."
keywords: "LZ77, LZ78, LZ77 vs LZ78, LZ77 algorithm, sliding window compression, LZW, how DEFLATE works, dictionary-based compression"
locale: en
translationOf: '240701'
sourceHash: 35e37cad93277833db1bd5edddc87e35fc2e4b706c42e88a6016a9ea2ec62b12
---

In this post, I want to talk about **how LZ77 and LZ78 differ**.

This post is for developers who use tools like zip, gzip, and zstd and have wondered how the dictionary-based compression inside them works. By the end, you will be able to explain how the two algorithms differ in handling their dictionaries and why nearly every mainstream compressor today descends from LZ77.

I traced compression back to these two algorithms while choosing a format for compressing build artifacts in an internal deployment process.

<hr>

## What is lossless compression?

Lossless compression is a method that lets us restore the original data perfectly. Unlike lossy compression, which is common for images and audio, decompressed data does not differ from the original by even a single bit. Source code and build artifacts require lossless compression because their integrity must be preserved.

The central idea behind lossless compression is **taking advantage of statistical redundancy in data**. Replacing repeated patterns with shorter representations reduces the total size.

Among these techniques, **dictionary-based compression** is one of the most widely used families of lossless algorithms. Here, a dictionary is not a book of word definitions. It is a lookup table that maps previously seen pieces of data to short codes. **LZ77**, introduced by Abraham Lempel and Jacob Ziv in their 1977 paper **"A Universal Algorithm for Sequential Data Compression"** in IEEE Transactions on Information Theory, and **LZ78**, published the following year, are the ancestors of this family. The letters “LZ” come from the researchers’ surnames. Nearly every dictionary-based compression algorithm that followed, including DEFLATE, LZMA, LZ4, and Zstd, can trace its roots back to these two. (It is not much of an exaggeration to say that most compression family trees converge on Lempel and Ziv.)

Here is a simple example. If the word “Linux” appears 100 times in a text, the compressor can register it in a dictionary the first time and replace later occurrences with a short pointer meaning “dictionary entry number 1.” “Linux” takes five bytes, while the pointer can often be represented with fewer bytes, making the whole document smaller.

So how exactly do LZ77 and LZ78 differ?

<hr>

### LZ77: the sliding-window approach

LZ77 does **not build a separate explicit dictionary**. Instead, it treats a region of the input stream itself as a dictionary. This region is called a **sliding window** because it moves forward as the input is processed. (It is the same term that appears so often in algorithm exercises.)

The window has two regions.

- **Search buffer**: data that has already been processed. It acts as the dictionary.
- **Look-ahead buffer**: data that has not yet been processed and is about to be compressed.

The algorithm checks whether the beginning of the look-ahead buffer has appeared somewhere in the search buffer. When it finds the same pattern, it encodes the match as a **(distance, length, next character)** tuple. Distance tells the decoder how far back to find the start of the match, while length says how many characters the match contains.

Suppose we compress the string `"banana_banana"` with LZ77. When the algorithm reaches the second `"banana"`, it is effectively saying, **“Go back seven characters and copy the next six.”** A six-byte string can therefore be represented by only two numbers.

The key advantage is that **the dictionary does not need to be stored or transmitted separately**. The decoder naturally reconstructs the search buffer while decompressing, so the dictionary is implicitly embedded in the data itself. The trade-off is that decompression must proceed sequentially from the beginning. In principle, it cannot start at an arbitrary point in the middle.

Window size has a direct trade-off with compression ratio. A larger window can refer to patterns farther away and therefore often compress better, but it also increases the computation required for match searching and uses more memory.

<hr>

### LZ78: an explicit dictionary

Unlike LZ77, LZ78 **constructs an explicit dictionary** as it compresses the input. There is no sliding window. Previously observed patterns are stored as indexed dictionary entries, and later occurrences are replaced by their indexes.

LZ78 outputs tags in the form **(dictionary index, next character)**. The encoder finds the longest matching dictionary entry, outputs its index together with the next character that breaks the match, and then adds **“the matched entry plus the new character”** to the dictionary. The dictionary grows incrementally as the input is processed.

The best-known variation of LZ78 is **LZW** (Lempel-Ziv-Welch). Terry Welch published the improvement in 1984, and it was used by the GIF image format and the Unix `compress` utility with its `.Z` extension. (LZW was once at the center of a patent dispute, an episode that helped motivate the creation of PNG.)

<hr>

### Which family do modern compression algorithms belong to?

Interestingly, nearly every mainstream compression algorithm we use today is a **descendant of LZ77**.

**LZSS**, published by Storer and Szymanski in 1982, improved on LZ77 by adding a one-bit flag to distinguish a literal original character from a length-distance pair. If a match was so short that referencing it would cost more, the encoder could simply output the original character.

In 1993, Phil Katz combined LZSS with **Huffman coding**, an entropy-coding technique that gives shorter bit sequences to more frequent symbols, to create **DEFLATE**. ZIP, GZIP, and PNG all use DEFLATE. In other words, the `.zip`, `.gz`, and `.png` files we handle every day are direct descendants of LZ77.

Later algorithms such as **LZMA** (used by 7-Zip and XZ), **LZ4**, and **Zstd** also begin with LZ77’s sliding-window idea and evolve the data structures for match searching and the methods used for entropy coding. The LZ78 family, by contrast, largely left the mainstream stage after LZW.

The two algorithms have been proven theoretically equivalent in capability **when the entire dataset is decompressed**. LZ77 nevertheless survived because **embedding the dictionary in the data made the design more flexible to implement and extend**. Window size, match-search algorithms, and entropy coders could be combined freely, giving the family room to evolve as requirements changed.

<hr>

## Conclusion

LZ77 and LZ78 started from the same idea of replacing repeated patterns with short references, but they diverged on whether the dictionary lives inside the data or is built separately. Although their theoretical capability is equivalent, the one that survived was LZ77, whose window size, match search, and entropy coder could be swapped out.

How this lineage plays out in an actual format choice, comparing the speed and compression ratio of ZIP, GZIP, ZSTD, and XZ and deciding what to use for build artifacts, is covered in [Understanding Compression Algorithms](/240706).

The next time you extract a `.zip` or `.gz` file, I hope you will remember that instructions like “go back this many characters and copy this many” are being exchanged inside it.


### References

:::ref
- [paper] [Ziv, Lempel, A Universal Algorithm for Sequential Data Compression (1977)](https://doi.org/10.1109/TIT.1977.1055714)
- [paper] [Ziv, Lempel, Compression of Individual Sequences via Variable-Rate Coding (1978)](https://doi.org/10.1109/TIT.1978.1055934)
:::
