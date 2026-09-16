'use client'

import { useEffect } from 'react'
import {
  buildAiReferralEventParameters,
  classifyAiReferral,
} from '@/lib/ai-referral'
import { sendGaEvent } from '@/lib/ga-event'

export default function AiReferralReporter() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const aiSource = classifyAiReferral({
      utmSource: params.get('utm_source'),
      referrer: document.referrer,
    })
    if (!aiSource) return

    // 예전에는 gtag 이 아직 없으면 load 이벤트를 기다렸다. effect 가 load 이후에
    // 돌면(bfcache 복원, 긴 hydration) `{ once: true }` 리스너가 영영 불리지 않는다.
    // 큐에 바로 넣으면 그 경로 자체가 없어진다.
    sendGaEvent(
      'ai_referral',
      buildAiReferralEventParameters(aiSource, window.location),
    )
  }, [])

  return null
}
