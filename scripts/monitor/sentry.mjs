/**
 * Sentry 의 미해결 프로덕션 이슈를 읽는다.
 *
 * statsPeriod 는 '', '24h', '14d' 만 받는다. 빈 값이면 기간 제한 없이 미해결 전부다.
 * 로컬과 프리뷰 이벤트는 environment 로 걸러낸다. 걸러내지 않으면 로컬 검증이 만든
 * 이벤트(JIHOON-BLOG-B 처럼)가 고칠 거리로 올라온다.
 */

/**
 * 의도적으로 두는 Sentry 이슈. shortId 와 이유를 적는다.
 * 여기 적힌 이슈는 리포트에 "제외" 로만 남고 고칠 거리로 넘기지 않는다.
 */
export const IGNORED_SENTRY_ISSUES = {}

export async function fetchSentryIssues({ token, org, project, fetchImpl = fetch }) {
  const query = encodeURIComponent('is:unresolved environment:production')
  const url = `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=${query}&statsPeriod=`
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) {
    throw new Error(`Sentry API ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }
  return response.json()
}

export function toSentryProblems(issues) {
  return issues.map(issue => {
    const ignored = IGNORED_SENTRY_ISSUES[issue.shortId]
    return {
      severity: ignored ? 'ignored' : 'error',
      code: 'sentry',
      url: issue.permalink,
      key: `sentry:${issue.shortId}`,
      detail: `${issue.shortId} ${issue.title} (${issue.culprit}) 이벤트 ${issue.count}건, 마지막 ${issue.lastSeen.slice(0, 10)}${ignored ? `, 제외: ${ignored}` : ''}`,
    }
  })
}
