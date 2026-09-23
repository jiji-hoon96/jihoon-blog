"""평가 집합을 kev.benchmark 의 --data 레코드 형식으로 바꾼다.

그들의 채점기를 쓰면 지표 정의가 Kev README 표와 같아져서 숫자를 나란히 놓을 수 있다.
질문 넷을 한 레코드에 담는다. 넷 다 라벨이 있어야 로더가 받는다.
"""
import json, re, sys

RULE = ("이 블로그는 영어 단어를 한글 발음으로 옮겨 적은 음차를 영어 원어로 되돌려 쓴다. "
        "다만 합성어 안에서만 쓰이거나 한국어 기술 문서에 이미 정착한 말은 한글로 그대로 둔다.")

def in_compound(sentence, word):
    """그 단어가 문장에서 더 긴 한글 덩어리의 일부로만 나타나는가. 문서가 적은 판별 기준이다."""
    standalone = False
    for m in re.finditer(re.escape(word), sentence):
        before = sentence[m.start() - 1] if m.start() else ""
        after = sentence[m.end()] if m.end() < len(sentence) else ""
        if not re.match(r"[가-힣]", before) and not re.match(r"[가-힣]", after):
            standalone = True
    return not standalone

def convert(src, dst):
    out = 0
    with open(dst, "w", encoding="utf-8") as fh:
        for line in open(src, encoding="utf-8"):
            r = json.loads(line)
            w, y = r["word"], bool(r["label"])
            rec = {"state": r["sentence"], "questions": {
                "convert_noul": {"type": "noul", "label": y,
                    "instructions": f"{RULE} 이 문장의 '{w}' 를 영어 원어 표기로 되돌려야 하는가?",
                    "criteria": {"true": "되돌려야 한다", "false": "한글 그대로 둔다"}},
                "keep_noul": {"type": "noul", "label": not y,
                    "instructions": f"{RULE} 이 문장의 '{w}' 를 한글 그대로 두어야 하는가?",
                    "criteria": {"true": "한글 그대로 둔다", "false": "영어 원어로 되돌린다"}},
                "convert_choice": {"type": "choice", "label": "english" if y else "hangul",
                    "instructions": f"{RULE} 이 문장의 '{w}' 를 어떻게 표기해야 하는가?",
                    "criteria": {"english": "영어 원어로 되돌린다", "hangul": "한글 음차 그대로 둔다"}},
                "compound": {"type": "noul", "label": in_compound(r["sentence"], w),
                    "instructions": f"이 문장에서 '{w}' 는 언제나 더 긴 합성어의 일부로 등장하는가?",
                    "criteria": {"true": "합성어의 일부다", "false": "홀로 명사로 쓰인 곳이 있다"}},
            }, "_meta": {"post": r["post"], "word": w, "origin": r["origin"]}}
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n"); out += 1
    print(f"{dst}  {out} records")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        convert(p, p.replace(".jsonl", ".records.jsonl"))
