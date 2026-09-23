"""본문에서 깨끗한 문장을 뽑는다.

인라인 코드는 지우지 않고 백틱만 벗긴다. 지우면 문장에 구멍이 나고
그 구멍이 양성 쪽에만 몰리면 모델이 판단이 아니라 어색함을 잡는다.
"""
import re

def clean_sentences(path):
    s = open(path, encoding="utf-8").read()
    s = re.sub(r"^---\n.*?\n---\n", "", s, flags=re.S)
    s = re.sub(r"```.*?```", "", s, flags=re.S)          # 코드 블록은 문장이 아니다
    s = re.sub(r"^:::.*$", "", s, flags=re.M)            # 디렉티브
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)           # 이미지
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)       # 링크는 표시 문자만
    s = re.sub(r"`([^`]*)`", r"\1", s)                   # 백틱만 벗긴다
    s = re.sub(r"\*\*|__", "", s)                        # 볼드 표시
    s = re.sub(r":term\[([^\]]*)\]\{[^}]*\}", r"\1", s)  # 용어 디렉티브

    out = []
    for line in s.split("\n"):
        line = line.strip()
        if not line or line.startswith("|") or line.startswith("#") or line.startswith(">"):
            continue                                      # 표, 제목, 인용은 문장이 아니다
        line = re.sub(r"^[-*]\s+", "", line)
        for sent in re.split(r"(?<=[.?!다])\s+", line):
            sent = sent.strip()
            if not (30 <= len(sent) <= 200):              continue
            if not re.search(r"[가-힣]", sent):           continue
            if "  " in sent or "|" in sent:               continue   # 구멍이 남은 문장
            if sent.count("(") != sent.count(")"):        continue   # 잘린 괄호
            if re.search(r"[가-힣]$", sent) is None and not sent.endswith("다."): continue
            out.append(sent)
    return out
