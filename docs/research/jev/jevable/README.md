# jevable.com 스냅숏

> 2026-09-23 에 `https://jevable.com/` 과 `?page=2` 부터 `?page=6` 까지를 `curl` 로 받아
> 각 페이지의 JSON-LD(`@graph` 안의 `ItemList`)에서 `CreativeWork` 194개를 꺼냈다.
> 조회수(`views`)는 같은 HTML 의 「N views on X」 문구에서 붙였다.

`projects.json` 이 그 194개다. 필드는 jevable 이 낸 그대로다(`name`, `description`, `genre`,
`creator`, `dateCreated`, `isBasedOn` = 원 X 게시물). `description` 은 jevable 이 원 게시물의
앞부분만 잘라 실은 것이라 **하한**으로만 읽는다.

## 본문에 쓴 숫자

| 숫자 | 계산 |
|---|---|
| 194 | `CreativeWork` 개수 |
| 152 (9월 18일) | `dateCreated` 분포. 16일 11, 17일 28, 18일 152, 19일 2, 20일 1 |
| 카테고리 표 | `genre` 개수. Games 39, Developer tools 34, Productivity 31, Agents 19, Experiments 18, Creative tools 16, 나머지 다섯 합 37 |
| 비용 30 / 속도 53 / 정확도·기준선 7 | 아래 정규식이 `description` 에 걸린 개수 |

```python
cost  = r'\$\s?\d|cents?\b|credits'
speed = r'\d\s?(ms|s|sec|seconds|second)\b|faster|real-?time|realtime'
acc   = r'accura|calibrat|\bECE\b|precision|recall|\bF1\b|baseline|matched|agree'
```

정확도·기준선 7개: Proq construction-plan classification, Quiet marketing notifications on Android,
MakerMap, Choice versus Noul trolley dilemmas, Jevcal confidence-threshold calibration,
A Bluesky feed with emotion detection, Jev inside a security pipeline.

본문에 인용한 개별 수치(1,500건, 1,891건 19초 $0.12, 26장 2.9초, 7초 $0.0039, 14개 체크 등)는
전부 게시자가 자기 게시물에 적은 값이고 제3자 검증은 없다. 본문도 그렇게 적었다.
