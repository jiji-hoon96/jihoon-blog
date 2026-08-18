'use client'

import { useEffect } from 'react'
import {
  buildAiReferralEventParameters,
  classifyAiReferral,
} from '@/lib/ai-referral'

export default function AiReferralReporter() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const aiSource = classifyAiReferral({
      utmSource: params.get('utm_source'),
      referrer: document.referrer,
    })
    if (!aiSource) return

    let sent = false
    const report = () => {
      const gtag = (window as unknown as {
        gtag?: (...args: unknown[]) => void
      }).gtag
      if (sent || typeof gtag !== 'function') return

      sent = true
      gtag(
        'event',
        'ai_referral',
        buildAiReferralEventParameters(aiSource, window.location),
      )
    }

    report()
    window.addEventListener('load', report, { once: true })
    return () => window.removeEventListener('load', report)
  }, [])

  return null
}
