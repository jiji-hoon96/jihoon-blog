---
emoji: 🧬
title: "LZ77과 LZ78의 차이"
seoTitle: "LZ77과 LZ78의 차이: sliding window, 명시적 사전, DEFLATE의 뿌리"
date: "2024-07-01"
updatedAt: "2026-10-08"
categories: 소박한궁금증 소프트웨어
description: "LZ77과 LZ78이 사전을 다루는 방식이 어떻게 다른지 정리한다. Sliding window와 명시적 사전의 차이, LZSS와 DEFLATE를 거쳐 ZIP, GZIP, Zstd가 왜 모두 LZ77 계열이 되었는지 설명한다."
keywords: "LZ77, LZ78, LZ77 LZ78 차이, LZ77 알고리즘, sliding window 압축, LZW, DEFLATE 원리, 사전 기반 압축"
---

이번 포스팅에서는 **LZ77과 LZ78이 어떻게 다른지**에 대한 이야기를 해보려고 한다.

zip, gzip, zstd 같은 압축 도구를 쓰면서 그 안의 사전 기반 압축이 어떻게 동작하는지 궁금했던 개발자를 위한 글이다. 끝까지 읽으면 두 알고리즘이 사전을 다루는 방식의 차이와, 오늘날 주류 압축기가 왜 거의 모두 LZ77 쪽 후손인지 설명할 수 있다.

빌드 결과물을 어떤 형식으로 압축할지 비교하다 보면 결국 이 두 알고리즘으로 거슬러 올라가게 된다.

<hr>

## 무손실 압축이란?

무손실 압축(Lossless Compression)은 원본 데이터를 완벽하게 복원할 수 있는 압축 방식이다. 이미지나 오디오에서 사용하는 손실 압축(Lossy Compression)과 달리, 압축을 풀었을 때 원본과 1비트도 다르지 않다. 소스 코드나 빌드 결과물처럼 데이터 무결성이 중요한 경우에 반드시 무손실 압축을 사용해야 한다.

무손실 압축의 핵심 아이디어는 **데이터에 존재하는 통계적 중복성을 활용하는 것**이다. 반복되는 패턴을 짧은 표현으로 대체하면 전체 크기가 줄어드는 원리인 것이다.

