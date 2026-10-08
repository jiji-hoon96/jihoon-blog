---
emoji: 🗜️
title: "Understanding Compression Algorithms"
seoTitle: "Compression Algorithms Compared: GZIP, Zstandard, Brotli"
date: "2024-07-06"
updatedAt: "2026-10-08"
categories: curiosities software
description: "Compares the structure, speed, and ratio of ZIP, GZIP, ZSTD, BZIP2, XZ, and Brotli, why tar.gz beats zip, and when to pick tar.zst for build artifacts."
keywords: "compression algorithm comparison, GZIP vs ZSTD, tar.gz vs zip, tar.zst, Brotli, solid archive, frontend build optimization"
locale: en
translationOf: "240706"
sourceHash: a5d06c7ae79971131aba4105788bf8fc7b1eece63850d584061d9dbf0b356473
---

In this post, I want to talk about software compression algorithms.

This post is for developers who upload large build artifacts to a server or storage and are deciding between zip, tar.gz, and tar.zst. By the end, you will know where the major compression formats differ in speed and compression ratio, and you will have criteria for choosing between tar.gz and tar.zst.

I was asked to improve the deployment process for an internal project. Its large build artifacts had to be uploaded to S3, and I quickly felt how directly the size of the build directory affected both upload time and storage costs. That naturally led to a question: how could we compress and upload these artifacts more efficiently?

Once I started researching compression, I found far more options than I expected: zip, gzip, zstd, bzip2, xz, and others. Their names looked similar, but it was surprisingly difficult to find a clear explanation of how they differed and when each one should be used. (I had assumed compression was more or less all the same, but the world is large and so is the number of ways to make files smaller.)

Before the comparison, it is worth noting one shared root. Nearly every mainstream compressor today descends from LZ77, published in 1977. LZ77 treats a fixed range of already processed data, the sliding window, as its dictionary and replaces repeated patterns with a short reference meaning “go back this many characters and copy this many.” A larger window catches repetitions that are farther apart but costs more computation and memory. DEFLATE, used by ZIP and GZIP, adds Huffman coding (entropy coding that gives shorter bit sequences to more frequent symbols) on top of this. How LZ77 parted ways with its sibling LZ78 is covered separately in [The Difference Between LZ77 and LZ78](/240701).

Compression performance is usually evaluated on two axes: **compression ratio**, or how small the result becomes, and **compression speed**, or how quickly the operation completes. Seeking a higher ratio generally requires more computation and therefore more time. A practical compression strategy is about finding the right point between the two.

With that foundation, let us compare the major compression formats one by one.

## ZIP

ZIP is a file format created by Phil Katz in 1989. Internally, it commonly compresses data with **DEFLATE**, the combination of LZ77 and Huffman coding. The important distinction is that ZIP is not itself a compression algorithm. It is a container format that can hold data compressed by an algorithm such as DEFLATE.

ZIP **compresses each file independently**. This structure, in which every file is compressed separately, is called a non-solid archive. The opposite approach, which joins all files into one stream and compresses it at once, is a solid archive. Thanks to the non-solid structure, it is possible to extract a single file without decompressing the rest of the archive. On the other hand, it cannot exploit duplicate data across files, so its compression ratio may be lower than that of tar.gz, which we will examine later.

Because Windows, macOS, Linux, and most other operating systems support ZIP without additional software, it is the safest general choice when cross-platform compatibility matters.

## GZIP (GNU Zip)

Like ZIP, GZIP uses **DEFLATE** internally. Why does a separate format exist if the algorithm is the same? ZIP also acts as a container for multiple files, whereas GZIP specializes in compressing **one file or one stream**.

To compress multiple files or a directory with GZIP, we first combine them into a single TAR archive and then compress that archive with GZIP. This two-step process produces a `.tar.gz` or `.tgz` file.

The GZIP file structure is specified in RFC 1952 and is quite simple: a **fixed 10-byte header**, an optional extended header containing information such as the original filename or comments, the DEFLATE-compressed data, and an **8-byte trailer** containing a CRC-32 checksum and the original size. CRC-32 verifies that the decompressed data matches the original. GZIP is therefore a lightweight wrapper around a DEFLATE stream.

DEFLATE uses a sliding window of at most **32 KB**. This limit is important because patterns more than 32 KB apart cannot refer to one another. GZIP also provides compression levels from 1 to 9. Level 1 is fast but produces a lower ratio of roughly 60%, while level 9 is slow but reaches a higher ratio of roughly 75%. The default is level 6, a compromise between speed and size.

GZIP has long been a standard for distributing source code, compressing logs, and packaging software in Unix and Linux environments. It also remains a common default for HTTP compression through `Content-Encoding: gzip`, although Brotli has increasingly replaced it in that role.

## ZSTD (Zstandard)

ZSTD is a compression algorithm developed by Yann Collet at Meta, formerly Facebook, and released as open source in 2016. Its main advantage is **dramatically faster compression and decompression while retaining a ratio comparable to GZIP**.

