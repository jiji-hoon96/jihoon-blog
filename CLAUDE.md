# jihoon-blog

프론트엔드 개발자의 기술 블로그 (Gatsby + TypeScript)

## 블로그 글 작성 가이드

이 블로그의 글은 jihoon 스타일의 문체를 따릅니다. 글 작성/정리 시 `.claude/commands/write-post.md`의 문체 가이드를 참고하세요.

### 핵심 문체 요약

- **한다체** 사용, 1인칭은 **"필자"**
- 도입: "이번 포스팅에서는 [주제]에 대한 이야기를 해보려고 한다." + 개인적 맥락
- 괄호 안 유머로 진지한 톤과 가벼운 톤의 대비
- 비유를 활용한 기술 개념 설명, 전문 용어는 반드시 풀이 병기
- 섹션 전환은 질문을 통해 자연스럽게
- 결론은 논지 압축 + 독자에게 말 건네기

### 콘텐츠 구조

- 블로그 포스트: `content/YYMMDD/index.md`
- 프론트매터: emoji, title, date, categories 필드 사용
- categories에 "ignore"가 포함되면 비공개 처리

### 커스텀 명령어

- `/write-post [초안]` - 초안을 블로그 글 작성
- `/refine-post [파일경로]` - 기존 글을 jihoon 스타일로 리파인