이 중에서 **사전 기반(Dictionary-Based) 방식**은 무손실 압축에서 널리 쓰이는 알고리즘 계열이다. (여기서 "사전"은 국어사전의 그 사전이 아니라, 이전에 등장한 데이터 조각들을 짧은 코드와 매핑해 저장해 둔 참조 테이블을 뜻한다.) 1977년 Jacob Ziv와 Abraham Lempel이 IEEE Transactions on Information Theory에 발표한 논문 [A Universal Algorithm for Sequential Data Compression](https://doi.org/10.1109/TIT.1977.1055714)에서 처음 제안된 **LZ77**, 그리고 이듬해인 1978년에 [Compression of Individual Sequences via Variable-Rate Coding](https://doi.org/10.1109/TIT.1978.1055934)으로 발표된 **LZ78**이 이 계열의 시조이다. 두 사람의 이름에서 알파벳 한 글자씩 따와 "LZ"가 된 것인데, 이 두 알고리즘은 이후 등장한 사전 기반 압축 알고리즘(DEFLATE, LZMA, LZ4, Zstd 등)의 뿌리가 되었다.

쉽게 설명하면 이런 것이다. "Linux"라는 단어가 텍스트에서 100번 반복된다면, 처음 등장할 때 사전에 등록해 두고 이후에는 "사전의 1번 항목"이라는 짧은 참조(포인터)로 대체하는 방식이다. "Linux"는 5바이트지만, 포인터는 이보다 훨씬 적은 바이트로 표현할 수 있으므로 전체 크기가 줄어든다.

그렇다면 LZ77과 LZ78은 구체적으로 어떻게 다를까?

<hr>

### LZ77: sliding window 방식

LZ77은 **명시적인 사전을 만들지 않고**, 입력 스트림의 일정 구간을 그 자체로 사전처럼 사용한다. 이 구간을 **sliding window**라고 부르는데, 데이터를 처리하는 동안 윈도우가 한 칸씩 앞으로 이동한다는 뜻에서 붙은 이름이다. (알고리즘 문제 풀 때 많이 보았다)

윈도우는 두 영역으로 나뉜다.

- **검색 버퍼(Search Buffer)** : 이미 처리된, 직전까지의 데이터. 사전 역할을 한다.
- **look-ahead buffer** : 아직 처리되지 않은, 앞으로 압축할 데이터.

알고리즘은 look-ahead buffer의 첫 부분이 검색 버퍼 어딘가에 등장한 적이 있는지를 찾는다. 같은 패턴이 발견되면, 그 매치를 **(거리, 길이, 다음 문자)** 형태의 튜플로 인코딩한다. "거리"는 검색 버퍼 내에서 매치가 시작되는 위치까지 몇 글자 뒤로 가야 하는지를, "길이"는 매치가 몇 글자나 이어지는지를 의미한다.

예를 들어 `"banana_banana"` 라는 문자열을 이 글 뒤쪽에 실은 교육용 인코더로 압축하면 LZ77 토큰 다섯 개가 나온다. `(0,0,b)` `(0,0,a)` `(0,0,n)` `(2,3,_)` `(7,5,a)` 이다. 앞의 세 개는 처음 보는 글자라 매치 없이 다음 문자만 담는다. 두 번째 `"banana"` 는 마지막 토큰 `(7,5,a)` 하나로 처리된다. "7글자 뒤로 가서 5글자를 복사하고 `a` 를 붙여라"라는 뜻이다. 여섯 글자를 모두 복사하지 않는 것은 이 인코더가 입력의 마지막 글자를 항상 다음 문자 자리에 남기기 때문이다.

`(2,3,_)` 에서는 길이 3이 거리 2보다 길다. 디코더는 `ban` 까지 쓴 상태에서 2글자 뒤의 `a` 부터 복사를 시작하고, 세 번째 글자를 복사할 때는 방금 쓴 `a` 를 다시 읽는다. 그래서 `ana` 가 나오고 `_` 가 붙는다. [RFC 1951](https://www.rfc-editor.org/rfc/rfc1951)도 같은 동작을 명시한다. 마지막 두 바이트가 X, Y일 때 `<length = 5, distance = 2>` 는 X,Y,X,Y,X를 덧붙인다. 사전이 곧 방금 복원한 데이터라서 가능한 일이다.

이 방식에서는 **사전을 별도로 저장하거나 전송하지 않는다.** 디코더는 압축을 풀어 나가면서 검색 버퍼를 스스로 재구성하기 때문에, 사전은 데이터 그 자체에 암묵적으로 내장되어 있다고 볼 수 있다. 참조가 앞쪽 데이터를 가리키므로 압축 해제는 기본적으로 앞에서부터 순서대로 진행한다. 다만 참조가 닿는 범위는 윈도우까지다. RFC 1951은 DEFLATE의 참조를 최대 32K 바이트 앞까지로 제한한다. 그래서 zlib은 압축 상태를 리셋하는 `Z_FULL_FLUSH` 를 두었고, [zlib.h](https://github.com/madler/zlib/blob/v1.3.1/zlib.h)는 그 지점부터 압축 해제를 다시 시작할 수 있으니 random access가 필요할 때 쓰라고 적는다. 너무 자주 쓰면 압축률이 크게 떨어진다는 경고도 함께 있다.

윈도우 크기는 압축률과 직접적인 트레이드오프 관계에 있다. 윈도우가 크면 더 멀리 떨어진 패턴까지 참조할 수 있어 압축률이 높아지지만, 매치 검색에 드는 연산량과 메모리 사용량이 함께 늘어난다.

<hr>

### LZ78: 명시적 사전(Explicit Dictionary) 방식

LZ78은 LZ77과 달리, **사전을 명시적으로 구축**하면서 압축을 진행한다. Sliding window 같은 것은 없다. 대신 이전에 본 패턴들을 인덱스가 붙은 사전 항목으로 저장해 두고, 이후에 같은 패턴이 등장하면 인덱스로 대체한다.

LZ78이 출력하는 단위는 **(사전 인덱스, 다음 문자)** 형태의 태그이다. 인코더는 사전에서 가장 길게 일치하는 항목을 찾은 뒤, 그 항목의 인덱스와 매치를 깨뜨린 다음 문자를 묶어서 출력한다. 그리고 "방금 매치된 항목 + 새로운 문자"를 다시 사전에 새 항목으로 추가한다. 이렇게 사전이 점진적으로 자라나는 구조이다.

같은 `"banana_banana"` 를 LZ78로 압축하면 토큰 여덟 개가 나오고 사전에는 항목 일곱 개가 쌓인다. 토큰은 `(0,b)` `(0,a)` `(0,n)` `(2,n)` `(2,_)` `(1,a)` `(3,a)` `(7,)` 이고, 사전은 `1:b` `2:a` `3:n` `4:an` `5:a_` `6:ba` `7:na` 이다. 두 번째 `"banana"` 는 `ba`, `na`, `na` 를 만드는 토큰 세 개로 나뉜다. LZ77이 토큰 하나로 끝낸 부분이다. LZ78의 사전 항목은 한 번에 한 글자씩만 길어지므로, 같은 단어를 여러 번 봐야 긴 항목이 생긴다. 마지막 `(7,)` 은 입력이 끝나 다음 문자가 없는 경우다. 이 인코더는 토큰을 비트로 묶지 않으므로 토큰 수로 압축률을 비교할 수는 없다.

두 토큰열은 아래 코드로 재현할 수 있다. 2026-10-08에 macOS 26.6.2, Node v24.16.0에서 파일로 저장해 `node lz.mjs` 로 돌린 결과다.

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

코드의 두 디코더는 토큰만 받는다. **LZ78도 사전을 보내지 않는다**는 뜻이다. 디코더가 토큰을 읽으며 인코더와 같은 순서로 항목을 추가하므로 같은 사전이 다시 쌓인다. 사전을 전송하지 않는다는 점은 두 알고리즘의 공통점이고, 둘이 갈리는 곳은 **오래된 내용을 잊는 방식**이다. LZ77의 윈도우는 앞으로 밀려가며 오래된 데이터를 저절로 잊는다. LZ78의 사전은 자라기만 하므로 구현이 상한을 정하고, 꽉 찬 뒤에는 그대로 얼리거나 비워야 한다. 1978년 논문의 인코더도 블록 하나를 마치면 초기 상태로 돌아가 지난 이력을 잊는다(p.533).

LZ78의 가장 유명한 변종이 바로 **LZW**(Lempel-Ziv-Welch)이다. 1984년 Terry Welch가 LZ78을 개선하여 발표한 것으로, GIF 이미지 포맷과 유닉스의 `compress` 유틸리티(`.Z` 확장자)에서 사용되었다. 두 구현 모두 사전에 상한을 두었다. [GIF89a 명세](https://www.w3.org/Graphics/GIF/spec-gif89a.txt)는 코드를 최대 12비트(최댓값 4095)로 묶고, 사전을 초기 상태로 되돌리는 Clear code를 따로 둔다. [ncompress man page](https://github.com/vapier/ncompress/blob/v5.0/compress.1)에 따르면 `compress` 는 코드 길이가 `-b` 상한(기본 16비트)에 닿은 뒤로 압축률을 지켜보다가, 압축률이 떨어지면 사전을 버리고 처음부터 다시 쌓는다.

<hr>

### 그래서 현대 압축 알고리즘은 어느 쪽 후손인가?

오늘날 우리가 사용하는 주류 압축 알고리즘은 대부분 **LZ77 계열의 후손**이다.

1982년 Storer와 Szymanski가 발표한 **LZSS**는 LZ77을 개선한 변종이다. 매치가 너무 짧아서 포인터가 원본 문자보다 오히려 길어질 때는 포인터 대신 "리터럴(원본 문자)"을 그대로 출력하도록 한 것이다.

**DEFLATE**는 Phil Katz가 PKZIP 2를 위해 설계했고, 1996년 RFC 1951로 명세가 정리됐다. RFC 1951은 DEFLATE를 LZ77과 **허프만 부호화**(빈도가 높은 심볼에 짧은 비트를 할당하는 엔트로피 코딩)의 조합이라고 쓴다. 짧은 매치는 리터럴로 낸다는 LZSS의 생각을 이어받았고, 리터럴과 매치 길이를 한 알파벳(0~285)에 합쳐 허프만 부호 하나로 구분한다. ZIP의 기본 압축 방식, GZIP, PNG가 모두 이 DEFLATE를 사용한다. 즉, 우리가 매일같이 만지는 `.zip`, `.gz`, `.png` 파일은 대부분 LZ77의 직계 후손인 셈이다.

이후에 등장한 **LZMA**(7-Zip, XZ), **LZ4**, **Zstd** 또한 모두 LZ77의 sliding window 아이디어를 출발점으로 삼아, 매치 검색 자료구조와 엔트로피 코딩 방식을 진화시켜 온 것이다. 반면 LZ78 계열은 LZW 이후 새 범용 압축기의 뿌리로는 쓰이지 않는다. LZW 자체는 GIF 같은 형식 안에 남아 있다.

두 논문은 각자의 모형에서 점근적 최적성을 보였다. 1977년 논문은 LZ77의 압축률이 원천을 미리 알고 설계한 부호의 하한에 균일하게 다가간다("uniformly approaches the lower bounds")고 보였고, 1978년 논문은 개별 수열(individual sequence)을 대상으로 LZ78의 incremental parsing이 점근적으로 최적임을 보였다. 모형이 서로 다르므로 이 결과만으로 둘을 비교할 수는 없다. 그런데도 LZ77 계열이 살아남은 이유를 필자는 두 가지로 본다.

첫째는 앞에서 본 잊는 방식이다. 윈도우는 크기 하나로 메모리 상한과 잊는 시점이 함께 정해진다. LZ78 계열은 사전 상한과, 꽉 찬 뒤 얼릴지 비울지를 구현마다 따로 정해야 했다. 둘째는 특허다. [PNG의 역사](http://www.libpng.org/pub/png/pnghist.html)에 따르면 1994년 12월 28일 Unisys와 CompuServe가 LZW 특허를 근거로 GIF 지원 소프트웨어에 로열티를 걷는다는 합의를 발표했고, 1995년 1월 4일 PNG의 첫 초안이 나왔다. 그 PNG가 고른 것이 DEFLATE다. RFC 1951은 설계 목표에 특허에 걸리지 않는 방식으로 구현할 수 있을 것을 적었다. 같은 RFC가 LZ77의 여러 변종에 특허가 있다고 경고하므로, LZ77 계열 전체가 특허에서 자유로웠던 것은 아니다.

<hr>

## 마치며

LZ77과 LZ78은 반복되는 패턴을 짧은 참조로 바꾼다는 같은 아이디어에서 출발했다. 둘 다 사전을 보내지 않고 디코더가 다시 쌓지만, 참조가 가리키는 곳이 지나온 데이터의 위치냐 따로 쌓은 사전의 번호냐에서 갈렸고, 오래된 것을 잊는 방식도 달랐다. 살아남아 이후 압축기의 뿌리가 된 쪽은 LZ77 계열이다. 필자가 보기에 그 이유는 윈도우가 밀려나며 저절로 잊는 덕에 메모리 상한이 단순했고, 그 위에서 특허를 피하도록 설계된 DEFLATE가 표준이 되었기 때문이다.

이 계보가 실제 형식 선택에서 어떤 차이로 이어지는지, 즉 ZIP, GZIP, ZSTD, XZ의 속도와 압축률을 비교하고 빌드 결과물에 무엇을 고를지는 [압축 알고리즘에 대해 알아보자](/240706)에서 다룬다.

다음에 `.zip`이나 `.gz` 파일을 풀 때, 그 안에서 "몇 글자 뒤로 가서 몇 글자를 복사하라"는 지시가 오가고 있다는 것을 한 번쯤 떠올려 보시길 바란다.


### 참고 자료

:::ref
- [paper] [Storer, Szymanski, Data compression via textual substitution (1982)](https://doi.org/10.1145/322344.322346)
- [paper] [Welch, A Technique for High-Performance Data Compression (1984)](https://doi.org/10.1109/MC.1984.1659158)
- [docs] [PKWARE, APPNOTE.TXT: .ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- [docs] [W3C, Portable Network Graphics (PNG) Specification (Third Edition)](https://www.w3.org/TR/png-3/)
:::
