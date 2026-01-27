---
title: "git rev-parse 명령어 들어본적 있니!?"
date: "2023-09-18"
categories: 소박한궁금증 DevOps
draft: true
---

![1.jpeg](1.jpeg)

나는 사실 저 명령어를 써본 적이 없다. 그리고 처음 본다..

**git rev-parse**는 Git 참조를 구문 분석하고 쿼리하는 데 사용되는 다용도 명령어다. ~~이해가 안 가니 예시를 보자~~

- git rev-parse HEAD : 현재 브랜치에 있는 최신 커밋의 전체 SHA-1 해시가 반환한다. HEAD 키워드를 태그 또는 브랜치로 변경하면 해당 커밋 ID를 얻을 수 있다.

- git rev-parse --abbrev-ref HEAD : 현재 브랜치의 이름을 반환
- git rev-parse 축약된 커밋명 : 레파지토리 내에서 고유한 전체 커밋 ID 반환

사실 이거 왜 쓰는지 모르겠다고 생각했다. 터미널을 확장해서 쓰면 복잡한 명령어를 작성 안해도 확인 할 수 있으니까! 그런데 다음 예시를 보니 터미널 명령어 내부에서 "조건문을 사용하는데 이런 이유로 사용하는구나" 라는 생각을 했다.

- 유효성 확인을 위해 아래처럼 사용 가능

```bash
if git rev-parse --verify feature-branch >/dev/null 2>&1; then
  echo "The branch exists."
else
  echo "The branch does not exist."
fi
```
