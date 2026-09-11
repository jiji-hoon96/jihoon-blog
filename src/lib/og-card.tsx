import type { ReactElement } from 'react'
import { siteMetadata } from './site-metadata.ts'

/**
 * OG 카드의 시각 언어는 사이트와 같아야 한다.
 *
 * 이전 카드는 네이비 그라데이션에 알약 모양 해시태그를 얹었는데, 이 프로젝트의
 * 디자인 방향(`docs/superpowers/plans/2026-08-18-quiet-authority-home-figma.md`)이
 * 명시적으로 금지한 것들이다. "Do not use rounded editorial cards, emoji headings,
 * gradients, decorative illustrations" 그리고 "let typography, rules, and
 * whitespace establish hierarchy".
 *
 * 그래서 카드를 글의 머리글과 같은 구조로 다시 짰다. 흰 캔버스 위에 제목이
 * 지배하고, 메타 한 줄이 붙고, 헤어라인이 본문과 서명을 가른다. 실제 글 페이지의
 * 상단을 그대로 잘라낸 모양이다.
 */

/** src/app/globals.css 의 :root 토큰과 같은 값이다. */
const COLOR = {
  canvas: '#ffffff',
  ink: '#16181c',
  stone: '#595d63',
  mineral: '#e2e2e0',
  accent: '#28518f',
} as const

const CANVAS = { width: 1200, height: 630 } as const
const PADDING = 76

/**
 * 한글은 전각, 라틴은 반각에 가깝다. 글자 수만으로 크기를 정하면 영어 제목이
 * 지나치게 작아지므로 차지하는 가로 폭을 어림해서 단계를 고른다.
 */
export function measureTitleWidth(title: string): number {
  let width = 0
  for (const char of title) {
    width += /[ᄀ-ᇿ　-〿㄰-㆏㐀-䶿一-鿿가-힯＀-｠]/.test(char)
      ? 1
      : 0.55
  }
  return width
}

export function titleFontSize(title: string): number {
  const width = measureTitleWidth(title)
  if (width <= 16) return 92
  if (width <= 26) return 78
  if (width <= 38) return 66
  return 56
}

type OgCardProps = {
  /** 카드를 지배하는 문장. 글이면 seoTitle, 홈이면 로케일 제목이다. */
  title: string
  /** 제목 아래 한 줄. 날짜와 카테고리, 또는 사이트 설명이 들어간다. */
  meta: string
  /** 헤어라인 아래 오른쪽에 놓이는 보조 정보. */
  footnote: string
}

export function OgCard({ title, meta, footnote }: OgCardProps): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: PADDING,
        backgroundColor: COLOR.canvas,
        color: COLOR.ink,
        fontFamily: '"Noto Sans KR"',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: COLOR.accent }}>
          {siteMetadata.brand}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: COLOR.stone }}>
          {siteMetadata.title}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          height: 1,
          marginTop: 24,
          backgroundColor: COLOR.mineral,
        }}
      />

      <div style={{ display: 'flex', flex: 1 }} />

      <div
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontSize: titleFontSize(title),
          fontWeight: 700,
          lineHeight: 1.26,
          letterSpacing: '-0.02em',
          // 사이트 본문과 같은 규칙이다. 없으면 한글이 단어 중간에서 끊긴다.
          wordBreak: 'keep-all',
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginTop: 30,
          fontSize: 26,
          lineHeight: 1.5,
          color: COLOR.stone,
          wordBreak: 'keep-all',
        }}
      >
        {meta}
      </div>

      <div style={{ display: 'flex', flex: 1 }} />

      <div
        style={{
          display: 'flex',
          height: 1,
          backgroundColor: COLOR.mineral,
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 26,
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 700 }}>
          {siteMetadata.author.name}
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: COLOR.stone }}>{footnote}</div>
      </div>
    </div>
  )
}

export const OG_CARD_SIZE = CANVAS
