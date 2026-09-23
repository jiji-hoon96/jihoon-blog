"""평가 집합 둘을 만든다. 문장 추출은 extract.clean_sentences 를 쓴다.

라벨의 근거는 필자의 의견이 아니라 리포의 표기 습관이다.
  본문이 영어로만 쓰는 단어를 음차로 되돌린 문장  -> 양성 (영어로 써야 한다)
  본문이 한글로만 쓰는 단어가 실제로 쓰인 문장    -> 음성 (그대로 둔다)
"""
import re, glob, json, random, sys
from collections import Counter
sys.path.insert(0, "docs/research/jev/experiment")
from extract import clean_sentences

# 게이트가 이미 아는 단어. 정규식이 100% 맞히는 통제군이다.
GATE_POS = {"calendar": "캘린더", "picker": "피커", "adapter": "어댑터",
            "headless": "헤드리스", "locale": "로케일", "timezone": "타임존"}
GATE_NEG = ["멀티스레드", "싱글스레드", "번들러", "유비쿼터스", "컨텍스트 엔지니어링",
            "리렌더링", "콜 스택", "메인 스레드", "프레임워크", "자바스크립트", "릴리스",
            "세션", "스레드", "스택", "헤더", "렌더링", "빌드", "스크립트", "캐시", "토큰"]

# 게이트가 본 적 없는 단어.
HELD_POS = {"loader": "로더", "mutation": "뮤테이션", "blob": "블롭", "prefill": "프리필",
            "tearing": "티어링", "bailout": "베일아웃", "props": "프롭스", "state": "스테이트"}
HELD_NEG = ["리듀서", "스냅샷", "게이트웨이", "런타임", "번들", "스트림"]

# 같은 개념의 한국어 낱말이 문장에 이미 있으면 치환이 문장을 망가뜨린다. 그런 문장은 뺀다.
SYNONYM = {"스테이트": ["상태"], "프롭스": ["속성", "프로퍼티"], "로더": ["적재"],
           "뮤테이션": ["변이", "변경"], "베일아웃": ["건너뛰"], "티어링": ["찢"]}
CAP = 6
# 원문이 `prefill` 은 처럼 인라인 코드 뒤에 공백을 두므로, 치환하면 양성에만
# "프리필 은" 같은 띄어쓰기 흔적이 남는다. 모델이 판단 대신 그 흔적을 잡을 수 있어 없앤다.
PARTICLE = r"(은|는|이|가|을|를|의|에|에서|으로|로|와|과|도|만|별|부터|까지|보다|이다|다)"

def tidy(text, word):
    return re.sub(re.escape(word) + r" +" + PARTICLE + r"\b", word + r"\1", text)

def build(positives, negatives, out_path, split):
    used, items, seen = Counter(), [], set()
    for path in sorted(glob.glob("content/*/index.md")):
        post = path.split("/")[1]
        for sent in clean_sentences(path):
            key = sent[:60]
            if key in seen:
                continue
            hit = False
            for en, ko in positives.items():
                if not re.search(r"(?i)\b" + en + r"\b", sent) or used[ko] >= CAP:
                    continue
                if any(w in sent for w in SYNONYM.get(ko, [])):
                    continue                                   # 치환이 문장을 부순다
                mutated = tidy(re.sub(r"(?i)\b" + en + r"\b", ko, sent), ko)
                seen.add(key); used[ko] += 1; hit = True
                items.append({"post": post, "label": 1, "word": ko, "english": en,
                              "sentence": mutated, "origin": "counterfactual", "split": split})
                break
            if hit:
                continue
            for ko in negatives:
                if ko in sent and used[ko] < CAP \
                        and not any(w in sent for w in positives.values()):
                    seen.add(key); used[ko] += 1
                    items.append({"post": post, "label": 0, "word": ko, "english": None,
                                  "sentence": sent, "origin": "corpus", "split": split})
                    break
    random.Random(7).shuffle(items)
    with open(out_path, "w", encoding="utf-8") as fh:
        for it in items:
            fh.write(json.dumps(it, ensure_ascii=False) + "\n")
    pos = sum(i["label"] for i in items)
    words = len({i["word"] for i in items})
    print(f"{out_path}\n  문장 {len(items)}  양성 {pos}  음성 {len(items)-pos}  "
          f"단어 {words}종 (유효 표본은 이쪽이다)")
    print("  ", dict(sorted(used.items())))

build(GATE_POS, GATE_NEG, "docs/research/jev/experiment/set_gate.jsonl", "gate")
build(HELD_POS, HELD_NEG, "docs/research/jev/experiment/set_heldout.jsonl", "heldout")
