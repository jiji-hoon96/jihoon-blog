"""평가 집합을 Kev 서버에 돌리고 원시 응답을 남긴다.

질문 다섯 개를 한 요청에 담는다. 그래야 같은 실행에서 네 가지를 동시에 잰다.
  1. 정확도와 캘리브레이션    (convert_noul)
  2. Noul 과 Choice 의 불일치  (convert_noul vs convert_choice)
  3. 질문과 그 부정의 확률 합  (convert_noul vs keep_noul)
  4. 문서가 적은 판별 기준     (compound, settled)
"""
import json, sys, time, urllib.request

PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8009
URL = f"http://127.0.0.1:{PORT}/v1/systemone"
RULE = ("이 블로그는 영어 단어를 한글 발음으로 옮겨 적은 음차를 영어 원어로 되돌려 쓴다. "
        "다만 합성어 안에서만 쓰이거나 한국어 기술 문서에 이미 정착한 말은 한글로 그대로 둔다.")

def questions(word):
    return {
        "convert_noul": {"type": "noul",
            "instructions": f"{RULE} 이 문장의 '{word}' 를 영어 원어 표기로 되돌려야 하는가?",
            "criteria": {"true": "되돌려야 한다", "false": "한글 그대로 둔다"}},
        "keep_noul": {"type": "noul",
            "instructions": f"{RULE} 이 문장의 '{word}' 를 한글 그대로 두어야 하는가?",
            "criteria": {"true": "한글 그대로 둔다", "false": "영어 원어로 되돌린다"}},
        "convert_choice": {"type": "choice",
            "instructions": f"{RULE} 이 문장의 '{word}' 를 어떻게 표기해야 하는가?",
            "criteria": {"english": "영어 원어로 되돌린다", "hangul": "한글 음차 그대로 둔다"}},
        "compound": {"type": "noul",
            "instructions": f"이 문장에서 '{word}' 는 더 긴 합성어의 일부로만 등장하는가?",
            "criteria": {"true": "합성어의 일부다", "false": "홀로 명사로 쓰인다"}},
        "settled": {"type": "noul",
            "instructions": f"'{word}' 는 한국어 기술 문서에서 이미 표준 표기로 정착한 말인가?",
            "criteria": {"true": "정착했다", "false": "정착하지 않았다"}},
    }

def ask(state, word):
    body = json.dumps({"state": state, "model": "kev-latest",
                       "questions": questions(word)}).encode()
    req = urllib.request.Request(URL, data=body,
                                 headers={"content-type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=300) as r:
        out = json.load(r)
    out["client_ms"] = round((time.time() - t0) * 1000, 1)
    return out

def main(path, out_path):
    rows = [json.loads(l) for l in open(path, encoding="utf-8")]
    with open(out_path, "w", encoding="utf-8") as fh:
        for i, row in enumerate(rows, 1):
            row["response"] = ask(row["sentence"], row["word"])
            fh.write(json.dumps(row, ensure_ascii=False) + "\n"); fh.flush()
            if i % 10 == 0 or i == len(rows):
                print(f"  {i}/{len(rows)}  {row['response']['client_ms']:.0f}ms", flush=True)
    print("wrote", out_path)

if __name__ == "__main__":
    src = sys.argv[1]
    main(src, src.replace(".jsonl", ".kev.jsonl"))
