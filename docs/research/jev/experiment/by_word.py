"""단어별로 집계한다.

라벨이 단어 단위로 정해지므로 문장 60개는 독립 관측 60개가 아니다.
유효 표본은 단어 수다. 그리고 오답이 단어별로 뭉치면 모델이 맥락이 아니라
단어 사전을 보고 있다는 뜻이다.
"""
import json, sys, statistics
from collections import defaultdict

def main(rows_path, set_path):
    meta = [json.loads(l) for l in open(set_path, encoding="utf-8")]
    rows = [json.loads(l) for l in open(rows_path, encoding="utf-8")]
    # benchmark 행은 레코드 순서를 지키고 질문마다 한 행이다
    byq = defaultdict(list)
    for r in rows:
        byq[r.get("question") or r.get("qid")].append(r)
    q = "convert_noul"
    if q not in byq:
        print("질문 키:", list(byq)); return
    got = byq[q]
    assert len(got) == len(meta), f"{len(got)} != {len(meta)}"

    per = defaultdict(list)
    for m, r in zip(meta, got):
        p = r["probabilities"][1] if isinstance(r.get("probabilities"), list) else r.get("p_true")
        ok = bool(r.get("correct"))
        per[m["word"]].append((m["label"], p, ok))

    print(f"{'단어':14s} {'n':>3s} {'라벨':>4s} {'평균 p':>7s} {'표준편차':>8s} {'정답':>7s}")
    for w, v in sorted(per.items(), key=lambda kv: (-kv[1][0][0], kv[0])):
        ps = [x[1] for x in v if x[1] is not None]
        lab = v[0][0]
        ok = sum(1 for x in v if x[2])
        sd = statistics.pstdev(ps) if len(ps) > 1 else 0.0
        mean = statistics.mean(ps) if ps else float("nan")
        print(f"{w:14s} {len(v):3d} {lab:>4d} {mean:7.3f} {sd:8.3f} {ok:3d}/{len(v):<3d}")
    words = len(per)
    right = sum(1 for v in per.values() if (statistics.mean(x[1] for x in v) >= 0.5) == (v[0][0] == 1))
    print(f"\n단어 단위 정확도 {right}/{words} = {right/words:.3f}   (유효 표본은 이 {words}종이다)")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
