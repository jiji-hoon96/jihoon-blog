'use client'

import { useTheme } from 'next-themes'
import { useEffect, useRef } from 'react'

type UtterancesProps = {
  repo: string
  path: string
}

export default function Utterances({ repo, path }: UtterancesProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) return
    // next-themes 는 마운트 직후 resolvedTheme 이 undefined 다. 그대로 주입하면
    // 다크 모드 사용자도 밝은 댓글창을 받고, 아래 postMessage 는 아직 iframe 이
    // 없어서 놓친다. 결과적으로 테마를 한 번 토글하기 전까지 어긋난 채로 남는다.
    if (!resolvedTheme) return

    const scriptElem = document.createElement('script')
    scriptElem.src = 'https://utteranc.es/client.js'
    scriptElem.async = true
    scriptElem.crossOrigin = 'anonymous'
    scriptElem.setAttribute('repo', repo)
    scriptElem.setAttribute('issue-term', 'pathname')
    scriptElem.setAttribute('label', 'comment')
    scriptElem.setAttribute(
      'theme',
      resolvedTheme === 'dark' ? 'photon-dark' : 'github-light'
    )

    ref.current.appendChild(scriptElem)
  }, [repo, path, resolvedTheme])

  // Re-render utterances when theme changes
  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe.utterances-frame'
    )
    if (!iframe) return

    const theme = resolvedTheme === 'dark' ? 'photon-dark' : 'github-light'
    const message = {
      type: 'set-theme',
      theme: theme,
    }
    iframe.contentWindow?.postMessage(message, 'https://utteranc.es')
  }, [resolvedTheme])

  return (
    <div ref={ref} className="utterances-wrapper" />
  )
}
