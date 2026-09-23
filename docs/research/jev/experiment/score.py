"""응답을 채점한다. 정확도, Brier, ECE, 자동화 가능 비율, 구조적 항등식."""
import json, sys, math

def load(p): return [json.loads(l) for l in open(p, encoding="utf-8")]

def brier(ps, ys): return sum((p - y) ** 2 for p, y in zip(ps, ys)) / len(ps)

def ece(ps, ys, bins=10):
    """예측을 확신도 기준으로 bin 에 넣고, bin 마다 평균 확신도와 실제 적중률의 차를 잰다."""
    tot, n = 0.0, len(ps)
    for b in range(bins):
        lo, hi = b / bins, (b + 1) / bins
        idx = [i for i, p in enumerate(ps)
               if (max(p, 1 - p) >= lo and (max(p, 1 - p) < hi or (b == bins - 1 and max(p, 1 - p) <= 1.0)))]
        if not idx: continue
        conf = sum(max(ps[i], 1 - ps[i]) for i in idx) / len(idx)
        acc = sum(1 for i in idx if (ps[i] >= 0.5) == (ys[i] == 1)) / len(idx)
        tot += len(idx) / n * abs(conf - acc)
    return tot

def automatable(ps, ys, budget=0.05):
    """오차 예산 안에서 자동 처리할 수 있는 비율. 확신도가 높은 쪽부터 자른다."""
    order = sorted(range(len(ps)), key=lambda i: -max(ps[i], 1 - ps[i]))
    best = 0.0
    for k in range(1, len(order) + 1):
        sub = order[:k]
        err = sum(1 for i in sub if (ps[i] >= 0.5) != (ys[i] == 1)) / k
        if err <= budget: best = k / len(ps)
    return best

BANNED = {"캘린더","팝오버","피커","어댑터","로케일","헤드리스","타임존","프리뷰","대시보드"}

def report(rows, title):
    ys = [r["label"] for r in rows]
    a = [r["response"]["answers"] for r in rows]
    ps = [x["convert_noul"]["noul"] for x in a]
    keep = [x["keep_noul"]["noul"] for x in a]
    ch = [x["convert_choice"]["probabilities"]["english"] for x in a]
    n = len(rows)

    print(f"\n{'='*66}\n{title}   n={n}  양성 {sum(ys)}  음성 {n-sum(ys)}\n{'='*66}")
    acc = sum(1 for p, y in zip(ps, ys) if (p >= 0.5) == (y == 1)) / n
    base = max(sum(ys), n - sum(ys)) / n
    gate = sum(1 for r, y in zip(rows, ys) if ((r["word"] in BANNED) == (y == 1))) / n
    print(f"  현재 게이트(정규식) 정확도   {gate:.3f}")
    print(f"  다수 클래스 기준선           {base:.3f}")
    print(f"  Kev-9B 정확도 (임계 0.5)     {acc:.3f}")
    print(f"  Brier                        {brier(ps, ys):.3f}")
    print(f"  ECE (10 bin)                 {ece(ps, ys):.3f}")
    print(f"  5% 오차 예산 자동화 비율     {automatable(ps, ys):.2f}")
    conf9 = [i for i in range(n) if max(ps[i], 1 - ps[i]) >= 0.9]
    if conf9:
        wrong = sum(1 for i in conf9 if (ps[i] >= 0.5) != (ys[i] == 1))
        print(f"  확신도 0.9 이상            {len(conf9)}건 중 {wrong}건 오답 ({wrong/len(conf9):.1%})")

    print("\n  --- 구조적 항등식 ---")
    sums = [p + k for p, k in zip(ps, keep)]
    print(f"  P(되돌린다) + P(그대로) 평균  {sum(sums)/n:.3f}   "
          f"범위 {min(sums):.2f}~{max(sums):.2f}   |합-1|>0.1 인 건수 {sum(1 for s in sums if abs(s-1)>0.1)}/{n}")
    flip = sum(1 for p, c in zip(ps, ch) if (p >= 0.5) != (c >= 0.5))
    gap = sum(abs(p - c) for p, c in zip(ps, ch)) / n
    print(f"  Noul 과 Choice 결론 불일치    {flip}/{n}   확률 평균 절대차 {gap:.3f}")

    print("\n  --- 캘리브레이션 곡선 ---")
    for b in range(5):
        lo, hi = 0.5 + b * 0.1, 0.6 + b * 0.1
        idx = [i for i in range(n) if lo <= max(ps[i], 1 - ps[i]) < (hi if b < 4 else 1.01)]
        if not idx: continue
        conf = sum(max(ps[i], 1 - ps[i]) for i in idx) / len(idx)
        hit = sum(1 for i in idx if (ps[i] >= 0.5) == (ys[i] == 1)) / len(idx)
        print(f"    확신도 {lo:.1f}~{hi:.1f}  {len(idx):3d}건  평균 {conf:.3f}  실제 적중 {hit:.3f}")

    lat = [r["response"].get("latency_ms") or r["response"]["client_ms"] for r in rows]
    lat.sort()
    print(f"\n  지연 중앙값 {lat[len(lat)//2]:.0f}ms   (질문 5개를 한 요청에)")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        rows = load(p)
        report(rows, p.split("/")[-1])
