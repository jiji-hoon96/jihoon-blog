#!/usr/bin/env node
/**
 * Sentry 와 SEO 크롤 결과를 GitHub 이슈 본문 하나로 묶는다.
 *
 *   pnpm monitor                         결과를 monitor-report.md / .json 에 쓴다
 *   pnpm monitor --previous body.md      지난 본문과 비교해 새로 생긴 항목을 센다
 *
 * Sentry 토큰(SENTRY_READ_TOKEN, 없으면 SENTRY_AUTH_TOKEN)이 없으면 Sentry 칸만 비우고 계속한다.
 * 이슈를 만들고 고치는 일은 .github/workflows/monitor.yml 이 한다.
 */
import { readFile, writeFile } from 'node:fs/promises'

import { crawlSite, fetchSitemapUrls, findSeoProblems } from './seo.mjs'
import { fetchSentryIssues, toSentryProblems } from './sentry.mjs'

const ORIGIN = process.env.MONITOR_ORIGIN ?? 'https://hooninedev.com'
const KEYS_MARKER = /<!-- monitor-keys: ([^>]*) -->/u

const CODE_LABELS = {
  sentry: 'Sentry 미해결 이슈',
  'broken-link': '깨진 내부 링크',
  'noindex-in-sitemap': '사이트맵에 있는 noindex 페이지',
  'description-missing': 'description 없음',
  'title-missing': 'title 없음',
  'canonical-missing': 'canonical 없음',
  'description-too-short': 'description 110자 미만',
  'description-too-long': 'description 160자 초과',
  'unexpected-noindex': '의도하지 않은 noindex',
  'internal-redirect': '리다이렉트를 타는 내부 링크',
  'h1-count': 'h1 이 하나가 아님',
  'canonical-elsewhere': '다른 URL 을 가리키는 canonical',
  'indexable-not-in-sitemap': '사이트맵에 없는 색인 대상',
  'sitemap-orphan': '사이트맵에만 있는 URL',
}

export function renderReport({ problems, previousKeys = [], notes = [], checkedAt, pageCount }) {
  const actionable = problems.filter(item => item.severity !== 'ignored')
  const previous = new Set(previousKeys)
  const fresh = actionable.filter(item => !previous.has(item.key))
  const lines = [
    `마지막 점검: ${checkedAt} · 크롤 ${pageCount}페이지 · 고칠 항목 ${actionable.length}건 (새로 생긴 것 ${fresh.length}건)`,
    '',
    '이 이슈는 `.github/workflows/monitor.yml` 이 매주 덮어쓴다. 의도한 예외는 `scripts/monitor/` 의 제외 목록에 이유와 함께 적는다.',
    '',
  ]
  for (const note of notes) lines.push(`> ${note}`, '')

  if (!actionable.length) lines.push('고칠 항목이 없다.', '')

  const byCode = Map.groupBy(problems, item => item.code)
  for (const [code, items] of byCode) {
    lines.push(`## ${CODE_LABELS[code] ?? code} (${items.length})`, '')
    const shown = items.slice(0, 30)
    for (const item of shown) {
      const mark = previous.has(item.key) || item.severity === 'ignored' ? '' : ' 🆕'
      lines.push(`- [${item.severity}] ${item.url} ${item.detail}${mark}`)
    }
    if (items.length > shown.length) lines.push(`- 외 ${items.length - shown.length}건은 monitor-report.json 아티팩트에 있다`)
    lines.push('')
  }

  lines.push(`<!-- monitor-keys: ${actionable.map(item => item.key).join(' ')} -->`)
  return { body: lines.join('\n'), actionable: actionable.length, fresh: fresh.length }
}

async function main() {
  const args = process.argv.slice(2)
  const previousPath = args.includes('--previous') ? args[args.indexOf('--previous') + 1] : null
  const previousBody = previousPath ? await readFile(previousPath, 'utf8').catch(() => '') : ''
  const previousKeys = previousBody.match(KEYS_MARKER)?.[1].split(' ').filter(Boolean) ?? []

  const notes = []
  const problems = []

  const token = process.env.SENTRY_READ_TOKEN || process.env.SENTRY_AUTH_TOKEN
  const org = process.env.SENTRY_ORG ?? 'hooninedev'
  const project = process.env.SENTRY_PROJECT ?? 'jihoon-blog'
  if (token) {
    try {
      problems.push(...toSentryProblems(await fetchSentryIssues({ token, org, project })))
    } catch (error) {
      notes.push(`Sentry 조회 실패: ${error.message}`)
    }
  } else {
    notes.push('Sentry 토큰이 없어 Sentry 는 보지 않았다. 리포 Secrets 에 SENTRY_READ_TOKEN 을 넣는다.')
  }

  const [pages, sitemapUrls] = await Promise.all([crawlSite(ORIGIN), fetchSitemapUrls(ORIGIN)])
  problems.push(...findSeoProblems({ pages, sitemapUrls, origin: ORIGIN }))

  const report = renderReport({
    problems,
    previousKeys,
    notes,
    checkedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    pageCount: pages.length,
  })

  await writeFile('monitor-report.md', report.body)
  await writeFile('monitor-report.json', JSON.stringify({ ...report, problems }, null, 2))
  console.log(`actionable=${report.actionable}`)
  console.log(`fresh=${report.fresh}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
