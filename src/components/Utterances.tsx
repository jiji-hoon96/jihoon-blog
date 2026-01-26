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
  }, [repo, path])

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

  return <div ref={ref} />
}
