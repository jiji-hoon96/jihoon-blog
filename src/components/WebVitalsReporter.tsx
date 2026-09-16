'use client'

import { useEffect } from 'react'
import type { Metric } from 'web-vitals'
import { sendGaEvent } from '@/lib/ga-event'

/**
 * Core Web Vitals (LCP, INP, CLS, FCP, TTFB)를 측정해 Google Analytics로 전송.
 * - Google이 권장하는 web-vitals 라이브러리 사용
 * - 'event' 이름은 `web_vitals`로 통일, metric 이름은 event_label로 구분
 * - GA4에서 페이지/디바이스별 분포를 확인할 수 있음
 * - `reportSoftNavs`로 SPA 화면 전환도 별도 페이지 경험으로 집계한다.
 *   구분하려면 navigationType이 같이 가야 한다.
 */
const REPORT_OPTS = { reportSoftNavs: true }

export default function WebVitalsReporter() {
  useEffect(() => {
    let cancelled = false

    const send = (metric: Metric) => {
      if (cancelled) return

      // gtag 함수를 기다리지 않는다. onTTFB 와 onFCP 는 등록 즉시 한 번만 발화한다.
      sendGaEvent('web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.name,
        value: Math.round(
          metric.name === 'CLS' ? metric.value * 1000 : metric.value,
        ),
        metric_id: metric.id,
        metric_rating: metric.rating,
        metric_navigation_type: metric.navigationType,
        // soft navigation 이 일어나면 앞 페이지의 CLS 와 INP 는 URL 이 바뀐 뒤에 확정돼
        // 보고된다. 덮지 않으면 gtag 가 현재 URL 을 붙여 목록 페이지 값이 글 URL 로 잡힌다.
        ...(metric.navigationURL ? { page_location: metric.navigationURL } : {}),
        non_interaction: true,
      })
    }

    import('web-vitals')
      .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
        if (cancelled) return
        onCLS(send, REPORT_OPTS)
        onINP(send, REPORT_OPTS)
        onLCP(send, REPORT_OPTS)
        onFCP(send, REPORT_OPTS)
        onTTFB(send, REPORT_OPTS)
      })
      .catch(() => {
        // 청크 로드 실패는 배포 직후 옛 HTML 이 사라진 청크를 부를 때 일어난다.
        // 브라우저 Sentry 가 없으므로 GA4 로 카나리를 하나 남긴다.
        // 이게 없으면 Core Web Vitals 가 통째로 멈춰도 어디에도 흔적이 없다.
        sendGaEvent('web_vitals_unavailable', { non_interaction: true })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
