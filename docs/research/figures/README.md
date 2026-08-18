# 도표 HTML 원본

`content/*/N.png` 를 만든 HTML 소스다. 본문 수치를 고치면 여기서 해당 HTML 을 고치고 다시 구워 덮어써야 한다.

| HTML | 출력 |
|---|---|
| `fig-703-1.html` | `content/260703/1.png` 실패 감지기와 방문자의 관측 비대칭 |
| `fig-703-4.html` | `content/260703/2.png` DEADLINE_EXCEEDED 100건 보고 시간 분포 |
| `fig-703-5.html` | `content/260703/3.png` Sentry 로 답할 수 있는 질문의 층 |
| `fig-703-2.html` | `content/260703/4.png` 세 층 관측 구조 |
| `fig-703-3.html` | `content/260703/5.png` Search Console 28일 비교 |
| `fig-723-1.html` | `content/260723/1.png` 요구사항 해상도 세 단계 |
| `fig-617-1.html` | `content/260617/1.png` Kalyx 포지셔닝 |

**파일명 번호와 출력 번호가 어긋난다.** 본문 등장 순서에 맞춰 PNG 를 재번호했기 때문이다. 위 표를 기준으로 삼을 것.

## 다시 굽는 법

```bash
cd docs/research/figures
./render.sh fig-703-4 668          # 이름, 높이(CSS px)
cp fig-703-4.png ../../../content/260703/2.png
```

높이는 콘텐츠에 맞춰 직접 지정한다. 굽고 나면 **PNG 를 눈으로 열어 잘림과 빈 여백을 확인할 것.** 현재 쓰는 높이는 703-1: 490, 703-2: 610, 703-3: 700, 703-4: 668, 703-5: 710, 723-1: 650, 617-1: 700.

디자인 토큰은 `base.css` 에 있고 폰트는 로컬 Pretendard 를 쓴다.
