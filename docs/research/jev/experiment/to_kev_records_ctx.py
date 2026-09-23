"""같은 집합을 만들되, 판별에 필요한 도메인 지식을 state 에 함께 넣는다.

TypeSafe 문서가 권하는 방식이다. 가중치를 건드리지 않고 request 로 도메인을 준다.
  「proprietary content, records, reference material 을 state 에 넣어라」
여기 넣는 참고 자료는 write-post.md 에 이미 적혀 있는 것뿐이다. 정답 단어는 들어가지 않는다.
"""
import json, re, sys
sys.path.insert(0, "docs/research/jev/experiment")
from to_kev_records import RULE, in_compound

REFERENCE = """이 블로그의 표기 규칙.

영어 단어를 한글 발음으로 옮겨 적은 음차는 영어 원어로 되돌려 쓴다.
다만 아래 두 경우는 한글 음차를 그대로 둔다.

1. 합성어 안에서만 등장해 기계적으로 바꾸면 문장이 부서지는 말.
   보기: 멀티스레드, 싱글스레드, 프레임워크, 자바스크립트, 번들러, 유비쿼터스, 리렌더링
2. 한국어 기술 문서에서 이미 표준 표기로 정착한 말.
   보기: 응답 헤더, 콜 스택, 세션 시작, 컨텍스트 엔지니어링, 대시보드, 릴리스, 샘플링

되돌리는 쪽은 UI 부품이나 라이브러리 구성 요소의 이름이라 한국어 문장 안에서도
명사 하나로 떨어지는 말이다. 보기: calendar, popover, picker, adapter, headless, locale, timezone, preview

판단이 갈리면 그 단어가 합성어의 일부로 등장하는지를 먼저 본다. 그렇다면 한글 음차를 둔다."""

def convert(src, dst):
    n = 0
    with open(dst, "w", encoding="utf-8") as fh:
        for line in open(src, encoding="utf-8"):
            r = json.loads(line)
            w, y = r["word"], bool(r["label"])
            rec = {"state": {"표기_규칙": REFERENCE, "문장": r["sentence"], "판단할_단어": w},
                   "questions": {
                "convert_noul": {"type": "noul", "label": y,
                    "instructions": f"규칙에 따를 때 문장의 '{w}' 를 영어 원어 표기로 되돌려야 하는가?",
                    "criteria": {"true": "되돌려야 한다", "false": "한글 그대로 둔다"}},
                "keep_noul": {"type": "noul", "label": not y,
                    "instructions": f"규칙에 따를 때 문장의 '{w}' 를 한글 음차 그대로 두어야 하는가?",
                    "criteria": {"true": "한글 그대로 둔다", "false": "영어 원어로 되돌린다"}},
                "convert_choice": {"type": "choice", "label": "english" if y else "hangul",
                    "instructions": f"규칙에 따를 때 문장의 '{w}' 를 어떻게 표기해야 하는가?",
                    "criteria": {"english": "영어 원어로 되돌린다", "hangul": "한글 음차 그대로 둔다"}},
                "compound": {"type": "noul", "label": in_compound(r["sentence"], w),
                    "instructions": f"문장에서 '{w}' 는 언제나 더 긴 합성어의 일부로 등장하는가?",
                    "criteria": {"true": "합성어의 일부다", "false": "홀로 명사로 쓰인 곳이 있다"}},
            }, "_meta": {"post": r["post"], "word": w, "origin": r["origin"]}}
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n"); n += 1
    print(f"{dst}  {n} records")

for p in sys.argv[1:]:
    convert(p, p.replace(".jsonl", ".ctx.records.jsonl"))