ZSTD has three broad stages. First, an LZ77-family **match finder** detects repeated patterns in the input. It then encodes the results, including literals, match lengths, and offsets, as **sequences**. Finally, it compresses those sequences with **entropy coding**. Instead of GZIP-style Huffman coding, ZSTD uses **FSE (Finite State Entropy)**. FSE is an entropy coder based on ANS (Asymmetric Numeral Systems). ANS updates a single integer state each time it processes a symbol and emits fewer bits for more frequent symbols. Its goal is a compression ratio close to arithmetic coding at a speed close to Huffman coding. Huffman coding can assign only an integer number of bits per symbol, while FSE can represent fractional-bit probabilities and get closer to the theoretical optimum. (Despite the grand name, the key idea is simply a smarter way to express the same data with fewer bits.)

The match finder also changes strategy with the compression level. Lower levels, from 1 to 4, use simple hash tables for speed. Middle levels, from 5 to 12, compare multiple candidates and lazily choose a better match. Higher levels, from 13 to 22, use binary trees and dynamic programming to find near-optimal matches. This broad range makes it possible to choose a low level for real-time transfer and a high level for archival work.

On the Silesia Corpus benchmark, ZSTD’s default level 3 compresses at around 300 MB/s and decompresses at around 1,200 MB/s. GZIP’s default level 6 reaches only around 34 MB/s for compression and 380 MB/s for decompression. **ZSTD is roughly eight times faster at compression and three times faster at decompression, while its compression ratio is even ahead at 3.17 versus GZIP’s 3.09.** These figures make ZSTD’s improved trade-off easy to see.

Adoption has expanded quickly. ZSTD is used for Linux kernel module compression and transparent filesystem compression, and major distributions including Arch Linux, Fedora, Debian, and Ubuntu have adopted it as a default package format. Starting with v1.5.7, released in February 2025, **multithreaded compression is enabled by default** with up to four threads, further widening the practical speed gap with single-threaded GZIP. AWS has also reported reducing S3 storage by about 30% after switching internal services from gzip to zstd.

## BZIP2

BZIP2 compresses data through a pipeline of transformations.

1. **RLE (Run-Length Encoding)**: reduces consecutive repetitions in the initial data
2. **BWT (Burrows-Wheeler Transform)**: rearranges data into a form that is easier to compress
3. **MTF (Move-to-Front Transform)**: converts the BWT output into a numeric sequence
4. **RLE**: reduces repetitions in the MTF result again
5. **Huffman coding**: performs the final frequency-based encoding

BZIP2 offers a higher compression ratio than GZIP, but both compression and decompression are slower. It has traditionally been used for archival work where size matters more than speed.

Its latest release was v1.0.8 in 2019, and it is not under active development. As benchmarks increasingly show ZSTD outperforming BZIP2 in both ratio and speed, new projects are more likely to choose ZSTD.

## XZ

XZ is a compression format that uses **LZMA2**. LZMA, the Lempel-Ziv-Markov chain Algorithm developed by Igor Pavlov, combines LZ77-based dictionary compression with range encoding. Rather than simply being an “improved LZMA,” LZMA2 is closer to a **container format** around LZMA streams. Its key additions include multithreaded compression and decompression and efficient handling of incompressible data.

Among the formats discussed here, XZ provides **the highest compression ratio**. The cost is very slow compression and high memory consumption. It is well suited to archival work where minimizing storage is the top priority.

In March 2024, however, a **backdoor was discovered in xz-utils, XZ’s core library, in the severe CVE-2024-3094 supply-chain incident**. A two-year social-engineering campaign had obtained maintainer privileges, and the vulnerability received the maximum CVSS score of 10.0. Major distributions immediately rolled back to safe versions, but the incident became a powerful warning about open-source supply-chain security. (XZ’s technical value remains, but this context is worth considering when choosing tools.)

## TAR

TAR, short for Tape Archive, is not a compression algorithm. It is a tool and format for **combining multiple files and directories into one archive**. As its name suggests, it was originally designed for tape backups. Since tape is sequential media, appending data in a continuous sequence was a natural design.

TAR’s internal structure is surprisingly simple. Everything is processed in **512-byte blocks**. Each file begins with a 512-byte header containing metadata such as its name, up to 100 bytes, file mode, owner UID and GID, size, modification time, and checksum. File data follows the header and is padded to a multiple of 512 bytes. Two zero-filled 512-byte blocks mark the end of the archive. Most modern TAR implementations follow the POSIX **UStar (Unix Standard TAR)** format, which supports longer filenames of up to 256 bytes and additional metadata fields.

The key property is that TAR preserves **Unix filesystem metadata**, including permissions, ownership, timestamps, and symbolic links. ZIP does not always preserve this Unix-specific metadata perfectly, which often makes TAR a better fit for server deployment.

TAR does not make data smaller by itself. In fact, its headers and padding make the result slightly larger than the original. Compression is performed by combining TAR with GZIP, BZIP2, XZ, ZSTD, or another compressor. That is why extensions such as `.tar.gz`, `.tar.bz2`, `.tar.xz`, and `.tar.zst` exist. TAR handles “bundling,” while the compression tool handles “shrinking,” a classic example of the Unix philosophy to “do one thing well.”

