---
emoji: 🧐
title: '진행중'
date: '2025-04-04'
categories: 프론트엔드
---

## **1. 개발 목적 및 동기**

- lodash-es, remeda 등 외부 라이브러리 의존 축소
- 필수, 필요 기능만 선택적으로 구현하여 번들 사이즈 최적화
- 비즈니스 로직에 특화된 유틸리티, 디자인 시스템 통합 관리

## 2. 모노레포 채택 배경과 구조 설계

- 다른 선택지가 있었을텐데 모노레포 방식을 선택한 이유
  - 
- **모노레포 구조 설계**

    ```tsx
    packages/
      ├── hicare-common-library/  # 유틸리티 함수 모음
      │   ├── lib/
      │   │   ├── array/         # 배열 조작 함수
      │   │   ├── object/        # 객체 조작 함수
      │   │   ├── string/        # 문자열 함수
      │   │   ├── function/      # 함수형 유틸리티
      │   │   ├── guard/         # 타입 가드 함수
      │   │   └── utility/       # 기타 유틸리티
      │   │
      │   └── bench/             # 성능 벤치마크 테스트
      │
      └── hicare-ui-components/  # MUI 기반 컴포넌트 라이브러리
          ├── components/
          │   ├── forms/         # 폼 관련 컴포넌트
          │   ├── data-display/  # 데이터 표시 컴포넌트
          │   ├── navigation/    # 네비게이션 컴포넌트
          │   └── feedback/      # 알림 및 피드백 컴포넌트
          │
          └── storybook/         # 컴포넌트 문서화와 시각화
    ```


## 3. 사용 기술 및 도구 비교

- **패키지 관리: pnpm vs npm vs yarn**
    - pnpm 선택 이유 (디스크 공간 효율, 의존성 관리)
    - 각 도구의 장단점 비교
- **모노레포 오케스트레이션 : Lerna vs Turborepo vs Nx**
    - Lerna 선택 이유 (워크스페이스 관리, 버전 관리)
    - 각 도구의 장단점 비교
- **빌드 도구: Vite와 TypeScript**
    - Vite를 활용한 개발 환경 구성
    - TypeScript 타입 선언 자동화
    - 다양한 모듈 형식 지원 (ESM, CJS)
- npm 오픈소스 도구 활용
    - verdaccio

## 4.  utils-library

- 주요 기능들

## 5.  ui-library

- 주요 기능들

1. 앞으로..


```toc

```
