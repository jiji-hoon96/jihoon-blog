"""predictions.jsonl 을 읽어 단어 단위로 집계하고 구조적 항등식을 잰다.

라벨이 단어 단위로 정해지므로 문장 수는 독립 관측 수가 아니다. 유효 표본은 단어 수다.
그리고 오답이 단어별로 뭉치면 모델이 맥락이 아니라 단어를 보고 있다는 뜻이다.
"""
import json, sys, statistics
from collections import defaultdict

def load(pred_path, set_path):
    meta = [json.loads(l) for l in open(set_path, encoding="utf-8")]
    preds = [json.loads(l) for l in open(pred_path, encoding="utf-8")]
    assert len(preds) == len(meta), f"예측 {len(preds)} != 집합 {len(meta)}"
    out = []
    for m, pr in zip(meta, preds):
        probs = pr["prediction"]["probabilities"]
        out.append({**m,
                    "p_convert": probs["convert_noul"]["true"],
                    "p_keep": probs["keep_noul"]["true"],
                    "p_choice_en": probs["convert_choice"]["english"],
                    "p_compound": probs["compound"]["true"],
                    "latency_ms": pr["prediction"]["latency_ms"]})
    return out

def report(rows, title):
    n = len(rows)
    words = defaultdict(list)
    for r in rows:
        words[r["word"]].append(r)
    print(f"\n{'='*72}\n{title}\n  문장 {n}   단어 {len(words)}종 (유효 표본)\n{'='*72}")

    print(f"\n{'단어':16s} {'n':>3s} {'라벨':>4s} {'평균 p':>7s} {'편차':>6s} {'문장정답':>8s}")
    for w, v in sorted(words.items(), key=lambda kv: (-kv[1][0]["label"], kv[0])):
        ps = [x["p_convert"] for x in v]
        lab = v[0]["label"]
        ok = sum(1 for x in v if (x["p_convert"] >= 0.5) == (lab == 1))
        sd = statistics.pstdev(ps) if len(ps) > 1 else 0.0
        print(f"{w:16s} {len(v):3d} {lab:>4d} {statistics.mean(ps):7.3f} {sd:6.3f} {ok:3d}/{len(v):<3d}")

    wr = sum(1 for v in words.values()
             if (statistics.mean(x["p_convert"] for x in v) >= 0.5) == (v[0]["label"] == 1))
    sr = sum(1 for r in rows if (r["p_convert"] >= 0.5) == (r["label"] == 1))
    spread = statistics.mean(statistics.pstdev([x["p_convert"] for x in v])
                             for v in words.values() if len(v) > 1)
    print(f"\n  문장 단위 정확도  {sr}/{n} = {sr/n:.3f}")
    print(f"  단어 단위 정확도  {wr}/{len(words)} = {wr/len(words):.3f}   <- 이쪽이 실제 성적이다")
    print(f"  같은 단어 안 예측 표준편차 평균 {spread:.3f}   (0 에 가까우면 문장을 안 보고 단어만 본 것)")

    print("\n  --- 구조적 항등식 ---")
    s = [r["p_convert"] + r["p_keep"] for r in rows]
    off = sum(1 for x in s if abs(x - 1) > 0.1)
    print(f"  P(되돌린다)+P(그대로) 평균 {statistics.mean(s):.3f}  범위 {min(s):.2f}~{max(s):.2f}"
          f"  |합-1|>0.1 인 문장 {off}/{n} ({off/n:.0%})")
    flip = sum(1 for r in rows if (r["p_convert"] >= 0.5) != (r["p_choice_en"] >= 0.5))
    gap = statistics.mean(abs(r["p_convert"] - r["p_choice_en"]) for r in rows)
    print(f"  Noul 과 Choice 결론 불일치 {flip}/{n} ({flip/n:.0%})   확률 평균 절대차 {gap:.3f}")

    print("\n  --- 확신도 구간별 실제 적중 ---")
    for lo in (0.5, 0.6, 0.7, 0.8, 0.9):
        hi = lo + 0.1 if lo < 0.9 else 1.01
        idx = [r for r in rows if lo <= max(r["p_convert"], 1 - r["p_convert"]) < hi]
        if not idx: continue
        conf = statistics.mean(max(r["p_convert"], 1 - r["p_convert"]) for r in idx)
        hit = sum(1 for r in idx if (r["p_convert"] >= 0.5) == (r["label"] == 1)) / len(idx)
        print(f"    {lo:.1f}~{min(hi,1.0):.1f}  {len(idx):3d}건  평균확신 {conf:.3f}  실제적중 {hit:.3f}"
              f"  {'과신' if conf > hit else '과소'} {abs(conf-hit):.3f}")

    lat = sorted(r["latency_ms"] for r in rows)
    print(f"\n  지연 중앙값 {lat[len(lat)//2]:.0f}ms (질문 4개 한 요청, M2 Max bf16 MPS)")

if __name__ == "__main__":
    report(load(sys.argv[1], sys.argv[2]), sys.argv[3])