TAR is standard in Unix and Linux environments, while Windows may require additional software such as 7-Zip.

## A quick look at Brotli

Frontend developers should also understand **Brotli**. Google developed Brotli, and it was standardized for HTTP stream compression as `Content-Encoding: br` in 2015.

Every major browser supports it over HTTPS, with more than 96% global coverage, and it generally produces files **about 15 to 25% smaller than GZIP**. It is particularly effective for text-based static assets such as JavaScript, CSS, and HTML. Major CDNs including Cloudflare use it as a default compression method, and the modern web-optimization pattern is “Brotli first, GZIP fallback.”

If build artifacts are uploaded to S3 and served through a CDN, precompressing static files with Brotli can substantially reduce network transfer. (There was not enough project-specific evidence for me to introduce it immediately, but it remains an option worth understanding and revisiting.)

## Why does tar.gz compress better than ZIP?

The difference comes from **solid archives** and **non-solid archives**.

With tar.gz, TAR first combines every file into one continuous data stream, and GZIP compresses that entire stream at once. This allows it to detect and exploit **duplicate data across files**. That is a solid archive. If a build directory contains dozens of similarly structured JavaScript bundles, a pattern in file A can be referenced when it appears again in file B. Metadata overhead is also lower because the compressor does not need a separate header, checksum, and table of contents for every compressed stream.

ZIP is non-solid and compresses each file independently, so it cannot use redundancy across files. Even if files A and B contain the same code block, their separate DEFLATE streams do not know about one another. This is why tar.gz commonly achieves a compression ratio 5 to 15% better than ZIP. The difference becomes larger when a build contains many files with similar structures.

Solid archives also have clear disadvantages.

- To extract one file, the decoder may need to **decompress all data that appears before it**. Because every file belongs to one stream, it cannot simply jump to an arbitrary point. ZIP supports random access to individual files and may be more suitable when specific files are extracted frequently.
- Damage to part of the archive can make **all data after the damaged point unrecoverable**. A non-solid archive may lose only the damaged file while preserving the rest.

## The choice in 2024 was tar.gz. What would I choose now?

I added this section in 2026. I chose tar.gz at the time because of its compatibility and stability. The artifact had to be decompressed in several environments after being uploaded to S3, so the format supported almost everywhere was the safest option.

If I faced the same situation today, however, I would seriously consider **tar.zst (TAR + ZSTD)**. Recall the benchmark figures above.

GZIP’s default compression speed is 34 MB/s, while ZSTD’s default is 300 MB/s. For a 2 GB build directory, a simple calculation gives about 60 seconds for GZIP and around seven seconds for ZSTD. With multithreading enabled by default in ZSTD v1.5.7, using as many as four threads, the time it actually takes is shorter still. In a CI/CD pipeline, this difference accumulates on every deployment cycle, so it is not a number you can ignore.

```sh
# tar.zst 생성 (멀티스레드 자동 활용)
tar --zstd -cf archive.tar.zst directory/

# 또는 압축 레벨 지정 (-T0은 사용 가능한 모든 코어 활용)
tar -cf archive.tar.zst -I 'zstd -3 -T0' directory/
```

ZSTD also matches or surpasses GZIP’s compression ratio, so there is effectively no longer a trade-off where speed requires accepting a larger artifact. It is both faster and smaller.

The receiving environment must still be able to decompress zstd. Major Linux distributions include it, and macOS users can install it easily with Homebrew using `brew install zstd`. Legacy or minimal environments may require a separate installation, so every environment used by the team should be checked in advance. When compatibility is the overriding concern, tar.gz remains the safest general choice.

## Comparison at a glance

| Format     | Algorithm       | Ratio     | Speed     | Key characteristics              |
| ---------- | --------------- | --------- | --------- | -------------------------------- |
| **ZIP**    | DEFLATE         | Medium    | Fast      | Cross-platform, non-solid        |
| **GZIP**   | DEFLATE         | Medium    | Fast      | Single stream, commonly with TAR |
| **ZSTD**   | Zstandard       | High      | Very fast | Tunable levels, modern standard  |
| **BZIP2**  | BWT+MTF+Huffman | High      | Slow      | Largely inactive development     |
| **XZ**     | LZMA2           | Very high | Very slow | Best ratio, security context     |
| **Brotli** | Brotli          | High      | Medium    | Optimized for the web            |

## Conclusion

Before digging into compression, I honestly thought, “Can’t we just put everything in a zip file?” Working with a build directory larger than 2 GB made the consequences tangible: the algorithm we choose can meaningfully change both upload time and cost.

Every compression format reflects a different design philosophy and trade-off. ZIP offers compatibility, GZIP ubiquity, ZSTD speed, and XZ maximum compression. There is no universal “best” option; the right choice depends on the project’s constraints.

Understanding the principles behind tools we usually take for granted helps us make better decisions the next time a similar problem appears. I hope this article serves as a useful starting point for someone facing that choice.
