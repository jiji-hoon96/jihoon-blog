'use client'

import { useEffect } from 'react'

/**
 * Core Web Vitals (LCP, INP, CLS, FCP, TTFB)를 측정해 Google Analytics로 전송.
 * - Google이 권장하는 web-vitals 라이브러리 사용
 * - 'event' 이름은 `web_vitals`로 통일, metric 이름은 event_label로 구분
 * - GA4에서 페이지/디바이스별 분포를 확인할 수 있음
 */
export default function WebVitalsReporter() {
  useEffect(() => {
    let cancelled = false

    const send = (metric: {
      name: string
      value: number
      id: string
      rating?: string
    }) => {
      if (cancelled) return
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void })
        .gtag
      if (typeof gtag !== 'function') return

      gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.name,
        value: Math.round(
          metric.name === 'CLS' ? metric.value * 1000 : metric.value,
        ),
        metric_id: metric.id,
        metric_rating: metric.rating,
        non_interaction: true,
      })
    }

    import('web-vitals')
      .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
        if (cancelled) return
        onCLS(send)
        onINP(send)
        onLCP(send)
        onFCP(send)
        onTTFB(send)
      })
      .catch(() => {
        // 로드 실패 시 조용히 무시
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
